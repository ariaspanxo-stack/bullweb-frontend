// LOTE 333: campo de direccion con autocompletado de Google Places (New), sesgado al local.
// Sin clave de navegador (config.key null) es un campo normal, sin sugerencias: el envio se cotiza igual al salir del campo.
// La clave es de navegador (restringida por dominio en Google); nunca es la clave de servidor.
import { useEffect, useRef, useState } from 'react';

export interface AddressPlacesConfig { key: string | null; lat: number | null; lng: number | null; comuna: string | null }

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** Se llama al elegir una sugerencia o al salir del campo: cotizacion inmediata. */
  onCommit: (v: string) => void;
  config: AddressPlacesConfig | null;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  rows?: number;
  dark?: boolean;
  testId?: string;
}

const PLACES_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const nuevoToken = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export function AddressAutocomplete({ value, onChange, onCommit, config, placeholder, className, style, multiline, rows = 3, dark, testId }: Props) {
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [abierto, setAbierto] = useState(false);
  const token = useRef(nuevoToken());
  const eligiendo = useRef(false);
  const key = config?.key ?? null;

  useEffect(() => {
    if (!key || value.trim().length < 4) { setSugerencias([]); return; }
    let vivo = true;
    const t = setTimeout(async () => {
      try {
        const body: Record<string, unknown> = { input: value.trim(), includedRegionCodes: ['cl'], languageCode: 'es', sessionToken: token.current };
        if (config?.lat != null && config?.lng != null) body.locationBias = { circle: { center: { latitude: config.lat, longitude: config.lng }, radius: 15000 } };
        const res = await fetch(PLACES_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key }, body: JSON.stringify(body) });
        if (!res.ok) { if (vivo) setSugerencias([]); return; }
        const j = await res.json();
        const lista: string[] = (Array.isArray(j?.suggestions) ? j.suggestions : [])
          .map((s: any) => String(s?.placePrediction?.text?.text ?? '').trim()).filter(Boolean).slice(0, 5);
        if (vivo) { setSugerencias(lista); setAbierto(lista.length > 0); }
      } catch {
        if (vivo) setSugerencias([]);
      }
    }, 300);
    return () => { vivo = false; clearTimeout(t); };
  }, [key, value, config?.lat, config?.lng]);

  const elegir = (s: string) => {
    eligiendo.current = false;
    const limpio = s.replace(/,\s*Chile$/i, '');
    onChange(limpio);
    setAbierto(false);
    setSugerencias([]);
    token.current = nuevoToken();
    onCommit(limpio);
  };

  const comunes = {
    value,
    placeholder,
    className,
    style,
    autoComplete: 'off',
    'data-testid': testId,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onFocus: () => { if (sugerencias.length) setAbierto(true); },
    onBlur: () => { setTimeout(() => { if (!eligiendo.current) { setAbierto(false); onCommit(value); } }, 150); },
  };

  return (
    <div className="relative">
      {multiline ? <textarea {...comunes} rows={rows} /> : <input type="text" {...comunes} />}
      {abierto && sugerencias.length > 0 && (
        <ul
          className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border shadow-lg overflow-hidden ${dark ? 'bg-gray-900 border-white/10' : 'bg-white border-slate-200'}`}
          data-testid={testId ? `${testId}-sugerencias` : undefined}
        >
          {sugerencias.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => { eligiendo.current = true; }}
                onClick={() => elegir(s)}
                className={`w-full min-h-[44px] px-3 py-2 text-left text-sm ${dark ? 'text-gray-100 hover:bg-white/10' : 'text-gray-900 hover:bg-orange-50'}`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
