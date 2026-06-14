import type { Sale } from '@/types/sales.types';
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  Gift,
  Users,
  Clock,
  DollarSign,
  Target
} from 'lucide-react';

interface SmartSuggestionsProps {
  sale: Sale;
  tipAlertThreshold?:   number;  // decimal, default 0.15 (15 %)
  highTicketThreshold?: number;  // default 25_000
  lowTicketThreshold?:  number;  // default 8_000
  groupSizeThreshold?:  number;  // default 3 personas
  longSessionMinutes?:  number;  // default 90 min (moderado); crítico = + 30 min
}

interface Suggestion {
  id: string;
  type: 'opportunity' | 'warning' | 'insight' | 'action';
  title: string;
  description: string;
  icon: typeof Lightbulb;
  color: string;
  bgColor: string;
  borderColor: string;
  priority: 'high' | 'medium' | 'low';
}

export function SmartSuggestions({
  sale,
  tipAlertThreshold   = 0.15,
  highTicketThreshold = 25_000,
  lowTicketThreshold  = 8_000,
  groupSizeThreshold  = 3,
  longSessionMinutes  = 90,
}: SmartSuggestionsProps) {
  // ANALIZADOR INTELIGENTE
  const generateSuggestions = (): Suggestion[] => {
    const suggestions: Suggestion[] = [];

    // 1. ANÁLISIS: Propinas
    const totalTips = sale.tips?.reduce((sum, tip) => sum + tip.amount, 0) || 0;
    const tipPercentage = sale.total > 0 ? (totalTips / sale.total) * 100 : 0;

    if (tipPercentage === 0 && sale.status === 'closed') {
      suggestions.push({
        id: 'no-tips',
        type: 'warning',
        title: 'Sin propina registrada',
        description: 'Verificar satisfacción del cliente. Considerar seguimiento post-servicio.',
        icon: AlertTriangle,
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        priority: 'medium'
      });
    } else if (tipPercentage > tipAlertThreshold * 100) {
      suggestions.push({
        id: 'high-tips',
        type: 'insight',
        title: `Excelente propina (${tipPercentage.toFixed(1)}%)`,
        description: 'Cliente muy satisfecho. Registrar en perfil para futuras atenciones especiales.',
        icon: TrendingUp,
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        priority: 'low'
      });
    }

    // 2. ANÁLISIS: Ticket promedio por persona
    const ticketPerPerson = sale.numberOfPeople > 0 ? sale.total / sale.numberOfPeople : 0;

    if (ticketPerPerson > highTicketThreshold) {
      suggestions.push({
        id: 'high-ticket',
        type: 'opportunity',
        title: `Alto ticket per cápita ($${Math.round(ticketPerPerson).toLocaleString('es-CL')})`,
        description: 'Cliente premium. Ofrecer programa de fidelización o beneficios exclusivos.',
        icon: Target,
        color: 'text-purple-700',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        priority: 'high'
      });
    } else if (ticketPerPerson < lowTicketThreshold && sale.numberOfPeople >= groupSizeThreshold) {
      suggestions.push({
        id: 'low-ticket',
        type: 'opportunity',
        title: 'Oportunidad de upselling',
        description: 'Grupo grande con ticket bajo. Sugerir platos para compartir o promos grupales.',
        icon: Gift,
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        priority: 'medium'
      });
    }

    // 3. ANÁLISIS: Duración de la venta
    if (sale.status === 'open' && sale.startTime) {
      const durationMinutes = (Date.now() - new Date(sale.startTime).getTime()) / (1000 * 60);
      
      if (durationMinutes > longSessionMinutes + 30) {
        suggestions.push({
          id: 'long-duration',
          type: 'warning',
          title: `Venta abierta hace ${Math.round(durationMinutes)} minutos`,
          description: 'Verificar si requiere asistencia o está listo para cerrar cuenta.',
          icon: Clock,
          color: 'text-red-700',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          priority: 'high'
        });
      } else if (durationMinutes > longSessionMinutes) {
        suggestions.push({
          id: 'moderate-duration',
          type: 'action',
          title: `Mesa ocupada ${longSessionMinutes}+ minutos`,
          description: 'Considerar ofrecer café/postre o preparar cuenta.',
          icon: Clock,
          color: 'text-yellow-700',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          priority: 'medium'
        });
      }
    }

    // 4. ANÁLISIS: Tamaño del grupo
    if (sale.numberOfPeople >= 6) {
      suggestions.push({
        id: 'large-group',
        type: 'insight',
        title: `Grupo grande (${sale.numberOfPeople} personas)`,
        description: 'Verificar disponibilidad de menú familiar o descuentos por volumen.',
        icon: Users,
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-50',
        borderColor: 'border-indigo-200',
        priority: 'low'
      });
    }

    // 5. ANÁLISIS: Productos premium
    const hasExpensiveItems = sale.items?.some(item => item.unitPrice > 15000);
    
    if (hasExpensiveItems) {
      suggestions.push({
        id: 'premium-items',
        type: 'opportunity',
        title: 'Productos premium en orden',
        description: 'Cliente con poder adquisitivo. Sugerir maridaje, postres gourmet o experiencias.',
        icon: Lightbulb,
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        priority: 'medium'
      });
    }

    // 6. ANÁLISIS: Métodos de pago múltiples
    const paymentMethodsCount = new Set(sale.payments?.map(p => p.method)).size;
    
    if (paymentMethodsCount >= 3) {
      suggestions.push({
        id: 'split-payment',
        type: 'insight',
        title: `${paymentMethodsCount} métodos de pago`,
        description: 'Grupo dividiendo cuenta. Verificar que todos los pagos estén correctamente asignados.',
        icon: DollarSign,
        color: 'text-teal-700',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200',
        priority: 'low'
      });
    }

    // 7. ANÁLISIS: Descuento aplicado
    if (sale.discount > 0) {
      const discountPercentage = (sale.discount / sale.subtotal) * 100;
      suggestions.push({
        id: 'discount-applied',
        type: 'insight',
        title: `Descuento aplicado (${discountPercentage.toFixed(1)}%)`,
        description: 'Verificar autorización y motivo del descuento en sistema.',
        icon: Gift,
        color: 'text-pink-700',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
        priority: 'low'
      });
    }

    // Ordenar por prioridad
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  };

  const suggestions = generateSuggestions();

  if (suggestions.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <Lightbulb className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">
          No hay sugerencias en este momento
        </p>
        <p className="text-xs text-gray-400 mt-1">
          El análisis no detectó oportunidades
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-gray-600" />
        <h4 className="text-sm font-semibold text-gray-700">
          Sugerencias Inteligentes
        </h4>
        <span className="text-xs text-gray-500">
          ({suggestions.length} insights)
        </span>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;

          return (
            <div
              key={suggestion.id}
              className={`p-4 rounded-lg border-l-4 ${suggestion.bgColor} ${suggestion.borderColor} hover:shadow-sm transition-shadow`}
            >
              <div className="flex gap-3">
                {/* ICONO */}
                <div className="flex-shrink-0">
                  <Icon className={`w-5 h-5 ${suggestion.color}`} />
                </div>

                {/* CONTENIDO */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h5 className={`text-sm font-semibold ${suggestion.color}`}>
                      {suggestion.title}
                    </h5>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                        suggestion.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : suggestion.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {suggestion.priority === 'high' ? 'Alta' : suggestion.priority === 'medium' ? 'Media' : 'Baja'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* RESUMEN */}
      <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 text-xs text-blue-800">
          <Target className="w-4 h-4" />
          <span className="font-semibold">
            {suggestions.filter(s => s.priority === 'high').length} prioritarias
          </span>
          <span className="text-blue-600">•</span>
          <span>
            {suggestions.filter(s => s.type === 'opportunity').length} oportunidades
          </span>
          <span className="text-blue-600">•</span>
          <span>
            {suggestions.filter(s => s.type === 'warning').length} alertas
          </span>
        </div>
      </div>
    </div>
  );
}
