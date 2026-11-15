// TAREA 335: KDS visual para TV. Cuadricula de tickets tipo comanda con semaforo por tiempo (umbrales por local en Config > KDS),
// un toque por item (pendiente -> preparando -> listo), "Todo listo", pestanas En cocina / Listos (10 min) / Antiguos (cron 03:00),
// filtro "Solo retrasados". Rendimiento: un solo pedido de datos (todas las estaciones, filtro en el cliente con identidad estable),
// tickets memo y reloj compartido: una actualizacion por socket solo repinta el ticket que cambio.
import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import io, { Socket } from 'socket.io-client';
import { staffSocketAuth } from '@/lib/socketAuth';
import { Maximize, Minimize, Volume2, VolumeX, ChefHat, Flame } from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useSuspendedGuard } from '@/hooks/useSuspendedGuard';
import { useNow } from './kdsClock';
import { KdsTicket, type TicketMode } from './KdsTicket';
import {
  type Thresholds, DEFAULT_THRESHOLDS, READY_WINDOW_MS, forStation, fullyReady, lastReadyAt, sortOrders,
  levelFor, createdMs, isManualUrgent, itemsOf, nextStatus,
} from './kdsModel';

const KDS_CSS = `
.kds-root { font-size: 18px; background: #111418; }
.kds-root:fullscreen { overflow-y: auto; width: 100vw; height: 100vh; }
@media (min-width: 1600px) { .kds-root { font-size: 24px; } }
.kds-grid { display: grid; gap: 0.75em; grid-template-columns: repeat(auto-fill, minmax(min(15em, 100%), 1fr)); align-items: start; }
@keyframes kds-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } 50% { box-shadow: 0 0 0 0.35em rgba(239, 68, 68, 0.45); } }
.kds-pulse { animation: kds-pulse 2s ease-in-out infinite; }
@keyframes kds-leave { to { opacity: 0; transform: translateY(-0.6em) scale(0.96); } }
.kds-leaving { animation: kds-leave 300ms ease-in forwards; pointer-events: none; }
@media (prefers-reduced-motion: reduce) { .kds-pulse { animation: none; } .kds-leaving { animation-duration: 1ms; } }
`;

const AUDIO_SRC = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBWF3l7';

const unwrap = (res: any) => res?.data?.data ?? res?.data ?? [];

function playReadyChime() {
  try {
    const ctx = new AudioContext();
    [0, 0.15].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 1047;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.12);
    });
    setTimeout(() => ctx.close().catch(() => {}), 500); // FIX 14
  } catch { /* AudioContext bloqueado */ }
}

