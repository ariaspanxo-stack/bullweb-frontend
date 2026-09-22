import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '@/services/inventoryService';
import { Edit, Trash2, AlertTriangle, AlertOctagon, PackageOpen, Plus } from 'lucide-react';
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
      <div className="bg-white/5 rounded-lg border border-white/10 p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-white/10 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      <table className="w-full">
        <thead className="bg-white/5 border-b border-white/10">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ingrediente</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Unidad</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Stock Actual</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Stock Mínimo</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Costo</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {ingredients?.map((ingredient: any) => {
            // Jerarquía de estados: quiebre (<0) > stock bajo (0..min) > medio > disponible
            const isBrokenStock = (ingredient.currentStock ?? 0) < 0;
            const isLowStock = !isBrokenStock && ingredient.currentStock <= ingredient.minStock;
            // F-1: evitar división por cero cuando minStock = 0
            const stockPercentage = ingredient.minStock > 0
              ? Math.min(100, (ingredient.currentStock / ingredient.minStock) * 100)
              : ingredient.currentStock > 0 ? 100 : 0;
            
            return (
              <tr key={ingredient.id} className={cn(
                'hover:bg-white/5 transition-colors',
                isBrokenStock && 'bg-red-500/10',
                isLowStock && 'bg-red-500/5'
              )}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isBrokenStock && <AlertOctagon className="w-4 h-4 text-red-400" />}
                    {!isBrokenStock && isLowStock && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                    <span className="font-medium text-white">{ingredient.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">{ingredient.unit}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'font-bold',
                    isBrokenStock ? 'text-red-400' : isLowStock ? 'text-amber-400' : 'text-white'
                  )}>
                    {ingredient.currentStock}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400">{ingredient.minStock}</td>
                <td className="px-4 py-3 text-sm text-gray-200">
                  {formatCurrency(ingredient.unitCost ?? ingredient.cost ?? 0)}
                </td>
                <td className="px-4 py-3">
                  {isBrokenStock ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-full bg-red-500/20 text-red-400 border border-red-500/50">
                      <AlertOctagon className="w-3 h-3" />
                      Quiebre de Stock
                    </span>
                  ) : isLowStock ? (
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
                      className="p-1.5 text-gray-400 hover:text-brand-400 hover:bg-white/10 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(ingredient)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"
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
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
            <PackageOpen className="w-10 h-10 text-gray-500" />
          </div>
          <p className="text-lg font-semibold text-white mb-1">
            {searchQuery || showLowStock ? 'No se encontraron ingredientes' : 'Aún no hay registros'}
          </p>
          <p className="text-sm text-gray-400 mb-6 max-w-xs">
            {searchQuery || showLowStock
              ? 'Intenta con otra búsqueda o quita el filtro de stock bajo.'
              : 'Crea tu primer ingrediente para comenzar a controlar el stock de tu cocina.'}
          </p>
          {!searchQuery && !showLowStock && onCreate && (
            <button
              onClick={onCreate}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
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
