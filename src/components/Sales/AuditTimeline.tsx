import type { Sale } from '@/types/sales.types';
import { 
  Clock, 
  ShoppingCart, 
  CreditCard, 
  CheckCircle, 
  XCircle,
  DollarSign,
  FileText
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditTimelineProps {
  sale: Sale;
}

interface TimelineEvent {
  id: string;
  type: 'created' | 'items_added' | 'payment' | 'closed' | 'cancelled';
  title: string;
  description: string;
  timestamp: Date;
  icon: typeof Clock;
  color: string;
  bgColor: string;
}

export function AuditTimeline({ sale }: AuditTimelineProps) {
  // GENERADOR DE EVENTOS
  const generateEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // 1. EVENTO: Venta creada
    events.push({
      id: '1',
      type: 'created',
      title: 'Venta iniciada',
      description: `Mesa ${sale.tableNumber || 'N/A'} - ${sale.waiterName}`,
      timestamp: new Date(sale.startTime),
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    });

    // 2. EVENTO: Items agregados
    if (sale.items && sale.items.length > 0) {
      events.push({
        id: '2',
        type: 'items_added',
        title: `${sale.items.length} productos agregados`,
        description: sale.items.map(item => `${item.quantity}x ${item.productName}`).join(', '),
        timestamp: new Date(sale.createdAt),
        icon: ShoppingCart,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
      });
    }

    // 3. EVENTOS: Pagos realizados
    if (sale.payments && sale.payments.length > 0) {
      sale.payments.forEach((payment, index) => {
        events.push({
          id: `payment-${index}`,
          type: 'payment',
          title: `Pago ${(payment.method ?? '').toUpperCase() || 'PAGO'}`,
          description: `$${payment.amount.toLocaleString('es-CL')} ${payment.reference ? `- Ref: ${payment.reference}` : ''}`,
          timestamp: payment.createdAt ? new Date(payment.createdAt) : new Date(),
          icon: CreditCard,
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        });
      });
    }

    // 4. EVENTO: Propinas
    if (sale.tips && sale.tips.length > 0) {
      sale.tips.forEach((tip, index) => {
        events.push({
          id: `tip-${index}`,
          type: 'payment',
          title: `Propina ${(tip.method ?? '').toUpperCase() || 'PROPINA'}`,
          description: `$${tip.amount.toLocaleString('es-CL')} - ${tip.waiterName ?? ''}`,
          timestamp: tip.createdAt ? new Date(tip.createdAt) : new Date(),
          icon: DollarSign,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100'
        });
      });
    }

    // 5. EVENTO: Venta cerrada o cancelada
    if (sale.status === 'closed' && sale.closeTime) {
      events.push({
        id: 'closed',
        type: 'closed',
        title: 'Venta cerrada',
        description: `Total: $${sale.total.toLocaleString('es-CL')}`,
        timestamp: new Date(sale.closeTime),
        icon: CheckCircle,
        color: 'text-green-700',
        bgColor: 'bg-green-100'
      });
    } else if (sale.status === 'cancelled') {
      events.push({
        id: 'cancelled',
        type: 'cancelled',
        title: 'Venta anulada',
        description: 'Operación cancelada por el usuario',
        timestamp: new Date(sale.updatedAt),
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100'
      });
    }

    // Ordenar por timestamp descendente (más reciente primero)
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  const events = generateEvents();

  const formatRelativeTime = (date: Date) => {
    try {
      return formatDistanceToNow(new Date(date), { 
        addSuffix: true, 
        locale: es 
      });
    } catch {
      return 'fecha inválida';
    }
  };

  const formatAbsoluteTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-gray-600" />
        <h4 className="text-sm font-semibold text-gray-700">
          Línea de Tiempo
        </h4>
        <span className="text-xs text-gray-500">
          ({events.length} eventos)
        </span>
      </div>

      <div className="relative">
        {/* LÍNEA VERTICAL */}
        <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-gray-200" />

        {/* EVENTOS */}
        <div className="space-y-4">
          {events.map((event, index) => {
            const Icon = event.icon;
            const isLast = index === events.length - 1;

            return (
              <div key={event.id} className="relative flex gap-3 group">
                {/* ICONO */}
                <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${event.bgColor} flex items-center justify-center ring-4 ring-white`}>
                  <Icon className={`w-5 h-5 ${event.color}`} />
                </div>

                {/* CONTENIDO */}
                <div className={`flex-1 pb-4 ${!isLast ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {event.title}
                    </p>
                    <time 
                      className="text-xs text-gray-500 whitespace-nowrap" 
                      title={formatAbsoluteTime(event.timestamp)}
                    >
                      {formatRelativeTime(event.timestamp)}
                    </time>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {event.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DURACIÓN TOTAL */}
      {sale.status === 'closed' && sale.closeTime && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 font-medium">Duración total:</span>
            <span className="text-gray-900 font-bold">
              {formatRelativeTime(new Date(sale.closeTime))} desde inicio
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
