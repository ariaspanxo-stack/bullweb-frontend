// ─────────────────────────────────────────────────────────────────────────────
// CustomerSegmentBadge — badge del segmento CRM (⭐ VIP / 🔥 Frecuente)
// Hotfix #200 (B1) — visible en el flujo operativo: modal QR, detalle de venta
// y filas de tabla. Estilo CLARO del panel (patrón CustomersTable), nulo sin
// segment (cliente nuevo/Público → sin badge).
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  segment?: string | null;
  size?: 'sm' | 'md';
}

export function CustomerSegmentBadge({ segment, size = 'sm' }: Props) {
  if (!segment) return null;

  const isVip      = segment === 'VIP';
  const isFrequent = segment === 'FREQUENT';

  // Solo pintamos VIP y FREQUENT (los accionables en operación);
  // NEW/REGULAR/AT_RISK no aportan al atender → sin ruido visual.
  if (!isVip && !isFrequent) return null;

  const base    = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  const classes = isVip
    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
    : 'bg-green-100 text-green-700 border border-green-200';

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded font-bold uppercase tracking-wide ${base} ${classes}`}
      title={isVip ? 'Cliente VIP' : 'Cliente frecuente'}
    >
      {isVip ? '⭐ VIP' : '🔥 Frecuente'}
    </span>
  );
}
