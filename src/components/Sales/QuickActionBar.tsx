import type { Sale } from '@/types/sales.types';
import { Printer, Trash2, RefreshCw, Pencil } from 'lucide-react';
import { useState } from 'react';

interface QuickActionBarProps {
  sale: Sale;
  onPay?: () => Promise<void>;
  onPrint?: () => void | Promise<void>;
  onEdit?: () => void;
  onCancel?: () => Promise<void>;
  onConfirm?: () => Promise<void>;
}

export function QuickActionBar({ 
  sale, 
  onPay, 
  onPrint, 
  onEdit, 
  onCancel, 
  onConfirm 
}: QuickActionBarProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string, fn?: () => Promise<void>) => {
    if (!fn) return;
    setLoading(action);
    try {
      await fn();
    } finally {
      setLoading(null);
    }
  };

  // Lógica de visibilidad de acciones según estado
  const canCancel = sale.status !== 'cancelled' && sale.status !== 'CANCELLED';
  const canEdit   = ['open', 'PENDING', 'PREPARING'].includes(sale.status as string);
  const canPrint  = true;

  return (
    <div className="flex gap-2 p-4 bg-white border-b border-gray-200">
      {/* IMPRIMIR */}
      {canPrint && onPrint && (
        <button
          onClick={onPrint}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      )}

      {/* EDITAR */}
      {canEdit && onEdit && (
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-medium transition-colors"
        >
          <Pencil className="w-4 h-4" />
          Editar
        </button>
      )}

      {/* ELIMINAR */}
      {canCancel && onCancel && (
        <button
          onClick={() => handleAction('cancel', onCancel)}
          disabled={loading !== null}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading === 'cancel' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Eliminar
        </button>
      )}
    </div>
  );
}
