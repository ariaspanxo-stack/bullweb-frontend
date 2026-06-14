// ═══════════════════════════════════════════════════════════════
// MODIFIERS MODAL - Selección de modificadores para productos
// Permite agregar extras y personalizaciones con precios
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import type { ProductModifier } from '../../../types/restaurant.types';

interface ModifiersModalProps {
  isOpen: boolean;
  productName: string;
  availableModifiers: ProductModifier[];
  selectedModifiers: ProductModifier[];
  basePrice: number;
  onConfirm: (modifiers: ProductModifier[], notes: string) => void;
  onClose: () => void;
}

export const ModifiersModal = ({
  isOpen,
  productName,
  availableModifiers,
  selectedModifiers: initialSelectedModifiers,
  basePrice,
  onConfirm,
  onClose
}: ModifiersModalProps) => {
  // ========== ESTADO ==========
  const [selectedModifiers, setSelectedModifiers] = useState<ProductModifier[]>(initialSelectedModifiers);
  const [notes, setNotes] = useState('');

  // Resetear estado cuando se abre/cierra
  useEffect(() => {
    if (isOpen) {
      setSelectedModifiers(initialSelectedModifiers);
      setNotes('');
    }
  }, [isOpen, initialSelectedModifiers]);

  // ========== HANDLERS ==========
  const handleToggleModifier = (modifier: ProductModifier) => {
    const isSelected = selectedModifiers.some(m => m.id === modifier.id);
    
    if (isSelected) {
      // Remover
      setSelectedModifiers(prev => prev.filter(m => m.id !== modifier.id));
    } else {
      // Agregar
      setSelectedModifiers(prev => [...prev, modifier]);
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedModifiers, notes);
    onClose();
  };

  // ========== CÁLCULOS ==========
  const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.price, 0);
  const finalPrice = basePrice + modifiersTotal;

  // Agrupar modificadores por categoría
  const modifiersByCategory = availableModifiers.reduce((acc, modifier) => {
    const category = modifier.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(modifier);
    return acc;
  }, {} as Record<string, ProductModifier[]>);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
        onClick={onClose}
      />

      {/* Modal centrado */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* ========== HEADER ========== */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Personalizar Producto</h2>
              <p className="text-orange-100 text-sm mt-1">{productName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* ========== CONTENT ========== */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* Pricing info */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl p-4 mb-6 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Precio base</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${basePrice.toLocaleString('es-CL')}
                  </p>
                </div>
                {modifiersTotal > 0 && (
                  <>
                    <Plus className="text-orange-500" size={20} />
                    <div>
                      <p className="text-sm text-gray-600">Modificadores</p>
                      <p className="text-lg font-semibold text-orange-600">
                        ${modifiersTotal.toLocaleString('es-CL')}
                      </p>
                    </div>
                  </>
                )}
                <div className="text-right ml-auto">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-orange-600">
                    ${finalPrice.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            </div>

            {/* Modificadores disponibles */}
            {availableModifiers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  <Plus size={48} className="mx-auto" />
                </div>
                <p className="text-gray-500">No hay modificadores disponibles para este producto</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(modifiersByCategory).map(([category, modifiers]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {modifiers.map((modifier) => {
                        const isSelected = selectedModifiers.some(m => m.id === modifier.id);
                        
                        return (
                          <button
                            key={modifier.id}
                            onClick={() => handleToggleModifier(modifier)}
                            className={`
                              w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all
                              ${isSelected 
                                ? 'bg-orange-50 border-orange-500 shadow-md' 
                                : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              {/* Checkbox visual */}
                              <div className={`
                                w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                                ${isSelected 
                                  ? 'bg-orange-500 border-orange-500' 
                                  : 'border-gray-300'
                                }
                              `}>
                                {isSelected && <Check size={16} className="text-white" strokeWidth={3} />}
                              </div>
                              
                              <div className="text-left">
                                <p className={`font-medium ${isSelected ? 'text-orange-700' : 'text-gray-900'}`}>
                                  {modifier.name}
                                </p>
                              </div>
                            </div>

                            <div className={`
                              font-bold text-lg
                              ${isSelected ? 'text-orange-600' : 'text-gray-700'}
                            `}>
                              +${modifier.price.toLocaleString('es-CL')}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notas especiales */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notas especiales (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Sin cebolla, extra salsa..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* ========== FOOTER ========== */}
          <div className="p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
            >
              Confirmar - ${finalPrice.toLocaleString('es-CL')}
            </button>
          </div>
        </div>
 </div>
    </>
  );
};
