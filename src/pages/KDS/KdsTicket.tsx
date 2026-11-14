// TAREA 335: ticket tipo comanda del KDS para TV. memo: solo se repinta si cambia su pedido, su nivel de semaforo o su estado de envio.
import { memo } from 'react';
import { AlertTriangle, CheckCircle, CircleDashed, CookingPot, Flame, Clock, Undo2, Siren } from 'lucide-react';
import { useNow } from './kdsClock';
import {
  type Level, type Thresholds, channelOf, channelLabel, callName, shortNumber, isManualUrgent,
  levelFor, createdMs, lastReadyAt, formatElapsed, itemsOf,
} from './kdsModel';

export type TicketMode = 'cocina' | 'listos' | 'antiguos';

const CHANNEL_CHIP: Record<string, string> = {
  mesa: 'bg-slate-500/30 text-slate-100 border-slate-400/60',
  mostrador: 'bg-zinc-500/30 text-zinc-100 border-zinc-400/60',
  delivery: 'bg-violet-400/20 text-violet-100 border-violet-300/60',
  qr: 'bg-teal-400/20 text-teal-100 border-teal-300/60',
};

const LEVEL_STYLE: Record<Level, { border: string; header: string; label: string; text: string }> = {
  green: { border: 'border-green-500', header: 'bg-green-500/15', label: 'A tiempo', text: 'text-green-300' },
  amber: { border: 'border-amber-400', header: 'bg-amber-500/20', label: 'Demorado', text: 'text-amber-300' },
  red: { border: 'border-red-500', header: 'bg-red-500/25', label: 'Atrasado', text: 'text-red-300' },
};
const LEVEL_ICON = { green: Clock, amber: AlertTriangle, red: Flame } as const;

const STATUS = {
  PENDING: { label: 'Pendiente', Icon: CircleDashed, box: 'bg-zinc-800/70 border-zinc-600', tag: 'text-zinc-200' },
  PREPARING: { label: 'Preparando', Icon: CookingPot, box: 'bg-amber-500/15 border-amber-400', tag: 'text-amber-200' },
  READY: { label: 'Listo', Icon: CheckCircle, box: 'bg-green-500/15 border-green-500/80', tag: 'text-green-300' },
} as const;
const statusOf = (s: string) => (s === 'PREPARING' ? STATUS.PREPARING : s === 'READY' || s === 'DELIVERED' ? STATUS.READY : STATUS.PENDING);

function modifierText(m: any): string {
  if (typeof m === 'string') return m;
  return String(m?.name ?? m?.optionName ?? m?.label ?? '');
}

/** Solo el reloj mm:ss se repinta cada segundo. */
function Timer({ from, className }: { from: number; className: string }) {
  const text = useNow((n) => formatElapsed(n - from));
  return <span className={className} data-testid="kds-timer">{text}</span>;
}

interface Props {
  order: any;
  mode: TicketMode;
  thresholds: Thresholds;
  leaving?: boolean;
  busy?: boolean;
  onItem: (order: any, item: any) => void;
  onAllReady: (order: any) => void;
  onRecall: (order: any, item: any) => void;
  onUrgent: (order: any) => void;
}