const Clock = memo(function Clock() {
  const hhmm = useNow((n) => new Date(Math.floor(n / 60_000) * 60_000).toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit' }));
  return <span className="font-black text-white tabular-nums text-[1.4em]" data-testid="kds-reloj">{hhmm}</span>;
});

const stamp = (to: string) => (to === 'PREPARING' ? { preparingAt: new Date().toISOString() } : to === 'READY' ? { readyAt: new Date().toISOString() } : { preparingAt: null, readyAt: null });

export default function KDS() {
  const queryClient = useQueryClient();
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [view, setView] = useState<TicketMode>('cocina');
  const [onlyLate, setOnlyLate] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null); // LOTE 323 (B4-16)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('kds_sound') !== 'false'; } catch { return true; }
  });
  const [socketConnected, setSocketConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  // Pedidos con una escritura en curso (anti doble toque por ticket)
  const [busy, setBusy] = useState<Set<string>>(() => new Set());

  const socketRef = useRef<Socket | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null); // TAREA 335: pantalla completa solo del KDS (modo TV, sin menu lateral)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectedStationRef = useRef(selectedStation);
  const soundEnabledRef = useRef(soundEnabled);
  const user = useAuthStore((s) => s.user);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { selectedStationRef.current = selectedStation; }, [selectedStation]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  const isSuspended = useSuspendedGuard();

  // Estaciones del tenant (FIX 64: UUID iguales a la BD)
  const { data: tenantStations = [] } = useQuery<any[]>({
    queryKey: ['kds-stations'],
    queryFn: async () => unwrap(await api.get('/kitchen/stations')),
    staleTime: 5 * 60 * 1000,
    refetchInterval: isSuspended ? false : 60_000,
  });
  const stations = useMemo(() => ([
    { id: 'all', name: 'Todas' },
    ...tenantStations.filter((s: any) => s && s.id && s.active !== false).map((s: any) => ({ id: String(s.id), name: s.name || 'Estación' })),
    { id: 'unassigned', name: 'Sin asignar' },
  ]), [tenantStations]);
  useEffect(() => {
    if (!stations.some((s) => s.id === selectedStation)) setSelectedStation('all');
  }, [stations, selectedStation]);

  // Umbrales del semaforo del local (Config > KDS)
  const { data: thresholdsRaw } = useQuery<Thresholds>({
    queryKey: ['kds-settings'],
    queryFn: async () => unwrap(await api.get('/kds/settings')),
    staleTime: 5 * 60 * 1000,
    refetchInterval: isSuspended ? false : 5 * 60_000,
  });
  const thresholds = useMemo<Thresholds>(() => {
    const a = Number(thresholdsRaw?.amberMin), r = Number(thresholdsRaw?.redMin);
    return Number.isFinite(a) && Number.isFinite(r) && a >= 1 && r > a ? { amberMin: a, redMin: r } : DEFAULT_THRESHOLDS;
  }, [thresholdsRaw?.amberMin, thresholdsRaw?.redMin]);

  // Pedidos del dia: un solo pedido para todas las estaciones (contadores por pestana); el filtro es el mismo del backend (FIX 63)
  const { data: initialOrders = [], isFetched } = useQuery<any[]>({
    queryKey: ['kds', 'all'],
    queryFn: async () => unwrap(await api.get('/kds/orders')),
    refetchInterval: isSuspended ? false : 10_000, // FIX 7: respaldo del socket
  });
  // Pedidos de dias anteriores archivados a las 03:00 (pestana Antiguos)
  const { data: archived = [] } = useQuery<any[]>({
    queryKey: ['kds', 'archived'],
    queryFn: async () => unwrap(await api.get('/kds/archived')),
    refetchInterval: isSuspended ? false : 60_000,
  });

  // HOTFIX 307 (B4-08): un pedido nuevo suena tambien cuando llega por recarga; la primera carga no suena.
  const seenOrdersRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    setOrders(initialOrders);
    if (!isFetched) return;
    const ids = initialOrders.map((o: any) => o.id);
    const seen = seenOrdersRef.current;
    if (seen && ids.some((id: string) => !seen.has(id)) && soundEnabledRef.current && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
    seenOrdersRef.current = new Set([...(seen ?? []), ...ids]);
  }, [initialOrders, isFetched]);

  // WebSocket: se crea UNA vez; el cambio de estacion solo cambia de room
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4200';
    const socket = io(SOCKET_URL, { transports: ['polling', 'websocket'], path: '/socket.io', auth: staffSocketAuth }); // TAREA 281
    socketRef.current = socket;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['kds'] });

    socket.on('connect', () => {
      setSocketConnected(true);
      setReconnecting(false);
      const tid = userRef.current?.tenantId;
      if (tid) {
        socket.emit('joinTenantRoom', { tenantId: tid, room: selectedStationRef.current });
        socket.emit('joinTenantRoom', { tenantId: tid, room: 'kds' });
      }
    });
    socket.on('disconnect', () => { setSocketConnected(false); setReconnecting(true); });

    socket.on('order.new', (order: any) => {
      if (!order?.id) return;
      seenOrdersRef.current?.add(order.id);
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      if (soundEnabledRef.current && audioRef.current) audioRef.current.play().catch(() => {});
    });
    let changedTimer: ReturnType<typeof setTimeout> | null = null;
    socket.on('orders.changed', () => { // HOTFIX 307 (B4-08)
      if (changedTimer) clearTimeout(changedTimer);
      changedTimer = setTimeout(invalidate, 300);
    });
    // Solo cambia el pedido que llego (si trae items; si no, se conservan los de pantalla)
    socket.on('order.updated', (order: any) => {
      if (!order?.id) return;
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...order, items: itemsOf(order).length ? itemsOf(order) : o.items } : o)));
    });
    socket.on('order.paid', (data: { orderId: string }) => setOrders((prev) => prev.filter((o) => o.id !== data.orderId)));
    // TAREA 335: un pedido listo no desaparece: pasa a la pestana Listos (10 min)
    socket.on('order.ready', (order: any) => {
      const ts = new Date().toISOString();
      setOrders((prev) => prev.map((o) => (o.id === order?.id
        ? { ...o, status: 'READY', items: itemsOf(o).map((i: any) => (i.status === 'PENDING' || i.status === 'PREPARING' ? { ...i, status: 'READY', readyAt: ts } : i)) }
        : o)));
      invalidate();
      if (soundEnabledRef.current) playReadyChime();
    });
    socket.on('order.items.progress', invalidate); // TAREA 280
    socket.on('order.item.cancelled', (d: { name?: string; quantity?: number; reason?: string; orderNumber?: string }) => { // LOTE 323 (B4-16)
      invalidate();
      setCancelNotice(`ANULADO: ${d?.quantity ?? 1}x ${d?.name ?? 'Producto'}${d?.orderNumber ? ` (pedido ${d.orderNumber})` : ''}${d?.reason ? ` — ${d.reason}` : ''}`);
      if (soundEnabledRef.current && audioRef.current) audioRef.current.play().catch(() => {});
    });
    socket.on('order.urgent', (data: { orderId: string }) => setOrders((prev) => prev.map((o) => (o.id === data.orderId ? { ...o, _urgent: true } : o))));
    socket.on('order.recalled', invalidate);

    return () => { if (changedTimer) clearTimeout(changedTimer); socket.disconnect(); socketRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    const tid = userRef.current?.tenantId;
    if (tid) socket.emit('joinTenantRoom', { tenantId: tid, room: selectedStation });
    return () => { if (tid) socket.emit('leaveTenantRoom', { tenantId: tid, room: selectedStation }); };
  }, [selectedStation]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) (rootRef.current ?? document.documentElement).requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };
  const toggleSound = () => setSoundEnabled((prev) => {
    const next = !prev;
    try { localStorage.setItem('kds_sound', String(next)); } catch { /* sin almacenamiento */ }
    return next;
  });

  // ── Escrituras: cambio optimista solo del pedido tocado + API; al terminar (o si falla) se recarga ──
  const patchItems = useCallback((orderId: string, fn: (i: any) => any) => {
    const apply = (list: any[]) => list.map((o) => (o.id === orderId ? { ...o, items: itemsOf(o).map(fn) } : o));
    setOrders((prev) => apply(prev));
    queryClient.setQueryData<any[]>(['kds', 'archived'], (prev) => (prev ? apply(prev) : prev));
  }, [queryClient]);

  const withBusy = useCallback(async (orderId: string, work: () => Promise<void>) => {
    setBusy((s) => new Set(s).add(orderId));
    try { await work(); } catch { /* el estado real llega con la recarga */ } finally {
      setBusy((s) => { const n = new Set(s); n.delete(orderId); return n; });
      queryClient.invalidateQueries({ queryKey: ['kds'] });
    }
  }, [queryClient]);

  const onItem = useCallback((order: any, item: any) => {
    const to = nextStatus(item.status);
    if (!to) return;
    patchItems(order.id, (i) => (i.id === item.id ? { ...i, status: to, ...stamp(to) } : i));
    withBusy(order.id, async () => { await api.put(`/kds/item/${item.id}/${to === 'PREPARING' ? 'preparing' : 'ready'}`); });
  }, [patchItems, withBusy]);

  const onAllReady = useCallback((order: any) => {
    const ids = itemsOf(order).filter((i: any) => i.status === 'PENDING' || i.status === 'PREPARING').map((i: any) => i.id);
    if (!ids.length) return;
    const set = new Set(ids);
    patchItems(order.id, (i) => (set.has(i.id) ? { ...i, status: 'READY', ...stamp('READY') } : i));
    withBusy(order.id, async () => { for (const id of ids) await api.put(`/kds/item/${id}/ready`); });
  }, [patchItems, withBusy]);

  const onRecall = useCallback((order: any, item: any) => {
    patchItems(order.id, (i) => (i.id === item.id ? { ...i, status: 'PENDING', ...stamp('PENDING') } : i));
    withBusy(order.id, async () => { await api.put(`/kds/item/${item.id}/recall`); });
  }, [patchItems, withBusy]);

  const onUrgent = useCallback((order: any) => {
    api.patch(`/kds/order/${order.id}/urgent`)
      .then(() => setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, _urgent: true } : o))))
      .catch(() => {});
  }, []);

  // ── Listas por estacion (identidad estable por pedido) ──
  const sorted = useMemo(() => sortOrders(orders), [orders]);
  const byStation = useMemo(() => sorted.map((o) => forStation(o, selectedStation)).filter(Boolean) as any[], [sorted, selectedStation]);
  const active = useMemo(() => byStation.filter((o) => !fullyReady(o)), [byStation]);
  const readyAll = useMemo(() => byStation.filter((o) => fullyReady(o)), [byStation]);
  const archivedShown = useMemo(() => sortOrders(archived).map((o) => forStation(o, selectedStation)).filter(Boolean) as any[], [archived, selectedStation]);

  // Contador por estacion: pedidos en curso con items de esa estacion
  const stationCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of stations) m[s.id] = sorted.reduce((n, o) => { const f = forStation(o, s.id); return f && !fullyReady(f) ? n + 1 : n; }, 0);
    return m;
  }, [stations, sorted]);

  // Reloj grueso (10 s) solo para el filtro de retrasados y la ventana de 10 min de Listos
  const tick = useNow((n) => Math.floor(n / 10_000));
  const readyShown = useMemo(() => {
    const now = tick * 10_000 + 9_999;
    return readyAll.filter((o) => { const t = lastReadyAt(o); return !t || now - t <= READY_WINDOW_MS; })
      .sort((a, b) => lastReadyAt(b) - lastReadyAt(a));
  }, [readyAll, tick]);

  // Salida animada (300 ms) del ticket que queda todo listo en En cocina
  const [exiting, setExiting] = useState<Set<string>>(() => new Set());
  const prevActive = useRef<{ key: string; ids: Set<string> } | null>(null);
  useLayoutEffect(() => {
    const ids = new Set(active.map((o) => o.id));
    const prev = prevActive.current;
    prevActive.current = { key: selectedStation, ids };
    if (!prev || prev.key !== selectedStation) return;
    const readyIds = new Set(readyAll.map((o) => o.id));
    const gone = [...prev.ids].filter((id) => !ids.has(id) && readyIds.has(id));
    if (!gone.length) return;
    setExiting((s) => new Set([...s, ...gone]));
    setTimeout(() => setExiting((s) => { const n = new Set(s); gone.forEach((g) => n.delete(g)); return n; }), 300);
  }, [active, readyAll, selectedStation]);

  const cocinaShown = useMemo(() => {
    const base = byStation.filter((o) => !fullyReady(o) || exiting.has(o.id));
    if (!onlyLate) return base;
    const now = tick * 10_000;
    return base.filter((o) => levelFor(now - createdMs(o), thresholds, isManualUrgent(o)) !== 'green');
  }, [byStation, exiting, onlyLate, tick, thresholds]);

  const lateCount = useMemo(() => {
    const now = tick * 10_000;
    return active.filter((o) => levelFor(now - createdMs(o), thresholds, isManualUrgent(o)) !== 'green').length;
  }, [active, tick, thresholds]);

  const list = view === 'cocina' ? cocinaShown : view === 'listos' ? readyShown : archivedShown;
  const stationName = stations.find((s) => s.id === selectedStation)?.name ?? 'Todas';

  const tabs: { id: TicketMode; label: string; count: number }[] = [
    { id: 'cocina', label: 'En cocina', count: active.length },
    { id: 'listos', label: 'Listos', count: readyShown.length },
    { id: 'antiguos', label: 'Antiguos', count: archivedShown.length },
  ];

  return (
    <div ref={rootRef} className="kds-root min-h-screen text-zinc-100" data-testid="kds-root">
      <style>{KDS_CSS}</style>
      {cancelNotice && (
        <div className="bg-red-700 text-white px-[0.8em] py-[0.5em] flex items-center justify-between gap-[0.6em] font-bold text-[1em]" role="alert">
          <span>{cancelNotice}</span>
          <button onClick={() => setCancelNotice(null)} className="min-h-[44px] px-[0.8em] rounded-lg bg-white/20 hover:bg-white/30">Entendido</button>
        </div>
      )}
      {!socketConnected && (
        <div className="bg-red-700 text-white text-center font-bold py-[0.3em] text-[0.85em]" role="status">
          Sin conexión en tiempo real: los pedidos se recargan cada 10 s{reconnecting ? ' · Reconectando…' : ''}
        </div>
      )}
      <audio ref={audioRef} preload="auto"><source src={AUDIO_SRC} type="audio/wav" /></audio>

      {/* Barra superior */}
      <div className="sticky top-0 z-10 bg-[#0B0D10] border-b border-zinc-800 px-[0.75em] py-[0.5em] space-y-[0.5em]">
        <div className="flex flex-wrap items-center gap-[0.5em]">
          <div className="flex gap-[0.3em]" role="tablist" aria-label="Vista">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={view === t.id}
                data-testid={`kds-vista-${t.id}`}
                onClick={() => setView(t.id)}
                className={`min-h-[48px] px-[0.8em] rounded-xl font-black text-[0.95em] flex items-center gap-[0.4em] border-2 ${
                  view === t.id ? 'bg-[#F97316] border-[#F97316] text-[#111418]' : 'bg-zinc-900 border-zinc-700 text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                {t.label}
                <span className={`min-w-[1.6em] text-center rounded-full px-[0.35em] text-[0.9em] ${view === t.id ? 'bg-[#111418] text-white' : 'bg-zinc-700 text-white'}`}>{t.count}</span>
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={() => setOnlyLate((v) => !v)}
            aria-pressed={onlyLate}
            data-testid="kds-solo-retrasados"
            className={`min-h-[48px] px-[0.7em] rounded-xl font-bold text-[0.85em] flex items-center gap-[0.35em] border-2 ${
              onlyLate ? 'border-red-400 bg-red-500/20 text-red-100' : 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            <Flame className="w-[1.1em] h-[1.1em]" aria-hidden /> Solo retrasados ({lateCount})
          </button>
          <button onClick={toggleSound} aria-label={soundEnabled ? 'Silenciar' : 'Activar sonido'} title={soundEnabled ? 'Sonido activado' : 'Sonido apagado'}
            className="w-12 h-12 rounded-xl bg-zinc-900 border-2 border-zinc-700 hover:bg-zinc-800 flex items-center justify-center">
            {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6 text-zinc-400" />}
          </button>
          <button onClick={toggleFullscreen} aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'} title="Pantalla completa"
            className="w-12 h-12 rounded-xl bg-zinc-900 border-2 border-zinc-700 hover:bg-zinc-800 flex items-center justify-center">
            {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
          </button>
          <Clock />
          <span className="flex items-center gap-[0.3em] text-[0.85em] text-zinc-300" data-testid="kds-en-vivo">
            <span className={`w-[0.55em] h-[0.55em] rounded-full ${socketConnected ? 'bg-green-500' : reconnecting ? 'bg-amber-400' : 'bg-red-500'}`} aria-hidden />
            {socketConnected ? 'En vivo' : reconnecting ? 'Reconectando' : 'Sin conexión'}
          </span>
        </div>
        <div className="flex gap-[0.3em] overflow-x-auto pb-[0.1em]" role="tablist" aria-label="Estación">
          {stations.map((s) => {
            const on = selectedStation === s.id;
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={on}
                onClick={() => setSelectedStation(s.id)}
                className={`shrink-0 min-h-[44px] px-[0.75em] rounded-lg font-bold text-[0.85em] flex items-center gap-[0.35em] border-2 ${
                  on ? 'border-[#F97316] bg-[#F97316]/15 text-white' : 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {s.name}
                <span className="min-w-[1.5em] text-center rounded-full bg-zinc-700 text-white px-[0.3em]">{stationCounts[s.id] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cuadricula */}
      <main className="p-[0.75em]">
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[65vh] text-center" data-testid="kds-vacio">
            <ChefHat className="w-[6em] h-[6em] text-zinc-400 mb-[0.4em]" aria-hidden />
            <h2 className="text-[2em] font-black text-white">
              {view === 'cocina' ? (onlyLate ? 'Sin pedidos retrasados' : 'Cocina al día') : view === 'listos' ? 'Sin pedidos listos' : 'Sin pedidos antiguos'}
            </h2>
            <p className="text-zinc-300 text-[0.9em] mt-[0.2em]">
              {view === 'cocina' ? `No hay pedidos pendientes en ${stationName}` : view === 'listos' ? 'Aquí quedan 10 minutos los pedidos terminados' : 'Los pedidos de días anteriores se archivan a las 03:00'}
            </p>
          </div>
        ) : (
          <div className="kds-grid">
            {list.map((o) => (
              <KdsTicket
                key={o.id}
                order={o}
                mode={view}
                thresholds={thresholds}
                leaving={view === 'cocina' && exiting.has(o.id)}
                busy={busy.has(o.id)}
                onItem={onItem}
                onAllReady={onAllReady}
                onRecall={onRecall}
                onUrgent={onUrgent}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
