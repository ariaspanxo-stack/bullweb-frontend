import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import customersService from '@/services/customersService';
import toast from 'react-hot-toast';

const customerSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal(''))
});

type CustomerForm = z.infer<typeof customerSchema>;

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: any;
}

export default function CustomerFormModal({ isOpen, onClose, customer }: CustomerFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!customer;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer || {}
  });

  const mutation = useMutation({
    mutationFn: async (data: CustomerForm) => {
      const result = isEdit
        ? await customersService.update(customer.id, data)
        : await customersService.create(data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['top-customers'] });
      toast.success(isEdit ? 'Cliente actualizado' : 'Cliente creado');
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || error.message || 'Error al guardar');
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
    >
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <Input
          label="Nombre Completo"
          {...register('name')}
          error={errors.name?.message}
          placeholder="Ej: Juan Pérez"
        />

        <Input
          label="Teléfono (opcional)"
          {...register('phone')}
          error={errors.phone?.message}
          placeholder="+51 999 999 999"
        />

        <Input
          label="Email (opcional)"
          type="email"
          {...register('email')}
          error={errors.email?.message}
          placeholder="cliente@email.com"
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
