// ═══════════════════════════════════════════════════════════════
// REMOVE ITEM REASON MODAL
// Pide al usuario un motivo obligatorio antes de eliminar un item de la orden.
// El backend exige `reason` en el body del DELETE /pos/orders/:id/items/:itemId
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';

export const REMOVAL_REASONS: string[] = [
  'Error de carga',
  'Cliente lo rechazó',
  'Producto agotado',
  'Cortesía del local',
];

interface RemoveItemReasonModalProps {
  itemName?: string;
  onConfirm: (reason: string) => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const RemoveItemReasonModal = ({
  itemName,
  onConfirm,
  onCancel,
  loading = false,
}: RemoveItemReasonModalProps) => {
  const [selected, setSelected] = useState<string>('');

  const handleConfirm = () => {
    if (!selected || loading) return;
    onConfirm(selected);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]" onClick={onCancel} />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl z-[70] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Trash2 size={18} />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Eliminar producto</h2>
              {itemName && (
                <p className="text-red-100 text-xs truncate max-w-[280px]">{itemName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-9 h-9 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* CUERPO */}
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Selecciona un <strong>motivo obligatorio</strong>. Esta acción quedará registrada para
            auditoría.
            </p>
          </div>

          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Motivo de eliminación
          </p>

          <div className="space-y-2">
            {REMOVAL_REASONS.map(reason => {
              const isSel = selected === reason;
              return (
                <button
                  key={reason}
                  onClick={() => setSelected(reason)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    isSel
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSel ? 'border-red-500 bg-red-500' : 'border-gray-300'
                    }`}
                  >
                    {isSel && <span className="w-2 h-2 bg-white rounded-full" />}
                  </span>
                  <span className={`text-sm font-medium ${isSel ? 'text-red-700' : 'text-gray-700'}`}>
                    {reason}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white px-5 py-3 flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || loading}
            className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Eliminar
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default RemoveItemReasonModal;