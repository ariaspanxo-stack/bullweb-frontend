// src/components/cash/CloseShiftModal.tsx
// Modal de cierre con arqueo completo

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  X, Loader2, DollarSign, TrendingUp,
  CheckCircle, AlertTriangle, Clock,
  CreditCard, Banknote, AlertCircle, Printer,
} from 'lucide-react';
import {
  cashRegistersService,
  type CashSession,
  type CashRegister,
  type CuadreItem,
  type CuadreTips,
} from '../../services/cashRegistersService';
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

const formatCLP = (n: number) => '$' + Math.round(Math.abs(n)).toLocaleString('es-CL');

function isCash(methodName: string): boolean {
  return /efectivo|cash|contado/i.test(methodName);
}

// HOTFIX 299 (B2-02/B2-03): resumen del cierre. La diferencia viene SOLO de session.difference
// (efectivo contado - efectivo esperado); esta pantalla no la recalcula.
interface CloseSummary {
  totalSales:   number | null;
  totalOrders:  number | null;
  openingCash:  number | null;
  expectedCash: number | null;
  closingCash:  number | null;
  difference:   number | null;
  byMethod:     CuadreItem[];
  tips?:        CuadreTips;
  totalCashIn:  number;
  totalCashOut: number;
  /** true si se armo releyendo el estado de la sesion (fallo al leer la respuesta del cierre) */
  recovered:    boolean;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

export function CloseShiftModal({ register, session, onClosed, onCancel }: CloseShiftModalProps) {
  const [closingCash,      setClosingCash]      = useState('');
  const [notes,            setNotes]            = useState('');
  const [justification,    setJustification]    = useState('');
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [closeResult,      setCloseResult]      = useState<CloseSummary | null>(null);
  const [shiftConfirmOpen, setShiftConfirmOpen] = useState(false);
  const [printing,         setPrinting]         = useState(false);
  // HOTFIX 299: un segundo clic nunca vuelve a cerrar (en vuelo o ya cerrado)
  const closingRef = useRef(false);
  const closedRef  = useRef(false);

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
  const needsJustification = diff !== null && Math.abs(diff) > 10_000;

  // Hotfix #256: propinas aparte de las ventas (mismo estilo que el desglose)
  const renderTips = (tips?: CuadreTips) => {
    if (!tips || tips.total <= 0) return null;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Propinas</p>
          <span className="text-sm font-bold text-gray-800">{formatCLP(tips.total)}</span>
        </div>
        {tips.byMethod.map((p) => (
          <div
            key={`tip-${p.methodId}`}
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
    );
  };

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

    if (needsJustification && justification.trim().length < 5) {
      setError('La diferencia supera $10.000. Debes ingresar una justificación de al menos 5 caracteres.');
      return;
    }

    if (needsJustification) {
      setShiftConfirmOpen(true);
      return;
    }

    await doCloseShift();
  };

  // HOTFIX 299: resumen desde la respuesta del cierre (session = fuente de la diferencia)
  const buildFromClose = (result: any): CloseSummary | null => {
    const snap = result?.snapshot;
    const s    = result?.session;
    if (!snap && !s) return null;
    return {
      totalSales:   num(snap?.totalSales ?? s?.snapshotTotalSales),
      totalOrders:  num(snap?.totalOrders ?? s?.snapshotTotalOrders),
      openingCash:  num(s?.openingCash ?? session.openingCash),
      expectedCash: num(s?.snapshotExpectedCash ?? snap?.expectedCash),
      closingCash:  num(s?.closingCash ?? snap?.closingCash),
      difference:   num(s?.difference ?? snap?.difference),
      byMethod:     Array.isArray(snap?.byMethod) ? snap.byMethod : (cuadre?.byMethod ?? []),
      tips:         snap?.tips ?? cuadre?.tips,
      totalCashIn:  Number(cuadre?.totalCashIn ?? 0),
      totalCashOut: Number(cuadre?.totalCashOut ?? 0),
      recovered:    false,
    };
  };

  // HOTFIX 299: ante cualquier fallo al leer el resultado, recarga el estado de la sesion.
  // Devuelve el resumen si la sesion quedo CLOSED en la BD; null si sigue abierta o no se pudo saber.
  const recoverFromServer = async (): Promise<CloseSummary | null> => {
    const [cq, list] = await Promise.allSettled([
      cashRegistersService.getSessionCuadreById(session.id),
      cashRegistersService.getAllSessions({ status: 'CLOSED', perPage: 50 }),
    ]);
    const c: any   = cq.status === 'fulfilled' ? cq.value : null;
    const raw: any = list.status === 'fulfilled' ? list.value : null;
    const rows: any[] = Array.isArray(raw?.sessions) ? raw.sessions : Array.isArray(raw) ? raw : [];
    const row = rows.find((x: any) => x?.id === session.id);
    const isClosed = row?.status === 'CLOSED' || c?.sessionStatus === 'CLOSED';
    if (!isClosed) return null;
    return {
      totalSales:   num(row?.snapshotTotalSales ?? c?.totalSales),
      totalOrders:  num(row?.snapshotTotalOrders ?? c?.totalOrders),
      openingCash:  num(row?.openingCash ?? c?.openingCash ?? session.openingCash),
      expectedCash: num(row?.snapshotExpectedCash),
      closingCash:  num(row?.closingCash),
      difference:   num(row?.difference),
      byMethod:     Array.isArray(c?.byMethod) ? c.byMethod : [],
      tips:         c?.tips,
      totalCashIn:  Number(c?.totalCashIn ?? cuadre?.totalCashIn ?? 0),
      totalCashOut: Number(c?.totalCashOut ?? cuadre?.totalCashOut ?? 0),
      recovered:    true,
    };
  };

  const doCloseShift = async () => {
    setShiftConfirmOpen(false);
    if (closingRef.current || closedRef.current) return; // HOTFIX 299: sin doble cierre
    closingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await cashRegistersService.closeSession(register.id, {
        closingCash: closingAmount,
        notes:       notes || undefined,
        expectedCash,
        justification: needsJustification ? justification.trim() : undefined,
      });
      closedRef.current = true;
      const built = buildFromClose(result);
      if (built) {
        setCloseResult(built);
      } else {
        // La BD cerro pero la respuesta no se pudo leer: releer la sesion
        const recovered = await recoverFromServer().catch(() => null);
        setCloseResult(recovered ?? {
          totalSales: null, totalOrders: null, openingCash: session.openingCash,
          expectedCash: null, closingCash: closingAmount, difference: null,
          byMethod: [], totalCashIn: 0, totalCashOut: 0, recovered: true,
        });
      }
    } catch (err: any) {
      // HOTFIX 299: si la BD cerro (timeout, 5xx, 404 por estado stale) nunca se muestra error:
      // se relee la sesion y se muestra el resumen con lo que haya.
      const recovered = await recoverFromServer().catch(() => null);
      if (recovered) {
        closedRef.current = true;
        setCloseResult(recovered);
        return;
      }
      if (err?.status === 404) {
        onClosed();
        return;
      }
      setError(err?.data?.error ?? err?.message ?? 'Error al cerrar el turno');
    } finally {
      closingRef.current = false;
      setLoading(false);
    }
  };

  // HOTFIX 299: mismo flujo/endpoint que Caja > Arqueos (POST /cash-registers/sessions/:id/print-arqueo)
  const handlePrintArqueo = async () => {
    if (printing) return;
    setPrinting(true);
    try {
      const r: any = await cashRegistersService.printArqueo(session.id);
      toast.success(`${r?.partial ? 'Arqueo parcial' : 'Arqueo'} enviado a ${r?.printer ?? 'la impresora'}.`);
    } catch (e: any) {
      toast.error(e?.data?.error ?? e?.response?.data?.error ?? e?.message ?? 'No se pudo imprimir el arqueo');
    } finally {
      setPrinting(false);
    }
  };

  const cr = closeResult;
  const crDiff = cr?.difference ?? null;

  // HOTFIX 299: modal por portal z-[100]; el ConfirmModal (z-[60]) va dentro para quedar encima
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4">
    <ConfirmModal
      isOpen={shiftConfirmOpen}
      title="Diferencia en arqueo"
      message={`Hay una diferencia de ${diff !== null ? formatCLP(Math.abs(diff)) : ''} (${diff !== null && diff > 0 ? 'sobrante' : 'faltante'}).\n\n¿Confirmas el cierre de todas formas?`}
      confirmLabel="Cerrar turno"
      variant="warning"
      onConfirm={doCloseShift}
      onCancel={() => setShiftConfirmOpen(false)}
    />
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* ─── Pantalla post-cierre (HOTFIX 299: resumen del cierre) ─── */}
        {cr ? (
          <>
            {/* Header éxito */}
            <div className="bg-gray-900 px-6 py-5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="font-black text-white text-lg">Turno cerrado</h2>
                  <p className="text-gray-400 text-sm">{register.name}</p>
                </div>
              </div>
            </div>

            {/* KPIs del cierre */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cr.recovered && (
                <div className="flex items-start gap-2 text-sm font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>El turno quedó cerrado. Resumen releído desde el sistema; el detalle completo está en Ventas &gt; Arqueos.</span>
                </div>
              )}

              {/* Arqueo de caja: esperado, contado y diferencia de la sesion */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Arqueo de efectivo</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Efectivo esperado</span>
                  <span className="font-bold text-gray-800">{cr.expectedCash != null ? formatCLP(cr.expectedCash) : '-'}</span>
                </div>
                <p className="text-xs text-gray-400 -mt-1">
                  Apertura {cr.openingCash != null ? formatCLP(cr.openingCash) : '-'}
                  {' '}+ ventas en efectivo {formatCLP(Number(cr.byMethod.find(m => isCash(m.method))?.total ?? 0))}
                  {' '}+ propinas en efectivo {formatCLP(Number(cr.tips?.cash ?? 0))}
                  {' '}+ ingresos {formatCLP(cr.totalCashIn)} - retiros {formatCLP(cr.totalCashOut)}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Efectivo contado</span>
                  <span className="font-bold text-gray-800">{cr.closingCash != null ? formatCLP(cr.closingCash) : '-'}</span>
                </div>
                <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                  crDiff === null ? 'bg-gray-50'
                  : crDiff === 0 ? 'bg-gray-100'
                  : Math.abs(crDiff) <= 1000 ? 'bg-amber-50'
                  : 'bg-red-50'
                }`}>
                  <span className="text-sm font-semibold text-gray-600">Diferencia</span>
                  <div className="flex items-center gap-1.5">
                    {crDiff === 0
                      ? <CheckCircle className="w-4 h-4 text-gray-600" />
                      : crDiff !== null && <AlertTriangle className="w-4 h-4 text-amber-500" />
                    }
                    <span className={`text-sm font-black ${
                      crDiff === null ? 'text-gray-400'
                      : crDiff === 0 ? 'text-gray-800'
                      : Math.abs(crDiff) <= 1000 ? 'text-amber-600'
                      : 'text-red-600'
                    }`}>
                      {crDiff === null
                        ? '-'
                        : crDiff === 0
                          ? 'Cuadre'
                          : `${crDiff > 0 ? '+' : '-'}${formatCLP(crDiff)} ${crDiff > 0 ? '(sobrante)' : '(faltante)'}`
                      }
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                <div className="bg-orange-50 rounded-2xl p-4 text-center">
                  <p className="text-lg font-black text-orange-700">{cr.totalSales != null ? formatCLP(cr.totalSales) : '-'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Total ventas</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-lg font-black text-gray-800">{cr.totalOrders ?? '-'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Pedidos</p>
                </div>
              </div>

              {/* Ingresos / retiros manuales del turno */}
              {(cr.totalCashIn > 0 || cr.totalCashOut > 0) && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Movimientos de caja</p>
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 text-sm">
                    <span className="text-gray-700 font-medium">Ingresos</span>
                    <span className="font-bold text-gray-800">+{formatCLP(cr.totalCashIn)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 text-sm">
                    <span className="text-gray-700 font-medium">Retiros</span>
                    <span className="font-bold text-gray-800">-{formatCLP(cr.totalCashOut)}</span>
                  </div>
                </div>
              )}

              {/* Desglose por método (solo ventas; propinas aparte) */}
              {cr.byMethod.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ventas por medio de pago</p>
                  {cr.byMethod.map((p) => (
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

              {renderTips(cr.tips)}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-3xl space-y-2">
              {/* HOTFIX 299: imprimir arqueo con el mismo endpoint que Ventas > Arqueos */}
              <button
                type="button"
                onClick={handlePrintArqueo}
                disabled={printing}
                className="w-full min-h-[44px] py-3 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {printing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                Imprimir arqueo
              </button>

              <button
                type="button"
                onClick={() => { toast.success('Turno cerrado correctamente'); onClosed(); }}
                className="w-full min-h-[44px] py-3 border-2 border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
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
              <TrendingUp className="w-4 h-4 text-orange-500" />
              Resumen del turno
            </h3>

            {cuadreLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : cuadre ? (
              <div className="space-y-3">

                {/* Hotfix #254: cobros sin caja abierta desde la apertura (informativo) */}
                {(() => {
                  const orphans = (cuadre as { orphanPayments?: { count: number; amount: number } }).orphanPayments;
                  if (!orphans || Number(orphans.count) <= 0) return null;
                  return (
                    <div className="flex items-start gap-2 text-sm font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        {orphans.count} cobros por <span className="font-bold">{formatCLP(Number(orphans.amount ?? 0))}</span> se hicieron sin caja abierta desde la apertura. No están en este arqueo.
                      </span>
                    </div>
                  );
                })()}

                {/* KPIs */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-2xl p-3 text-center">
                    <p className="text-sm font-black text-gray-800 leading-tight">
                      {formatCLP(cuadre.totalSales)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Total ventas</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-3 text-center">
                    <p className="text-sm font-black text-gray-800 leading-tight">
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

                {renderTips(cuadre.tips)}

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
                  {/* HOTFIX 299 (B2-07): formula del esperado con montos (mismo calculo del backend) */}
                  <p className="text-xs text-orange-600 mt-1">
                    Apertura {formatCLP(Number(cuadre.openingCash ?? session.openingCash))}
                    {' '}+ ventas en efectivo {formatCLP(Number(cuadre.cashSales ?? 0))}
                    {' '}+ propinas en efectivo {formatCLP(Number(cuadre.tips?.cash ?? 0))}
                    {' '}+ ingresos {formatCLP(Number(cuadre.totalCashIn ?? 0))}
                    {' '}- retiros {formatCLP(Number(cuadre.totalCashOut ?? 0))}
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
                : diff === 0             ? 'border-gray-200 bg-gray-50'
                : Math.abs(diff) <= 1000 ? 'border-amber-200 bg-amber-50'
                :                          'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-600">Diferencia</span>
                  {diff !== null && (
                    <div className="flex items-center gap-1.5">
                      {diff === 0
                        ? <CheckCircle className="w-4 h-4 text-gray-600" />
                        : <AlertTriangle className="w-4 h-4 text-amber-500" />
                      }
                      <span className={`text-lg font-black ${
                        diff === 0             ? 'text-gray-800'
                        : Math.abs(diff) <= 1000 ? 'text-amber-600'
                        :                          'text-red-600'
                      }`}>
                        {diff === 0 ? 'Cuadre' : (
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

            {/* Justificación obligatoria — Blindaje Nivel 1 */}
            {needsJustification && (
              <div>
                <label className="block text-sm font-semibold text-red-600 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Justificación de la diferencia (Obligatorio)
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <textarea
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  rows={3}
                  placeholder="Explica el motivo del faltante/sobrante (mín. 5 caracteres). Ej: Pago en efectivo no registrado en sistema, vuelto mal entregado, error de arqueo..."
                  className={`w-full px-4 py-3 border-2 rounded-2xl text-sm text-gray-700 resize-none focus:outline-none transition-colors ${
                    justification.trim().length >= 5
                      ? 'border-gray-200 focus:border-orange-400'
                      : 'border-red-300 bg-red-50 focus:border-red-400'
                  }`}
                  required
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  La diferencia de {formatCLP(Math.abs(diff!))} debe ser justificada. Quedará registrada en el cierre.
                </p>
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
            disabled={loading || closedRef.current || !closingCash || (needsJustification && justification.trim().length < 5)}
            className="flex-1 min-h-[44px] py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
    </div>,
    document.body,
  );
}
