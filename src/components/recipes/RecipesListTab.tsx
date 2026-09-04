import React, { useState } from 'react';
import type { Product } from '../../types/product.types';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  recipes: any[];
  products: Product[];
  ingredients: any[];
  onAddRecipe: () => void;
  onEditRecipe: (r: any) => void;
  onDeleteRecipe: (r: any) => void;
}

export const RecipesListTab: React.FC<Props> = ({ products = [], ingredients = [] }) => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [items, setItems] = useState<{ ingredientId: string; quantity: number }[]>([{ ingredientId: '', quantity: 1 }]);
  const [loading, setLoading] = useState(false);

  const handleAddItem = () => {
    setItems([...items, { ingredientId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: 'ingredientId' | 'quantity', value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleLink = async () => {
    if (!selectedProduct) {
      toast.error('Selecciona un producto');
      return;
    }
    const validItems = items.filter(i => i.ingredientId && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Agrega al menos un ingrediente válido');
      return;
    }

    setLoading(true);
    try {
      await api.post('/inventory/recipes', {
        productId: selectedProduct,
        items: validItems
      });
      toast.success('Vinculación creada. El stock se descontará automáticamente.');
      setSelectedProduct('');
      setItems([{ ingredientId: '', quantity: 1 }]);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al vincular');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Vincular Inventario</h2>
      <p className="text-gray-600">Selecciona un producto y agrega los ingredientes que se descontarán al venderlo.</p>

      <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Producto a vincular</label>
          <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full border rounded-lg p-2">
            <option value="">Seleccionar producto...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Ingredientes a descontar</label>
          {items.map((item, index) => {
            const selectedIngredientData = ingredients.find(i => i.id === item.ingredientId);
            const ingredientUnit = selectedIngredientData?.unit || '';
            return (
              <div key={index} className="flex items-center gap-2">
                <select 
                  value={item.ingredientId} 
                  onChange={e => handleItemChange(index, 'ingredientId', e.target.value)} 
                  className="flex-1 border rounded-lg p-2"
                >
                  <option value="">Seleccionar ingrediente...</option>
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={item.quantity}
                  onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                  className="w-24 border rounded-lg p-2"
                  placeholder="Cant."
                />
                <span className="bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg p-2 text-gray-600 text-sm font-medium w-14 text-center">
                  {ingredientUnit}
                </span>
                {/* H126: hint de equivalencia — la celda descuenta en la unidad del ingrediente (0.12 kg = 120 gr) */}
                {(ingredientUnit === 'kg' || ingredientUnit === 'L') && (
                  <span className="text-xs text-gray-500 w-32 flex-shrink-0">
                    = {Number(item.quantity * 1000).toLocaleString('es-CL')} {ingredientUnit === 'kg' ? 'gr' : 'ml'}
                  </span>
                )}
                {(ingredientUnit === 'g' || ingredientUnit === 'ml') && (
                  <span className="text-xs text-gray-500 w-32 flex-shrink-0">
                    = {Number(item.quantity).toLocaleString('es-CL')} {ingredientUnit === 'g' ? 'gr' : 'ml'}
                  </span>
                )}
                {(ingredientUnit === 'unit' || ingredientUnit === 'unidad') && (
                  <span className="text-xs text-gray-500 w-32 flex-shrink-0">
                    unidades
                  </span>
                )}
                <button 
                  onClick={() => handleRemoveItem(index)} 
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  disabled={items.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <button onClick={handleAddItem} className="text-sm text-orange-600 font-medium flex items-center gap-1">
          <Plus className="w-4 h-4" /> Agregar otro ingrediente
        </button>

        <div className="pt-4 border-t">
          <button onClick={handleLink} disabled={loading} className="bg-orange-500 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Guardando...' : 'Guardar Vinculación'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipesListTab;
