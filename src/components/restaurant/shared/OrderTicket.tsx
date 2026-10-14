// ═══════════════════════════════════════════════════════════════
// ORDER TICKET (Hotfix 245 C5) — columna ticket compartida por los
// dos gemelos de creación (NewMostradorModal · NewDeliveryModal).
//
// CONTRATO TOTAL BD-MANDA: el total se deriva de la MISMA funcion existente sobre precios llegados del servidor; jamas aritmetica nueva; si lo mostrado difiere de lo persistido, el bug esta en lo mostrado; el numero soberano es el del servidor.
//
// RECIBE TODO por props: estado del carrito y handlers EXISTENTES.
// PROHIBIDO mover estado, PROHIBIDO nueva aritmética, PROHIBIDO
// lógica duplicada — las diferencias entre gemelos se resuelven con
// props opcionales.
// ═══════════════════════════════════════════════════════════════

import type { ReactNode } from 'react';
import { X, Plus, Minus, CreditCard, ShoppingBag, Truck } from 'lucide-react';
import type { CartItem } from '../../../types/restaurant.types';

export interface OrderTicketProps {
  // ── Carrito y handlers EXISTENTES (nada de aritmética nueva aquí) ──
  items: CartItem[];
  onIncreaseQuantity: (itemId: string) => void;
  onDecreaseQuantity: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
  /** Render de modificadores/notas por item — patrón actual de cada gemelo */
  renderItemExtras?: (item: CartItem) => ReactNode;
  /** Totales: la MISMA función existente del gemelo (fmt sobre total ya computado) */
  formatPrice: (n: number) => string;
  subtotal: number;
  total: number;
  /** Fila extra de totales opcional (p.ej. "Delivery $X" en el gemelo delivery) */
  extraTotals?: ReactNode;
  // ── Acciones EXISTENTES ──
  onConfirm: () => void;
  saving: boolean;
  onGuardarSinProductos?: () => void;
  canSaveEmpty?: boolean;
  confirmLabel: string;
  savingLabel?: string;
  // ── Edición de cliente ──
  customerChip?: ReactNode;
  // ── Errores del gemelo ──
  errorNode?: ReactNode;
  // ── Acento visual del gemelo (azul mostrador · púrpura delivery) ──
  accent?: 'blue' | 'purple';
  emptyIcon?: 'bag' | 'truck';
  /** Contenido extra al pie del ticket (p.ej. medio de pago del delivery) */
  footerExtra?: ReactNode;
}

const accentText = (accent: 'blue' | 'purple') =>
  accent === 'blue' ? 'text-blue-500' : 'text-purple-600';

export const OrderTicket = ({
  items,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemoveItem,
  renderItemExtras,
  formatPrice,
  subtotal,
  total,
  extraTotals,
  onConfirm,
  saving,
  onGuardarSinProductos,
  canSaveEmpty = true,
  confirmLabel,
  savingLabel = 'Creando...',
  customerChip,
  errorNode,
  accent = 'blue',
  emptyIcon = 'bag',
  footerExtra,
}: OrderTicketProps) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-50">
      {/* Chip de cliente editable en 1 tap */}
      {customerChip}

      {items.length === 0 ? (
        /* Estado vacío: ícono + una línea */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            {emptyIcon === 'truck' ? (
              <Truck size={32} className="mx-auto text-gray-400 mb-2" />
            ) : (
              <ShoppingBag size={32} className="mx-auto text-gray-400 mb-2" />
            )}
            <p className="text-gray-600 text-sm font-medium">Carrito vacío</p>
          </div>
        </div>
      ) : (
        <>
          {/* Items con −/+ h-11 (44px) */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-yellow-50 rounded-lg border border-yellow-200 overflow-hidden"
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onDecreaseQuantity(item.id)}
                      className="w-11 h-11 bg-yellow-200 hover:bg-yellow-300 rounded-lg flex items-center justify-center transition-colors"
                      aria-label="Restar"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-7 text-center text-sm font-bold text-gray-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onIncreaseQuantity(item.id)}
                      className="w-11 h-11 bg-yellow-200 hover:bg-yellow-300 rounded-lg flex items-center justify-center transition-colors"
                      aria-label="Sumar"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="flex-1 font-semibold text-sm text-gray-900 truncate">
                    {item.productName}
                  </span>
                  <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
                    $ {formatPrice(item.subtotal)}
                  </span>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Eliminar"
                  >
                    <X size={14} />
                  </button>
                </div>
                {/* Modificadores/notas en líneas sangradas "+ X" (patrón actual, vía props) */}
                {renderItemExtras && renderItemExtras(item)}
              </div>
            ))}
          </div>

          {/* Totales + acciones */}
          <div className="border-t-2 border-gray-300 bg-white p-3 flex-shrink-0">
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">${formatPrice(subtotal)}</span>
              </div>
              {extraTotals}
              {/* TOTAL: el número más grande de la pantalla */}
              <div className="flex justify-between items-baseline text-3xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span className="text-base font-bold">Total</span>
                <span className={accentText(accent)}>${formatPrice(total)}</span>
              </div>
            </div>

            {errorNode}

            <button
              onClick={onConfirm}
              disabled={saving}
              className="w-full h-12 bg-[#F97316] hover:bg-[#ea6a0a] text-white rounded-lg font-bold text-base transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  {savingLabel}
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  {confirmLabel}
                </>
              )}
            </button>

            {footerExtra}

            {/* "Guardar sin productos" discreto: botón de texto pequeño al pie */}
            {onGuardarSinProductos && (
              <button
                onClick={onGuardarSinProductos}
                disabled={saving || !canSaveEmpty}
                className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed py-1"
              >
                Guardar sin productos
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default OrderTicket;
