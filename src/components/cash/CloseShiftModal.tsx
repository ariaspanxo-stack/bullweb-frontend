// src/components/cash/CloseShiftModal.tsx
// Modal de cierre con arqueo completo

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Loader2, DollarSign, TrendingUp,
  CheckCircle, AlertTriangle, Clock,
  CreditCard, Banknote, AlertCircle,
} from 'lucide-react';
import {
  cashRegistersService,
  type CashSession,
  type CashRegister,
  type CloseSessionSnapshot,
} from '../../services/cashRegistersService';
import { ShiftPrinterSelect } from './ShiftPrinterSelect';
import { ConfirmModal } from '../ui/ConfirmModal';
import toast from 'react-hot-toast';
import { format, formatDistanceStrict } from 'date-fns';
import { es } from 'date-fns/locale';

interface CloseShiftModalProps {
  register: CashRegister;
  session:  CashSession;
  onClosed: () => void;
  onCancel: () => void;
}

function formatCLP(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style:                 'currency',
    currency:              'CLP',
    maximumFractionDigits: 0,
  }).format(n);
}

function isCash(methodName: string): boolean {
  return /efectivo|cash|contado/i.test(methodName);
}

export function CloseShiftModal({ register, session, onClosed, onCancel }: CloseShiftModalProps) {
  const [closingCash,      setClosingCash]      = useState('');
  const [notes,            setNotes]            = useState('');
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [closeResult,      setCloseResult]      = useState<CloseSessionSnapshot | null>(null);
  const [shiftConfirmOpen, setShiftConfirmOpen] = useState(false);

  // Cuadre en tiempo real
  const { data: cuadre, isLoading: cuadreLoading } = useQuery({
    queryKey:        ['cuadre', register.id],
    queryFn:         () => cashRegistersService.getCuadre(register.id),
    refetchInterval: 30_000,
    staleTime:       20_000,
  });

  const closingAmount = parseFloat(closingCash);
  const expectedCash  = cuadre?.expectedCash ?? 0;
  const diff = !isNaN(closingAmount) ? closingAmount - expectedCash : null;

  const shiftDuration = formatDistanceStrict(
    new Date(session.openedAt),
    new Date(),
    { locale: es }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(closingAmount) || closingAmount < 0) {
      setError('Ingresa un monto válido');
      return;
    }

    if (diff !== null && Math.abs(diff) > 10_000) {
      setShiftConfirmOpen(true);
      return;
    }

    await doCloseShift();
  };

  const doCloseShift = async () => {
    setShiftConfirmOpen(false);
    setLoading(true);
    setError(null);

    try {
      const result = await cashRegistersService.closeSession(register.id, {
        closingCash: closingAmount,
        notes:       notes || undefined,
      });
      setCloseResult(result.snapshot);
    } catch (err: any) {
      // 404 → el turno ya fue cerrado (estado stale en frontend)
      if (err?.status === 404) {
        onClosed();
        return;
      }
      setError(err?.data?.error ?? err?.message ?? 'Error al cerrar el turno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <ConfirmModal
      isOpen={shiftConfirmOpen}
      title="Diferencia en arqueo"
      message={`Hay una diferencia de ${diff !== null ? formatCLP(Math.abs(diff)) : ''} (${diff !== null && diff > 0 ? 'sobrante' : 'faltante'}).\n\n¿Confirmas el cierre de todas formas?`}
      confirmLabel="Cerrar turno"
      variant="warning"
      onConfirm={doCloseShift}
      onCancel={() => setShiftConfirmOpen(false)}
    />
    <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* ─── Pantalla post-cierre ─────────────────────────────── */}
        {closeResult ? (
          <>
            {/* Header éxito */}
            <div className="bg-gray-900 px-6 py-5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h2 className="font-black text-white text-lg">Turno cerrado</h2>
                  <p className="text-gray-400 text-sm">{register.name}</p>
                </div>
              </div>
            </div>

            {/* KPIs del cierre */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                  <p className="text-lg font-black text-indigo-700">{formatCLP(closeResult.totalSales)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Total ventas</p>
                </div>
                <div className="bg-purple-50 rounded-2xl p-4 text-center">
                  <p className="text-lg font-black text-purple-700">{closeResult.totalOrders}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Pedidos</p>
                </div>
              </div>

              {/* Desglose por método */}
              {closeResult.byMethod.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Desglose de ventas</p>
                  {closeResult.byMethod.map((p) => (
                    <div
                      key={p.methodId}
                      className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        {isCash(p.method)
                          ? <Banknote className="w-4 h-4 text-green-500" />
                          : <CreditCard className="w-4 h-4 text-blue-500" />
                        }
                        <span className="text-sm font-medium text-gray-700">{p.method}</span>
                        <span className="text-xs text-gray-400">({p.count})</span>
                      </div>
                      <span className="text-sm font-bold text-gray-800">{formatCLP(p.total)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Resultado arqueológico */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Arqueo de caja</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Efectivo esperado</span>
                  <span className="font-bold text-gray-800">{formatCLP(closeResult.expectedCash)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Efectivo contado</span>
                  <span className="font-bold text-gray-800">{formatCLP(closeResult.closingCash)}</span>
                </div>
                <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                  closeResult.difference === 0 ? 'bg-green-50'
                  : Math.abs(closeResult.difference) <= 1000 ? 'bg-amber-50'
                  : 'bg-red-50'
                }`}>
                  <span className="text-sm font-semibold text-gray-600">Diferencia</span>
                  <div className="flex items-center gap-1.5">
                    {closeResult.difference === 0
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <AlertTriangle className="w-4 h-4 text-amber-500" />
                    }
                    <span className={`text-sm font-black ${
                      closeResult.difference === 0             ? 'text-green-600'
                      : closeResult.difference > 0             ? 'text-blue-600'
                      : Math.abs(closeResult.difference) <= 1000 ? 'text-amber-600'
                      :                                            'text-red-600'
                    }`}>
                      {closeResult.difference === 0
                        ? 'Cuadre exacto'
                        : `${closeResult.difference > 0 ? '+' : ''}${formatCLP(closeResult.difference)}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
            {/* Imprimir ticket de cierre */}
              <ShiftPrinterSelect
                registerId={register.id}
                sessionId={session.id}
                variant="compact"
              />

              <button
                onClick={() => { toast.success('Turno cerrado correctamente'); onClosed(); }}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Continuar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-900 px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-xl">
                <DollarSign className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="font-black text-white text-lg">Cierre de turno</h2>
                <p className="text-gray-400 text-sm">{register.name}</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 rounded-xl hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Info del turno */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-gray-800/60 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-400">Apertura</p>
              <p className="text-sm text-white font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(session.openedAt), 'HH:mm')}
              </p>
            </div>
            <div className="bg-gray-800/60 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-400">Duración</p>
              <p className="text-sm text-white font-medium">{shiftDuration}</p>
            </div>
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* Cuadre en tiempo real */}
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Resumen del turno
            </h3>

            {cuadreLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : cuadre ? (
              <div className="space-y-3">

                {/* KPIs */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-indigo-50 rounded-2xl p-3 text-center">
                    <p className="text-sm font-black text-indigo-700 leading-tight">
                      {formatCLP(cuadre.totalSales)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Total ventas</p>
                  </div>
                  <div className="bg-green-50 rounded-2xl p-3 text-center">
                    <p className="text-sm font-black text-green-700 leading-tight">
                      {formatCLP(session.openingCash)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Apertura</p>
                  </div>
                </div>

                {/* Desglose por método de pago */}
                {cuadre.byMethod.length > 0 && (
                  <div className="space-y-1.5">
                    {cuadre.byMethod.map((p) => (
                      <div
                        key={p.method}
                        className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          {isCash(p.method)
                            ? <Banknote className="w-4 h-4 text-green-500" />
                            : <CreditCard className="w-4 h-4 text-blue-500" />
                          }
                          <span className="text-sm font-medium text-gray-700">{p.method}</span>
                          <span className="text-xs text-gray-400">
                            ({p.count} pago{p.count !== 1 ? 's' : ''})
                          </span>
                        </div>
                        <span className="text-sm font-bold text-gray-800">
                          {formatCLP(p.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Efectivo esperado */}
                <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-orange-700">
                      Efectivo esperado en caja
                    </span>
                    <span className="text-lg font-black text-orange-700">
                      {formatCLP(expectedCash)}
                    </span>
                  </div>
                  <p className="text-xs text-orange-500 mt-1">
                    Apertura {formatCLP(session.openingCash)} + ventas en efectivo
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                No se pudo cargar el cuadre
              </p>
            )}
          </div>

          {/* Formulario de cierre */}
          <form id="close-shift-form" onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* Monto físico contado — CIEGO */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Efectivo contado en caja
                <span className="text-red-400 ml-1">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={closingCash}
                  onChange={e => setClosingCash(e.target.value)}
                  onFocus={e => e.target.select()}
                  placeholder="0"
                  required
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-2xl text-lg font-bold text-gray-800 focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Cuenta el efectivo físico sin ver el monto esperado — más preciso
              </p>
            </div>

            {/* Diferencia — aparece al ingresar monto */}
            {closingCash && !isNaN(closingAmount) && (
              <div className={`rounded-2xl px-4 py-4 border-2 transition-all ${
                diff === null             ? 'border-gray-100 bg-gray-50'
                : diff === 0             ? 'border-green-200 bg-green-50'
                : Math.abs(diff) <= 1000 ? 'border-amber-200 bg-amber-50'
                :                          'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-600">Diferencia</span>
                  {diff !== null && (
                    <div className="flex items-center gap-1.5">
                      {diff === 0
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <AlertTriangle className="w-4 h-4 text-amber-500" />
                      }
                      <span className={`text-lg font-black ${
                        diff === 0             ? 'text-green-600'
                        : diff > 0             ? 'text-blue-600'
                        : Math.abs(diff) <= 1000 ? 'text-amber-600'
                        :                          'text-red-600'
                      }`}>
                        {diff === 0 ? 'Cuadre exacto' : (
                          <>{diff > 0 ? '+' : ''}{formatCLP(diff)}</>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                {diff !== null && diff !== 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {diff > 0
                      ? `Sobrante de ${formatCLP(diff)} sobre el esperado`
                      : `Faltante de ${formatCLP(Math.abs(diff))} respecto al esperado`
                    }
                  </p>
                )}
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notas del cierre
                <span className="text-gray-400 font-normal ml-1">(opcional)</span>
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Ej: Todo correcto, turno sin incidencias..."
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
          </form>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-medium rounded-2xl hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="close-shift-form"
            disabled={loading || !closingCash}
            className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Cerrando...
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5" />
                Cerrar turno
              </>
            )}
          </button>
        </div>
      </>
      )}
      </div>
    </div>
    </>
  );
}
