import { useState, useCallback } from 'react';
import type { ConfirmDialogProps } from '@/components/ui/ConfirmDialog';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

/**
 * Hook que provee un diálogo de confirmación reutilizable.
 *
 * Uso:
 * ```tsx
 * const { confirm, dialogProps } = useConfirm();
 *
 * const handleDelete = async () => {
 *   const ok = await confirm({ message: '¿Eliminar item?' });
 *   if (!ok) return;
 *   deleteMutation.mutate(id);
 * };
 *
 * // En el JSX al final del return:
 * <ConfirmDialog {...dialogProps} />
 * ```
 */
export function useConfirm() {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const dialogProps: ConfirmDialogProps = state
    ? {
        isOpen: true,
        title: state.title,
        message: state.message,
        confirmLabel: state.confirmLabel,
        cancelLabel: state.cancelLabel,
        variant: state.variant,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
      }
    : {
        isOpen: false,
        message: '',
        onConfirm: () => {},
        onCancel: () => {},
      };

  return { confirm, dialogProps };
}
