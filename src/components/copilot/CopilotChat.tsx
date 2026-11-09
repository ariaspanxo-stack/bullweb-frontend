// LOTE 321: Copiloto Lote 2 - pestaña "Preguntar": el dueño pregunta por las cifras de su local.
// El servidor elige la consulta de una lista cerrada, la ejecuta y redacta; aquí solo se muestra.
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { copilotService, type CopilotChatDay, type CopilotChatItem } from '@/services/copilotService';

const hora = (iso: string) => new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function WhatsApp({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg border border-[#128C7E] text-[#128C7E] text-sm font-semibold">
      <MessageCircle className="w-4 h-4" /> Compartir por WhatsApp
    </a>
  );
}

function Tabla({ t }: { t: NonNullable<CopilotChatItem['tabla']> }) {
  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-gray-500 mb-1">{t.titulo}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
            {t.columnas.map((c, i) => <th key={i} className={`py-1.5 pr-3 font-medium ${i > 0 ? 'text-right' : ''}`}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {t.filas.map((f, i) => (
            <tr key={i} className="border-b border-gray-100">
              {f.map((v, j) => <td key={j} className={`py-1.5 pr-3 ${j > 0 ? 'text-right font-bold text-gray-900 whitespace-nowrap' : 'text-gray-700 break-words'}`}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Respuesta({ it, onAsk, busy }: { it: CopilotChatItem; onAsk: (q: string) => void; busy: boolean }) {
  return (
    <div className="space-y-3" data-testid="copilot-respuesta">
      <div className="flex justify-end">
        <p className="max-w-[85%] bg-gray-100 text-gray-900 text-sm rounded-xl rounded-br-sm px-4 py-2.5 break-words">{it.pregunta}</p>
      </div>
      <article className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500 inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-[#F97316]" /> Copiloto</span>
          <span className="text-xs text-gray-400">{hora(it.createdAt)}</span>
        </div>
        <p className={`text-sm leading-relaxed whitespace-pre-line ${it.status === 'error' || it.status === 'sin_clave' ? 'text-gray-600' : 'text-gray-800'}`}>{it.respuesta}</p>
        {it.tabla && it.tabla.filas.length > 0 && <Tabla t={it.tabla} />}
        {(it.status === 'ok' || it.status === 'tabla') && <WhatsApp href={it.waLink} />}
        {it.sugerencias.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {it.sugerencias.map((s) => (
              <button key={s} type="button" disabled={busy} onClick={() => onAsk(s)}
                className="min-h-[44px] px-3 rounded-full border border-gray-300 text-sm text-gray-700 bg-white hover:border-[#F97316] hover:text-[#F97316] disabled:opacity-50 text-left">
                {s}
              </button>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

export default function CopilotChat({ enabled }: { enabled: boolean }) {
  const [day, setDay] = useState<CopilotChatDay | null>(null);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    setLoadError(false);
    copilotService.getChat().then((d) => { if (vivo) setDay(d); }).catch(() => { if (vivo) setLoadError(true); });
    return () => { vivo = false; };
  }, [enabled]);

  useEffect(() => { finRef.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' }); }, [day?.items.length, pensando]);

  const ask = async (q: string) => {
    const pregunta = q.replace(/\s+/g, ' ').trim();
    if (!pregunta || pensando) return;
    setError(null);
    setPensando(pregunta);
    setTexto('');
    try {
      const it = await copilotService.ask(pregunta);
      setDay((d) => (d ? { ...d, items: [...d.items, it], restantes: Math.max(d.restantes - 1, 0) } : d));
    } catch (e: any) {
      setTexto(pregunta);
      const msg = String(e?.message ?? '');
      setError(e?.name === 'AbortError' || /abort|timeout|tiempo/i.test(msg)
        ? 'La respuesta está tardando demasiado. Prueba de nuevo en un rato.'
        : msg && !/código \d{3}/.test(msg) ? msg : 'No pude responder ahora. Prueba de nuevo en un rato.');
    } finally {
      setPensando(null);
    }
  };

  if (loadError) return <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">No se pudieron leer tus preguntas de hoy.</div>;
  if (!day) return <div className="bg-white border border-gray-200 rounded-xl px-5 py-8 text-center text-sm text-gray-500">Cargando…</div>;
  if (!day.habilitado || !enabled) {
    return <div className="bg-white border border-gray-200 rounded-xl px-5 py-8 text-center text-sm text-gray-500">{day.mensaje ?? 'Activa el Copiloto para usar Preguntar.'}</div>;
  }

  const sinCupo = day.restantes <= 0;
  return (
    <section className="space-y-4" aria-label="Preguntar al Copiloto">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Pregúntale a tu Copiloto</h2>
        <span className="text-xs text-gray-500" data-testid="copilot-restantes">Te quedan <span className="font-bold">{day.restantes}</span> preguntas hoy</span>
      </div>
      <p className="text-sm text-gray-500">Responde con las cifras de tu local: ventas, productos, canales, horas, caja, stock y clientes. Hasta 92 días por consulta.</p>

      {day.items.length === 0 && !pensando && (
        <div className="flex flex-wrap gap-2" aria-label="Preguntas de ejemplo">
          {day.ejemplos.map((q) => (
            <button key={q} type="button" onClick={() => ask(q)} disabled={sinCupo}
              className="min-h-[44px] px-3 rounded-full border border-gray-300 text-sm text-gray-700 bg-white hover:border-[#F97316] hover:text-[#F97316] disabled:opacity-50 text-left">
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-5">
        {day.items.map((it) => <Respuesta key={it.id} it={it} onAsk={ask} busy={!!pensando || sinCupo} />)}
        {pensando && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <p className="max-w-[85%] bg-gray-100 text-gray-900 text-sm rounded-xl rounded-br-sm px-4 py-2.5 break-words">{pensando}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-500 inline-flex items-center gap-2" role="status" aria-live="polite">
              <Sparkles className="w-4 h-4 text-[#F97316] animate-pulse" /> Pensando…
            </div>
          </div>
        )}
        <div ref={finRef} />
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}

      {day.items.length > 0 && !pensando && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500 min-h-[44px] flex items-center">Ver preguntas de ejemplo</summary>
          <div className="flex flex-wrap gap-2 pt-2">
            {day.ejemplos.map((q) => (
              <button key={q} type="button" onClick={() => ask(q)} disabled={sinCupo}
                className="min-h-[44px] px-3 rounded-full border border-gray-300 text-sm text-gray-700 bg-white hover:border-[#F97316] hover:text-[#F97316] disabled:opacity-50 text-left">
                {q}
              </button>
            ))}
          </div>
        </details>
      )}

      <form className="flex gap-2 sticky bottom-0 bg-gray-50 py-2" onSubmit={(e) => { e.preventDefault(); ask(texto); }}>
        <label htmlFor="copilot-pregunta" className="sr-only">Tu pregunta</label>
        <input id="copilot-pregunta" type="text" value={texto} maxLength={300} onChange={(e) => setTexto(e.target.value)} disabled={!!pensando || sinCupo}
          placeholder={sinCupo ? 'Llegaste al límite de preguntas de hoy' : 'Ej: ¿cuánto vendí el sábado?'} autoComplete="off"
          className="flex-1 min-w-0 min-h-[44px] px-3 rounded-lg border border-gray-300 text-sm text-gray-900 bg-white disabled:bg-gray-100" />
        <button type="submit" disabled={!texto.trim() || !!pensando || sinCupo} aria-label="Preguntar"
          className="min-h-[44px] min-w-[44px] px-4 rounded-lg bg-[#F97316] text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2">
          <Send className="w-4 h-4" /><span className="hidden sm:inline">Preguntar</span>
        </button>
      </form>
    </section>
  );
}
