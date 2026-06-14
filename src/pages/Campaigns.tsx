import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Heart, Zap, BarChart2, Mail, Gift } from 'lucide-react';
import { FidelizacionPaywall } from './Campaigns/FidelizacionPaywall';
import campaignsService from '@/services/campaignsService';
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
      const [campaignsData, statsData] = await Promise.all([
        campaignsService.listCampaigns(filters),
        campaignsService.getStats(),
      ]);
      // safeArray maneja null/undefined/objeto-wrapeado de forma segura
      const list: Campaign[] = safeArray<Campaign>(
        campaignsData?.campaigns ?? campaignsData
      );
      setCampaigns(list);
      setStats(statsData);
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
  if (!modules.fidelizacion) {
    return <FidelizacionPaywall />;
  }

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
        />
      )}
    </div>
  );
}

