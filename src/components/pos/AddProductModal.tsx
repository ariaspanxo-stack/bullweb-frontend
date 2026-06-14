import { useState } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import type { Product } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAdd: (product: Product, quantity: number, modifiers?: string[], notes?: string) => void;
}

// Modificadores predefinidos comunes
const COMMON_MODIFIERS = [
  'Sin sal',
  'Sin azúcar',
  'Sin cebolla',
  'Sin ají',
  'Extra queso',
  'Extra carne',
  'Término medio',
  'Bien cocido',
  'Para llevar aparte',
  'Caliente',
  'Frío',
  'Sin hielo',
];

// ============================================================================
// COMPONENTE ADD PRODUCT MODAL
// ============================================================================

export default function AddProductModal({
  isOpen,
  onClose,
  product,
  onAdd
}: AddProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Reset al cerrar
  const handleClose = () => {
    setQuantity(1);
    setSelectedModifiers([]);
    setNotes('');
    onClose();
  };

  // Agregar producto al carrito
  const handleAdd = () => {
    if (product) {
      onAdd(
        product,
        quantity,
        selectedModifiers.length > 0 ? selectedModifiers : undefined,
        notes.trim() || undefined
      );
      handleClose();
    }
  };

  // Toggle modificador
  const toggleModifier = (modifier: string) => {
    setSelectedModifiers(prev =>
      prev.includes(modifier)
        ? prev.filter(m => m !== modifier)
        : [...prev, modifier]
    );
  };

  // Incrementar cantidad
  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  // Decrementar cantidad
  const decrementQuantity = () => {
    setQuantity(prev => (prev > 1 ? prev - 1 : 1));
  };

  if (!product) return null;

  const subtotal = product.price * quantity;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Agregar Producto">
      <div className="space-y-6">
        {/* Producto Info */}
        <div className="flex gap-4">
          {/* Imagen */}
          <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                🍽️
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900 mb-1">
              {product.name}
            </h3>
            {product.description && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {product.description}
              </p>
            )}
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(product.price)}
            </p>
          </div>
        </div>

        {/* Cantidad */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Cantidad
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={decrementQuantity}
              className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-300 flex items-center justify-center hover:bg-gray-200 active:scale-95 transition-all"
            >
              <Minus className="w-5 h-5 text-gray-700" />
            </button>
            <span className="text-2xl font-bold text-gray-900 w-12 text-center">
              {quantity}
            </span>
            <button
              onClick={incrementQuantity}
              className="w-10 h-10 rounded-lg bg-blue-600 border border-blue-700 flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Modificadores */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Modificadores (opcional)
          </label>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
            {COMMON_MODIFIERS.map(modifier => {
              const isSelected = selectedModifiers.includes(modifier);
              return (
                <button
                  key={modifier}
                  onClick={() => toggleModifier(modifier)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {modifier}
                  {isSelected && (
                    <X className="inline-block w-3 h-3 ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notas especiales */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Notas especiales (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Sin cebolla, término medio, etc."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
            maxLength={200}
          />
          <p className="text-xs text-gray-500 mt-1">
            {notes.length}/200 caracteres
          </p>
        </div>

        {/* Subtotal */}
        <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
          <span className="text-sm font-semibold text-gray-700">
            Subtotal:
          </span>
          <span className="text-xl font-bold text-blue-600">
            {formatCurrency(subtotal)}
          </span>
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={handleClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleAdd}
            className="flex-1"
          >
            <Plus className="w-5 h-5 mr-2" />
            Agregar al Carrito
          </Button>
        </div>
      </div>
    </Modal>
  );
}
