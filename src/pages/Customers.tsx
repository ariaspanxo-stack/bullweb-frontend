import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import customersService from '@/services/customersService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import CustomersTable from '@/components/customers/CustomersTable';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import CustomerDetailModal from '@/components/customers/CustomerDetailModal';
import CustomersStats from '@/components/customers/CustomersStats';
import TopCustomers from '@/components/customers/TopCustomers';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { Plus, Search, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import ClientesPaywall from '@/pages/Customers/ClientesPaywall';
import api from '@/services/api';
import { usePermission } from '@/hooks/usePermission';

export default function Customers() {
  const queryClient = useQueryClient();
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  const canManage = usePermission('customers.manage');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Resetear a página 1 cuando cambia la búsqueda
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [moduleAccess, setModuleAccess] = useState<boolean | null>(null);

  const checkModuleAccess = useCallback(() => {
    api.get('/subscriptions/modules/clientes/status')
      .then((r) => {
        const data = r.data?.data ?? r.data;
        setModuleAccess(data?.active === true);
      })
      .catch(() => setModuleAccess(false));
  }, []);

  useEffect(() => { checkModuleAccess(); }, [checkModuleAccess]);

  // Cargar clientes
  const { data, isLoading } = useQuery({
    queryKey: ['customers', debouncedSearch, page],
    queryFn: () => customersService.getCustomers({
      search: debouncedSearch || undefined,
      page,
      perPage: 20
    })
  });

  // Analytics globales para estadísticas correctas del tenant
  const { data: analytics } = useQuery({
    queryKey: ['customers-analytics'],
    queryFn: () => customersService.getAnalytics(),
    staleTime: 5 * 60 * 1000,
  });

  const customers = data?.customers || [];
  const meta = data?.meta;

  // Calcular estadísticas desde analytics (métricas reales del tenant completo)
  const stats = useMemo(() => ({
    totalCustomers: analytics?.summary?.totalCustomers ?? meta?.total ?? 0,
    newThisMonth:   analytics?.summary?.newThisMonth ?? 0,
    totalPoints:    0,
    averageSpent:   analytics?.summary?.avgCustomerLifetimeValue ?? 0,
  }), [analytics, meta]);

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (customerId: string) => customersService.deleteCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente eliminado');
    }
  });

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setIsFormModalOpen(true);
  };

  const handleDelete = async (customer: any) => {
    const ok = await confirmDialog({ message: `¿Eliminar cliente "${customer.name}"?`, confirmLabel: 'Eliminar' });
    if (ok) deleteMutation.mutate(customer.id);
  };

  const handleViewDetails = (customer: any) => {
    setSelectedCustomerId(customer.id);
    setIsDetailModalOpen(true);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await customersService.exportToCsv();
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `clientes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Clientes exportados');
    } catch (err: any) {
      toast.error('Error al exportar: ' + (err.message ?? err));
    } finally {
      setExporting(false);
    }
  };

  // Módulo no activado: mostrar paywall
  if (moduleAccess === null) return null; // cargando
  if (!moduleAccess) return <ClientesPaywall />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 mt-1">Gestión de base de datos de clientes</p>
        </div>
        <div className="flex gap-3">
          {canManage && (
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exportando...' : 'Exportar'}
            </Button>
          )}
          {canManage && (
            <Button onClick={() => {
              setEditingCustomer(null);
              setIsFormModalOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Cliente
            </Button>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <CustomersStats {...stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla principal */}
        <div className="lg:col-span-2 space-y-4">
          {/* Búsqueda */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar clientes por nombre, teléfono o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Tabla */}
          <CustomersTable
            customers={customers}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={isLoading}
          />

          {/* Paginación */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Página {page} de {meta.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <TopCustomers />
        </div>
      </div>

      {/* Modales */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
      />

      <CustomerDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCustomerId(null);
        }}
        customerId={selectedCustomerId}
      />
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
