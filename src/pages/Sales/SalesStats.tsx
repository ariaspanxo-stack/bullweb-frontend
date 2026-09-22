import { useState } from 'react';
import { ChevronUp, ChevronDown, X, XCircle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import type { SalesStats as Stats, SalesFilters } from '../../types/sales.types';

interface Props {
  stats: Stats;
  startDate: Date;
  endDate: Date;
  recordCount: number;
  previousStats?: Stats | null;
  yesterdayStats?: Stats | null;
  isFirstDay?: boolean;
  isPeriodDaily?: boolean;
  onNavigateToTab?: (tab: string, filters?: Partial<SalesFilters>) => void;
}

/** Color de barra según nombre del método de pago */
function barColor(method: string): string {
  const n = method.toLowerCase();
  if (n.includes('efectivo') || n.includes('cash'))    return 'bg-green-500';
  if (n.includes('débito') || n.includes('debito'))    return 'bg-cyan-500';
  if (n.includes('crédito') || n.includes('credito'))  return 'bg-blue-500';
  if (n.includes('tarjeta') || n.includes('card'))     return 'bg-blue-500';
  if (n.includes('transfer'))                          return 'bg-purple-500';
  if (n.includes('yape') || n.includes('plin'))        return 'bg-pink-500';
  if (n === 'unpaid' || n === 'sin pagar')              return 'bg-gray-400';
  return 'bg-orange-500';
}

export const SalesStats = ({ stats, startDate, endDate, recordCount, previousStats, yesterdayStats, isFirstDay, isPeriodDaily, onNavigateToTab }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showTipsModal,   setShowTipsModal]   = useState(false);

  // Mejora E — semáforo de color para promedio por venta
  const ticketColor =
    stats.averagePerSale >= 5000 ? 'text-green-400' :
    stats.averagePerSale >= 2000 ? 'text-amber-400' :
    'text-red-400';

  const formatCurrency = (value: number) => '$' + Math.round(Math.abs(value)).toLocaleString('es-CL');

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  const formatDateRange = (s: Date, e: Date) =>
    `${formatDate(s)} — ${formatDate(e)}`;

  // Mejora #5 — delta % vs período anterior
  const Delta = ({ current, previous }: { current: number; previous: number }) => {
    if (!previous || previous === 0) return null;
    const diff = current - previous;
    const pct  = ((diff / previous) * 100).toFixed(1);
    const isUp = diff > 0;
    if (diff === 0) return <span className="text-xs text-gray-500">= igual</span>;
    return (
      <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isUp ? '+' : ''}{pct}%
        <span className="font-normal text-gray-500 ml-1">vs sem. ant.</span>
      </span>
    );
  };

  // P1 — delta % vs AYER (mismo estilo del delta existente — coherente)
  const DeltaYesterday = ({ current, previous }: { current: number; previous: number }) => {
    // GUARD explícito: si ayer no hubo ventas → "primer día" (sin división por cero, sin delta infinito)
    if (!previous || previous === 0) {
      return <span className="text-xs text-gray-500 font-medium">primer día</span>;
    }
    const diff = current - previous;
    const pct  = ((diff / previous) * 100).toFixed(1);
    const isUp = diff > 0;
    if (diff === 0) return <span className="text-xs text-gray-500">= igual vs ayer</span>;
    return (
      <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isUp ? '+' : ''}{pct}%
        <span className="font-normal text-gray-500 ml-1">vs ayer</span>
      </span>
    );
  };

  return (
    <div className="bg-gray-900 border border-white/10 rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
      {/* Período y registros */}
      <div className="text-sm text-gray-400 space-y-1">
        <p>
          Período: Del {formatDate(startDate)} hs al {formatDate(endDate)} hs
        </p>
        <p>Registros: {recordCount} registros</p>
      </div>

      {/* Grid de estadísticas principales — apilable en móvil (390px) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 bg-gray-800/60 border border-white/5 p-4 sm:p-6 rounded-lg">
        {/* Ventas */}
        <div className="text-center space-y-1">
          <p className="text-gray-400 text-sm mb-2">Ventas</p>
          <p className="text-3xl font-bold text-white tabular-nums">{stats.totalSales}</p>
          {previousStats && <Delta current={stats.totalSales} previous={previousStats.totalSales} />}
        </div>

        {/* Promedio por venta — chip compacto "vs ayer" (P1) */}
        <div className="text-center space-y-1">
          <p className="text-gray-400 text-sm mb-2">Promedio</p>
          <p className="text-gray-500 text-xs mb-1">por venta</p>
          <p className={`text-xl font-semibold tabular-nums ${ticketColor}`}>
            {formatCurrency(stats.averagePerSale)}
          </p>
          {previousStats && <Delta current={stats.averagePerSale} previous={previousStats.averagePerSale} />}
          {isFirstDay === true && <DeltaYesterday current={stats.averagePerSale} previous={0} />}
          {yesterdayStats && <DeltaYesterday current={stats.averagePerSale} previous={yesterdayStats.averagePerSale} />}
        </div>

        {/* Personas */}
        <div className="text-center space-y-1">
          <p className="text-gray-400 text-sm mb-2">Personas</p>
          <p className="text-3xl font-bold text-white tabular-nums">{stats.totalPeople}</p>
          {previousStats && <Delta current={stats.totalPeople} previous={previousStats.totalPeople} />}
        </div>

        {/* Promedio por persona */}
        <div className="text-center space-y-1">
          <p className="text-gray-400 text-sm mb-2">Promedio</p>
          <p className="text-gray-500 text-xs mb-1">por persona</p>
          <p className="text-xl font-semibold text-white tabular-nums">
            {formatCurrency(stats.averagePerPerson)}
          </p>
          {previousStats && <Delta current={stats.averagePerPerson} previous={previousStats.averagePerPerson} />}
        </div>
      </div>

      {/* Total general (grande, a la derecha) — chip compacto "vs ayer" (P1) */}
      <div className="flex flex-col sm:flex-row sm:justify-end items-end sm:items-end gap-2 sm:gap-4">
        <div className="flex flex-col items-end gap-0.5">
          {isFirstDay === true && <DeltaYesterday current={stats.grandTotal} previous={0} />}
          {yesterdayStats && <DeltaYesterday current={stats.grandTotal} previous={yesterdayStats.grandTotal} />}
        </div>
        {previousStats && (
          <Delta current={stats.grandTotal} previous={previousStats.grandTotal} />
        )}
        <div className="text-right">
          <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
            {formatCurrency(stats.grandTotal)}
          </p>
        </div>
      </div>

      {/* Botón expandir "MÁS INFO" */}
      <div className="border-t border-white/10 pt-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-brand-400 hover:text-brand-300 font-medium text-sm"
        >
          MÁS INFO {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Sección expandible - Medios de pago */}
      {expanded && (
        <div className="space-y-4 pt-4 border-t border-white/10">
          <h3 className="font-semibold text-white">Medios de Pago:</h3>
          
          <div className="space-y-3">
            {stats.paymentBreakdown.map((payment) => (
              <div key={payment.method} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-300 font-medium">
                    {payment.method && payment.method.toLowerCase() !== 'unpaid'
                      ? payment.method
                      : 'Sin pagar'}
                  </span>
                  <span className="font-semibold text-white tabular-nums">{formatCurrency(payment.amount)}</span>
                </div>

                {/* Barra de progreso */}
                <div className="w-full bg-gray-700/60 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${barColor(payment.method)}`}
                    style={{ width: `${payment.percentage}%` }}
                  />
                </div>

                <p className="text-xs text-gray-500 text-right">{payment.percentage.toFixed(1)}%</p>
              </div>
            ))}
          </div>

          {/* Botones adicionales — Mejora #1 */}
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-sm font-medium text-red-400 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancelaciones
              {stats.cancelledCount > 0 && (
                <span className="ml-1 bg-red-500 text-white rounded-full text-xs px-1.5 py-0.5 font-bold">
                  {stats.cancelledCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowTipsModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded text-sm font-medium text-amber-400 transition-colors"
            >
              Propinas
              {stats.tipsCount > 0 && (
                <span className="ml-1 bg-amber-500 text-white rounded-full text-xs px-1.5 py-0.5 font-bold">
                  {stats.tipsCount}
                </span>
              )}
            </button>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('ventas')}
                className="flex items-center gap-1 px-3 py-2 text-xs text-brand-400 hover:text-brand-300 transition-colors ml-auto"
              >
                Ver detalle <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Cancelaciones */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCancelModal(false)}>
          <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                Cancelaciones del período
              </h2>
              <button onClick={() => setShowCancelModal(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <span className="text-sm text-gray-300">Cancelaciones</span>
                <span className="font-bold text-red-400 tabular-nums">{stats.cancelledCount ?? 0}</span>
              </div>
              <div className="flex justify-between bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <span className="text-sm text-gray-300">Monto cancelado</span>
                <span className="font-bold text-red-400 tabular-nums">{formatCurrency(stats.cancelledTotal ?? 0)}</span>
              </div>

              {stats.cancelReasons && stats.cancelReasons.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Motivos:</h3>
                  <div className="space-y-2">
                    {stats.cancelReasons.map((r) => (
                      <div key={r.reason} className="flex justify-between items-center text-sm">
                        <span className="text-gray-400 truncate mr-2">{r.reason || 'Sin motivo'}</span>
                        <span className="bg-red-500/20 text-red-300 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {onNavigateToTab && (
              <button
                onClick={() => { setShowCancelModal(false); onNavigateToTab('ventas'); }}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Ver listado completo <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Propinas */}
      {showTipsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowTipsModal(false)}>
          <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Propinas del período</h2>
              <button onClick={() => setShowTipsModal(false)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <span className="text-sm text-gray-300">Ventas con propina</span>
                <span className="font-bold text-amber-400 tabular-nums">{stats.tipsCount ?? 0}</span>
              </div>
              <div className="flex justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <span className="text-sm text-gray-300">Total propinas</span>
                <span className="font-bold text-amber-400 tabular-nums">{formatCurrency(stats.totalTips ?? 0)}</span>
              </div>

              {stats.topTipWaiters && stats.topTipWaiters.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2">Top meseros:</h3>
                  <div className="space-y-2">
                    {stats.topTipWaiters.map((w, i) => (
                      <div key={w.name} className="flex items-center justify-between text-sm bg-gray-800/60 border border-white/5 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-amber-500 text-white rounded-full text-xs flex items-center justify-center font-bold">{i + 1}</span>
                          <span className="text-gray-300">{w.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-amber-300 tabular-nums">{formatCurrency(w.total)}</span>
                          <span className="text-gray-500 text-xs ml-1">({w.count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {onNavigateToTab && (
              <button
                onClick={() => { setShowTipsModal(false); onNavigateToTab('propinas'); }}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Ver listado propinas <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
