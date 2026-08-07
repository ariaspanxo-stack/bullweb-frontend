import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promotionsService, type Promotion, type PromotionType } from '@/services/promotionsService';
import { menuService } from '@/services/menuService';
import ProductMultiSelect from '@/components/promotions/ProductMultiSelect';
import toast from 'react-hot-toast';
import {
  Percent, Plus, Pencil, Trash2, CheckCircle, XCircle, Search, Clock,
} from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';

// ─── Tipos locales ──────────────────────────────────────────────────────────

interface PromotionFormData {
  name: string;
  type: PromotionType;
  value: string;
  buyQuantity: string;
  getQuantity: string;
  startHour: string;
  endHour: string;
  daysOfWeek: number[];
  productIds: string[]; // array de IDs seleccionados
  active: boolean;
}

const emptyForm: PromotionFormData = {
  name: '',
  type: 'PERCENTAGE',
  value: '',
  buyQuantity: '1',
  getQuantity: '1',
  startHour: '0',
  endHour: '23',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Todos los días por defecto
  productIds: [],
  active: true,
};

// Días de la semana (estándar JS getDay: 0=Domingo … 6=Sábado)
const WEEK_DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

function formatSchedule(p: Promotion): string {
  const days = p.daysOfWeek?.length === 7
    ? 'Todos los días'
    : (p.daysOfWeek ?? [])
        .slice()
        .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
        .map((d) => WEEK_DAYS.find((w) => w.value === d)?.label ?? '')
        .join(', ');
  return `${days} · ${formatHour(p.startHour)}–${formatHour(p.endHour)}`;
}

function typeBadge(p: Promotion) {
  const base = 'px-2 py-0.5 rounded-full text-xs font-medium';
  switch (p.type) {
    case 'PERCENTAGE':
      return <span className={`${base} bg-blue-100 text-blue-700`}>{p.value}%</span>;
    case 'FIXED_PRICE':
      return <span className={`${base} bg-green-100 text-green-700`}>${p.value.toLocaleString('es-CL')}</span>;
    case 'X_FOR_Y':
      return <span className={`${base} bg-purple-100 text-purple-700`}>{p.buyQuantity}×{p.getQuantity}</span>;
    case 'PACK_PRICE':
      return <span className={`${base} bg-amber-100 text-amber-700`}>{p.buyQuantity}×${p.value.toLocaleString('es-CL')}</span>;
    default:
      return <span className={`${base} bg-gray-100 text-gray-700`}>—</span>;
  }
}

// ─── Componente principal ───────────────────────────────────────────────────

