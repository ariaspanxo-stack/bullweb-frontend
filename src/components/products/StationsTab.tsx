import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, AlertCircle, ChefHat, Printer, Loader2,
  Pencil, Check, X, RotateCcw,
} from 'lucide-react';
import { stationsApi } from '../../services/api';
import { BTN_ICON, BTN_OUTLINE, BTN_PRIMARY, CARD, SUBTITLE, TITLE, TrashButton } from './productsUi';

const FIELD = 'w-full h-11 px-3 border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#F97316]';

interface PrinterRef {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

interface Station {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: boolean;
  printerId: string | null;
  printer: PrinterRef | null;
  _count?: { products: number };
}

const MAX_STATIONS = 5;

const PRESET_COLORS = [
  { label: 'Gris',     value: '#6B7280' },
  { label: 'Rojo',     value: '#EF4444' },
  { label: 'Naranja',  value: '#F97316' },
  { label: 'Amarillo', value: '#EAB308' },
  { label: 'Verde',    value: '#22C55E' },
  { label: 'Azul',     value: '#3B82F6' },
  { label: 'Morado',   value: '#8B5CF6' },
  { label: 'Rosa',     value: '#EC4899' },
];

// ─── Formulario reutilizable crear / editar ──────────────────────────────────
interface StationFormProps {
  initial?: Partial<Station>;
  saving: boolean;
  error: string;
  onSave: (data: { name: string; description: string; color: string }) => void;
  onCancel: () => void;
  title: string;
}

const StationForm: React.FC<StationFormProps> = ({ initial = {}, saving, error, onSave, onCancel, title }) => {
  const [name,  setName]  = useState(initial.name        ?? '');
  const [desc,  setDesc]  = useState(initial.description ?? '');
  const [color, setColor] = useState(initial.color       ?? '#6B7280');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-[#0F172A]">{title}</p>
      <div>
        <label className="block text-xs font-semibold text-[#475569] mb-1">Nombre *</label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej. Cocina Caliente, Barra, Postres…"
          maxLength={50}
          className={FIELD}
          onKeyDown={(e) => e.key === 'Enter' && onSave({ name, description: desc, color })}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#475569] mb-1">Descripción (opcional)</label>
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="ej. Preparación de platos calientes"
          maxLength={100}
          className={FIELD}
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#475569] mb-2">Color</label>
        <div className="flex flex-wrap gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              title={c.label}
              aria-label={`Color ${c.label}`}
              className="w-11 h-11 inline-flex items-center justify-center rounded-lg hover:bg-slate-50"
            >
              <span
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  color === c.value ? 'border-[#0F172A] scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c.value }}
              />
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p className="text-xs text-[#B91C1C] flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />{error}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave({ name, description: desc, color })}
          disabled={saving}
          className={BTN_PRIMARY}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={onCancel} disabled={saving} className={BTN_OUTLINE}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────
interface StationsTabProps {
  onStationsChange?: () => void;
}

export const StationsTab: React.FC<StationsTabProps> = ({ onStationsChange }) => {
  const [stations, setStations]         = useState<Station[]>([]);
  const [printers, setPrinters]         = useState<PrinterRef[]>([]);
  const [loading, setLoading]           = useState(true);
  const [globalError, setGlobalError]   = useState<string | null>(null);

  // Crear
  const [showCreate, setShowCreate]     = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError]   = useState('');

  // Editar inline
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState('');

  // Eliminar
  const [deleteTarget, setDeleteTarget] = useState<Station | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // Toggle activo
  const [togglingId, setTogglingId]     = useState<string | null>(null);

  // Vinculación impresora
  const [assigningPrinterId, setAssigningPrinterId] = useState<string | null>(null);

  const fetchStations = async () => {
    try {
      setLoading(true);
      setGlobalError(null);
      const [stData, prData] = await Promise.all([
        stationsApi.getAll(),
        stationsApi.getPrinters().catch(() => []),
      ]);
      setStations(Array.isArray(stData) ? stData : []);
      setPrinters(Array.isArray(prData) ? prData : []);
    } catch (e: any) {
      setGlobalError(e.message || 'Error al cargar estaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStations(); }, []);

  const handleCreate = async (form: { name: string; description: string; color: string }) => {
    const name = form.name.trim();
    if (!name) { setCreateError('El nombre es obligatorio'); return; }
    if (stations.length >= MAX_STATIONS) { setCreateError(`Máximo ${MAX_STATIONS} estaciones`); return; }
    try {
      setCreateSaving(true);
      setCreateError('');
      await stationsApi.create({ name, description: form.description || undefined, color: form.color });
      setShowCreate(false);
      await fetchStations();
      onStationsChange?.();
    } catch (e: any) {
      setCreateError(e.message || 'Error al crear la estación');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleEdit = async (id: string, form: { name: string; description: string; color: string }) => {
    const name = form.name.trim();
    if (!name) { setEditError('El nombre es obligatorio'); return; }
    try {
      setEditSaving(true);
      setEditError('');
      await stationsApi.update(id, { name, description: form.description || undefined, color: form.color });
      setEditingId(null);
      await fetchStations();
      onStationsChange?.();
    } catch (e: any) {
      setEditError(e.message || 'Error al actualizar la estación');
    } finally {
      setEditSaving(false);
    }
  };

  const handleToggleActive = async (station: Station) => {
    try {
      setTogglingId(station.id);
      await stationsApi.update(station.id, { active: !station.active });
      await fetchStations();
      onStationsChange?.();
    } catch (e: any) {
      setGlobalError(e.message || 'Error al cambiar el estado');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await stationsApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      await fetchStations();
      onStationsChange?.();
    } catch (e: any) {
      setGlobalError(e.message || 'Error al eliminar la estación');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleAssignPrinter = async (stationId: string, printerId: string | null) => {
    try {
      setAssigningPrinterId(stationId);
      await stationsApi.update(stationId, { printerId });
      await fetchStations();
      onStationsChange?.();
    } catch (e: any) {
      setGlobalError(e.message || 'Error al vincular impresora');
    } finally {
      setAssigningPrinterId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
        <span className="ml-3 text-[#64748B]">Cargando estaciones…</span>
      </div>
    );
  }

  return (
    // Hotfix #258: ancho completo, igual que las demás pestañas
    <div className="p-6">

      {/* Encabezado — A4/A5 */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h2 className={TITLE}>Estaciones</h2>
          <p className={SUBTITLE}>Estaciones de cocina y la impresora donde sale cada comanda</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchStations} title="Recargar" aria-label="Recargar estaciones" className={BTN_ICON}>
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setShowCreate(true); setCreateError(''); }}
            disabled={stations.length >= MAX_STATIONS || showCreate}
            className={`${BTN_PRIMARY} disabled:cursor-not-allowed`}
          >
            <Plus className="w-4 h-4" />
            Agregar estación
          </button>
        </div>
      </div>

      {/* Info impresoras */}
      <div className="flex items-start gap-2 mb-5 p-3 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-sm text-[#475569]">
        <Printer className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#64748B]" />
        <span>
          Vincula una <strong>impresora de cocina</strong> a cada estación. Las comandas se enviarán automáticamente a la impresora asignada.
          {printers.length === 0 && (
            <span className="block mt-1 text-[#B45309] font-medium">
              ⚠ No hay impresoras activas configuradas. Ve a <strong>Admin → Impresoras</strong> para agregar una.
            </span>
          )}
        </span>
      </div>

      {/* Banner onboarding — estaciones por defecto sin impresora */}
      {stations.length === 3 && stations.every(s => !s.printer) && (
        <div className="flex items-start gap-2 mb-5 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
          <ChefHat className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" />
          <span>
            <strong>⚙️ Estas son tus estaciones por defecto.</strong>{' '}
            Asigna una impresora a cada una y vincula tus productos para activar el split automático de comandas.
          </span>
        </div>
      )}

      {/* Error global */}
      {globalError && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{globalError}</span>
          <button onClick={() => setGlobalError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Formulario crear */}
      {showCreate && (
        <div className={`mb-5 p-4 ${CARD}`}>
          <StationForm
            title="Nueva Estación"
            saving={createSaving}
            error={createError}
            onSave={handleCreate}
            onCancel={() => { setShowCreate(false); setCreateError(''); }}
          />
        </div>
      )}

      {/* Lista */}
      {stations.length === 0 ? (
        <div className={`${CARD} text-center py-16 border-dashed`}>
          <ChefHat className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
          <p className="text-[#475569] font-semibold">No hay estaciones configuradas</p>
          <p className="text-[#64748B] text-sm mt-1">Crea al menos una estación para asignar productos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stations.map((station) => {
            const prodCount  = station._count?.products ?? 0;
            const isEditing  = editingId === station.id;
            const isToggling = togglingId === station.id;
            const isAssigning = assigningPrinterId === station.id;

            return (
              <div
                key={station.id}
                className={`${CARD} transition-all duration-200 ${
                  station.active ? 'hover:shadow-md' : 'opacity-70'
                }`}
              >
                {isEditing ? (
                  <div className="p-4">
                    <StationForm
                      title={`Editar "${station.name}"`}
                      initial={station}
                      saving={editSaving}
                      error={editError}
                      onSave={(form) => handleEdit(station.id, form)}
                      onCancel={() => { setEditingId(null); setEditError(''); }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 flex-wrap">
                    {/* Color dot */}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-[#E2E8F0]"
                      style={{ backgroundColor: station.color || '#6B7280' }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#0F172A]">{station.name}</p>
                        {!station.active && (
                          <span className="text-xs font-semibold text-[#475569] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                            Inactiva
                          </span>
                        )}
                      </div>
                      {station.description && (
                        <p className="text-xs text-[#64748B] truncate">{station.description}</p>
                      )}
                    </div>

                    {/* Badge productos */}
                    <span className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F1F5F9] text-[#475569]">
                      {prodCount} producto{prodCount !== 1 ? 's' : ''}
                    </span>

                    {/* Vinculación impresora — sin impresora en ámbar (esa estación no imprime comandas) */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isAssigning ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#F97316]" />
                      ) : (
                        <Printer className={`w-4 h-4 flex-shrink-0 ${station.printer ? 'text-[#64748B]' : 'text-[#B45309]'}`} />
                      )}
                      <select
                        value={station.printerId ?? ''}
                        onChange={e => handleAssignPrinter(station.id, e.target.value || null)}
                        disabled={isAssigning}
                        className={`h-11 text-sm border-[1.5px] rounded-lg px-2 max-w-[200px] bg-white focus:outline-none focus:border-[#F97316] transition-colors ${
                          station.printer
                            ? 'border-[#CBD5E1] !text-[#1E2A4A]'
                            : 'border-[#FDE68A] !text-[#B45309] font-semibold'
                        }`}
                      >
                        <option value="">— Sin impresora —</option>
                        {printers.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Editar */}
                      <button
                        onClick={() => { setEditingId(station.id); setEditError(''); }}
                        title="Editar nombre, descripción o color"
                        aria-label={`Editar ${station.name}`}
                        className={BTN_ICON}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Interruptor "Activa" (misma acción que el antiguo botón de encendido) */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={station.active}
                        onClick={() => handleToggleActive(station)}
                        disabled={isToggling}
                        title={station.active ? 'Desactivar estación' : 'Activar estación'}
                        className="h-11 inline-flex items-center gap-2 px-2 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                      >
                        <span className={`relative inline-flex w-10 h-6 rounded-full transition-colors ${station.active ? 'bg-[#1E2A4A]' : 'bg-[#CBD5E1]'}`}>
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${station.active ? 'left-5' : 'left-1'}`} />
                        </span>
                        <span className="text-sm font-semibold text-[#1E2A4A]">
                          {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activa'}
                        </span>
                      </button>

                      {/* Eliminar — papelera sola, separada */}
                      <TrashButton
                        onClick={() => setDeleteTarget(station)}
                        disabled={prodCount > 0}
                        label={prodCount > 0 ? 'Primero reasigna o elimina los productos de esta estación' : `Eliminar ${station.name}`}
                        className="ml-4 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Barra capacidad */}
      {/* Capacidad — tono neutro: llegar al límite del plan no es un error */}
      <div className={`mt-6 p-3 ${CARD}`}>
        <div className="flex justify-between text-sm text-[#64748B] mb-1.5">
          <span>{stations.length} de {MAX_STATIONS} estaciones usadas</span>
        </div>
        <div className="w-full bg-[#E2E8F0] rounded-full h-2">
          <div
            className="h-2 rounded-full bg-[#1E2A4A] transition-all duration-500"
            style={{ width: `${(stations.length / MAX_STATIONS) * 100}%` }}
          />
        </div>
        {stations.length >= MAX_STATIONS && (
          <p className="text-xs text-[#64748B] mt-1.5">
            Para agregar otra estación, elimina una de las existentes.
          </p>
        )}
      </div>

      {/* Modal confirmar eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#FEE2E2] rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Eliminar Estación</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-5">
              ¿Eliminar <strong>"{deleteTarget.name}"</strong>? Los productos de esta estación
              quedarán sin estación de destino de impresión.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-11 flex items-center justify-center gap-2 border-[1.5px] border-[#B91C1C] text-[#B91C1C] bg-white hover:bg-red-50/60 text-sm font-bold rounded-lg disabled:opacity-60 transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className={`${BTN_OUTLINE} flex-1`}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StationsTab;
