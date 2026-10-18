// Hotfix #257: descuento con origen único en la orden.
// Mismo endpoint (POST /pos/orders/:id/discount) para OrderModal, PaymentModal y el detalle
// de Mostrador/Delivery; topes (% <= 100, monto <= subtotal) y PIN de administrador sobre el umbral.
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { restaurantService } from '@/services/restaurantService';

export type DiscountKind = 'PERCENTAGE' | 'FIXED';

export interface DiscountPayload {
  type: DiscountKind;
  value: number;
  reason?: string;
}

const PIN_CODES = ['DISCOUNT_PIN_REQUIRED', 'DISCOUNT_PIN_INVALID'];

/**
 * Tope del input: devuelve true si el valor se puede escribir.
 * % entre 0 y 100; monto entre 0 y el subtotal. Vacío siempre se permite.
 */
export function discountInputAllowed(type: DiscountKind, raw: string, subtotal: number): boolean {
  if (raw === '') return true;
  const v = Number(raw);
  if (!Number.isFinite(v) || v < 0) return false;
  return type === 'PERCENTAGE' ? v <= 100 : v <= Math.max(0, Math.round(subtotal));
}

/** Mensaje del tope para mostrar bajo el input */
export function discountLimitHint(type: DiscountKind, subtotal: number): string {
  return type === 'PERCENTAGE'
    ? 'Máximo 100%'
    : `Máximo $${Math.round(Math.max(0, subtotal)).toLocaleString('es-CL')}`;
}

/**
 * Aplica el descuento a la orden. Si el backend exige PIN de administrador,
 * lo pide con `requestPin` y reintenta (hasta 3 intentos). Devuelve false si se cancela.
 */
export async function applyOrderDiscount(
  orderId: string,
  payload: DiscountPayload,
  requestPin: (message: string) => Promise<string | null>,
): Promise<boolean> {
  let pin: string | undefined;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await restaurantService.applyDiscount(orderId, { ...payload, ...(pin ? { pin } : {}) });
      return true;
    } catch (e: any) {
      const code = e?.data?.code;
      if (e?.status === 403 && PIN_CODES.includes(code) && attempt < 3) {
        const entered = await requestPin(e?.data?.error ?? 'Ingresa el PIN de un administrador');
        if (!entered) return false;
        pin = entered;
        continue;
      }
      throw new Error(e?.data?.error ?? e?.message ?? 'No se pudo aplicar el descuento');
    }
  }
  return false;
}

/** Modal de PIN de administrador (portal, z-100) + función que lo abre y espera la respuesta */
export function useAdminPin() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [pin, setPin] = useState('');
  const resolver = useRef<((v: string | null) => void) | null>(null);

  const requestPin = (msg: string) =>
    new Promise<string | null>((resolve) => {
      resolver.current = resolve;
      setMessage(msg);
      setPin('');
      setOpen(true);
    });

  const finish = (value: string | null) => {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  };

  const pinModal = open
    ? createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60" onClick={() => finish(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900">PIN de administrador</h3>
            <p className="mt-1 text-sm text-slate-600">{message}</p>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter' && pin) finish(pin); }}
              className="mt-3 w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-center text-lg font-bold tracking-[0.4em] text-slate-900 focus:outline-none focus:border-slate-500"
              placeholder="••••"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => finish(null)}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => pin && finish(pin)}
                disabled={!pin}
                className="min-h-[44px] rounded-xl bg-[#F97316] text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-40"
              >
                Autorizar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return { requestPin, pinModal };
}
