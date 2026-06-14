// src/components/cash/ShiftPrinterSelect.tsx
// Selector de impresora receipt + botón imprimir ticket de cierre de turno.
// Reutilizable: CloseShiftModal (variant=compact) y CashRegisters (variant=full).

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Loader2, CheckCircle, ChevronDown } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { cashRegistersService } from '@/services/cashRegistersService';
import toast from 'react-hot-toast';

interface ShiftPrinterSelectProps {
  registerId: string;
  sessionId:  string;
  /** compact: botón grande para pantalla post-cierre | full: botón pequeño para historial */
  variant?: 'compact' | 'full';
}

export function ShiftPrinterSelect({
  registerId,
  sessionId,
  variant = 'compact',
}: ShiftPrinterSelectProps) {
  const [selectedId, setSelectedId] = useState('');
  const [printing,   setPrinting]   = useState(false);
  const [printed,    setPrinted]    = useState(false);

  // Carga impresoras receipt activas (query compartida entre instancias — se deduplica)
  const { data: receiptPrinters = [] } = useQuery({
    queryKey: ['printers-receipt'],
    queryFn:  () =>
      adminService.listPrinters().then((list: any) => {
        const arr: any[] = Array.isArray(list) ? list : (list?.data ?? []);
        return arr.filter((p: any) => p.is_active && p.type === 'receipt');
      }),
    staleTime: 120_000,
  });

  const effectivePrinterId = selectedId || receiptPrinters[0]?.id || '';

  const handlePrint = async () => {
    if (!effectivePrinterId) {
      toast.error('Sin impresora receipt activa');
      return;
    }
    setPrinting(true);
    try {
      const result = await cashRegistersService.printShiftClose(
        registerId,
        sessionId,
        effectivePrinterId,
      );
      if (result?.queued > 0) {
        setPrinted(true);
        toast.success('Ticket enviado a imprimir');
        setTimeout(() => setPrinted(false), 3000);
      } else {
        toast.error(result?.warnings?.[0] ?? 'Sin impresoras disponibles');
      }
    } catch {
      toast.error('Error al imprimir el ticket');
    } finally {
      setPrinting(false);
    }
  };

  // Sin impresoras → no renderizar nada
  if (receiptPrinters.length === 0) return null;

  // ── VARIANT COMPACT ─────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        {receiptPrinters.length > 1 && (
          <div className="relative flex-1">
            <select
              value={effectivePrinterId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2.5
                         bg-gray-100 text-gray-700 border border-gray-200
                         rounded-xl text-sm focus:outline-none focus:border-gray-400"
            >
              {receiptPrinters.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}

        <button
          onClick={handlePrint}
          disabled={printing || !effectivePrinterId}
          className={[
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all',
            receiptPrinters.length === 1 ? 'w-full justify-center' : '',
            printed
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          {printing ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Imprimiendo...</>
          ) : printed ? (
            <><CheckCircle className="w-4 h-4" />Enviado</>
          ) : (
            <>
              <Printer className="w-4 h-4" />
              {receiptPrinters.length === 1
                ? `Imprimir ticket · ${receiptPrinters[0].name}`
                : 'Imprimir ticket'}
            </>
          )}
        </button>
      </div>
    );
  }

  // ── VARIANT FULL ────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-1.5">
      {receiptPrinters.length > 1 && (
        <div className="relative">
          <select
            value={effectivePrinterId}
            onChange={e => setSelectedId(e.target.value)}
            className="appearance-none pl-2.5 pr-7 py-1.5 bg-gray-100 text-gray-600
                       border border-gray-200 rounded-lg text-xs focus:outline-none"
          >
            {receiptPrinters.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
      )}

      <button
        onClick={handlePrint}
        disabled={printing}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
          printed
            ? 'bg-green-100 text-green-600'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600',
          'disabled:opacity-40',
        ].join(' ')}
      >
        {printing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : printed ? (
          <CheckCircle className="w-3.5 h-3.5" />
        ) : (
          <Printer className="w-3.5 h-3.5" />
        )}
        {printed ? 'Enviado' : 'Reimprimir'}
      </button>
    </div>
  );
}
