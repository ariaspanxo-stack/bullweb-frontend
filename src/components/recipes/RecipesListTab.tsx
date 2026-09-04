import React, { useState, useEffect } from 'react';
import type { Product } from '../../types/product.types';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface Props {
  recipes: any[];
  products: Product[];
  ingredients: any[];
  onAddRecipe: () => void;
  onEditRecipe: (r: any) => void;
  onDeleteRecipe: (r: any) => void;
}

// H128: la ficha real del GET — products anidado, recipe_items con ingredients anidados, totalCost calculado
interface RecipeItem {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: string;
  ingredients?: { name: string; unit: string; unitCost?: number };
}

interface RecipeRow {
  id: string;
  productId: string;
  products?: { id: string; name: string } | null;
  recipe_items?: RecipeItem[];
  totalCost?: number;
  notes?: string | null;
  instructions?: string | null;
  createdAt?: string;
}

export const RecipesListTab: React.FC<Props> = ({ products = [], ingredients = [], recipes = [] }) => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [items, setItems] = useState<{ ingredientId: string; quantity: number }[]>([{ ingredientId: '', quantity: 1 }]);
  const [loading, setLoading] = useState(false);

  // H128: gestión de fichas — lista local (re-fetch tras cada mutación) + estado de edición inline
  const [localRecipes, setLocalRecipes] = useState<RecipeRow[]>([]);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // H128: la prop recipes del padre es la fuente inicial; el re-fetch local la mantiene viva tras crear/editar/eliminar
  useEffect(() => {
    setLocalRecipes(recipes as RecipeRow[]);
  }, [recipes]);

  // H128: re-fetch de la lista (vía servicio directo — wiring CERO padre)
  const loadRecipes = async () => {
    try {
      const recs = await api.recipes.getAll();
      setLocalRecipes(Array.isArray(recs) ? (recs as RecipeRow[]) : []);
    } catch {
      // silencioso: la lista existente sigue visible; el toast de la mutación ya informó el resultado
    }
  };

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

  // H128: botón ✏️ — carga la ficha en el formulario inline (producto bloqueado, items restaurados)
  const handleEdit = (recipe: RecipeRow) => {
    setEditingRecipeId(recipe.id);
    setSelectedProduct(recipe.productId);
    const loaded = (recipe.recipe_items ?? []).map(ri => ({
      ingredientId: ri.ingredientId,
      quantity: ri.quantity,
    }));
    setItems(loaded.length > 0 ? loaded : [{ ingredientId: '', quantity: 1 }]);
    // scroll al formulario para que la edición sea visible
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // H128: restaurar el formulario a su estado de creación
  const handleCancelEdit = () => {
    setEditingRecipeId(null);
    setSelectedProduct('');
    setItems([{ ingredientId: '', quantity: 1 }]);
  };

  // H128: botón 🗑️ — confirmación + DELETE vía servicio directo + refresco
  const handleDelete = async (recipe: RecipeRow) => {
    const productName = recipe.products?.name ?? 'este producto';
    if (!window.confirm(`¿Eliminar la ficha técnica de "${productName}"? El stock dejará de descontarse al venderlo.`)) {
      return;
    }
    setDeletingId(recipe.id);
    try {
      await api.recipes.delete(recipe.id);
      toast.success('Ficha técnica eliminada');
      await loadRecipes();
    } catch (e: any) {
      toast.error(e?.message || e?.response?.data?.error || 'Error al eliminar la ficha');
    } finally {
      setDeletingId(null);
    }
  };

  // H128: submit bifurcado — POST (crear) / PATCH :id (editar) — el producto se bloquea en edición
  // porque el backend rechaza duplicados por productId y el PATCH no cambia de producto
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
      if (editingRecipeId) {
        await api.recipes.update(editingRecipeId, {
          items: validItems,
        });
        toast.success('Ficha actualizada. El costo del producto se recalculó.');
        handleCancelEdit();
      } else {
        await api.post('/inventory/recipes', {
          productId: selectedProduct,
          items: validItems
        });
        toast.success('Vinculación creada. El stock se descontará automáticamente.');
        setSelectedProduct('');
        setItems([{ ingredientId: '', quantity: 1 }]);
      }
      await loadRecipes();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Error al vincular');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Vincular Inventario</h2>
      <p className="text-gray-600">Selecciona un producto y agrega los ingredientes que se descontarán al venderlo.</p>

      <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
        {editingRecipeId && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-sm font-medium text-blue-900">
              Editando ficha — el producto no se puede cambiar
            </span>
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
              title="Cancelar edición"
              aria-label="Cancelar edición"
            >
              <X className="w-4 h-4" /> Cancelar edición
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Producto a vincular</label>
          <select
            value={selectedProduct}
            onChange={e => setSelectedProduct(e.target.value)}
            disabled={!!editingRecipeId}
            className="w-full border rounded-lg p-2 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
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
            {loading ? 'Guardando...' : editingRecipeId ? 'Actualizar ficha' : 'Guardar Vinculación'}
          </button>
        </div>
      </div>

      {/* H128: LA LISTA — las fichas creadas, con costo total del backend, editar y eliminar */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Fichas técnicas creadas</h3>
        <p className="text-sm text-gray-600 mb-4">
          {localRecipes.length} ficha{localRecipes.length !== 1 ? 's' : ''} — el costo total lo calcula el sistema con los costos de los ingredientes.
        </p>

        {localRecipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-3">📋</div>
            <h4 className="text-base font-semibold text-gray-900 mb-1">Aún no hay fichas técnicas</h4>
            <p className="text-sm text-gray-600">Crea la primera con el formulario de arriba</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localRecipes.map((recipe) => {
              const itemCount = recipe.recipe_items?.length ?? 0;
              const productName = recipe.products?.name
                ?? products.find(p => p.id === recipe.productId)?.name
                ?? 'Producto';
              return (
                <div
                  key={recipe.id}
                  className={`bg-white rounded-xl border overflow-hidden transition-all ${
                    editingRecipeId === recipe.id
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:shadow-lg'
                  }`}
                >
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 leading-tight">{productName}</h4>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {itemCount} ingrediente{itemCount !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Items resumidos */}
                    <div className="space-y-1">
                      {recipe.recipe_items?.slice(0, 3).map((ri) => (
                        <p key={ri.id} className="text-xs text-gray-600 truncate">
                          • {ri.ingredients?.name ?? 'Ingrediente'} — {ri.quantity} {ri.ingredients?.unit ?? ri.unit ?? ''}
                        </p>
                      ))}
                      {itemCount > 3 && (
                        <p className="text-xs text-gray-500">+ {itemCount - 3} más</p>
                      )}
                    </div>

                    {/* Costo total (del GET — tal cual llega del backend, sin adornos) */}
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-600">Costo total</p>
                      <p className="text-lg font-bold text-gray-900 tabular-nums">
                        {formatCurrency(Number(recipe.totalCost ?? 0))}
                      </p>
                    </div>

                    {/* Notas (solo si el GET las trae) */}
                    {recipe.notes && (
                      <p className="text-xs text-gray-600 line-clamp-1">{recipe.notes}</p>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleEdit(recipe)}
                        disabled={editingRecipeId !== null || deletingId !== null}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Editar ficha"
                        aria-label={`Editar ficha de ${productName}`}
                      >
                        <Pencil className="w-4 h-4" /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(recipe)}
                        disabled={deletingId !== null || editingRecipeId !== null}
                        className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Eliminar ficha"
                        aria-label={`Eliminar ficha de ${productName}`}
                      >
                        <Trash2 className={`w-4 h-4 ${deletingId === recipe.id ? 'animate-pulse' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipesListTab;
