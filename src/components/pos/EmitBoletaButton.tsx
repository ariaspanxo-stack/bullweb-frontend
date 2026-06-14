/**
 * EmitBoletaButton
 * Modal simplificado de emisión de Boleta Electrónica (tipo 39).
 * - Solo boleta (sin opción de factura por ahora)
 * - Sin campos obligatorios de RUT ni nombre cliente
 * - Email opcional (para enviar el PDF)
 * - Tras emitir exitosamente: botón "Imprimir Boleta" vía Print Agent
 *
 * Nota de estilos: Todos los textos usan !text-white / !text-gray-* para forzar
 * visibilidad sobre fondo oscuro, evitando problemas de herencia de Tailwind.
 */
import { useState } from 'react';
import { usePermission } from '@/hooks/usePermission';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Printer, CheckCircle, Loader2, X, Download } from 'lucide-react';

interface EmitBoletaButtonProps {
  /** ID de la orden en la BD */
  orderId: string;
  /** true si el tenant ya tiene configuración DTE activa */
  isConfigured: boolean;
  /** Callback tras emitir exitosamente */
  onEmitted?: (doc: any) => void;
}

export function EmitBoletaButton({ orderId, isConfigured, onEmitted }: EmitBoletaButtonProps) {
  const canIssueBoleta = usePermission('billing.issue_boleta');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emittedDoc, setEmittedDoc] = useState<any>(null);
  const [printing, setPrinting] = useState(false);
  const [printed, setPrinted] = useState(false);

  const handleEmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEmittedDoc(null);
    setPrinted(false);
    try {
      // Boleta sin RUT → motor nativo usará "66666666-6" (Consumidor Final)
      const { data } = await api.post(`/dte/emit/${orderId}`, {
        tipo: 39,
        clientEmail: email || undefined,
      });
      toast.success('Boleta emitida correctamente');
      setEmittedDoc(data);
      onEmitted?.(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Error al emitir boleta');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!orderId) return;
    setPrinting(true);
    try {
      await api.post('/printers/reprint', {
        order_id: orderId,
        printer_id: undefined,
        type: 'receipt',
      });
      toast.success('Boleta enviada a impresora');
      setPrinted(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al imprimir boleta');
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!emittedDoc?.pdfUrl && !emittedDoc?.pdf) return;
    const url = emittedDoc.pdfUrl ?? emittedDoc.pdf;
    window.open(url, '_blank');
  };

  const handleClose = () => {
    setOpen(false);
    setEmittedDoc(null);
    setEmail('');
    setPrinted(false);
  };

  if (!canIssueBoleta) return null;

  if (!isConfigured) {
    return (
      <div className="!text-gray-400 !text-xs text-center py-2">
        <span className="!text-gray-400">🧾 DTE no configurado. </span>
        <Link to="/apps/dte" className="underline !text-gray-300 hover:!text-white">
          Configurar
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Botón principal que abre el modal */}
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2 rounded-lg !bg-gray-800 !text-white !text-sm !font-medium
                   border !border-gray-700 hover:!bg-gray-700 transition-colors"
      >
        🧾 Emitir Boleta Electrónica
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="!bg-gray-900 !border !border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 !bg-gray-900">
              <h3 className="!text-white !text-lg !font-semibold">
                {emittedDoc ? 'Boleta Emitida' : 'Emitir Boleta Electrónica'}
              </h3>
              <button
                onClick={handleClose}
                className="!text-gray-400 hover:!text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!emittedDoc ? (
              /* ─── Formulario de emisión ─── */
              <div className="px-6 pb-6 !bg-gray-900">
                <p className="!text-gray-400 !text-xs mb-5">
                  La boleta se emitirá como{' '}
                  <span className="!text-gray-300 !font-medium">Consumidor Final</span>. El email es
                  opcional, solo si deseas enviar el PDF al cliente.
                </p>

                <form onSubmit={handleEmit} className="space-y-4">
                  <div>
                    <label className="block !text-white !text-sm !font-medium mb-1.5">
                      Email (opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="cliente@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg !bg-gray-800 !border !border-gray-700
                                 !text-white !text-sm placeholder:!text-gray-500
                                 focus:outline-none focus:!border-orange-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-lg !bg-orange-500 hover:!bg-orange-600
                               !text-white !text-sm !font-semibold transition-colors
                               disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="!text-white">Emitiendo...</span>
                      </>
                    ) : (
                      <span className="!text-white">Emitir Boleta</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="w-full py-2 rounded-lg !bg-gray-700 hover:!bg-gray-600
                               !text-gray-300 !text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                </form>
              </div>
            ) : (
              /* ─── Vista post-emisión: éxito + imprimir ─── */
              <div className="px-6 pb-6 space-y-4 !bg-gray-900">
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mb-3">
                    <CheckCircle className="w-8 h-8 !text-green-400" />
                  </div>
                  <p className="!text-white !font-medium">Boleta emitida correctamente</p>
                  {emittedDoc.folioNumber && (
                    <p className="!text-gray-300 !text-sm mt-1">
                      Folio N° {emittedDoc.folioNumber}
                    </p>
                  )}
                  {emittedDoc.siiTrackId && (
                    <p className="!text-gray-500 !text-xs mt-0.5">
                      Track ID SII: {emittedDoc.siiTrackId}
                    </p>
                  )}
                </div>

                {/* Botón Imprimir */}
                <button
                  onClick={handlePrint}
                  disabled={printing || printed}
                  className="w-full py-2.5 rounded-lg !bg-orange-500 hover:!bg-orange-600
                             !text-white !text-sm !font-semibold transition-colors
                             disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {printing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="!text-white">Imprimiendo...</span>
                    </>
                  ) : printed ? (
                    <>
                      <CheckCircle className="w-4 h-4 !text-white" />
                      <span className="!text-white">Enviado a impresora</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4 !text-white" />
                      <span className="!text-white">Imprimir Boleta</span>
                    </>
                  )}
                </button>

                {/* Botón Descargar PDF (alternativa) */}
                {(emittedDoc?.pdfUrl || emittedDoc?.pdf) && (
                  <button
                    onClick={handleDownloadPdf}
                    className="w-full py-2 rounded-lg !bg-gray-700 hover:!bg-gray-600
                               !text-gray-300 !text-sm transition-colors
                               flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 !text-gray-300" />
                    <span className="!text-gray-300">Descargar PDF</span>
                  </button>
                )}

                <button
                  onClick={handleClose}
                  className="w-full py-2 rounded-lg !bg-gray-700 hover:!bg-gray-600
                             !text-gray-300 !text-sm transition-colors"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}