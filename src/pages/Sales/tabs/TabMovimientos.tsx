import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign, TrendingUp, TrendingDown, FileDown,
  Loader2, RefreshCw, ChevronDown, ChevronRight,
} from 'lucide-react';
import { exportSheet, clp, fmtDateTime } from '@/utils/exportExcel';
import { cashRegistersService } from '@/services/cashRegistersService';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(v);

const fmtDT = (d: string | Date) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));

// ─── Tipos internos ──────────────────────────────────────────────────────────
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

// ─── Componente ──────────────────────────────────────────────────────────────
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

  // ── KPIs globales ────────────────────────────────────────────────────────
  const totalOpeningCash = sessions.reduce((s, r) => s + Number(r.openingCash ?? 0), 0);
  // Agregar CASH_IN / CASH_OUT de todas las sesiones ya cargadas
  const allLoadedEntries = Object.values(movementsMap)
    .filter((m: any) => !m.loading && !m.error)
    .flatMap((m: any) => m.entries ?? []);
  const cashIn     = allLoadedEntries.filter((e: any) => e.type === 'CASH_IN').reduce((s: number, e: any) => s + e.amount, 0);
  const cashOut    = allLoadedEntries.filter((e: any) => e.type === 'CASH_OUT').reduce((s: number, e: any) => s + e.amount, 0);
  const movBalance = cashIn - cashOut;

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = sessions.flatMap((s: any) => {
      const out: any[] = [{
        'Fecha/Hora':  fmtDateTime(new Date(s.openedAt)),
        'Tipo':        'Apertura de caja',
        'Descripción': `Caja: ${s.cash_register?.name ?? '—'}`,
        'Usuario':     s.openedBy?.name ?? '—',
        'Monto (CLP)': Number(s.openingCash ?? 0),
        'Monto fmt':   clp(Number(s.openingCash ?? 0)),
      }];
      if (s.closedAt) out.push({
        'Fecha/Hora':  fmtDateTime(new Date(s.closedAt)),
        'Tipo':        'Cierre de caja',
        'Descripción': `Caja: ${s.cash_register?.name ?? '—'}`,
        'Usuario':     s.closedBy?.name ?? '—',
        'Monto (CLP)': Number(s.closingCash ?? 0),
        'Monto fmt':   clp(Number(s.closingCash ?? 0)),
      });
      return out;
    });
    exportSheet(rows, 'Movimientos_Caja');
  };

  // ── Lazy load movimientos al expandir ────────────────────────────────────
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
          reason: `Caja: ${session.cash_register?.name ?? '—'}`,
          user:   session.openedBy?.name ?? session.openedById ?? '—',
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
          user:   mov.createdBy?.name ?? mov.createdByName ?? '—',
          time:   mov.createdAt,
        });
      });

      if (session?.closedAt) {
        entries.push({
          id:     `${sessionId}-close`,
          type:   'CLOSE',
          amount: Number(session.closingCash ?? 0),
          reason: session.notes ?? undefined,
          user:   session.closedBy?.name ?? session.closedById ?? '—',
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
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Fondo apertura</p>
              <p className="text-2xl font-bold text-blue-700">{fmt(totalOpeningCash)}</p>
            </div>
            <DollarSign className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ingresos manuales</p>
              <p className="text-2xl font-bold text-green-700">{fmt(cashIn)}</p>
              {allLoadedEntries.length === 0 && <p className="text-xs text-gray-400 mt-1">Expandir sesión para cargar</p>}
            </div>
            <TrendingUp className="text-green-500" size={32} />
          </div>
        </div>
        <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Egresos manuales</p>
              <p className="text-2xl font-bold text-red-700">{fmt(cashOut)}</p>
            </div>
            <TrendingDown className="text-red-500" size={32} />
          </div>
        </div>
        <div className={`p-6 rounded-lg border-l-4 ${movBalance >= 0 ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-500'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Balance movimientos</p>
              <p className={`text-2xl font-bold ${movBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>{movBalance >= 0 ? '+' : ''}{fmt(movBalance)}</p>
            </div>
            <DollarSign className={movBalance >= 0 ? 'text-green-500' : 'text-red-500'} size={32} />
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {sessions.length} sesión{sessions.length !== 1 ? 'es' : ''} ·{' '}
          <span className="text-gray-400">Haz clic para ver movimientos detallados</span>
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
        >
          <FileDown size={15} /> Exportar Excel
        </button>
      </div>

      {/* Tabla expandible */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg">Sin sesiones registradas</p>
            <p className="text-sm mt-1">Los movimientos aparecerán cuando se abran o cierren sesiones de caja</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-3 w-6" />
                {['Caja', 'Apertura', 'Estado', 'Fondo apertura', 'Fondo cierre', 'Diferencia'].map(h => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase ${['Fondo apertura','Fondo cierre','Diferencia'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
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
                      className="border-b border-gray-100 hover:bg-orange-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-3 text-gray-400">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{s.cash_register?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{fmtDT(s.openedAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          s.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {s.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">{fmt(Number(s.openingCash ?? 0))}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-700">
                        {s.closingCash != null ? fmt(Number(s.closingCash)) : '—'}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold ${
                        s.closingCash == null ? 'text-gray-400' : diff >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {s.closingCash != null ? `${diff >= 0 ? '+' : ''}${fmt(diff)}` : '—'}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${s.id}-detail`}>
                        <td colSpan={7} className="bg-gray-50 border-b border-gray-200 px-8 py-4">
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
                              <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-300" />
                              <div className="space-y-3">
                                {mvState.entries.map(entry => (
                                  <div key={entry.id} className="relative flex items-start gap-3">
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold -ml-1 ${
                                      entry.type === 'CASH_IN'  ? 'bg-green-100 text-green-700' :
                                      entry.type === 'CASH_OUT' ? 'bg-red-100 text-red-700' :
                                      entry.type === 'OPEN'     ? 'bg-blue-100 text-blue-700' :
                                                                   'bg-gray-100 text-gray-500'
                                    }`}>
                                      {entry.type === 'CASH_IN'  ? '↑' :
                                       entry.type === 'CASH_OUT' ? '↓' :
                                       entry.type === 'OPEN'     ? '🔓' : '🔒'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-800">
                                          {entry.type === 'CASH_IN'  ? 'Ingreso manual' :
                                           entry.type === 'CASH_OUT' ? 'Egreso manual' :
                                           entry.type === 'OPEN'     ? 'Apertura de caja' : 'Cierre de caja'}
                                        </span>
                                        <span className={`text-sm font-bold ml-4 ${
                                          entry.type === 'CASH_IN'  ? 'text-green-600' :
                                          entry.type === 'CASH_OUT' ? 'text-red-600' : 'text-gray-700'
                                        }`}>
                                          {entry.type === 'CASH_IN' ? '+' : entry.type === 'CASH_OUT' ? '−' : ''}
                                          {fmt(entry.amount)}
                                        </span>
                                      </div>
                                      {entry.reason && (
                                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{entry.reason}</p>
                                      )}
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        {entry.user} · {fmtDT(entry.time)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {mvState.entries.filter(e => e.type === 'CASH_IN' || e.type === 'CASH_OUT').length === 0 && (
                                <p className="text-xs text-gray-400 mt-3 ml-6">Sin movimientos manuales en esta sesión</p>
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
