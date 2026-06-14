import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart2, Users, Mail, MessageSquare, Bell, Copy } from 'lucide-react';
import type { Campaign } from '@/types/campaigns.types';
import { cn } from '@/lib/utils';
import { safeArray } from '@/utils/safeArray';

interface CampaignsTableProps {
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  onSelectCampaign: (campaign: Campaign) => void;
  loading?: boolean;
  onRefresh: () => void;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT:     { bg: 'bg-gray-100',   text: 'text-gray-700'   },
  SCHEDULED: { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  RUNNING:   { bg: 'bg-green-100',  text: 'text-green-700'  },
  COMPLETED: { bg: 'bg-purple-100', text: 'text-purple-700' },
  PAUSED:    { bg: 'bg-orange-100', text: 'text-orange-700' },
  CANCELLED: { bg: 'bg-red-100',    text: 'text-red-700'    },
};

const statusLabels: Record<string, string> = {
  DRAFT:     'Borrador',
  SCHEDULED: 'Programada',
  RUNNING:   'En curso',
  COMPLETED: 'Completada',
  PAUSED:    'Pausada',
  CANCELLED: 'Cancelada',
};

const typeIcons: Record<string, React.ElementType> = {
  EMAIL:    Mail,
  SMS:      MessageSquare,
  PUSH:     Bell,
  WHATSAPP: MessageSquare,
};

const typeColors: Record<string, string> = {
  EMAIL:    'bg-blue-50 text-blue-600',
  SMS:      'bg-green-50 text-green-600',
  PUSH:     'bg-purple-50 text-purple-600',
  WHATSAPP: 'bg-emerald-50 text-emerald-600',
};

const typeLabels: Record<string, string> = {
  EMAIL: 'Email', SMS: 'SMS', PUSH: 'Push', WHATSAPP: 'WhatsApp',
};

function CampaignCard({
  campaign,
  isSelected,
  onSelect,
}: {
  campaign: Campaign;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const statusColor = statusColors[campaign.status] ?? statusColors.DRAFT;
  const TypeIcon    = typeIcons[campaign.type] ?? Mail;

  return (
    <div
      onClick={onSelect}
      className={cn(
        'bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md',
        isSelected
          ? 'border-orange-400 shadow-md ring-2 ring-orange-200'
          : 'border-gray-200 hover:border-gray-300'
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2 min-w-0">
          <div className={`shrink-0 p-1.5 rounded-lg ${typeColors[campaign.type] ?? 'bg-gray-50 text-gray-500'}`}>
            <TypeIcon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate leading-tight">{campaign.name}</p>
            {campaign.subject && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{campaign.subject}</p>
            )}
          </div>
        </div>
        <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-xs font-medium', statusColor.bg, statusColor.text)}>
          {statusLabels[campaign.status]}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          <span className="font-medium text-gray-700">{(campaign.totalRecipients ?? 0).toLocaleString('es-CL')}</span>
          <span>dest.</span>
        </div>
        {(campaign.successfulDeliveries ?? 0) > 0 && (
          <div className="flex items-center gap-1">
            <BarChart2 className="h-3 w-3" />
            <span className="font-medium text-blue-700">{((campaign.openRate ?? 0) * 100).toFixed(0)}%</span>
            <span>apertura</span>
          </div>
        )}
        {(campaign.actualRevenue ?? 0) > 0 && (
          <div className="ml-auto font-semibold text-emerald-600">
            ${(campaign.actualRevenue ?? 0).toLocaleString('es-CL')}
          </div>
        )}
        <div className="ml-auto text-gray-400">
          {campaign.scheduledAt
            ? format(new Date(campaign.scheduledAt), "d MMM yyyy", { locale: es })
            : format(new Date(campaign.createdAt), "d MMM yyyy", { locale: es })}
        </div>
      </div>
    </div>
  );
}

export function CampaignsTable({
  campaigns,
  selectedCampaign,
  onSelectCampaign,
  loading,
}: CampaignsTableProps) {
  const safe = safeArray<Campaign>(campaigns);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white border border-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (safe.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Copy className="h-8 w-8 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 font-medium">No hay campañas todavía</p>
        <p className="text-xs text-gray-400 mt-1">Crea tu primera campaña con el botón "Nueva Campaña"</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {safe.filter(Boolean).map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          isSelected={selectedCampaign?.id === campaign.id}
          onSelect={() => onSelectCampaign(campaign)}
        />
      ))}
    </div>
  );
}