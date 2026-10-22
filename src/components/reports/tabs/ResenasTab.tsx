// HOTFIX 273 — Reportes → Reseñas: reseñas de los pedidos QR del período (promedio, total, tabla).
import { useQuery } from '@tanstack/react-query';
import { Star, MessageSquare } from 'lucide-react';
import api from '@/services/api';
import { useReports } from '@/contexts/ReportsContext';
import { Spinner } from '@/components/reports/shared/Spinner';
import { EmptyState } from '@/components/reports/shared/EmptyState';

interface ReviewRow {
  id:          string;
  createdAt:   string;
  rating:      number;
  comment:     string | null;
  code:        string;
  orderNumber: string | null;
}

interface ReviewsData {
  average:      number | null;
  total:        number;
  distribution: Record<string, number>;
  reviews:      ReviewRow[];
}

const fmtFecha = (iso: string) =>
  new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`w-4 h-4 ${n <= value ? 'text-orange-500 fill-orange-500' : 'text-gray-300'}`} />
      ))}
    </span>
  );
}

export function ResenasTab() {
  const { dateFrom, dateTo } = useReports();

  const { data, isLoading } = useQuery({
    queryKey: ['rpt-reviews', dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.get<any>(`/reviews?dateFrom=${dateFrom}&dateTo=${dateTo}`);
      // api.get ya desenvuelve { success, data } (handleResponse): res.data es el objeto de reseñas
      const d = res.data?.reviews ? res.data : res.data?.data;
      return (d ?? null) as ReviewsData | null;
    },
    staleTime: 0,
  });

  if (isLoading) return <Spinner />;
  if (!data || data.total === 0) return <EmptyState message="Sin reseñas de pedidos QR en el período" />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Promedio</span>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-2xl font-extrabold text-gray-900">{data.average?.toFixed(1) ?? '—'}</span>
            <Stars value={Math.round(data.average ?? 0)} />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total reseñas</span>
          <div className="mt-3 text-2xl font-extrabold text-gray-900">{data.total}</div>
        </div>
        <div className="col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Distribución</span>
          <div className="mt-2 space-y-1">
            {[5, 4, 3, 2, 1].map(n => {
              const c = data.distribution[String(n)] ?? 0;
              const pct = data.total > 0 ? (c / data.total) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-gray-500">{n}</span>
                  <Star className="w-3 h-3 text-orange-500 fill-orange-500" />
                  <div className="flex-1 h-2 bg-gray-100 rounded">
                    <div className="h-2 bg-orange-500 rounded" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right font-bold text-gray-700">{c}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Fecha', 'Pedido', 'Estrellas', 'Comentario'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.reviews.map(r => (
                <tr key={r.id} className="border-t border-gray-100 align-top">
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{fmtFecha(r.createdAt)}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="font-semibold text-gray-800">{r.orderNumber ?? r.code}</span>
                    {r.orderNumber && <span className="block text-xs text-gray-400">{r.code}</span>}
                  </td>
                  <td className="px-5 py-3"><Stars value={r.rating} /></td>
                  <td className="px-5 py-3 text-gray-700">
                    {r.comment
                      ? <span className="inline-flex items-start gap-1.5"><MessageSquare className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />{r.comment}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
