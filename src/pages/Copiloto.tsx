// LOTE COPILOTO 1: historial de resúmenes de cierre y alertas, switch por local y "Correo para resúmenes".
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, AlertTriangle, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import CopilotChat from '@/components/copilot/CopilotChat'; // LOTE 321
import { copilotService, type CopilotAlert, type CopilotDigest, type CopilotFigures, type CopilotHistory, type CopilotSettings } from '@/services/copilotService';

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;
const fecha = (ymd: string) => new Intl.DateTimeFormat('es-CL', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${ymd}T12:00:00Z`));

const ALERT_TITLE: Record<CopilotAlert['kind'], string> = {
  stock: 'Stock que se acaba en menos de 2 días',
  sin_ventas: 'Productos activos sin ventas en 10 días',
  pedido_abierto: 'Pedidos abiertos hace más de 3 horas',
};

const EMAIL_TEXT: Record<string, string> = {
  enviado: 'Enviado por correo',
  sin_destinatario: 'Sin correo: solo aquí y en la campana',
  sin_clave: 'Correo no configurado',
  error: 'El correo no se pudo enviar',
};

const arqueo = (f: CopilotFigures) => {
  if (f.arqueo.turnos === 0) return 'Sin turno de caja cerrado';
  if (f.arqueo.cuadrados === f.arqueo.turnos) return 'Cuadrado';
  return `Diferencia de ${f.arqueo.diferencia < 0 ? '-' : ''}${clp(Math.abs(f.arqueo.diferencia))}`;
};

const alertItem = (kind: CopilotAlert['kind'], it: Record<string, any>) => {
  const dec = (n: number) => Number(n).toLocaleString('es-CL');
  // LOTE 318: singular con 1 (1 día, 1 hora)
  const uno = (n: number, s: string, p: string) => `${dec(n)} ${Number(n) === 1 ? s : p}`;
  if (kind === 'stock') return `${it.nombre}: quedan ${dec(it.stock)}, se venden ${dec(it.ventaDiaria)} al día (${uno(it.dias, 'día', 'días')})`;
  if (kind === 'pedido_abierto') return `Pedido ${it.numero}: ${uno(it.horas, 'hora', 'horas')} abierto, ${clp(it.total)}`;
  return String(it.nombre);
};

function WhatsAppLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg border border-[#128C7E] text-[#128C7E] text-sm font-semibold">
      <MessageCircle className="w-4 h-4" /> Compartir por WhatsApp
    </a>
  );
}

function DigestCard({ d }: { d: CopilotDigest }) {
  const f = d.figures;
  const filas: [string, string][] = [
    ['Ventas', clp(f.ventas)],
    ['Pedidos', String(f.pedidos)],
    ['Ticket promedio', clp(f.ticket)],
    ['Contra la semana anterior', f.variacionPct === null ? 'Sin dato' : `${f.variacionPct > 0 ? '+' : ''}${f.variacionPct}%`],
    ['Propinas', clp(f.propinas)],
    ['Arqueo', arqueo(f)],
    ['Pedidos abiertos', String(f.pedidosAbiertos)],
    ['Anulaciones con devolución', `${f.devoluciones.cantidad} (${clp(f.devoluciones.monto)})`],
  ];
  return (
    <article className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900 first-letter:uppercase">{fecha(d.businessDate)}</h3>
        <span className="text-xs text-gray-500">{d.source === 'pendiente' ? 'En preparación' : EMAIL_TEXT[d.emailStatus ?? ''] ?? ''}</span>
      </div>
      {d.narrative && <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{d.narrative}</p>}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-sm">
        {filas.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 py-1.5 border-b border-gray-100">
            <dt className="text-gray-500">{k}</dt>
            <dd className="font-bold text-gray-900 text-right">{v}</dd>
          </div>
        ))}
      </dl>
      {f.top.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Más vendidos</h4>
          <ol className="text-sm text-gray-700 space-y-1">
            {f.top.map((t, i) => (
              <li key={t.nombre} className="flex justify-between gap-3">
                <span className="min-w-0 break-words">{i + 1}. {t.nombre}</span>
                <span className="font-bold text-gray-900 whitespace-nowrap">{t.cantidad} · {clp(t.monto)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <WhatsAppLink href={d.waLink} />
    </article>
  );
}

function AlertCard({ a }: { a: CopilotAlert }) {
  return (
    <article className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">
          <AlertTriangle className="w-4 h-4 inline mr-1.5 text-[#F97316]" />{ALERT_TITLE[a.kind]}: <span className="font-bold">{a.total}</span>
        </h3>
        <span className="text-xs text-gray-500 first-letter:uppercase">{fecha(a.businessDate)}</span>
      </div>
      <ul className="text-sm text-gray-700 space-y-1">
        {a.items.map((it, i) => <li key={i} className="break-words">{alertItem(a.kind, it)}</li>)}
      </ul>
      {a.total > a.items.length && <p className="text-xs text-gray-500">Y {a.total - a.items.length} más.</p>}
      <WhatsAppLink href={a.waLink} />
    </article>
  );
}

export default function Copiloto() {
  const qc = useQueryClient();
  const [settings, setSettings] = useState<CopilotSettings | null>(null);
  const [history, setHistory] = useState<CopilotHistory | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // LOTE 321; LOTE 329: ?tab=preguntar (acceso directo de la portada) abre la pestaña Preguntar
  const [tab, setTab] = useState<'resumen' | 'preguntar'>(() => (new URLSearchParams(window.location.search).get('tab') === 'preguntar' ? 'preguntar' : 'resumen'));

  useEffect(() => {
    (async () => {
      try {
        const [s, h] = await Promise.all([copilotService.getSettings(), copilotService.getHistory()]);
        setSettings(s);
        setEmail(s.summaryEmail ?? '');
        setHistory(h);
        await copilotService.markRead();
        qc.invalidateQueries({ queryKey: ['notifications-recent'] });
      } catch {
        setLoadError(true);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (enabled: boolean) => {
    setBusy(true);
    try {
      const cambio = enabled !== settings?.enabled;
      const s = await copilotService.saveSettings(enabled, email);
      setSettings(s);
      setEmail(s.summaryEmail ?? '');
      toast.success(!cambio ? 'Correo guardado' : s.enabled ? 'Copiloto activado' : 'Copiloto desactivado');
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? e?.message ?? 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const enabled = settings?.enabled === true;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#F97316] rounded-lg flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Copiloto</h1>
          <p className="text-gray-500 text-sm mt-0.5">El resumen de cada cierre y lo que conviene revisar</p>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">No se pudo leer el Copiloto.</div>
      )}

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Activar para este local</h2>
            <p className="text-sm text-gray-500">
              {history?.plan === 'BASICO' ? 'Tu plan incluye el resumen de cierre. Las alertas son del plan FULL.' : 'Incluye el resumen de cierre y las alertas diarias.'}
            </p>
          </div>
          <button type="button" role="switch" aria-checked={enabled} aria-label="Activar Copiloto" disabled={!settings || busy} onClick={() => save(!enabled)}
            className="min-h-[44px] min-w-[56px] flex items-center justify-center flex-shrink-0 disabled:opacity-50">
            <span className={`w-12 h-7 rounded-full flex items-center px-1 transition-colors ${enabled ? 'bg-[#F97316] justify-end' : 'bg-gray-300 justify-start'}`}>
              <span className="w-5 h-5 rounded-full bg-white shadow" />
            </span>
          </button>
        </div>
        <div className="space-y-2">
          <label htmlFor="copilot-email" className="block text-sm font-medium text-gray-900">Correo para resúmenes</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input id="copilot-email" type="email" autoComplete="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.cl"
              className="flex-1 min-w-0 min-h-[44px] px-3 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white" />
            <button type="button" disabled={!settings || busy} onClick={() => save(enabled)}
              className="min-h-[44px] px-5 rounded-lg bg-[#F97316] text-white text-sm font-semibold disabled:opacity-50">Guardar</button>
          </div>
          <p className="text-xs text-gray-500">
            {settings?.effectiveEmail ? `Se enviará a ${settings.effectiveEmail}.` : 'Sin correo: lo verás solo aquí y en la campana.'}
          </p>
        </div>
      </section>

      {/* LOTE 321: pestañas Resumen / Preguntar; Preguntar solo con el Copiloto encendido */}
      {enabled && (
        <div className="flex gap-1 border-b border-gray-200" role="tablist" aria-label="Secciones del Copiloto">
          {([['resumen', 'Resumen'], ['preguntar', 'Preguntar']] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`min-h-[44px] px-4 -mb-px border-b-2 text-sm font-semibold ${tab === k ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {enabled && tab === 'preguntar' && <CopilotChat enabled={enabled} />}

      {(!enabled || tab === 'resumen') && history && history.alerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Alertas</h2>
          {history.alerts.map((a) => <AlertCard key={a.id} a={a} />)}
        </section>
      )}

      {(!enabled || tab === 'resumen') && history && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Resúmenes de cierre</h2>
          {history.digests.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-8 text-center text-sm text-gray-500">
              {enabled ? 'El primero llegará después del próximo cierre.' : 'Activa el Copiloto para recibir el resumen de cada cierre.'}
            </div>
          )}
          {history.digests.map((d) => <DigestCard key={d.id} d={d} />)}
        </section>
      )}
    </div>
  );
}
