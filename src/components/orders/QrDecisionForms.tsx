// ─────────────────────────────────────────────────────────────────────────────
// HOTFIX 272 — Aceptar / rechazar pedidos QR (compartido por el modal QROrderAlert y Pedidos Online).
// Aceptar: minutos de demora (prellenados con el default del tenant, Config → Carta QR) y, si es delivery,
// costo de envío editable con total en vivo. Rechazar: motivo de una lista corta (opcional).
// Sistema de diseño: Aceptar naranja (relleno), Rechazar contorno; botones >= 44 px; montos en bold.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import api from '@/services/api';
import { formatCurrency } from '@/lib/utils';

export const QR_REJECT_REASONS = ['Sin stock', 'Local cerrado', 'Zona sin cobertura', 'Pedido duplicado', 'Otro'];

/** Minutos sin respuesta a partir de los cuales el pedido se marca "Sin responder". */
export const QR_UNANSWERED_MINUTES = 3;

export interface QrAcceptDefaults { pickupMinutes: number; deliveryMinutes: number; deliveryFee: number }
const FALLBACK_DEFAULTS: QrAcceptDefaults = { pickupMinutes: 15, deliveryMinutes: 45, deliveryFee: 2000 };

/** Defaults del tenant para prellenar el formulario de aceptar (una lectura por montaje). */
export function useQrAcceptDefaults(): QrAcceptDefaults {
  const [defaults, setDefaults] = useState<QrAcceptDefaults>(FALLBACK_DEFAULTS);
  useEffect(() => {
    let alive = true;
    api.get<any>('/qr-orders/defaults')
      .then(r => { const d = r.data?.data; if (alive && d) setDefaults({ ...FALLBACK_DEFAULTS, ...d }); })
      .catch(() => { /* sin red: quedan 15/45/2000 */ });
    return () => { alive = false; };
  }, []);
  return defaults;
}

/** Tipo visible del pedido: delivery, servir en mesa (QR por mesa) o retiro. */
export function qrOrderTypeLabel(orderType: string | null | undefined, tableNumber?: string | null): string {
  if (String(orderType ?? '').toLowerCase() === 'delivery') return 'Delivery';
  if (tableNumber) return `Servir en mesa ${tableNumber}`;
  return 'Retiro';
}

export function SinResponderBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 ${className}`}>
      Sin responder
    </span>
  );
}

const digits = (v: string) => v.replace(/[^\d]/g, '');

interface AcceptProps {
  isDelivery:   boolean;
  subtotal:     number;
  defaults:     QrAcceptDefaults;
  /** Envío ya informado en el pedido (> 0 manda sobre el default del tenant). */
  initialFee?:  number;
  dark?:        boolean;
  busy?:        boolean;
  onConfirm:    (estimatedMinutes: number, deliveryFee?: number) => void;
  onBack:       () => void;
}

export function QrAcceptForm({ isDelivery, subtotal, defaults, initialFee, dark = false, busy = false, onConfirm, onBack }: AcceptProps) {
  const defMinutes = isDelivery ? defaults.deliveryMinutes : defaults.pickupMinutes;
  const defFee     = initialFee && initialFee > 0 ? initialFee : defaults.deliveryFee;
  const [minutes, setMinutes] = useState(String(defMinutes));
  const [fee,     setFee]     = useState(String(defFee));
  // el default llega async: prellenar mientras el usuario no haya escrito
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (!touched) { setMinutes(String(defMinutes)); setFee(String(defFee)); } }, [defMinutes, defFee, touched]);

  const minutesNum = Number(minutes);
  const minutesOk  = minutes !== '' && minutesNum >= 1 && minutesNum <= 999;
  const feeNum     = Math.max(0, Math.round(Number(fee) || 0));
  const total      = subtotal + (isDelivery ? feeNum : 0);

  const box   = dark ? 'bg-gray-800 border border-gray-700' : 'bg-orange-50 border border-orange-200';
  const label = dark ? 'text-gray-300' : 'text-gray-700';
  const input = 'w-28 min-h-[44px] rounded-lg bg-white text-gray-900 font-bold text-base px-3 text-right border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50';

  return (
    <div className={`rounded-xl p-3 space-y-2 ${box}`}>
      <label className="flex items-center justify-between gap-3">
        <span className={`text-sm font-semibold ${label}`}>Minutos de demora</span>
        <input
          type="text" inputMode="numeric" aria-label="Minutos de demora" disabled={busy}
          value={minutes}
          onChange={e => { setTouched(true); setMinutes(digits(e.target.value).slice(0, 3)); }}
          className={input}
        />
      </label>
      {isDelivery && (
        <label className="flex items-center justify-between gap-3">
          <span className={`text-sm font-semibold ${label}`}>Costo de envío ($)</span>
          <input
            type="text" inputMode="numeric" aria-label="Costo de envío" disabled={busy}
            value={fee}
            onChange={e => { setTouched(true); setFee(digits(e.target.value) || '0'); }}
            className={input}
          />
        </label>
      )}
      <div className="flex items-center justify-between pt-1">
        <span className={`text-sm ${label}`}>Total{isDelivery ? ' con envío' : ''}</span>
        <span className={`text-lg font-black ${dark ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(total)}</span>
      </div>
      {!minutesOk && <p className="text-xs text-red-500">Ingresa minutos entre 1 y 999.</p>}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button" onClick={onBack} disabled={busy}
          className={`min-h-[44px] rounded-xl border-2 font-semibold text-sm transition-colors disabled:opacity-50 ${dark ? 'border-gray-600 text-gray-300 hover:border-gray-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          Volver
        </button>
        <button
          type="button" disabled={busy || !minutesOk}
          onClick={() => onConfirm(Math.round(minutesNum), isDelivery ? feeNum : undefined)}
          className="min-h-[44px] rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors disabled:opacity-50"
        >
          {busy ? 'Procesando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}

interface RejectProps {
  dark?:     boolean;
  busy?:     boolean;
  onConfirm: (reason?: string) => void;
  onBack:    () => void;
}

export function QrRejectForm({ dark = false, busy = false, onConfirm, onBack }: RejectProps) {
  const [reason, setReason] = useState('');
  return (
    <div className="space-y-3">
      <p className={`text-sm ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Motivo del rechazo (opcional):</p>
      <div className="flex flex-wrap gap-2">
        {QR_REJECT_REASONS.map(r => (
          <button
            key={r} type="button" onClick={() => setReason(reason === r ? '' : r)}
            className={`min-h-[44px] text-sm px-3 rounded-full border-2 transition-colors ${
              reason === r
                ? 'border-red-500 text-red-500 font-semibold'
                : dark ? 'border-gray-600 text-gray-400 hover:border-gray-500' : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button" onClick={onBack} disabled={busy}
          className={`min-h-[44px] rounded-xl border-2 font-semibold text-sm transition-colors disabled:opacity-50 ${dark ? 'border-gray-600 text-gray-300 hover:border-gray-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          Volver
        </button>
        <button
          type="button" disabled={busy} onClick={() => onConfirm(reason || undefined)}
          className="min-h-[44px] rounded-xl border-2 border-red-500 text-red-500 hover:bg-red-50/10 font-bold text-sm transition-colors disabled:opacity-50"
        >
          {busy ? 'Procesando...' : 'Confirmar rechazo'}
        </button>
      </div>
    </div>
  );
}
