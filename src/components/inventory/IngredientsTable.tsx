import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface IngredientsTableProps {
  searchQuery: string;
  showLowStock: boolean;
  onEdit: (ingredient: any) => void;
  onDelete: (ingredient: any) => void;
}

export default function IngredientsTable({
  searchQuery,
  showLowStock,
  onEdit,
  onDelete
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
                  $ {(ingredient.unitCost ?? ingredient.cost)?.toFixed(2) || '-'}
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
        <div className="text-center py-12 text-gray-500">
          No se encontraron ingredientes
        </div>
      )}
    </div>
  );
}
