import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { inventoryService } from '@/services/inventoryService';
import { menuService } from '@/services/menuService';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface RecipeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe?: any;
}

export default function RecipeFormModal({ isOpen, onClose, recipe }: RecipeFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!recipe;

  const [selectedProductId, setSelectedProductId] = useState(recipe?.productId || '');
  const [items, setItems] = useState<Array<{ ingredientId: string; quantity: number }>>(
    (recipe?.recipe_items ?? recipe?.items)?.map((item: any) => ({
      ingredientId: item.ingredientId,
      quantity: item.quantity
    })) || []
  );

  const { data: products } = useQuery({
    queryKey: ['menu-products'],
    queryFn: () => menuService.getProducts({})
  });

  const { data: ingredients } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => inventoryService.getIngredients({})
  });

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? inventoryService.updateRecipe(recipe.id, data)
        : inventoryService.createRecipe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success(isEdit ? 'Receta actualizada' : 'Receta creada');
      onClose();
    }
  });

  const addItem = () => {
    setItems([...items, { ingredientId: '', quantity: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: 'ingredientId' | 'quantity', value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const calculateTotalCost = () => {
    return items.reduce((sum, item) => {
      const ingredient = ingredients?.find((ing: any) => ing.id === item.ingredientId);
      // C-3: API devuelve unitCost, soportar ambos nombres por compatibilidad
      const unitCost = ingredient?.unitCost ?? ingredient?.cost ?? 0;
      return sum + unitCost * item.quantity;
    }, 0);
  };

  const handleSubmit = () => {
    if (!selectedProductId) {
      toast.error('Selecciona un producto');
      return;
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un ingrediente');
      return;
    }
    if (items.some(item => !item.ingredientId || item.quantity <= 0)) {
      toast.error('Completa todos los ingredientes');
      return;
    }

    mutation.mutate({
      productId: selectedProductId,
      items
    });
  };

  const totalCost = calculateTotalCost();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar Receta' : 'Nueva Receta'}>
      <div className="space-y-4">
        {/* Producto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Producto
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            disabled={isEdit}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Seleccionar...</option>
            {products?.map((product: any) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </div>

        {/* Ingredientes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Ingredientes
            </label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-1" />
              Agregar
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={item.ingredientId}
                  onChange={(e) => updateItem(index, 'ingredientId', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Seleccionar ingrediente...</option>
                  {ingredients?.map((ing: any) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                  placeholder="Cant."
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={() => removeItem(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Costo total */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Costo Total de Receta:</span>
            <span className="text-2xl font-bold text-primary-600">
              {formatCurrency(totalCost)}
            </span>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="flex-1" isLoading={mutation.isPending}>
            {isEdit ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
