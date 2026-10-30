// ═══════════════════════════════════════════════════════════════
// SUSPEND TENANT CONFIRM — HOTFIX 294
// Confirmación obligatoria antes de suspender un local desde /superadmin.
// Nombra el local; portal con z-100; botones >= 44px; acción destructiva en rojo.
// Se usa en: lista de clientes, modal de cliente, ficha (encabezado y
// "Configuración rápida") y panel de alertas.
// ═══════════════════════════════════════════════════════════════

import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface SuspendTenantConfirmProps {
  open:       boolean;
  tenantName: string;
  loading?:   boolean;
  onConfirm:  () => void;
  onCancel:   () => void;
}

export function SuspendTenantConfirm({ open, tenantName, loading = false, onConfirm, onCancel }: SuspendTenantConfirmProps) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={loading ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 text-rose-400 flex-shrink-0" />
            <h3 className="text-lg font-semibold text-white">Suspender {tenantName}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="min-w-[44px] min-h-[44px] -mt-2 -mr-2 flex items-center justify-center text-gray-500 hover:text-white transition-colors disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          ¿Suspender el local <span className="text-white font-semibold">{tenantName}</span>?
          <span className="block text-xs text-gray-500 mt-1">
            El local deja de poder operar hasta que se reactive.
          </span>
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 min-h-[44px] bg-gray-800 hover:bg-gray-700 text-gray-200 border border-white/10 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Suspendiendo…' : 'Sí, suspender'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
