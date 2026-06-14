import { useMemo } from 'react';
import { CreditCard, Banknote, Building2, Smartphone } from 'lucide-react';
import type { Sale } from '@/types/sales.types';

interface PaymentBreakdownProps {
  sale: Sale;
}

interface PaymentMethodData {
  method: string;
  amount: number;
  percentage: number;
  color: string;
  bgColor: string;
  icon: React.ComponentType<any>;
}

/** Elige ícono y color basado en el nombre real del método de pago */
function resolveConfig(name: string): { color: string; bgColor: string; icon: any } {
  const n = name.toLowerCase();
  if (n.includes('efectivo') || n.includes('cash'))
    return { color: 'text-green-700',  bgColor: 'bg-green-500',  icon: Banknote };
  if (n.includes('débito') || n.includes('debito') || n.includes('debit'))
    return { color: 'text-cyan-700',   bgColor: 'bg-cyan-500',   icon: CreditCard };
  if (n.includes('crédito') || n.includes('credito') || n.includes('credit'))
    return { color: 'text-blue-700',   bgColor: 'bg-blue-500',   icon: CreditCard };
  if (n.includes('tarjeta') || n.includes('card'))
    return { color: 'text-blue-700',   bgColor: 'bg-blue-500',   icon: CreditCard };
  if (n.includes('transfer'))
    return { color: 'text-purple-700', bgColor: 'bg-purple-500', icon: Building2  };
  if (n.includes('cheque') || n.includes('check'))
    return { color: 'text-violet-700', bgColor: 'bg-violet-500', icon: Building2  };
  if (n.includes('cta') || n.includes('cuenta') || n.includes('corriente'))
    return { color: 'text-indigo-700', bgColor: 'bg-indigo-500', icon: Building2  };
  if (n.includes('voucher') || n.includes('vale'))
    return { color: 'text-orange-700', bgColor: 'bg-orange-500', icon: CreditCard };
  if (n.includes('fudo') || n.includes('yape') || n.includes('plin') || n.includes('digital'))
    return { color: 'text-pink-700',   bgColor: 'bg-pink-500',   icon: Smartphone };
  // método desconocido / personalizado
  return { color: 'text-gray-700',   bgColor: 'bg-gray-500',   icon: CreditCard };
}

/**
 * ============================================================================
 * PAYMENT BREAKDOWN - Financial Intelligence Component
 * ============================================================================
 *
 * Visualiza la distribución de métodos de pago con progress bars horizontales.
 * `payment.method` ahora contiene el NOMBRE real del método (ej. "Efectivo",
 * "Tarjeta Débito", "sexual") tal como está almacenado en la BD.
 */
export function PaymentBreakdown({ sale }: PaymentBreakdownProps) {
  // Agrupar pagos por nombre de método
  const paymentsByMethod = useMemo(() =>
    (sale.payments ?? []).reduce((acc, p) => {
      const name = p.method || 'Efectivo';
      if (name.toUpperCase() === 'UNPAID') return acc;
      acc[name] = (acc[name] ?? 0) + p.amount;
      return acc;
    }, {} as Record<string, number>),
  [sale.payments]);

  const totalPaid = useMemo(
    () => Object.values(paymentsByMethod).reduce((s, v) => s + v, 0),
    [paymentsByMethod]
  );

  // Convertir a array con icono/color resuelto y ordenar por monto desc
  const paymentData: PaymentMethodData[] = useMemo(() =>
    Object.entries(paymentsByMethod)
      .map(([method, amount]) => {
        const cfg = resolveConfig(method);
        return {
          method,
          amount,
          percentage: totalPaid > 0 ? (amount / totalPaid) * 100 : 0,
          color: cfg.color,
          bgColor: cfg.bgColor,
          icon: cfg.icon,
        };
      })
      .sort((a, b) => b.amount - a.amount),
  [paymentsByMethod, totalPaid]);

  if (paymentData.length === 0) {
    return <div className="text-sm text-gray-500 italic">No hay pagos registrados</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700">Desglose de Pagos</h4>
        <span className="text-xs text-gray-500">
          {paymentData.length} método{paymentData.length !== 1 ? 's' : ''}
        </span>
      </div>

      {paymentData.map((payment, index) => {
        const Icon = payment.icon;
        const bgLight = payment.bgColor.replace('-500', '-100');

        return (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${bgLight}`}>
                  <Icon className={`h-3.5 w-3.5 ${payment.color}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{payment.method}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900">
                  ${payment.amount.toLocaleString('es-CL')}
                </div>
                <div className="text-xs text-gray-500">{payment.percentage.toFixed(1)}%</div>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className={`${payment.bgColor} h-full rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${payment.percentage}%` }}
              />
            </div>
          </div>
        );
      })}

      <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Total Pagado</span>
        <span className="text-base font-bold text-gray-900">${totalPaid.toLocaleString('es-CL')}</span>
      </div>

      {sale.total > totalPaid && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-orange-700 font-medium">Pendiente</span>
          <span className="text-orange-700 font-bold">${(sale.total - totalPaid).toLocaleString('es-CL')}</span>
        </div>
      )}

      <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-gray-600">Método principal</div>
          <div className="font-semibold text-gray-900 mt-0.5">{paymentData[0]?.method ?? 'N/A'}</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-gray-600">Métodos usados</div>
          <div className="font-semibold text-gray-900 mt-0.5">{paymentData.length}</div>
        </div>
      </div>
    </div>
  );
}
