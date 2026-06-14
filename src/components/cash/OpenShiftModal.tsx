// src/components/cash/OpenShiftModal.tsx
// Modal bloqueante — no se puede cerrar sin abrir sesión

import { useState } from 'react';
import { Loader2, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { cashRegistersService, type CashRegister } from '../../services/cashRegistersService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface OpenShiftModalProps {
  register:  CashRegister;
  isOpen:    boolean;
  onClose?:  () => void;
  onSuccess: () => void;
}

function formatCLP(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style:                 'currency',
    currency:              'CLP',
    maximumFractionDigits: 0,
  }).format(n);
}

export function OpenShiftModal({ register, isOpen, onClose, onSuccess }: OpenShiftModalProps) {
  const [openingCash, setOpeningCash] = useState('');
  const [notes,       setNotes]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(openingCash);
    if (isNaN(amount) || amount < 0) {
      setError('Ingresa un monto válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await cashRegistersService.openSession(register.id, {
        openingCash: amount,
        notes:       notes || undefined,
      });
      toast.success(`Turno abierto con ${formatCLP(amount)}`);
      onSuccess();
      onClose?.();
    } catch (err: any) {
      setError(err?.data?.error ?? err?.message ?? 'Error al abrir el turno');
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

  return (
    // Overlay bloqueante — sin onClick para cerrar
    <div className="fixed inset-0 z-50 bg-gray-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gray-900 px-6 py-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-orange-500/20 rounded-xl">
              <DollarSign className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="font-black text-white text-lg">Apertura de turno</h2>
              <p className="text-gray-400 text-sm">{register.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 bg-gray-800/60 rounded-xl px-3 py-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">
              {format(now, "EEEE d 'de' MMMM, HH:mm", { locale: es })}
            </span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Monto inicial */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Monto inicial en caja
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={openingCash}
                onChange={e => setOpeningCash(e.target.value)}
                onFocus={e => e.target.select()}
                placeholder="0"
                required
                autoFocus
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-2xl text-lg font-bold text-gray-800 focus:outline-none focus:border-orange-400 transition-colors"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Ingresa el efectivo físico en la caja al inicio del turno
            </p>
          </div>

          {/* Preview monto formateado */}
          {openingCash && !isNaN(parseFloat(openingCash)) && (
            <div className="bg-orange-50 rounded-2xl px-4 py-3 text-center">
              <p className="text-xs text-orange-500 font-medium mb-0.5">Monto de apertura</p>
              <p className="text-2xl font-black text-orange-600">
                {formatCLP(parseFloat(openingCash))}
              </p>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notas
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: Turno mañana, falta billete de $10.000..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm text-gray-700 resize-none focus:outline-none focus:border-orange-400 transition-colors"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Botones */}
          <div className={onClose ? 'flex gap-3' : ''}>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-4 border border-gray-200 text-gray-600 font-bold text-base rounded-2xl hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !openingCash}
              className={`${onClose ? 'flex-1' : 'w-full'} py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold text-base rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Abriendo turno...
                </>
              ) : (
                <>
                  <DollarSign className="w-5 h-5" />
                  Abrir turno
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
