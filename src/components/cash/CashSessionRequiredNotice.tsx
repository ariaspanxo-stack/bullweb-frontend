// HOTFIX 299 (B2-01): cobro sin turno de caja abierto.
// El backend responde 409 { error, code: 'CASH_SESSION_REQUIRED' }.
// Este aviso muestra el mensaje y un boton "Abrir turno" que abre el modal de apertura
// existente (OpenShiftModal) ahi mismo; al abrir, el modal que cobra conserva lo ingresado
// y el usuario reintenta el cobro.
import { useState } from 'react';
import { AlertTriangle, DollarSign, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { OpenShiftModal } from './OpenShiftModal';
import { cashRegistersService, type CashRegister } from '../../services/cashRegistersService';

export const CASH_SESSION_REQUIRED = 'CASH_SESSION_REQUIRED';
export const CASH_SESSION_REQUIRED_MSG = 'No hay un turno de caja abierto. Abre el turno para cobrar.';

/** true si el error del api corresponde a cobro sin turno (HTTP 409 code CASH_SESSION_REQUIRED). */
export function isCashSessionRequired(err: any): boolean {
  const code = err?.data?.code ?? err?.response?.data?.code ?? err?.code;
  return code === CASH_SESSION_REQUIRED;
}

interface CashSessionRequiredNoticeProps {
  message?: string;
  /** Se llama cuando el turno quedo abierto; el padre limpia el aviso y deja reintentar. */
  onOpened: () => void;
}

export function CashSessionRequiredNotice({ message, onOpened }: CashSessionRequiredNoticeProps) {
  const [register, setRegister] = useState<CashRegister | null>(null);
  const [loadingRegister, setLoadingRegister] = useState(false);

  const handleOpenShift = async () => {
    setLoadingRegister(true);
    try {
      const active = await cashRegistersService.getActive();
      if (active.isOpen) {
        // Otro usuario ya abrio el turno: basta con reintentar
        toast.success('El turno ya esta abierto. Puedes reintentar el cobro.');
        onOpened();
        return;
      }
      if (!active.register) {
        toast.error('No hay caja registradora creada. Crea una en Cajas antes de abrir turno.');
        return;
      }
      setRegister(active.register);
    } catch (e: any) {
      toast.error(e?.data?.error ?? e?.message ?? 'No se pudo cargar la caja');
    } finally {
      setLoadingRegister(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <span className="font-medium">{message || CASH_SESSION_REQUIRED_MSG}</span>
        </div>
        <button
          type="button"
          onClick={handleOpenShift}
          disabled={loadingRegister}
          className="mt-2 w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          {loadingRegister ? <Loader2 size={16} className="animate-spin" /> : <DollarSign size={16} />}
          Abrir turno
        </button>
      </div>

      {register && (
        <OpenShiftModal
          register={register}
          isOpen
          onClose={() => setRegister(null)}
          onSuccess={() => {
            setRegister(null);
            onOpened();
          }}
        />
      )}
    </>
  );
}
