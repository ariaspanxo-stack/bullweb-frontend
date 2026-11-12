// LOTE 329: portada del panel (inicio) -> accesos directos "Pregúntale a tu Copiloto" y "Cobra en línea con Mercado Pago".
// Solo para quien administra el local (settings.manage) y solo las tarjetas que aplican:
//  - Copiloto: plan Full con el modulo encendido; con el switch apagado la tarjeta lleva a encenderlo.
//  - Mercado Pago: pagos en linea habilitados para el local; sin cuenta conectada lleva a Configuracion > Pagos;
//    conectada muestra "Conectado" y lo cobrado en linea de la semana.
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CreditCard, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePlan } from '@/hooks/usePlan';
import { copilotService } from '@/services/copilotService';
import { mercadoPagoService } from '@/services/mercadoPagoService';

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;

export function HomeShortcuts() {
  const navigate = useNavigate();
  const permissions = useAuthStore((s) => (s.user?.role?.permissions ?? []) as string[]);
  const canManage = permissions.includes('ALL_PERMISSIONS') || permissions.includes('admin.manage') || permissions.includes('settings.manage');
  const { planReady, isBasico, hasModule } = usePlan();
  const copilotEligible = canManage && planReady && !isBasico && hasModule('copiloto');

  const copilotQ = useQuery({
    queryKey: ['home', 'copilot-settings'],
    queryFn: () => copilotService.getSettings(),
    enabled: copilotEligible,
    staleTime: 60_000,
    retry: false,
  });
  const mpQ = useQuery({
    queryKey: ['home', 'mp-status'],
    queryFn: () => mercadoPagoService.status(),
    enabled: canManage,
    staleTime: 60_000,
    retry: false,
  });

  const showCopilot = copilotEligible && copilotQ.isSuccess;
  const mp = mpQ.data;
  const showMp = canManage && mpQ.isSuccess && mp?.enabled === true;
  if (!showCopilot && !showMp) return null;

  const copilotOn = copilotQ.data?.enabled === true;

  return (
    <div data-testid="home-shortcuts" className="grid gap-4 sm:grid-cols-2 mb-6">
      {showCopilot && (
        <div data-testid="home-copilot" className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl"><Sparkles className="w-5 h-5 text-[#F97316]" /></div>
            <h3 className="font-bold text-gray-900">Pregúntale a tu Copiloto</h3>
          </div>
          <p className="text-sm text-gray-600">
            {copilotOn
              ? 'Pregúntale por tus ventas, productos y caja, y recibe el resumen de cada cierre.'
              : 'Está apagado. Enciéndelo para preguntarle por tus ventas y recibir el resumen de cada cierre.'}
          </p>
          <button type="button" onClick={() => navigate(copilotOn ? '/copiloto?tab=preguntar' : '/copiloto')}
            className="min-h-[44px] self-start px-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-bold">
            {copilotOn ? 'Preguntar' : 'Encender Copiloto'}
          </button>
        </div>
      )}
      {showMp && mp && (
        <div data-testid="home-mp" className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-xl"><CreditCard className="w-5 h-5 text-[#F97316]" /></div>
            <h3 className="font-bold text-gray-900">Cobra en línea con Mercado Pago</h3>
          </div>
          {mp.connected ? (
            <>
              <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Conectado
              </span>
              <p className="text-sm text-gray-600">
                Cobrado en línea esta semana: <span className="font-bold text-gray-900">{clp(mp.weekOnline?.total ?? 0)}</span>
                <span className="text-gray-500"> ({mp.weekOnline?.count ?? 0} {(mp.weekOnline?.count ?? 0) === 1 ? 'pago' : 'pagos'})</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">Conecta tu cuenta para que tus clientes paguen desde la carta QR.</p>
              <button type="button" onClick={() => navigate('/settings/pagos')}
                className="min-h-[44px] self-start px-4 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-bold">
                Conectar Mercado Pago
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
