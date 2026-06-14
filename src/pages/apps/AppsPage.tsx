import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Copy, RefreshCw, ExternalLink } from 'lucide-react';
import api from '@/services/api';
import {
  integrationsService,
  type PlatformId,
  type PlatformOrder,
} from '@/services/integrationsService';
import { ConfigPlatformModal } from './ConfigPlatformModal';

// ─── Metadatos de plataformas ─────────────────────────────────────────────────
interface PlatformMeta {
  id: PlatformId | 'justeat';
  name: string;
  color: string;
  textColor: string;
  logo: string;
  desc: string;
  docsUrl?: string;
  comingSoon?: boolean;
}

const PLATFORMS: PlatformMeta[] = [
  {
    id: 'ubereats',
    name: 'Uber Eats',
    color: 'bg-black',
    textColor: 'text-white',
    logo: '🚗',
    desc: 'Recibe pedidos de Uber Eats directo en tu KDS automáticamente.',
    docsUrl: 'https://developer.uber.com/docs/eats/introduction',
  },
  {
    id: 'rappi',
    name: 'Rappi',
    color: 'bg-orange-500',
    textColor: 'text-white',
    logo: '🛵',
    desc: 'Integra Rappi y gestiona tus pedidos en un solo lugar.',
    docsUrl: 'https://dev.rappi.com',
  },
  {
    id: 'pedidosya',
    name: 'PedidosYa',
    color: 'bg-red-500',
    textColor: 'text-white',
    logo: '🍔',
    desc: 'Conecta PedidosYa y recibe pedidos automáticamente.',
    docsUrl: 'https://developers.pedidosya.com',
  },
];

const PLATFORM_STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-green-100 text-green-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  ERROR: 'bg-red-100 text-red-700',
  DUPLICATE: 'bg-gray-100 text-gray-600',
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return `hace ${Math.floor(hrs / 24)} d`;
}

