// ── pages/ReceiptPage.tsx ────────────────────────────────────────────────────
// Página pública de recibo digital — sin autenticación.
// Accesible desde QR impreso: /r/:orderId

import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Share2, Printer } from 'lucide-react';
import api from '../services/api';

interface ReceiptItem {
  name:       string;
  quantity:   number;
  unit_price: number;
  subtotal:   number;
  notes:      string | null;
}

interface ReceiptData {
  id:          string;
  number:      number;
  type:        string;
  table_name:  string | null;
  section:     string | null;
  created_at:  string;
  items:       ReceiptItem[];
  subtotal:    number;
  discount:    number;
  tax:         number;
  tip:         number;
  total:       number;
  business: {
    name:    string;
    address: string | null;
    phone:   string | null;
    logo?:   string | null;
  } | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  DINE_IN:  'Mesa',
  DELIVERY: 'Delivery',
  TAKEAWAY: 'Para llevar',
};

export default function ReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [receipt, setReceipt]   = useState<ReceiptData | null>(null);
  const [error,   setError]     = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!orderId) { setError('ID de orden inválido'); setLoading(false); return; }

    api.get(`/public/receipt/${encodeURIComponent(orderId)}`)
      .then(res => setReceipt(res.data.data ?? res.data))
      .catch(err => {
        const msg = err.response?.data?.error ?? err.message ?? 'No se pudo cargar el recibo';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Cargando recibo...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-sm text-center space-y-3">
          <div className="text-5xl">🧾</div>
          <h1 className="text-xl font-bold text-gray-900">Recibo no encontrado</h1>
          <p className="text-sm text-gray-500">{error ?? 'El recibo que buscas no existe o ya expiró.'}</p>
        </div>
      </div>
    );
  }

  const tableRef = receipt.section
    ? `${receipt.section} - ${receipt.table_name}`
    : receipt.table_name;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md overflow-hidden receipt-card">
        {/* Encabezado del negocio */}
        <div className="bg-gray-900 text-white px-6 py-5 text-center">
          {receipt.business?.logo && (
            <img
              src={receipt.business.logo}
              alt={receipt.business.name ?? ''}
              className="w-16 h-16 object-contain mx-auto mb-3 rounded-xl"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <h1 className="text-xl font-bold tracking-tight">{receipt.business?.name}</h1>
          {receipt.business?.address && (
            <p className="text-gray-300 text-xs mt-1">{receipt.business.address}</p>
          )}
          {receipt.business?.phone && (
            <p className="text-gray-400 text-xs">{receipt.business.phone}</p>
          )}
        </div>

        {/* Metadata de la orden */}
        <div className="px-6 py-4 border-b border-dashed border-gray-200 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Orden</span>
            <span className="font-bold text-gray-900">#{receipt.number}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Tipo</span>
            <span className="text-gray-800">{ORDER_TYPE_LABEL[receipt.type] ?? receipt.type}</span>
          </div>
          {tableRef && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Mesa</span>
              <span className="text-gray-800">{tableRef}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Fecha</span>
            <span className="text-gray-800">{fmtDate(receipt.created_at)}</span>
          </div>
        </div>

        {/* Ítems */}
        <div className="px-6 py-4 space-y-3">
          {receipt.items.map((item, i) => (
            <div key={i}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-snug">{item.name}</p>
                  {item.notes && (
                    <p className="text-xs text-gray-400 italic">{item.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium text-gray-900">{fmt(item.subtotal)}</p>
                  {item.quantity > 1 && (
                    <p className="text-xs text-gray-400">{item.quantity} × {fmt(item.unit_price)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="px-6 py-4 border-t border-dashed border-gray-200 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{fmt(receipt.subtotal)}</span>
          </div>
          {receipt.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento</span>
              <span>-{fmt(receipt.discount)}</span>
            </div>
          )}
          {receipt.tax > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>IVA</span>
              <span>{fmt(receipt.tax)}</span>
            </div>
          )}
          {receipt.tip > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Propina</span>
              <span>{fmt(receipt.tip)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
            <span>Total</span>
            <span>{fmt(receipt.total)}</span>
          </div>
        </div>

        {/* Pie */}
        <div className="px-6 py-5 bg-gray-50 text-center">
          <p className="text-xs text-gray-400 mb-4">
            ¡Gracias por tu visita!<br />
            Powered by <span className="font-semibold text-indigo-500">BullWeb</span>
          </p>

          {/* Botones compartir / imprimir */}
          <div className="flex gap-3 no-print">
            {'share' in navigator && (
              <button
                onClick={() => (navigator as any).share({
                  title: `Recibo #${receipt.number}`,
                  text:  `Recibo de ${receipt.business?.name ?? 'BullWeb'}`,
                  url:   window.location.href,
                })}
                className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-gray-600
                           font-medium text-sm flex items-center justify-center gap-2
                           hover:bg-gray-100 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Compartir
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-medium
                         text-sm flex items-center justify-center gap-2
                         hover:bg-orange-400 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
