// ═══════════════════════════════════════════════════════════════
// EditCustomerModal — Modal para editar datos del cliente
// (customerName, customerPhone, deliveryAddress) en tarjetas de pedido
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Save, Loader2 } from 'lucide-react';
import { restaurantService } from '../../../services/restaurantService';
import type { Sale } from '../../../types/restaurant.types';

export interface EditCustomerModalProps {
  order: Sale;
  variant: 'mostrador' | 'delivery';
  onClose: () => void;
  onSaved?: () => void; // Callback opcional para refrescar después de guardar
}

export function EditCustomerModal({
  order,
  variant,
  onClose,
  onSaved,
}: EditCustomerModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializar campos con datos actuales de la orden
  useEffect(() => {
    setCustomerName(order.customerName ?? '');
    setCustomerPhone(order.customerPhone ?? '');
    setDeliveryAddress((order as any).customerAddress ?? '');
  }, [order]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Enviar siempre los 3 campos (backend maneja null/vacío correctamente)
      await restaurantService.updateOrderCustomer(order.id, {
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        // deliveryAddress solo aplica para pedidos delivery, pero enviarlo
        // igual no causa problemas (el backend lo ignora para DINE_IN/TAKEAWAY)
        deliveryAddress: variant === 'delivery' ? (deliveryAddress.trim() || null) : undefined,
      });
      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error('[EditCustomerModal] ❌ Error guardando:', err);
      setError(
        err?.response?.data?.message
        || err?.message
        || 'Error al guardar los cambios'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              variant === 'delivery' ? 'bg-purple-100' : 'bg-blue-100'
            }`}>
              <User size={16} className={variant === 'delivery' ? 'text-purple-600' : 'text-blue-600'} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Editar Cliente</h3>
              <p className="text-[11px] text-gray-400">
                Orden {order.orderNumber || order.id.slice(-6).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Formulario ── */}
        <div className="px-5 py-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Nombre del Cliente
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Teléfono
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ej: +569 1234 5678"
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
              />
            </div>
          </div>

          {/* Dirección (solo delivery) */}
          {variant === 'delivery' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Dirección de Entrega
              </label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-3 text-gray-400" />
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Ej: Av. Providencia 1234, Depto 5B"
                  rows={2}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* ── Footer con acciones ── */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all shadow-sm disabled:opacity-50 ${
              variant === 'delivery'
                ? 'bg-purple-500 hover:bg-purple-600 shadow-purple-200'
                : 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
            }`}
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save size={15} />
                Guardar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}