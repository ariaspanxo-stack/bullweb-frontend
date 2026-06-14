import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatSaleNumber } from '@/utils/formatSaleNumber';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import tablesService from '@/services/tablesService';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Users, Clock, User, Edit, Trash2, MapPin, Maximize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import type { Table } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

interface TableDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
  onEdit: (table: Table) => void;
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const statusOptions = [
  { value: 'AVAILABLE', label: 'Disponible', color: 'success' as const },
  { value: 'OCCUPIED', label: 'Ocupada', color: 'danger' as const },
  { value: 'RESERVED', label: 'Reservada', color: 'warning' as const },
  { value: 'CLEANING', label: 'Limpieza', color: 'default' as const }
];

const shapeLabels: Record<string, string> = {
  ROUND: 'Redonda',
  SQUARE: 'Cuadrada',
  RECTANGULAR: 'Rectangular'
};

// ============================================================================
// COMPONENTE TABLE DETAIL MODAL
// ============================================================================

export default function TableDetailModal({ 
  isOpen, 
  onClose, 
  table,
  onEdit 
}: TableDetailModalProps) {
  const queryClient = useQueryClient();
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  const [showWaiterPicker, setShowWaiterPicker] = useState(false);

  // Cargar detalle completo de la mesa
  const { data: tableDetail, isLoading } = useQuery({
    queryKey: ['table', table?.id],
    queryFn: () => tablesService.getTable(table!.id),
    enabled: !!table?.id && isOpen
  });

  // Mutation para cambiar estado
  const changeStatusMutation = useMutation({
    mutationFn: ({ tableId, status }: { tableId: string; status: string }) =>
      tablesService.updateTableStatus(tableId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table', table?.id] });
      toast.success('Estado actualizado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar estado');
    }
  });

  // Mutation para liberar mesa
  const releaseMutation = useMutation({
    mutationFn: (tableId: string) => tablesService.releaseTable(tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table', table?.id] });
      toast.success('Mesa liberada');
    }
  });

  // Query de meseros disponibles
  const { data: waiters = [] } = useQuery({
    queryKey: ['table-waiters'],
    queryFn: () => tablesService.listWaiters(),
    enabled: showWaiterPicker,
  });

  // Mutation para asignar mesero
  const assignWaiterMutation = useMutation({
    mutationFn: ({ tableId, waiterId }: { tableId: string; waiterId: string }) =>
      tablesService.assignWaiter(tableId, waiterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-detail'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Mesero asignado correctamente');
      setShowWaiterPicker(false);
    },
    onError: () => toast.error('Error al asignar mesero'),
  });

  // Mutation para eliminar mesa
  const deleteMutation = useMutation({
    mutationFn: (tableId: string) => tablesService.deleteTable(tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Mesa eliminada correctamente');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al eliminar mesa');
    }
  });

  if (!table) return null;

  const currentOrder = tableDetail?.currentOrder;
  const currentStatus = tableDetail?.status || table.status;
  const canDelete = currentStatus === 'AVAILABLE' && !currentOrder;

  // Calcular duración de la orden
  const getOrderDuration = () => {
    if (!currentOrder?.createdAt) return '';
    
    const now = new Date();
    const created = new Date(currentOrder.createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} minutos`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Mesa ${table.number}`}>
      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando información...</p>
          </div>
        ) : (
          <>
            {/* Información básica */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-600 font-medium uppercase tracking-wide">
                  Capacidad
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="text-lg font-bold text-gray-900">
                    {table.capacity} personas
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-600 font-medium uppercase tracking-wide">
                  Sección
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <span className="text-lg font-bold text-gray-900">
                    {table.section?.name || 'Sin sección'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-600 font-medium uppercase tracking-wide">
                  Forma
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Maximize2 className="w-5 h-5 text-green-600" />
                  <span className="text-lg font-bold text-gray-900">
                    {shapeLabels[table.shape] || table.shape}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <label className="text-xs text-gray-600 font-medium uppercase tracking-wide">
                  Estado Actual
                </label>
                <div className="mt-1">
                  <Badge 
                    variant={statusOptions.find(s => s.value === currentStatus)?.color || 'default'}
                    className="text-sm"
                  >
                    {statusOptions.find(s => s.value === currentStatus)?.label || currentStatus}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Mesero asignado */}
            {(table.assignedWaiter || currentOrder) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {(table.assignedWaiter?.name || currentOrder?.waiter?.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs text-blue-500 font-medium">Mesero Asignado</p>
                      <p className="text-sm font-semibold text-blue-800">{table.assignedWaiter?.name || currentOrder?.waiter?.name || 'Sin asignar'}</p>
                    </div>
                  </div>
                  {currentOrder && (
                    <button
                      onClick={() => setShowWaiterPicker(!showWaiterPicker)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-300 bg-white hover:bg-blue-50 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
                    >
                      👤 Cambiar
                    </button>
                  )}
                </div>
                {showWaiterPicker && (
                  <div className="mt-3 pt-3 border-t border-blue-200 space-y-1.5 max-h-40 overflow-y-auto">
                    <p className="text-xs text-blue-500 mb-1">Seleccionar mesero:</p>
                    {waiters.length === 0 ? (
                      <p className="text-xs text-gray-400">No hay meseros disponibles</p>
                    ) : (
                      waiters.map((w: any) => (
                        <button
                          key={w.id}
                          onClick={() => assignWaiterMutation.mutate({ tableId: table.id, waiterId: w.id })}
                          disabled={assignWaiterMutation.isPending}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors text-left disabled:opacity-50"
                        >
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: w.avatarColor ?? '#FF6B35' }}>
                            {w.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-blue-800 font-medium">{w.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Orden activa */}
            {currentOrder && (
              <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Orden Activa
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-red-700">Número de Orden:</span>
                    <span className="font-bold text-red-900">
                      {formatSaleNumber(currentOrder.orderNumber || currentOrder.id.slice(0, 8))}
                    </span>
                  </div>
                  {currentOrder.waiter && (
                    <div className="flex justify-between">
                      <span className="text-red-700">Mesero:</span>
                      <span className="font-medium text-red-900">
                        {currentOrder.waiter.name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-red-700">Total:</span>
                    <span className="font-bold text-red-900 text-lg">
                      {formatCurrency(currentOrder.total)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700">Duración:</span>
                    <span className="flex items-center gap-1 font-medium text-red-900">
                      <Clock className="w-4 h-4" />
                      {getOrderDuration()}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-red-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => releaseMutation.mutate(table.id)}
                      disabled={releaseMutation.isPending}
                      className="w-full"
                    >
                      Liberar Mesa
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Cambiar estado */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Cambiar Estado de la Mesa
              </label>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map(status => {
                  const isCurrentStatus = currentStatus === status.value;
                  const isDisabled = changeStatusMutation.isPending || isCurrentStatus;
                  
                  return (
                    <button
                      key={status.value}
                      onClick={() => changeStatusMutation.mutate({
                        tableId: table.id,
                        status: status.value
                      })}
                      disabled={isDisabled}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                        isCurrentStatus
                          ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                          : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-700 hover:text-blue-700'
                      }`}
                    >
                      {status.label}
                      {isCurrentStatus && ' (actual)'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  onEdit(table);
                  onClose();
                }}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar Mesa
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  const ok = await confirmDialog({ message: `¿Estás seguro de eliminar la Mesa ${table!.number}?`, confirmLabel: 'Eliminar' });
                  if (ok) deleteMutation.mutate(table!.id);
                }}
                disabled={!canDelete || deleteMutation.isPending}
                className="flex-1"
                title={!canDelete ? 'No se puede eliminar una mesa ocupada o con orden activa' : ''}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            </div>

            {!canDelete && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2 text-center">
                ⚠️ Solo se pueden eliminar mesas disponibles sin órdenes activas
              </p>
            )}
          </>
        )}
      </div>
      <ConfirmDialog {...dialogProps} />
    </Modal>
  );
}