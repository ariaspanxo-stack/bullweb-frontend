import { useState, useEffect, useRef } from 'react';
import { Users, Plus, Search, Eye, Edit2, Trash2, Download, DollarSign, ShoppingBag, Award } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import type { Customer } from '../Restaurant/types';
import { getTagConfig, formatPhone } from '../../utils/customers';
import customersService from '../../services/customersService';
import AddCustomerModal from './components/AddCustomerModal';
import EditCustomerModal from './components/EditCustomerModal';
import CustomerDetailModal from './components/CustomerDetailModal';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import ClientesPaywall from './ClientesPaywall';
import { useAuthStore } from '@/store/authStore';

export default function Customers() {
  const modules = useAuthStore(s => s.user?.modules) ?? {};
  const [customers, setCustomers] = useState<Customer[]>([]);
  const canCreate  = usePermission('customers.create');
  const canEdit    = usePermission('customers.edit');
  const canDelete  = usePermission('customers.delete');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const page = await customersService.getAll();
      setCustomers(page.customers);
    } catch (err: any) {
      setError(err.message || 'Error al cargar clientes');
    } finally {
      setLoading(false);
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

  const filteredCustomers = customers;

  // Stats (BUG 2: guards para tags/totalSpent)
  const totalCustomers = customers.length;
  const vipCustomers = customers.filter(c => (c.tags ?? []).includes('vip')).length;
  const frequentCustomers = customers.filter(c => (c.tags ?? []).includes('frequent')).length;
  const totalSpent = customers.reduce((sum, c) => sum + (c.totalSpent ?? 0), 0);

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
      'Total Pedidos': c.totalOrders,
      'Total Gastado': c.totalSpent
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

  // Módulo no activado: mostrar paywall
  if (!modules.clientes) return <ClientesPaywall />;

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
        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            disabled={exporting}
            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exportando...' : 'Exportar'}
          </button>
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-zinc-500">Total Clientes</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalCustomers}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-zinc-500">Clientes VIP</span>
          </div>
          <div className="text-3xl font-bold text-white">{vipCustomers}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="w-4 h-4 text-green-400" />
            <span className="text-sm text-zinc-500">Frecuentes</span>
          </div>
          <div className="text-3xl font-bold text-white">{frequentCustomers}</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-zinc-500">Total Gastado</span>
          </div>
          <div className="text-3xl font-bold text-white">${(totalSpent / 1000).toFixed(0)}k</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
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
                  Tags
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Pedidos
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Total Gastado
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Ticket Prom.
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                    <p className="text-zinc-400 mt-3">Cargando clientes...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-red-400">
                    Error: {error}
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>{searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
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
                      <div className="text-sm text-zinc-300">{formatPhone(customer.phone)}</div>
                      {customer.email && (
                        <div className="text-xs text-zinc-500">{customer.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(customer.tags ?? []).map(tag => {
                          const config = getTagConfig(tag);
                          return (
                            <span key={tag} className={`px-2 py-0.5 rounded text-xs font-bold border ${config.color}`}>
                              {config.label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-white">{customer.totalOrders}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-green-400">
                        ${customer.totalSpent.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-zinc-300">
                        ${(customer.averageTicket ?? 0).toLocaleString()}
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
                ))
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
