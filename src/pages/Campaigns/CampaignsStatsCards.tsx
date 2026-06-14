import { TrendingUp, Send, Eye, MousePointerClick, DollarSign } from 'lucide-react';
import type { CampaignsStats } from '@/types/campaigns.types';

interface CampaignsStatsCardsProps {
  stats: CampaignsStats;
  loading?: boolean;
}

export function CampaignsStatsCards({ stats, loading }: CampaignsStatsCardsProps) {
  // Convierte un valor (puede llegar como decimal 0-1 o como entero) a porcentaje seguro
  const safePct = (v: number | undefined | null) => {
    const n = Number(v ?? 0);
    if (!isFinite(n) || isNaN(n)) return '0.0';
    // Si el valor es mayor a 1, asumimos que ya está en % (0-100)
    return (n > 1 ? n : n * 100).toFixed(1);
  };

  const cards = [
    {
      title: 'Campañas Activas',
      value: stats.activeCampaigns,
      total: stats.totalCampaigns,
      subtitle: `de ${stats.totalCampaigns} totales`,
      icon: Send,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Enviados',
      value: (stats.totalDeliveries ?? 0).toLocaleString('es-CL'),
      subtitle: `${(stats.totalRecipients ?? 0).toLocaleString('es-CL')} destinatarios`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Tasa Apertura',
      value: `${safePct(stats.averageOpenRate)}%`,
      subtitle: 'promedio',
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Tasa Clicks',
      value: `${safePct(stats.averageClickRate)}%`,
      subtitle: 'promedio',
      icon: MousePointerClick,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Revenue Total',
      value: `$${(stats.totalRevenue || 0).toLocaleString('es-CL')}`,
      subtitle: `Conv: ${safePct(stats.averageConversionRate)}%`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">{card.title}</span>
              <div className={`${card.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{card.value}</div>
            <div className="text-xs text-gray-500">{card.subtitle}</div>
          </div>
        );
      })}
    </div>
  );
}
