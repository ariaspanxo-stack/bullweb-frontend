// LOTE MP-A: Configuracion -> Pagos. Conectar la cuenta de Mercado Pago del local, estado, comision (solo lectura) y pagos para revisar.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { mercadoPagoService, type MpReviewPayment, type MpStatus } from '@/services/mercadoPagoService';

const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' }) : '-');

const STATUS_TEXT: Record<MpStatus['status'], string> = {
  connected:    'Conectado',
  expired:      'Conexion vencida: vuelve a conectar',
  revoked:      'Desconectado',
  disconnected: 'Sin conectar',
};
const REVIEW_TEXT: Record<string, string> = {
  requires_refund: 'Cobrado sin pedido activo: devuelve el pago desde Mercado Pago',
  amount_mismatch: 'El monto pagado no coincide con el pedido',
  no_actor:        'No se pudo asignar el pedido: contacta a soporte',
};

export default function PaymentsSettingsPage() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<MpStatus | null>(null);
  const [review, setReview] = useState<MpReviewPayment[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    try {
      const [st, states] = await Promise.all([mercadoPagoService.status(), mercadoPagoService.orderStates()]);
      setStatus(st);
      setReview(states.review);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => {
    load();
    const r = params.get('mp');
    if (r === 'conectado') toast.success('Mercado Pago conectado');
    if (r === 'error') toast.error('No se pudo conectar Mercado Pago. Intenta de nuevo.');
    if (r) setParams({}, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setBusy(true);
    try {
      window.location.assign(await mercadoPagoService.connectUrl());
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'No se pudo iniciar la conexion');
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await mercadoPagoService.disconnect();
      toast.success('Mercado Pago desconectado');
      setConfirmOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? 'No se pudo desconectar');
    } finally {
      setBusy(false);
    }
  };

  const connected = status?.connected === true;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#F97316] rounded-lg flex items-center justify-center">
          <CreditCard className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pagos</h1>
          <p className="text-gray-500 text-sm mt-0.5">Cobra en linea desde la carta QR con Mercado Pago</p>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">No se pudo leer el estado de Mercado Pago.</div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Mercado Pago</h2>
          <span className={`text-sm font-semibold ${connected ? 'text-gray-900' : 'text-gray-500'}`}>
            {connected && <CheckCircle className="w-4 h-4 inline mr-1 text-[#F97316]" />}
            {status ? STATUS_TEXT[status.status] : 'Cargando...'}
          </span>
        </div>

        {status && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {connected && (
              <>
                <div><dt className="text-gray-500">Cuenta</dt><dd className="font-medium text-gray-900">{status.account ?? '-'}</dd></div>
                <div><dt className="text-gray-500">La conexion vence</dt><dd className="font-medium text-gray-900">{fmtDate(status.expiresAt)}</dd></div>
                {!status.liveMode && <div className="col-span-2 text-amber-700">Cuenta de prueba: los pagos no son reales.</div>}
              </>
            )}
            <div>
              <dt className="text-gray-500">Comision BullWeb</dt>
              <dd className="font-bold text-gray-900">{status.feePct.toLocaleString('es-CL')} %</dd>
            </div>
          </dl>
        )}

        {status && !status.available && !connected && (
          <p className="text-sm text-gray-500">Mercado Pago aun no esta habilitado en BullWeb.</p>
        )}

        <div className="flex flex-wrap gap-2">
          {!connected ? (
            <button
              type="button"
              onClick={connect}
              disabled={busy || !status?.available}
              className="min-h-[44px] px-5 rounded-lg text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] transition-colors disabled:opacity-50"
            >
              Conectar Mercado Pago
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
              className="min-h-[44px] px-5 rounded-lg text-sm font-semibold text-slate-800 bg-white border-[1.5px] border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Desconectar
            </button>
          )}
        </div>
      </div>

      {review.length > 0 && (
        <div className="bg-white border border-amber-300 rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Pagos para revisar
          </h2>
          {review.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-3 text-sm border-t border-gray-100 pt-3">
              <div>
                <p className="font-medium text-gray-900">{p.customerName ?? 'Cliente'} · {fmtDate(p.createdAt)}</p>
                <p className="text-gray-600">{REVIEW_TEXT[p.reviewReason] ?? p.reviewReason}</p>
              </div>
              <p className="font-bold text-gray-900 flex-shrink-0">{fmtCLP(p.amount)}</p>
            </div>
          ))}
        </div>
      )}

      {confirmOpen && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Desconectar Mercado Pago</h3>
            <p className="text-sm text-gray-600">La carta dejara de ofrecer el pago en linea. Podras volver a conectar cuando quieras.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={busy} className="flex-1 min-h-[44px] rounded-lg text-sm font-semibold text-slate-800 bg-white border-[1.5px] border-slate-300">Volver</button>
              <button type="button" onClick={disconnect} disabled={busy} className="flex-1 min-h-[44px] rounded-lg text-sm font-semibold text-white bg-[#F97316] disabled:opacity-50">Desconectar</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
