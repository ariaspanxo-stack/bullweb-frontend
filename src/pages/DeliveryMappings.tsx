import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Truck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  X,
  ClipboardList,
  Link2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';

// ============================================================================
// Hotfix #150 — Mapeo Delivery (FASE MANUAL) — restaurado de f6c582d y
// adaptado a los endpoints reales:
//   GET  /integrations/delivery/unmapped-items?platform=<slug>
//   POST /integrations/delivery/mappings
//   POST /integrations/delivery/manual-order
// Plataformas en slug minúscula (ubereats|rappi|pedidosya) como el backend.
// ============================================================================

// ─── Tipos ───────────────────────────────────────────────────────────────────

type PlatformSlug = 'ubereats' | 'rappi' | 'pedidosya';

interface UnmappedItem {
  externalId: string;
  externalName: string;
  platform: string;
}

interface ExistingMapping {
  external_id: string;
  external_name: string;
  product_id: string;
  product_name: string | null;
}

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  price?: number;
  emoji?: string | null;
  image?: string | null;
  available?: boolean;
}

interface ManualItem {
  key: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  emoji?: string | null;
  image?: string | null;
}

// Hotfix #151 — fila de comisión nombrable: monto fijo CLP o % del subtotal
interface CommissionRow {
  key: string;
  name: string;
  type: 'amount' | 'percent';
  value: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLATFORMS: Array<{ slug: PlatformSlug; label: string; badge: string }> = [
  { slug: 'ubereats', label: 'Uber Eats', badge: 'bg-black text-white' },
  { slug: 'rappi', label: 'Rappi', badge: 'bg-pink-100 text-pink-700 border border-pink-200' },
  { slug: 'pedidosya', label: 'PedidosYa', badge: 'bg-orange-100 text-orange-700 border border-orange-200' },
];

const fmtCLP = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

function extractArray<T>(resp: unknown): T[] {
  if (!resp) return [];
  const data = resp as Record<string, unknown>;
  if (Array.isArray(resp)) return resp as T[];
  if (data && typeof data === 'object') {
    if (Array.isArray(data.data)) return data.data as T[];
    if (Array.isArray(data.items)) return data.items as T[];
  }
  return [];
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function DeliveryMappings() {
  const [tab, setTab] = useState<'mappings' | 'manual'>('mappings');

  // Plataforma seleccionada (slug minúscula)
  const [platform, setPlatform] = useState<PlatformSlug>('rappi');

  // Estado de mapeos
  const [mappings, setMappings] = useState<ExistingMapping[]>([]);
  const [items, setItems] = useState<UnmappedItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selección por item: externalId -> productId
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Búsqueda de productos externos
  const [query, setQuery] = useState('');

  // Crear mapeo manual desde cero
  const [newExternalName, setNewExternalName] = useState('');
  const [newProductId, setNewProductId] = useState('');
  const [creating, setCreating] = useState(false);

  // Pedido manual
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);
  const [gridQuery, setGridQuery] = useState('');
  const [manualCustomer, setManualCustomer] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  // Hotfix #151 — comisiones múltiples: base de plataforma + filas nombrables
  const [commissionBase, setCommissionBase] = useState('');
  const [commissionRows, setCommissionRows] = useState<CommissionRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const platformLabel = PLATFORMS.find((p) => p.slug === platform)?.label ?? platform;
  const platformBadge = PLATFORMS.find((p) => p.slug === platform)?.badge ?? '';

  // ── Cargar datos ───────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stateRes, productsRes] = await Promise.all([
        api.get('/integrations/delivery/unmapped-items', { params: { platform } }).catch((e) => {
          throw e;
        }),
        api.get('/products').catch(async () => {
          const r = await api.get('/menu/products', { params: { perPage: 500 } });
          return r;
        }),
      ]);

      const state = stateRes.data?.data ?? stateRes.data ?? {};
      const mapList: ExistingMapping[] = Array.isArray(state.mappings) ? state.mappings : [];
      const unmapped: UnmappedItem[] = Array.isArray(state.unmapped)
        ? state.unmapped.map((it: Record<string, unknown>) => ({
            externalId: String(it.externalId ?? it.id ?? ''),
            externalName: String(it.externalName ?? it.name ?? ''),
            platform: String(it.platform ?? platform),
          }))
        : [];

      const prods: Product[] = extractArray<Record<string, unknown>>(productsRes.data).map((p) => ({
        id: String(p.id ?? p.uuid ?? ''),
        name: String(p.name ?? ''),
        sku: (p.sku as string | null | undefined) ?? null,
        price: typeof p.price === 'number' ? p.price : undefined,
        emoji: (p.emoji as string | null | undefined) ?? null,
        image: (p.image as string | null | undefined) ?? null,
        available: typeof p.available === 'boolean' ? p.available : undefined,
      }));

      setMappings(mapList);
      setItems(unmapped);
      setProducts(prods);
      setSelections({});
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'No se pudieron cargar los datos de delivery.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Guardar mapeo de un item detectado (patrón f6c582d) ────────────────────
  const handleSave = async (item: UnmappedItem) => {
    const productId = selections[item.externalId];
    if (!productId) return;
    const product = products.find((p) => p.id === productId);
    setSavingId(item.externalId);
    try {
      await api.post('/integrations/delivery/mappings', {
        platform,
        externalId: item.externalId,
        externalName: item.externalName,
        productId,
      });
      // Quitar de unmapped y reflejar en mappings
      setItems((prev) => prev.filter((x) => x.externalId !== item.externalId));
      setMappings((prev) => [
        ...prev,
        {
          external_id: item.externalId,
          external_name: item.externalName,
          product_id: productId,
          product_name: product?.name ?? null,
        },
      ]);
      setSelections((prev) => {
        const next = { ...prev };
        delete next[item.externalId];
        return next;
      });
      toast.success(`Mapeo guardado: "${item.externalName}" → "${product?.name ?? 'producto'}"`);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Error al guardar el mapeo.';
      toast.error(msg);
    } finally {
      setSavingId(null);
    }
  };

  // ── Crear mapeo manual desde cero (FASE MANUAL pura) ──────────────────────
  const handleCreateMapping = async () => {
    if (!newExternalName.trim() || !newProductId) {
      toast.error('Ingresa el nombre externo y el producto interno.');
      return;
    }
    setCreating(true);
    try {
      const product = products.find((p) => p.id === newProductId);
      // externalId manual: slug del nombre normalizado — único por tenant+plataforma
      const externalId = `MAN-${platform.slice(0, 2).toUpperCase()}-${newExternalName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 40)}`;
      await api.post('/integrations/delivery/mappings', {
        platform,
        externalId,
        externalName: newExternalName.trim(),
        productId: newProductId,
      });
      setMappings((prev) => [
        ...prev,
        {
          external_id: externalId,
          external_name: newExternalName.trim(),
          product_id: newProductId,
          product_name: product?.name ?? null,
        },
      ]);
      setNewExternalName('');
      setNewProductId('');
      toast.success('Mapeo creado.');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Error al crear el mapeo.';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  // ── Auto-match simple (patrón f6c582d) ────────────────────────────────────
  const handleAutoMatch = () => {
    let matched = 0;
    const next: Record<string, string> = { ...selections };
    for (const it of items) {
      if (next[it.externalId]) continue;
      const exact = products.find(
        (p) => p.name.trim().toLowerCase() === it.externalName.trim().toLowerCase()
      );
      if (exact) {
        next[it.externalId] = exact.id;
        matched++;
      }
    }
    setSelections(next);
    if (matched > 0) toast.success(`Se pre-seleccionaron ${matched} coincidencias exactas.`);
    else toast('No se encontraron coincidencias automáticas.', { icon: 'ℹ️' });
  };

  // ── Pedido manual (Hotfix #152: selección visual — click agrega / suma +1) ──
  const addProductToOrder = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setManualItems((prev) => {
      const existing = prev.find((x) => x.productId === productId);
      if (existing) {
        return prev.map((x) =>
          x.key === existing.key ? { ...x, quantity: x.quantity + 1 } : x
        );
      }
      return [
        ...prev,
        {
          key: `${productId}-${Date.now()}`,
          productId: prod.id,
          productName: prod.name,
          quantity: 1,
          unitPrice: prod.price ?? 0,
          emoji: prod.emoji ?? null,
          image: prod.image ?? null,
        },
      ];
    });
  };

  // El − no baja de 1; para eliminar la línea está el botón quitar
  const changeManualQty = (key: string, delta: number) => {
    setManualItems((prev) =>
      prev.map((x) =>
        x.key === key ? { ...x, quantity: Math.max(1, x.quantity + delta) } : x
      )
    );
  };

  const manualSubtotal = useMemo(
    () => manualItems.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0),
    [manualItems]
  );
  // Hotfix #151 — comisión total = base + filas nombrables (monto o % del subtotal), CLP redondeado
  const manualFee = useMemo(
    () =>
      Math.max(
        0,
        Math.round(
          (Number(commissionBase) || 0) +
            commissionRows.reduce((acc, r) => {
              const v = Number(r.value) || 0;
              return acc + (r.type === 'percent' ? (manualSubtotal * v) / 100 : v);
            }, 0)
        )
      ),
    [commissionBase, commissionRows, manualSubtotal]
  );
  const manualTotal = manualSubtotal + manualFee;
  const manualNet = manualSubtotal - manualFee;

  const submitManualOrder = async () => {
    if (manualItems.length === 0) {
      toast.error('Agrega al menos un producto al pedido.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/integrations/delivery/manual-order', {
        platform,
        items: manualItems.map((it) => ({
          externalName: it.productName,
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
        totals: {
          subtotal: manualSubtotal,
          platformFee: manualFee,
          total: manualTotal,
        },
        customerName: manualCustomer.trim() || undefined,
        notes: manualNotes.trim() || undefined,
      });
      const orderNumber = res.data?.data?.orderNumber ?? '';
      setManualItems([]);
      setManualCustomer('');
      setManualNotes('');
      setCommissionBase('');
      setCommissionRows([]);
      toast.success(`Pedido ${orderNumber} creado y comanda enviada a cocina.`);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Error al crear el pedido manual.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtrado por búsqueda ─────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim().toLowerCase();
    return items.filter(
      (it) =>
        it.externalName.toLowerCase().includes(q) ||
        it.platform.toLowerCase().includes(q) ||
        it.externalId.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Hotfix #152 — productos mapeados a la plataforma activa (priorizados en la grilla)
  const mappedProductIds = useMemo(
    () => new Set(mappings.map((m) => m.product_id)),
    [mappings]
  );

  // Hotfix #152 — grilla filtrante: solo activos, por nombre/código, mapeados primero
  const visibleProducts = useMemo(() => {
    const q = gridQuery.trim().toLowerCase();
    const list = products
      .filter((p) => p.available !== false)
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? '').toLowerCase().includes(q)
      );
    return [...list].sort(
      (a, b) => Number(mappedProductIds.has(b.id)) - Number(mappedProductIds.has(a.id))
    );
  }, [products, gridQuery, mappedProductIds]);

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm !text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500';

  const selectCls =
    'w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm !text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 [color-scheme:dark]';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-950/90 backdrop-blur border-b border-white/5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            to="/delivery"
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 transition-colors"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-brand-500 flex-shrink-0" />
              <h1 className="text-xl font-bold text-white truncate">Mapeo Delivery</h1>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              Vincula productos de Uber Eats / Rappi / PedidosYa e ingresa pedidos manuales con
              comisión.
            </p>
          </div>
          <button
            onClick={loadAll}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
        {/* Selector de plataforma + tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex items-center gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.slug}
                onClick={() => setPlatform(p.slug)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                  platform === p.slug
                    ? 'ring-2 ring-brand-500 ' + p.badge
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10 w-fit">
            <button
              onClick={() => setTab('mappings')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === 'mappings' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Mapeos
            </button>
            <button
              onClick={() => setTab('manual')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === 'manual' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Ingreso Manual
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Estado de carga */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-400 text-sm">Cargando datos de delivery…</p>
          </div>
        )}

        {/* Estado de error */}
        {!loading && error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">No se pudo cargar la lista</p>
              <p className="text-sm text-red-400/90 mt-1">{error}</p>
              <button
                onClick={loadAll}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Reintentar
              </button>
            </div>
          </div>
        )}

        {/* ── TAB MAPEOS ── */}
        {!loading && !error && tab === 'mappings' && (
          <>
            {/* Crear mapeo manual desde cero */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-semibold text-white mb-1">
                Crear mapeo manual ({platformLabel})
              </h3>
              <p className="text-xs text-gray-400 mb-3">
                Ingresa el nombre del producto tal como aparece en la app de la plataforma y
                vincúlalo a un producto de tu carta.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newExternalName}
                  onChange={(e) => setNewExternalName(e.target.value)}
                  placeholder="Nombre externo (ej: Waffle Explosión)"
                  className={inputCls}
                />
                <select
                  value={newProductId}
                  onChange={(e) => setNewProductId(e.target.value)}
                  className={selectCls}
                >
                  <option value="">— Producto interno —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.sku ? ` (${p.sku})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleCreateMapping}
                  disabled={creating || !newExternalName.trim() || !newProductId}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:bg-white/10 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  {creating ? 'Guardando…' : 'Agregar mapeo'}
                </button>
              </div>
            </div>

            {/* Mapeos existentes */}
            {mappings.length > 0 && (
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden mb-6">
                <div className="px-4 py-3 bg-white/5 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Mapeos guardados — {platformLabel} ({mappings.length})
                </div>
                <div className="divide-y divide-white/5">
                  {mappings.map((m) => (
                    <div
                      key={`${m.external_id}`}
                      className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-3 items-center"
                    >
                      <div className="md:col-span-5">
                        <p className="text-sm font-medium text-white break-words">
                          {m.external_name}
                        </p>
                        <p className="text-[11px] text-gray-500 font-mono truncate">
                          {m.external_id}
                        </p>
                      </div>
                      <div className="md:col-span-2 text-gray-500 text-sm hidden md:flex justify-center">
                        →
                      </div>
                      <div className="md:col-span-5">
                        <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          {m.product_name ?? 'Producto'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items sin mapear detectados (tabla restaurada de f6c582d) */}
            {items.length === 0 ? (
              <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
                <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {mappings.length > 0
                    ? `Todos los productos conocidos de ${platformLabel} están mapeados`
                    : 'Sin pedidos recibidos de plataformas todavía'}
                </h3>
                <p className="text-sm text-gray-400 mt-2">
                  {mappings.length > 0
                    ? 'No hay productos externos pendientes de vincular.'
                    : 'Cuando lleguen pedidos por webhook, los productos externos aparecerán aquí para vincular. Mientras tanto, puedes crear mapeos manualmente arriba.'}
                </p>
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-3 mb-4 flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar producto externo o plataforma…"
                      className={inputCls + ' !pl-9'}
                    />
                  </div>
                  <button
                    onClick={handleAutoMatch}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-brand-400 bg-brand-500/10 border border-brand-500/30 hover:bg-brand-500/20 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Auto-match
                  </button>
                </div>

                {/* Tabla de mapeo */}
                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  {/* Desktop header */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-white/5 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-2">Plataforma</div>
                    <div className="col-span-4">Nombre Producto Externo</div>
                    <div className="col-span-4">Producto Interno</div>
                    <div className="col-span-2 text-right">Acción</div>
                  </div>

                  <div className="divide-y divide-white/5">
                    {filteredItems.map((item) => {
                      const selected = selections[item.externalId];
                      const isSaving = savingId === item.externalId;
                      return (
                        <div
                          key={`${item.platform}-${item.externalId}`}
                          className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 py-3 items-center hover:bg-white/[0.02] transition-colors"
                        >
                          {/* Plataforma */}
                          <div className="md:col-span-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${platformBadge}`}
                              >
                                {platformLabel}
                              </span>
                            </div>
                            <p className="md:hidden text-[11px] text-gray-500 mt-1 font-mono truncate">
                              ID: {item.externalId}
                            </p>
                          </div>

                          {/* Nombre externo */}
                          <div className="md:col-span-4">
                            <p className="text-sm font-medium text-white break-words">
                              {item.externalName}
                            </p>
                            <p className="hidden md:block text-[11px] text-gray-500 font-mono truncate">
                              {item.externalId}
                            </p>
                          </div>

                          {/* Select interno */}
                          <div className="md:col-span-4">
                            <select
                              value={selected ?? ''}
                              onChange={(e) =>
                                setSelections((prev) => ({
                                  ...prev,
                                  [item.externalId]: e.target.value,
                                }))
                              }
                              disabled={isSaving}
                              className={selectCls + ' disabled:opacity-50'}
                            >
                              <option value="">— Selecciona un producto —</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                  {p.sku ? ` (${p.sku})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Acción */}
                          <div className="md:col-span-2 flex md:justify-end">
                            <button
                              onClick={() => handleSave(item)}
                              disabled={!selected || isSaving}
                              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:bg-white/10 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                            >
                              {isSaving ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  Guardando…
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Guardar Mapeo
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {filteredItems.length === 0 && (
                      <div className="px-4 py-10 text-center text-sm text-gray-400">
                        No se encontraron productos con "{query}".
                      </div>
                    )}
                  </div>
                </div>

                {/* Nota informativa */}
                <p className="mt-4 text-xs text-gray-500 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  La lista proviene de los pedidos de delivery recibidos cuyos productos aún no
                  han sido vinculados. Usa "Auto-match" para pre-seleccionar los nombres que
                  coinciden exactamente.
                </p>
              </>
            )}
          </>
        )}

        {/* ── TAB INGRESO MANUAL ── */}
        {!loading && !error && tab === 'manual' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Construcción del pedido */}
            <div className="lg:col-span-2 space-y-6">
              {/* Hotfix #152 — Selección visual de productos (grilla clickeable) */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-1">
                  Agregar productos — pedido de {platformLabel}
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  Toca un producto para agregarlo (tocar de nuevo suma +1). Los mapeados a{' '}
                  {platformLabel} aparecen primero.
                </p>
                {products.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="w-14 h-14 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-3 border border-white/10">
                      <Search className="w-6 h-6 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-300 font-medium mb-1">
                      Agrega productos a tu carta primero
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Tu carta no tiene productos para vender por delivery.
                    </p>
                    <Link
                      to="/products"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors"
                    >
                      Ir a Productos
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        value={gridQuery}
                        onChange={(e) => setGridQuery(e.target.value)}
                        placeholder="Buscar por nombre o código…"
                        className={inputCls + ' !pl-9'}
                      />
                    </div>
                    {visibleProducts.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-400">
                        No se encontraron productos con “{gridQuery}”.
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {visibleProducts.map((p) => {
                          const isMapped = mappedProductIds.has(p.id);
                          const inOrderItem = manualItems.find((x) => x.productId === p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => addProductToOrder(p.id)}
                              className={`relative text-left p-2.5 rounded-xl border transition-all active:scale-[0.97] ${
                                inOrderItem
                                  ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/40'
                                  : 'border-white/10 bg-white/5 hover:border-brand-500/40 hover:bg-white/10'
                              }`}
                            >
                              {isMapped && (
                                <span className="absolute top-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                                  mapeado
                                </span>
                              )}
                              {inOrderItem && (
                                <span className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                                  {inOrderItem.quantity}
                                </span>
                              )}
                              <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden mb-1.5">
                                {p.image ? (
                                  <img
                                    src={p.image}
                                    alt=""
                                    loading="lazy"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-lg leading-none">{p.emoji ?? '🍽️'}</span>
                                )}
                              </div>
                              <p className="text-xs font-medium text-white leading-tight line-clamp-2 break-words pr-6">
                                {p.name}
                              </p>
                              <p className="text-[11px] text-brand-400 font-semibold tabular-nums mt-0.5">
                                {typeof p.price === 'number' ? fmtCLP(p.price) : '—'}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Items del pedido */}
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-white/5 border-b border-white/10 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Items del pedido ({manualItems.length})
                </div>
                {manualItems.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400">
                    Sin items todavía. Agrega productos para construir el pedido.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {manualItems.map((it) => (
                      <div key={it.key} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {it.image ? (
                            <img
                              src={it.image}
                              alt=""
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg leading-none">{it.emoji ?? '🍽️'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {it.productName}
                          </p>
                          <p className="text-xs text-gray-400 tabular-nums">
                            {fmtCLP(it.unitPrice)} c/u
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => changeManualQty(it.key, -1)}
                            disabled={it.quantity <= 1}
                            className="w-7 h-7 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                            title="Restar (mínimo 1)"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold text-white tabular-nums">
                            {it.quantity}
                          </span>
                          <button
                            onClick={() => changeManualQty(it.key, 1)}
                            className="w-7 h-7 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 flex items-center justify-center transition-colors"
                            title="Sumar"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-white tabular-nums flex-shrink-0 w-20 text-right">
                          {fmtCLP(it.quantity * it.unitPrice)}
                        </p>
                        <button
                          onClick={() =>
                            setManualItems((prev) => prev.filter((x) => x.key !== it.key))
                          }
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                          title="Quitar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Datos del cliente */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">
                    Nombre del cliente (opcional)
                  </label>
                  <input
                    type="text"
                    value={manualCustomer}
                    onChange={(e) => setManualCustomer(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1">
                    Notas (opcional)
                  </label>
                  <input
                    type="text"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="Ej: sin cebolla, timbre rojo"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            {/* Desglose y confirmación */}
            <div className="lg:col-span-1">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 sticky top-32">
                <h3 className="text-sm font-semibold text-white mb-3">Desglose del pedido</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{fmtCLP(manualSubtotal)}</span>
                  </div>

                  {/* Hotfix #151 — Comisiones múltiples: base + filas nombrables monto/% */}
                  <div className="border-t border-white/10 pt-2 mt-2 space-y-2">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Comisiones
                    </p>
                    <div className="flex justify-between items-center gap-2 text-gray-300">
                      <span className="whitespace-nowrap text-xs">Base {platformLabel}</span>
                      <input
                        type="number"
                        min={0}
                        value={commissionBase}
                        onChange={(e) => setCommissionBase(e.target.value)}
                        placeholder="0"
                        className="w-28 px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-sm !text-white text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    {commissionRows.map((row) => {
                      const v = Number(row.value) || 0;
                      const amount =
                        row.type === 'percent' ? Math.round((manualSubtotal * v) / 100) : v;
                      return (
                        <div
                          key={row.key}
                          className="flex flex-col gap-1 bg-white/[0.03] border border-white/10 rounded-lg p-2"
                        >
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) =>
                                setCommissionRows((prev) =>
                                  prev.map((r) =>
                                    r.key === row.key ? { ...r, name: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="Nombre (ej: Propina driver)"
                              className="flex-1 min-w-0 px-2 py-1 rounded-md border border-white/10 bg-white/5 text-xs !text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                            <button
                              onClick={() =>
                                setCommissionRows((prev) =>
                                  prev.filter((r) => r.key !== row.key)
                                )
                              }
                              className="p-1 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                              title="Quitar comisión"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={row.type}
                              onChange={(e) =>
                                setCommissionRows((prev) =>
                                  prev.map((r) =>
                                    r.key === row.key
                                      ? { ...r, type: e.target.value as 'amount' | 'percent' }
                                      : r
                                  )
                                )
                              }
                              className={selectCls + ' !py-1 !text-xs w-20'}
                            >
                              <option value="amount">$ CLP</option>
                              <option value="percent">% subtot.</option>
                            </select>
                            <input
                              type="number"
                              min={0}
                              value={row.value}
                              onChange={(e) =>
                                setCommissionRows((prev) =>
                                  prev.map((r) =>
                                    r.key === row.key ? { ...r, value: e.target.value } : r
                                  )
                                )
                              }
                              placeholder="0"
                              className="flex-1 min-w-0 px-2 py-1 rounded-md border border-white/10 bg-white/5 text-xs !text-white text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </div>
                          <p className="text-[11px] text-gray-400 text-right tabular-nums">
                            = {fmtCLP(amount)}
                            {row.type === 'percent' && v > 0 ? ` (${v}% del subtotal)` : ''}
                          </p>
                        </div>
                      );
                    })}
                    <button
                      onClick={() =>
                        setCommissionRows((prev) => [
                          ...prev,
                          { key: `c-${Date.now()}`, name: '', type: 'amount', value: '' },
                        ])
                      }
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-400 bg-brand-500/10 border border-brand-500/30 hover:bg-brand-500/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar comisión
                    </button>
                    <div className="flex justify-between text-gray-300 pt-1">
                      <span>Total comisiones</span>
                      <span className="tabular-nums text-amber-300">{fmtCLP(manualFee)}</span>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-white">
                    <span>Total</span>
                    <span className="tabular-nums">{fmtCLP(manualTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                    <span className="font-bold text-emerald-300 text-sm">NETO PARA TI</span>
                    <span className="font-bold text-emerald-300 tabular-nums text-base">
                      {fmtCLP(manualNet)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={submitManualOrder}
                  disabled={submitting || manualItems.length === 0}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:bg-white/10 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creando pedido…
                    </>
                  ) : (
                    <>
                      <ClipboardList className="w-4 h-4" />
                      Confirmar pedido
                    </>
                  )}
                </button>
                <p className="mt-3 text-[11px] text-gray-500 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Al confirmar se crea la orden interna con la comisión registrada y la comanda se
                  envía a cocina (KDS/impresora).
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
