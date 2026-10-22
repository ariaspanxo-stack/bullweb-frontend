// ═══════════════════════════════════════════════════════════════
// HOTFIX 272b — Seguimiento del pedido QR reutilizable (pantalla "Pedido enviado" de la carta y ruta pública
// /carta/:slug/pedido/:orderId). Movido desde CartaDigital (HOTFIX 272/273) sin cambiar su lógica:
// polling 10 s de /api/public/qr-orders/:id/status, aviso a los 3 min con WhatsApp, aceptado/en cocina/listo/
// entregado/rechazado y reseña al llegar a listo/entregado. Nuevo: el mensaje de WhatsApp lleva el enlace de
// seguimiento, y helpers de localStorage para la barra fija del menú.
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { CheckCircle, MessageCircle, X } from 'lucide-react';
import { useQrOrderStatus } from '@/hooks/useQrOrderStatus';

export const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;

// HOTFIX 250 T2 (F5) - normaliza un teléfono chileno para wa.me:
// strip no-dígitos → 9 dígitos empezando en 9 → anteponer 56;
// empieza con 56 → dejar; cualquier otro caso → null.
// (Lógica del patrón de SuperAdminTenants.tsx :91, copiada la LÓGICA, no el código.)
export function normalizeWhatsAppPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (/^9\d{8}$/.test(digits)) return `56${digits}`;
  if (digits.startsWith('56')) return digits;
  return null;
}

// ── HOTFIX 272b — pedido activo por carta en localStorage (barra fija del menú) ──
export interface ActiveQrOrder { id: string; code: string | null; createdAt: number }
const ACTIVE_TTL_MS = 12 * 60 * 60 * 1000; // a las 12 h se olvida aunque no haya terminado
const activeKey = (slug: string) => `bullweb:qr-order:${slug}`;

export function saveActiveQrOrder(slug: string | null, id: string, code: string | null) {
  if (!slug) return;
  try { localStorage.setItem(activeKey(slug), JSON.stringify({ id, code, createdAt: Date.now() })); } catch { /* sin storage */ }
}
export function readActiveQrOrder(slug: string | null): ActiveQrOrder | null {
  if (!slug) return null;
  try {
    const raw = localStorage.getItem(activeKey(slug));
    if (!raw) return null;
    const v = JSON.parse(raw) as ActiveQrOrder;
    if (!v?.id || !/^[0-9a-f-]{36}$/i.test(v.id) || Date.now() - Number(v.createdAt) > ACTIVE_TTL_MS) {
      localStorage.removeItem(activeKey(slug));
      return null;
    }
    return v;
  } catch { return null; }
}
export function clearActiveQrOrder(slug: string | null) {
  if (!slug) return;
  try { localStorage.removeItem(activeKey(slug)); } catch { /* sin storage */ }
}
export const qrTrackingPath = (slug: string, id: string) => `/carta/${encodeURIComponent(slug)}/pedido/${id}`;

