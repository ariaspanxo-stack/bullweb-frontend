// ═══════════════════════════════════════════════════════════════
// useRemovalReason — Hook para pedir motivo de eliminación
// Retorna una función `promptReason(itemName)` que devuelve una Promise
// con el motivo seleccionado, o `null` si el usuario cancela.
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, type ReactNode } from 'react';
import { RemoveItemReasonModal } from '../components/restaurant/shared/RemoveItemReasonModal';

interface PendingTarget {
  itemName: string;
  resolve: (reason: string | null) => void;
}

export function useRemovalReason(): {
  promptReason: (itemName?: string) => Promise<string | null>;
  modalElement: ReactNode;
} {
  const [target, setTarget] = useState<PendingTarget | null>(null);

  const promptReason = useCallback((itemName = '') => {
    return new Promise<string | null>(resolve => {
      setTarget({ itemName, resolve });
    });
  }, []);

  const handleConfirm = useCallback((reason: string) => {
    setTarget(current => {
      if (current) current.resolve(reason);
      return null;
    });
  }, []);

  const handleCancel = useCallback(() => {
    setTarget(current => {
      if (current) current.resolve(null);
      return null;
    });
  }, []);

  const modalElement = target ? (
    <RemoveItemReasonModal
      itemName={target.itemName}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { promptReason, modalElement };
}