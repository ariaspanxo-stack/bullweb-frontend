import React, { useState } from 'react';
import { 
  User, 
  Plus, 
  Pencil, 
  Trash2,
  Phone,
  Mail,
  MapPin,
  ChartBar,
  Eye
} from 'lucide-react';
import type { Customer } from '../../types/customer.types';
import CustomerFormSimple from './CustomerFormSimple';
import CustomerDetailModal from './CustomerDetailModal';
import { formatCurrency } from '@/lib/utils';

interface CustomersTabProps {
  customers: Customer[];
  onCreateCustomer: (data: any) => Promise<void>;
  onUpdateCustomer: (id: string, data: any) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
}

const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [detailModalCustomerId, setDetailModalCustomerId] = useState<string | null>(null);

  // Filtrar clientes
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery) ||
    customer.rut?.includes(searchQuery)
  );

  // Estadísticas rápidas
  const totalCustomers = customers.length;
  const customersWithOrders = customers.filter(c => c.totalOrders > 0).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgSpent = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  // Top 5 clientes VIP
  const topCustomers = [...customers]
    .filter(c => c.totalOrders > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  const handleViewDetails = (customerId: string) => {
    setDetailModalCustomerId(customerId);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    await onDeleteCustomer(id);
    setDeleteConfirm(null);
  };

  const handleSave = async (data: any) => {
    if (editingCustomer) {
      await onUpdateCustomer(editingCustomer.id, data);
    } else {
      await onCreateCustomer(data);
    }
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="h-full flex gap-6">
      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Clientes</p>
              <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
            </div>
            <User className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Con Compras</p>
              <p className="text-2xl font-bold text-gray-900">{customersWithOrders}</p>
            </div>
            <ChartBar className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <span className="text-3xl">💰</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Gasto Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(Math.round(avgSpent))}
              </p>
            </div>
            <span className="text-3xl">📊</span>
          </div>
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por nombre, email, teléfono o RUT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setEditingCustomer(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      {/* Lista de clientes */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <User className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear primer cliente
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    RUT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Compras
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Total Gastado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Última Visita
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{customer.name}</p>
                          {customer.notes && (
                            <p className="text-xs text-gray-500 line-clamp-1">{customer.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" />
                            {customer.email}
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {customer.rut || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {customer.address ? (
                        <div className="flex items-start gap-1 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p>{customer.address}</p>
                            {customer.city && (
                              <p className="text-xs text-gray-500">{customer.city}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {customer.totalOrders} {customer.totalOrders === 1 ? 'compra' : 'compras'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(customer.totalSpent)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {customer.lastVisit ? formatDate(customer.lastVisit) : 'Nunca'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(customer.id)}
                          className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                          title="Ver Detalles"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ id: customer.id, name: customer.name })}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                          disabled={customer.totalOrders > 0}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Panel VIP - Sidebar derecho */}
      <div className="w-96 bg-white border border-gray-200 rounded-lg flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            Clientes VIP
          </h3>
          <p className="text-sm text-gray-500">Top clientes por gasto total</p>
        </div>
        
        <div className="p-4">
          {topCustomers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-2">No hay datos disponibles</p>
              <p className="text-xs text-gray-400">Registra ventas para ver el ranking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => {
                const badge = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '⭐';
                const bgColor = index === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300' : 'bg-white border-gray-200';
                
                return (
                  <button
                    key={customer.id}
                    onClick={() => handleViewDetails(customer.id)}
                    className={`w-full p-3 border-2 rounded-lg hover:shadow-md transition-all text-left ${bgColor}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <span className="text-3xl">{badge}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {customer.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{customer.totalOrders} órdenes</span>
                          <span>•</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(customer.totalSpent)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-2xl font-bold text-gray-300">
                        #{index + 1}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}

      {/* Modal formulario */}
      <CustomerFormSimple
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
        }}
        onSave={handleSave}
        customer={editingCustomer}
      />

      {/* Modal detalles del cliente */}
      <CustomerDetailModal
        isOpen={!!detailModalCustomerId}
        onClose={() => setDetailModalCustomerId(null)}
        customerId={detailModalCustomerId || ''}
      />

      {/* Modal confirmación eliminar */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar eliminación</h3>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro que deseas eliminar al cliente <strong>{deleteConfirm.name}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersTab;
