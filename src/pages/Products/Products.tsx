// ═══════════════════════════════════════════════════════════════
// PRODUCTS - COMPONENTE PRINCIPAL
// Vista premium con cards, búsqueda y filtros
// Diseño superior a FUDO y TOTEAT
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Product, ProductCategory } from '../../types/product.types';
import { useToast } from '../../components/Toast';
import api from '../../services/api';
import { CategorySidebar } from '../../components/products/CategorySidebar';
import ProductModal from '../../components/products/ProductModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ProductTabs from '../../components/products/ProductTabs';
import type { TabType } from '../../components/products/ProductTabs';
import CategoriesTab from '../../components/products/CategoriesTab';
import StationsTab from '../../components/products/StationsTab';
import DashboardTab from '../../components/dashboard/DashboardTab';
import CategoryModal from '../../components/products/CategoryModal';
import ProductsListTab from '../../components/products/ProductsListTab';
import { usePermission } from '../../hooks/usePermission';
import type { Ingredient, IngredientCategory, IngredientFormData } from '../../types/ingredient.types';
import IngredientsListTab from '../../components/ingredients/IngredientsListTab';
import IngredientModal from '../../components/ingredients/IngredientModal';
import type { Recipe, RecipeFormData } from '../../types/recipe.types';
import RecipesListTab from '../../components/recipes/RecipesListTab';
import RecipeModal from '../../components/recipes/RecipeModal';
import type {
  ModifierGroup,
  ModifierGroupFormData,
  ModifierOption,
  ModifierOptionFormData,
} from '../../types/modifier.types';
import ModifiersListTab from '../../components/modifiers/ModifiersListTab';
import ModifierGroupModal from '../../components/modifiers/ModifierGroupModal';
import ModifierOptionModal from '../../components/modifiers/ModifierOptionModal';

// ── Componentes auxiliares ─────────────────────────────────────────────
function TabLoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    </div>
  );
}

