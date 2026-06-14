import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  attendancePublicService,
  type Employee,
  type EmployeeStatus,
} from '@/services/attendancePublicService';
import {
  CheckCircle, XCircle, Clock, RefreshCw,
  ChevronLeft, Coffee, LogIn, LogOut, Eye, EyeOff,
} from 'lucide-react';

type Step       = 'list' | 'preview' | 'confirming' | 'success' | 'error';
type ActionType = 'checkin' | 'colacion_start' | 'colacion_end';

// --- Sonido feedback ---
function playCheckinSound(type: 'entry' | 'exit' | 'colacion' | 'error') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const playTone = (freq: number, start: number, duration: number, wave: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    if (type === 'entry') {
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      playTone(440, 0,    0.12);
      playTone(660, 0.14, 0.20);
    } else if (type === 'exit') {
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      playTone(660, 0,    0.12);
      playTone(440, 0.14, 0.20);
    } else if (type === 'colacion') {
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      playTone(520, 0,    0.10);
      playTone(520, 0.12, 0.10);
    } else {
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      playTone(200, 0, 0.35, 'sawtooth');
    }
    setTimeout(() => ctx.close(), 1200);
  } catch { /* silencioso */ }
}

// --- Turno fin de jornada ---
function getShiftEndLabel(shift: string | null | undefined): string | null {
  if (!shift) return null;
  const customMatch = shift.match(/[-–](\d{1,2}):(\d{2})$/);
  if (customMatch) return `${customMatch[1].padStart(2, '0')}:${customMatch[2]}`;
  const ENDS: Record<string, string> = { morning: '14:00', afternoon: '22:00', night: '06:00' };
  return ENDS[shift] ?? null;
}

// --- Avatar helpers ---
const AVATAR_COLORS = [
  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'bg-green-500/20 text-green-400 border-green-500/30',
  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  'bg-teal-500/20 text-teal-400 border-teal-500/30',
  'bg-red-500/20 text-red-400 border-red-500/30',
];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
function formatTime(date: Date | string | null | undefined) {
  if (!date) return '--';
  return new Date(date).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}
function formatRelative(date: Date | string | null | undefined) {
  if (!date) return '';
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60_000);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `hace ${hours}h ${mins % 60}m`;
  if (mins > 0)  return `hace ${mins}m`;
  return 'hace instantes';
}

