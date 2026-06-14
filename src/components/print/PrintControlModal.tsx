/**
 * PrintControlModal — Modal "Imprimir Control de Mesa"
 * - Si hay orderId activo: muestra selector de impresora y usa la API (reprintOrder)
 * - Siempre disponible: botón "Pantalla" que abre ventana del navegador con ticket formateado
 */
import { useState } from 'react';
import { Printer, X, Receipt, Loader2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminService } from '@/services/adminService';
import type { Printer as PrinterType } from '@/services/adminService';

export interface PrintControlItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PrintControlModalProps {
  open: boolean;
  onClose: () => void;
  /** Si está presente, usa la API de impresora; si no, solo impresión por ventana */
  orderId?: string;
  orderNumber?: number | string;
  customerName?: string;
  /** Ej: "Mesa 5", "Mostrador", "Delivery" */
  tableLabel?: string;
  items: PrintControlItem[];
  subtotal: number;
  tax: number;
  total: number;
}

const fmt = (n: number) => Math.round(n || 0).toLocaleString('es-CL');

export function PrintControlModal({
  open,
  onClose,
  orderId,
  orderNumber,
  customerName,
  tableLabel,
  items,
  subtotal,
  tax,
  total,
}: PrintControlModalProps) {
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [printState, setPrintState] = useState<'idle' | 'printing' | 'done' | 'error'>('idle');

  const { data: printers = [], isLoading: loadingPrinters } = useQuery<PrinterType[]>({
    queryKey: ['admin', 'printers', 'list'],
    queryFn: () => adminService.listPrinters(),
    enabled: open && !!orderId,
    staleTime: 60_000,
  });

  const activePrinters = printers.filter(p => p.is_active);

  const printMut = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error('Sin orden activa');
      const { job_id } = await adminService.reprintOrder(orderId, selectedPrinter, 'receipt');
      const deadline = Date.now() + 20_000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 800));
        const job = await adminService.getJobStatus(job_id);
        if (job.status === 'printed' || job.status === 'sent') return job_id;
        if (job.status === 'failed' || job.status === 'cancelled') {
          throw new Error((job as any).error_msg ?? 'El job fue marcado como fallido');
        }
      }
      throw new Error('Timeout — el agente no respondió en 20s');
    },
    onMutate: () => setPrintState('printing'),
    onSuccess: () => {
      setPrintState('done');
      toast.success('✅ Control de mesa impreso');
      setTimeout(() => { setPrintState('idle'); onClose(); }, 1500);
    },
    onError: (e: any) => {
      setPrintState('error');
      toast.error(`❌ Error al imprimir: ${e.message}`);
      setTimeout(() => setPrintState('idle'), 3000);
    },
  });

  const handleBrowserPrint = () => {
    const now = new Date();
    const date = now.toLocaleDateString('es-CL');
    const time = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Control de Mesa</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 11px; width: 280px; padding: 8px; }
  h2 { text-align: center; font-size: 13px; margin-bottom: 2px; letter-spacing: 1px; }
  .center { text-align: center; margin: 1px 0; }
  .row { display: flex; justify-content: space-between; padding: 1px 0; }
  .bold { font-weight: bold; }
  .big { font-size: 13px; }
  hr { border: none; border-top: 1px dashed #000; margin: 5px 0; }
  @media print { @page { margin: 4mm; size: 80mm auto; } body { width: 100%; } }
</style>
</head><body>
  <h2>CONTROL DE MESA</h2>
  ${tableLabel ? `<p class="center">${tableLabel}</p>` : ''}
  ${orderNumber ? `<p class="center">Orden #${orderNumber}</p>` : ''}
  <hr>
  <p>${date} &nbsp; ${time}</p>
  ${customerName ? `<p>Cliente: ${customerName}</p>` : ''}
  <hr>
  ${items.map(i =>
    `<div class="row"><span>${i.quantity}x ${i.name}</span><span>$${fmt(i.total)}</span></div>`
  ).join('\n')}
  <hr>
  <div class="row"><span>Subtotal</span><span>$${fmt(subtotal)}</span></div>
  <hr>
  <div class="row bold big"><span>TOTAL</span><span>$${fmt(total)}</span></div>
</body></html>`;

    const win = window.open('', '_blank', 'width=400,height=600');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); win.close(); }, 300);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Printer className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Imprimir Control de Mesa</h3>
              <p className="text-xs text-gray-500">
                {orderNumber ? `Orden #${orderNumber}` : tableLabel ?? 'Vista previa'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Resumen de ítems */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm max-h-44 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-gray-400 text-center text-xs py-2">Sin productos en la orden</p>
            ) : (
              <>
                {customerName && (
                  <p className="text-xs text-gray-500 pb-1">Cliente: <span className="font-medium text-gray-700">{customerName}</span></p>
                )}
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between text-gray-700">
                    <span className="truncate pr-2">{item.quantity}x {item.name}</span>
                    <span className="font-medium shrink-0">${fmt(item.total)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-1.5 mt-1 space-y-0.5">
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>Subtotal</span>
                    <span>${fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span>${fmt(total)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Selector de impresora — solo cuando hay orderId */}
          {orderId && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Impresora
              </label>
              {loadingPrinters ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando impresoras...
                </div>
              ) : activePrinters.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No hay impresoras activas. Usa "Pantalla" para imprimir.
                </p>
              ) : (
                <select
                  value={selectedPrinter}
                  onChange={e => setSelectedPrinter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                >
                  <option value="">— Seleccionar impresora —</option>
                  {activePrinters.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={handleBrowserPrint}
            className="flex-1 py-2.5 border-2 border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Receipt className="w-4 h-4" />
            Pantalla
          </button>
          {orderId && activePrinters.length > 0 && (
            <button
              onClick={() => {
                if (!selectedPrinter) { toast.error('Selecciona una impresora'); return; }
                printMut.mutate();
              }}
              disabled={printState === 'printing' || printState === 'done'}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
            >
              {printState === 'printing' ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Imprimiendo...</>
              ) : printState === 'done' ? (
                <>✓ Listo</>
              ) : (
                <><Printer className="w-4 h-4" />Imprimir</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
