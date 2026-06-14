import { useMemo, useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Users, Send, MousePointerClick, DollarSign } from 'lucide-react';
import type { Campaign, CampaignsStats } from '@/types/campaigns.types';
import { safeArray } from '@/utils/safeArray';
import campaignsService from '@/services/campaignsService';

interface StatsTabProps {
  // Props mantenidas como opcionales (compatibilidad con el padre)
  stats?: CampaignsStats | null;
  campaigns?: Campaign[];
  loading?: boolean;
}

const PIE_COLORS = ['#f97316', '#3b82f6', '#8b5cf6', '#10b981'];

const TYPE_LABELS: Record<string, string> = {
  EMAIL: 'Email', SMS: 'SMS', PUSH: 'Push', WHATSAPP: 'WhatsApp',
};

const fmt = (n: number) => n.toLocaleString('es-CL');
// MENOR 12: normaliza fracciÃ³n (0-1) o porcentaje (1-100) de forma consistente
const pct = (v: number) => { const val = v <= 1 ? v * 100 : v; return `${val.toFixed(1)}%`; };

function KpiCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; trend?: 'up' | 'down' | 'neutral';
}) {
  const TrendIcon  = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400';
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <div className="flex items-end gap-2 mt-1">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && <TrendIcon className={`h-4 w-4 mb-1 ${trendColor}`} />}
        </div>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// FUNCIONAL 6: StatsTab carga sus propios datos â€” no depende de props del padre
export function StatsTab(_props: StatsTabProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats]         = useState<CampaignsStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [s, { campaigns: list }] = await Promise.all([
        campaignsService.getStats(),
        campaignsService.listCampaigns(),
      ]);
      setStats(s);
      setCampaigns(safeArray<Campaign>(list));
    } catch {
      setError('No se pudieron cargar las estadÃ­sticas. Intenta recargar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* â”€â”€ Derived data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const topCampaigns = useMemo(
    () =>
      [...campaigns]
        .filter((c) => c.status === 'COMPLETED' || (c.successfulDeliveries ?? 0) > 0)
        .sort((a, b) => (b.actualRevenue || 0) - (a.actualRevenue || 0))
        .slice(0, 5),
    [campaigns]
  );

  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    campaigns.forEach((c) => { counts[c.type] = (counts[c.type] || 0) + 1; });
    return Object.entries(counts).map(([type, count]) => ({ name: TYPE_LABELS[type] ?? type, value: count }));
  }, [campaigns]);

  const monthlyData = useMemo(() => {
    const buckets: Record<string, { enviados: number; aperturas: number }> = {};
    campaigns.forEach((c) => {
      const date = c.scheduledAt ?? c.createdAt;
      if (!date) return;
      const key = new Date(date).toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });
      if (!buckets[key]) buckets[key] = { enviados: 0, aperturas: 0 };
      buckets[key].enviados  += c.successfulDeliveries ?? 0;
      buckets[key].aperturas += Math.round((c.successfulDeliveries ?? 0) * (c.openRate ?? 0));
    });
    return Object.entries(buckets).slice(-6).map(([mes, v]) => ({ mes, ...v }));
  }, [campaigns]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 text-sm mb-3">{error}</p>
        <button onClick={load} className="text-red-600 text-sm underline">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* â”€â”€ KPIs â”€â”€ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="CampaÃ±as activas"
          value={fmt(stats?.activeCampaigns ?? 0)}
          sub={`de ${fmt(stats?.totalCampaigns ?? 0)} totales`}
          icon={Send} color="bg-orange-500" trend="up"
        />
        <KpiCard
          label="Total enviados"
          value={fmt(stats?.totalDeliveries ?? 0)}
          sub={`${fmt(stats?.totalRecipients ?? 0)} destinatarios`}
          icon={Users} color="bg-blue-500" trend="up"
        />
        <KpiCard
          label="Tasa de apertura"
          value={pct(stats?.averageOpenRate ?? 0)}
          sub={`Clicks: ${pct(stats?.averageClickRate ?? 0)}`}
          icon={MousePointerClick} color="bg-purple-500"
          trend={(stats?.averageOpenRate ?? 0) > 0.2 ? 'up' : (stats?.averageOpenRate ?? 0) > 0.1 ? 'neutral' : 'down'}
        />
        <KpiCard
          label="Revenue total"
          value={`$${fmt(stats?.totalRevenue ?? 0)}`}
          sub="atribuido a campaÃ±as"
          icon={DollarSign} color="bg-emerald-500" trend="up"
        />
      </div>

      {/* â”€â”€ Charts row â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">EnvÃ­os por mes</h3>
          {monthlyData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No hay datos de envÃ­os aÃºn</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(val: number) => [fmt(val)]} />
                <Bar dataKey="enviados"  fill="#f97316" radius={[4, 4, 0, 0]} name="Enviados" />
                <Bar dataKey="aperturas" fill="#fb923c" radius={[4, 4, 0, 0]} fillOpacity={0.5} name="Aperturas" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Por tipo de canal</h3>
          {typeDistribution.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={typeDistribution} cx="50%" cy="45%" outerRadius={75} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {typeDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* â”€â”€ Top campaigns table â”€â”€ */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Top campaÃ±as por revenue</h3>
        {topCampaigns.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No hay campaÃ±as completadas todavÃ­a</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                <th className="pb-2 text-left font-semibold">CampaÃ±a</th>
                <th className="pb-2 text-right font-semibold">Enviados</th>
                <th className="pb-2 text-right font-semibold">Apertura</th>
                <th className="pb-2 text-right font-semibold">Clicks</th>
                <th className="pb-2 text-right font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topCampaigns.map((c, i) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">{i + 1}</span>
                      <div>
                        <div className="font-medium text-gray-900 truncate max-w-[180px]">{c.name}</div>
                        <div className="text-xs text-gray-500">{TYPE_LABELS[c.type]}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-medium text-gray-900">{fmt(c.successfulDeliveries ?? 0)}</td>
                  <td className="py-2.5 text-right text-blue-700 font-medium">{pct(c.openRate ?? 0)}</td>
                  <td className="py-2.5 text-right text-purple-700 font-medium">{pct(c.clickRate ?? 0)}</td>
                  <td className="py-2.5 text-right font-semibold text-emerald-700">${fmt(c.actualRevenue ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

