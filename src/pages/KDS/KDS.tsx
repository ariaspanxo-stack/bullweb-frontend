import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import io, { Socket } from 'socket.io-client';
import { 
  Maximize, 
  Volume2, 
  VolumeX, 
  Clock,
  AlertCircle,
  CheckCircle,
  Flame,
  Snowflake,
  Coffee,
  Cake,
  Play,
} from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useSuspendedGuard } from '@/hooks/useSuspendedGuard';

type Station = 'cold' | 'hot' | 'bar' | 'desserts' | 'all' | 'unassigned';

const STATIONS = [
  { id: 'all',        name: 'Todas',        icon: null,      color: 'from-zinc-600 to-zinc-500',    emoji: '🍽️'  },
  { id: 'hot',        name: 'Caliente',     icon: Flame,     color: 'from-orange-600 to-orange-500', emoji: null  },
  { id: 'cold',       name: 'Fría',         icon: Snowflake, color: 'from-blue-600 to-blue-500',    emoji: null  },
  { id: 'bar',        name: 'Bar',          icon: Coffee,    color: 'from-purple-600 to-purple-500', emoji: null  },
  { id: 'desserts',   name: 'Postres',      icon: Cake,      color: 'from-pink-600 to-pink-500',    emoji: null  },
  { id: 'unassigned', name: 'Sin asignar',  icon: null,      color: 'from-gray-500 to-gray-400',    emoji: '❓'  },
];

// ── Urgencia ────────────────────────────────────────────────────────────────────────
type UrgencyLevel = 'normal' | 'warning' | 'urgent' | 'critical';

function getUrgency(
  createdAt: string,
  priority = 0,
  _urgent = false,
): { level: UrgencyLevel; minutes: number; isManual: boolean } {
  const minutes = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 60_000
  );
  const isManual = priority === 1 || _urgent;
  if (isManual || minutes >= 25) return { level: 'critical', minutes, isManual };
  if (minutes >= 15)             return { level: 'urgent',   minutes, isManual };
  if (minutes >= 10)             return { level: 'warning',  minutes, isManual };
  return                                { level: 'normal',   minutes, isManual };
}

const urgencyStyles: Record<UrgencyLevel, {
  border: string;
  header: string;
  badge: { text: string; label: string } | null;
}> = {
  normal:   { border: 'border-zinc-700',                            header: 'bg-zinc-800',      badge: null },
  warning:  { border: 'border-yellow-500/60',                       header: 'bg-yellow-900/30', badge: { text: 'bg-yellow-500/20 text-yellow-300',          label: '⏱ 10+ min'   } },
  urgent:   { border: 'border-orange-500/80',                       header: 'bg-orange-900/40', badge: { text: 'bg-orange-500/20 text-orange-300',          label: '⚠️ ATRASADO' } },
  critical: { border: 'border-red-500 shadow-red-500/20 shadow-lg', header: 'bg-red-900/50',    badge: { text: 'bg-red-500/30 text-red-300 animate-pulse',  label: '🔴 URGENTE'  } },
};

// ── Tiempos máximos por estación en minutos (FIX 10) ─────────────────────────────────────
const MAX_MINUTES_BY_STATION: Record<string, number> = {
  hot: 15, cold: 20, bar: 10, desserts: 12, all: 20, unassigned: 20,
};

// ── Barra de tiempo por ítem ─────────────────────────────────────────────────────
function ItemTiming({ item, now, station = 'all' }: { item: any; now: number; station?: string }) {
  if (item.status !== 'PREPARING' || !item.preparingAt) return null;
  const maxMs      = (MAX_MINUTES_BY_STATION[station] ?? 20) * 60_000;
  const elapsedMs  = now - new Date(item.preparingAt).getTime();
  const elapsedMin = Math.floor(elapsedMs / 60_000);
  const pct        = Math.min(100, (elapsedMs / maxMs) * 100);
  const barColor   =
    pct >= 90 ? 'bg-red-500'    :
    pct >= 60 ? 'bg-orange-400' :
    pct >= 30 ? 'bg-yellow-400' :
               'bg-green-400';
  return (
    <div className="mt-1.5 space-y-0.5">
      <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-zinc-500 text-right tabular-nums">
        {elapsedMin === 0 ? 'recién iniciado' : `${elapsedMin} min preparando`}
      </p>
    </div>
  );
}

