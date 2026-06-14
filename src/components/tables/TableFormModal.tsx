import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import tablesService from '@/services/tablesService';
import toast from 'react-hot-toast';
import type { Table } from '@/types';

// ============================================================================
// SCHEMA DE VALIDACIÓN
// ============================================================================

const tableSchema = z.object({
  number: z.string().min(1, 'El número de mesa es requerido'),
  capacity: z.number().min(1, 'La capacidad mínima es 1 persona').max(20, 'La capacidad máxima es 20 personas'),
  sectionId: z.string().min(1, 'Debes seleccionar una sección'),
  shape: z.enum(['ROUND', 'SQUARE', 'RECTANGULAR'], {
    errorMap: () => ({ message: 'Selecciona una forma válida' })
  }),
  positionX: z.number().min(0, 'La posición X debe ser mayor o igual a 0'),
  positionY: z.number().min(0, 'La posición Y debe ser mayor o igual a 0')
});

type TableFormData = z.infer<typeof tableSchema>;

// ============================================================================
// TIPOS
// ============================================================================

interface TableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  table?: Table | null;
}

// ============================================================================
// COMPONENTE TABLE FORM MODAL
// ============================================================================

export default function TableFormModal({ isOpen, onClose, table }: TableFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!table;

  // Query de secciones
  const { data: sections, isLoading: loadingSections } = useQuery({
    queryKey: ['sections'],
    queryFn: () => tablesService.getSections(),
    enabled: isOpen
  });

  // Form
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    reset,
    watch 
  } = useForm<TableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      capacity: 4,
      shape: 'SQUARE',
      positionX: 100,
      positionY: 100
    }
  });

  // Reset form cuando cambia la mesa
  useEffect(() => {
    if (table) {
      reset({
        number: table.number,
        capacity: table.capacity,
        sectionId: table.sectionId,
        shape: table.shape,
        positionX: table.positionX || 100,
        positionY: table.positionY || 100
      });
    } else {
      reset({
        number: '',
        capacity: 4,
        sectionId: '',
        shape: 'SQUARE',
        positionX: 100,
        positionY: 100
      });
    }
  }, [table, reset]);

  // Mutation crear/actualizar
  const mutation = useMutation({
    mutationFn: (data: TableFormData) =>
      isEdit
        ? tablesService.updateTable(table!.id, data)
        : tablesService.createTable(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      toast.success(isEdit ? 'Mesa actualizada correctamente' : 'Mesa creada correctamente');
      handleClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || 'Error al guardar la mesa';
      toast.error(errorMessage);
    }
  });

  // Submit
  const onSubmit = (data: TableFormData) => {
    mutation.mutate(data);
  };

  // Cerrar y resetear
  const handleClose = () => {
    reset();
    onClose();
  };

  const selectedShape = watch('shape');

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEdit ? `Editar Mesa ${table?.number}` : 'Crear Nueva Mesa'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Número de mesa */}
        <Input
          label="Número de Mesa"
          {...register('number')}
          error={errors.number?.message}
          placeholder="Ej: 1, A1, VIP-1"
          autoFocus
        />

        {/* Capacidad */}
        <div>
          <Input
            label="Capacidad (personas)"
            type="number"
            {...register('capacity', { valueAsNumber: true })}
            error={errors.capacity?.message}
            placeholder="4"
            min={1}
            max={20}
          />
          <p className="text-xs text-gray-500 mt-1">
            Número máximo de personas que pueden sentarse
          </p>
        </div>

        {/* Sección */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sección del Restaurante *
          </label>
          {loadingSections ? (
            <div className="h-10 bg-gray-200 animate-pulse rounded-lg" />
          ) : (
            <select
              {...register('sectionId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Seleccionar sección...</option>
              {sections?.map(section => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          )}
          {errors.sectionId && (
            <p className="text-red-500 text-sm mt-1">{errors.sectionId.message}</p>
          )}
        </div>

        {/* Forma de la mesa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Forma de la Mesa *
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'ROUND' as const, label: 'Redonda', emoji: '⭕' },
              { value: 'SQUARE' as const, label: 'Cuadrada', emoji: '⬜' },
              { value: 'RECTANGULAR' as const, label: 'Rectangular', emoji: '▬' }
            ].map(shape => (
              <label key={shape.value} className="cursor-pointer group">
                <input
                  type="radio"
                  value={shape.value}
                  {...register('shape')}
                  className="sr-only peer"
                />
                <div className="px-4 py-3 border-2 rounded-lg text-center transition-all peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:shadow-md hover:border-blue-300 hover:bg-blue-25">
                  <div className="text-3xl mb-1">{shape.emoji}</div>
                  <div className="text-sm font-medium text-gray-700 peer-checked:text-blue-700">
                    {shape.label}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {errors.shape && (
            <p className="text-red-500 text-sm mt-2">{errors.shape.message}</p>
          )}
        </div>

        {/* Posición en el plano */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Posición en el Plano
          </label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Posición X (píxeles)"
              type="number"
              {...register('positionX', { valueAsNumber: true })}
              error={errors.positionX?.message}
              placeholder="100"
              min={0}
            />
            <Input
              label="Posición Y (píxeles)"
              type="number"
              {...register('positionY', { valueAsNumber: true })}
              error={errors.positionY?.message}
              placeholder="100"
              min={0}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Coordenadas de la mesa en el plano visual (superior izquierda = 0,0)
          </p>
        </div>

        {/* Preview de la forma */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Vista Previa:</p>
          <div className="flex justify-center">
            <div
              className={`w-24 h-24 border-3 border-blue-500 bg-blue-100 flex items-center justify-center font-bold text-blue-700 ${
                selectedShape === 'ROUND' ? 'rounded-full' : 'rounded-lg'
              } ${selectedShape === 'RECTANGULAR' ? 'w-32' : ''}`}
            >
              {watch('number') || '?'}
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            isLoading={mutation.isPending}
          >
            {mutation.isPending 
              ? (isEdit ? 'Actualizando...' : 'Creando...') 
              : (isEdit ? 'Actualizar Mesa' : 'Crear Mesa')
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
}
