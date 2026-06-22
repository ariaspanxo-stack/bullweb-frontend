import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { inventoryService } from '@/services/inventoryService';

// ─────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────
const ingredientSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  unit: z.string().min(1, 'Unidad requerida'),
  category: z.string().optional(),
  // Stock es opcional para el usuario: si viene vacío/NaN/null se convierte a 0
  currentStock: z.preprocess(
    (val) => (val === '' || val === null || Number.isNaN(val) ? 0 : val),
    z.number().min(0, 'Stock debe ser positivo'),
  ),
  minStock: z.preprocess(
    (val) => (val === '' || val === null || Number.isNaN(val) ? 0 : val),
    z.number().min(0, 'Stock mínimo debe ser positivo'),
  ),
  cost: z.number().min(0, 'Costo debe ser positivo'),
});

type IngredientForm = z.infer<typeof ingredientSchema>;

interface IngredientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient?: any;
}

// ─────────────────────────────────────────────────────────────
// Constantes UI
// ─────────────────────────────────────────────────────────────
const commonUnits = ['kg', 'g', 'L', 'ml', 'unidad', 'docena', 'caja', 'bolsa', 'paquete'];

// Sugerencias de categorías comunes para el datalist
const commonCategories = [
  'General',
  'Lácteos',
  'Vegetales',
  'Carnes',
  'Pescados y Mariscos',
  'Frutas',
  'Bebidas',
  'Condimentos y Especias',
  'Harinas y Cereales',
  'Limpieza',
  'Otros',
];

const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors';
const labelClass = 'text-sm font-medium text-slate-700 mb-1 block';
const sectionClass = 'bg-white rounded-xl p-4 shadow-sm border border-slate-100';

// ─────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────
export default function IngredientFormModal({ isOpen, onClose, ingredient }: IngredientFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!ingredient;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<IngredientForm>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: ingredient || {
      currentStock: 0,
      minStock: 0,
      cost: 0,
      category: '',
    },
  });

  // C-2: resetear form cuando cambia el ingrediente (defaultValues solo aplica en el primer mount)
  useEffect(() => {
    if (ingredient) {
      reset({
        ...ingredient,
        category: ingredient.category || '',
      });
    } else {
      reset({ name: '', unit: '', category: '', currentStock: 0, minStock: 0, cost: 0 });
    }
  }, [ingredient, isEdit, reset]);

  const mutation = useMutation({
    mutationFn: (data: IngredientForm) => {
      // Si no se eligió/escribió categoría, asignar "General" por defecto
      const payload = {
        ...data,
        category: data.category?.trim() || 'General',
      };
      return isEdit
        ? inventoryService.updateIngredient(ingredient.id, payload)
        : inventoryService.createIngredient(payload);
    },
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
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}>
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        {/* ───────────── Sección: Información Básica ───────────── */}
        <div className={sectionClass}>
          <h3 className="text-base font-semibold text-slate-900 mb-4">Información Básica</h3>

          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label className={labelClass}>
                Nombre del Ingrediente <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="Ej: Tomate, Pollo, Arroz"
                className={`${inputClass} ${errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            {/* Categoría — input con datalist (permite crear categoría nueva) */}
            <div>
              <label className={labelClass}>
                Categoría{' '}
                <span className="text-slate-400 font-normal text-xs">(opcional — puedes escribir una nueva)</span>
              </label>
              <input
                type="text"
                list="ingredient-category-suggestions"
                {...register('category')}
                placeholder="Ej: Lácteos, Vegetales, Carnes... o déjalo vacío"
                className={inputClass}
              />
              <datalist id="ingredient-category-suggestions">
                {commonCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-slate-400">
                💡 Elige una categoría existente o escribe una nueva. Si la dejas vacía, se asignará "General".
              </p>
            </div>

            {/* Unidad */}
            <div>
              <label className={labelClass}>
                Unidad de Medida <span className="text-red-500">*</span>
              </label>
              <select
                {...register('unit')}
                className={`${inputClass} ${errors.unit ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
              >
                <option value="">Seleccionar...</option>
                {commonUnits.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
              {errors.unit && <p className="mt-1 text-sm text-red-600">{errors.unit.message}</p>}
            </div>
          </div>
        </div>

        {/* ───────────── Sección: Precios y Stock ───────────── */}
        <div className={sectionClass}>
          <h3 className="text-base font-semibold text-slate-900 mb-4">Precios y Stock</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Stock Actual */}
            {isEdit ? (
              <div>
                <label className={labelClass}>Stock Actual</label>
                <div className="flex items-center gap-2">
                  <input
                    value={ingredient.currentStock}
                    disabled
                    type="number"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-1">
                  📦 Para ajustar stock ve a Inventario → Movimientos
                </p>
              </div>
            ) : (
              <div>
                <label className={labelClass}>Stock Actual</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('currentStock', { valueAsNumber: true })}
                  placeholder="0"
                  className={`${inputClass} ${
                    errors.currentStock ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                  }`}
                />
                {errors.currentStock && <p className="mt-1 text-sm text-red-600">{errors.currentStock.message}</p>}
              </div>
            )}

            {/* Stock Mínimo */}
            <div>
              <label className={labelClass}>Stock Mínimo</label>
              <input
                type="number"
                step="0.01"
                {...register('minStock', { valueAsNumber: true })}
                placeholder="0"
                className={`${inputClass} ${
                  errors.minStock ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                }`}
              />
              {errors.minStock && <p className="mt-1 text-sm text-red-600">{errors.minStock.message}</p>}
            </div>

            {/* Costo por Unidad */}
            <div className="col-span-2">
              <label className={labelClass}>
                Costo por Unidad ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('cost', { valueAsNumber: true })}
                placeholder="0"
                className={`${inputClass} ${errors.cost ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
              />
              {errors.cost && <p className="mt-1 text-sm text-red-600">{errors.cost.message}</p>}
            </div>
          </div>
        </div>

        {/* ───────────── Botones ───────────── */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Ingrediente'}
          </button>
        </div>
      </form>
    </Modal>
  );
}