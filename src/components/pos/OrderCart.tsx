import { usePosStore } from '@/store/posStore';
import { Trash2, Plus, Minus, ShoppingCart, Tag } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';

// ============================================================================
// TIPOS
// ============================================================================

interface OrderCartProps {
  onCheckout: () => void;
  onApplyDiscount?: () => void;
}

// ============================================================================
// COMPONENTE ORDER CART
// ============================================================================

export default function OrderCart({ onCheckout, onApplyDiscount }: OrderCartProps) {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    subtotal,
    tax,
    discount,
    total,
    orderType,
    selectedTable
  } = usePosStore();

  const isEmpty = cartItems.length === 0;

  const getOrderTypeLabel = () => {
    switch (orderType) {
      case 'DINE_IN':
        return 'Mesa';
      case 'TAKEAWAY':
        return 'Para Llevar';
      case 'DELIVERY':
        return 'Delivery';
      default:
        return orderType;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-bold text-gray-900">Orden Actual</h2>
        </div>
        
        {/* Tipo de orden y mesa */}
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
            {getOrderTypeLabel()}
          </span>
          {selectedTable && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm font-medium">
              Mesa {selectedTable.number}
            </span>
          )}
          {cartItems.length > 0 && (
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm font-medium">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isEmpty ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingCart className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="font-medium mb-1">Carrito vacío</p>
            <p className="text-sm">Selecciona productos para agregar</p>
          </div>
        ) : (
          cartItems.map(item => (
            <div 
              key={item.id} 
              className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-900 truncate">
                    {item.product.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatCurrency(item.product.price)} × {item.quantity}
                  </p>
                  
                  {/* Modificadores */}
                  {item.modifiers.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.modifiers.map((modifier, idx) => (
                        <span 
                          key={idx}
                          className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                        >
                          {modifier}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Notas */}
                  {item.notes && (
                    <p className="text-xs text-gray-600 italic mt-1 line-clamp-2">
                      📝 {item.notes}
                    </p>
                  )}
                </div>
                
                {/* Botón eliminar */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors ml-2"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Controles de cantidad y precio */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all"
                  >
                    <Minus className="w-3 h-3 text-gray-700" />
                  </button>
                  <span className="w-8 text-center font-semibold text-gray-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-7 h-7 rounded bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all"
                  >
                    <Plus className="w-3 h-3 text-gray-700" />
                  </button>
                </div>
                <span className="font-bold text-blue-600">
                  {formatCurrency(item.subtotal)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totales */}
      <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
        </div>
        
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              Descuento:
            </span>
            <span className="font-medium">-{formatCurrency(discount)}</span>
          </div>
        )}
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">IGV (18%):</span>
          <span className="font-medium text-gray-900">{formatCurrency(tax)}</span>
        </div>
        
        <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-3 mt-2">
          <span className="text-gray-900">Total:</span>
          <span className="text-blue-600">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Acciones */}
      <div className="p-4 border-t border-gray-200 space-y-2 bg-white">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isEmpty}
          onClick={onCheckout}
        >
          Proceder al Pago
        </Button>
        
        {onApplyDiscount && (
          <Button
            variant="outline"
            size="md"
            className="w-full"
            disabled={isEmpty}
            onClick={onApplyDiscount}
          >
            <Tag className="w-4 h-4 mr-2" />
            Aplicar Descuento
          </Button>
        )}
      </div>
    </div>
  );
}
