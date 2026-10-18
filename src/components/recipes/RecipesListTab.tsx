import React, { useState, useEffect } from 'react';
import type { Product } from '../../types/product.types';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, X } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { BTN_OUTLINE, BTN_PRIMARY, CARD, MarginBadge, SUBTITLE, TITLE, TrashButton, formatQty, formatUnit } from '../products/productsUi';

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
  products?: { id: string; name: string; price?: number | null } | null; // H235: price para el margen de la card
  recipe_items?: RecipeItem[];
  totalCost?: number;
  notes?: string | null;
  instructions?: string | null;
  createdAt?: string;
  yield?: number | null; // H235: columnas implícitas del findMany — rinde condicional en la card
  yieldUnit?: string | null;
}

const FIELD = 'h-11 border border-[#CBD5E1] rounded-lg px-3 bg-white text-sm text-[#0F172A] focus:outline-none focus:border-[#F97316]';

export const RecipesListTab: React.FC<Props> = ({ products = [], ingredients = [], recipes = [] }) => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [items, setItems] = useState<{ ingredientId: string; quantity: number }[]>([{ ingredientId: '', quantity: 1 }]);
  const [loading, setLoading] = useState(false);

  // H128: gestión de fichas — lista local (re-fetch tras cada mutación) + estado de edición inline
  const [localRecipes, setLocalRecipes] = useState<RecipeRow[]>([]);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Hotfix #258: el formulario queda arriba pero colapsado; se abre con "Nueva ficha" o al editar
  const [formOpen, setFormOpen] = useState(false);
  const showForm = formOpen || editingRecipeId !== null;

  // H128: la prop recipes del padre es la fuente inicial; el re-fetch local la mantiene viva tras crear/editar/eliminar
  useEffect(() => {
    setLocalRecipes(recipes as RecipeRow[]);
  }, [recipes]);

  // H128: re-fetch de la lista (vía servicio directo — wiring CERO padre)
  // H235: flag de re-fetch — texto breve sobre la lista mientras refresca (el catch silencioso se mantiene)
  const [refreshing, setRefreshing] = useState(false);

  const loadRecipes = async () => {
    setRefreshing(true);
    try {
      const recs = await api.recipes.getAll();
      setLocalRecipes(Array.isArray(recs) ? (recs as RecipeRow[]) : []);
    } catch {
      // silencioso: la lista existente sigue visible; el toast de la mutación ya informó el resultado
    } finally {
      setRefreshing(false);
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
    setFormOpen(true);
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
    setFormOpen(false);
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
        setFormOpen(false);
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
      {/* Encabezado — A4/A5: el título coincide con la pestaña */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className={TITLE}>Fichas técnicas</h2>
          <p className={SUBTITLE}>Ingredientes que se descuentan del inventario al vender cada producto.</p>
        </div>
        {!showForm && (
          <button onClick={() => setFormOpen(true)} className={BTN_PRIMARY}>
            <Plus className="w-5 h-5" />
            Nueva ficha
          </button>
        )}
      </div>

      {/* Formulario colapsable (misma lógica de guardado) */}
      {showForm && (
        <div className={`${CARD} p-6 space-y-4`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-[#0F172A]">
              {editingRecipeId ? 'Editar ficha — el producto no se puede cambiar' : 'Nueva ficha'}
            </h3>
            <button
              onClick={handleCancelEdit}
              className={BTN_OUTLINE}
              title={editingRecipeId ? 'Cancelar edición' : 'Cerrar formulario'}
              aria-label={editingRecipeId ? 'Cancelar edición' : 'Cerrar formulario'}
            >
              <X className="w-4 h-4" /> {editingRecipeId ? 'Cancelar edición' : 'Cerrar'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#475569] mb-1">Producto</label>
            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              disabled={!!editingRecipeId}
              className={`${FIELD} w-full disabled:bg-[#F1F5F9] disabled:text-[#64748B] disabled:cursor-not-allowed`}
            >
              <option value="">Seleccionar producto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-[#475569]">Ingredientes a descontar</label>
            {items.map((item, index) => {
              const selectedIngredientData = ingredients.find(i => i.id === item.ingredientId);
              const rawUnit = selectedIngredientData?.unit || '';
              const ingredientUnit = formatUnit(rawUnit);
              return (
                <div key={index} className="flex items-center gap-2 flex-wrap">
                  <select
                    value={item.ingredientId}
                    onChange={e => handleItemChange(index, 'ingredientId', e.target.value)}
                    className={`${FIELD} flex-1 min-w-[180px]`}
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
                    className={`${FIELD} w-24`}
                    placeholder="Cant."
                  />
                  <span className="h-11 inline-flex items-center justify-center bg-[#F1F5F9] rounded-lg px-2 text-[#475569] text-sm font-semibold min-w-[56px]">
                    {ingredientUnit}
                  </span>
                  {/* H126: hint de equivalencia — la celda descuenta en la unidad del ingrediente (0.12 kg = 120 gr) */}
                  {(ingredientUnit === 'kg' || ingredientUnit === 'L') && (
                    <span className="text-xs text-[#64748B] w-28 flex-shrink-0">
                      = {formatQty(item.quantity * 1000)} {ingredientUnit === 'kg' ? 'g' : 'ml'}
                    </span>
                  )}
                  {(ingredientUnit === 'g' || ingredientUnit === 'ml') && (
                    <span className="text-xs text-[#64748B] w-28 flex-shrink-0">
                      = {formatQty(item.quantity)} {ingredientUnit}
                    </span>
                  )}
                  {ingredientUnit === 'unidad' && (
                    <span className="text-xs text-[#64748B] w-28 flex-shrink-0">unidades</span>
                  )}
                  {/* H235: costo en vivo de la línea — qty × unitCost del ingrediente seleccionado */}
                  {selectedIngredientData?.unitCost != null && (
                    <span className="text-xs font-bold text-[#0F172A] tabular-nums w-24 flex-shrink-0">
                      {formatCurrency(item.quantity * selectedIngredientData.unitCost)}
                    </span>
                  )}
                  <TrashButton
                    onClick={() => handleRemoveItem(index)}
                    label="Quitar ingrediente"
                    disabled={items.length === 1}
                    className="ml-4"
                  />
                </div>
              );
            })}
          </div>

          <button onClick={handleAddItem} className={BTN_OUTLINE}>
            <Plus className="w-4 h-4" /> Agregar otro ingrediente
          </button>

          {/* H235: costo estimado en vivo — Σ de líneas válidas (ingredientId + quantity > 0), se confirma al guardar */}
          <div className="bg-[#F8FAFC] rounded-lg p-3">
            <p className="font-bold text-[#0F172A] tabular-nums">
              Costo estimado: {formatCurrency(
                items.reduce((sum, it) => {
                  const ing = ingredients.find(i => i.id === it.ingredientId);
                  if (it.ingredientId && it.quantity > 0 && ing?.unitCost != null) return sum + it.quantity * ing.unitCost;
                  return sum;
                }, 0)
              )}
            </p>
            <p className="text-xs text-[#64748B] mt-0.5">se confirma al guardar</p>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0]">
            <button onClick={handleLink} disabled={loading} className={BTN_PRIMARY}>
              {loading ? 'Guardando...' : editingRecipeId ? 'Actualizar ficha' : 'Guardar ficha'}
            </button>
          </div>
        </div>
      )}

      {/* H128: LA LISTA — las fichas creadas, con costo total del backend, editar y eliminar */}
      <div>
        <h3 className="text-lg font-bold text-[#0F172A] mb-1">Fichas creadas</h3>
        <p className="text-sm text-[#64748B] mb-4">
          {localRecipes.length} ficha{localRecipes.length !== 1 ? 's' : ''} — el costo total lo calcula el sistema con los costos de los ingredientes.
          {refreshing && <span className="ml-2 text-xs text-[#94A3B8]">Actualizando lista…</span>}
        </p>

        {localRecipes.length === 0 ? (
          <div className={`${CARD} text-center py-12`}>
            <div className="text-5xl mb-3">📋</div>
            <h4 className="text-base font-bold text-[#0F172A] mb-1">Aún no hay fichas técnicas</h4>
            <p className="text-sm text-[#64748B]">Crea la primera con "Nueva ficha"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localRecipes.map((recipe) => {
              const itemCount = recipe.recipe_items?.length ?? 0;
              const productName = recipe.products?.name
                ?? products.find(p => p.id === recipe.productId)?.name
                ?? 'Producto';
              const totalCost = Number(recipe.totalCost ?? 0);
              const venta = recipe.products?.price ?? products.find(p => p.id === recipe.productId)?.price;
              return (
                <div
                  key={recipe.id}
                  className={`${CARD} overflow-hidden flex flex-col transition-shadow ${
                    editingRecipeId === recipe.id ? 'ring-2 ring-[#F97316] border-[#F97316]' : 'hover:shadow-md'
                  }`}
                >
                  <div className="p-4 space-y-3 flex flex-col flex-1">
                    <div>
                      <h4 className="font-bold text-[#0F172A] leading-tight">{productName}</h4>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {itemCount} ingrediente{itemCount !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Items resumidos — cantidades con máximo 2 decimales y unidad única */}
                    <div className="space-y-1">
                      {recipe.recipe_items?.slice(0, 3).map((ri) => (
                        <p key={ri.id} className="text-xs text-[#475569] truncate">
                          • {ri.ingredients?.name ?? 'Ingrediente'} — {formatQty(ri.quantity)} {formatUnit(ri.ingredients?.unit ?? ri.unit ?? '')}
                        </p>
                      ))}
                      {itemCount > 3 && <p className="text-xs text-[#94A3B8]">+ {itemCount - 3} más</p>}
                    </div>

                    {/* Costo total grande */}
                    <div className="bg-[#F8FAFC] rounded-lg p-2.5">
                      <p className="text-xs text-[#64748B]">Costo total</p>
                      <p className="text-2xl font-bold text-[#0F172A] tabular-nums">{formatCurrency(totalCost)}</p>
                    </div>

                    {/* Venta y margen (13px, color por rango; costo 0 => "Sin costo cargado") */}
                    {venta != null && venta > 0 ? (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[13px] text-[#475569]">
                          Venta <span className="font-bold text-[#0F172A]">{formatCurrency(venta)}</span>
                        </span>
                        <MarginBadge price={venta} cost={totalCost} />
                      </div>
                    ) : (
                      <p className="text-[13px] text-[#94A3B8]">Sin precio de venta</p>
                    )}

                    {/* H235: rinde condicional — solo si el GET trae yield > 1, sin ceros ni guiones */}
                    {Number(recipe.yield) > 1 && (
                      <p className="text-xs text-[#475569]">Rinde {formatQty(Number(recipe.yield))} {formatUnit(recipe.yieldUnit ?? '')}</p>
                    )}

                    {/* Notas (solo si el GET las trae) */}
                    {recipe.notes && <p className="text-xs text-[#64748B] line-clamp-1">{recipe.notes}</p>}

                    {/* Acciones — A6/A7 */}
                    <div className="flex items-center gap-2 pt-1 mt-auto">
                      <button
                        onClick={() => handleEdit(recipe)}
                        disabled={editingRecipeId !== null || deletingId !== null}
                        className={`${BTN_OUTLINE} flex-1`}
                        title="Editar ficha"
                        aria-label={`Editar ficha de ${productName}`}
                      >
                        <Pencil className="w-4 h-4" /> Editar
                      </button>
                      <TrashButton
                        onClick={() => handleDelete(recipe)}
                        disabled={deletingId !== null || editingRecipeId !== null}
                        label={`Eliminar ficha de ${productName}`}
                        className={`ml-4 ${deletingId === recipe.id ? 'animate-pulse' : ''}`}
                      />
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