export default function PromotionsPage() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editPromo, setEditPromo] = useState<Promotion | null>(null);
  const [deletePromo, setDeletePromo] = useState<Promotion | null>(null);
  const [form, setForm] = useState<PromotionFormData>(emptyForm);

  const qc = useQueryClient();
  const canManage = usePermission('products.manage');

  // ── Escape cierra modales ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setEditPromo(null);
        setForm(emptyForm);
        setDeletePromo(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Queries ──
  const { data: promotions = [], isLoading } = useQuery<Promotion[]>({
    queryKey: ['promotions'],
    queryFn: () => promotionsService.getPromotions(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Productos disponibles para el selector múltiple (filtrado en cliente)
  const { data: products = [] } = useQuery({
    queryKey: ['menu-products', 'available'],
    queryFn: () => menuService.getProducts({ available: true }),
    staleTime: 60_000,
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (body: Parameters<typeof promotionsService.createPromotion>[0]) =>
      promotionsService.createPromotion(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoción creada');
      closeModal();
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? 'Error al crear la promoción'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof promotionsService.updatePromotion>[1] }) =>
      promotionsService.updatePromotion(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoción actualizada');
      closeModal();
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? 'Error al actualizar la promoción'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promotionsService.deletePromotion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promoción eliminada');
      setDeletePromo(null);
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? 'Error al eliminar la promoción'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      promotionsService.updatePromotion(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
    onError: (e: unknown) => toast.error((e as Error)?.message ?? 'Error al cambiar estado'),
  });

  // ── Handlers ──
  const openCreate = () => {
    setEditPromo(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (p: Promotion) => {
    setEditPromo(p);
    setForm({
      name: p.name,
      type: p.type,
      value: String(p.value),
      buyQuantity: String(p.buyQuantity ?? 1),
      getQuantity: String(p.getQuantity ?? 1),
      startHour: String(p.startHour ?? 0),
      endHour: String(p.endHour ?? 23),
      daysOfWeek: Array.isArray(p.daysOfWeek) ? p.daysOfWeek : [],
      productIds: Array.isArray(p.productIds) ? [...p.productIds] : [],
      active: p.active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditPromo(null);
    setForm(emptyForm);
  };

  const toggleDay = (day: number) => {
    setForm((prev) => {
      const has = prev.daysOfWeek.includes(day);
      return {
        ...prev,
        daysOfWeek: has
          ? prev.daysOfWeek.filter((d) => d !== day)
          : [...prev.daysOfWeek, day],
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('El nombre es obligatorio');

    const numValue = Number(form.value);
    if (!form.value || isNaN(numValue) || numValue < 0) {
      return toast.error('El valor debe ser un número válido');
    }
    if (form.type === 'PERCENTAGE' && (numValue < 1 || numValue > 100)) {
      return toast.error('El porcentaje debe estar entre 1 y 100');
    }

    const productIds = form.productIds;

    const body = {
      name: form.name.trim(),
      type: form.type,
      value: numValue,
      buyQuantity: (form.type === 'X_FOR_Y' || form.type === 'PACK_PRICE') ? Number(form.buyQuantity) || 1 : undefined,
      getQuantity: form.type === 'X_FOR_Y' ? Number(form.getQuantity) || 1 : undefined,
      startHour: Number(form.startHour) || 0,
      endHour: Number(form.endHour) || 23,
      daysOfWeek: form.daysOfWeek,
      productIds,
      active: form.active,
    };

    if (editPromo) {
      updateMutation.mutate({ id: editPromo.id, body });
    } else {
      createMutation.mutate(body);
    }
  };

  // ── Filtrado local por búsqueda ──
  const filtered = useMemo(() => {
    if (!search.trim()) return promotions;
    const q = search.toLowerCase();
    return promotions.filter((p) => p.name.toLowerCase().includes(q));
  }, [promotions, search]);

  const total = promotions.length;
  const activos = promotions.filter((p) => p.active).length;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-0">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl -mx-2 px-6 pt-6 pb-6 mb-6 shadow-xl border border-slate-700/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Percent className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Promociones</h1>
              <p className="text-xs text-slate-400">{total} promociones · {activos} activas</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/25"
            style={canManage ? undefined : { display: 'none' }}
          >
            <Plus className="w-4 h-4" />
            Nueva Promoción
          </button>
        </div>
      </div>

      {/* ── Buscador ── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-white shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Tabla ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Percent className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {search ? 'No se encontraron promociones con ese criterio' : 'Aún no hay promociones. Crea la primera.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Nombre', 'Tipo / Valor', 'Horario', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => {
                const isToggling = toggleMutation.isPending &&
                  (toggleMutation.variables as { id: string })?.id === p.id;
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900">{p.name}</span>
                      {p.productIds?.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{p.productIds.length} producto(s)</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{typeBadge(p)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {formatSchedule(p)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => !isToggling && toggleMutation.mutate({ id: p.id, active: !p.active })}
                        disabled={isToggling}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${
                          isToggling
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400'
                            : p.active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                        title={p.active ? 'Desactivar' : 'Activar'}
                      >
                        {p.active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {p.active ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canManage && (
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => setDeletePromo(p)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Crear / Editar ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-gray-900">
                {editPromo ? 'Editar promoción' : 'Nueva promoción'}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Ej: Happy Hour 2x1"
                  required
                />
              </div>

              {/* Tipo + Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as PromotionType })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="PERCENTAGE">Porcentaje (%)</option>
                    <option value="FIXED_PRICE">Precio fijo ($)</option>
                    <option value="X_FOR_Y">Paga N, Regala M</option>
                    <option value="PACK_PRICE">Pack (Ej: 2 por $5.000)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Valor * {form.type === 'PERCENTAGE' ? '(%)' : form.type === 'FIXED_PRICE' ? '($)' : form.type === 'PACK_PRICE' ? '($ pack)' : ''}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={form.type === 'PERCENTAGE' ? 100 : undefined}
                    step="1"
                    value={form.value}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (form.type === 'PERCENTAGE' && Number(val) > 100) val = '100';
                      setForm({ ...form, value: val });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder={form.type === 'PERCENTAGE' ? '10' : form.type === 'FIXED_PRICE' ? '2990' : form.type === 'PACK_PRICE' ? '5500' : '0'}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {form.type === 'PERCENTAGE'
                      ? 'Máximo 100%'
                      : form.type === 'FIXED_PRICE'
                        ? 'Precio final en pesos CLP'
                        : form.type === 'PACK_PRICE'
                          ? 'Precio TOTAL del pack (ej: 5500 = $5.500 por 2)'
                          : 'No aplica para este tipo'}
                  </p>
                </div>
              </div>

              {/* Campos condicionales X_FOR_Y */}
              {form.type === 'X_FOR_Y' && (
                <div className="grid grid-cols-2 gap-3 bg-purple-50 -mx-1 px-4 py-3 rounded-xl">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Cantidad a pagar</label>
                    <input
                      type="number"
                      min="1"
                      value={form.buyQuantity}
                      onChange={(e) => setForm({ ...form, buyQuantity: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Cantidad de regalo</label>
                    <input
                      type="number"
                      min="1"
                      value={form.getQuantity}
                      onChange={(e) => setForm({ ...form, getQuantity: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                      placeholder="1"
                    />
                  </div>
                </div>
              )}

              {/* Campos condicionales PACK_PRICE */}
              {form.type === 'PACK_PRICE' && (
                <div className="bg-amber-50 -mx-1 px-4 py-3 rounded-xl">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Cantidad a comprar (tamaño del pack)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.buyQuantity}
                    onChange={(e) => setForm({ ...form, buyQuantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                    placeholder="2"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Ej: si pones 2 y Valor = 5500, el cliente paga $5.500 por cada 2 unidades.
                  </p>
                </div>
              )}

              {/* Horas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Hora inicio</label>
                  <select
                    value={form.startHour}
                    onChange={(e) => setForm({ ...form, startHour: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{formatHour(h)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Hora término</label>
                  <select
                    value={form.endHour}
                    onChange={(e) => setForm({ ...form, endHour: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{formatHour(h)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Días de la semana */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Días de la semana</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEK_DAYS.map((d) => {
                    const checked = form.daysOfWeek.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          checked
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Productos aplicables */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Productos aplicables
                </label>
                <ProductMultiSelect
                  products={products}
                  value={form.productIds}
                  onChange={(ids) => setForm((prev) => ({ ...prev, productIds: ids }))}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {form.productIds.length > 0
                    ? `${form.productIds.length} producto(s) seleccionado(s)`
                    : 'Vacío = aplica a todo el menú'}
                </p>
              </div>

              {/* Activo */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-gray-700">Promoción activa</span>
              </label>

            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end sticky bottom-0 bg-white">
              <button
                type="button" onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-60"
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Guardando…' : editPromo ? 'Guardar cambios' : 'Crear promoción'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal Confirmar Eliminación ── */}
      {deletePromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">¿Eliminar promoción?</h3>
                <p className="text-xs text-gray-400">"{deletePromo.name}" — Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletePromo(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletePromo.id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}