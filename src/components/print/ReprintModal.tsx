/**
 * ReprintModal — Modal de selección de impresora y tipo para reimprimir una orden.
 * Incluye indicador de estado online/offline del agente de cada impresora.
 */
import { useState } from 'react';
import { Printer, X, RotateCcw, Loader2, ChefHat, Receipt } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminService } from '@/services/adminService';
import type { Printer as PrinterType } from '@/services/adminService';

type ReprintType = 'kitchen' | 'receipt';

interface ReprintModalProps {
  open:        boolean;
  orderId:     string;
  orderNumber: number | string;
  onClose:     () => void;
  onSuccess?:  (jobId: string) => void;
}

export function ReprintModal({ open, orderId, orderNumber, onClose, onSuccess }: ReprintModalProps) {
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [selectedType,    setSelectedType]    = useState<ReprintType>('receipt');
  const [printState,      setPrintState]      = useState<'idle' | 'printing' | 'done' | 'error'>('idle');

  const { data: printers = [], isLoading: loadingPrinters } = useQuery<PrinterType[]>({
    queryKey: ['admin', 'printers', 'list'],
    queryFn:  () => adminService.listPrinters(),
    enabled:  open,
    staleTime: 60_000,
  });

  const activePrinters = printers.filter(p => p.is_active);

  const reprintMut = useMutation({
    mutationFn: async () => {
      const { job_id } = await adminService.reprintOrder(orderId, selectedPrinter, selectedType);
      // Polling: cada 800ms, timeout 20s
      const deadline = Date.now() + 20_000;
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 800));
        const job = await adminService.getJobStatus(job_id);
        if (job.status === 'printed' || job.status === 'sent') return job_id;
        if (job.status === 'failed' || job.status === 'cancelled') {
          throw new Error(job.error_msg ?? 'El job fue marcado como fallido');
        }
      }
      throw new Error('Timeout — el agente no respondió en 20s');
    },
    onMutate:  () => setPrintState('printing'),
    onSuccess: (jobId) => {
      setPrintState('done');
      toast.success(`✅ Orden #${orderNumber} reimpresa correctamente`);
      onSuccess?.(jobId as string);
      setTimeout(() => { setPrintState('idle'); onClose(); }, 1500);
    },
    onError: (e: any) => {
      setPrintState('error');
      toast.error(`❌ Error al reimprimir: ${e.message}`);
      setTimeout(() => setPrintState('idle'), 3000);
    },
  });

  if (!open) return null;

  const handleSubmit = () => {
    if (!selectedPrinter) { toast.error('Selecciona una impresora'); return; }
    reprintMut.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Printer className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Reimprimir Orden #{orderNumber}</h3>
              <p className="text-xs text-gray-500">Selecciona impresora y tipo de ticket</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Tipo de ticket */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de ticket</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'kitchen' as ReprintType, label: 'Ticket Cocina', icon: ChefHat, color: 'orange' },
                { value: 'receipt' as ReprintType, label: 'Recibo de Caja', icon: Receipt, color: 'blue' },
              ] as const).map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => setSelectedType(value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    selectedType === value
                      ? color === 'orange'
                        ? 'border-orange-400 bg-orange-50 text-orange-700'
                        : 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Selección de impresora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Impresora</label>
            {loadingPrinters ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando impresoras...
              </div>
            ) : activePrinters.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No hay impresoras activas</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {activePrinters.map(p => {
                  const online = p.agent_id != null;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPrinter(p.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left text-sm transition-all ${
                        selectedPrinter === p.id
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Printer className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium text-gray-800">{p.name}</span>
                        <span className="text-xs text-gray-400 capitalize">{p.type}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-gray-300'}`} />
                        <span className={`text-xs ${online ? 'text-green-600' : 'text-gray-400'}`}>
                          {online ? 'Agente OK' : 'Sin agente'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Estado de resultado */}
          {printState === 'done' && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2.5">
              <span className="text-base">✅</span>
              Impresión enviada correctamente
            </div>
          )}
          {printState === 'error' && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2.5">
              <span className="text-base">❌</span>
              Error al reimprimir. Intenta de nuevo.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={printState === 'printing'}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPrinter || printState === 'printing' || printState === 'done'}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {printState === 'printing' ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Imprimiendo...</>
            ) : (
              <><RotateCcw className="w-4 h-4" /> Imprimir</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
