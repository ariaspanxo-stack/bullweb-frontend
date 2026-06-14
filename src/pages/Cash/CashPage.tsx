// src/pages/Cash/CashPage.tsx
// Panel para ver estado de caja e historial de turnos

import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceStrict } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DollarSign, Clock, CheckCircle,
  AlertTriangle, Loader2,
} from 'lucide-react';
import { cashRegistersService } from '../../services/cashRegistersService';

function formatCLP(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style:                 'currency',
    currency:              'CLP',
    maximumFractionDigits: 0,
  }).format(n);
}

export function CashPage() {

  // Sesión activa
  const { data: active, isLoading: activeLoading } = useQuery({
    queryKey:        ['cash-active'],
    queryFn:         () => cashRegistersService.getActive(),
    refetchInterval: 30_000,
  });

  // Historial de sesiones (todas las cajas)
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey:  ['cash-history'],
    queryFn:   () => cashRegistersService.getAllSessions({ perPage: 50 }),
    staleTime: 60_000,
  });

  const sessions: any[] = historyData?.sessions ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-800">Gestión de Caja</h1>
        <p className="text-gray-400 text-sm mt-1">Control de turnos y arqueo de caja</p>
      </div>

      {/* Estado actual */}
      {activeLoading ? (
        <div className="bg-gray-50 rounded-3xl border-2 border-gray-200 p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className={`rounded-3xl p-6 border-2 ${
          active?.isOpen
            ? 'bg-green-50 border-green-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${active?.isOpen ? 'bg-green-100' : 'bg-gray-200'}`}>
                <DollarSign className={`w-6 h-6 ${active?.isOpen ? 'text-green-600' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="font-bold text-gray-800">
                  {active?.register?.name ?? 'Caja principal'}
                </p>
                <p className={`text-sm font-medium flex items-center gap-1.5 ${
                  active?.isOpen ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    active?.isOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`} />
                  {active?.isOpen ? 'Turno abierto' : 'Sin turno activo'}
                </p>
              </div>
            </div>

            {active?.isOpen && active.session && (
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-700">
                  Apertura: {formatCLP(active.session.openingCash)}
                </p>
                <p className="text-xs text-gray-400">
                  Desde {format(new Date(active.session.openedAt), 'HH:mm')}
                  {' · '}
                  {formatDistanceStrict(new Date(active.session.openedAt), new Date(), { locale: es })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historial de sesiones */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Historial de turnos</h2>
          {historyData?.meta && (
            <span className="text-xs text-gray-400">
              {historyData.meta.total} turnos en total
            </span>
          )}
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Clock className="w-8 h-8 text-gray-200" />
            <p className="text-sm text-gray-400">Sin turnos registrados aún</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map((s: any) => {
              const hasSnapshot  = s.snapshotTotalSales !== null && s.snapshotTotalSales !== undefined;
              const totalSales   = hasSnapshot ? Number(s.snapshotTotalSales)   : null;
              const totalOrders  = hasSnapshot ? s.snapshotTotalOrders          : null;
              const expectedCash = hasSnapshot ? Number(s.snapshotExpectedCash) : null;
              const closingCash  = s.closingCash !== null ? Number(s.closingCash) : null;
              const diff         = closingCash !== null && expectedCash !== null
                ? closingCash - expectedCash
                : closingCash !== null && !hasSnapshot
                  ? closingCash - Number(s.openingCash)
                  : null;

              return (
                <div key={s.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">

                    {/* Izquierda: estado + fecha */}
                    <div className="flex items-center gap-3">
                      {s.status === 'CLOSED'
                        ? <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        : <div className="w-5 h-5 rounded-full border-2 border-orange-400 flex-shrink-0 animate-pulse" />
                      }
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {format(new Date(s.openedAt), "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(s.openedAt), 'HH:mm')}
                          {s.closedAt && (
                            <> → {format(new Date(s.closedAt), 'HH:mm')}</>
                          )}
                          {s.cash_register?.name && (
                            <> · {s.cash_register.name}</>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Derecha: ventas + arqueo */}
                    <div className="flex items-center gap-5 text-right">

                      {/* Ventas del turno */}
                      {s.status === 'CLOSED' && (
                        <div>
                          {totalSales !== null ? (
                            <>
                              <p className="text-sm font-bold text-indigo-700">{formatCLP(totalSales)}</p>
                              <p className="text-xs text-gray-400">
                                ventas{totalOrders !== null ? ` · ${totalOrders} pedidos` : ''}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm italic text-gray-300">Sin datos</p>
                              <p className="text-xs text-gray-300">ventas</p>
                            </>
                          )}
                        </div>
                      )}

                      {/* Apertura */}
                      <div>
                        <p className="text-sm font-bold text-gray-700">{formatCLP(Number(s.openingCash))}</p>
                        <p className="text-xs text-gray-400">apertura</p>
                      </div>

                      {/* Cierre */}
                      {closingCash !== null && (
                        <div>
                          <p className="text-sm font-bold text-gray-800">{formatCLP(closingCash)}</p>
                          <p className="text-xs text-gray-400">cierre</p>
                        </div>
                      )}

                      {/* Diferencia */}
                      {diff !== null && (
                        <div className="min-w-[80px]">
                          {diff === 0 ? (
                            <p className="text-sm font-bold text-green-500">✓ Cuadre</p>
                          ) : (
                            <p className={`text-sm font-bold ${
                              Math.abs(diff) <= 1000 ? 'text-amber-500' : 'text-red-500'
                            }`}>
                              {diff > 0 ? '+' : ''}{formatCLP(diff)}
                            </p>
                          )}
                          <p className="text-xs text-gray-400">diferencia</p>
                        </div>
                      )}

                      {/* Badge En curso */}
                      {s.status === 'OPEN' && (
                        <div className="flex items-center gap-1.5 bg-orange-100 text-orange-600 text-xs font-medium px-2 py-1 rounded-full">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                          En curso
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Warning: diferencias grandes en la semana */}
      {sessions.some((s: any) => {
        if (s.closingCash === null) return false;
        const expected = s.snapshotExpectedCash !== null && s.snapshotExpectedCash !== undefined
          ? Number(s.snapshotExpectedCash)
          : Number(s.openingCash);
        return Math.abs(Number(s.closingCash) - expected) > 50_000;
      }) && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Hay turnos con diferencias de efectivo mayores a $50.000. Revisa el historial.
          </p>
        </div>
      )}
    </div>
  );
}
