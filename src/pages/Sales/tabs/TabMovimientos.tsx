import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign, TrendingUp, TrendingDown, FileDown,
  Loader2, RefreshCw, ChevronDown, ChevronRight,
} from 'lucide-react';
import { exportSheet, clp, fmtDateTime } from '@/utils/exportExcel';
import { cashRegistersService } from '@/services/cashRegistersService';

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fmt = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(v);

const fmtDT = (d: string | Date) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));

// â”€â”€â”€ Tipos internos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface TimelineEntry {
  id:      string;
  type:    'OPEN' | 'CASH_IN' | 'CASH_OUT' | 'CLOSE';
  amount:  number;
  reason?: string;
  user:    string;
  time:    string;
}

interface SessionMovementsState {
  loading:  boolean;
  entries?: TimelineEntry[];
  error?:   string;
}

// â”€â”€â”€ Componente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const TabMovimientos = () => {
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [movementsMap, setMovementsMap]  = useState<Record<string, SessionMovementsState>>({});

  // Carga sesiones reales (apertura/cierre de caja = movimientos de fondo)
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cash-sessions-movements'],
    queryFn:  () => cashRegistersService.getAllSessions({ perPage: 100 }),
    staleTime: 30_000,
  });

  const sessions: any[] = data?.sessions ?? [];

  // â”€â”€ KPIs globales â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalOpeningCash = sessions.reduce((s, r) => s + Number(r.openingCash ?? 0), 0);
  // Agregar CASH_IN / CASH_OUT de todas las sesiones ya cargadas
  const allLoadedEntries = Object.values(movementsMap)
    .filter((m: any) => !m.loading && !m.error)
    .flatMap((m: any) => m.entries ?? []);
  const cashIn     = allLoadedEntries.filter((e: any) => e.type === 'CASH_IN').reduce((s: number, e: any) => s + e.amount, 0);
  const cashOut    = allLoadedEntries.filter((e: any) => e.type === 'CASH_OUT').reduce((s: number, e: any) => s + e.amount, 0);
  const movBalance = cashIn - cashOut;

  // â”€â”€ Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleExport = () => {
    const rows = sessions.flatMap((s: any) => {
      const out: any[] = [{
        'Fecha/Hora':  fmtDateTime(new Date(s.openedAt)),
        'Tipo':        'Apertura de caja',
        'DescripciÃ³n': `Caja: ${s.cash_register?.name ?? 'â€”'}`,
        'Usuario':     s.openedBy?.name ?? 'â€”',
        'Monto (CLP)': Number(s.openingCash ?? 0),
        'Monto fmt':   clp(Number(s.openingCash ?? 0)),
      }];
      if (s.closedAt) out.push({
        'Fecha/Hora':  fmtDateTime(new Date(s.closedAt)),
        'Tipo':        'Cierre de caja',
        'DescripciÃ³n': `Caja: ${s.cash_register?.name ?? 'â€”'}`,
        'Usuario':     s.closedBy?.name ?? 'â€”',
        'Monto (CLP)': Number(s.closingCash ?? 0),
        'Monto fmt':   clp(Number(s.closingCash ?? 0)),
      });
      return out;
    });
    exportSheet(rows, 'Movimientos_Caja');
  };

  // â”€â”€ Lazy load movimientos al expandir â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleSession = async (sessionId: string) => {
    if (expandedId === sessionId) { setExpandedId(null); return; }
    setExpandedId(sessionId);
    if (movementsMap[sessionId]) return;

    setMovementsMap(prev => ({ ...prev, [sessionId]: { loading: true } }));
    try {
      const cuadre: any  = await cashRegistersService.getSessionCuadreById(sessionId);
      const session      = sessions.find(s => s.id === sessionId);
      const entries: TimelineEntry[] = [];

      if (session) {
        entries.push({
          id:     `${sessionId}-open`,
          type:   'OPEN',
          amount: Number(session.openingCash ?? 0),
          reason: `Caja: ${session.cash_register?.name ?? 'â€”'}`,
          user:   session.openedBy?.name ?? session.openedById ?? 'â€”',
          time:   session.openedAt,
        });
      }

      const rawMov: any[] = cuadre?.movements ?? cuadre?.data?.movements ?? [];
      rawMov.forEach((mov: any) => {
        entries.push({
          id:     mov.id,
          type:   mov.type === 'CASH_IN' ? 'CASH_IN' : 'CASH_OUT',
          amount: Number(mov.amount ?? 0),
          reason: mov.reason ?? mov.description,
          user:   mov.createdBy?.name ?? mov.createdByName ?? 'â€”',
          time:   mov.createdAt,
        });
      });

      if (session?.closedAt) {
        entries.push({
          id:     `${sessionId}-close`,
          type:   'CLOSE',
          amount: Number(session.closingCash ?? 0),
          reason: session.notes ?? undefined,
          user:   session.closedBy?.name ?? session.closedById ?? 'â€”',
          time:   session.closedAt,
        });
      }

      entries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      setMovementsMap(prev => ({ ...prev, [sessionId]: { loading: false, entries } }));
    } catch {
      setMovementsMap(prev => ({
        ...prev,
        [sessionId]: { loading: false, error: 'No se pudieron cargar los movimientos' },
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
        <p>Error al cargar los movimientos.</p>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-white/10 hover:bg-white/10 rounded-lg">
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-500/10 p-6 rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Fondo apertura</p>
              <p className="text-2xl font-bold text-blue-400">{fmt(totalOpeningCash)}</p>
            </div>
            <DollarSign className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-green-500/10 p-6 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Ingresos manuales</p>
              <p className="text-2xl font-bold text-green-400">{fmt(cashIn)}</p>
              {allLoadedEntries.length === 0 && <p className="text-xs text-gray-400 mt-1">Expandir sesiÃ³n para cargar</p>}
            </div>
            <TrendingUp className="text-green-500" size={32} />
          </div>
        </div>
        <div className="bg-red-500/10 p-6 rounded-lg border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Egresos manuales</p>
              <p className="text-2xl font-bold text-red-400">{fmt(cashOut)}</p>
            </div>
            <TrendingDown className="text-red-500" size={32} />
          </div>
        </div>
        <div className={`p-6 rounded-lg border-l-4 ${movBalance >= 0 ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Balance movimientos</p>
              <p className={`text-2xl font-bold ${movBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{movBalance >= 0 ? '+' : ''}{fmt(movBalance)}</p>
            </div>
            <DollarSign className={movBalance >= 0 ? 'text-green-500' : 'text-red-500'} size={32} />
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {sessions.length} sesiÃ³n{sessions.length !== 1 ? 'es' : ''} Â·{' '}
          <span className="text-gray-400">Haz clic para ver movimientos detallados</span>
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/100/20 transition-colors"
        >
          <FileDown size={15} /> Exportar Excel
        </button>
      </div>

      {/* Tabla expandible */}
      <div className="bg-gray-900 rounded-lg shadow-sm overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Sin sesiones registradas</p>
            <p className="text-sm mt-1">Los movimientos aparecerÃ¡n cuando se abran o cierren sesiones de caja</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800/40 border-b">
              <tr>
                <th className="px-3 py-3 w-6" />
                {['Caja', 'Apertura', 'Estado', 'Fondo apertura', 'Fondo cierre', 'Diferencia'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-400 uppercase ${['Fondo apertura','Fondo cierre','Diferencia'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s: any) => {
                const isExpanded = expandedId === s.id;
                const diff       = Number(s.closingCash ?? 0) - Number(s.openingCash ?? 0);
                const mvState    = movementsMap[s.id];

                return (
                  <>
                    <tr
                      key={s.id}
                      onClick={() => toggleSession(s.id)}
                      className="border-b border-white/10 hover:bg-orange-500/100/10 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-3 text-gray-400">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-white">{s.cash_register?.name ?? 'â€”'}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{fmtDT(s.openedAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          s.status === 'OPEN' ? 'bg-amber-500/15 text-amber-400' : 'bg-white/10 text-gray-500'
                        }`}>
                          {s.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-300">{fmt(Number(s.openingCash ?? 0))}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-300">
                        {s.closingCash != null ? fmt(Number(s.closingCash)) : 'â€”'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${
                        s.closingCash == null ? 'text-gray-400' : diff >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {s.closingCash != null ? `${diff >= 0 ? '+' : ''}${fmt(diff)}` : 'â€”'}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${s.id}-detail`}>
                        <td colSpan={7} className="bg-gray-800/40 border-b border-white/10 px-8 py-4">
                          {mvState?.loading && (
                            <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                              <Loader2 size={14} className="animate-spin" /> Cargando movimientos...
                            </div>
                          )}
                          {mvState?.error && (
                            <p className="text-red-500 text-sm">{mvState.error}</p>
                          )}
                          {mvState?.entries && (
                            <div className="relative pl-5">
                              <div className="absolute left-3 top-0 bottom-0 w-px bg-white/20" />
                              <div className="space-y-3">
                                {mvState.entries.map(entry => (
                                  <div key={entry.id} className="relative flex items-start gap-3">
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold -ml-1 ${
                                      entry.type === 'CASH_IN'  ? 'bg-green-500/15 text-green-400' :
                                      entry.type === 'CASH_OUT' ? 'bg-red-500/15 text-red-400' :
                                      entry.type === 'OPEN'     ? 'bg-blue-500/15 text-blue-400' :
                                                                   'bg-white/10 text-gray-500'
                                    }`}>
                                      {entry.type === 'CASH_IN'  ? 'â†‘' :
                                       entry.type === 'CASH_OUT' ? 'â†“' :
                                       entry.type === 'OPEN'     ? 'ðŸ”“' : 'ðŸ”’'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-white">
                                          {entry.type === 'CASH_IN'  ? 'Ingreso manual' :
                                           entry.type === 'CASH_OUT' ? 'Egreso manual' :
                                           entry.type === 'OPEN'     ? 'Apertura de caja' : 'Cierre de caja'}
                                        </span>
                                        <span className={`text-sm font-bold ml-4 ${
                                          entry.type === 'CASH_IN'  ? 'text-green-400' :
                                          entry.type === 'CASH_OUT' ? 'text-red-400' : 'text-gray-300'
                                        }`}>
                                          {entry.type === 'CASH_IN' ? '+' : entry.type === 'CASH_OUT' ? 'âˆ’' : ''}
                                          {fmt(entry.amount)}
                                        </span>
                                      </div>
                                      {entry.reason && (
                                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{entry.reason}</p>
                                      )}
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        {entry.user} Â· {fmtDT(entry.time)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {mvState.entries.filter(e => e.type === 'CASH_IN' || e.type === 'CASH_OUT').length === 0 && (
                                <p className="text-xs text-gray-400 mt-3 ml-6">Sin movimientos manuales en esta sesiÃ³n</p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
