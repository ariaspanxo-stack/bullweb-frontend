import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, AlertCircle, ChefHat, Printer, Loader2,
  Pencil, Check, X, Power, PowerOff, RotateCcw,
} from 'lucide-react';
import { stationsApi } from '../../services/api';

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
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej. Cocina Caliente, Barra, Postres…"
          maxLength={50}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          onKeyDown={(e) => e.key === 'Enter' && onSave({ name, description: desc, color })}
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Descripción (opcional)</label>
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="ej. Preparación de platos calientes"
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Color</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              title={c.label}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${
                color === c.value ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />{error}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave({ name, description: desc, color })}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
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
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <span className="ml-3 text-gray-500">Cargando estaciones…</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-500" />
            Estaciones de Cocina
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Máximo {MAX_STATIONS} · {stations.length}/{MAX_STATIONS} configuradas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchStations}
            title="Recargar"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setShowCreate(true); setCreateError(''); }}
            disabled={stations.length >= MAX_STATIONS || showCreate}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Estación
          </button>
        </div>
      </div>

      {/* Info impresoras */}
      <div className="flex items-start gap-2 mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <Printer className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
        <span>
          Vincula una <strong>impresora de cocina</strong> a cada estación. Las comandas se enviarán automáticamente a la impresora asignada.
          {printers.length === 0 && (
            <span className="block mt-1 text-amber-700 font-medium">
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
        <div className="mb-5 p-4 bg-orange-50 border border-orange-200 rounded-xl">
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
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay estaciones configuradas</p>
          <p className="text-gray-400 text-sm mt-1">Crea al menos una estación para asignar productos</p>
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
                className={`rounded-xl border shadow-sm transition-all duration-200 ${
                  station.active
                    ? 'bg-white border-gray-200 hover:shadow-md'
                    : 'bg-gray-50 border-gray-200 opacity-70'
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
                  <div className="flex items-center gap-3 p-4">
                    {/* Color dot */}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1"
                      style={{ backgroundColor: station.color || '#6B7280' }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{station.name}</p>
                        {!station.active && (
                          <span className="text-xs font-medium text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                            Inactiva
                          </span>
                        )}
                      </div>
                      {station.description && (
                        <p className="text-xs text-gray-400 truncate">{station.description}</p>
                      )}
                    </div>

                    {/* Badge productos */}
                    <span className={`hidden sm:inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${
                      prodCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {prodCount} producto{prodCount !== 1 ? 's' : ''}
                    </span>

                    {/* Vinculación impresora */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isAssigning ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                      ) : (
                        <Printer className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      )}
                      <select
                        value={station.printerId ?? ''}
                        onChange={e => handleAssignPrinter(station.id, e.target.value || null)}
                        disabled={isAssigning}
                        className={`text-xs border rounded-lg px-2 py-1 max-w-[160px] focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors ${
                          station.printer
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
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
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Editar */}
                      <button
                        onClick={() => { setEditingId(station.id); setEditError(''); }}
                        title="Editar nombre, descripción o color"
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Activar / Desactivar */}
                      <button
                        onClick={() => handleToggleActive(station)}
                        disabled={isToggling}
                        title={station.active ? 'Desactivar estación' : 'Activar estación'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          station.active
                            ? 'text-green-500 hover:text-orange-500 hover:bg-orange-50'
                            : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {isToggling
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : station.active
                            ? <Power className="w-4 h-4" />
                            : <PowerOff className="w-4 h-4" />
                        }
                      </button>

                      {/* Eliminar */}
                      <button
                        onClick={() => setDeleteTarget(station)}
                        disabled={prodCount > 0}
                        title={prodCount > 0 ? 'Primero reasigna o elimina los productos de esta estación' : 'Eliminar estación'}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Barra capacidad */}
      <div className="mt-6 p-3 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Capacidad utilizada</span>
          <span className="font-medium">{stations.length}/{MAX_STATIONS}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              stations.length >= MAX_STATIONS ? 'bg-red-500' : 'bg-orange-500'
            }`}
            style={{ width: `${(stations.length / MAX_STATIONS) * 100}%` }}
          />
        </div>
        {stations.length >= MAX_STATIONS && (
          <p className="text-xs text-red-600 mt-1.5 font-medium">
            Límite alcanzado. Elimina una estación para poder agregar otra.
          </p>
        )}
      </div>

      {/* Modal confirmar eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
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
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
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
