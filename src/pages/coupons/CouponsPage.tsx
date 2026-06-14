import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Tag, Plus, Pencil, Trash2, CheckCircle, XCircle, AlertTriangle, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { CuponesPaywall } from './CuponesPaywall';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/store/authStore';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Coupon {
  id: string;
  code: string;
  description?: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrder?: number;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

interface CouponFormData {
  code: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: string;
  minOrder: string;
  maxUses: string;
  expiresAt: string;
  isActive: boolean;
}

const emptyForm: CouponFormData = {
  code: '', description: '', type: 'PERCENTAGE',
  value: '', minOrder: '', maxUses: '', expiresAt: '', isActive: true,
};

// ─── MENOR 17: Normalización de errores ──────────────────────────────────────
const ERROR_MAP: Record<string, string | ((m: string) => string)> = {
  'COUPON_NOT_FOUND':               'Cupón no encontrado',
  'COUPON_EXPIRED':                 'Este cupón ha expirado',
  'COUPON_EXHAUSTED':               'Este cupón ya alcanzó su límite de usos',
  'COUPON_INACTIVE':                'Este cupón está desactivado',
  'NOT_FOUND':                      'Cupón no encontrado',
  'Ya existe un cupón':             'Ya existe un cupón con ese código',
  'Unique constraint':              'Ya existe un cupón con ese código',
  'El porcentaje debe':             'El porcentaje debe estar entre 1 y 100',
  'El límite no puede ser menor':   (msg: string) => msg,
};

