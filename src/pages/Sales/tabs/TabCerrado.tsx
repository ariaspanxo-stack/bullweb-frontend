import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock, Loader2, RefreshCw, Clock, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cashRegistersService } from '@/services/cashRegistersService';
import { exportSheet } from '@/utils/exportExcel';

const fmt = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(v);

const fmtDate = (s: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(s));

const duration = (from: string, to: string) => {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
};

export const TabCerrado = () => {
  const PAGE_SIZE = 20;
  const [page,      setPage]      = useState(1);
  const [monthYear, setMonthYear] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Calcular from/to desde el mes seleccionado
  const from = `${monthYear}-01`;
  const toDate = new Date(Number(monthYear.split('-')[0]), Number(monthYear.split('-')[1]), 0);
  const to = `${monthYear}-${String(toDate.getDate()).padStart(2, '0')}`;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cash-sessions-closed', page, monthYear],
    queryFn: () => cashRegistersService.getAllSessions({ status: 'CLOSED', perPage: PAGE_SIZE, page, from, to }),
    staleTime: 30_000,
  });

  const sessions: any[]  = data?.sessions ?? (data as any)?.data ?? [];
  const totalCount: number = data?.total   ?? (data as any)?.totalCount ?? sessions.length;
  const totalPages: number = data?.totalPages ?? Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ── Carga ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
        <p>Error al cargar las sesiones cerradas.</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    );
  }

  // ── Stats ──────────────────────────────────────────────────────
  const totalSessions = sessions.length;
  const totalApertura = sessions.reduce((s, r) => s + Number(r.openingCash ?? 0), 0);
  const totalCierre   = sessions.reduce((s, r) => s + Number(r.closingCash ?? 0), 0);
  const diffTotal     = totalCierre - totalApertura;

  const handleExport = () => {
    exportSheet(
      sessions.map(s => ({
        'Caja':             s.cash_register?.name ?? '—',
        'Apertura':         fmtDate(s.openedAt),
        'Cierre':           s.closedAt ? fmtDate(s.closedAt) : '—',
        'Duración':         s.closedAt ? duration(s.openedAt, s.closedAt) : '—',
        'Fondo apertura':   Number(s.openingCash ?? 0),
        'Fondo cierre':     Number(s.closingCash ?? 0),
        'Total Ventas':     s.totalSales ?? s.snapshotTotalSales ?? 'N/D',
        'Diferencia (CLP)': Number(s.closingCash ?? 0) - Number(s.openingCash ?? 0),
        'Responsable cierre': s.closedBy?.name ?? '—',
      })),
      'Sesiones_Cerradas'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Lock size={22} className="text-gray-600" />
          Sesiones Cerradas
        </h2>
        <div className="flex items-center gap-3">
          {/* Selector de mes */}
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={monthYear}
              onChange={e => { setMonthYear(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-orange-400"
            />
            <span className="text-sm text-gray-400">{totalCount} turno{totalCount !== 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
          <button
            disabled={sessions.length === 0}
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            <FileDown size={15} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Sesiones</p>
          <p className="text-3xl font-bold text-gray-800">{totalSessions}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-5">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total Apertura</p>
          <p className="text-xl font-bold text-blue-700">{fmt(totalApertura)}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-5">
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total Cierre</p>
          <p className="text-xl font-bold text-green-700">{fmt(totalCierre)}</p>
        </div>
        <div className={`rounded-lg p-5 ${diffTotal >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className="text-xs text-gray-500 uppercase font-medium mb-1">Diferencia Total</p>
          <p className={`text-xl font-bold ${diffTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {diffTotal >= 0 ? '+' : ''}{fmt(diffTotal)}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Lock size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg">Sin sesiones cerradas</p>
            <p className="text-sm mt-1">Las sesiones cerradas aparecerán aquí</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Caja', 'Apertura', 'Cierre', 'Duración', 'Fondo Apertura', 'Fondo Cierre', 'Diferencia'].map(h => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase ${['Fondo Apertura','Fondo Cierre','Diferencia'].includes(h) ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sessions.map((s: any) => {
                const diff = Number(s.closingCash ?? 0) - Number(s.openingCash ?? 0);
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {s.cash_register?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fmtDate(s.openedAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {s.closedAt ? fmtDate(s.closedAt) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {s.closedAt ? (
                        <span className="flex items-center gap-1">
                          <Clock size={13} /> {duration(s.openedAt, s.closedAt)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {fmt(Number(s.openingCash ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {fmt(Number(s.closingCash ?? 0))}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${diff >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {diff >= 0 ? '+' : ''}{fmt(diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-2">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={14} /> Anterior
          </button>
          <span className="text-sm text-gray-600 font-medium">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Siguiente <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
