// ═══════════════════════════════════════════════════════════════
// MESERO ACTION SHEET — opciones del pedido activo
// ═══════════════════════════════════════════════════════════════

import { X, Printer, Scissors, ArrowRightLeft, DollarSign } from 'lucide-react';

interface MeseroActionSheetProps {
  isOpen:        boolean;
  onClose:       () => void;
  hasItems:      boolean;
  onPreCuenta:   () => void;
  onSplitBill:   () => void;
  onTransfer:    () => void;
  onCharge?:     () => void;
  canCharge?:    boolean;
  canSplit?:     boolean;
  canTransfer?:  boolean;
}

export function MeseroActionSheet({
  isOpen, onClose, hasItems,
  onPreCuenta, onSplitBill, onTransfer,
  onCharge, canCharge = false, canSplit = true, canTransfer = true,
}: MeseroActionSheetProps) {

  if (!isOpen) return null;

  const actions = [
    // Cobrar — solo si tiene permiso charge
    ...(canCharge && onCharge ? [{
      id:        'charge',
      icon:      DollarSign,
      label:     'Cobrar mesa',
      sublabel:  'Procesar pago directamente',
      bg:        'bg-green-50 hover:bg-green-100',
      iconBg:    'bg-green-100',
      iconColor: 'text-green-600',
      disabled:  !hasItems,
      onClick:   onCharge,
    }] : []),
    {
      id:        'precuenta',
      icon:      Printer,
      label:     'Pre-cuenta',
      sublabel:  'Imprimir ticket de pre-cuenta',
      bg:        'bg-gray-50 hover:bg-gray-100',
      iconBg:    'bg-orange-100',
      iconColor: 'text-orange-500',
      disabled:  !hasItems,
      onClick:   onPreCuenta,
    },
    {
      id:        'split',
      icon:      Scissors,
      label:     'Dividir cuenta',
      sublabel:  !canSplit
        ? 'Sin permiso para dividir'
        : hasItems ? 'Separar ítems en dos cuentas' : 'Sin ítems para dividir',
      bg:        'bg-gray-50 hover:bg-gray-100',
      iconBg:    'bg-indigo-100',
      iconColor: 'text-indigo-500',
      disabled:  !hasItems || !canSplit,
      onClick:   onSplitBill,
    },
    {
      id:        'transfer',
      icon:      ArrowRightLeft,
      label:     'Transferir mesa',
      sublabel:  canTransfer ? 'Mover pedido a otra mesa' : 'Sin permiso para transferir',
      bg:        'bg-gray-50 hover:bg-gray-100',
      iconBg:    'bg-blue-100',
      iconColor: 'text-blue-500',
      disabled:  !canTransfer,
      onClick:   onTransfer,
    },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-2xl">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <h3 className="font-bold text-gray-800 text-lg">Opciones del pedido</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Acciones */}
        <div className="px-4 pb-8 space-y-2">
          {actions.map(action => (
            <button
              key={action.id}
              onClick={() => {
                if (!action.disabled) {
                  onClose();
                  action.onClick();
                }
              }}
              disabled={action.disabled}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl
                transition-colors text-left
                ${action.disabled ? 'opacity-40 cursor-not-allowed bg-gray-50' : action.bg}`}
            >
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${action.iconBg}`}>
                <action.icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800">{action.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{action.sublabel}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