export default function AttendanceCheckin() {
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const empId = params.get('emp') ?? '';
  const urlTid = params.get('tid') ?? '';

  const [employees,    setEmployees]    = useState<Employee[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [step,         setStep]         = useState<Step>('list');
  const [selected,     setSelected]     = useState<Employee | null>(null);
  const [empStatus,    setEmpStatus]    = useState<EmployeeStatus | null>(null);
  const [statusLoading,setStatusLoading]= useState(false);
  const [pendingAction,setPendingAction]= useState<ActionType | null>(null);
  const [result,       setResult]       = useState<{ type: 'ENTRY' | 'EXIT'; employeeName: string; shift?: string | null } | null>(null);
  const [colResult,    setColResult]    = useState<{ message: string; minutos?: number } | null>(null);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [search,       setSearch]       = useState('');
  const [pin,          setPin]          = useState('');
  const [pinVisible,   setPinVisible]   = useState(false);
  const [countdown,    setCountdown]    = useState(5);
  const [geoLocation,  setGeoLocation]  = useState<{ lat: number; lon: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installPrompt,setInstallPrompt]= useState<any>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Geolocation
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setGeoLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGeoLocation(null),
      { timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  // PWA install prompt
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    // urlTid viene del QR (?tid=UUID). Si no está (acceso directo), getToken() lo obtiene del server.
    attendancePublicService.getToken(urlTid || undefined)
      .then(res => {
        const tid = urlTid || res.data.data.tenantId;
        if (!tid) throw new Error('tenantId no disponible');
        return attendancePublicService.getEmployees(tid);
      })
      .then(res => setEmployees(res.data.data ?? []))
      .catch(() => setErrorMsg('No se pudo obtener la lista de empleados.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (step !== 'success') return;
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          reset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (!empId || loading || employees.length === 0) return;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    handlePreview(emp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empId, loading, employees]);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const handlePreview = async (employee: Employee) => {
    setSelected(employee);
    setPin('');
    setPinVisible(false);
    setStatusLoading(true);
    setStep('preview');
    try {
      const res = await attendancePublicService.getEmployeeStatus(employee.id);
      setEmpStatus(res.data.data);
    } catch {
      setEmpStatus(null);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAction = async (action: ActionType) => {
    if (!token && action === 'checkin') {
      setErrorMsg('Token invalido. Vuelve a escanear el QR.');
      setStep('error');
      return;
    }
    setPendingAction(action);
    setStep('confirming');
    try {
      if (action === 'checkin') {
        const res = await attendancePublicService.checkin(
          selected!.id, token, undefined, pin || undefined,
          geoLocation?.lat ?? null, geoLocation?.lon ?? null,
        );
        setResult(res.data.data);
        setColResult(null);
        playCheckinSound(res.data.data.type === 'ENTRY' ? 'entry' : 'exit');
      } else if (action === 'colacion_start') {
        const res = await attendancePublicService.startColacion(selected!.id);
        setColResult(res.data.data);
        setResult(null);
        playCheckinSound('colacion');
      } else {
        const res = await attendancePublicService.endColacion(selected!.id);
        setColResult(res.data.data);
        setResult(null);
        playCheckinSound('colacion');
      }
      setStep('success');
    } catch (err: any) {
      const msg: string = err?.response?.data?.error ?? err?.response?.data?.message ?? 'Error al registrar.';
      if (msg.toUpperCase().includes('TOKEN_INVALID') || (msg.toLowerCase().includes('qr') && msg.toLowerCase().includes('expir'))) {
        setErrorMsg('El codigo QR expiro. Vuelve a escanear el codigo actualizado.');
      } else if (msg.toLowerCase().includes('ya registraste') || msg.toLowerCase().includes('replay')) {
        setErrorMsg('Ya registraste tu asistencia en este momento. Espera el proximo codigo QR.');
      } else if (msg.toLowerCase().includes('pin incorrecto')) {
        setErrorMsg('PIN incorrecto. Intentalo de nuevo.');
      } else if (msg.toLowerCase().includes('requiere pin')) {
        setErrorMsg('Se requiere PIN para registrar asistencia.');
      } else if (msg.toLowerCase().includes('no hay entrada') || msg.toLowerCase().includes('no_entry')) {
        setErrorMsg('Debes registrar tu entrada antes de la colacion.');
      } else if (msg.toLowerCase().includes('solo permitido desde el local') || msg.toLowerCase().includes('conéctate al wifi')) {
        setErrorMsg('Check-in solo permitido desde el local. Conéctate al WiFi del negocio.');
      } else if (msg.toLowerCase().includes('debes estar en el local') || msg.toLowerCase().includes('distancia')) {
        setErrorMsg(msg);
      } else {
        setErrorMsg(msg);
      }
      setStep('error');
      playCheckinSound('error');
    }
  };

  const reset = () => {
    setStep('list');
    setSelected(null);
    setEmpStatus(null);
    setResult(null);
    setColResult(null);
    setErrorMsg('');
    setPin('');
    setPendingAction(null);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  if (!token && !empId) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center">
          <XCircle className="w-12 h-12 text-red-400" />
        </div>
        <h2 className="text-white font-bold text-xl">Codigo invalido</h2>
        <p className="text-gray-400 text-sm max-w-xs">Escanea el codigo QR del panel de entrada para acceder.</p>
      </div>
    );
  }

  if (step === 'confirming') {
    const label = pendingAction === 'checkin'
      ? (empStatus?.nextAction === 'EXIT' ? 'Registrando salida...' : 'Registrando entrada...')
      : pendingAction === 'colacion_start' ? 'Iniciando colacion...' : 'Terminando colacion...';
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5 p-6">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white text-lg font-semibold">{label}</p>
        {selected && <p className="text-gray-400">{selected.name}</p>}
      </div>
    );
  }

  if (step === 'success' && (result || colResult)) {
    const isColEnd  = colResult && typeof (colResult as any).minutos === 'number';
    const isColStart= colResult && !isColEnd;
    const isEntry   = result?.type === 'ENTRY';
    const name      = selected?.name ?? result?.employeeName ?? '';
    const firstName = name.split(' ')[0];
    const shiftEnd  = isEntry ? getShiftEndLabel(result?.shift ?? selected?.shift) : null;
    const bgClass   = (isColStart || isColEnd) ? 'bg-purple-500/15' : isEntry ? 'bg-green-500/15' : 'bg-blue-500/15';
    const iconClass = (isColStart || isColEnd) ? 'text-purple-400'  : isEntry ? 'text-green-400'  : 'text-blue-400';
    const barClass  = (isColStart || isColEnd) ? 'bg-purple-500'    : isEntry ? 'bg-green-500'    : 'bg-blue-500';
    const label     = isColEnd   ? `Colación: ${(colResult as any).minutos} min`
                    : isColStart ? '¡Buen provecho!'
                    : isEntry    ? `¡Bienvenido/a, ${firstName}!`
                    : `¡Hasta luego, ${firstName}!`;
    const sublabel  = isColEnd   ? 'Pausa finalizada. ¡A trabajar!'
                    : isColStart ? 'Colación iniciada correctamente.'
                    : isEntry    ? `Entrada registrada a las ${formatTime(new Date())}.`
                    : `Salida registrada a las ${formatTime(new Date())}.`;
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center ${bgClass}`}>
          {(isColStart || isColEnd) ? <Coffee className={`w-14 h-14 ${iconClass}`} /> : <CheckCircle className={`w-14 h-14 ${iconClass}`} />}
        </div>
        <div className="space-y-1">
          <h2 className={`text-2xl font-black ${iconClass}`}>{label}</h2>
          <p className="text-gray-500 text-sm">{sublabel}</p>
          {shiftEnd && (
            <p className="text-gray-600 text-xs mt-0.5">
              Jornada hasta las <span className="text-gray-400 font-semibold">{shiftEnd}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="h-1.5 w-32 bg-gray-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ${barClass}`} style={{ width: `${(countdown / 5) * 100}%` }} />
          </div>
          <span className="text-gray-600 text-xs tabular-nums">{countdown}s</span>
        </div>
        <button
          onClick={reset}
          className="mt-1 px-6 py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-semibold flex items-center gap-2 transition-all active:scale-[0.97]"
        >
          <ChevronLeft className="w-4 h-4" />
          Registrar otro empleado
        </button>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/15 flex items-center justify-center">
          <XCircle className="w-12 h-12 text-red-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-red-400">Ocurrio un problema</h2>
          <p className="text-gray-300 text-sm max-w-xs">{errorMsg}</p>
        </div>
        <div className="flex gap-3 mt-1">
          <button onClick={() => setStep('preview')} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          <button onClick={reset} className="flex items-center gap-2 text-gray-500 hover:text-gray-300 px-4 py-2 rounded-xl text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (step === 'preview' && selected) {
    const aColor     = avatarColor(selected.name);
    const nextAction = empStatus?.nextAction ?? 'ENTRY';
    const inColacion = empStatus?.inColacion ?? false;
    const hasEntry   = nextAction === 'EXIT' || inColacion;
    const hasPin     = selected.hasPin ?? false;
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-start pt-14 p-5">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2.5 text-center">
            <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center ${aColor}`}>
              <span className="text-2xl font-black">{getInitials(selected.name)}</span>
            </div>
            <div>
              <h2 className="text-white text-xl font-bold">{selected.name}</h2>
              {selected.roleName && <p className="text-gray-600 text-sm">{selected.roleName}</p>}
            </div>
            {statusLoading ? (
              <div className="h-6 w-44 bg-gray-800 rounded-full animate-pulse" />
            ) : empStatus ? (
              <div className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
                inColacion              ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                : nextAction === 'EXIT' ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-gray-800 border-gray-700 text-gray-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  inColacion              ? 'bg-purple-400'
                  : nextAction === 'EXIT' ? 'bg-green-400 animate-pulse'
                  : 'bg-gray-600'
                }`} />
                {inColacion ? 'En colacion ahora'
                  : nextAction === 'EXIT' ? `Entro a las ${formatTime(empStatus.lastActionTime)} - ${formatRelative(empStatus.lastActionTime)}`
                  : 'Sin registros hoy'}
              </div>
            ) : null}
          </div>
          {hasPin && (
            <div className="space-y-1.5">
              <label className="text-gray-500 text-xs uppercase tracking-wide font-medium">PIN de confirmacion</label>
              <div className="relative">
                <input
                  type={pinVisible ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  className="w-full bg-gray-800 border border-gray-700 text-white text-center text-3xl tracking-widest placeholder-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                  autoFocus
                />
                <button type="button" onClick={() => setPinVisible(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">
                  {pinVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
          <div className="space-y-2.5">
            {!inColacion && (
              <button
                onClick={() => handleAction('checkin')}
                disabled={hasPin && pin.length === 0}
                className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                  nextAction === 'EXIT'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20'
                }`}
              >
                {nextAction === 'EXIT' ? <LogOut className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                {nextAction === 'EXIT' ? 'Registrar Salida' : 'Registrar Entrada'}
              </button>
            )}
            {hasEntry && !inColacion && (
              <button
                onClick={() => handleAction('colacion_start')}
                className="w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2.5 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/25 hover:border-purple-500/50 text-purple-300 transition-all active:scale-[0.98]"
              >
                <Coffee className="w-4 h-4" />
                Iniciar Colacion
              </button>
            )}
            {inColacion && (
              <>
                <button
                  onClick={() => handleAction('colacion_end')}
                  className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2.5 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98]"
                >
                  <Coffee className="w-5 h-5" />
                  Terminar Colacion
                </button>
                <button
                  onClick={() => handleAction('checkin')}
                  disabled={hasPin && pin.length === 0}
                  className="w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2.5 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/25 text-blue-300 transition-all active:scale-[0.98] disabled:opacity-40"
                >
                  <LogOut className="w-4 h-4" />
                  Registrar Salida directa
                </button>
              </>
            )}
          </div>
          <button onClick={reset} className="w-full text-center text-gray-700 hover:text-gray-500 text-sm py-2 flex items-center justify-center gap-1.5 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Elegir otro empleado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3.5 sticky top-0 z-10">
        <div className="max-w-md mx-auto space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center shadow-md shadow-orange-500/25">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-tight">Registro de Asistencia</h1>
              <p className="text-gray-600 text-xs">Selecciona tu nombre</p>
            </div>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar tu nombre..."
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-8">
        <div className="max-w-md mx-auto px-4 pt-3 space-y-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[68px] bg-gray-800/50 rounded-2xl animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <p className="text-gray-700 text-center py-16 text-sm">No se encontraron empleados.</p>
          ) : (
            filtered.map(emp => {
              const aColor = avatarColor(emp.name);
              return (
                <button
                  key={emp.id}
                  onClick={() => handlePreview(emp)}
                  className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800/80 hover:border-orange-500/40 rounded-2xl px-4 py-3.5 flex items-center gap-3.5 text-left transition-all active:scale-[0.98]"
                >
                  <div className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 font-bold text-sm ${aColor}`}>
                    {getInitials(emp.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-sm truncate">{emp.name}</p>
                    {emp.roleName && <p className="text-gray-600 text-xs truncate">{emp.roleName}</p>}
                  </div>
                  {emp.hasPin && <span className="text-gray-700 text-[11px] shrink-0">PIN</span>}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Banner instalación PWA (Mejora 4) */}
      {installPrompt && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 p-3 flex items-center gap-3 z-50 shadow-xl">
          <span className="text-2xl leading-none">📱</span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-tight">Instala la app</p>
            <p className="text-gray-500 text-xs">Acceso más rápido desde tu celular</p>
          </div>
          <button
            onClick={() => { installPrompt.prompt(); setInstallPrompt(null); }}
            className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
          >
            Instalar
          </button>
          <button
            onClick={() => setInstallPrompt(null)}
            className="text-gray-600 hover:text-gray-400 text-xs px-2 shrink-0 transition-colors"
          >
            Ahora no
          </button>
        </div>
      )}
    </div>
  );
}
