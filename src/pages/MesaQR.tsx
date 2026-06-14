import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Bell, Receipt, CheckCircle } from 'lucide-react';

export default function MesaQR() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('mesa');
  const [requestSent, setRequestSent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequest = async (type: 'call_waiter' | 'request_bill') => {
    if (!slug || loading) return;
    setLoading(true);
    try {
      await fetch('/api/public/table-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, tableNumber, type })
      });
      setRequestSent(type);
      setTimeout(() => setRequestSent(null), 4000);
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Servicio de Mesa</h1>
          {tableNumber && (
            <p className="text-lg font-semibold text-orange-500 mt-1">Mesa {tableNumber}</p>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleRequest('call_waiter')}
            disabled={!!requestSent || loading}
            className={`w-full py-6 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 transition-all active:scale-95 ${
              requestSent === 'call_waiter' 
                ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30'
            }`}
          >
            {requestSent === 'call_waiter' ? (
              <><CheckCircle className="w-7 h-7" />¡Mesero en camino!</>
            ) : (
              <><Bell className="w-7 h-7" />Llamar Mesero</>
            )}
          </button>

          <button
            onClick={() => handleRequest('request_bill')}
            disabled={!!requestSent || loading}
            className={`w-full py-6 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 transition-all active:scale-95 ${
              requestSent === 'request_bill' 
                ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg'
            }`}
          >
            {requestSent === 'request_bill' ? (
              <><CheckCircle className="w-7 h-7" />¡Cuenta solicitada!</>
            ) : (
              <><Receipt className="w-7 h-7" />Pedir la Cuenta</>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4">Escanea este QR solo desde tu mesa</p>
      </div>
    </div>
  );
}