/**
 * PaymentMethodsPage.tsx
 * Administración de medios de pago — Panel Admin / Negocio
 *
 * UI:
 *  - Cabecera con "Ordenar" y "Nuevo Medio de Pago"
 *  - Panel izquierdo: lista de métodos con drag-to-reorder
 *  - Panel derecho: formulario de edición
 */
import { useState, useEffect, useRef } from 'react';
import {
  GripVertical,
  Plus,
  ArrowUpDown,
  Save,
  X,
  Trash2,
  CreditCard,
  Banknote,
  Building2,
  CheckSquare,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  paymentMethodsService,
  type PaymentMethod,
} from '@/services/paymentMethodsService';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';

// ── Iconos por nombre ──────────────────────────────────────────────────────
function MethodIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  if (n.includes('efectivo') || n.includes('cash'))
    return <Banknote size={16} className="text-green-600" />;
  if (n.includes('débito') || n.includes('debito') || n.includes('crédito') || n.includes('credito') || n.includes('tarjeta'))
    return <CreditCard size={16} className="text-blue-600" />;
  if (n.includes('transferencia') || n.includes('cuenta') || n.includes('cheque'))
    return <Building2 size={16} className="text-violet-600" />;
  return <CreditCard size={16} className="text-gray-500" />;
}

