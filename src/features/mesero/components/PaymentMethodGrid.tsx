// ═══════════════════════════════════════════════════════════════
// PAYMENT METHOD GRID — selector de método de pago
// Permiso: waiter_app.select_payment
// HOTFIX 293: muestra los medios de pago ACTIVOS reales del tenant
// (GET /api/waiter/payment-methods) y selecciona por UUID. Antes tenía
// ids fijos 'cash'/'card'/'voucher'/'transfer' y el backend grababa
// Tarjeta y Vale como el primer medio activo (Efectivo).
// ═══════════════════════════════════════════════════════════════

export interface WaiterPaymentMethod {
  id:   string;
  name: string;
}

// HOTFIX 293: ícono solo decorativo, según el nombre del medio
function iconFor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('efectivo')) return '💵';
  if (n.includes('transfer')) return '📱';
  return '💳';
}

interface PaymentMethodGridProps {
  methods:  WaiterPaymentMethod[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export function PaymentMethodGrid({ methods, selected, onSelect }: PaymentMethodGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {methods.map(method => (
        <button
          key={method.id}
          onClick={() => onSelect(method.id)}
          className={`
            p-4 rounded-2xl flex flex-col items-center gap-2 min-h-[44px]
            border-2 transition-all active:scale-95
            ${selected === method.id
              ? 'border-orange-500 bg-orange-500/15'
              : 'border-gray-700 bg-gray-800'
            }
          `}
        >
          <span className="text-3xl">{iconFor(method.name)}</span>
          <span className={`text-sm font-medium text-center ${selected === method.id ? 'text-white' : 'text-gray-400'}`}>
            {method.name}
          </span>
        </button>
      ))}
    </div>
  );
}
