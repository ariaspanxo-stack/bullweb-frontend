import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatSaleNumber } from '@/utils/formatSaleNumber';
import { kitchenService } from '@/services/kitchenService';
import { cn } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import { Clock, User, Utensils, CheckCircle, PlayCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================================
// TIPOS
// ============================================================================

interface OrderCardProps {
  order: any; // KitchenOrder completo
}

// ============================================================================
// CONFIGURACIÓN DE ESTILOS
// ============================================================================

const statusColors = {
  PENDING: 'bg-yellow-50 border-yellow-300 text-yellow-900',
  PREPARING: 'bg-blue-50 border-blue-300 text-blue-900',
  READY: 'bg-green-50 border-green-300 text-green-900'
};

const statusLabels = {
  PENDING: 'Pendiente',
  PREPARING: 'Preparando',
  READY: 'Listo'
};

const statusBadgeVariants = {
  PENDING: 'warning' as const,
  PREPARING: 'info' as const,
  READY: 'success' as const
};

// ============================================================================
// COMPONENTE ORDER CARD
// ============================================================================

export default function OrderCard({ order }: OrderCardProps) {
  const queryClient = useQueryClient();

  // Calcular tiempo transcurrido en minutos
  const minutesElapsed = Math.floor(
    (Date.now() - new Date(order.createdAt).getTime()) / 60000
  );

  // Niveles de urgencia
  const isUrgent = minutesElapsed > 15;
  const isVeryUrgent = minutesElapsed > 30;

  // ========================================================================
  // MUTATIONS
  // ========================================================================

  // Mutation para cambiar estado de item
  const updateStatusMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
      kitchenService.updateItemStatus(itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-stats'] });
      toast.success('Estado actualizado');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar estado');
    }
  });

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleMarkPreparing = (itemId: string) => {
    updateStatusMutation.mutate({ itemId, status: 'PREPARING' });
  };

  const handleMarkReady = (itemId: string) => {
    updateStatusMutation.mutate({ itemId, status: 'READY' });
  };

  // Formatear tiempo
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl border-3 shadow-lg transition-all hover:shadow-xl',
        isVeryUrgent && 'border-red-600 animate-pulse shadow-red-200',
        isUrgent && !isVeryUrgent && 'border-orange-500 shadow-orange-100',
        !isUrgent && 'border-gray-200'
      )}
    >
      {/* ====================================================================
          HEADER
      ==================================================================== */}
      <div className={cn(
        'px-5 py-4 border-b-2 flex items-center justify-between',
        isVeryUrgent && 'bg-red-50 border-red-200',
        isUrgent && !isVeryUrgent && 'bg-orange-50 border-orange-200',
        !isUrgent && 'bg-gray-50 border-gray-200'
      )}>
        <div className="flex items-center gap-4">
          {/* Número de orden */}
          <div className="bg-white px-4 py-2 rounded-lg border-2 border-gray-300">
            <div className="text-xs text-gray-500 font-medium uppercase">Orden</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatSaleNumber(order.orderNumber || order.id?.slice(0, 6))}
            </div>
          </div>

          {/* Mesa y tipo de orden */}
          <div className="space-y-1">
            {order.table && (
              <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Utensils className="w-5 h-5 text-blue-600" />
                <span>Mesa {order.table.number}</span>
              </div>
            )}
            {!order.table && (
              <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-sm">
                  {order.type === 'TAKEAWAY' ? 'Para Llevar' : 'Delivery'}
                </span>
              </div>
            )}
            
            {/* Mesero */}
            {order.waiter && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{order.waiter.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tiempo transcurrido */}
        <div className="text-right">
          <div className="flex items-center gap-2 mb-1">
            <Clock className={cn(
              'w-6 h-6',
              isVeryUrgent && 'text-red-600',
              isUrgent && !isVeryUrgent && 'text-orange-600',
              !isUrgent && 'text-gray-500'
            )} />
            {isVeryUrgent && (
              <AlertTriangle className="w-6 h-6 text-red-600 animate-bounce" />
            )}
          </div>
          <div className="text-xs text-gray-500 uppercase font-medium">Hace</div>
          <div className={cn(
            'text-3xl font-bold',
            isVeryUrgent && 'text-red-600',
            isUrgent && !isVeryUrgent && 'text-orange-600',
            !isUrgent && 'text-gray-700'
          )}>
            {minutesElapsed}'
          </div>
          {isVeryUrgent && (
            <div className="text-xs text-red-600 font-bold uppercase mt-1">
              ¡URGENTE!
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================
          ITEMS
      ==================================================================== */}
      <div className="p-5 space-y-4">
        {order.items?.map((item: any) => (
          <div
            key={item.id}
            className={cn(
              'p-4 rounded-lg border-2 transition-all',
              statusColors[item.status]
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                {/* Cantidad y producto */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl font-black text-gray-800">
                    {item.quantity}×
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    {item.product?.name || 'Producto'}
                  </span>
                </div>

                {/* Modificadores */}
                {item.modifiers && item.modifiers.length > 0 && (
                  <div className="ml-14 space-y-1">
                    {item.modifiers.map((modifier: string, idx: number) => (
                      <div key={idx} className="text-sm text-gray-700 font-medium">
                        • {modifier}
                      </div>
                    ))}
                  </div>
                )}

                {/* Notas especiales */}
                {item.notes && (
                  <div className="ml-14 mt-2 p-3 bg-red-100 border-2 border-red-400 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-red-600 font-bold uppercase mb-1">
                          Notas Especiales
                        </div>
                        <div className="text-sm text-red-900 font-semibold">
                          {item.notes}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Badge de estado */}
              <Badge
                variant={statusBadgeVariants[item.status]}
                className="text-sm font-bold px-3 py-1"
              >
                {statusLabels[item.status]}
              </Badge>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 mt-4">
              {item.status === 'PENDING' && (
                <button
                  onClick={() => handleMarkPreparing(item.id)}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 font-bold text-base shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  <PlayCircle className="w-5 h-5" />
                  Iniciar Preparación
                </button>
              )}
              
              {(item.status === 'PENDING' || item.status === 'PREPARING') && (
                <button
                  onClick={() => handleMarkReady(item.id)}
                  disabled={updateStatusMutation.isPending}
                  className="flex-1 px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 font-bold text-base shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" />
                  Marcar Listo
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Alerta visual para órdenes muy urgentes */}
      {isVeryUrgent && (
        <div className="px-5 pb-5">
          <div className="bg-red-600 text-white px-4 py-3 rounded-lg flex items-center gap-3 animate-pulse">
            <AlertTriangle className="w-6 h-6" />
            <div className="font-bold text-sm">
              Esta orden lleva más de 30 minutos. ¡Prioridad máxima!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