// ── Modal Nuevo Medio de Pago ──────────────────────────────────────────────
function NewMethodModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Nuevo Medio de Pago</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Ej: MercadoPago"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Cargar
  const loadMethods = async () => {
    const data = await paymentMethodsService.fetchAll();
    setMethods(data);
    return data;
  };

  useEffect(() => {
    loadMethods().then(data => {
      if (data.length > 0) {
        setSelected(data[0]);
        setEditing({ ...data[0] });
      }
    });
  }, []);

  const select = (m: PaymentMethod) => {
    setSelected(m);
    setEditing({ ...m });
    setIsDirty(false);
  };

  const patchEditing = (partial: Partial<PaymentMethod>) => {
    if (!editing) return;
    setEditing({ ...editing, ...partial });
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!editing || isSaving) return;
    setIsSaving(true);
    try {
      await paymentMethodsService.save(editing);
      const updated = await paymentMethodsService.fetchAll();
      setMethods(updated);
      const refreshed = updated.find(m => m.id === editing.id) ?? editing;
      setSelected(refreshed);
      setEditing({ ...refreshed });
      setIsDirty(false);
      toast.success('Cambios guardados');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!selected) return;
    setEditing({ ...selected });
    setIsDirty(false);
  };

  const handleCreate = async (name: string) => {
    const created = await paymentMethodsService.create(name);
    const updated = await paymentMethodsService.fetchAll();
    setMethods(updated);
    select(created);
  };

  const handleDelete = async (id: string) => {
    setDeleteTargetId(id);
  };

  const doDelete = async (id: string) => {
    const result = await paymentMethodsService.delete(id);
    if (result.softDeleted) {
      toast('⚠️ Este método tiene pagos registrados y fue desactivado (no eliminado). Podés reactivarlo editándolo.', { duration: 6000 });
    } else {
      toast.success('Método eliminado correctamente');
    }
    const updated = await paymentMethodsService.fetchAll();
    setMethods(updated);
    if (updated.length > 0) {
      select(updated[0]);
    } else {
      setSelected(null);
      setEditing(null);
    }
  };

  // ── Drag & Drop reorder ──────────────────────────────────────────────────
  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };
  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const order = methods.map(m => m.id);
    const from = order.indexOf(draggingId);
    const to = order.indexOf(targetId);
    order.splice(from, 1);
    order.splice(to, 0, draggingId);
    await paymentMethodsService.reorder(order);
    const updated = await paymentMethodsService.fetchAll();
    setMethods(updated);
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <div className="h-full flex flex-col">
      <ConfirmModal
        isOpen={!!deleteTargetId}
        title="Eliminar medio de pago"
        message="¿Estás seguro de que deseas eliminar este medio de pago? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => { const id = deleteTargetId!; setDeleteTargetId(null); doDelete(id); }}
        onCancel={() => setDeleteTargetId(null)}
      />
      {/* ── Cabecera ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medios de Pago</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configura los métodos de cobro disponibles en la caja.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setReordering(r => !r)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              reordering
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <ArrowUpDown size={15} />
            {reordering ? 'Salir de orden' : 'Ordenar Medios de Pago'}
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} />
            Nuevo Medio de Pago
          </button>
        </div>
      </div>

      {/* ── Body split ───────────────────────────────────────────── */}
      <div className="flex flex-1 gap-6 min-h-0">
        {/* Panel izquierdo — lista */}
        <aside className="w-64 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Configurados ({methods.length})
            </p>
          </div>
          <ul className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
            {methods.map(m => (
              <li
                key={m.id}
                draggable={reordering}
                onDragStart={() => handleDragStart(m.id)}
                onDragOver={e => handleDragOver(e, m.id)}
                onDrop={() => handleDrop(m.id)}
                onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                onClick={() => !reordering && select(m)}
                className={`
                  flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm
                  ${selected?.id === m.id && !reordering
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'}
                  ${dragOverId === m.id ? 'ring-2 ring-indigo-400 bg-indigo-50' : ''}
                  ${draggingId === m.id ? 'opacity-40' : ''}
                  ${!m.active ? 'opacity-50' : ''}
                `}
              >
                {reordering && (
                  <GripVertical size={14} className="text-gray-400 flex-shrink-0 cursor-grab" />
                )}
                <MethodIcon name={m.name} />
                <span className="flex-1 font-medium leading-none">{m.name}</span>
                {!m.active && (
                  <span className="text-[10px] font-bold bg-gray-200 text-gray-500 rounded px-1">OFF</span>
                )}
              </li>
            ))}
          </ul>
        </aside>

        {/* Panel derecho — edición */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-y-auto">
          {!editing ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>Selecciona un medio de pago para editarlo.</p>
            </div>
          ) : (
            <div className="max-w-lg space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{selected?.name}</h2>
                {selected && (
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 size={13} />
                    Eliminar
                  </button>
                )}
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                <input
                  value={editing.name}
                  onChange={e => patchEditing({ name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Activo */}
              <div className="flex items-center justify-between py-3 border-y border-gray-100">
                <div className="flex items-center gap-2">
                  <CheckSquare size={16} className="text-gray-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Activo</p>
                    <p className="text-xs text-gray-500">
                      {editing.active
                        ? 'Aparece como opción en la caja'
                        : 'Oculto para los operadores de caja'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => patchEditing({ active: !editing.active })}
                  className="transition-colors"
                >
                  {editing.active ? (
                    <ToggleRight size={32} className="text-indigo-600" />
                  ) : (
                    <ToggleLeft size={32} className="text-gray-300" />
                  )}
                </button>
              </div>

              {/* Configuración Avanzada */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Configuración Avanzada
                </p>

                {/* Modo arqueo */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Arqueo</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'auto',   label: 'Según Usuario' },
                      { value: 'manual', label: 'Automático' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => patchEditing({ arqueoMode: opt.value as PaymentMethod['arqueoMode'] })}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                          editing.arqueoMode === opt.value
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Completar saldo manualmente */}
                <div className="flex items-center justify-between py-3 bg-gray-50 rounded-xl px-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Completar saldo manualmente
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      El operador ingresa el monto contado al cerrar la caja
                    </p>
                  </div>
                  <button
                    onClick={() => patchEditing({ manualBalance: !editing.manualBalance })}
                    className="transition-colors ml-4 flex-shrink-0"
                  >
                    {editing.manualBalance ? (
                      <ToggleRight size={32} className="text-indigo-600" />
                    ) : (
                      <ToggleLeft size={32} className="text-gray-300" />
                    )}
                  </button>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X size={14} />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Save size={14} />
                  {isSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal nuevo */}
      {showNew && (
        <NewMethodModal onClose={() => setShowNew(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
