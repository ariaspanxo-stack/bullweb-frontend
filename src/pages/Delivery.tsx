import { useState } from 'react';
import { formatSaleNumber } from '@/utils/formatSaleNumber';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import {
  deliveryService,
  type DeliveryOrder,
  type DeliveryDriver,
  type DeliveryStatus,
} from '@/services/deliveryService';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import {
  Bike,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  User,
  X,
} from 'lucide-react';

// ─── Configuración de estados ────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  PENDING: { label: 'Pendiente', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: Clock },
  ASSIGNED: { label: 'Asignado', color: 'text-blue-700', bg: 'bg-blue-100', icon: Bike },
  PICKED_UP: { label: 'En camino', color: 'text-purple-700', bg: 'bg-purple-100', icon: PackageOpen },
  DELIVERED: { label: 'Entregado', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
};

// ─── Modal de Asignación de Repartidor ───────────────────────────────────────
interface AssignModalProps {
  delivery: DeliveryOrder;
  onClose: () => void;
  onAssign: (driverId: string, estimatedTime?: number) => void;
  loading: boolean;
}

function AssignDriverModal({ delivery, onClose, onAssign, loading }: AssignModalProps) {
  const [driverId, setDriverId] = useState(delivery.driverId ?? '');
  const [estimatedTime, setEstimatedTime] = useState<string>(
    delivery.estimatedTime ? String(delivery.estimatedTime) : ''
  );

  const { data: drivers = [] } = useQuery({
    queryKey: ['delivery-drivers'],
    queryFn: () => deliveryService.getDrivers(),
    staleTime: 60_000,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Asignar Repartidor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-gray-700">Pedido {formatSaleNumber(delivery.orders?.orderNumber)}</p>
            <p className="text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {delivery.deliveryAddress}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Repartidor <span className="text-red-500">*</span>
            </label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="">Seleccionar repartidor...</option>
              {drivers.map((d: DeliveryDriver) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.phone ? ` — ${d.phone}` : ''}
                </option>
              ))}
            </select>
            {drivers.length === 0 && (
              <p className="text-xs text-orange-500 mt-1">
                No hay repartidores disponibles. Crea un usuario con rol &ldquo;Driver&rdquo;.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiempo estimado (minutos)
            </label>
            <input
              type="number"
              min={1}
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="ej. 30"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              onAssign(driverId, estimatedTime ? parseInt(estimatedTime) : undefined)
            }
            disabled={loading || !driverId.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Asignando...' : 'Asignar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Delivery() {
  const queryClient = useQueryClient();
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  const canManage = usePermission('delivery.manage');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | ''>('');
  const [assigningDelivery, setAssigningDelivery] = useState<DeliveryOrder | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ['delivery-stats'],
    queryFn: () => deliveryService.getStats(),
    refetchInterval: 30000,
  });

  const { data: deliveryData, isLoading } = useQuery({
    queryKey: ['delivery-orders', statusFilter],
    queryFn: () =>
      deliveryService.listDeliveryOrders({
        status: statusFilter || undefined,
        limit: 50,
      }),
    refetchInterval: 30000,
  });

  const deliveries: DeliveryOrder[] = (deliveryData?.data as DeliveryOrder[]) ?? [];

  // ── Mutations ────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
  };

  const assignMutation = useMutation({
    mutationFn: ({ id, driverId, estimatedTime }: { id: string; driverId: string; estimatedTime?: number }) =>
      deliveryService.assignDriver(id, driverId, estimatedTime),
    onSuccess: () => { invalidate(); toast.success('Repartidor asignado'); setAssigningDelivery(null); },
    onError: () => toast.error('Error al asignar repartidor'),
  });

  const pickupMutation = useMutation({
    mutationFn: (id: string) => deliveryService.markPickedUp(id),
    onSuccess: () => { invalidate(); toast.success('Pedido marcado como recogido'); },
    onError: () => toast.error('Error al actualizar estado'),
  });

  const deliveredMutation = useMutation({
    mutationFn: (id: string) => deliveryService.markDelivered(id),
    onSuccess: () => { invalidate(); toast.success('¡Pedido entregado!'); },
    onError: () => toast.error('Error al marcar como entregado'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => deliveryService.cancelDelivery(id),
    onSuccess: () => { invalidate(); toast.success('Delivery cancelado'); },
    onError: () => toast.error('Error al cancelar'),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  const handleCancel = async (d: DeliveryOrder) => {
    const ok = await confirmDialog({
      message: `¿Cancelar el delivery del pedido ${formatSaleNumber(d.orders?.orderNumber)}?`,
      confirmLabel: 'Cancelar delivery',
      variant: 'warning',
    });
    if (ok) cancelMutation.mutate(d.id);
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Delivery</h1>
        <p className="text-gray-500 mt-1">Gestión de pedidos a domicilio</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { key: 'total', label: 'Total', value: stats.total, color: 'bg-gray-100 text-gray-800' },
            { key: 'pending', label: 'Pendientes', value: stats.pending, color: 'bg-yellow-100 text-yellow-800' },
            { key: 'assigned', label: 'Asignados', value: stats.assigned, color: 'bg-blue-100 text-blue-800' },
            { key: 'pickedUp', label: 'En camino', value: stats.pickedUp, color: 'bg-purple-100 text-purple-800' },
            { key: 'delivered', label: 'Entregados', value: stats.delivered, color: 'bg-green-100 text-green-800' },
            { key: 'cancelled', label: 'Cancelados', value: stats.cancelled, color: 'bg-red-100 text-red-800' },
          ].map((s) => (
            <div key={s.key} className="bg-white rounded-xl border p-4 text-center">
              <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.color} mb-2`}>
                {s.label}
              </div>
              <div className="text-3xl font-bold text-gray-900">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros por estado */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            statusFilter === '' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
        {(Object.keys(STATUS_CONFIG) as DeliveryStatus[]).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? `${cfg.bg} ${cfg.color} ring-2 ring-current ring-offset-1`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cfg.label}
            </button>
          );
        })}

        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
            queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
          }}
          className="ml-auto p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando pedidos...</div>
        ) : deliveries.length === 0 ? (
          <div className="p-12 text-center">
            <Bike className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay pedidos de delivery</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Pedido</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Cliente</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Dirección</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Repartidor</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Estado</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">ETA</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Hora</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {deliveries.map((d) => {
                  const cfg = STATUS_CONFIG[d.status as DeliveryStatus] ?? STATUS_CONFIG.PENDING;
                  const Icon = cfg.icon;
                  return (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{formatSaleNumber(d.orders?.orderNumber)}</div>
                        <div className="text-xs text-gray-400">
                          {d.orders?.total ? `$${d.orders.total.toLocaleString('es')}` : ''}
                          {d.orders?.deliveryFee ? ` +$${d.orders.deliveryFee.toLocaleString('es')} envío` : ''}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-800">{d.customers?.name ?? '—'}</span>
                        </div>
                        {d.deliveryPhone && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-500">{d.deliveryPhone}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-600 line-clamp-2">{d.deliveryAddress}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {d.users ? (
                          <div className="flex items-center gap-1.5">
                            <Bike className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-sm text-gray-700">{d.users.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Sin asignar</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          {cfg.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-600">
                        {d.estimatedTime ? `${d.estimatedTime} min` : '—'}
                      </td>

                      <td className="px-4 py-3 text-xs text-gray-500">
                        <div className="text-gray-400">{getContextualLabel(d.status as DeliveryStatus)}</div>
                        <div className="font-medium text-gray-700">{formatTime(getContextualTime(d))}</div>
                        <div>{formatDate(getContextualTime(d) ?? d.createdAt)}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {/* Acciones de gestión — solo para usuarios con delivery.manage */}
                          {canManage && ['PENDING', 'ASSIGNED'].includes(d.status) && (
                            <button
                              onClick={() => setAssigningDelivery(d)}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Asignar repartidor"
                            >
                              <Bike className="w-3.5 h-3.5 inline mr-1" />
                              Asignar
                            </button>
                          )}

                          {/* Marcar recogido */}
                          {canManage && d.status === 'ASSIGNED' && (
                            <button
                              onClick={() => pickupMutation.mutate(d.id)}
                              disabled={pickupMutation.isPending}
                              className="px-2 py-1 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors"
                              title="Marcar como recogido"
                            >
                              <PackageOpen className="w-3.5 h-3.5 inline mr-1" />
                              Recogido
                            </button>
                          )}

                          {/* Marcar entregado */}
                          {canManage && d.status === 'PICKED_UP' && (
                            <button
                              onClick={() => deliveredMutation.mutate(d.id)}
                              disabled={deliveredMutation.isPending}
                              className="px-2 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                              title="Marcar como entregado"
                            >
                              <PackageCheck className="w-3.5 h-3.5 inline mr-1" />
                              Entregado
                            </button>
                          )}

                          {/* Cancelar */}
                          {canManage && !['DELIVERED', 'CANCELLED'].includes(d.status) && (
                            <button
                              onClick={() => handleCancel(d)}
                              disabled={cancelMutation.isPending}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancelar"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal asignar repartidor */}
      {assigningDelivery && (
        <AssignDriverModal
          delivery={assigningDelivery}
          onClose={() => setAssigningDelivery(null)}
          onAssign={(driverId, estimatedTime) =>
            assignMutation.mutate({ id: assigningDelivery.id, driverId, estimatedTime })
          }
          loading={assignMutation.isPending}
        />
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
