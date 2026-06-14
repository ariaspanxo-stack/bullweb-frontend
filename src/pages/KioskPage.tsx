import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { XCircle, Search, RefreshCw } from 'lucide-react';

// --- API ----------------------------------------------------------------------
const API_BASE = import.meta.env.VITE_API_URL ?? '/api';
const kioskApi = axios.create({ baseURL: API_BASE });

interface KioskEmployee {
  id:                string;
  name:              string;
  cargo:             string | null;
  avatarColor:       string | null;
  roleName:          string | null;
  shift:             string | null;
  hasAttendancePin:  boolean;
}

interface KioskTenant {
  id:   string;
  name: string;
}

// --- Tipos de marcaje ---------------------------------------------------------
const ATTENDANCE_TYPES = [
  {
    value:   'ENTRADA',
    label:   'Entrada',
    sublabel:'Inicio de turno',
    bg:      'bg-green-600 hover:bg-green-700 active:bg-green-800',
    overlay: 'bg-green-950/95 border-green-500/40',
    text:    'text-green-200',
    color:   'bg-green-400',
  },
  {
    value:   'SALIDA_COLACION',
    label:   'Salida a Colacion',
    sublabel:'Pausa de almuerzo',
    bg:      'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700',
    overlay: 'bg-yellow-950/95 border-yellow-500/40',
    text:    'text-yellow-200',
    color:   'bg-yellow-400',
  },
  {
    value:   'ENTRADA_COLACION',
    label:   'Entrada de Colacion',
    sublabel:'Regreso de almuerzo',
    bg:      'bg-orange-500 hover:bg-orange-600 active:bg-orange-700',
    overlay: 'bg-orange-950/95 border-orange-500/40',
    text:    'text-orange-200',
    color:   'bg-orange-400',
  },
  {
    value:   'SALIDA',
    label:   'Salida',
    sublabel:'Fin de turno',
    bg:      'bg-red-600 hover:bg-red-700 active:bg-red-800',
    overlay: 'bg-red-950/95 border-red-500/40',
    text:    'text-red-200',
    color:   'bg-red-500',
  },
] as const;

// --- Helpers -----------------------------------------------------------------
const AVATAR_COLORS = [
  'from-orange-500 to-orange-700',
  'from-blue-500 to-blue-700',
  'from-green-500 to-green-700',
  'from-purple-500 to-purple-700',
  'from-pink-500 to-pink-700',
  'from-yellow-500 to-yellow-700',
  'from-teal-500 to-teal-700',
  'from-red-500 to-red-700',
];
function avatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function playSound(type: 'entry' | 'exit' | 'error') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const tone = (freq: number, start: number, dur: number, wave: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      osc.connect(gain); osc.type = wave;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    if (type === 'entry') {
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      tone(440, 0, 0.12); tone(660, 0.14, 0.2);
    } else if (type === 'exit') {
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      tone(660, 0, 0.12); tone(440, 0.14, 0.2);
    } else {
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      tone(200, 0, 0.35, 'sawtooth');
    }
    setTimeout(() => ctx.close(), 1200);
  } catch { /* silencioso */ }
}