function normalizeError(e: unknown): string {
  const msg = (e as Error)?.message ?? '';
  for (const [key, val] of Object.entries(ERROR_MAP)) {
    if (msg.includes(key)) {
      return typeof val === 'function' ? (val as (m: string) => string)(msg) : val;
    }
  }
  return 'Ocurrió un error, intenta nuevamente';
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CouponsPage() {
  const [search,        setSearch]      = useState('');
  const [page,          setPage]        = useState(1);
  const [showModal,     setShowModal]   = useState(false);
  const [editCoupon,    setEditCoupon]  = useState<Coupon | null>(null);
  const [deleteId,      setDeleteId]    = useState<string | null>(null);
  const [form,          setForm]        = useState<CouponFormData>(emptyForm);

  const qc = useQueryClient();
  const canManage = usePermission('coupons.manage');
  const modules = useAuthStore(s => s.user?.modules) ?? {};

  // ── MENOR 15: Escape cierra modales ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setEditCoupon(null);
        setForm(emptyForm);
        setDeleteId(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Queries ── MENOR 12 + MENOR 13 ──
  const { data: queryResult, isLoading } = useQuery<{ items: Coupon[]; total: number; totalPages: number }>({
    queryKey: ['coupons', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: '20' });
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get<{ items: Coupon[]; total: number; totalPages: number }>(
        `/coupons?${params.toString()}`,
      );
      // httpClient.get envuelve en { data: T }; handleResponse desenvuelve data.data → res.data
      const d = res.data;
      // Guard: handle both paginated object and legacy array response
      if (Array.isArray(d)) {
        return { items: d as Coupon[], total: (d as Coupon[]).length, totalPages: 1 };
      }
      return {
        items:      Array.isArray(d?.items) ? d.items : [],
        total:      typeof d?.total      === 'number' ? d.total      : 0,
        totalPages: typeof d?.totalPages === 'number' ? d.totalPages : 1,
      };
    },
    refetchInterval: 60_000,
    staleTime:       30_000,
  });

  const rawItems   = queryResult?.items;
  const coupons    = Array.isArray(rawItems) ? rawItems : [];
  const totalPages = queryResult?.totalPages ?? 1;
  const total      = queryResult?.total      ?? 0;

  // ── Mutations ── MENOR 17: normalizeError en todos los onError ──
  const createMutation = useMutation({
    mutationFn: (body: object) => api.post('/coupons', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); toast.success('Cupón creado'); closeModal(); },
    onError: (e: unknown) => toast.error(normalizeError(e)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.patch(`/coupons/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); toast.success('Cupón actualizado'); closeModal(); },
    onError: (e: unknown) => toast.error(normalizeError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); toast.success('Cupón eliminado'); setDeleteId(null); },
    onError: (e: unknown) => toast.error(normalizeError(e)),
  });

  // FUNCIONAL 8: toggle con loading state por fila
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/coupons/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
    onError: (e: unknown) => toast.error(normalizeError(e)),
  });

  // ── Handlers ──
  const openCreate = () => { setEditCoupon(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (c: Coupon) => {
    setEditCoupon(c);
    setForm({
      code: c.code,
      description: c.description ?? '',
      type: c.type,
      value: String(c.value),
      minOrder: c.minOrder !== null && c.minOrder !== undefined ? String(c.minOrder) : '',
      maxUses: c.maxUses !== null && c.maxUses !== undefined ? String(c.maxUses) : '',
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      isActive: c.isActive,
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditCoupon(null); setForm(emptyForm); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) return toast.error('El código es obligatorio');
    const numVal = Number(form.value);
    if (!form.value || isNaN(numVal) || numVal < 1) {
      return toast.error('El valor debe ser al menos 1');
    }
    // FUNCIONAL 5 / CRÍTICO 4: validar porcentaje ≤ 100 en frontend
    if (form.type === 'PERCENTAGE' && numVal > 100) {
      return toast.error('El porcentaje no puede superar 100%');
    }
    // FUNCIONAL 9: no bajar maxUses por debajo de usedCount
    if (editCoupon && form.maxUses) {
      const newMax = Number(form.maxUses);
      if (!isNaN(newMax) && newMax < editCoupon.usedCount) {
        return toast.error(
          `No puedes bajar el límite a ${newMax} — el cupón ya fue usado ${editCoupon.usedCount} veces`,
        );
      }
    }

    // FUNCIONAL 6: expiresAt con hora 23:59:59 en zona Chile (-04:00)
    const expiresAtIso = form.expiresAt
      ? new Date(form.expiresAt + 'T23:59:59-04:00').toISOString()
      : undefined;

    const body = {
      code: form.code.toUpperCase().trim(),
      description: form.description || undefined,
      type: form.type,
      value: numVal,
      minOrder: form.minOrder ? Number(form.minOrder) : undefined,
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      expiresAt: expiresAtIso,
      isActive: form.isActive,
    };

    if (editCoupon) {
      updateMutation.mutate({ id: editCoupon.id, body });
    } else {
      createMutation.mutate(body);
    }
  };

  // ── Filtrado ── ahora en servidor; cliente solo muestra lo que llega ──
  const isExpired   = (c: Coupon) => !!c.expiresAt && new Date(c.expiresAt) < new Date();
  const isExhausted = (c: Coupon) => c.maxUses !== null && c.maxUses !== undefined && c.usedCount >= c.maxUses;

  const statusBadge = (c: Coupon) => {
    if (!c.isActive) return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"><XCircle className="w-3 h-3" />Inactivo</span>;
    if (isExpired(c)) return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600"><AlertTriangle className="w-3 h-3" />Expirado</span>;
    if (isExhausted(c)) return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600"><AlertTriangle className="w-3 h-3" />Agotado</span>;
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" />Activo</span>;
  };

  // MENOR 11: badge tipo con valor contextual
  const typeBadge = (c: Coupon) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
      c.type === 'PERCENTAGE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
    }`}>
      {c.type === 'PERCENTAGE' ? `${c.value}% desc.` : `$${c.value.toLocaleString('es-CL')} fijo`}
    </span>
  );

  // MENOR 16: estadísticas calculadas desde los datos cargados
  const stats = useMemo(() => ({
    total:     total,
    activos:   coupons.filter(c => c.isActive && !isExpired(c) && !isExhausted(c)).length,
    usosTotal: coupons.reduce((s, c) => s + c.usedCount, 0),
    descTotal: coupons.reduce((s, c) => s + (c.usedCount * c.value), 0),
  }), [coupons, total]); // eslint-disable-line react-hooks/exhaustive-deps

  // FUNCIONAL 7: min=hoy para el date picker
  const todayLocal = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  // ── Módulo no activado: mostrar paywall ──────────────────────────────────
  if (!modules.cupones) return <CuponesPaywall />;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-0">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl -mx-2 px-6 pt-6 pb-6 mb-6 shadow-xl border border-slate-700/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Cupones & Promociones</h1>
              <p className="text-xs text-slate-400">{total} cupones en total</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-purple-500/25"
            style={canManage ? undefined : { display: 'none' }}
          >
            <Plus className="w-4 h-4" />
            Nuevo cupón
          </button>
        </div>
      </div>

      {/* ── MENOR 16: Stats cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total cupones',      value: stats.total,                                              icon: '🎫' },
          { label: 'Activos',            value: stats.activos,                                            icon: '✅' },
          { label: 'Usos totales',       value: stats.usosTotal,                                          icon: '📊' },
          { label: 'Descuento otorgado', value: `$${stats.descTotal.toLocaleString('es-CL')}`,            icon: '💰' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="text-lg mb-0.5">{s.icon}</div>
            <div className="text-xl font-bold text-gray-800">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Buscador ── MENOR 14: botón × ── */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por código o descripción…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-purple-400 bg-white shadow-sm"
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setPage(1); }}
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
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Tag className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {search ? 'No se encontraron cupones con ese criterio' : 'Aún no hay cupones. Crea el primero.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Código', 'Tipo / Valor', 'Usos', 'Mín. Pedido', 'Vencimiento', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coupons.map((c) => {
                const isToggling = toggleMutation.isPending &&
                  (toggleMutation.variables as { id: string })?.id === c.id;
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{c.code}</span>
                      {c.description && <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>}
                    </td>
                    {/* MENOR 11: badge con tipo + valor */}
                    <td className="px-4 py-3">{typeBadge(c)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.usedCount}{c.maxUses != null ? `/${c.maxUses}` : ''}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {c.minOrder != null ? formatCurrency(c.minOrder) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td className="px-4 py-3">{statusBadge(c)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* FUNCIONAL 8: toggle deshabilitado mientras procesa */}
                        <button
                          onClick={() => !isToggling && toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
                          disabled={isToggling}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isToggling
                              ? 'opacity-50 cursor-not-allowed text-gray-400'
                              : c.isActive
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={c.isActive ? 'Desactivar' : 'Activar'}
                        >
                          {c.isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </button>
                        {canManage && (
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        )}
                        {canManage && (
                        <button
                          onClick={() => setDeleteId(c.id)}
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

          {/* ── MENOR 12: Paginación ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Página {page} de {totalPages} · {total} cupones
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modal Crear / Editar ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {editCoupon ? 'Editar cupón' : 'Nuevo cupón'}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">

              {/* Código */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Código *</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Ej: VERANO20"
                  required
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Descripción</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Descripción interna del cupón"
                />
              </div>

              {/* Tipo + Valor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="PERCENTAGE">Porcentaje (%)</option>
                    <option value="FIXED">Monto fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Valor * {form.type === 'PERCENTAGE' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={form.type === 'PERCENTAGE' ? 100 : undefined}
                    step="1"
                    value={form.value}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (form.type === 'PERCENTAGE' && Number(val) > 100) val = '100';
                      setForm({ ...form, value: val });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder={form.type === 'PERCENTAGE' ? '10' : '5000'}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {form.type === 'PERCENTAGE' ? 'Máximo 100%' : 'Monto fijo en pesos CLP'}
                  </p>
                </div>
              </div>

              {/* Mín. pedido + Máx. usos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Mín. pedido ($)</label>
                  <input
                    type="number" min="0"
                    value={form.minOrder}
                    onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Sin mínimo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Máx. usos</label>
                  <input
                    type="number" min="1"
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Ilimitado"
                  />
                </div>
              </div>

              {/* Vencimiento */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Fecha de vencimiento</label>
                <input
                  type="date"
                  min={todayLocal}
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              {/* Estado */}
              {editCoupon && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-sm text-gray-700">Cupón activo</span>
                </label>
              )}

            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                type="button" onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 text-sm font-semibold text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors disabled:opacity-60"
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Guardando…' : editCoupon ? 'Guardar cambios' : 'Crear cupón'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal Confirmar Eliminación ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">¿Eliminar cupón?</h3>
                <p className="text-xs text-gray-400">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
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
