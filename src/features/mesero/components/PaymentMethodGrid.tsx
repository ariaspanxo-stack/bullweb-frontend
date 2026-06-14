// ═══════════════════════════════════════════════════════════════
// PAYMENT METHOD GRID — selector de método de pago
// Permiso: waiter_app.select_payment
// ═══════════════════════════════════════════════════════════════

const PAYMENT_METHODS = [
  { id: 'cash',     label: 'Efectivo',       icon: '💵', color: 'bg-green-900/50  border-green-700'  },
  { id: 'card',     label: 'Tarjeta',        icon: '💳', color: 'bg-blue-900/50   border-blue-700'   },
  { id: 'transfer', label: 'Transferencia',  icon: '📱', color: 'bg-purple-900/50 border-purple-700' },
  { id: 'voucher',  label: 'Vale/Cupón',     icon: '🎟️', color: 'bg-yellow-900/50 border-yellow-700' },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]['id'];

interface PaymentMethodGridProps {
  selected: string;
  onSelect: (id: string) => void;
}

export function PaymentMethodGrid({ selected, onSelect }: PaymentMethodGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {PAYMENT_METHODS.map(method => (
        <button
          key={method.id}
          onClick={() => onSelect(method.id)}
          className={`
            p-4 rounded-2xl flex flex-col items-center gap-2
            border-2 transition-all active:scale-95
            ${selected === method.id
              ? `border-orange-500 ${method.color}`
              : 'border-gray-700 bg-gray-800'
            }
          `}
        >
          <span className="text-3xl">{method.icon}</span>
          <span className={`text-sm font-medium ${selected === method.id ? 'text-white' : 'text-gray-400'}`}>
            {method.label}
          </span>
        </button>
      ))}
    </div>
  );
}
