import { Search, Filter } from 'lucide-react';
import type { CampaignsFilters as FiltersType, CampaignStatus, CampaignType } from '@ /types/campaigns.types';

interface CampaignsFiltersProps {
  filters: FiltersType;
  onChange: (filters: Partial<FiltersType>) => void;
}

const statusOptions: { value: CampaignStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'SCHEDULED', label: 'Programada' },
  { value: 'RUNNING', label: 'En curso' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'PAUSED', label: 'Pausada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

const typeOptions: { value: CampaignType | ''; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'EMAIL', label: '📧 Email' },
  { value: 'SMS', label: '💬 SMS' },
  { value: 'PUSH', label: '🔔 Push' },
  { value: 'WHATSAPP', label: '💚 WhatsApp' },
];

export function CampaignsFilters({ filters, onChange }: CampaignsFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Filtros</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar campañas..."
            value={filters.search || ''}
            onChange={(e) => onChange({ search: e.target.value })}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status || ''}
          onChange={(e) => onChange({ status: e.target.value as CampaignStatus | undefined })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Type */}
        <select
          value={filters.type || ''}
          onChange={(e) => onChange({ type: e.target.value as CampaignType | undefined })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Segment */}
        <select
          value={filters.targetSegment || ''}
          onChange={(e) => onChange({ targetSegment: e.target.value as any })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">Todos los segmentos</option>
          <option value="VIP">⭐ VIP</option>
          <option value="FREQUENT">🔥 Frecuentes</option>
          <option value="REGULAR">👤 Regulares</option>
          <option value="NEW">🆕 Nuevos</option>
          <option value="INACTIVE">😴 Inactivos</option>
          <option value="AT_RISK">⚠️ En riesgo</option>
        </select>
      </div>
    </div>
  );
}
