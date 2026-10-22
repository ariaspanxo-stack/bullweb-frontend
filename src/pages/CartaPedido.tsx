// ═══════════════════════════════════════════════════════════════
// HOTFIX 272b — Ruta pública del pedido QR: /carta/:slug/pedido/:orderId
// El cliente vuelve a su pedido desde la barra fija de la carta o desde el enlace del WhatsApp.
// Muestra el mismo seguimiento que la pantalla "Pedido enviado" (QrOrderTracking) y "Hacer otro pedido".
// Sin datos personales: el estado público solo trae estado, montos, minutos y el WhatsApp del local.
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QrOrderTracking, saveActiveQrOrder, readActiveQrOrder } from '@/components/carta/QrOrderTracking';

interface CartaHeader { restaurantName: string; logo: string | null; themeColor: string; whatsapp?: string | null }

export default function CartaPedido() {
  const { slug = '', orderId = '' } = useParams<{ slug: string; orderId: string }>();
  const validId = /^[0-9a-f-]{36}$/i.test(orderId);
  const [header,   setHeader]   = useState<CartaHeader | null>(null);
  const [notFound, setNotFound] = useState(!validId);

  useEffect(() => {
    let alive = true;
    fetch(`/api/public/carta-settings?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(j => { if (alive && j?.data) setHeader({ restaurantName: j.data.restaurantName ?? '', logo: j.data.logo ?? null, themeColor: j.data.themeColor ?? '#F97316' }); })
      .catch(() => { /* sin cabecera: el seguimiento igual funciona */ });
    if (validId) {
      fetch(`/api/public/qr-orders/${orderId}/status`)
        .then(r => {
          if (!alive) return;
          if (r.status === 404) { setNotFound(true); return; }
          // el pedido existe: queda como pedido activo de esta carta (barra fija al volver al menú)
          const active = readActiveQrOrder(slug);
          if (!active || active.id !== orderId) saveActiveQrOrder(slug, orderId, `QR-${orderId.split('-')[0].toUpperCase()}`);
        })
        .catch(() => { /* error de red: el polling reintenta */ });
    }
    return () => { alive = false; };
  }, [slug, orderId, validId]);

  const themeColor = header?.themeColor ?? '#F97316';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md space-y-5">
        <div className="flex items-center gap-3">
          {header?.logo && (
            <img src={header.logo} alt="" className="w-12 h-12 rounded-full object-cover border border-white/10" />
          )}
          <div>
            <p className="text-lg font-bold leading-tight">{header?.restaurantName || 'Tu pedido'}</p>
            <p className="text-sm text-zinc-400">Seguimiento de tu pedido</p>
          </div>
        </div>

        {notFound ? (
          <div className="rounded-2xl px-5 py-6 text-center" style={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-semibold">No encontramos este pedido</p>
            <p className="text-sm text-zinc-400 mt-1">Revisa el enlace o vuelve a la carta para hacer un pedido nuevo.</p>
          </div>
        ) : (
          <QrOrderTracking orderId={orderId} tenantSlug={slug} themeColor={themeColor} />
        )}

        <Link
          to={`/carta/${encodeURIComponent(slug)}`}
          className="w-full min-h-[44px] py-4 rounded-2xl font-bold text-white flex items-center justify-center transition-all active:scale-[0.98]"
          style={{ background: themeColor, boxShadow: `0 8px 24px ${themeColor}40` }}
        >
          Hacer otro pedido
        </Link>
      </div>
    </div>
  );
}
