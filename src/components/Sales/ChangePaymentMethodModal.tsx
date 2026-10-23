// Hotfix #274: cambiar el medio de pago de una venta cerrada (Ventas).
// Un selector por pago (propinas incluidas); el monto no se edita. Si el backend exige PIN de
// administrador (sin permiso admin, o pago de un arqueo cerrado) lo pide con useAdminPin (#257).
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Sale } from '@/types/sales.types';
import salesService from '@/services/salesService';
import { useAdminPin } from '@/components/pos/discountControl';

const PIN_CODES = ['PAYMENT_METHOD_PIN_REQUIRED', 'PAYMENT_METHOD_PIN_INVALID'];

interface ChangePaymentMethodModalProps {
  sale: Sale;
  onClose: () => void;
  onDone: () => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(v);

export function ChangePaymentMethodModal({ sale, onClose, onDone }: ChangePaymentMethodModalProps) {
  const { requestPin, pinModal } = useAdminPin();
  const [methods, setMethods] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries((sale.payments ?? []).filter(p => p.id).map(p => [p.id as string, p.paymentMethodId ?? ''])),
  );
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    salesService.getPaymentMethods().then(list =>
      setMethods(list.filter((m: any) => m.active !== false).map((m: any) => ({ id: m.id, name: m.name }))),
    );
  }, []);

  const payments = (sale.payments ?? []).filter(p => p.id);
  const changed = payments.filter(p => selected[p.id as string] && selected[p.id as string] !== p.paymentMethodId);

  const handleConfirm = async () => {
    if (changed.length === 0) {
      toast.error('No hay cambios de medio de pago');
      return;
    }
    setSaving(true);
    let pin: string | undefined;
    const warnings = new Set<string>();
    let done = 0;
    try {
      for (const p of changed) {
        for (let attempt = 0; ; attempt++) {
          try {
            const r = await salesService.changePaymentMethod(sale.id, p.id as string, {
              paymentMethodId: selected[p.id as string],
              ...(reason.trim() ? { reason: reason.trim() } : {}),
              ...(pin ? { pin } : {}),
            });
            r.warnings.forEach(w => warnings.add(w));
            done++;
            break;
          } catch (e: any) {
            if (e?.status === 403 && PIN_CODES.includes(e?.data?.code) && attempt < 3) {
              const entered = await requestPin(e?.data?.error ?? 'Ingresa el PIN de un administrador');
              if (!entered) throw new Error('Cambio cancelado');
              pin = entered;
              continue;
            }
            throw new Error(e?.data?.error ?? e?.message ?? 'No se pudo cambiar el medio de pago');
          }
        }
      }
      toast.success(done === 1 ? 'Medio de pago actualizado' : `${done} pagos actualizados`);
      warnings.forEach(w => toast(w, { icon: '⚠️', duration: 6000 }));
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? 'No se pudo cambiar el medio de pago');
      if (done > 0) onDone();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60" onClick={() => !saving && onClose()}>
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Cambiar medio de pago</h3>
            <button onClick={onClose} disabled={saving} className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">El monto de cada pago no cambia. Queda registrado en el historial de la venta.</p>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {payments.map(p => (
              <div key={p.id} className="rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{p.isTip ? 'Propina' : 'Pago'} · {p.method}</span>
                  <span className="text-base font-bold text-gray-900">{fmt(p.amount)}</span>
                </div>
                <select
                  value={selected[p.id as string] ?? ''}
                  onChange={e => setSelected(s => ({ ...s, [p.id as string]: e.target.value }))}
                  disabled={saving}
                  className="w-full min-h-[44px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {!methods.some(m => m.id === p.paymentMethodId) && (
                    <option value={p.paymentMethodId ?? ''}>{p.method}</option>
                  )}
                  {methods.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">Motivo (opcional)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value.slice(0, 300))}
            rows={2}
            disabled={saving}
            placeholder="Ej: el cliente pagó con débito"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />

          <div className="flex gap-2 mt-5">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 min-h-[44px] border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving || changed.length === 0}
              className="flex-1 min-h-[44px] bg-[#F97316] hover:bg-orange-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
      {pinModal}
    </>,
    document.body,
  );
}
