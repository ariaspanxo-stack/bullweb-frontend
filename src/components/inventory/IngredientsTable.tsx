import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { Edit, Trash2, AlertTriangle, PackageOpen, Plus } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { cn, formatCurrency } from '@/lib/utils';

interface IngredientsTableProps {
  searchQuery: string;
  showLowStock: boolean;
  onEdit: (ingredient: any) => void;
  onDelete: (ingredient: any) => void;
  onCreate?: () => void;
}

export default function IngredientsTable({
  searchQuery,
  showLowStock,
  onEdit,
  onDelete,
  onCreate
}: IngredientsTableProps) {
  const { data: ingredients, isLoading } = useQuery({
    queryKey: ['ingredients', searchQuery, showLowStock],
    queryFn: () => inventoryService.getIngredients({
      search: searchQuery || undefined,
      lowStock: showLowStock || undefined
    })
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Ingrediente</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Unidad</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Stock Actual</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Stock Mínimo</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Costo</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Estado</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {ingredients?.map((ingredient: any) => {
            const isLowStock = ingredient.currentStock <= ingredient.minStock;
            // F-1: evitar división por cero cuando minStock = 0
            const stockPercentage = ingredient.minStock > 0
              ? Math.min(100, (ingredient.currentStock / ingredient.minStock) * 100)
              : ingredient.currentStock > 0 ? 100 : 0;
            
            return (
              <tr key={ingredient.id} className={cn(
                'hover:bg-gray-50 transition-colors',
                isLowStock && 'bg-red-50'
              )}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isLowStock && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    <span className="font-medium text-gray-900">{ingredient.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{ingredient.unit}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'font-bold',
                    isLowStock ? 'text-red-600' : 'text-gray-900'
                  )}>
                    {ingredient.currentStock}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{ingredient.minStock}</td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {formatCurrency(ingredient.unitCost ?? ingredient.cost ?? 0)}
                </td>
                <td className="px-4 py-3">
                  {isLowStock ? (
                    <Badge variant="danger">Stock Bajo</Badge>
                  ) : stockPercentage < 150 ? (
                    <Badge variant="warning">Medio</Badge>
                  ) : (
                    <Badge variant="success">Disponible</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(ingredient)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(ingredient)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {ingredients?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <PackageOpen className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-800 mb-1">
            {searchQuery || showLowStock ? 'No se encontraron ingredientes' : 'Aún no hay registros'}
          </p>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            {searchQuery || showLowStock
              ? 'Intenta con otra búsqueda o quita el filtro de stock bajo.'
              : 'Crea tu primer ingrediente para comenzar a controlar el stock de tu cocina.'}
          </p>
          {!searchQuery && !showLowStock && onCreate && (
            <button
              onClick={onCreate}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Crear Primer Ingrediente
            </button>
          )}
        </div>
      )}
    </div>
  );
}
