// LOTE 322 (CLI-03): selector de cliente del POS. Parte en "Cliente de paso" (sin ficha) con un boton grande
// "Agregar cliente" al lado. Busca por telefono primero; la ficha nueva exige telefono o nombre y apellido
// (misma regla que el servidor). Una ficha generica se ve con la etiqueta "Genérico".
import { useEffect, useRef, useState } from 'react';
import { Search, User, UserPlus, X } from 'lucide-react';
import customersService from '../services/customersService';
import type { Customer } from '../types/customer.types';

export interface ClienteElegido {
  id?: string;
  name: string;
  phone?: string | null;
  isGeneric?: boolean;
}

interface Props {
  value: ClienteElegido | null;
  onChange: (v: ClienteElegido | null) => void;
  /** false en plan Basico (sin Clientes): solo nombre para el ticket, sin ficha */
  allowFichas?: boolean;
}

const digitos = (s: string) => s.replace(/[^0-9]/g, '');
const nombreYApellido = (s: string) => s.trim().split(/\s+/).filter((w) => w.replace(/[^\p{L}]/gu, '').length >= 2).length >= 2;
/** Misma regla que el servidor: telefono (8+ digitos) o nombre y apellido */
export const altaClienteError = (name: string, phone: string): string | null =>
  digitos(phone).length >= 8 || nombreYApellido(name) ? null : 'Ingresa el teléfono, o el nombre y apellido';

export function GenericoBadge() {
  return (
    <span data-testid="badge-generico" className="inline-flex items-center px-1.5 py-0.5 rounded-md border border-gray-300 bg-gray-100 text-[10px] font-bold text-gray-600 uppercase tracking-wide flex-shrink-0">
      Genérico
    </span>
  );
}

export default function ClienteDePaso({ value, onChange, allowFichas = true }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || !allowFichas) return;
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 3) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try { setResults((await customersService.search(q, 8)).slice(0, 8)); } catch { setResults([]); } finally { setSearching(false); }
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, open, allowFichas]);

  const reset = () => {
    setOpen(false); setQuery(''); setResults([]); setCreating(false);
    setNewPhone(''); setNewName(''); setNewEmail(''); setError('');
  };

  const elegir = (c: Customer) => {
    onChange({ id: c.id, name: c.name, phone: c.phone ?? null, isGeneric: c.isGeneric === true });
    reset();
  };

  const abrirAlta = () => {
    const q = query.trim();
    if (digitos(q).length >= 3 && digitos(q).length === q.replace(/[\s+()-]/g, '').length) setNewPhone(q); else if (q) setNewName(q);
    setCreating(true); setError('');
  };

  const guardar = async () => {
    if (!allowFichas) {
      if (!newName.trim()) { setError('Ingresa un nombre'); return; }
      onChange({ name: newName.trim() }); reset(); return;
    }
    const err = altaClienteError(newName, newPhone);
    if (err) { setError(err); return; }
    setSaving(true); setError('');
    try {
      const c = await customersService.create({
        name: newName.trim() || `Cliente ${digitos(newPhone).slice(-4)}`,
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
      } as any);
      elegir(c);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || 'No se pudo crear el cliente');
    } finally {
      setSaving(false);
    }
  };

  // ── Con cliente elegido ──
  if (value) {
    return (
      <div data-testid="cliente-elegido" className="flex items-center gap-2 px-3 min-h-[44px] bg-orange-50 border border-orange-200 rounded-xl">
        <User size={14} className="text-orange-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{value.name}</p>
          {value.phone && <p className="text-[11px] text-gray-500 truncate">{value.phone}</p>}
        </div>
        {value.isGeneric && <GenericoBadge />}
        <button
          type="button"
          aria-label="Quitar cliente"
          onClick={() => onChange(null)}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-gray-400 hover:text-red-500 flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // ── Cliente de paso (por defecto) ──
  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <div data-testid="cliente-de-paso" className="flex-1 min-w-0 flex items-center gap-2 px-3 min-h-[44px] bg-gray-50 border border-gray-200 rounded-xl">
          <User size={14} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 truncate">Cliente de paso</span>
        </div>
        <button
          type="button"
          data-testid="cliente-agregar"
          onClick={() => { setOpen(true); if (!allowFichas) setCreating(true); }}
          className="min-h-[44px] px-4 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl flex-shrink-0 transition-colors"
        >
          <UserPlus size={16} /> Agregar cliente
        </button>
      </div>
    );
  }

  // ── Buscar o crear ──
  return (
    <div className="space-y-2 p-3 bg-white border-2 border-orange-200 rounded-xl">
      {!creating && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              data-testid="cliente-buscar"
              type="text"
              inputMode="tel"
              placeholder="Teléfono del cliente (o nombre)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full min-h-[44px] pl-10 pr-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          {searching && <p className="text-xs text-gray-400">Buscando...</p>}
          {results.length > 0 && (
            <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
              {results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => elegir(c)}
                  className="w-full min-h-[44px] px-3 py-2 flex items-center gap-2 text-left hover:bg-orange-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">{c.phone}</p>
                  </div>
                  {c.isGeneric && <GenericoBadge />}
                </button>
              ))}
            </div>
          )}
          {query.trim().length >= 3 && !searching && results.length === 0 && (
            <p className="text-xs text-gray-500">No hay clientes con ese dato</p>
          )}
        </>
      )}

      {creating && (
        <div className="space-y-2">
          {allowFichas && (
            <input
              autoFocus
              data-testid="cliente-nuevo-telefono"
              type="tel"
              inputMode="tel"
              placeholder="Teléfono"
              value={newPhone}
              onChange={(e) => { setNewPhone(e.target.value); setError(''); }}
              className="w-full min-h-[44px] px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          )}
          <input
            autoFocus={!allowFichas}
            data-testid="cliente-nuevo-nombre"
            type="text"
            placeholder={allowFichas ? 'Nombre y apellido' : 'Nombre para el ticket'}
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setError(''); }}
            className="w-full min-h-[44px] px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />
          {allowFichas && (
            <input
              type="email"
              placeholder="Email (opcional)"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full min-h-[44px] px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          )}
          {allowFichas && <p className="text-[11px] text-gray-500">Teléfono, o nombre y apellido.</p>}
        </div>
      )}

      {error && <p data-testid="cliente-error" className="text-xs font-medium text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="min-h-[44px] px-4 border border-gray-300 bg-white text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50"
        >
          Cancelar
        </button>
        {creating ? (
          <button
            type="button"
            data-testid="cliente-guardar"
            disabled={saving}
            onClick={guardar}
            className="flex-1 min-h-[44px] px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-bold rounded-xl"
          >
            {saving ? 'Guardando...' : allowFichas ? 'Guardar cliente' : 'Usar nombre'}
          </button>
        ) : (
          <button
            type="button"
            data-testid="cliente-nuevo"
            onClick={abrirAlta}
            className="flex-1 min-h-[44px] px-4 inline-flex items-center justify-center gap-2 border-2 border-orange-500 text-orange-600 text-sm font-bold rounded-xl hover:bg-orange-50"
          >
            <UserPlus size={16} /> Cliente nuevo
          </button>
        )}
      </div>
    </div>
  );
}
