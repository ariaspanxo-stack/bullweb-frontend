// ═══════════════════════════════════════════════════════════════
// WAITER LOGIN PAGE — selección de mesero + teclado PIN
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect }              from 'react';
import { useNavigate }                   from 'react-router-dom';
import { useQuery, useMutation }         from '@tanstack/react-query';
import { ChevronLeft }                   from 'lucide-react';

interface WaiterProfile {
  id:          string;
  name:        string;
  avatarColor: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

/** Devuelve el tenant activo: primero ?tenant= de la URL, luego localStorage */
export function getWaiterTenant(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get('tenant');
  if (fromUrl) return fromUrl;
  return localStorage.getItem('waiterTenant');
}

export function WaiterLoginPage() {
  const navigate = useNavigate();
  const [step,     setStep]     = useState<'select' | 'pin'>('select');
  const [selected, setSelected] = useState<WaiterProfile | null>(null);
  const [pin,      setPin]      = useState('');
  const [error,    setError]    = useState('');

  // Leer ?tenant= de la URL y guardarlo para la sesión del mesero
  useEffect(() => {
    const tenantSlug = new URLSearchParams(window.location.search).get('tenant');
    if (tenantSlug) {
      localStorage.setItem('waiterTenant', tenantSlug);
    }
  }, []);

  // Inyectar manifest específico de la app mesero para PWA correcta
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link) return;
    const prev = link.href;
    link.href = '/manifest-mesero.json';
    return () => { link.href = prev; };
  }, []);

  function buildWaiterHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const tenant = getWaiterTenant();
    if (tenant) headers['x-tenant-slug'] = tenant;
    return headers;
  }

  // Cargar lista de meseros del tenant
  const { data: waiters = [], isLoading } = useQuery<WaiterProfile[]>({
    queryKey: ['waiter-staff'],
    queryFn:  async () => {
      const res = await fetch(`${API_BASE}/waiter/staff`, {
        headers: buildWaiterHeaders(),
      });
      const json = await res.json();
      return json.data ?? json;
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { userId: string; pin: string }) => {
      const res = await fetch(`${API_BASE}/waiter/login`, {
        method:  'POST',
        headers: buildWaiterHeaders(),
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Error de autenticación');
      return json.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('waiterToken', data.token);
      localStorage.setItem('waiterInfo',  JSON.stringify(data.waiter));
      navigate('/mesero');
    },
    onError: (err: Error) => {
      setError(err.message);
      setPin('');
    },
  });

  const handleKey = (key: number | '⌫') => {
    if (key === '⌫') {
      setPin(p => p.slice(0, -1));
      setError('');
      return;
    }
    if (pin.length >= 4 || loginMutation.isPending) return;

    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === 4 && selected) {
      loginMutation.mutate({ userId: selected.id, pin: newPin });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">

      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="text-4xl font-bold text-white mb-1">BullWeb</div>
        <div className="text-orange-400 text-sm">Sistema de Pedidos</div>
      </div>

      {/* ── PASO 1 — Selección de mesero ───────────────────── */}
      {step === 'select' && (
        <>
          <h2 className="text-white text-xl mb-6 font-medium">¿Quién está atendiendo?</h2>

          {isLoading ? (
            <div className="text-gray-400 text-sm">Cargando...</div>
          ) : waiters.length === 0 ? (
            <div className="text-center text-gray-500 text-sm max-w-xs">
              <p className="mb-2">No hay meseros disponibles.</p>
              <p>El administrador debe asignar PINs desde el panel de empleados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
              {waiters.map((w) => (
                <button
                  key={w.id}
                  onClick={() => { setSelected(w); setStep('pin'); }}
                  className="flex flex-col items-center p-5 bg-gray-800 rounded-2xl
                             hover:bg-gray-700 active:scale-95 transition-all"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center
                               text-white text-2xl font-bold mb-3"
                    style={{ backgroundColor: w.avatarColor ?? '#FF6B35' }}
                  >
                    {w.name[0].toUpperCase()}
                  </div>
                  <span className="text-white text-sm font-medium text-center leading-tight">
                    {w.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── PASO 2 — Teclado PIN ───────────────────────── */}
      {step === 'pin' && selected && (
        <div className="w-full max-w-xs">

          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center
                         text-white text-3xl font-bold mb-3"
              style={{ backgroundColor: selected.avatarColor ?? '#FF6B35' }}
            >
              {selected.name[0].toUpperCase()}
            </div>
            <div className="text-white text-lg font-medium">{selected.name}</div>
            <div className="text-gray-400 text-sm mt-1">Ingresa tu PIN</div>
          </div>

          {/* Puntos del PIN */}
          <div className="flex justify-center gap-4 mb-6">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-150
                  ${pin.length > i ? 'bg-orange-500 scale-110' : 'bg-gray-600'}`}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-400 text-center text-sm mb-4">{error}</div>
          )}

          {/* Teclado numérico */}
          <div className="grid grid-cols-3 gap-3">
            {([1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, '⌫'] as const).map((key, i) => (
              <button
                key={i}
                disabled={key === null || loginMutation.isPending}
                onClick={() => key !== null && handleKey(key as number | '⌫')}
                className={`
                  h-16 rounded-2xl text-xl font-semibold
                  transition-all active:scale-90
                  ${key === null
                    ? 'invisible'
                    : key === '⌫'
                    ? 'bg-gray-800 text-orange-400'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                  }
                  ${loginMutation.isPending ? 'opacity-50' : ''}
                `}
              >
                {loginMutation.isPending && pin.length === 4 ? '…' : key}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setStep('select'); setPin(''); setError(''); }}
            className="w-full mt-5 flex items-center justify-center gap-1
                       text-gray-500 text-sm py-2 hover:text-gray-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Cambiar mesero
          </button>
        </div>
      )}
    </div>
  );
}
