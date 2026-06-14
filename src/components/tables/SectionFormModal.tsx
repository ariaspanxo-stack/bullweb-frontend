import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import tablesService from '@/services/tablesService';
import toast from 'react-hot-toast';
import { Layers } from 'lucide-react';

// ============================================================================
// SCHEMA DE VALIDACIÓN
// ============================================================================

const sectionSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede tener más de 50 caracteres')
});

type SectionFormData = z.infer<typeof sectionSchema>;

// ============================================================================
// TIPOS
// ============================================================================

interface SectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// COMPONENTE SECTION FORM MODAL
// ============================================================================

export default function SectionFormModal({ isOpen, onClose }: SectionFormModalProps) {
  const queryClient = useQueryClient();

  // Form
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    reset 
  } = useForm<SectionFormData>({
    resolver: zodResolver(sectionSchema)
  });

  // Mutation para crear sección
  const mutation = useMutation({
    mutationFn: (data: SectionFormData) => tablesService.createSection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Sección creada correctamente');
      reset();
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || 'Error al crear la sección';
      toast.error(errorMessage);
    }
  });

  // Submit
  const onSubmit = (data: SectionFormData) => {
    mutation.mutate(data);
  };

  // Cerrar y resetear
  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Crear Nueva Sección">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Header con icono */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">Nueva Sección</h3>
            <p className="text-sm text-blue-700">
              Organiza tus mesas por áreas del restaurante
            </p>
          </div>
        </div>

        {/* Nombre de la sección */}
        <div>
          <Input
            label="Nombre de la Sección"
            {...register('name')}
            error={errors.name?.message}
            placeholder="Ej: Terraza, Interior, VIP, Salón Principal"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-2">
            Este nombre aparecerá en el selector de secciones
          </p>
        </div>

        {/* Ejemplos */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            💡 Ejemplos de secciones:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Terraza / Exterior</li>
            <li>• Salón Principal / Interior</li>
            <li>• VIP / Premium</li>
            <li>• Bar / Barra</li>
            <li>• Segundo Piso</li>
          </ul>
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
            {mutation.isPending ? 'Creando...' : 'Crear Sección'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