export default function KDS() {
  const queryClient = useQueryClient();
  const [selectedStation, setSelectedStation] = useState<Station>('hot');
  const [orders, setOrders] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    () => localStorage.getItem('kds_sound') !== 'false'
  );
  const [now, setNow] = useState(Date.now());
  const [socketConnected, setSocketConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [confirmedCount, setConfirmedCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Refs para evitar closures obsoletas dentro del socket (montado una sola vez)
  const selectedStationRef = useRef<Station>(selectedStation);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const user = useAuthStore(s => s.user);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const isSuspended = useSuspendedGuard();

  // Query inicial de órdenes
  const { data: initialOrders = [], isFetching } = useQuery<any[]>({
    queryKey: ['kds', selectedStation],
    queryFn: async () => {
      if (selectedStation === 'all') {
        const response = await api.get('/kds/orders');
        return response.data;
      }
      if (selectedStation === 'unassigned') {
        // Traer todas y filtrar client-side por items sin kdsStation
        try {
          const response = await api.get('/kds/orders');
          const allOrders: any[] = response.data || [];
          return allOrders.map((o: any) => ({
            ...o,
            items: (o.items || []).filter(
              (i: any) => !i.kdsStation || i.kdsStation === ''
            ),
          })).filter((o: any) => o.items.length > 0);
        } catch {
          return [];
        }
      }
      const response = await api.get(`/kds/station/${selectedStation}`);
      return response.data;
    },
    refetchInterval: isSuspended ? false : 10000, // Refetch cada 10 segundos como fallback (FIX 7)
  });

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // FIX 6: solo actualizar el badge cuando el fetch completa (evitar número stale)
  useEffect(() => {
    if (!isFetching) {
      setConfirmedCount(orders.length);
    }
  }, [orders, isFetching]);

  // Stats globales KDS — FIX 15
  const { data: kdsStats } = useQuery({
    queryKey: ['kds-stats'],
    queryFn: async () => {
      const res = await api.get('/kds/stats');
      return res.data?.data ?? res.data;
    },
    refetchInterval: isSuspended ? false : 10000,
  });

  // Sincronizar refs con el estado actual
  useEffect(() => { selectedStationRef.current = selectedStation; }, [selectedStation]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // Actualizar temporizadores cada minuto (barras de progreso ItemTiming)
  useEffect(() => {
    if (isSuspended) return;
    const interval = setInterval(() => setNow(Date.now()), 10_000); // FIX 13: 10s
    return () => clearInterval(interval);
  }, [isSuspended]);

  // WebSocket — se crea UNA sola vez al montar. Nunca se destruye por cambio de estación.
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_WS_URL
      || import.meta.env.VITE_API_URL?.replace('/api', '')
      || 'http://localhost:4200';

    const socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'], // polling primero → más estable detrás de Nginx
      path: '/socket.io',
    });
    socketRef.current = socket;

    // Al (re)conectar, unirse a la estación actual y al room global KDS
    socket.on('connect', () => {
      setSocketConnected(true);
      setReconnecting(false);
      const tid = userRef.current?.tenantId;
      if (tid) {
        socket.emit('joinTenantRoom', { tenantId: tid, room: selectedStationRef.current });
        // Bug 2 fix: también unirse al room 'kds' para recibir broadcasts de urgencia
        socket.emit('joinTenantRoom', { tenantId: tid, room: 'kds' });
      }
    });

    // FIX 9: indicador de desconexion
    socket.on('disconnect', () => {
      setSocketConnected(false);
      setReconnecting(true);
    });

    // Nueva orden
    socket.on('order.new', (order: any) => {
      setOrders(prev => [order, ...prev]);
      if (soundEnabledRef.current && audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    });

    // Orden actualizada
    socket.on('order.updated', (order: any) => {
      setOrders(prev => prev.map(o => (o.id === order.id ? order : o)));
    });

    // Orden lista (remover de pantalla) — BUG 4: shape ya es objeto directo tras fix backend
    socket.on('order.ready', (order: any) => {
      setOrders(prev => prev.filter(o => o.id !== order.id));
      if (soundEnabledRef.current) {
        try {
          const ctx = new AudioContext();
          const delays = [0, 0.15];
          delays.forEach((delay) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 1047;
            gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.12);
          });
          // FIX 14: cerrar AudioContext tras reproducir
          setTimeout(() => ctx.close().catch(() => {}), 500);
        } catch { /* AudioContext bloqueado */ }
      }
    });

    // Orden marcada urgente desde otra estación
    socket.on('order.urgent', (data: { orderId: string }) => {
      setOrders(prev => prev.map(o => o.id === data.orderId ? { ...o, _urgent: true } : o));
    });

    // Orden recuperada (recall)
    socket.on('order.recalled', (order: any) => {
      setOrders(prev => {
        const exists = prev.find(o => o.id === order.id);
        if (exists) return prev.map(o => (o.id === order.id ? order : o));
        return [order, ...prev];
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // ← Sin dependencias: el socket vive toda la vida del componente

  // Cambio de estación — solo emite al socket existente, sin recrearlo
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return; // si no está conectado, 'connect' se encargará
    const tid = userRef.current?.tenantId;
    if (tid) socket.emit('joinTenantRoom', { tenantId: tid, room: selectedStation });
    return () => {
      if (tid) socket.emit('leaveTenantRoom', { tenantId: tid, room: selectedStation });
    };
  }, [selectedStation]);

  // Toggle mute con persistencia en localStorage
  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('kds_sound', String(next));
      return next;
    });
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Mutations
  const preparingMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await api.put(`/kds/item/${itemId}/preparing`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds'] });
    },
  });

  const readyMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await api.put(`/kds/item/${itemId}/ready`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds'] });
    },
  });

  const recallMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await api.put(`/kds/item/${itemId}/recall`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds'] });
    },
  });

  const URGENCY_ORDER = { critical: 0, urgent: 1, warning: 2, normal: 3 } as const;
  const sortedOrders = [...orders].sort((a, b) => {
    const ua = getUrgency(a.createdAt, a.priority ?? 0, a._urgent ?? false);
    const ub = getUrgency(b.createdAt, b.priority ?? 0, b._urgent ?? false);
    if (URGENCY_ORDER[ua.level] !== URGENCY_ORDER[ub.level]) {
      return URGENCY_ORDER[ua.level] - URGENCY_ORDER[ub.level];
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const currentStation = STATIONS.find(s => s.id === selectedStation);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* FIX 9: Banner de desconexión */}
      {!socketConnected && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center text-sm font-medium py-2">
          ⚠️ Sin conexión en tiempo real — las órdenes pueden no actualizarse{reconnecting ? ' · Reconectando...' : ''}
        </div>
      )}

      {/* Audio element */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBWF3l7" type="audio/wav" />
      </audio>

      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between max-w-[2000px] mx-auto">
          {/* Estaciones */}
          <div className="flex gap-2">
            {STATIONS.map(station => {
              const Icon = station.icon;
              const isActive = selectedStation === station.id;
              const count = isActive ? orders.length : 0;
              return (
                <button
                  key={station.id}
                  onClick={() => setSelectedStation(station.id as Station)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
                    isActive
                      ? `bg-gradient-to-r ${station.color} text-white shadow-lg scale-105`
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {Icon ? <Icon className="w-5 h-5" /> : <span>{station.emoji}</span>}
                  {station.name}
                  {count > 0 && (
                    <span className="ml-1 bg-white/20 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Controles */}
          <div className="flex items-center gap-4">
            {/* FIX 9: LED de conexión WebSocket */}
            <div className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${
                socketConnected ? 'bg-green-400 animate-pulse'
                  : reconnecting ? 'bg-yellow-400 animate-ping'
                  : 'bg-red-500'
              }`} />
              <span className="text-xs text-zinc-400">
                {socketConnected ? 'En vivo' : reconnecting ? 'Reconectando...' : 'Sin conexión'}
              </span>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold flex items-center justify-end gap-2">
                {isFetching && (
                  <svg className="w-4 h-4 animate-spin text-white/40" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                <span className={isFetching ? 'text-white/40' : ''}>{confirmedCount}</span>
              </div>
              <div className="text-xs text-zinc-500">
                {kdsStats ? `${(kdsStats.pending ?? 0) + (kdsStats.preparing ?? 0)} activos totales` : 'en esta estación'}
              </div>
            </div>

            <button
              onClick={toggleSound}
              className="w-12 h-12 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className="w-12 h-12 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid de órdenes */}
      <div className="p-6 max-w-[2000px] mx-auto">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[70vh]">
            <CheckCircle className="w-24 h-24 text-green-500 mb-4" />
            <h2 className="text-3xl font-bold text-zinc-100 mb-2">
              ¡Todo al día!
            </h2>
            <p className="text-zinc-500">No hay órdenes pendientes en {currentStation?.name}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {sortedOrders.map(order => {
              const urgency = getUrgency(order.createdAt, order.priority ?? 0, order._urgent ?? false);
              const style   = urgencyStyles[urgency.level];

              return (
                <div
                  key={order.id}
                  className={`border-2 rounded-2xl bg-zinc-900 flex flex-col overflow-hidden transition-all duration-500 ${style.border}`}
                >
                  {/* Header */}
                  <div className={`px-4 py-3 flex items-center justify-between ${style.header}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-black text-white truncate">
                        {order.tables ? `Mesa ${order.tables.number}` : `#${order.number || order.id.slice(0, 6)}`}
                      </span>
                      {order.type !== 'DINE_IN' && (
                        <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full shrink-0">
                          {order.type === 'TAKEAWAY' ? 'Para llevar' : 'Delivery'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {style.badge && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge.text}`}>
                          {style.badge.label}
                        </span>
                      )}
                      <span className="text-xs text-white/60 font-mono tabular-nums">
                        {urgency.minutes}min
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="p-4 space-y-3 flex-1">
                    {order.items?.map((item: any) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg transition-all ${
                          item.status === 'READY'
                            ? 'bg-green-500/20 border border-green-500'
                            : item.status === 'PREPARING'
                            ? 'bg-yellow-500/20 border border-yellow-500'
                            : 'bg-zinc-800 border border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <div className="text-base font-bold">
                              {item.quantity}x {item.product?.name || item.name || 'Producto'}
                            </div>

                            {item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
                              <div className="text-xs text-zinc-400 mt-0.5">
                                {item.modifiers.map((m: any, i: number) => (
                                  <div key={i}>• {typeof m === 'string' ? m : m.name}</div>
                                ))}
                              </div>
                            )}

                            {item.notes && (
                              <div className="text-xs text-yellow-400 mt-1 flex items-start gap-1">
                                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                <span>{item.notes}</span>
                              </div>
                            )}

                            <ItemTiming item={item} now={now} station={selectedStation} />
                          </div>

                          {item.status === 'READY' && (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-2 mt-0.5" />
                          )}
                        </div>

                        <div className="flex gap-2 mt-2">
                          {item.status === 'PENDING' && (
                            <button
                              onClick={() => preparingMutation.mutate(item.id)}
                              disabled={preparingMutation.isPending}
                              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
                            >
                              <Play className="w-3 h-3" />
                              Iniciar
                            </button>
                          )}

                          {item.status === 'PREPARING' && (
                            <button
                              onClick={() => readyMutation.mutate(item.id)}
                              disabled={readyMutation.isPending}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1 text-sm"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Listo
                            </button>
                          )}

                          {item.status === 'READY' && (
                            <button
                              onClick={() => recallMutation.mutate(item.id)}
                              disabled={recallMutation.isPending}
                              className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-1.5 px-3 rounded-lg transition-colors text-xs"
                            >
                              Recuperar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="text-xs text-zinc-500 border-t border-zinc-800 px-4 py-2 flex items-center justify-between">
                    <div>
                      <div>Hora: {new Date(order.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</div>
                      {order.customerName && <div className="mt-0.5">Cliente: {order.customerName}</div>}
                    </div>

                    {urgency.level !== 'critical' && (
                      <button
                        onClick={() =>
                          api.patch(`/kds/order/${order.id}/urgent`)
                            .then(() => setOrders(prev =>
                              prev.map(o => o.id === order.id ? { ...o, _urgent: true } : o)
                            ))
                            .catch(() => {})
                        }
                        className="text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-colors"
                      >
                        🔴 Urgente
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
