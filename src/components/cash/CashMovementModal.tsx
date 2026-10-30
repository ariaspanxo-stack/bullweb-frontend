// HOTFIX 299 (B2-06): movimiento de caja (ingreso o retiro) con motivo obligatorio.
// Compartido entre el turno del cajero (/restaurant) y Arqueos (pages/Sales/tabs/TabArqueos).
// POST /cash-registers/sessions/:id/movements { type CASH_IN|CASH_OUT, amount, reason }.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { cashRegistersService } from '../../services/cashRegistersService';

const CASH_OUT_THRESHOLD = 50000;

const fmt = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(v);

interface CashMovementModalProps {
  sessionId:    string;
  initialType?: 'CASH_IN' | 'CASH_OUT';
  canIncome:    boolean;
  canExpense:   boolean;
  onClose:      () => void;
  onSaved?:     () => void;
}

export function CashMovementModal({ sessionId, initialType, canIncome, canExpense, onClose, onSaved }: CashMovementModalProps) {
  const [type, setType] = useState<'CASH_IN' | 'CASH_OUT'>(
    initialType ?? (canIncome ? 'CASH_IN' : 'CASH_OUT'),
  );
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmBig, setConfirmBig] = useState(false);
  const qc = useQueryClient();

  const amountNum = parseFloat(amount);
  const typeAllowed = type === 'CASH_IN' ? canIncome : canExpense;
  const valid = typeAllowed && !isNaN(amountNum) && amountNum > 0 && reason.trim().length > 0;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await cashRegistersService.addMovement(sessionId, {
        type,
        amount: Math.round(amountNum),
        reason: reason.trim(),
      });
      toast.success(type === 'CASH_IN' ? 'Ingreso registrado.' : 'Retiro registrado.');
      // El resumen de cierre (['cuadre']) y Arqueos (['cash-cuadre']) muestran el movimiento al refrescar
      qc.invalidateQueries({ queryKey: ['cuadre'] });
      qc.invalidateQueries({ queryKey: ['cash-cuadre'] });
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast.error(e?.data?.error ?? e?.message ?? 'Error al registrar movimiento');
    } finally {
      setSaving(false);
      setConfirmBig(false);
    }
  };

  const handleRegister = () => {
    if (!valid) return;
    if (type === 'CASH_OUT' && amountNum > CASH_OUT_THRESHOLD && !confirmBig) {
      setConfirmBig(true);
      return;
    }
    save();
  };

  const typeBtn = (t: 'CASH_IN' | 'CASH_OUT', allowed: boolean, label: string, Icon: typeof TrendingUp) => (
    <button
      type="button"
      disabled={!allowed || saving}
      onClick={() => { setType(t); setConfirmBig(false); }}
      className={`flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        type === t
          ? 'bg-[#F97316] text-white'
          : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
      onClick={e => { e.stopPropagation(); if (!saving) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-bold text-gray-900">Movimiento de caja</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <div className="flex gap-2">
              {typeBtn('CASH_IN', canIncome, 'Ingreso', TrendingUp)}
              {typeBtn('CASH_OUT', canExpense, 'Retiro', TrendingDown)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
              <input
                type="number" min="0" step="1" inputMode="numeric" placeholder="0"
                value={amount}
                onChange={e => { setAmount(e.target.value); setConfirmBig(false); }}
                onFocus={e => e.target.select()}
                className="w-full min-h-[44px] pl-7 pr-3 border border-gray-300 rounded-xl text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: pago a proveedor, cambio de caja..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full min-h-[44px] px-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {confirmBig && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                El retiro de <span className="font-bold">{fmt(amountNum)}</span> supera {fmt(CASH_OUT_THRESHOLD)}.
                Presiona de nuevo para confirmar.
              </span>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 min-h-[44px] rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleRegister}
            disabled={!valid || saving}
            className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {confirmBig ? 'Confirmar retiro' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