function KdsTicketBase({ order, mode, thresholds, leaving, busy, onItem, onAllReady, onRecall, onUrgent }: Props) {
  const created = createdMs(order);
  const manual = isManualUrgent(order);
  // El ticket solo se repinta cuando el nivel cambia (verde -> ambar -> rojo), no cada segundo.
  const timeLevel = useNow((n) => levelFor(n - created, thresholds, manual));
  const level: Level = mode === 'cocina' ? timeLevel : mode === 'listos' ? 'green' : 'amber';
  const st = LEVEL_STYLE[level];
  const LevelIcon = LEVEL_ICON[level];
  // Orden fijo de los items (la API no lo garantiza: un item recien actualizado cambia de lugar en la respuesta)
  const items = [...itemsOf(order)].sort((a: any, b: any) =>
    (new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()) || String(a.id).localeCompare(String(b.id)));
  const pending = items.filter((i: any) => i.status !== 'READY' && i.status !== 'DELIVERED').length;
  const name = callName(order);
  const ch = channelOf(order);
  const readyFrom = mode === 'listos' ? (lastReadyAt(order) || Date.now()) : created;

  return (
    <article
      data-testid="kds-ticket"
      data-order-id={order.id}
      data-level={level}
      aria-label={`Pedido ${shortNumber(order)}`}
      className={`kds-ticket rounded-2xl border-4 bg-[#1A1E24] flex flex-col overflow-hidden ${st.border} ${
        mode === 'cocina' && level === 'red' ? 'kds-pulse' : ''
      } ${leaving ? 'kds-leaving' : ''}`}
    >
      {/* Cabecera: numero grande, canal, nombre para llamar y tiempo */}
      <header className={`px-[0.7em] py-[0.5em] ${st.header}`}>
        <div className="flex items-start justify-between gap-[0.5em]">
          <span className="font-black text-white leading-none text-[2em] tabular-nums">#{shortNumber(order)}</span>
          {mode === 'antiguos' ? (
            <span className="text-[0.85em] font-bold text-amber-200 text-right leading-tight">
              De días anteriores<br />
              {new Date(created).toLocaleString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <Timer from={readyFrom} className={`font-black leading-none text-[1.75em] tabular-nums ${mode === 'listos' ? 'text-green-300' : 'text-white'}`} />
          )}
        </div>
        <div className="mt-[0.4em] flex items-center justify-between gap-[0.5em]">
          <div className="flex items-center gap-[0.4em] min-w-0">
            <span className={`shrink-0 border rounded-full px-[0.6em] py-[0.1em] text-[0.85em] font-bold ${CHANNEL_CHIP[ch]}`} data-testid="kds-canal">
              {channelLabel(order)}
            </span>
          </div>
          {mode === 'cocina' && (
            <span className={`shrink-0 flex items-center gap-[0.25em] text-[0.85em] font-bold ${st.text}`}>
              <LevelIcon className="w-[1.1em] h-[1.1em]" aria-hidden />
              {manual ? 'Urgente' : st.label}
            </span>
          )}
          {mode === 'listos' && (
            <span className="shrink-0 flex items-center gap-[0.25em] text-[0.85em] font-bold text-green-300">
              <CheckCircle className="w-[1.1em] h-[1.1em]" aria-hidden /> Listo
            </span>
          )}
        </div>
        {name && <p className="mt-[0.3em] truncate font-black text-white text-[1.25em] leading-tight" data-testid="kds-nombre">{name}</p>}
      </header>

      {/* Items: un toque avanza pendiente -> preparando -> listo */}
      <ul className="p-[0.5em] space-y-[0.4em] flex-1">
        {items.map((item: any) => {
          const s = statusOf(item.status);
          const done = s === STATUS.READY;
          const mods = Array.isArray(item.modifiers) ? item.modifiers.map(modifierText).filter(Boolean) : [];
          const label = `${item.quantity}x ${item.products?.name || item.name || 'Producto'}`;
          const canTap = mode !== 'listos' && !done;
          return (
            <li key={item.id}>
              <button
                type="button"
                data-testid="kds-item"
                data-status={item.status}
                disabled={!canTap || busy}
                onClick={() => onItem(order, item)}
                aria-label={`${label}: ${s.label}${canTap ? `. Toca para pasar a ${item.status === 'PENDING' ? 'Preparando' : 'Listo'}` : ''}`}
                className={`w-full text-left rounded-xl border-2 px-[0.5em] py-[0.4em] min-h-[56px] flex items-start gap-[0.5em] transition-colors ${s.box} ${
                  canTap ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'
                } disabled:opacity-100`}
              >
                <span className="shrink-0 w-10 h-10 rounded-full bg-[#111418] border-2 border-zinc-500 flex items-center justify-center font-black text-white text-[0.95em]">
                  {item.quantity}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block font-bold leading-tight text-[1.1667em] ${done ? 'line-through decoration-2 decoration-green-300/70 text-zinc-300' : 'text-white'}`}>
                    {item.products?.name || item.name || 'Producto'}
                  </span>
                  {mods.length > 0 && (
                    <span className="block mt-[0.15em] text-amber-300 font-semibold text-[0.9em] leading-snug">
                      {mods.join(' · ')}
                    </span>
                  )}
                  {item.notes && (
                    <span className="mt-[0.15em] flex items-start gap-[0.25em] text-amber-300 font-bold text-[0.9em] leading-snug" data-testid="kds-nota">
                      <AlertTriangle className="w-[1em] h-[1em] mt-[0.15em] shrink-0" aria-hidden />
                      <span>{item.notes}</span>
                    </span>
                  )}
                </span>
                <span className={`shrink-0 flex items-center gap-[0.25em] text-[0.85em] font-bold ${s.tag}`}>
                  <s.Icon className="w-[1.2em] h-[1.2em]" aria-hidden />
                  <span>{s.label}</span>
                </span>
              </button>
              {mode === 'listos' && done && (
                <button
                  type="button"
                  onClick={() => onRecall(order, item)}
                  disabled={busy}
                  className="mt-[0.25em] w-full min-h-[44px] rounded-lg border border-zinc-500 text-zinc-100 font-bold text-[0.85em] flex items-center justify-center gap-[0.3em] hover:bg-zinc-700"
                >
                  <Undo2 className="w-[1em] h-[1em]" aria-hidden /> Recuperar {item.products?.name || item.name || ''}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {mode !== 'listos' && (
        <footer className="p-[0.5em] pt-0 flex gap-[0.4em]">
          <button
            type="button"
            data-testid="kds-todo-listo"
            onClick={() => onAllReady(order)}
            disabled={busy || pending === 0}
            className="flex-1 min-h-[56px] rounded-xl bg-[#F97316] hover:bg-orange-400 text-[#111418] font-black text-[1em] flex items-center justify-center gap-[0.35em] disabled:opacity-60"
          >
            <CheckCircle className="w-[1.2em] h-[1.2em]" aria-hidden /> Todo listo
          </button>
          {mode === 'cocina' && !manual && (
            <button
              type="button"
              onClick={() => onUrgent(order)}
              aria-label="Marcar urgente"
              title="Marcar urgente"
              className="shrink-0 w-14 min-h-[56px] rounded-xl border-2 border-red-400/70 text-red-300 flex items-center justify-center hover:bg-red-500/10"
            >
              <Siren className="w-[1.3em] h-[1.3em]" aria-hidden />
            </button>
          )}
        </footer>
      )}
    </article>
  );
}

export const KdsTicket = memo(KdsTicketBase);