// --- Component ---------------------------------------------------------------
export default function KioskPage() {
const { slug } = useParams<{ slug: string }>();
  const tenantId = slug;

  const [tenant,    setTenant]    = useState<KioskTenant | null>(null);
  const [employees, setEmployees] = useState<KioskEmployee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState('');
  const [clockTime, setClockTime] = useState('');
  const [dateStr,   setDateStr]   = useState('');

  // Flujo: list > pin > type > (confirming) > success | fail
  type KioskStep = 'list' | 'pin' | 'type' | 'confirming' | 'success' | 'fail';
  const [step,       setStep]      = useState<KioskStep>('list');
  const [selected,   setSelected]  = useState<KioskEmployee | null>(null);
  const [pin,        setPin]       = useState('');
  const [pinError,   setPinError]  = useState('');
  const [resultType, setResultType]= useState('');
  const [resultName, setResultName]= useState('');
  const [resultMsg,  setResultMsg] = useState('');
  const [resultTime, setResultTime]= useState('');

  // --- Reloj -----------------------------------------------------------------
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClockTime(now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // --- Fetch empleados -------------------------------------------------------
  const fetchEmployees = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true); setError(null);
    try {
      const res = await kioskApi.get<{
        success: boolean;
        data: { tenant: KioskTenant; employees: KioskEmployee[] };
      }>(`/kiosk/${tenantId}/employees`);
      setTenant(res.data.data.tenant);
      setEmployees(res.data.data.employees);
    } catch (e: any) {
      setError(e?.response?.status === 404 ? 'Restaurante no encontrado' : 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // --- Helpers ---------------------------------------------------------------
  const resetFlow = () => {
    setStep('list'); setSelected(null); setPin('');
    setPinError(''); setResultType(''); setResultName(''); setResultMsg(''); setResultTime('');
  };

  const getTypeConfig = (value: string) =>
    ATTENDANCE_TYPES.find(t => t.value === value) ?? ATTENDANCE_TYPES[0];

  // --- Seleccionar empleado --------------------------------------------------
  const handleSelectEmployee = (emp: KioskEmployee) => {
    if (!emp.hasAttendancePin) {
      setResultMsg('Sin PIN configurado\nContacta al administrador');
      setResultType('fail');
      setStep('fail');
      setTimeout(resetFlow, 3000);
      return;
    }
    setSelected(emp); setPin(''); setPinError(''); setStep('pin');
  };

  // --- Teclado numrico ------------------------------------------------------
  const handlePinKey = (key: number | 'Borrar' | 'OK') => {
    if (key === 'Borrar') { setPin(p => p.slice(0, -1)); setPinError(''); return; }
    if (key === 'OK') { if (pin.length === 4) verifyPinValue(pin); return; }
    if (pin.length < 4) {
      const next = pin + String(key);
      setPin(next);
      if (next.length === 4) verifyPinValue(next);
    }
  };

  const verifyPinValue = async (pinValue: string) => {
    if (!selected || !tenantId) return;
    setPinError('');
    try {
      await kioskApi.post(`/kiosk/${tenantId}/verify-pin`, {
        employeeId: selected.id, pin: pinValue,
      });
      setStep('type');
    } catch (e: any) {
      const code = e?.response?.data?.error;
      setPinError(
        code === 'PIN_NOT_SET'   ? 'PIN no configurado. Contacta al admin.' :
        code === 'PIN_INCORRECT' ? 'PIN incorrecto. Intentalo de nuevo.'    :
        'Error al verificar PIN.'
      );
      setPin('');
    }
  };

  // --- Seleccionar tipo de marcaje -------------------------------------------
  const handleSelectType = async (typeValue: string) => {
    if (!selected || !tenantId) return;
    setStep('confirming');
    try {
      const res = await kioskApi.post<{
        success: boolean;
        data: { type: string; employeeName: string; timestamp: string; message: string };
      }>(`/kiosk/${tenantId}/checkin`, {
        employeeId: selected.id, attendancePin: pin, type: typeValue,
      });
      const { employeeName, timestamp, message } = res.data.data;
      const time = new Date(timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      setResultType(typeValue); setResultName(employeeName); setResultMsg(message); setResultTime(time);
      playSound(['ENTRADA', 'ENTRADA_COLACION'].includes(typeValue) ? 'entry' : 'exit');
      setStep('success');
      setTimeout(resetFlow, 3500);
    } catch (e: any) {
      setResultMsg(e?.response?.data?.error ?? 'Error al registrar asistencia');
      playSound('error');
      setStep('fail');
      setTimeout(resetFlow, 3000);
    }
  };

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  // --- Loading ---------------------------------------------------------------
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Cargando kiosco...</p>
      </div>
    </div>
  );

  // --- Error -----------------------------------------------------------------
  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center p-8">
      <div>
        <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
        <h1 className="text-white text-2xl font-bold mb-2">{error}</h1>
        <button onClick={fetchEmployees}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    </div>
  );

  // --- Overlay xito --------------------------------------------------------
  if (step === 'success') {
    const cfg = getTypeConfig(resultType);
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className={`rounded-3xl p-10 flex flex-col items-center text-center max-w-sm w-full border ${cfg.overlay}`}>
          <div className={`w-14 h-14 rounded-full ${cfg.color} mb-5`} />
          <p className={`text-3xl font-black mb-2 ${cfg.text}`}>{resultName}</p>
          <p className={`text-xl font-semibold mb-1 ${cfg.text}`}>{cfg.label}</p>
          <p className={`text-sm mb-4 opacity-80 ${cfg.text}`}>{resultMsg}</p>
          <p className={`text-5xl font-mono font-bold ${cfg.text}`}>{resultTime}</p>
        </div>
      </div>
    );
  }

  // --- Overlay fallo --------------------------------------------------------
  if (step === 'fail') return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="rounded-3xl p-10 flex flex-col items-center text-center max-w-sm w-full border bg-red-950/95 border-red-500/40">
        <XCircle className="w-20 h-20 text-red-400 mb-5" />
        <p className="text-2xl font-bold text-red-200 whitespace-pre-line">{resultMsg || 'Error al registrar asistencia'}</p>
      </div>
    </div>
  );

  // --- Modal confirming -----------------------------------------------------
  if (step === 'confirming') return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-300 text-lg">Registrando...</p>
      </div>
    </div>
  );

  // --- Modal PIN ------------------------------------------------------------
  if (step === 'pin' && selected) {
    const PAD_KEYS: (number | 'Borrar' | 'OK')[] = [1,2,3,4,5,6,7,8,9,'Borrar',0,'OK'];
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-3xl border border-gray-700/50 shadow-2xl p-8 w-full max-w-xs text-center">
          {/* Avatar */}
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${avatarGradient(selected.name)} flex items-center justify-center mx-auto mb-3 shadow-lg`}>
            <span className="text-white font-bold text-2xl">{getInitials(selected.name)}</span>
          </div>
          <h2 className="text-white font-bold text-xl mb-0.5">{selected.name}</h2>
          {selected.roleName && <p className="text-gray-400 text-sm mb-5">{selected.roleName}</p>}

          <p className="text-gray-300 text-sm mb-4">Ingresa tu PIN de 4 digitos</p>

          {/* Dots */}
          <div className="flex justify-center gap-3 mb-3">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-4 h-4 rounded-full transition-all duration-150 ${
                pin.length > i ? 'bg-indigo-400 scale-110' : 'bg-gray-700'
              }`} />
            ))}
          </div>

          {pinError && <p className="text-red-400 text-xs mb-3">{pinError}</p>}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {PAD_KEYS.map(k => (
              <button
                key={String(k)}
                onClick={() => handlePinKey(k as any)}
                disabled={k === 'OK' && pin.length < 4}
                className={`h-14 rounded-xl font-bold text-xl transition-all duration-100 active:scale-95 ${
                  k === 'OK'
                    ? pin.length === 4
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : k === 'Borrar'
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 text-base'
                    : 'bg-gray-800 hover:bg-gray-700 text-white'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <button onClick={resetFlow}
            className="mt-5 text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // --- Selector de tipo de marcaje ------------------------------------------
  if (step === 'type' && selected) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header empleado */}
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarGradient(selected.name)} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white font-bold text-sm">{getInitials(selected.name)}</span>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">{selected.name}</p>
            <p className="text-gray-400 text-sm">Tipo de marcaje</p>
          </div>
        </div>

        {/* Botones tipos */}
        <div className="grid grid-cols-2 gap-3">
          {ATTENDANCE_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => handleSelectType(t.value)}
              className={`${t.bg} rounded-2xl p-5 flex flex-col items-start gap-2 text-left transition-all duration-150 active:scale-95 shadow-lg`}
            >
              <div className={`w-8 h-8 rounded-full ${t.color}`} />
              <div>
                <p className="text-white font-bold text-base leading-tight">{t.label}</p>
                <p className="text-white/70 text-xs mt-0.5">{t.sublabel}</p>
              </div>
            </button>
          ))}
        </div>

        <button onClick={resetFlow}
          className="mt-5 w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 text-sm transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  );

  // --- Lista de empleados ----------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col select-none">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <h1 className="text-white font-bold text-xl">{tenant?.name}</h1>
            <p className="text-gray-400 text-sm mt-0.5 capitalize">{dateStr}</p>
          </div>
          <div className="text-right">
            <p className="text-white font-mono text-3xl font-bold">{clockTime}</p>
            <p className="text-gray-500 text-xs mt-0.5">Kiosco de asistencia</p>
          </div>
        </div>
      </header>

      {/* Cuerpo */}
      <main className="flex-1 px-4 py-6 max-w-5xl mx-auto w-full">
        {/* Instruccin + buscador */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <p className="text-gray-300 font-medium text-lg">
            Toca tu nombre para registrar asistencia
          </p>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar empleado..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Grid de empleados */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            {search ? 'Sin resultados para esa busqueda' : 'No hay empleados registrados'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(emp => (
              <button
                key={emp.id}
                onClick={() => handleSelectEmployee(emp)}
                className={`group border rounded-2xl p-5 flex flex-col items-center text-center gap-3
                           transition-all duration-150 active:scale-95
                           ${emp.hasAttendancePin
                             ? 'bg-gray-900 hover:bg-gray-800 border-gray-800 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10'
                             : 'bg-gray-900/50 border-gray-800/50 opacity-60 cursor-default'
                           }`}
              >
                {/* Avatar */}
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${avatarGradient(emp.name)}
                                 flex items-center justify-center shadow-md flex-shrink-0`}>
                  <span className="text-white font-bold text-xl">{getInitials(emp.name)}</span>
                </div>

                {/* Info */}
                <div className="min-w-0 w-full">
                  <p className="text-white font-semibold text-sm leading-tight truncate">{emp.name}</p>
                  {(emp.roleName || emp.cargo) && (
                    <p className="text-gray-500 text-xs mt-0.5 truncate">{emp.roleName ?? emp.cargo}</p>
                  )}
                  {emp.shift && (
                    <p className="text-indigo-400/70 text-xs mt-1 truncate">{emp.shift}</p>
                  )}
                  {!emp.hasAttendancePin && (
                    <p className="text-yellow-600 text-xs mt-1">Sin PIN</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-3 text-center">
        <p className="text-gray-700 text-xs">BullWeb - Kiosco de Asistencia</p>
      </footer>
    </div>
  );
}
