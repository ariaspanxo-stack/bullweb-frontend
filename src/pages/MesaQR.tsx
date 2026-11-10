import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Bell, Receipt, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Límites anti-spam ──────────────────────────────────────────
// El cliente puede presionar cada botón hasta MAX_CLICKS veces.
// Al superar el límite, el botón se deshabilita y pide re-escanear
// el QR. Usamos sessionStorage (no localStorage) para que el límite
// se mantenga durante la sesión del cliente en este dispositivo,
// pero no quede persistido para siempre si cierra el navegador.
const MAX_CLICKS = 3;
const CLICK_KEYS = {
  call_waiter:  'mesa_qr_clicks_waiter',
  request_bill: 'mesa_qr_clicks_bill',
} as const;

type RequestType = keyof typeof CLICK_KEYS;

// Lee el conteo actual desde sessionStorage (0 si no existe / inválido)
function readClicks(key: string): number {
  try {
    const raw = sessionStorage.getItem(key);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

// Escribe el conteo en sessionStorage de forma segura
function writeClicks(key: string, value: number) {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {
    /* sessionStorage puede fallar en modo privado / storage lleno */
  }
}

export default function MesaQR() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  // HOTFIX 304 (B5-10): QR de mesa por id (?mesaId=); el QR viejo ?mesa=N sirve si el número es único en el local,
  // si Salón y Terraza lo repiten el cliente elige su salón antes de llamar.
  const mesaIdParam = searchParams.get('mesaId');
  const mesaParam   = searchParams.get('mesa');
  const [qrTable, setQrTable]           = useState<{ id: string; number: string; section: string | null } | null>(null);
  const [tableChoices, setTableChoices] = useState<Array<{ id: string; number: string; section: string | null }>>([]);
  useEffect(() => {
    setQrTable(null); setTableChoices([]);
    if (!slug || (!mesaIdParam && !mesaParam)) return;
    const p = new URLSearchParams({ slug });
    if (mesaIdParam) p.set('mesaId', mesaIdParam); else if (mesaParam) p.set('mesa', mesaParam);
    let cancelled = false;
    fetch(`/api/public/table?${p.toString()}`)
      .then(r => r.json())
      .then(j => { if (cancelled) return; setQrTable(j?.data?.table ?? null); setTableChoices(j?.data?.choices ?? []); })
      .catch(() => { /* sin mesa resuelta: se llama con el número del QR */ });
    return () => { cancelled = true; };
  }, [slug, mesaIdParam, mesaParam]);
  const tableNumber = qrTable ? qrTable.number : (mesaIdParam || tableChoices.length > 0 ? null : mesaParam);
  const tableLabel  = qrTable ? `${qrTable.number}${qrTable.section ? ` · ${qrTable.section}` : ''}` : tableNumber;
  const mustPick    = !qrTable && tableChoices.length > 1;

  const [requestSent, setRequestSent] = useState<RequestType | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Contadores independientes por botón (inicializados desde sessionStorage) ──
  const [clicksWaiter, setClicksWaiter] = useState(() => readClicks(CLICK_KEYS.call_waiter));
  const [clicksBill,   setClicksBill]   = useState(() => readClicks(CLICK_KEYS.request_bill));

  // Sincroniza cambios del estado hacia sessionStorage
  useEffect(() => { writeClicks(CLICK_KEYS.call_waiter,  clicksWaiter); }, [clicksWaiter]);
  useEffect(() => { writeClicks(CLICK_KEYS.request_bill, clicksBill);   }, [clicksBill]);

  const limitReachedWaiter = clicksWaiter >= MAX_CLICKS;
  const limitReachedBill   = clicksBill   >= MAX_CLICKS;

  const handleRequest = async (type: RequestType) => {
    if (!slug || loading || mustPick) return;

    // Bloqueo anti-spam: si ya llegó al límite, NO ejecutar el fetch
    const isLimit = type === 'call_waiter' ? limitReachedWaiter : limitReachedBill;
    if (isLimit) return;

    // Incrementar contador correspondiente ANTES del fetch
    if (type === 'call_waiter') {
      setClicksWaiter(c => c + 1);
    } else {
      setClicksBill(c => c + 1);
    }

    setLoading(true);
    try {
      const res = await fetch('/api/public/table-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, tableNumber, type, ...(qrTable ? { tableId: qrTable.id } : {}) })
      });
      // ── 429 Too Many Requests: el backend bloqueó por límite server-side ──
      // Forzar el bloqueo del botón (como si hubiera llegado a 3 toques) y
      // mostrar el mensaje que envió el backend.
      if (res.status === 429) {
        let backendMessage = 'Has alcanzado el límite de solicitudes para esta mesa. Vuelve a escanear el QR más tarde.';
        try {
          const data = await res.json();
          if (data?.error) backendMessage = data.error;
        } catch { /* keep default */ }

        // Bloquear ambos botones al máximo (límite server-side aplica a la mesa completa)
        setClicksWaiter(MAX_CLICKS);
        setClicksBill(MAX_CLICKS);
        writeClicks(CLICK_KEYS.call_waiter, MAX_CLICKS);
        writeClicks(CLICK_KEYS.request_bill, MAX_CLICKS);

        toast.error(backendMessage, { duration: 6000 });
        return;
      }

      if (!res.ok) {
        console.error(`[Mesa QR] HTTP ${res.status} en table-request (slug=${slug}, type=${type})`);
        toast.error('No se pudo enviar la solicitud. Intenta nuevamente.');
        return;
      }
      setRequestSent(type);
      toast.success(type === 'call_waiter' ? '¡Mesero solicitado!' : '¡Cuenta solicitada!');
      setTimeout(() => setRequestSent(null), 4000);
    } catch (error) {
      console.error('[Mesa QR] Error de red en table-request:', error);
      toast.error('No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Helper para label + estilo del botón según el límite
  const renderButton = (type: RequestType) => {
    const limitReached = type === 'call_waiter' ? limitReachedWaiter : limitReachedBill;
    const Icon      = type === 'call_waiter' ? Bell    : Receipt;
    const baseClass = type === 'call_waiter'
      ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30'
      : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg';

    if (limitReached) {
      return (
        <button
          disabled
          className={`w-full py-6 rounded-2xl text-base font-bold flex items-center justify-center gap-3
                      bg-gray-200 text-gray-500 opacity-50 cursor-not-allowed border-2 border-dashed border-gray-300`}
        >
          <Icon className="w-6 h-6" />
          Límite alcanzado. Vuelve a escanear el QR.
        </button>
      );
    }

    const remaining = MAX_CLICKS - (type === 'call_waiter' ? clicksWaiter : clicksBill);

    return (
      <button
        onClick={() => handleRequest(type)}
        disabled={!!requestSent || loading}
        className={`w-full py-6 rounded-2xl text-lg font-bold flex items-center justify-center gap-3 transition-all active:scale-95 ${
          requestSent === type
            ? 'bg-green-100 text-green-700 border-2 border-green-300'
            : baseClass
        }`}
      >
        {requestSent === type ? (
          <><CheckCircle className="w-7 h-7" />¡{type === 'call_waiter' ? 'Mesero en camino' : 'Cuenta solicitada'}!</>
        ) : (
          <>
            <Icon className="w-7 h-7" />
            {type === 'call_waiter' ? 'Llamar Mesero' : 'Pedir la Cuenta'}
            <span className="ml-1 text-xs font-medium opacity-70">({remaining} restantes)</span>
          </>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Servicio de Mesa</h1>
          {tableLabel && (
            <p className="text-lg font-semibold text-orange-500 mt-1">Mesa {tableLabel}</p>
          )}
        </div>

        {mustPick && (
          <div className="space-y-2 text-left" role="group" aria-label="Elige tu salón">
            <p className="text-sm text-gray-700">Hay más de una mesa {tableChoices[0].number}. ¿Dónde estás sentado?</p>
            {tableChoices.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete('mesa'); n.set('mesaId', t.id); return n; }, { replace: true })}
                className="w-full min-h-[48px] rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600"
              >
                Mesa {t.number}{t.section ? ` · ${t.section}` : ''}
              </button>
            ))}
          </div>
        )}

        <div className={`space-y-4 ${mustPick ? 'opacity-40 pointer-events-none' : ''}`}>
          {renderButton('call_waiter')}
          {renderButton('request_bill')}
        </div>

        {(limitReachedWaiter || limitReachedBill) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700 font-medium">
              🔒 Por seguridad, cada acción tiene un máximo de {MAX_CLICKS} intentos.
              Vuelve a escanear el QR de tu mesa para reiniciar.
            </p>
          </div>
        )}

        {/* LOTE 323 (B5-13): enlace a la carta del local (con la mesa del QR) */}
        {slug && (
          <a
            href={`/carta/${encodeURIComponent(slug)}${mesaIdParam ? `?mesaId=${encodeURIComponent(mesaIdParam)}` : mesaParam ? `?mesa=${encodeURIComponent(mesaParam)}` : ''}`}
            className="w-full min-h-[48px] rounded-xl border-2 border-orange-500 text-orange-600 font-bold hover:bg-orange-50 inline-flex items-center justify-center"
          >
            Ver carta
          </a>
        )}

        <p className="text-xs text-gray-400 mt-4">Escanea este QR solo desde tu mesa</p>
      </div>
    </div>
  );
}