// HOTFIX 273 — "¿Cómo estuvo tu experiencia?": 5 estrellas (44 px, naranja) + comentario opcional.
// POST /api/public/qr-orders/:id/review. >= 4 → gracias + "Dejar reseña en Google" (si el local configuró el enlace);
// <= 3 → gracias sin enlace. 409 (ya reseñado) se muestra como ya recibido.
const REVIEW_ORANGE = '#F97316';
export function QrReviewBlock({ orderId, tenantSlug }: { orderId: string; tenantSlug: string | null }) {
  const [rating,     setRating]     = useState(0);
  const [comment,    setComment]    = useState('');
  const [sending,    setSending]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [done,       setDone]       = useState<null | { rating: number; googleReviewUrl: string | null; already?: boolean }>(null);

  const send = async () => {
    if (rating < 1) return;
    setSending(true);
    setError(null);
    try {
      const res  = await fetch(`/api/public/qr-orders/${orderId}/review`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rating, comment: comment.trim() || undefined, tenantSlug: tenantSlug ?? undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 201 && json?.success) {
        setDone({ rating, googleReviewUrl: json.data?.googleReviewUrl ?? null });
      } else if (res.status === 409) {
        setDone({ rating, googleReviewUrl: null, already: true });
      } else {
        setError(json?.error ?? 'No pudimos guardar tu opinión. Intenta nuevamente.');
      }
    } catch {
      setError('No pudimos guardar tu opinión. Revisa tu conexión.');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl px-3 py-3 space-y-2" style={{ backgroundColor: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.35)' }}>
        <p className="text-sm font-semibold text-orange-300">
          {done.already
            ? 'Ya recibimos tu opinión sobre este pedido. ¡Gracias!'
            : done.rating >= 4 ? '¡Gracias por tu opinión! Nos alegra que te haya gustado.' : 'Gracias por contarnos. Tu comentario nos ayuda a mejorar.'}
        </p>
        {!done.already && done.rating >= 4 && done.googleReviewUrl && (
          <a
            href={done.googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[44px] rounded-2xl font-bold text-base flex items-center justify-center gap-2 text-white transition-colors"
            style={{ background: REVIEW_ORANGE }}
          >
            Dejar reseña en Google
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl px-3 py-3 space-y-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}>
      <p className="text-sm font-semibold text-zinc-200">¿Cómo estuvo tu experiencia?</p>
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Calificación">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} estrella${n === 1 ? '' : 's'}`}
            onClick={() => setRating(n)}
            disabled={sending}
            className="w-11 h-11 flex items-center justify-center rounded-lg transition-transform active:scale-90"
          >
            <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
              <path
                d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
                fill={n <= rating ? REVIEW_ORANGE : 'none'}
                stroke={REVIEW_ORANGE}
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="Cuéntanos más (opcional)"
            className="w-full rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none"
            style={{ backgroundColor: '#27272a', border: '1px solid rgba(255,255,255,0.10)' }}
          />
          <button
            type="button"
            onClick={send}
            disabled={sending}
            className="w-full min-h-[44px] rounded-2xl font-bold text-base text-white transition-opacity disabled:opacity-50"
            style={{ background: REVIEW_ORANGE }}
          >
            {sending ? 'Enviando…' : 'Enviar opinión'}
          </button>
        </>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface TrackingProps {
  orderId:            string;
  tenantSlug:         string | null;
  themeColor:         string;
  /** Datos que la carta ya conoce mientras llega el primer poll. */
  fallbackWhatsapp?:  string | null;
  fallbackOrderType?: 'delivery' | 'pickup' | null;
  fallbackTotal?:     number | null;
  fallbackCode?:      string | null;
  tableNumber?:       string | null;
  className?:         string;
}

/** Bloque de seguimiento del pedido QR (estado vivo, avisos, WhatsApp y reseña). */
export function QrOrderTracking({
  orderId, tenantSlug, themeColor, fallbackWhatsapp, fallbackOrderType, fallbackTotal, fallbackCode, tableNumber, className = '',
}: TrackingProps) {
  const liveStatus = useQrOrderStatus(orderId);
  // reloj para el "hace N min" y el aviso de 3 min entre polls
  const [statusNow, setStatusNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setStatusNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const st         = liveStatus.status;
  const elapsedMin = Math.max(0, Math.floor(liveStatus.minutesSinceSent + (statusNow - liveStatus.fetchedAt) / 60000));
  const isDel      = (liveStatus.orderType ?? fallbackOrderType ?? 'pickup') === 'delivery';
  const liveTotal  = liveStatus.total ?? fallbackTotal ?? 0;
  const code       = liveStatus.code ?? fallbackCode ?? '';
  const waNumber   = normalizeWhatsAppPhone(liveStatus.whatsapp ?? fallbackWhatsapp ?? '');
  // patrón #250: wa.me con mensaje prearmado (código y total). HOTFIX 272b: + enlace de seguimiento del pedido
  const trackingUrl = tenantSlug ? `${window.location.origin}${qrTrackingPath(tenantSlug, orderId)}` : null;
  const waText     = `Hola! Quiero coordinar mi pedido ${code} de la carta. Total: ${fmtCLP(liveTotal)}`
    + (trackingUrl ? `\nSeguimiento: ${trackingUrl}` : '');
  const waHref     = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}` : null;
  const waButton   = (label: string) => waHref ? (
    <a
      href={waHref}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 w-full min-h-[44px] py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-colors bg-transparent border border-[#128C7E] text-[#128C7E] hover:bg-[#128C7E]/10"
    >
      <MessageCircle className="w-5 h-5" />
      {label}
    </a>
  ) : null;
  const ok      = <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />;
  const spinner = (
    <span
      className="w-5 h-5 shrink-0 rounded-full border-2 border-zinc-600 animate-spin inline-block"
      style={{ borderTopColor: themeColor }}
    />
  );
  const acceptedText = liveStatus.estimatedMinutes != null
    ? `Tu tiempo de demora es de ${liveStatus.estimatedMinutes} minutos`
      + (isDel && liveStatus.deliveryFee != null
        ? ` y el costo de envío es de ${fmtCLP(liveStatus.deliveryFee)}. Total: ${fmtCLP(liveTotal)}`
        : '')
    : null;

  return (
    <div
      className={`w-full rounded-2xl px-5 py-4 space-y-3 text-left ${className}`}
      style={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center gap-3">
        {ok}
        <p className="text-sm text-zinc-300 font-medium">
          Enviado{code ? ` — ${code}` : ''}{tableNumber ? ` · Mesa ${tableNumber}` : ''}
          {st === 'PENDING' ? ` · hace ${elapsedMin} min` : ''}
        </p>
      </div>

      {st === 'PENDING' && (
        <>
          <div className="flex items-center gap-3">
            {spinner}
            <p className="text-sm font-medium text-zinc-400">Esperando confirmación del local…</p>
          </div>
          {elapsedMin >= 3 && (
            <div className="rounded-xl px-3 py-3 space-y-2" style={{ backgroundColor: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)' }}>
              <p className="text-sm font-semibold text-amber-300">El local aún no confirma</p>
              {waButton('Coordinar por WhatsApp')}
            </div>
          )}
        </>
      )}

      {(st === 'ACCEPTED' || st === 'PREPARING') && (
        <>
          <div className="flex items-start gap-3">
            {ok}
            <p className="text-sm font-medium text-green-400">
              Pedido aceptado.{acceptedText ? ` ${acceptedText}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {st === 'PREPARING' ? ok : spinner}
            <p className={`text-sm font-medium ${st === 'PREPARING' ? 'text-green-400' : 'text-zinc-400'}`}>
              {st === 'PREPARING' ? 'Tu pedido está en cocina' : 'Pronto pasa a cocina…'}
            </p>
          </div>
        </>
      )}

      {st === 'READY' && (
        <div className="flex items-center gap-3">
          {ok}
          <p className="text-base font-bold text-green-400">
            {isDel ? '¡Tu pedido va en camino!' : '¡Tu pedido está listo para retirar!'}
          </p>
        </div>
      )}

      {st === 'DELIVERED' && (
        <div className="flex items-center gap-3">
          {ok}
          <p className="text-base font-bold text-green-400">Pedido entregado. ¡Gracias!</p>
        </div>
      )}

      {/* HOTFIX 273 — reseña al llegar a listo/entregado, una sola vez por pedido */}
      {(st === 'READY' || st === 'DELIVERED') && !liveStatus.reviewed && (
        <QrReviewBlock orderId={orderId} tenantSlug={tenantSlug} />
      )}

      {st === 'REJECTED' && (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <X className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-400">El local no pudo aceptar tu pedido</p>
              {liveStatus.reason && (
                <p className="text-sm text-zinc-300 mt-0.5">Motivo: {liveStatus.reason}</p>
              )}
            </div>
          </div>
          {waButton('Escribir por WhatsApp')}
        </div>
      )}
    </div>
  );
}
