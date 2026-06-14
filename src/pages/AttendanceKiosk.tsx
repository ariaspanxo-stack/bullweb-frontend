import { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import { io as socketIo } from 'socket.io-client';
import { AlertTriangle, WifiOff, Maximize2, Minimize2, Users } from 'lucide-react';
import { attendancePublicService, type KioskEmployee, type RecentAction, type TodaySummary } from '@/services/attendancePublicService';

export default function AttendanceKiosk() {
  const [token,          setToken]          = useState('');
  const [expiresIn,      setExpiresIn]      = useState(10);
  const [qrDataUrl,      setQrDataUrl]      = useState('');
  const [loadError,      setLoadError]      = useState(false);
  const [retryCount,     setRetryCount]     = useState(0);
  const [showFatalError, setShowFatalError] = useState(false);
  const [isFullscreen,   setIsFullscreen]   = useState(false);
  const [presentToday,   setPresentToday]   = useState<KioskEmployee[]>([]);
  const [clockTime,      setClockTime]      = useState('');
  const [dateStr,        setDateStr]        = useState('');
  const [todaySummary,   setTodaySummary]   = useState<TodaySummary | null>(null);
  const [recentActions,  setRecentActions]  = useState<RecentAction[]>([]);
  const [tenantId,       setTenantId]       = useState<string | null>(() => {
    // Prioridad: ?tid en URL (cuando admin abre el kiosco desde el panel)
    const urlTid = new URLSearchParams(window.location.search).get('tid');
    if (urlTid) {
      localStorage.setItem('bullweb-kiosk-tenant', urlTid);
      return urlTid;
    }
    return localStorage.getItem('bullweb-kiosk-tenant');
  });
  const tenantIdRef = useRef<string | null>(
    new URLSearchParams(window.location.search).get('tid') ||
    localStorage.getItem('bullweb-kiosk-tenant')
  );
  const retryCountRef = useRef(0);
  const scheduleRef   = useRef<(() => void) | null>(null);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const overlayRef    = useRef<HTMLCanvasElement>(null);
  const MAX_RETRIES   = 10;
  const BASE_URL      = window.location.origin;

  // Persistir modo kiosco
  useEffect(() => {
    const stored = localStorage.getItem('bullweb-kiosk-mode');
    if (stored === 'true') setIsFullscreen(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('bullweb-kiosk-mode', String(isFullscreen));
    if (isFullscreen) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  const fetchToken = useCallback(async () => {
    try {
      const res = await attendancePublicService.getToken(tenantIdRef.current ?? undefined);
      const { token: t, expiresIn: exp, tenantId: tid } = res.data.data;
      setToken(t);
      setExpiresIn(exp);
      setLoadError(false);
      if (tid && !tenantIdRef.current) {
        // Sólo persiste si no teníamos tenantId previo (no sobreescribir con null del server)
        setTenantId(tid);
        tenantIdRef.current = tid;
        localStorage.setItem('bullweb-kiosk-tenant', tid);
      }
      const url     = `${BASE_URL}/checkin?t=${t}${tenantIdRef.current ? `&tid=${tenantIdRef.current}` : ''}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 500,
        margin: 2,
        color: { dark: '#111827', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      });
      setQrDataUrl(dataUrl);
    } catch {
      setLoadError(true);
    }
  }, [BASE_URL]);

  useEffect(() => {
    fetchToken();
    const schedule = async () => {
      try {
        const res = await attendancePublicService.getToken(tenantIdRef.current ?? undefined);
        const exp = res.data.data.expiresIn;
        setExpiresIn(exp);
        retryCountRef.current = 0;
        setRetryCount(0);
        setShowFatalError(false);
        if (intervalRef.current) clearTimeout(intervalRef.current as any);
        intervalRef.current = setTimeout(() => { fetchToken(); schedule(); }, (exp + 0.5) * 1000);
      } catch {
        retryCountRef.current += 1;
        setRetryCount(retryCountRef.current);
        if (retryCountRef.current >= MAX_RETRIES) { setShowFatalError(true); return; }
        if (intervalRef.current) clearTimeout(intervalRef.current as any);
        intervalRef.current = setTimeout(schedule, 3000);
      }
    };
    scheduleRef.current = schedule;
    schedule();
    return () => {
      if (intervalRef.current)  clearTimeout(intervalRef.current as any);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [fetchToken]);

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setExpiresIn(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [token]);

  // Reloj en tiempo real
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClockTime(now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }));
    };
    tick();
    const tid = setInterval(tick, 1000);
    return () => clearInterval(tid);
  }, []);

  // Resumen diario
  useEffect(() => {
    const fetchSummary = async () => {
      const tid = tenantIdRef.current;
      if (!tid) return;
      try {
        const res = await attendancePublicService.getTodaySummary(tid);
        setTodaySummary(res.data.data);
      } catch { /* silencioso */ }
    };
    fetchSummary();
    const tid = setInterval(fetchSummary, 60_000);
    return () => clearInterval(tid);
  }, []);

  // Helpers de refresh (usados tanto por polling fallback como por WebSocket)
  const fetchPresent = useCallback(async () => {
    const tid = tenantIdRef.current;
    if (!tid) return;
    try {
      const res = await attendancePublicService.getTodayKiosk(tid);
      setPresentToday(res.data.data ?? []);
    } catch { /* silencioso */ }
  }, []);

  const fetchRecent = useCallback(async () => {
    const tid = tenantIdRef.current;
    if (!tid) return;
    try {
      const res = await attendancePublicService.getRecentActions(6, tid);
      setRecentActions(res.data.data ?? []);
    } catch { /* silencioso */ }
  }, []);

  // Acciones recientes y presentes — polling fallback (5 min, WebSocket se encarga del instante)
  useEffect(() => {
    fetchPresent();
    fetchRecent();
    const tidPresent = setInterval(fetchPresent, 300_000);
    const tidRecent  = setInterval(fetchRecent,  300_000);
    return () => { clearInterval(tidPresent); clearInterval(tidRecent); };
  }, [fetchPresent, fetchRecent]);

  // WebSocket — actualizaciones en tiempo real al recibir attendance:update
  useEffect(() => {
    if (!tenantId) return;
    const socket = socketIo(BASE_URL, {
      path:       '/socket.io',
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => {
      socket.emit('attendance:join', tenantId);
    });
    socket.on('attendance:update', () => {
      fetchPresent();
      fetchRecent();
    });
    return () => { socket.disconnect(); };
  }, [tenantId, BASE_URL, fetchPresent, fetchRecent]);

  // Canvas overlay anti-screenshot (Mejora 2)
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !qrDataUrl) return;
    const SIZE = 500;
    canvas.width  = SIZE;
    canvas.height = SIZE;
    const palette = [
      'rgba(255,140,0,0.32)',
      'rgba(30,144,255,0.28)',
      'rgba(50,205,50,0.28)',
      'rgba(220,20,60,0.28)',
    ];
    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, SIZE, SIZE);
      const now   = new Date();
      const ts    = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const color = palette[now.getSeconds() % palette.length];
      ctx.save();
      ctx.translate(SIZE / 2, SIZE / 2);
      ctx.rotate(-Math.PI / 5);
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.font = `bold ${Math.round(SIZE * 0.07)}px monospace`;
      ctx.fillText('SOLO VÁLIDO EN LOCAL', 0, -SIZE * 0.08);
      ctx.font = `bold ${Math.round(SIZE * 0.085)}px monospace`;
      ctx.fillText(ts, 0, SIZE * 0.07);
      ctx.restore();
    };
    draw();
    const tid = setInterval(draw, 1000);
    return () => clearInterval(tid);
  }, [qrDataUrl]);

  const isUrgent = expiresIn <= 3;
  const isMid    = expiresIn <= 6;
  const urgencyBar  = isUrgent ? 'bg-red-500 animate-pulse'   : isMid ? 'bg-yellow-500' : 'bg-green-500';
  const urgencyText = isUrgent ? 'text-red-400 animate-pulse' : isMid ? 'text-yellow-400' : 'text-green-400';

  // Mejora 4 — fondo animado del QR según tiempo restante
  const qrRingClass = isUrgent
    ? 'ring-2 ring-red-500/70 shadow-[0_0_18px_rgba(239,68,68,0.35)]'
    : isMid
    ? 'ring-2 ring-yellow-400/60 shadow-[0_0_14px_rgba(234,179,8,0.30)]'
    : 'ring-2 ring-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.20)]';

  const formatTime = (t: string) =>
    new Date(t).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  const handleRetry = () => {
    if (intervalRef.current) clearTimeout(intervalRef.current as any);
    retryCountRef.current = 0;
    setRetryCount(0);
    setShowFatalError(false);
    setLoadError(false);
    fetchToken();
    scheduleRef.current?.();
  };

  // Kiosco sin tenantId configurado — debe abrirse con ?tid=UUID desde el panel
  if (!tenantId && !tenantIdRef.current) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center p-8">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
        <h2 className="text-white text-2xl font-bold mb-2">Kiosco no configurado</h2>
        <p className="text-gray-400 text-sm max-w-xs">
          Accede al Kiosco QR desde el panel de administración:<br />
          <span className="text-indigo-400 font-medium">Empleados → Asistencia → Abrir Kiosco QR</span>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center select-none p-4 relative">

      {/* Botón pantalla completa */}
      <button
        onClick={() => setIsFullscreen(v => !v)}
        className="fixed top-4 right-4 z-50 p-2 rounded-xl bg-gray-800/60 hover:bg-gray-700 text-gray-500 hover:text-white transition-colors"
        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      >
        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </button>

      {/* Reloj */}
      {clockTime && (
        <div className="mb-4 text-center">
          <p className="text-white text-6xl font-black tabular-nums tracking-tight leading-none">{clockTime}</p>
          <p className="text-gray-600 text-sm mt-2 capitalize">{dateStr}</p>
          {todaySummary !== null && (
            <p className="text-gray-700 text-xs mt-1.5">
              <span className="text-green-400 font-semibold">{todaySummary.presentes}</span> presentes
              {todaySummary.enColacion > 0 && (
                <span> · <span className="text-purple-400 font-semibold">{todaySummary.enColacion}</span> en colación</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-5 text-center">
        <div className="inline-flex items-center gap-3 mb-1.5">
          <div className="w-11 h-11 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/40">
            <span className="text-base font-black text-white">BW</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Bullweb</h1>
        </div>
        <p className="text-gray-500 text-sm">Control de Asistencia</p>
      </div>

      {/* Tarjeta QR */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-7 shadow-2xl flex flex-col items-center gap-5 w-full max-w-sm">

        {/* QR area */}
        <div className={`relative w-full aspect-square rounded-2xl transition-all duration-1000 ${qrRingClass}`}>
          {showFatalError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center p-6">
              <AlertTriangle className="w-12 h-12 text-red-400" />
              <div>
                <p className="text-white font-bold">Sin conexion</p>
                <p className="text-gray-500 text-xs mt-1">No se pudo conectar despues de {MAX_RETRIES} intentos.</p>
              </div>
              <button onClick={handleRetry} className="px-5 py-2.5 bg-white text-gray-900 text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors">
                Reintentar
              </button>
            </div>
          ) : loadError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center">
              <WifiOff className="w-10 h-10 text-gray-600 animate-pulse" />
              <p className="text-gray-500 text-sm">Sin conexion.<br />Reintentando...</p>
              <p className="text-gray-700 text-xs font-mono">{retryCount}/{MAX_RETRIES}</p>
            </div>
          ) : qrDataUrl ? (
            <>
              <img src={qrDataUrl} alt="QR Asistencia" className="w-full h-full rounded-2xl" draggable={false} />
              {/* Logo BW en el centro del QR */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md">
                  <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-black text-white leading-none">BW</span>
                  </div>
                </div>
              </div>
              {/* Overlay anti-screenshot (Mejora 2) */}
              <canvas
                ref={overlayRef}
                className="absolute inset-0 w-full h-full rounded-2xl pointer-events-none"
              />
            </>
          ) : (
            <div className="w-full h-full rounded-2xl bg-gray-800 animate-pulse" />
          )}
        </div>

        {/* Barra de tiempo */}
        <div className="w-full space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-xs uppercase tracking-widest font-semibold">Valido por</span>
            <span className={`font-mono font-bold text-base ${urgencyText}`}>{expiresIn}s</span>
          </div>
          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${urgencyBar}`}
              style={{ width: `${(expiresIn / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="mt-5 text-center">
        <p className="text-white font-semibold">Escanea con tu celular</p>
        <p className="text-gray-600 text-sm mt-1">El codigo cambia cada 10 segundos</p>
      </div>

      {/* Lista presentes hoy */}
      {presentToday.length > 0 && (
        <div className="mt-6 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-gray-600 text-xs uppercase tracking-wider font-semibold">
              Hoy en el local ({presentToday.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {presentToday.slice(0, 5).map(emp => (
              <div key={emp.employeeId} className="flex items-center gap-3 bg-gray-900/70 rounded-xl px-3.5 py-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${emp.inColacion ? 'bg-purple-400 animate-pulse' : 'bg-green-400'}`} />
                <span className="text-gray-300 text-sm font-medium flex-1 truncate">{emp.name}</span>
                <span className="text-gray-600 text-xs tabular-nums shrink-0">
                  {emp.inColacion ? 'Colacion' : formatTime(emp.entryTime)}
                </span>
              </div>
            ))}
            {presentToday.length > 5 && (
              <p className="text-gray-700 text-xs text-center pt-0.5">+{presentToday.length - 5} mas</p>
            )}
          </div>
        </div>
      )}

      {/* Acciones recientes */}
      {recentActions.length > 0 && (
        <div className="mt-5 w-full max-w-sm">
          <p className="text-gray-700 text-xs uppercase tracking-wider font-semibold mb-2">Últimas acciones</p>
          <div className="space-y-1">
            {recentActions.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-gray-900/60">
                <span className={`text-base leading-none ${a.type === 'ENTRY' ? 'text-green-500' : 'text-blue-400'}`}>
                  {a.type === 'ENTRY' ? '→' : '←'}
                </span>
                <span className="text-gray-400 text-sm flex-1 truncate">{a.shortName}</span>
                <span className="text-gray-700 text-xs tabular-nums shrink-0">
                  {new Date(a.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Token debug footer */}
      <p className="fixed bottom-3 text-[11px] text-gray-800 select-none pointer-events-none">
        {token ? `Token: ${token}` : ''}
      </p>
    </div>
  );
}
