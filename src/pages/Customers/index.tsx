import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users, Plus, Search, Eye, Edit2, Trash2, Download, DollarSign,
  ShoppingBag, Award, MessageCircle, RefreshCw, Archive, Info,
} from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import type { Customer } from '../Restaurant/types';
import {
  getTagConfig, formatPhone, getSegmentConfig, buildWhatsAppUrl, formatDate,
} from '../../utils/customers';
import customersService from '../../services/customersService';
import AddCustomerModal from './components/AddCustomerModal';
import EditCustomerModal from './components/EditCustomerModal';
import CustomerDetailModal from './components/CustomerDetailModal';
// import TierSettings from './components/TierSettings'; // Niveles desactivado
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

type TabKey = 'all' | 'vip' | 'frequent' | 'new' | 'atRisk';

export default function Customers() {
  const modules = useAuthStore(s => s.user?.modules) ?? {};
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const canCreate = usePermission('customers.create');
  const canEdit = usePermission('customers.edit');
  const canDelete = usePermission('customers.delete');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // const [showTierSettings, setShowTierSettings] = useState(false); // Niveles desactivado
  const [exporting, setExporting] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  // const [tierFilter, setTierFilter] = useState<string>('all'); // Niveles desactivado
  // const [riskFilter, setRiskFilter] = useState<boolean>(false); // Niveles desactivado
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();
    loadTiers();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const page = await customersService.getAll({ perPage: 9999 });
      setCustomers(page.customers);
    } catch (err: any) {
      setError(err.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const loadTiers = async () => {
    try {
      const t = await customersService.getTiers();
      const sorted = [...(t ?? [])].sort((a: any, b: any) =>
        Number(a.minSpent ?? 0) - Number(b.minSpent ?? 0)
      );
      setTiers(sorted);
    } catch {
      /* loyalty_tiers puede no existir aún */
    }
  };

  // BUG 6: debounce de 300 ms antes de disparar la búsqueda
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      if (!query.trim()) { loadData(); return; }
      try {
        setLoading(true);
        const data = await customersService.search(query);
        setCustomers(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  // ── Filtrado por pestaña (tab) ──
  const tabFiltered = useMemo(() => {
    switch (activeTab) {
      case 'vip':
        return customers.filter(c =>
          (c.tags ?? []).includes('vip') || c.segment === 'VIP'
        );
      case 'frequent':
        return customers.filter(c =>
          (c.tags ?? []).includes('frequent') || c.segment === 'FREQUENT'
        );
      case 'new':
        return customers.filter(c =>
          (c.tags ?? []).includes('new') || c.segment === 'NEW'
        );
      case 'atRisk':
        return customers.filter(c =>
          c.tierAtRisk === true || c.segment === 'AT_RISK'
        );
      default:
        return customers;
    }
  }, [customers, activeTab]);

  // ── Filtrado por nivel y riesgo (Niveles desactivado) ──
  const filteredCustomers = useMemo(() => {
    return tabFiltered;
  }, [tabFiltered]);

  // Stats globales (siempre sobre el total de clientes cargados)
  const totalCustomers = customers.length;
  const vipCustomers = customers.filter(c =>
    (c.tags ?? []).includes('vip') || c.segment === 'VIP'
  ).length;
  const frequentCustomers = customers.filter(c =>
    (c.tags ?? []).includes('frequent') || c.segment === 'FREQUENT'
  ).length;
  const totalSpent = customers.reduce((sum, c) => sum + (c.totalSpent ?? 0), 0);

  // Stats de la vista activa (pestaña + filtros)
  const visibleCount = filteredCustomers.length;
  const tabLabel: Record<TabKey, string> = {
    all: 'Total Clientes',
    vip: 'Clientes VIP',
    frequent: 'Frecuentes',
    new: 'Nuevos',
    atRisk: 'En Riesgo',
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    try {
      await customersService.delete(selectedCustomer.id.toString());
      loadData();
      setShowDeleteConfirm(false);
      setSelectedCustomer(null);
    } catch (err: any) {
      toast.error('Error al eliminar cliente: ' + err.message);
    }
  };

  // BUG 16: exportar TODOS los clientes (no solo la página actual)
  const exportToExcel = async () => {
    try {
      setExporting(true);
      const page = await customersService.getAll({ perPage: 9999 });
      const allCustomers = page.customers;
      const data = allCustomers.map(c => ({
        'ID': c.id,
        'Nombre': c.name,
        'Teléfono': c.phone,
        'Email': c.email || '',
        'Dirección': c.address ? `${c.address} ${c.addressNumber || ''}` : '',
        'Sector': c.sector || '',
        'Tags': (c.tags ?? []).join(', '),
        'Segmento': c.segment ?? '',
        'Total Pedidos': c.totalOrders,
        'Total Gastado': c.totalSpent,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      XLSX.writeFile(wb, `clientes-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err: any) {
      toast.error('Error al exportar: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Contar clientes sin actividad (totalOrders === 0) para archivado masivo
  const customersWithoutActivity = useMemo(
    () => customers.filter((c: any) => Number(c.totalOrders ?? 0) === 0),
    [customers],
  );

  // Archivar (soft-delete) todos los clientes sin actividad (totalOrders === 0)
  const handleArchiveInactive = async () => {
    if (customersWithoutActivity.length === 0) {
      toast.success('No hay clientes sin actividad para archivar.');
      setShowArchiveConfirm(false);
      return;
    }
    try {
      setArchiving(true);
      let archived = 0;
      let failed = 0;
      await Promise.all(
        customersWithoutActivity.map(async (c: any) => {
          try {
            await customersService.update(c.id.toString(), { deletedAt: new Date().toISOString() } as any);
            archived += 1;
          } catch {
            try {
              await customersService.delete(c.id.toString());
              archived += 1;
            } catch {
              failed += 1;
            }
          }
        }),
      );
      toast.success(`Archivados: ${archived} clientes sin actividad.${failed ? ` Fallidos: ${failed}` : ''}`);
      setShowArchiveConfirm(false);
      await loadData();
    } catch (err: any) {
      toast.error('Error al archivar clientes: ' + err.message);
    } finally {
      setArchiving(false);
    }
  };

  // Recalcular segmentos de TODOS los clientes (POST /api/customers/recalculate-segments)
  const handleRecalculateSegments = async () => {
    try {
      setRecalculating(true);
      const result: any = await customersService.recalculateSegments();
      toast.success(
        `Segmentos recalculados: ${result?.updated ?? 0} de ${result?.total ?? 0} clientes.`
      );
      await loadData();
    } catch (err: any) {
      toast.error('Error al recalcular segmentos: ' + err.message);
    } finally {
      setRecalculating(false);
    }
  };

  // ── Progreso al siguiente nivel (DESACTIVADO) ──
  // const getTierProgress = (customer: Customer) => { ... };

  // tierNames (DESACTIVADO)
  // const tierNames = useMemo(() => { ... }, [tiers]);

  // ── Paywall eliminado: acceso libre para todos los tenants ──
  // (Módulo Clientes/CRM liberado)

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="w-10 h-10 text-blue-400" />
            Clientes Recurrentes
          </h1>
          <p className="text-zinc-400">Gestión completa de clientes y estadísticas</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleRecalculateSegments}
            disabled={recalculating}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalculando...' : 'Recalcular Segmentos'}
          </button>
          <button
            onClick={exportToExcel}
            disabled={exporting}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exportando...' : 'Exportar'}
          </button>
          {canDelete && customersWithoutActivity.length > 0 && (
            <button
              onClick={() => setShowArchiveConfirm(true)}
              disabled={archiving}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              title="Archivar clientes con 0 pedidos"
            >
              <Archive className={`w-4 h-4 ${archiving ? 'animate-pulse' : ''}`} />
              {archiving ? 'Archivando...' : `Archivar sin actividad (${customersWithoutActivity.length})`}
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuevo Cliente
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Tarjeta de la vista activa (cambia según la pestaña) */}
        <div className="bg-zinc-900 border-2 border-blue-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-zinc-500">{tabLabel[activeTab]} (vista actual)</span>
          </div>
          <div className="text-3xl font-bold text-white">{visibleCount}</div>
        </div>

        {/* Total global */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-500">Total Clientes (global)</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalCustomers}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-zinc-500">Clientes VIP</span>
            <span
              title="VIP: Top 5% por gasto (mínimo $10.000 acumulado)"
              className="inline-flex items-center justify-center cursor-help"
            >
              <Info className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
            </span>
          </div>
          <div className="text-3xl font-bold text-white">{vipCustomers}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-zinc-500">Total Gastado</span>
          </div>
          <div className="text-3xl font-bold text-white">${(totalSpent / 1000).toFixed(0)}k</div>
        </div>
      </div>

      {/* Tabs de vista rápida */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { key: 'all', label: 'Todos', title: 'Todos los clientes (incluye inactivos)' },
          { key: 'vip', label: 'VIP', title: 'VIP: Top 5% por gasto (mínimo $10.000 acumulado)' },
          { key: 'frequent', label: 'Frecuentes', title: 'FREQUENT: 3+ compras en los últimos 90 días' },
          { key: 'new', label: 'Nuevos', title: 'NEW: cliente creado en los últimos 30 días' },
          { key: 'atRisk', label: 'En Riesgo', title: 'AT_RISK: sin compras en 60+ días pese a tener historial' },
        ] as { key: TabKey; label: string; title: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            title={t.title}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-blue-500 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + Filtros */}
      <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg pl-11 pr-4 py-3
                     placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                     transition-all outline-none"
          />
        </div>

        {/* Filtro por Nivel y Riesgo DESACTIVADO */}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-800 border-b border-zinc-700">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Contacto
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Segmento / Tags
                </th>
                {/* Columna Nivel DESACTIVADA */}
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Puntos
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Última Visita
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Pedidos
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Ticket Promedio
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Total Gastado
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                    <p className="text-zinc-400 mt-3">Cargando clientes...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-red-400">
                    Error: {error}
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-20 h-20 rounded-full bg-zinc-800/60 flex items-center justify-center mb-4">
                        <Users className="w-10 h-10 text-zinc-500" />
                      </div>
                      <p className="text-lg font-semibold text-zinc-300 mb-1">
                        {searchQuery ? 'No se encontraron clientes' : 'Aún no hay registros'}
                      </p>
                      <p className="text-sm text-zinc-500 mb-6">
                        {searchQuery
                          ? 'Intenta con otro nombre, teléfono o email.'
                          : 'Crea tu primer cliente y comienza a construir tu base de fidelización.'}
                      </p>
                      {!searchQuery && canCreate && (
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          Crear Primer Cliente
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => {
                  const waUrl = buildWhatsAppUrl(customer.phone, customer.name);
                  const segCfg = getSegmentConfig(customer.segment);
                  return (
                    <tr key={customer.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-white">{customer.name}</div>
                          {customer.sector && (
                            <div className="text-xs text-zinc-500">{customer.sector}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-sm text-zinc-300">
                              {customer.phone ? formatPhone(customer.phone) : '-'}
                            </div>
                            {customer.email && (
                              <div className="text-xs text-zinc-500">{customer.email}</div>
                            )}
                          </div>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                              title={`WhatsApp a ${customer.name}`}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {/* Segmento del backend (color prioritario) */}
                          {segCfg && (
                            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${segCfg.color}`}>
                              {segCfg.label}
                            </span>
                          )}
                          {/* Tags computados en frontend */}
                          {(customer.tags ?? [])
                            .filter(tag => !segCfg || tag.toLowerCase() !== segCfg.label.toLowerCase())
                            .map(tag => {
                              const config = getTagConfig(tag);
                              return (
                                <span key={tag} className={`px-2 py-0.5 rounded text-xs font-bold border ${config.color}`}>
                                  {config.label}
                                </span>
                              );
                            })}
                          {/* Tag "Sin compras" si totalOrders === 0 */}
                          {Number(customer.totalOrders ?? 0) === 0 && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold border bg-zinc-700/40 text-zinc-400 border-zinc-600/40">
                              Sin compras
                            </span>
                          )}
                          {/* Badge de riesgo si tierAtRisk */}
                          {customer.tierAtRisk && (
                            <span className="px-2 py-0.5 rounded text-xs font-bold border bg-red-500/10 text-red-400 border-red-500/30">
                              ⚠ Baja
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Columna Nivel DESACTIVADA */}
                      <td className="px-6 py-4">
                        <span className="font-medium text-amber-500">
                          {(customer.points ?? customer.loyaltyPoints ?? 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-zinc-300">
                          {formatDate(customer.lastVisit ?? customer.lastOrderAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-white">{customer.totalOrders}</div>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const ticket =
                            Number(customer.totalOrders) > 0
                              ? Math.round(Number(customer.totalSpent) / Number(customer.totalOrders))
                              : 0;
                          return (
                            <div className="text-sm font-semibold text-sky-400">
                              ${ticket.toLocaleString('es-CL')}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-green-400">
                          ${customer.totalSpent.toLocaleString('es-CL')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowDetailModal(true);
                            }}
                            className="p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowEditModal(true);
                              }}
                              className="p-2 hover:bg-yellow-500/10 text-yellow-400 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modales */}
      <AddCustomerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          loadData();
          setShowAddModal(false);
        }}
      />

      {selectedCustomer && (
        <>
          <EditCustomerModal
            isOpen={showEditModal}
            customer={selectedCustomer}
            onClose={() => {
              setShowEditModal(false);
              setSelectedCustomer(null);
            }}
            onSuccess={() => {
              loadData();
              setShowEditModal(false);
              setSelectedCustomer(null);
            }}
          />

          <CustomerDetailModal
            isOpen={showDetailModal}
            customer={selectedCustomer}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedCustomer(null);
            }}
          />
        </>
      )}

      {/* Configuración de Niveles DESACTIVADO */}
      {/* <TierSettings ... /> */}

      {/* Archive Confirmation (masivo) */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Archive className="w-5 h-5 text-amber-400" />
              ¿Archivar {customersWithoutActivity.length} cliente(s)?
            </h3>
            <p className="text-zinc-400 mb-6">
              Se archivarán (soft-delete) todos los clientes con <span className="font-semibold text-white">0 pedidos</span>.
              Podrás restaurarlos desde la base de datos si es necesario.
            </p>
            <div className="mb-4 max-h-32 overflow-y-auto bg-zinc-950 rounded-lg p-2 border border-zinc-800">
              {customersWithoutActivity.slice(0, 20).map(c => (
                <div key={c.id} className="text-xs text-zinc-400 py-0.5">• {c.name} {c.phone ? `(${c.phone})` : ''}</div>
              ))}
              {customersWithoutActivity.length > 20 && (
                <div className="text-xs text-zinc-500 pt-1">...y {customersWithoutActivity.length - 20} más</div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowArchiveConfirm(false)}
                disabled={archiving}
                className="flex-1 py-2.5 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleArchiveInactive}
                disabled={archiving}
                className="flex-1 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {archiving ? 'Archivando...' : 'Archivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-2">¿Eliminar Cliente?</h3>
            <p className="text-zinc-400 mb-6">
              ¿Estás seguro de eliminar a <span className="font-semibold text-white">{selectedCustomer.name}</span>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedCustomer(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}