import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Constantes ───────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4200/api';
const TOTAL_STEPS = 4;

function authHeaders() {
  const token = localStorage.getItem('bullweb_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiGet(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

async function apiPut(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

async function apiPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

// ─── Subcomponentes de paso ───────────────────────────────────────────────────

function StepBienvenida({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="text-6xl">🎉</div>
      <h2 className="text-3xl font-bold text-gray-900">
        ¡Bienvenido a BullWeb Chile!
      </h2>
      <p className="text-lg text-gray-600 max-w-md mx-auto">
        Vamos a configurar tu restaurante en menos de 2 minutos.
      </p>
      <button
        onClick={onNext}
        className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-lg transition-colors shadow-md"
      >
        ¡Empecemos! →
      </button>
    </div>
  );
}

function StepNombreRestaurante({
  onNext,
  saving,
}: {
  onNext: (data: { name: string; address: string; phone: string }) => void;
  saving: boolean;
}) {
  const [name, setName]       = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone]     = useState('');

  return (
    <div className="space-y-6 w-full max-w-md mx-auto">
      <div className="text-center space-y-2">
        <div className="text-4xl">🍽️</div>
        <h2 className="text-2xl font-bold text-gray-900">
          ¿Cómo se llama tu restaurante?
        </h2>
        <p className="text-gray-500 text-sm">Puedes cambiarlo después desde Configuración</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del restaurante <span className="text-orange-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: La Buena Cocina"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dirección <span className="text-gray-400">(opcional)</span>
          </label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Ej: Av. Principal 123, Santiago"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono <span className="text-gray-400">(opcional)</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+56 9 1234 5678"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
          />
        </div>
      </div>
      <button
        onClick={() => onNext({ name, address, phone })}
        disabled={!name.trim() || saving}
        className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold rounded-xl text-lg transition-colors"
      >
        {saving ? 'Guardando…' : 'Continuar →'}
      </button>
    </div>
  );
}

function StepMesas({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6 max-w-md mx-auto">
      <div className="text-4xl">✅</div>
      <h2 className="text-2xl font-bold text-gray-900">Tus mesas están listas</h2>
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-left space-y-3">
        <p className="text-gray-700 font-medium">Ya tienes configuradas:</p>
        <div className="flex items-center gap-3 text-gray-700">
          <span className="text-2xl">🪑</span>
          <span><strong>15 mesas</strong> en Salón</span>
        </div>
        <div className="flex items-center gap-3 text-gray-700">
          <span className="text-2xl">🌿</span>
          <span><strong>15 mesas</strong> en Terraza</span>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          Puedes agregar, quitar o reorganizar mesas desde
          <strong> Configuración → Mesas</strong> cuando quieras.
        </p>
      </div>
      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-lg transition-colors"
      >
        ¡Perfecto! →
      </button>
    </div>
  );
}

const CATEGORIES = ['Bebidas', 'Comida', 'Postres', 'Otro'];

function StepPrimerProducto({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [prodName,   setProdName]   = useState('');
  const [price,      setPrice]      = useState('');
  const [category,   setCategory]   = useState('Bebidas');
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState('');
  const submittingRef = useRef(false);

  const handleSave = async () => {
    if (!prodName.trim() || !price) return;
    if (submittingRef.current) return;   // guard anti-doble click
    submittingRef.current = true;
    setSaving(true);
    setError('');
    try {
      // 1. Obtener o crear categoría (maneja 409 si ya existe de intento previo)
      const catsRes = await apiGet('/menu/categories');
      const cats: any[] = Array.isArray(catsRes) ? catsRes : (catsRes?.data ?? []);
      let cat = cats.find((c: any) => c.name?.toLowerCase() === category.toLowerCase());

      if (!cat) {
        try {
          const created = await apiPost('/menu/categories', {
            name:        category,
            description: '',
            order:       0,
            isActive:    true,
          });
          cat = created?.data ?? created;
        } catch (catErr: any) {
          // 409 = ya existe (intento previo o doble click) → re-obtener
          if (catErr.message?.includes('409')) {
            const retryRes = await apiGet('/menu/categories');
            const retryCats: any[] = Array.isArray(retryRes) ? retryRes : (retryRes?.data ?? []);
            cat = retryCats.find((c: any) => c.name?.toLowerCase() === category.toLowerCase());
          }
          if (!cat) throw catErr;
        }
      }

      // 2. Crear producto
      await apiPost('/menu/products', {
        name:       prodName.trim(),
        price:      parseFloat(price),
        categoryId: cat.id,
        isActive:   true,
      });

      setSaved(true);
      setTimeout(() => onNext(), 1200);
    } catch (e: any) {
      setError(e.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
      submittingRef.current = false;
    }
  };

  return (
    <div className="space-y-6 w-full max-w-md mx-auto">
      <div className="text-center space-y-2">
        <div className="text-4xl">📦</div>
        <h2 className="text-2xl font-bold text-gray-900">Agrega tu primer producto</h2>
        <p className="text-gray-500 text-sm">
          Para empezar a vender necesitas al menos un producto en tu menú.
        </p>
      </div>

      {saved ? (
        <div className="text-center py-4">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-green-600 font-semibold">¡Producto guardado!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del producto <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              value={prodName}
              onChange={e => setProdName(e.target.value)}
              placeholder="Ej: Café Americano"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Precio (CLP) <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
              <input
                type="number"
                min={0}
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="2500"
                className="w-full pl-7 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none bg-white"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            onClick={handleSave}
            disabled={!prodName.trim() || !price || saving}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
          >
            {saving ? 'Guardando…' : 'Agregar producto →'}
          </button>
          <button
            onClick={onSkip}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
          >
            Saltar por ahora
          </button>
        </div>
      )}
    </div>
  );
}

function StepListo({ onFinish, finishing }: { onFinish: () => void; finishing: boolean }) {
  return (
    <div className="text-center space-y-6 max-w-md mx-auto">
      <div className="text-6xl">🚀</div>
      <h2 className="text-2xl font-bold text-gray-900">¡Tu restaurante está listo!</h2>
      <p className="text-gray-600">Ya puedes empezar a tomar pedidos con BullWeb Chile.</p>
      <div className="bg-gray-50 rounded-xl p-5 text-left space-y-2 border border-gray-200">
        {[
          'Mesas configuradas',
          'Sistema POS activo',
          'Listo para vender',
        ].map(item => (
          <div key={item} className="flex items-center gap-2 text-gray-700">
            <span className="text-green-500 font-bold">✅</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
      <button
        onClick={onFinish}
        disabled={finishing}
        className="inline-flex items-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-semibold rounded-xl text-lg transition-colors shadow-md"
      >
        {finishing ? 'Abriendo…' : '¡Ir al sistema! →'}
      </button>
    </div>
  );
}

// ─── Barra de progreso ────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="w-full max-w-sm mx-auto mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-500">Paso {step + 1} de {TOTAL_STEPS + 1}</span>
        <span className="text-sm text-gray-500">{Math.round(((step) / TOTAL_STEPS) * 100)}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all duration-500"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        {Array.from({ length: TOTAL_STEPS + 1 }, (_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-colors ${
              i <= step ? 'bg-orange-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OnboardingWizard() {
  const navigate                    = useNavigate();
  const [visible, setVisible]       = useState(false);
  const [step, setStep]             = useState(0);
  const [saving, setSaving]         = useState(false);
  const [finishing, setFinishing]   = useState(false);
  const [checked, setChecked]       = useState(false);

  // Consultar status al montar (solo si hay token)
  useEffect(() => {
    const token = localStorage.getItem('bullweb_token');
    if (!token) { setChecked(true); return; }

    apiGet('/onboarding/status')
      .then(data => {
        if (!data.completed) {
          setStep(data.currentStep ?? 0);
          setVisible(true);
        }
      })
      .catch(() => { /* silencioso — no bloquear UI */ })
      .finally(() => setChecked(true));
  }, []);

  // Avanzar paso con persistencia
  const goToStep = async (next: number) => {
    try {
      await apiPut('/onboarding/step', { step: next });
    } catch { /* silencioso */ }
    setStep(next);
  };

  // Paso 2: guardar perfil del restaurante
  const handleProfileSave = async (data: { name: string; address: string; phone: string }) => {
    setSaving(true);
    try {
      await apiPut('/onboarding/profile', data);
    } catch { /* silencioso */ }
    setSaving(false);
    await goToStep(2);
  };

  // Cerrar wizard y marcar como completo
  const handleFinish = async () => {
    setFinishing(true);
    try {
      await apiPut('/onboarding/complete', {});
    } catch { /* silencioso */ }
    setVisible(false);
    navigate('/restaurant', { replace: true });
  };

  if (!checked || !visible) return null;

  return (
    // Overlay: cubre toda la pantalla, no se puede cerrar con ESC o clic fuera
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onKeyDown={e => e.stopPropagation()}
    >
      {/* Tarjeta del wizard */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Logo / marca */}
        <div className="text-center mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-500 bg-orange-50 px-3 py-1 rounded-full">
            BullWeb Chile
          </span>
        </div>

        {/* Barra de progreso */}
        {step > 0 && <ProgressBar step={step} />}

        {/* Contenido del paso */}
        {step === 0 && (
          <StepBienvenida onNext={() => goToStep(1)} />
        )}
        {step === 1 && (
          <StepNombreRestaurante onNext={handleProfileSave} saving={saving} />
        )}
        {step === 2 && (
          <StepMesas onNext={() => goToStep(3)} />
        )}
        {step === 3 && (
          <StepPrimerProducto
            onNext={() => goToStep(4)}
            onSkip={() => goToStep(4)}
          />
        )}
        {step === 4 && (
          <StepListo onFinish={handleFinish} finishing={finishing} />
        )}
      </div>
    </div>
  );
}
