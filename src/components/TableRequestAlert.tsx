import { Bell, Receipt, HandHelping } from 'lucide-react';
import type { TableRequest } from '@/hooks/useTableRequestAlerts';

interface TableRequestAlertProps {
  requests: TableRequest[];
  onDismiss: (id: string) => void;
}

export default function TableRequestAlert({ requests, onDismiss }: TableRequestAlertProps) {
  if (requests.length === 0) return null;

  const current = requests[0];
  const isCallWaiter = current.type === 'call_waiter';

  const title = isCallWaiter ? '🔔 Mesero solicitado' : '📄 Cuenta solicitada';
  const body = current.message || (
    isCallWaiter
      ? `Mesa ${current.tableNumber || '?'} solicita mesero`
      : `Mesa ${current.tableNumber || '?'} solicita la cuenta`
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 text-center space-y-4 animate-bounce-once">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
          isCallWaiter ? 'bg-orange-100' : 'bg-blue-100'
        }`}>
          {isCallWaiter ? (
            <HandHelping className="w-10 h-10 text-orange-500 animate-ring" />
          ) : (
            <Receipt className="w-10 h-10 text-blue-500 animate-ring" />
          )}
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">{title}</h2>
        <p className="text-lg text-gray-600">{body}</p>
        {current.tableNumber && (
          <div className="inline-block bg-orange-500 text-white font-bold text-xl px-6 py-2 rounded-full">
            Mesa {current.tableNumber}
          </div>
        )}
        <p className="text-sm text-gray-400">
          {new Date(current.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <button
          onClick={() => onDismiss(current.id)}
          className={`w-full py-4 font-bold text-lg rounded-xl transition-colors active:scale-95 ${
            isCallWaiter
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          ¡Voy! (Atendido)
        </button>
        {requests.length > 1 && (
          <p className="text-xs text-orange-500 font-semibold">
            +{requests.length - 1} solicitud{requests.length > 2 ? 'es' : ''} más en espera
          </p>
        )}
      </div>
    </div>
  );
}