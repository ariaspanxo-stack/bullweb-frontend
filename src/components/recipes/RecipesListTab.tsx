import React, { useState } from 'react';
import type { Product } from '../../types/product.types';
import api from '../../services/api';
import toast from 'react-hot-toast';

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
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    if (!selectedProduct || !selectedIngredient || !qty) {
      toast.error('Selecciona producto, ingrediente y cantidad');
      return;
    }
    setLoading(true);
    try {
      await api.post('/inventory/recipes', {
        productId: selectedProduct,
        items: [{ ingredientId: selectedIngredient, quantity: Number(qty) }]
      });
      toast.success('Vinculación creada. El stock se descontará automáticamente.');
      setSelectedProduct(''); 
      setSelectedIngredient(''); 
      setQty(1);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Error al vincular');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Vincular Inventario</h2>
      <p className="text-gray-600">Selecciona un producto y el ingrediente que se descontará al venderlo.</p>

      <div className="bg-white p-6 rounded-xl border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
          <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full border rounded-lg p-2">
            <option value="">Seleccionar...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ingrediente a descontar</label>
          <select value={selectedIngredient} onChange={e => setSelectedIngredient(e.target.value)} className="w-full border rounded-lg p-2">
            <option value="">Seleccionar...</option>
            {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a descontar</label>
          <input type="number" min="0.01" step="0.01" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-full border rounded-lg p-2" />
        </div>
        <button onClick={handleLink} disabled={loading} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50">
          {loading ? 'Guardando...' : 'Vincular'}
        </button>
      </div>
    </div>
  );
};

export default RecipesListTab;
