import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { inventoryService } from '@/services/inventoryService';
import toast from 'react-hot-toast';

const ingredientSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  unit: z.string().min(1, 'Unidad requerida'),
  currentStock: z.number().min(0, 'Stock debe ser positivo'),
  minStock: z.number().min(0, 'Stock mínimo debe ser positivo'),
  cost: z.number().min(0, 'Costo debe ser positivo')
});

type IngredientForm = z.infer<typeof ingredientSchema>;

interface IngredientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient?: any;
}

const commonUnits = [
  'kg', 'g', 'L', 'ml', 'unidad', 'docena', 'caja', 'bolsa', 'paquete'
];

export default function IngredientFormModal({ isOpen, onClose, ingredient }: IngredientFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!ingredient;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<IngredientForm>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: ingredient || {
      currentStock: 0,
      minStock: 0,
      cost: 0
    }
  });

  // C-2: resetear form cuando cambia el ingrediente (defaultValues solo aplica en el primer mount)
  useEffect(() => {
    if (ingredient) {
      reset(ingredient);
    } else {
      reset({ name: '', unit: '', currentStock: 0, minStock: 0, cost: 0 });
    }
  }, [ingredient, isEdit, reset]);

  const mutation = useMutation({
    mutationFn: (data: IngredientForm) =>
      isEdit
        ? inventoryService.updateIngredient(ingredient.id, data)
        : inventoryService.createIngredient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      toast.success(isEdit ? 'Ingrediente actualizado' : 'Ingrediente creado');
      reset();
      onClose();
    },
    onError: (e: any) => {
      toast.error(e?.message || (isEdit ? 'Error al actualizar ingrediente' : 'Error al crear ingrediente'));
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
    >
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <Input
          label="Nombre del Ingrediente"
          {...register('name')}
          error={errors.name?.message}
          placeholder="Ej: Tomate, Pollo, Arroz"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unidad de Medida
          </label>
          <select
            {...register('unit')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Seleccionar...</option>
            {commonUnits.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          {errors.unit && (
            <p className="text-red-500 text-sm mt-1">{errors.unit.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* F-5: en modo edición, currentStock es solo lectura — usar Movimientos para ajustarlo */}
          {isEdit ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
              <div className="flex items-center gap-2">
                <input
                  value={ingredient.currentStock}
                  disabled
                  type="number"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-1">
                📦 Para ajustar stock ve a Inventario → Movimientos
              </p>
            </div>
          ) : (
            <Input
              label="Stock Actual"
              type="number"
              step="0.01"
              {...register('currentStock', { valueAsNumber: true })}
              error={errors.currentStock?.message}
            />
          )}
          <Input
            label="Stock Mínimo"
            type="number"
            step="0.01"
            {...register('minStock', { valueAsNumber: true })}
            error={errors.minStock?.message}
          />
        </div>

        <Input
          label="Costo por Unidad ($)"
          type="number"
          step="0.01"
          {...register('cost', { valueAsNumber: true })}
          error={errors.cost?.message}
        />

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1" isLoading={mutation.isPending}>
            {isEdit ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
