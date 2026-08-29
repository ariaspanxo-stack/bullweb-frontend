import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Heart, Zap, BarChart2, Mail, Gift } from 'lucide-react';
import { FidelizacionPaywall } from './Campaigns/FidelizacionPaywall';
import campaignsService from '@/services/campaignsService';
import fidelizacionService from '@/services/fidelizacionService';
import { useAuthStore } from '@/store/authStore';
import { safeArray } from '@/utils/safeArray';
import type {
  Campaign,
  CampaignsFilters,
  CampaignsStats,
} from '@/types/campaigns.types';
import { CampaignsFilters as FiltersComponent } from './Campaigns/CampaignsFilters';
import { CampaignsTable } from './Campaigns/CampaignsTable';
import { CampaignDetails } from './Campaigns/CampaignDetails';
import { CreateCampaignModal } from './Campaigns/CreateCampaignModal';
import { AutomationsTab } from './Campaigns/AutomationsTab';
import { StatsTab } from './Campaigns/StatsTab';
import { LoyaltyTab } from './Campaigns/LoyaltyTab';

type Tab = 'automations' | 'campaigns' | 'stats' | 'loyalty';

// Hotfix #98 — Patrón buildWhatsAppURL replicado de FidelizacionPaywall.tsx
const CONTACT_WHATSAPP = '56956739153';

function buildUpsellWhatsAppURL(): string {
  const msg = encodeURIComponent(
    'Hola, quiero activar el paquete de 1.000 emails adicionales ($4.990) para mi restaurante en BullWeb'
  );
  return `https://wa.me/${CONTACT_WHATSAPP}?text=${msg}`;
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'automations', label: 'Automatizaciones', icon: Zap },
  { id: 'campaigns',   label: 'Campañas',          icon: Mail },
  { id: 'stats',       label: 'Estadísticas',       icon: BarChart2 },
  { id: 'loyalty',     label: 'Puntos',             icon: Gift },
];

export default function Campaigns() {
  const modules = useAuthStore(s => s.user?.modules) ?? {};
  const [activeTab, setActiveTab]           = useState<Tab>('automations');
  const [campaigns, setCampaigns]           = useState<Campaign[]>([]);
  const [stats, setStats]                   = useState<CampaignsStats | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCreateModal, setShowCreateModal]   = useState(false);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [loadError, setLoadError]           = useState<string | null>(null);
  const [emailUsage, setEmailUsage]         = useState<{ sent: number; limit: number; remaining: number } | null>(null);

  const [filters, setFilters] = useState<CampaignsFilters>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate:   new Date(),
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoadError(null);
    try {
      setLoading(true);
      const [campaignsData, statsData, settingsData] = await Promise.all([
        campaignsService.listCampaigns(filters),
        campaignsService.getStats(),
        fidelizacionService.getSettings().catch(() => null),
      ]);
      // safeArray maneja null/undefined/objeto-wrapeado de forma segura
      const list: Campaign[] = safeArray<Campaign>(
        campaignsData?.campaigns ?? campaignsData
      );
      setCampaigns(list);
      setStats(statsData);
      setEmailUsage((settingsData as any)?.usage ?? null);
      if (selectedCampaign) {
        const updated = list.find((c) => c.id === selectedCampaign.id);
        if (updated) setSelectedCampaign(updated);
      }
    } catch (err: any) {
      setLoadError(err?.message ?? 'Error al cargar campañas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleFilterChange = (newFilters: Partial<CampaignsFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleCampaignCreated = (campaign: Campaign) => {
    if (!campaign?.id) return;
    setCampaigns((prev) => [campaign, ...prev]);
    setSelectedCampaign(campaign);
    setShowCreateModal(false);
  };

  const handleCampaignUpdated = async () => {
    await loadData();
  };

  // Gate: sin acceso → mostrar paywall
  if (modules.fidelizacion === false) {
    return <FidelizacionPaywall />;
  }

  // Hotfix #98 — color del medidor según % de cuota consumida
  const usageColor = (u: { sent: number; limit: number }) =>
    u.sent >= u.limit
      ? 'bg-rose-500/10 text-rose-400 ring-rose-500/20'
      : u.sent >= u.limit * 0.8
      ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
      : 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 p-2.5 rounded-xl">
              <Heart className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Fidelización de Clientes</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Automatizaciones, campañas y puntos de lealtad
              </p>
            </div>
            {/* Hotfix #98 — Medidor de emails mensuales */}
            {emailUsage && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ring-1 ${usageColor(emailUsage)}`}>
                <Mail className="h-3.5 w-3.5" />
                {emailUsage.sent}/{emailUsage.limit} emails este mes
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm text-gray-600"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            {activeTab === 'campaigns' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Nueva Campaña
              </button>
            )}
          </div>
        </div>

        {/* Hotfix #98 — Banner de upsell al alcanzar el límite mensual */}
        {emailUsage && emailUsage.sent >= emailUsage.limit && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-amber-100 p-2 rounded-lg shrink-0">
                <Mail className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Has alcanzado tu límite de {emailUsage.limit} emails este mes.
                </p>
                <p className="text-sm text-amber-700 mt-0.5 font-medium">
                  1.000 emails adicionales a solo $4.990
                </p>
              </div>
            </div>
            <a
              href={buildUpsellWhatsAppURL()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium shrink-0"
            >
              Activar por WhatsApp
            </a>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 mt-5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-orange-50 text-orange-600 border border-orange-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-6">
        {/* Error banner */}
        {loadError && (
          <div className="mb-5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
            <span>{loadError}</span>
            <button onClick={loadData} className="text-xs underline font-medium ml-4">Reintentar</button>
          </div>
        )}
        {/* ── Tab: Automatizaciones ── */}
        {activeTab === 'automations' && <AutomationsTab />}

        {/* ── Tab: Campañas ── */}
        {activeTab === 'campaigns' && (
          <>
            <div className="mb-5">
              <FiltersComponent filters={filters} onChange={handleFilterChange} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CampaignsTable
                  campaigns={campaigns}
                  selectedCampaign={selectedCampaign}
                  onSelectCampaign={setSelectedCampaign}
                  loading={loading}
                  onRefresh={handleRefresh}
                />
              </div>
              <div className="lg:col-span-1">
                <CampaignDetails
                  campaign={selectedCampaign}
                  onUpdate={handleCampaignUpdated}
                />
              </div>
            </div>
          </>
        )}

        {/* ── Tab: Estadísticas ── */}
        {activeTab === 'stats' && (
          <StatsTab campaigns={campaigns} stats={stats} loading={loading} />
        )}

        {/* ── Tab: Puntos de fidelidad ── */}
        {activeTab === 'loyalty' && <LoyaltyTab />}
      </div>

      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCampaignCreated}
          emailUsage={emailUsage}
        />
      )}
    </div>
  );
}

