import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import InventoryTabs from '@/components/inventory/InventoryTabs';
import IngredientsTable from '@/components/inventory/IngredientsTable';
import IngredientFormModal from '@/components/inventory/IngredientFormModal';
import RecipesList from '@/components/inventory/RecipesList';
import RecipeFormModal from '@/components/inventory/RecipeFormModal';
import ProductsStockTab from '@/components/inventory/ProductsStockTab';
import PurchasesTab, { PurchaseFormModal, METHOD_LABEL, DOC_LABEL, STATUS_LABEL, statusOf } from '@/components/inventory/PurchasesTab';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { Plus, Search, AlertCircle, ArrowUpDown, Truck, Pencil, Trash2, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToExcel, fmtDateTime } from '@/utils/exportExcel';
import { usePermission } from '@/hooks/usePermission';
import { usePlan } from '@/hooks/usePlan';

const MOV_LABEL: Record<string, string> = { PURCHASE: 'Compra', SALE: 'Venta', WASTE: 'Merma', ADJUSTMENT: 'Ajuste' };
// LOTE 309: sin decimales basura de la suma de flotantes (17.499999)
const qty = (n: any) => Math.round(Number(n ?? 0) * 1000) / 1000;

export default function Inventory() {
  const queryClient = useQueryClient();
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  // HOTFIX 305 (B6-20): en Básico se ve el stock simple (Productos y su historial); ingredientes, compras y proveedores son Full
  const { hasModule } = usePlan();
  const sinInventario = !hasModule('inventario'); // LOTE 325: inventario completo por local (sin fila = plan)
  const [activeTab, setActiveTab] = useState<'ingredients' | 'products' | 'recipes' | 'purchases' | 'movements' | 'suppliers'>(sinInventario ? 'products' : 'ingredients');
  useEffect(() => { if (sinInventario && activeTab !== 'products' && activeTab !== 'movements') setActiveTab('products'); }, [sinInventario]); // eslint-disable-line react-hooks/exhaustive-deps
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
    (activeTab === 'movements' && canAdjustments && !sinInventario) ||
    (activeTab === 'suppliers' && canPurchases);

  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);

  const deleteIngredientMutation = useMutation({
    mutationFn: (ingredientId: string) => inventoryService.deleteIngredient(ingredientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients-all'] });
      toast.success('Ingrediente eliminado');
    },
    onError: (err: any) => toast.error(err.message || 'No se pudo eliminar el ingrediente'), // LOTE 309: antes no decia nada
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: (recipeId: string) => inventoryService.deleteRecipe(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Receta eliminada');
    },
    onError: (err: any) => toast.error(err.message || 'No se pudo eliminar la receta'),
  });

  // Queries para compras/movimientos
  const { data: allIngredients } = useQuery({
    queryKey: ['ingredients-all'],
    queryFn: () => inventoryService.getIngredients({ perPage: 200 }),
    staleTime: 60000,
    enabled: !sinInventario,
  });
  const ingredientsList: any[] = Array.isArray(allIngredients)
    ? allIngredients
    : (allIngredients as any)?.ingredients ?? [];

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ['movements'],
    queryFn: () => inventoryService.getMovements({ perPage: 50 }),
    enabled: activeTab === 'movements',
  });

  const movementsList: any[] = Array.isArray(movementsData)
    ? movementsData
    : (movementsData as any)?.movements ?? [];

  const createPurchaseMutation = useMutation({
    mutationFn: inventoryService.createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchases-payables'] }); // LOTE 310
      queryClient.invalidateQueries({ queryKey: ['purchases-open'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
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

  // LOTE 321: si la carga inicial de la lista sigue en curso al crear o editar, invalidateQueries se cuelga de esa misma
  // peticion (salio antes del POST y no trae la fila nueva) y no vuelve a pedir. Se cancela primero y se pide de nuevo al servidor.
  const recargarProveedores = async () => {
    await queryClient.cancelQueries({ queryKey: ['suppliers'] });
    await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  };

  const createSupplierMutation = useMutation({
    mutationFn: inventoryService.createSupplier,
    onSuccess: () => {
      recargarProveedores();
      setIsSupplierModalOpen(false);
      setEditingSupplier(null);
      toast.success('Proveedor creado');
    },
    onError: (err: any) => toast.error(err.message || 'Error al crear proveedor'),
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => inventoryService.updateSupplier(id, data),
    onSuccess: () => {
      recargarProveedores();
      setIsSupplierModalOpen(false);
      setEditingSupplier(null);
      toast.success('Proveedor actualizado');
    },
    onError: (err: any) => toast.error(err.message || 'Error al actualizar proveedor'),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: inventoryService.deleteSupplier,
    onSuccess: () => {
      recargarProveedores();
      toast.success('Proveedor eliminado');
    },
    onError: (err: any) => toast.error(err.message || 'Error al eliminar proveedor'),
  });

  // LOTE 309: leia campos que no existen (costos y minimos en 0, movimientos sin ingrediente) y dejaba vacias las
  // hojas de pestañas no visitadas. Pide todo al momento de exportar.
  const handleExport = async () => {
    try {
      const [ings, purch, movs, sups]: any[] = await Promise.all([
        inventoryService.getIngredients({ perPage: 500 }),
        inventoryService.getPurchases({ perPage: 500 }),
        inventoryService.getMovements({ perPage: 500 }),
        inventoryService.getSuppliers({ perPage: 500 }),
      ]);
      const lista = (v: any, k: string): any[] => (Array.isArray(v) ? v : v?.[k] ?? []);
      await exportToExcel([
        {
          sheetName: 'Ingredientes',
          rows: lista(ings, 'ingredients').map((i: any) => ({
            'Nombre': i.name,
            'Stock': i.currentStock ?? 0,
            'Unidad': i.unit ?? '—',
            'Stock Mínimo': i.minStock ?? 0,
            'Costo unit.': i.unitCost ?? 0,
            'Stock Bajo': (i.currentStock ?? 0) <= (i.minStock ?? 0) ? 'SÍ' : 'NO',
          })),
        },
        {
          sheetName: 'Compras',
          rows: lista(purch, 'purchases').map((p: any) => ({
            'Fecha': fmtDateTime(p.createdAt),
            'Proveedor': p.supplier ?? '—',
            'Ingrediente': p.ingredients?.name ?? '—',
            'Cantidad': p.quantity ?? 0,
            'Unidad': p.ingredients?.unit ?? '—',
            'Costo promedio actual': p.unitCost ?? 0,
            'Total (CLP)': Math.round(p.total ?? 0),
            // LOTE 310: costo real de la linea (compras desde el lote), pago y documento
            'Costo compra': p.lineCost ?? '—',
            'Total compra (CLP)': p.lineTotal === null || p.lineTotal === undefined ? '—' : Math.round(p.lineTotal),
            'Medio': p.purchase?.paymentMethod ? METHOD_LABEL[p.purchase.paymentMethod] : '—',
            'Estado': STATUS_LABEL[statusOf(p.purchase)],
            'Documento': p.purchase?.documentType && p.purchase.documentType !== 'NONE' ? DOC_LABEL[p.purchase.documentType] : '—',
            'N° documento': p.purchase?.documentNumber ?? '—',
            'Vencimiento': p.purchase?.dueDate ?? '—',
            'Factura': p.purchase?.invoiceNumber ?? '—',
            'Pagado compra (CLP)': p.purchase ? Math.round(p.purchase.paidAmount ?? 0) : '—',
            'Pendiente compra (CLP)': p.purchase ? Math.round(p.purchase.pendingAmount ?? 0) : 0,
            'Notas': p.notes ?? '—',
          })),
        },
        {
          sheetName: 'Movimientos',
          rows: lista(movs, 'movements').map((m: any) => ({
            'Fecha': fmtDateTime(m.createdAt),
            'Tipo': MOV_LABEL[m.type] ?? m.type,
            'Ingrediente': m.ingredients?.name ?? m.products?.name ?? '—',
            'Cantidad': m.quantity ?? 0,
            'Unidad': m.ingredients?.unit ?? '—',
            'Stock anterior': m.previousStock ?? 0,
            'Stock nuevo': m.newStock ?? 0,
            'Notas': m.notes ?? '—',
          })),
        },
        {
          sheetName: 'Proveedores',
          rows: lista(sups, 'suppliers').map((p: any) => ({
            'Nombre': p.name,
            'Contacto': p.contactName ?? '—',
            'Teléfono': p.phone ?? '—',
            'Email': p.email ?? '—',
            'Dirección': p.address ?? '—',
            'RUT': p.taxId ?? '—',
          })),
        },
      ], 'Inventario');
      toast.success('Inventario exportado a Excel (4 hojas)');
    } catch (err: any) {
      toast.error(err.message || 'No se pudo exportar el inventario');
    }
  };

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
      <div className="flex-wrap flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-500 mt-1">Control de stock, recetas y movimientos</p>
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
        {!sinInventario && <button
          onClick={handleExport}
          className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <FileDown className="w-4 h-4" />
          Exportar Excel
        </button>}
      </div>

      {/* Tabs */}
      <InventoryTabs activeTab={activeTab} onTabChange={setActiveTab} onlyStockSimple={sinInventario} />

      {/* Contenido por tab */}
      {activeTab === 'ingredients' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar ingredientes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                onClick={() => setShowLowStock(!showLowStock)}
                className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                  showLowStock
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
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

      {activeTab === 'products' && <ProductsStockTab />}

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

      {/* LOTE 310: Compras con medio de pago, estado, documento y cuentas por pagar */}
      {activeTab === 'purchases' && <PurchasesTab canPurchases={canPurchases} />}

      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Movimientos de Stock</h2>
          </div>

          {movementsLoading ? (
            <div className="text-center py-8 text-gray-500">Cargando movimientos...</div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Ingrediente / Producto</th>
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
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
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
                        PURCHASE: 'bg-slate-100 text-slate-700',
                        SALE: 'bg-slate-100 text-slate-700',
                        WASTE: 'bg-red-100 text-red-700',
                        ADJUSTMENT: 'bg-yellow-100 text-yellow-700',
                      };
                      return (
                        <tr key={mov.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(mov.createdAt).toLocaleDateString('es-CL')}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {/* HOTFIX 289: movimientos de productos con stock simple */}
                            {mov.ingredients?.name ?? mov.products?.name ?? '—'}
                            {mov.productId && (
                              <span className="ml-2 inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-orange-50 text-orange-700">Producto</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${typeColor[mov.type] ?? 'bg-gray-100 text-gray-600'}`}>
                              {typeLabel[mov.type] ?? mov.type}
                            </span>
                          </td>
                          <td className={`px-4 py-3 font-semibold ${mov.quantity < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                            {mov.quantity > 0 ? '+' : ''}{qty(mov.quantity)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{qty(mov.previousStock)}</td>
                          <td className="px-4 py-3 text-sm font-medium">{qty(mov.newStock)}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">{/* LOTE 309: la venta guarda el id del pedido: no se muestra un codigo crudo */}{mov.type === 'SALE' ? 'Venta de un pedido' : mov.reference || mov.notes || '—'}</td>
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
            <Truck className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Proveedores</h2>
          </div>

          {suppliersLoading ? (
            <div className="text-center py-8 text-gray-500">Cargando proveedores...</div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
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
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        No hay proveedores registrados
                      </td>
                    </tr>
                  ) : (
                    suppliersList.map((s: any) => (
                      <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{s.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.contactName || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.email || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{s.phone || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{s.taxId || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{s._count?.purchases ?? 0}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEditingSupplier(s); setIsSupplierModalOpen(true); }}
                              aria-label={`Editar proveedor ${s.name}`}
                              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                const ok = await confirmDialog({ message: `¿Eliminar proveedor "${s.name}"?`, confirmLabel: 'Eliminar' });
                                if (ok) deleteSupplierMutation.mutate(s.id);
                              }}
                              aria-label={`Eliminar proveedor ${s.name}`}
                              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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
        <PurchaseFormModal
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
    // LOTE 309: antes el boton no hacia nada si faltaba un dato
    if (!ingredientId) { toast.error('Selecciona un ingrediente'); return; }
    if (!quantity || parseFloat(quantity) === 0) { toast.error('Indica la cantidad'); return; }
    onSubmit({ ingredientId, type, quantity: parseFloat(quantity), reason: reason.trim() });
  };

  return (
    createPortal(<div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 text-slate-900">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-auto shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Agregar Movimiento</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ingrediente</label>
            <select
              value={ingredientId} onChange={(e) => setIngredientId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Seleccionar ingrediente...</option>
              {ingredients.map((ing: any) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} — stock actual: {qty(ing.currentStock)} {ing.unit}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de movimiento</label>
            <select
              value={type} onChange={(e) => setType(e.target.value as 'WASTE' | 'ADJUSTMENT')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="WASTE">Merma / Pérdida</option>
              <option value="ADJUSTMENT">Ajuste de inventario</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
            <input
              type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
              placeholder="0" step="0.001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Razón</label>
            <input
              type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Descripción del movimiento"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div className="flex-wrap p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="min-h-[44px] px-4 py-2 text-gray-600 hover:text-gray-900">Cancelar</button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Registrar'}
          </Button>
        </div>
      </div>
    </div>, document.body)
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
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={(e) => setter(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );

  return (
    createPortal(<div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 text-slate-900">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-auto shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
        </div>
        <div className="p-6 space-y-4">
          {field('Nombre *', name, setName, 'Nombre del proveedor')}
          {field('Persona de contacto', contactName, setContactName, 'Nombre del contacto')}
          {field('Email', email, setEmail, 'correo@proveedor.com', 'email')}
          {field('Teléfono', phone, setPhone, '+56 9 XXXX XXXX')}
          {field('Dirección', address, setAddress, 'Calle, ciudad')}
          {field('RUT / NIF', taxId, setTaxId, '12.345.678-9')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2} placeholder="Notas adicionales..."
            />
          </div>
        </div>
        <div className="flex-wrap p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="min-h-[44px] px-4 py-2 text-gray-600 hover:text-gray-900">Cancelar</button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? 'Guardando...' : supplier ? 'Actualizar' : 'Crear Proveedor'}
          </Button>
        </div>
      </div>
    </div>, document.body)
  );
}
