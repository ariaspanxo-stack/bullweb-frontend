import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { formatCurrency } from '@/lib/utils';
import { Edit, Trash2, ChefHat } from 'lucide-react';
import Badge from '@/components/ui/Badge';

interface RecipesListProps {
  onEdit: (recipe: any) => void;
  onDelete: (recipe: any) => void;
  onCreate: () => void;
}

export default function RecipesList({ onEdit, onDelete, onCreate }: RecipesListProps) {
  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => inventoryService.getRecipes()
  });

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">Cargando...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Productos sin receta */}
      {(recipes?.productsWithoutRecipe || []).length > 0 && (
        <div className="bg-brand-500/10 border border-brand-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ChefHat className="w-5 h-5 text-brand-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-brand-400 mb-2">
                Productos sin receta ({(recipes.productsWithoutRecipe || []).length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {(recipes.productsWithoutRecipe || []).map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() => onCreate()}
                    className="px-3 py-1 bg-white/5 border border-brand-500/40 rounded-lg text-sm !text-gray-200 hover:bg-brand-500/20 transition-colors"
                  >
                    {product.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de recetas */}
      <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Producto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ingredientes</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Costo Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Precio Venta</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Margen</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(recipes?.recipes || []).map((recipe: any) => {
              const product = recipe.products ?? recipe.product;
              const productPrice = product?.price ?? 0;
              const margin = productPrice - (recipe.totalCost || 0);
              const marginPercent = productPrice > 0
                ? (((margin / productPrice) * 100) || 0).toFixed(1)
                : null;
              
              return (
                <tr key={recipe.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{product?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {((recipe.recipe_items ?? recipe.items) || []).length} ingredientes
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {formatCurrency(recipe.totalCost || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {formatCurrency(productPrice)}
                  </td>
                  <td className="px-4 py-3">
                    {marginPercent !== null ? (
                      <Badge variant={Number(marginPercent) > 60 ? 'success' : Number(marginPercent) > 40 ? 'warning' : 'danger'}>
                        {marginPercent}%
                      </Badge>
                    ) : (
                      <span className="text-gray-500 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onEdit(recipe)} className="p-1.5 text-gray-400 hover:text-brand-400 hover:bg-white/10 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(recipe)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(recipes?.recipes || []).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            No hay recetas creadas
          </div>
        )}
      </div>
    </div>
  );
}
