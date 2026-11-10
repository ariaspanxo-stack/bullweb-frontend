// LOTE 324: Pantalla de pedidos publica /tv/:token (sin login, solo lectura). Dos columnas "Preparando" y "Listo" con
// numero y primer nombre; se actualiza cada 10 s y los pedidos entregados salen solos. Disenada para 16:9 y lectura a 4 m
// (ninguna letra bajo 48 px). Color del encabezado = tema del local.
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

interface TvItem { number: string; name: string | null }
interface TvData {
  name: string; logo: string | null; themeColor: string;
  preparing: TvItem[]; ready: TvItem[]; refreshSeconds: number;
}

const POLL_MS = 10_000;
const PER_COLUMN = 12;
const BIG = 'clamp(48px, 4.2vw, 120px)';
const HUGE = 'clamp(64px, 6vw, 170px)';

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return 0;
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const readableOn = (hex: string) => (luminance(hex) > 0.6 ? '#111827' : '#FFFFFF');

function Column({ title, items, accent, testId }: { title: string; items: TvItem[]; accent: string; testId: string }) {
  const shown = items.slice(0, PER_COLUMN);
  const extra = items.length - shown.length;
  return (
    <section className="flex flex-col min-h-0 rounded-3xl overflow-hidden bg-white/5 border border-white/10" data-testid={testId}>
      <h2 className="px-8 py-4 font-extrabold uppercase tracking-wide" style={{ fontSize: BIG, color: accent }}>{title}</h2>
      <ul className="flex-1 min-h-0 grid grid-cols-2 auto-rows-min gap-x-8 gap-y-4 px-8 pb-6 content-start overflow-hidden">
        {shown.map((it) => (
          <li key={`${it.number}-${it.name ?? ''}`} className="flex items-baseline gap-4 min-w-0" data-testid="tv-item">
            <span className="font-black tabular-nums text-white" style={{ fontSize: HUGE, lineHeight: 1.05 }}>{it.number}</span>
            {it.name && <span className="font-bold text-white/85 truncate" style={{ fontSize: BIG }}>{it.name}</span>}
          </li>
        ))}
      </ul>
      {extra > 0 && <p className="px-8 pb-4 font-bold text-white/70" style={{ fontSize: BIG }}>+{extra} más</p>}
    </section>
  );
}

export default function TvBoard() {
  const { token = '' } = useParams<{ token: string }>();
  const [data, setData] = useState<TvData | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'offline'>('loading');
  const [now, setNow] = useState(() => new Date());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/public/tv/${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (cancelled) return;
        if (res.status === 404) { setState('missing'); setData(null); }
        else if (!res.ok) setState((s) => (s === 'ok' || s === 'offline' ? 'offline' : 'loading'));
        else {
          const json = await res.json();
          if (json?.data) { setData(json.data as TvData); setState('ok'); }
        }
      } catch {
        if (!cancelled) setState((s) => (s === 'missing' ? s : 'offline'));
      }
      if (!cancelled) timer.current = setTimeout(poll, POLL_MS);
    };
    poll();
    const clock = setInterval(() => setNow(new Date()), 30_000);
    return () => { cancelled = true; if (timer.current) clearTimeout(timer.current); clearInterval(clock); };
  }, [token]);

  useEffect(() => { document.title = data?.name ? `${data.name} · Pedidos` : 'Pantalla de pedidos'; }, [data?.name]);

  if (state === 'missing') {
    return (
      <div className="h-screen w-screen bg-gray-950 text-white flex items-center justify-center text-center p-12" data-testid="tv-missing">
        <p className="font-bold" style={{ fontSize: BIG }}>Pantalla no disponible</p>
      </div>
    );
  }

  const theme = data?.themeColor ?? '#F97316';
  const onTheme = readableOn(theme);
  const hora = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Santiago' });

  return (
    <div className="h-screen w-screen bg-gray-950 text-white flex flex-col overflow-hidden select-none" data-testid="tv-board">
      <header className="flex items-center justify-between gap-6 px-10 py-4" style={{ backgroundColor: theme, color: onTheme }}>
        <div className="flex items-center gap-6 min-w-0">
          {data?.logo && <img src={data.logo} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="h-20 w-20 object-contain rounded-xl bg-white/90 p-1 flex-shrink-0" />}
          <h1 className="font-extrabold truncate" style={{ fontSize: BIG }}>{data?.name ?? 'Pedidos'}</h1>
        </div>
        <div className="flex items-center gap-6 flex-shrink-0">
          {state === 'offline' && <span className="font-bold rounded-full px-5 py-1 bg-black/30" style={{ fontSize: 'clamp(48px, 2.6vw, 72px)' }} data-testid="tv-offline">Sin conexión</span>}
          <span className="font-bold tabular-nums" style={{ fontSize: BIG }}>{hora}</span>
        </div>
      </header>
      <main className="flex-1 min-h-0 grid grid-cols-2 gap-8 p-8">
        <Column title="Preparando" items={data?.preparing ?? []} accent="#FDBA74" testId="tv-col-preparing" />
        <Column title="Listo" items={data?.ready ?? []} accent={luminance(theme) > 0.25 ? theme : '#F97316'} testId="tv-col-ready" />
      </main>
    </div>
  );
}