function PermissionErrorView({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin permisos</h3>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
}

const Products = () => {
  // ========== ESTADO ==========
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientCategories, setIngredientCategories] = useState<IngredientCategory[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  const [loadingTab, setLoadingTab] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ingredientPermError, setIngredientPermError] = useState(false);
  const [recipePermError, setRecipePermError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    productId: '',
    productName: '',
  });
  const [activeTab, setActiveTab] = useState<TabType>('productos');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  
  const toast = useToast();
  // F-7: queryClient para invalidar caché compartida con /inventory
  const queryClient = useQueryClient();
  const canManage = usePermission('products.manage');

  // Cargar datos por tab (lazy)
  const loadTabData = async (tab: string, force = false) => {
    if (loadedTabs.has(tab) && !force) return;

    setLoadingTab(tab);
    setError(null);

    try {
      switch (tab) {
        case 'productos': {
          const [prods, cats, stts] = await Promise.all([
            api.products.getAll().catch(() => [] as any[]),
            api.categories.getAll().catch(() => [] as any[]),
            api.stations.getAll().catch(() => [] as any[]),
          ]);
          setProducts(prods);
          setCategories(cats);
          setStations(stts);
          break;
        }
        case 'categorias': {
          if (categories.length === 0) {
            const cats = await api.categories.getAll().catch(() => [] as any[]);
            setCategories(cats);
          }
          break;
        }
        case 'ingredientes': {
          try {
            const ings = await api.ingredients.getAll();
            setIngredients(ings);
            setIngredientPermError(false);
          } catch (err: any) {
            const msg = err?.message || '';
            if (msg.includes('403') || msg.toLowerCase().includes('permiso') || msg.toLowerCase().includes('acceso')) {
              setIngredientPermError(true);
            } else {
              toast.error('Error cargando ingredientes');
            }
            setIngredients([]);
          }
          break;
        }
        case 'fichas': {
          try {
            const recs = await api.recipes.getAll();
            setRecipes(recs);
            setRecipePermError(false);
          } catch (err: any) {
            const msg = err?.message || '';
            if (msg.includes('403') || msg.toLowerCase().includes('permiso') || msg.toLowerCase().includes('acceso')) {
              setRecipePermError(true);
            } else {
              toast.error('Error cargando fichas técnicas');
            }
            setRecipes([]);
          }
          // Cargar ingredientes si aún no se cargaron (necesarios para el modal)
          if (ingredients.length === 0 && !loadedTabs.has('ingredientes')) {
            api.ingredients.getAll().then(setIngredients).catch(() => {});
          }
          break;
        }
        case 'modificadores': {
          const mods = await api.modifiers.getAllGroups().catch(() => [] as any[]);
          setModifierGroups(mods);
          break;
        }
        case 'estaciones': {
          const stts = await api.stations.getAll().catch(() => [] as any[]);
          setStations(stts);
          break;
        }
        case 'reportes':
          break; // usa datos ya cargados
      }
      setLoadedTabs(prev => new Set([...prev, tab]));
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoadingTab(null);
    }
  };

  const reloadTab = (tab: string) => loadTabData(tab, true);

  // useEffect — cargar solo tab inicial
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadTabData('productos');
  }, []);

  // Sincronizar tab con URL — M-7: loadTabData es estable en este contexto (solo mount)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab') as TabType;
    const validTabs = ['productos', 'categorias', 'ingredientes', 'fichas', 'modificadores', 'estaciones', 'reportes'];
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
      loadTabData(tabParam);
    }
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    loadTabData(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
  };

  // ========== CATEGORÍAS CON CONTADORES DINÁMICOS ==========
  const categoriesWithCounts = useMemo(() => {
    return categories.map(category => ({
      ...category,
      productsCount: products.filter(p => p.categoryId === category.id).length
    }));
  }, [categories, products]);

  // SKUs existentes para validación
  const existingSkus = useMemo(() => 
    products.map(p => p.sku || '').filter(Boolean),
    [products]
  );

  // ========== HANDLERS ==========
  const handleCreateProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    // Spread completo para preservar TODOS los campos del objeto Prisma,
    // incluyendo stationId, tags, etc. Solo sobreescribimos sku si falta.
    setEditingProduct({
      ...product,
      sku:      product.sku || `PRD-${product.id.slice(0, 8)}`,
      // Mapear 'image' (Prisma) → 'imageUrl' (tipo frontend)
      imageUrl: (product as any).image || product.imageUrl,
      stationId: product.stationId ?? null,
      tags:     product.tags ?? [],
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    // Abrir modal de confirmación
    setConfirmDialog({
      isOpen: true,
      productId: product.id,
      productName: product.name,
    });
  };

  const confirmDeleteProduct = async () => {
    setLoadingTab('delete');
    
    try {
      if (activeTab === 'categorias') {
        await api.categories.delete(confirmDialog.productId);
        setCategories((prev) => prev.filter((c) => c.id !== confirmDialog.productId));
        toast.success('Categoría eliminada exitosamente');
      } else if (activeTab === 'ingredientes') {
        await api.ingredients.delete(confirmDialog.productId);
        setIngredients((prev) => prev.filter((i) => i.id !== confirmDialog.productId));
        toast.success('Ingrediente eliminado exitosamente');
      } else if (activeTab === 'fichas') {
        await api.recipes.delete(confirmDialog.productId);
        setRecipes((prev) => prev.filter((r) => r.id !== confirmDialog.productId));
        toast.success('Ficha técnica eliminada exitosamente');
      } else if (activeTab === 'modificadores') {
        if (confirmDialog.productId.includes(':')) {
          const [groupId, optionId] = confirmDialog.productId.split(':');
          await api.modifiers.deleteOption(groupId, optionId);
          setModifierGroups((prev) =>
            prev.map((group) =>
              group.id === groupId
                ? {
                    ...group,
                    options: group.options.filter((o) => o.id !== optionId),
                    updatedAt: new Date().toISOString(),
                  }
                : group
            )
          );
          toast.success('Opción eliminada exitosamente');
        } else {
          await api.modifiers.deleteGroup(confirmDialog.productId);
          setModifierGroups((prev) => prev.filter((g) => g.id !== confirmDialog.productId));
          toast.success('Grupo eliminado exitosamente');
        }
      } else {
        await api.products.delete(confirmDialog.productId);
        setProducts((prev) => prev.filter((p) => p.id !== confirmDialog.productId));
        toast.success('Producto eliminado exitosamente');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setLoadingTab(null);
      setConfirmDialog({ isOpen: false, productId: '', productName: '' });
    }
  };

  // ============ HANDLERS INGREDIENTES ============
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  const handleAddIngredient = () => {
    setEditingIngredient(null);
    setIsIngredientModalOpen(true);
  };

  const handleEditIngredient = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setIsIngredientModalOpen(true);
  };

  const handleSaveIngredient = async (ingredientData: IngredientFormData) => {
    setLoadingTab('saving');
    
    try {
      if (editingIngredient) {
        const updated = await api.ingredients.update(editingIngredient.id, ingredientData);
        setIngredients((prev) =>
          prev.map((i) => (i.id === editingIngredient.id ? updated : i))
        );
        toast.success('Ingrediente actualizado exitosamente');
      } else {
        const created = await api.ingredients.create(ingredientData);
        setIngredients((prev) => [...prev, created]);
        toast.success('Ingrediente creado exitosamente');
      }
      // F-7: invalidar caché de React Query para sincronizar con /inventory
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      setIsIngredientModalOpen(false);
      setEditingIngredient(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar ingrediente');
    } finally {
      setLoadingTab(null);
    }
  };

  const handleDeleteIngredient = (ingredient: Ingredient) => {
    setConfirmDialog({
      isOpen: true,
      productId: ingredient.id,
      productName: ingredient.name,
    });
  };

  // ============ HANDLERS FICHAS TÉCNICAS ============
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const handleAddRecipe = () => {
    setEditingRecipe(null);
    setIsRecipeModalOpen(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsRecipeModalOpen(true);
  };

  const handleSaveRecipe = async (data: RecipeFormData) => {
    setLoadingTab('saving');
    
    try {
      if (editingRecipe) {
        const updated = await api.recipes.update(editingRecipe.id, data);
        setRecipes((prev) =>
          prev.map((rec) => (rec.id === editingRecipe.id ? updated : rec))
        );
        toast.success('Ficha técnica actualizada exitosamente');
        
        // Actualizar costo del producto
        if (updated.totalCost !== undefined) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === data.productId ? { ...p, cost: updated.totalCost } : p
            )
          );
        }
      } else {
        const created = await api.recipes.create(data);
        setRecipes((prev) => [...prev, created]);
        toast.success('Ficha técnica creada exitosamente');
        
        // Actualizar costo del producto
        if (created.totalCost !== undefined) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === data.productId ? { ...p, cost: created.totalCost } : p
            )
          );
        }
      }
      
      setIsRecipeModalOpen(false);
      setEditingRecipe(null);
      // F-7: invalidar caché de React Query para sincronizar con /inventory
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar ficha técnica');
    } finally {
      setLoadingTab(null);
    }
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    setConfirmDialog({
      isOpen: true,
      productId: recipe.id,
      productName: recipe.name,
    });
  };

  // ============ HANDLERS MODIFICADORES ============
  const [isModifierGroupModalOpen, setIsModifierGroupModalOpen] = useState(false);
  const [editingModifierGroup, setEditingModifierGroup] = useState<ModifierGroup | null>(null);
  const [isModifierOptionModalOpen, setIsModifierOptionModalOpen] = useState(false);
  const [editingModifierOption, setEditingModifierOption] = useState<{
    groupId: string;
    option: ModifierOption | null;
  } | null>(null);

  const handleAddModifierGroup = () => {
    setEditingModifierGroup(null);
    setIsModifierGroupModalOpen(true);
  };

  const handleEditModifierGroup = (group: ModifierGroup) => {
    setEditingModifierGroup(group);
    setIsModifierGroupModalOpen(true);
  };

  const handleSaveModifierGroup = async (data: ModifierGroupFormData) => {
    setLoadingTab('saving');
    
    try {
      if (editingModifierGroup) {
        const updated = await api.modifiers.updateGroup(editingModifierGroup.id, data);
        setModifierGroups((prev) =>
          prev.map((g) => (g.id === editingModifierGroup.id ? updated : g))
        );
        toast.success('Grupo de modificadores actualizado');
      } else {
        const created = await api.modifiers.createGroup(data);
        setModifierGroups((prev) => [...prev, created]);
        toast.success('Grupo de modificadores creado');
      }
      
      setIsModifierGroupModalOpen(false);
      setEditingModifierGroup(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar grupo');
    } finally {
      setLoadingTab(null);
    }
  };

  const handleDeleteModifierGroup = (group: ModifierGroup) => {
    setConfirmDialog({
      isOpen: true,
      productId: group.id,
      productName: group.name,
    });
  };

  const handleAddModifierOption = (groupId: string) => {
    setEditingModifierOption({ groupId, option: null });
    setIsModifierOptionModalOpen(true);
  };

  const handleEditModifierOption = (groupId: string, optionId: string) => {
    const group = modifierGroups.find((g) => g.id === groupId);
    const option = group?.options.find((o) => o.id === optionId);
    if (option) {
      setEditingModifierOption({ groupId, option });
      setIsModifierOptionModalOpen(true);
    }
  };

  const handleSaveModifierOption = async (data: ModifierOptionFormData) => {
    if (!editingModifierOption) return;
    
    const { groupId, option } = editingModifierOption;
    setLoadingTab('saving');
    
    try {
      if (option) {
        // Editar opción existente
        const updated = await api.modifiers.updateOption(groupId, option.id, data);
        setModifierGroups((prev) =>
          prev.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  options: group.options.map((o) =>
                    o.id === option.id ? updated : o
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : group
          )
        );
        toast.success('Opción actualizada exitosamente');
      } else {
        // Crear nueva opción
        const created = await api.modifiers.createOption(groupId, data);
        setModifierGroups((prev) =>
          prev.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  options: [...group.options, created],
                  updatedAt: new Date().toISOString(),
                }
              : group
          )
        );
        toast.success('Opción creada exitosamente');
      }
      
      setIsModifierOptionModalOpen(false);
      setEditingModifierOption(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar opción');
    } finally {
      setLoadingTab(null);
    }
  };

  const handleDeleteModifierOption = (groupId: string, optionId: string) => {
    const group = modifierGroups.find((g) => g.id === groupId);
    const option = group?.options.find((o) => o.id === optionId);
    if (option) {
      setConfirmDialog({
        isOpen: true,
        productId: `${groupId}:${optionId}`,
        productName: option.name,
      });
    }
  };

  const handleDuplicateProduct = (product: Product) => {
    
    // Convertir Product sin ID para crear duplicado
    const productForModal: Product = {
      id: '',
      name: `${product.name} (Copia)`,
      sku: `PRD-${crypto.randomUUID().split('-')[0].toUpperCase()}`,
      categoryId: product.categoryId,
      price: product.price,
      cost: product.cost || 0,
      currentStock: product.currentStock || 0,
      imageUrl: product.imageUrl,
      description: product.description,
      active: true,
      available: true,
      popular: false,
    };
    
    setEditingProduct(productForModal);
    setIsModalOpen(true);
  };

  // Handlers para categorías
  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (categoryData: { name: string; icon: string }) => {
    setLoadingTab('saving');
    
    try {
      if (editingCategory) {
        const updated = await api.categories.update(editingCategory.id, categoryData);
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? updated : c))
        );
        toast.success('Categoría actualizada exitosamente');
      } else {
        const created = await api.categories.create(categoryData);
        // F-4: verificar si ya existía (backend es idempotente, devuelve 200)
        const alreadyExists = categories.some((c) => c.id === created.id);
        if (!alreadyExists) {
          setCategories((prev) => [...prev, created]);
          toast.success('Categoría creada exitosamente');
        } else {
          setCategories((prev) => prev.map((c) => (c.id === created.id ? created : c)));
          toast.success('Categoría guardada');
        }
      }
      
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar categoría');
    } finally {
      setLoadingTab(null);
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    const hasProducts = products.some((p) => p.categoryId === categoryId);

    // F-2: advertir pero no bloquear — el backend hace soft-delete en cascada
    if (hasProducts) {
      const confirmed = window.confirm(
        `La categoría "${category.name}" tiene productos asignados. ` +
        `Al eliminarla, los productos también serán desactivados. ¿Continuar?`
      );
      if (!confirmed) return;
    }

    // Abrir confirmación
    setConfirmDialog({
      isOpen: true,
      productId: categoryId,
      productName: category.name,
    });
  };

  const handleDuplicateCategory = async (category: ProductCategory) => {
    setLoadingTab('saving');
    try {
      const created = await api.categories.create({
        name: `${category.name} (Copia)`,
        icon: category.icon || '',
      });
      setCategories((prev) => [...prev, created]);
      toast.success('Categoría duplicada exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al duplicar categoría');
    } finally {
      setLoadingTab(null);
    }
  };

  const handleCategoryBulkAvailability = async (categoryId: string, available: boolean) => {
    const productIds = products.filter(p => p.categoryId === categoryId).map(p => p.id);
    if (productIds.length === 0) {
      toast.error('No hay productos en esta categoría');
      return;
    }
    setLoadingTab('saving');
    try {
      await Promise.all(productIds.map(id => api.products.update(id, { available })));
      setProducts(prev => prev.map(p => p.categoryId === categoryId ? { ...p, available } : p));
      toast.success(`${productIds.length} producto${productIds.length !== 1 ? 's' : ''} ${available ? 'habilitado' : 'deshabilitado'}${productIds.length !== 1 ? 's' : ''}`);
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar disponibilidad');
    } finally {
      setLoadingTab(null);
    }
  };

  const handleBulkUpdate = async (ids: string[], data: { available: boolean }) => {
    setLoadingTab('saving');
    try {
      await Promise.all(ids.map(id => api.products.update(id, data)));
      setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...data } : p));
      toast.success(`${ids.length} producto${ids.length !== 1 ? 's' : ''} actualizado${ids.length !== 1 ? 's' : ''}`);
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar productos');
    } finally {
      setLoadingTab(null);
    }
  };

  const handleReorderCategories = async (orderedIds: string[]) => {
    // F-3: guardar orden anterior para rollback
    const prevOrder = [...categories];
    // Actualizar orden localmente de forma optimista
    setCategories((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      return orderedIds.map((id) => map.get(id)!).filter(Boolean);
    });
    // Persistir en backend: enviar el nuevo índice a cada categoría
    try {
      await Promise.all(
        orderedIds.map((id, index) => api.categories.update(id, { order: index }))
      );
    } catch {
      // F-3: rollback al orden anterior si falla
      setCategories(prevOrder);
      toast.error('No se pudo guardar el nuevo orden. Intenta de nuevo.');
    }
  };

  const handleSaveProduct = async (productData: Product) => {
    setLoadingTab('saving');
    
    try {
      if (editingProduct && editingProduct.id) {
        const updated = await api.products.update(editingProduct.id, productData);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? updated : p))
        );
        toast.success('Producto actualizado exitosamente');
      } else {
        const created = await api.products.create(productData);
        setProducts((prev) => [created, ...prev]);
        toast.success('Producto creado exitosamente');
      }
      
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      throw err; // C-4: re-throw para que ProductModal muestre error inline
    } finally {
      setLoadingTab(null);
    }
  };

  // ========== RENDER ==========
  return (
    <div className="h-full flex bg-gray-50">
      {/* Loading overlay — solo para operaciones de guardado/eliminación */}
      {(loadingTab === 'saving' || loadingTab === 'delete') && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="text-gray-700 font-medium">Guardando...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && loadingTab === null && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-50 max-w-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={() => reloadTab(activeTab)}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-500"
              >
                Reintentar
              </button>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto flex-shrink-0 text-red-400 hover:text-red-500"
            >
              <span className="sr-only">Cerrar</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* CategorySidebar */}
      <CategorySidebar
        categories={categoriesWithCounts}
        selectedCategory={selectedCategory}
        onCategorySelect={(categoryId) => {
          setSelectedCategory(categoryId);
          setSidebarOpen(false); // Cerrar en mobile al seleccionar
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Contenedor principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tabs */}
        <ProductTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          productCount={products.length}
          categoryCount={categories.length}
          ingredientCount={ingredients.length}
          recipeCount={recipes.length}
          modifierCount={modifierGroups.length}
          stationCount={stations.length}
        />
        {/* Tab Content */}
        {activeTab === 'productos' ? (
          <ProductsListTab
            products={products}
            categories={categoriesWithCounts}
            onAddProduct={handleCreateProduct}
            onEditProduct={handleEditProduct}
            onDuplicateProduct={handleDuplicateProduct}
            onDeleteProduct={handleDeleteProduct}
            selectedCategory={selectedCategory}
            onCategoryToggle={() => setSidebarOpen(true)}
            onCategoryChange={setSelectedCategory}
            onBulkUpdate={handleBulkUpdate}
            canManage={canManage}
          />
        ) : activeTab === 'categorias' ? (
          <CategoriesTab
            categories={categoriesWithCounts}
            onAdd={handleAddCategory}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
            onReorder={handleReorderCategories}
            onDuplicate={handleDuplicateCategory}
            onBulkAvailability={handleCategoryBulkAvailability}
          />
        ) : activeTab === 'ingredientes' ? (
          loadingTab === 'ingredientes' ? (
            <TabLoadingSpinner />
          ) : (
            <IngredientsListTab
              ingredients={ingredients}
              categories={ingredientCategories}
              onAddIngredient={handleAddIngredient}
              onEditIngredient={handleEditIngredient}
              onDeleteIngredient={handleDeleteIngredient}
              permissionError={ingredientPermError}
            />
          )
        ) : activeTab === 'fichas' ? (
          loadingTab === 'fichas' ? (
            <TabLoadingSpinner />
          ) : recipePermError ? (
            <PermissionErrorView message='Tu rol necesita el permiso "inventory.recipes". Ve a Configuración → Roles para activarlo.' />
          ) : (
            <RecipesListTab
              recipes={recipes}
              products={products}
              ingredients={ingredients}
              onAddRecipe={handleAddRecipe}
              onEditRecipe={handleEditRecipe}
              onDeleteRecipe={handleDeleteRecipe}
            />
          )
        ) : activeTab === 'modificadores' ? (
          <ModifiersListTab
            modifierGroups={modifierGroups}
            products={products}
            onAddGroup={handleAddModifierGroup}
            onEditGroup={handleEditModifierGroup}
            onDeleteGroup={handleDeleteModifierGroup}
            onAddOption={handleAddModifierOption}
            onEditOption={handleEditModifierOption}
            onDeleteOption={handleDeleteModifierOption}
          />
        ) : activeTab === 'estaciones' ? (
          <StationsTab onStationsChange={() => loadTabData('estaciones', true)} />
        ) : (
          <DashboardTab
            products={products}
            ingredients={ingredients}
            recipes={recipes}
            categories={categoriesWithCounts}
          />
        )}
      </div>

      {/* Modal de crear/editar producto */}
      <ProductModal
        key={editingProduct?.id ?? 'new'}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        product={editingProduct}
        existingSkus={existingSkus}
        categories={categories}
        stations={stations.filter(s => s.active !== false)}
      />

      {/* Modal de Categoría */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        category={editingCategory}
        mode={editingCategory ? 'edit' : 'create'}
        existingNames={categories.map((c) => c.name)}
      />

      {/* Modal de Ingrediente */}
      <IngredientModal
        isOpen={isIngredientModalOpen}
        onClose={() => {
          setIsIngredientModalOpen(false);
          setEditingIngredient(null);
        }}
        onSave={handleSaveIngredient}
        ingredient={editingIngredient}
        mode={editingIngredient ? 'edit' : 'create'}
        categories={ingredientCategories}
      />

      {/* Modal de Ficha Técnica */}
      <RecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => {
          setIsRecipeModalOpen(false);
          setEditingRecipe(null);
        }}
        onSave={handleSaveRecipe}
        recipe={editingRecipe}
        mode={editingRecipe ? 'edit' : 'create'}
        products={products}
        ingredients={ingredients}
        ingredientCategories={ingredientCategories}
      />

      {/* Modal de Grupo de Modificadores */}
      <ModifierGroupModal
        isOpen={isModifierGroupModalOpen}
        onClose={() => {
          setIsModifierGroupModalOpen(false);
          setEditingModifierGroup(null);
        }}
        onSave={handleSaveModifierGroup}
        group={editingModifierGroup}
        mode={editingModifierGroup ? 'edit' : 'create'}
        products={products}
      />

      {/* Modal de Opción de Modificador */}
      <ModifierOptionModal
        isOpen={isModifierOptionModalOpen}
        onClose={() => {
          setIsModifierOptionModalOpen(false);
          setEditingModifierOption(null);
        }}
        onSave={handleSaveModifierOption}
        option={editingModifierOption?.option || null}
        mode={editingModifierOption?.option ? 'edit' : 'create'}
        groupName={
          editingModifierOption
            ? modifierGroups.find((g) => g.id === editingModifierOption.groupId)?.name || ''
            : ''
        }
      />

      {/* Modal de confirmación de eliminación */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, productId: '', productName: '' })}
        onConfirm={confirmDeleteProduct}
        title="Eliminar Producto"
        message={`¿Estás seguro de eliminar "${confirmDialog.productName}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </div>
  );
};

export default Products;