function formatCLP(n: number): string {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

function PlatformBadge({ platform }: { platform: string }) {
  const meta = PLATFORMS.find((p) => p.id === platform);
  if (!meta) return <span className="text-xs font-medium text-gray-500">{platform}</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.color} ${meta.textColor}`}>
      {meta.logo} {meta.name}
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
type Tab = 'plataformas' | 'pedidos';

export default function AppsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('plataformas');
  const [configuringPlatform, setConfiguringPlatform] = useState<PlatformId | null>(null);
  const [platformFilter, setPlatformFilter] = useState('all');

  // Obtener tenantId del perfil del tenant
  const { data: tenantProfile } = useQuery({
    queryKey: ['tenant-profile-apps'],
    queryFn: () => api.get('/tenant/profile').then((r) => r.data.data as { id: string; name: string }),
    staleTime: Infinity,
  });
  const tenantId = tenantProfile?.id ?? '';

  // Configuraciones de plataformas
  const { data: configs = [] } = useQuery({
    queryKey: ['integrations-configs'],
    queryFn: () => integrationsService.getConfigs(),
    refetchInterval: 60_000,
  });

  // Configuración DTE
  const { data: dteConfig } = useQuery({
    queryKey: ['dte-config'],
    queryFn: () => api.get('/dte/engine/config').then((r) => r.data.data as { configured: boolean; active: boolean } | null),
  });
  const dteActive = dteConfig?.active ?? false;
  const dteConfigured = dteConfig?.configured ?? false;

  // Pedidos externos
  const { data: platformOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['platform-orders', platformFilter],
    queryFn: () => integrationsService.getPlatformOrders({
      platform: platformFilter === 'all' ? undefined : platformFilter,
      limit: 50,
    }),
    enabled: tab === 'pedidos',
    refetchInterval: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ platform, active }: { platform: string; active: boolean }) =>
      integrationsService.togglePlatform(platform, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations-configs'] });
    },
    onError: () => toast.error('Error al cambiar estado'),
  });

  const copyUrl = (platform: string) => {
    if (!tenantId) { toast.error('Esperando ID del tenant...'); return; }
    navigator.clipboard.writeText(integrationsService.buildWebhookUrl(platform, tenantId));
    toast.success('URL copiada');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Apps</h1>
          <p className="text-gray-500 mt-1">Integraciones con plataformas de delivery externas</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['integrations-configs', 'platform-orders'] })}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([['plataformas', 'Plataformas'], ['pedidos', 'Pedidos externos']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB — Plataformas */}
      {tab === 'plataformas' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORMS.map((platform) => {
            const config = configs.find((c) => c.platform === platform.id);
            const isActive = config?.active ?? false;

            return (
              <div
                key={platform.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Header colorido */}
                <div className={`${platform.color} ${platform.textColor} p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{platform.logo}</span>
                      <div>
                        <h3 className="font-bold text-lg">{platform.name}</h3>
                        {isActive && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-xs opacity-80">Conectado</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Toggle on/off */}
                    {!platform.comingSoon && config && (
                      <button
                        onClick={() => toggleMutation.mutate({ platform: platform.id, active: !isActive })}
                        disabled={toggleMutation.isPending}
                        className={`relative w-12 h-6 rounded-full transition-colors ${isActive ? 'bg-green-400' : 'bg-white/30'}`}
                        title={isActive ? 'Desactivar' : 'Activar'}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            isActive ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-sm text-gray-500 flex-1">{platform.desc}</p>

                  {platform.comingSoon ? (
                    <span className="inline-block bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full font-medium">
                      Próximamente
                    </span>
                  ) : (
                    <>
                      {/* Stats si está activo */}
                      {isActive && config && (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <div className="font-bold text-gray-800 text-lg">
                              {config.lastOrderAt ? formatTimeAgo(config.lastOrderAt) : '—'}
                            </div>
                            <div className="text-xs text-gray-500">Último pedido</div>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <div className="font-bold text-gray-800 text-lg">
                              {config.storeId ? '✓' : '—'}
                            </div>
                            <div className="text-xs text-gray-500">Tienda</div>
                          </div>
                        </div>
                      )}

                      {/* URL webhook si activo */}
                      {isActive && tenantId && (
                        <div className="mb-3">
                          <label className="text-xs font-medium text-gray-500 mb-1 block">URL Webhook</label>
                          <div className="flex gap-2">
                            <code className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 truncate">
                              {integrationsService.buildWebhookUrl(platform.id, tenantId)}
                            </code>
                            <button
                              onClick={() => copyUrl(platform.id)}
                              className="px-2 py-1 border border-gray-200 rounded text-xs hover:bg-gray-50"
                              title="Copiar URL"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Botones acción */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setConfiguringPlatform(platform.id as PlatformId)}
                          className="flex-1 border border-gray-200 hover:border-gray-300 rounded-lg py-2 text-sm text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                          ⚙️ {config ? 'Configurar' : 'Conectar'}
                        </button>
                        {platform.docsUrl && (
                          <a
                            href={platform.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                            title="Documentación"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-500" />
                          </a>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB — Pedidos externos */}
      {tab === 'pedidos' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 p-4 border-b items-center">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="all">Todas las plataformas</option>
              <option value="ubereats">Uber Eats</option>
              <option value="rappi">Rappi</option>
              <option value="pedidosya">PedidosYa</option>
            </select>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['platform-orders'] })}
              className="ml-auto p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingOrders ? (
            <div className="p-12 text-center text-gray-400">Cargando pedidos...</div>
          ) : platformOrders.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📦</p>
              <p className="font-medium text-gray-500">No hay pedidos externos</p>
              <p className="text-sm text-gray-400 mt-1">Los pedidos de Uber Eats, Rappi y PedidosYa aparecerán aquí.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Plataforma</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">ID Pedido</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Recibido</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(platformOrders as PlatformOrder[]).map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <PlatformBadge platform={order.platform} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        #{order.platformOrderId}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{order.customerName}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatCLP(order.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PLATFORM_STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {order.status}
                        </span>
                        {order.errorMessage && (
                          <p className="text-xs text-red-500 mt-0.5">{order.errorMessage}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatTimeAgo(order.receivedAt)}</td>
                      <td className="px-4 py-3">
                        {order.orderId && (
                          <a
                            href={`/orders`}
                            className="text-orange-500 hover:text-orange-700 text-xs font-medium"
                          >
                            Ver orden →
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DTE / LibreDTE */}
      <div className="mt-8 mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Otras integraciones</h2>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-sm">
              B
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-800">DTE / LibreDTE</h3>
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">Facturación DTE</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Boletas y facturas electrónicas · SII Chile</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {dteActive ? (
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-700 font-medium">Activo</span>
              </div>
            ) : dteConfigured ? (
              <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-xs text-yellow-700 font-medium">Inactivo</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-xs text-gray-500 font-medium">No configurado</span>
              </div>
            )}

            <a
              href={dteActive ? '/dte/documentos' : '/apps/dte'}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              {dteActive ? '📄 Ver documentos' : '🔑 Configurar'}
            </a>
          </div>
        </div>

        {!dteActive && (
          <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3">
            <div className="flex flex-wrap gap-6 text-xs text-gray-500">
              {['✅ Boletas tipo 39', '✅ Facturas tipo 33', '✅ Notas de crédito', '✅ Sincronización SII'].map((f) => (
                <span key={f}>{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal configuración */}
      {configuringPlatform && (
        <ConfigPlatformModal
          platform={configuringPlatform}
          existingConfig={configs.find((c) => c.platform === configuringPlatform)}
          tenantId={tenantId}
          onClose={() => setConfiguringPlatform(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['integrations-configs'] })}
        />
      )}
    </div>
  );
}
