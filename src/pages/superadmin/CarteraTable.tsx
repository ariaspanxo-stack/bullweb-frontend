// TAREA 332: portada del superadmin -> tabla "Cartera" con todos los locales.
// Fila amarilla si vence en 3 dias o menos (incluye la gracia); roja si esta PAST_DUE o bloqueado.
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import superadminService, { type CarteraRow } from '@/services/superadmin/superadminService';
import { isoToClDate } from '@/lib/planLabel';
import { venceTexto } from './CobranzaBlock';

const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Activo', TRIAL: 'Prueba', PAST_DUE: 'Vencido', SUSPENDED: 'Suspendido' };

function estado(r: CarteraRow): string {
  if (r.blocked) return r.status === 'SUSPENDED' ? 'Suspendido' : 'Bloqueado';
  if (r.inGrace) return 'En gracia';
  return STATUS_LABEL[r.status] ?? r.status;
}

function hace(iso: string | null): string {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  return `hace ${d} días`;
}

const SI_NO = (v: boolean) => (v ? 'Sí' : 'No');

export function CarteraTable() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['superadmin', 'cartera'],
    queryFn: superadminService.getCartera,
    refetchInterval: 120_000,
  });
  const rows = data ?? [];
  const rojos = rows.filter((r) => r.severity === 'rojo').length;
  const amarillos = rows.filter((r) => r.severity === 'amarillo').length;

  return (
    <div className="bg-gray-900/60 border border-white/5 rounded-xl p-5 mb-8" data-testid="sa-cartera">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide flex items-center gap-2">
          <Wallet className="w-4 h-4 text-brand-400" />Cartera
        </h2>
        <p className="text-xs text-gray-400">
          {rows.length} locales · <span className="text-rose-400 font-semibold">{rojos} vencidos o bloqueados</span> · <span className="text-yellow-300 font-semibold">{amarillos} vencen en 3 días o menos</span>
        </p>
      </div>
      {isLoading ? (
        <div className="h-24 animate-pulse bg-gray-800/40 rounded-lg" />
      ) : isError ? (
        <p className="text-sm text-rose-400">No se pudo cargar la cartera.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[11px] text-gray-500 uppercase tracking-wide border-b border-white/5">
                <th className="py-2 pr-3 font-medium">Local</th>
                <th className="py-2 pr-3 font-medium">Plan</th>
                <th className="py-2 pr-3 font-medium text-right">Precio</th>
                <th className="py-2 pr-3 font-medium">Estado</th>
                <th className="py-2 pr-3 font-medium">Vence en</th>
                <th className="py-2 pr-3 font-medium">Último pedido</th>
                <th className="py-2 pr-3 font-medium">Último pago</th>
                <th className="py-2 pr-3 font-medium">Pagos en línea</th>
                <th className="py-2 font-medium">Copiloto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  data-testid="sa-cartera-fila"
                  data-severity={r.severity ?? 'normal'}
                  onClick={() => navigate(`/superadmin/tenants/${r.id}`)}
                  className={`border-b border-white/5 cursor-pointer ${
                    r.severity === 'rojo' ? 'bg-rose-500/15 hover:bg-rose-500/25'
                      : r.severity === 'amarillo' ? 'bg-yellow-400/15 hover:bg-yellow-400/25'
                        : 'hover:bg-white/5'
                  }`}
                >
                  <td className="py-2.5 pr-3 text-white font-medium">
                    {r.name}{r.isTest && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-orange-900/60 text-orange-300">TEST</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-gray-200">{r.planLabel}</td>
                  <td className="py-2.5 pr-3 text-right text-white font-bold tabular-nums">{r.priceCLP != null ? fmtCLP(r.priceCLP) : '—'}</td>
                  <td className={`py-2.5 pr-3 font-semibold ${r.severity === 'rojo' ? 'text-rose-300' : r.inGrace ? 'text-yellow-200' : 'text-gray-200'}`}>{estado(r)}</td>
                  <td className="py-2.5 pr-3 text-gray-200" title={r.dueAt ? isoToClDate(r.dueAt) : ''}>{r.dueAt ? venceTexto(r.daysToDue) : '—'}</td>
                  <td className="py-2.5 pr-3 text-gray-400">{hace(r.lastOrderAt)}</td>
                  <td className="py-2.5 pr-3 text-gray-400">{r.lastPaymentAt ? isoToClDate(r.lastPaymentAt) : '—'}</td>
                  <td className="py-2.5 pr-3 text-gray-300" title={r.onlinePaymentsEnabled && !r.mpConnected ? 'Encendido, sin cuenta de Mercado Pago conectada' : ''}>{SI_NO(r.onlinePaymentsConnected)}</td>
                  <td className="py-2.5 text-gray-300">{SI_NO(r.copilotOn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
