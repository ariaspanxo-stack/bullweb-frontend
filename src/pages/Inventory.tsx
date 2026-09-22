import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import InventoryTabs from '@/components/inventory/InventoryTabs';
import IngredientsTable from '@/components/inventory/IngredientsTable';
import IngredientFormModal from '@/components/inventory/IngredientFormModal';
import RecipesList from '@/components/inventory/RecipesList';
import RecipeFormModal from '@/components/inventory/RecipeFormModal';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { Plus, Search, AlertCircle, ShoppingCart, ArrowUpDown, Truck, Pencil, Trash2, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToExcel, clp, fmtDateTime } from '@/utils/exportExcel';
import { usePermission } from '@/hooks/usePermission';

export default function Inventory() {
  const queryClient = useQueryClient();
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes' | 'purchases' | 'movements' | 'suppliers'>('ingredients');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<any>(null);

  const canPurchases   = usePermission('inventory.purchases');
  const canAdjustments = usePermission('inventory.adjustments');
  const showNewButton  =
    (activeTab === 'ingredients' && canPurchases) ||
    activeTab === 'recipes' ||
    (activeTab === 'purchases' && canPurchases) ||
    (activeTab === 'movements' && canAdjustments) ||
    (activeTab === 'suppliers' && canPurchases);

  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);

  const deleteIngredientMutation = useMutation({
    mutationFn: (ingredientId: string) => inventoryService.deleteIngredient(ingredientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      toast.success('Ingrediente eliminado');
    }
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: (recipeId: string) => inventoryService.deleteRecipe(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Receta eliminada');
    }
  });

  // Queries para compras/movimientos
  const { data: allIngredients } = useQuery({
    queryKey: ['ingredients-all'],
    queryFn: () => inventoryService.getIngredients({ perPage: 200 }),
    staleTime: 60000,
  });
  const ingredientsList: any[] = Array.isArray(allIngredients)
    ? allIngredients
    : (allIngredients as any)?.ingredients ?? [];

  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => inventoryService.getPurchases({ perPage: 50 }),
    enabled: activeTab === 'purchases',
  });

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ['movements'],
    queryFn: () => inventoryService.getMovements({ perPage: 50 }),
    enabled: activeTab === 'movements',
  });

  const purchasesList: any[] = Array.isArray(purchasesData)
    ? purchasesData
    : (purchasesData as any)?.purchases ?? [];
  const movementsList: any[] = Array.isArray(movementsData)
    ? movementsData
    : (movementsData as any)?.movements ?? [];

  const createPurchaseMutation = useMutation({
    mutationFn: inventoryService.createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients-all'] });
      setIsPurchaseModalOpen(false);
      toast.success('Compra registrada correctamente');
    },
    onError: (err: any) => toast.error(err.message || 'Error al registrar compra'),
  });

  const createMovementMutation = useMutation({
    mutationFn: inventoryService.createMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients-all'] });
      setIsMovementModalOpen(false);
      toast.success('Movimiento registrado');
    },
    onError: (err: any) => toast.error(err.message || 'Error al registrar movimiento'),
  });

  // Proveedores
  const { data: suppliersData, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => inventoryService.getSuppliers({ perPage: 100 }),
    enabled: activeTab === 'suppliers',
  });

  const suppliersList: any[] = (suppliersData as any)?.suppliers ?? [];

  const createSupplierMutation = useMutation({
    mutationFn: inventoryService.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsSupplierModalOpen(false);
      setEditingSupplier(null);
      toast.success('Proveedor creado');
    },
    onError: (err: any) => toast.error(err.message || 'Error al crear proveedor'),
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => inventoryService.updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsSupplierModalOpen(false);
      setEditingSupplier(null);
      toast.success('Proveedor actualizado');
    },
    onError: (err: any) => toast.error(err.message || 'Error al actualizar proveedor'),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: inventoryService.deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Proveedor eliminado');
    },
    onError: (err: any) => toast.error(err.message || 'Error al eliminar proveedor'),
  });

  const handleEditIngredient = (ingredient: any) => {
    setEditingIngredient(ingredient);
    setIsIngredientModalOpen(true);
  };

  const handleDeleteIngredient = async (ingredient: any) => {
    const ok = await confirmDialog({ message: `¿Eliminar "${ingredient.name}"?`, confirmLabel: 'Eliminar' });
    if (ok) deleteIngredientMutation.mutate(ingredient.id);
  };

  const handleEditRecipe = (recipe: any) => {
    setEditingRecipe(recipe);
    setIsRecipeModalOpen(true);
  };

  const handleDeleteRecipe = async (recipe: any) => {
    const ok = await confirmDialog({ message: `¿Eliminar receta de "${recipe.product.name}"?`, confirmLabel: 'Eliminar' });
    if (ok) deleteRecipeMutation.mutate(recipe.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Inventario</h1>
          <p className="text-gray-400 mt-1">Control de stock, recetas y movimientos</p>
        </div>
        {showNewButton && (
          <Button
            onClick={() => {
              if (activeTab === 'ingredients') {
                setEditingIngredient(null);
                setIsIngredientModalOpen(true);
              } else if (activeTab === 'recipes') {
                setEditingRecipe(null);
                setIsRecipeModalOpen(true);
              } else if (activeTab === 'purchases') {
                setIsPurchaseModalOpen(true);
              } else if (activeTab === 'movements') {
                setIsMovementModalOpen(true);
              } else if (activeTab === 'suppliers') {
                setEditingSupplier(null);
                setIsSupplierModalOpen(true);
              }
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo
          </Button>
        )}
        <button
          onClick={() => {
            const purchases: any[] = (purchasesData as any)?.purchases ?? [];
            const movements: any[] = (movementsData as any)?.movements ?? [];
            const suppliers: any[] = suppliersList;
            exportToExcel([
              {
                sheetName: 'Ingredientes',
                rows: ingredientsList.map((i: any) => ({
                  'Nombre': i.name,
                  'Categoría': i.category ?? '—',
                  'Stock': i.currentStock ?? 0,
                  'Unidad': i.unit ?? '—',
                  'Stock Mínimo': i.minimumStock ?? 0,
                  'Costo unit.': i.costPerUnit ?? 0,
                  'Stock Bajo': (i.currentStock ?? 0) <= (i.minimumStock ?? 0) ? 'SÍ' : 'NO',
                })),
              },
              {
                sheetName: 'Compras',
                rows: purchases.map((p: any) => ({
                  'Fecha': fmtDateTime(p.createdAt),
                  'Proveedor': p.supplier ?? '—',
                  'Ítems': Array.isArray(p.items) ? p.items.length : 0,
                  'Total (CLP)': p.total ?? 0,
                  'Total fmt': clp(p.total),
                  'Estado': p.status ?? '—',
                  'Notas': p.notes ?? '—',
                })),
              },
              {
                sheetName: 'Movimientos',
                rows: movements.map((m: any) => ({
                  'Fecha': fmtDateTime(m.createdAt),
                  'Tipo': m.type,
                  'Ingrediente': m.ingredient?.name ?? '—',
                  'Cantidad': m.quantity ?? 0,
                  'Unidad': m.unit ?? '—',
                  'Notas': m.notes ?? '—',
                })),
              },
              {
                sheetName: 'Proveedores',
                rows: suppliers.map((s: any) => ({
                  'Nombre': s.name,
                  'Contacto': s.contact ?? '—',
                  'Teléfono': s.phone ?? '—',
                  'Email': s.email ?? '—',
                  'Dirección': s.address ?? '—',
                })),
              },
            ], 'Inventario');
            toast.success('Inventario exportado a Excel (4 hojas)');
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors"
        >
          <FileDown className="w-4 h-4" />
          Exportar Excel
        </button>
      </div>

      {/* Tabs */}
      <InventoryTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Contenido por tab */}
      {activeTab === 'ingredients' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white/5 rounded-lg border border-white/10 p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar ingredientes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-white/10 rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors [color-scheme:dark]"
                />
              </div>
              <button
                onClick={() => setShowLowStock(!showLowStock)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                  showLowStock
                    ? 'border-red-500 bg-red-500/10 !text-red-400'
                    : 'border-white/10 !text-gray-400 hover:border-white/20'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
                Stock Bajo
              </button>
            </div>
          </div>

          {/* Tabla */}
          <IngredientsTable
            searchQuery={searchQuery}
            showLowStock={showLowStock}
            onEdit={handleEditIngredient}
            onDelete={handleDeleteIngredient}
            onCreate={() => {
              setEditingIngredient(null);
              setIsIngredientModalOpen(true);
            }}
          />
        </div>
      )}

      {activeTab === 'recipes' && (
        <RecipesList
          onEdit={handleEditRecipe}
          onDelete={handleDeleteRecipe}
          onCreate={() => {
            setEditingRecipe(null);
            setIsRecipeModalOpen(true);
          }}
        />
      )}

      {activeTab === 'purchases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-white">Registro de Compras</h2>
            </div>
          </div>

          {purchasesLoading ? (
            <div className="text-center py-8 text-gray-400">Cargando compras...</div>
          ) : (
            <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-400 uppercase bg-white/5 border-b border-white/10">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Ítems</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {purchasesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        No hay compras registradas
                      </td>
                    </tr>
                  ) : (
                    purchasesList.map((purchase: any) => (
                      <tr key={purchase.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {new Date(purchase.createdAt).toLocaleDateString('es-CL')}
                        </td>
                        <td className="px-4 py-3 font-medium text-white">{purchase.supplier || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {Array.isArray(purchase.items) ? purchase.items.length : 0} ítem(s)
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">
                          ${Math.round(purchase.total ?? 0).toLocaleString('es-CL')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            purchase.status === 'RECEIVED'
                              ? 'bg-emerald-500/20 !text-emerald-400'
                              : 'bg-amber-500/20 !text-amber-400'
                          }`}>
                            {purchase.status === 'RECEIVED' ? 'Recibido' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {purchase.notes || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Movimientos de Stock</h2>
          </div>

          {movementsLoading ? (
            <div className="text-center py-8 text-gray-400">Cargando movimientos...</div>
          ) : (
            <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-400 uppercase bg-white/5 border-b border-white/10">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Ingrediente</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Cantidad</th>
                    <th className="px-4 py-3">Stock Anterior</th>
                    <th className="px-4 py-3">Stock Nuevo</th>
                    <th className="px-4 py-3">Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {movementsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        No hay movimientos registrados
                      </td>
                    </tr>
                  ) : (
                    movementsList.map((mov: any) => {
                      const typeLabel: Record<string, string> = {
                        PURCHASE: 'Compra',
                        SALE: 'Venta',
                        WASTE: 'Merma',
                        ADJUSTMENT: 'Ajuste',
                      };
                      const typeColor: Record<string, string> = {
                        PURCHASE: 'bg-blue-500/20 !text-blue-400',
                        SALE: 'bg-purple-500/20 !text-purple-400',
                        WASTE: 'bg-red-500/20 !text-red-400',
                        ADJUSTMENT: 'bg-amber-500/20 !text-amber-400',
                      };
                      return (
                        <tr key={mov.id} className="border-t border-white/5 hover:bg-white/5">
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {new Date(mov.createdAt).toLocaleDateString('es-CL')}
                          </td>
                          <td className="px-4 py-3 font-medium text-white">{mov.ingredients?.name ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${typeColor[mov.type] ?? 'bg-white/10 !text-gray-300'}`}>
                              {typeLabel[mov.type] ?? mov.type}
                            </span>
                          </td>
                          <td className={`px-4 py-3 font-semibold ${mov.quantity < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {mov.quantity > 0 ? '+' : ''}{mov.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">{mov.previousStock}</td>
                          <td className="px-4 py-3 text-sm font-medium text-white">{mov.newStock}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{mov.reference || mov.notes || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Proveedores</h2>
          </div>

          {suppliersLoading ? (
            <div className="text-center py-8 text-gray-400">Cargando proveedores...</div>
          ) : (
            <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-400 uppercase bg-white/5 border-b border-white/10">
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">RUT/NIF</th>
                    <th className="px-4 py-3">Compras</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliersList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        No hay proveedores registrados
                      </td>
                    </tr>
                  ) : (
                    suppliersList.map((s: any) => (
                      <tr key={s.id} className="border-t border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{s.contactName || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{s.email || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{s.phone || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{s.taxId || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{s._count?.purchases ?? 0}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEditingSupplier(s); setIsSupplierModalOpen(true); }}
                              className="p-1.5 text-gray-400 hover:text-brand-400 hover:bg-white/10 rounded"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                const ok = await confirmDialog({ message: `¿Eliminar proveedor "${s.name}"?`, confirmLabel: 'Eliminar' });
                                if (ok) deleteSupplierMutation.mutate(s.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      <IngredientFormModal
        isOpen={isIngredientModalOpen}
        onClose={() => {
          setIsIngredientModalOpen(false);
          setEditingIngredient(null);
        }}
        ingredient={editingIngredient}
      />

      <RecipeFormModal
        isOpen={isRecipeModalOpen}
        onClose={() => {
          setIsRecipeModalOpen(false);
          setEditingRecipe(null);
        }}
        recipe={editingRecipe}
      />

      {/* Modal: Nueva Compra */}
      {isPurchaseModalOpen && (
        <PurchaseModal
          ingredients={ingredientsList}
          onClose={() => setIsPurchaseModalOpen(false)}
          onSubmit={(data) => createPurchaseMutation.mutate(data)}
          isSubmitting={createPurchaseMutation.isPending}
        />
      )}

      {/* Modal: Nuevo Movimiento */}
      {isMovementModalOpen && (
        <MovementModal
          ingredients={ingredientsList}
          onClose={() => setIsMovementModalOpen(false)}
          onSubmit={(data) => createMovementMutation.mutate(data)}
          isSubmitting={createMovementMutation.isPending}
        />
      )}

      {/* Modal: Proveedor */}
      {isSupplierModalOpen && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => { setIsSupplierModalOpen(false); setEditingSupplier(null); }}
          onSubmit={(data) => {
            if (editingSupplier) {
              updateSupplierMutation.mutate({ id: editingSupplier.id, data });
            } else {
              createSupplierMutation.mutate(data);
            }
          }}
          isSubmitting={createSupplierMutation.isPending || updateSupplierMutation.isPending}
        />
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ============================================================================
// PurchaseModal
// ============================================================================
function PurchaseModal({
  ingredients,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  ingredients: any[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}) {
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ingredientId: '', quantity: '', cost: '' }]);

  const addItem = () => setItems((prev) => [...prev, { ingredientId: '', quantity: '', cost: '' }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const handleSubmit = async () => {
    const validItems = items.filter((it) => it.ingredientId && it.quantity && it.cost);
    const invalidCount = items.length - validItems.length;

    // F-6: advertir sobre filas incompletas en lugar de descartar silenciosamente
    if (validItems.length === 0) {
      alert('Agrega al menos un ítem completo (ingrediente + cantidad + costo)');
      return;
    }
    if (invalidCount > 0) {
      const ok = await confirmDialog({
        message: `${invalidCount} fila${invalidCount > 1 ? 's' : ''} incompleta${invalidCount > 1 ? 's' : ''} se omitirá${invalidCount > 1 ? 'n' : ''}. ¿Guardar con ${validItems.length} ítem${validItems.length !== 1 ? 's' : ''} válido${validItems.length !== 1 ? 's' : ''}?`,
        confirmLabel: 'Guardar',
      });
      if (!ok) return;
    }

    onSubmit({
      supplier,
      notes,
      items: validItems.map((it) => ({
        ingredientId: it.ingredientId,
        quantity: parseFloat(it.quantity),
        cost: parseFloat(it.cost),
      })),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto shadow-xl">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Nueva Compra</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Proveedor</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full border border-white/10 rounded-lg px-3 py-2 bg-white/5 !text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors [color-scheme:dark]"
              placeholder="Nombre del proveedor (opcional)"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Ítems</label>
              <button type="button" onClick={addItem} className="text-sm text-brand-400 hover:text-brand-300 font-medium">
                + Agregar ítem
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr,88px,88px,28px] gap-2 text-xs text-gray-500 px-1">
                <span>Ingrediente</span><span>Cantidad</span><span>Costo/u</span><span />
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr,88px,88px,28px] gap-2 items-center">
                  <select
                    value={item.ingredientId}
                    onChange={(e) => updateItem(i, 'ingredientId', e.target.value)}
                    className="border border-white/10 rounded-lg px-2 py-1.5 text-sm bg-white/5 !text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 [color-scheme:dark]"
                  >
                    <option value="">Seleccionar...</option>
                    {ingredients.map((ing: any) => (
                      <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                    ))}
                  </select>
                  <input
                    type="number" value={item.quantity}
                    onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                    placeholder="0" min="0.01" step="0.01"
                    className="border border-white/10 rounded-lg px-2 py-1.5 text-sm bg-white/5 !text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 [color-scheme:dark]"
                  />
                  <input
                    type="number" value={item.cost}
                    onChange={(e) => updateItem(i, 'cost', e.target.value)}
                    placeholder="0" min="0" step="1"
                    className="border border-white/10 rounded-lg px-2 py-1.5 text-sm bg-white/5 !text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 [color-scheme:dark]"
                  />
                  {items.length > 1 ? (
                    <button type="button" onClick={() => removeItem(i)} className="text-gray-500 hover:text-red-400 text-xl leading-none">×</button>
                  ) : <span />}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notas</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm bg-white/5 !text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 [color-scheme:dark]"
              rows={2} placeholder="Notas adicionales..."
            />
          </div>
        </div>
        <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 !text-gray-400 hover:!text-gray-200">Cancelar</button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Registrar Compra'}
          </Button>
        </div>
      </div>
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ============================================================================
// MovementModal
// ============================================================================
function MovementModal({
  ingredients,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  ingredients: any[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}) {
  const [ingredientId, setIngredientId] = useState('');
  const [type, setType] = useState<'WASTE' | 'ADJUSTMENT'>('WASTE');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!ingredientId || !quantity) return;
    onSubmit({ ingredientId, type, quantity: parseFloat(quantity), reason });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-xl max-w-md w-full shadow-xl">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Agregar Movimiento</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Ingrediente</label>
            <select
              value={ingredientId} onChange={(e) => setIngredientId(e.target.value)}
              className="w-full border border-white/10 rounded-lg px-3 py-2 bg-white/5 !text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 [color-scheme:dark]"
            >
              <option value="">Seleccionar ingrediente...</option>
              {ingredients.map((ing: any) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} — stock actual: {ing.currentStock} {ing.unit}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de movimiento</label>
            <select
              value={type} onChange={(e) => setType(e.target.value as 'WASTE' | 'ADJUSTMENT')}
              className="w-full border border-white/10 rounded-lg px-3 py-2 bg-white/5 !text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 [color-scheme:dark]"
            >
              <option value="WASTE">Merma / Pérdida</option>
              <option value="ADJUSTMENT">Ajuste de inventario</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Cantidad</label>
            <input
              type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
              placeholder="0" min="0.01" step="0.01"
              className="w-full border border-white/10 rounded-lg px-3 py-2 bg-white/5 !text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Razón</label>
            <input
              type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Descripción del movimiento"
              className="w-full border border-white/10 rounded-lg px-3 py-2 bg-white/5 !text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 [color-scheme:dark]"
            />
          </div>
        </div>
        <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 !text-gray-400 hover:!text-gray-200">Cancelar</button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Registrar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SupplierModal
// ============================================================================
function SupplierModal({
  supplier,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  supplier: any | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(supplier?.name ?? '');
  const [contactName, setContactName] = useState(supplier?.contactName ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [taxId, setTaxId] = useState(supplier?.taxId ?? '');
  const [notes, setNotes] = useState(supplier?.notes ?? '');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), contactName: contactName || undefined, email: email || undefined, phone: phone || undefined, address: address || undefined, taxId: taxId || undefined, notes: notes || undefined });
  };

  const field = (label: string, value: string, setter: (v: string) => void, placeholder = '', type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={(e) => setter(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-white/10 rounded-lg px-3 py-2 bg-white/5 !text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 [color-scheme:dark]"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/10 rounded-xl max-w-md w-full shadow-xl">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">{supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
        </div>
        <div className="p-6 space-y-4">
          {field('Nombre *', name, setName, 'Nombre del proveedor')}
          {field('Persona de contacto', contactName, setContactName, 'Nombre del contacto')}
          {field('Email', email, setEmail, 'correo@proveedor.com', 'email')}
          {field('Teléfono', phone, setPhone, '+56 9 XXXX XXXX')}
          {field('Dirección', address, setAddress, 'Calle, ciudad')}
          {field('RUT / NIF', taxId, setTaxId, '12.345.678-9')}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notas</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm bg-white/5 !text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 [color-scheme:dark]"
              rows={2} placeholder="Notas adicionales..."
            />
          </div>
        </div>
        <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 !text-gray-400 hover:!text-gray-200">Cancelar</button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Guardando...' : supplier ? 'Actualizar' : 'Crear Proveedor'}
          </Button>
        </div>
      </div>
    </div>
  );
}
