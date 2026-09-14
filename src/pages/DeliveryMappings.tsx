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
  History,
  Printer,
  PackageCheck,
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

// Hotfix #153 — historial propio de la sección (solo platform_orders)
interface HistoryItem {
  id: string;
  platformOrderId: string;
  platform: string;
  status: string | null;
  customerName: string | null;
  notes: string | null;
  items: Array<{ productId: string | null; nombre: string; qty: number; precioUnit: number; subtotal: number }>;
  commissions: Array<{ name?: string; type?: string; value?: number; amount?: number }>;
  totals: { subtotal: number | null; totalComisiones: number | null; neto: number | null; total: number | null };
  createdAt: string | null;
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
  // Hotfix #157 — vista de Mapeos OCULTA de la navegación visible: la cara
  // visible queda Ingreso Manual (DEFAULT forzado) + Historial. El código de
  // mapeos NO se borra (queda inaccesible desde la UI) — el estado es memoria
  // pura (useState, sin localStorage ni query param), así que ningún estado
  // persistido puede revivir la vista oculta tras el deploy.
  const [tab, setTab] = useState<'mappings' | 'manual' | 'history'>('manual');

  // Hotfix #153 — toggle de inventario por tenant (deliveryManualDeductStock)
  const [deductStock, setDeductStock] = useState(false);
  const [toggleSaving, setToggleSaving] = useState(false);
  const [toggleMsg, setToggleMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Hotfix #153 — historial propio (paginación simple)
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Hotfix #153 — ticket imprimible interno (modal propio de la sección)
  const [ticketData, setTicketData] = useState<{
    platform: string;
    createdAt: string | null;
    customerName: string | null;
    notes: string | null;
    items: HistoryItem['items'];
    commissions: HistoryItem['commissions'];
    totals: HistoryItem['totals'];
  } | null>(null);

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
  // Hotfix #158 — guard de comisiones: error inline visible (cero descartes silenciosos)
  const [commissionError, setCommissionError] = useState<string | null>(null);
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
        // Hotfix #155 — fin de la ruta fantasma /api/products: carga directa del endpoint real
        api.get('/menu/products', { params: { perPage: 500 } }),
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

  // Hotfix #153 — estado inicial del toggle desde GET /delivery/settings
  useEffect(() => {
    api
      .get('/integrations/delivery/settings')
      .then((r) => setDeductStock(Boolean(r.data?.data?.deliveryManualDeductStock)))
      .catch(() => {/* toggle queda en default OFF si falla la carga */});
  }, []);

  // Hotfix #153 — PATCH del toggle con feedback inline
  const handleToggleDeductStock = async (next: boolean) => {
    setToggleSaving(true);
    setToggleMsg(null);
    try {
      await api.patch('/integrations/delivery/settings', { deliveryManualDeductStock: next });
      setDeductStock(next);
      setToggleMsg({ kind: 'ok', text: next ? 'Guardado: se descontará stock' : 'Guardado: sin descuento de stock' });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Error al guardar la configuración.';
      setToggleMsg({ kind: 'err', text: msg });
    } finally {
      setToggleSaving(false);
    }
  };

  // Hotfix #153 — cargar historial (GET /delivery/manual-orders)
  const loadHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const r = await api.get('/integrations/delivery/manual-orders', {
        params: { page, perPage: 20 },
      });
      const d = r.data?.data ?? r.data ?? {};
      setHistory(Array.isArray(d.orders) ? d.orders : []);
      setHistoryTotal(Number(d.total) || 0);
      setHistoryPage(Number(d.page) || page);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'No se pudo cargar el historial.';
      setHistoryError(msg);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'history') loadHistory(historyPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, historyPage, loadHistory]);

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
    // Hotfix #158 — guard de comisiones: fila a medio llenar (nombre sin valor,
    // o valor no-numérico) o base no-parseable BLOQUEA el envío con mensaje
    // visible. Filas totalmente vacías y base vacía/0 se omiten como hoy.
    const invalidBase =
      commissionBase.trim() !== '' && !Number.isFinite(Number(commissionBase));
    const invalidRow = commissionRows.some((r) => {
      const hasName = r.name.trim().length > 0;
      const raw = r.value.trim();
      if (hasName && raw === '') return true;
      if (raw !== '' && !Number.isFinite(Number(raw))) return true;
      return false;
    });
    if (invalidBase || invalidRow) {
      setCommissionError('Completa el valor de las comisiones o elimínalas');
      return;
    }
    setCommissionError(null);
    setSubmitting(true);
    try {
      // Hotfix #153 — desglose de comisiones #151 viaja completo para el ticket
      const commissionsPayload = [
        ...(Number(commissionBase) > 0
          ? [{ name: `Base ${platformLabel}`, type: 'amount', value: Number(commissionBase) || 0, amount: Number(commissionBase) || 0 }]
          : []),
        ...commissionRows
          .filter((r) => (Number(r.value) || 0) > 0)
          .map((r) => {
            const v = Number(r.value) || 0;
            const amount = r.type === 'percent' ? Math.round((manualSubtotal * v) / 100) : v;
            return {
              name: r.name.trim() || 'Comisión',
              type: r.type,
              value: v,
              amount,
            };
          }),
      ];
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
        commissions: commissionsPayload,
        customerName: manualCustomer.trim() || undefined,
        notes: manualNotes.trim() || undefined,
      });
      // Hotfix #153 — post-confirma autocontenido: nada de POS/comanda.
      // Ticket listo con los datos locales (+neto del backend si vino).
      const backendNeto = res.data?.data?.neto;
      // Hotfix #158 — fecha del ticket desde el SERVIDOR (fin de la dependencia
      // del reloj del PC cliente); fallback local solo si el campo no vino.
      const backendReceivedAt = res.data?.data?.receivedAt;
      setTicketData({
        platform,
        createdAt:
          typeof backendReceivedAt === 'string' && backendReceivedAt
            ? backendReceivedAt
            : new Date().toISOString(),
        customerName: manualCustomer.trim() || null,
        notes: manualNotes.trim() || null,
        items: manualItems.map((it) => ({
          productId: it.productId,
          nombre: it.productName,
          qty: it.quantity,
          precioUnit: it.unitPrice,
          subtotal: it.quantity * it.unitPrice,
        })),
        commissions: commissionsPayload,
        totals: {
          subtotal: manualSubtotal,
          totalComisiones: manualFee,
          neto: typeof backendNeto === 'number' ? backendNeto : manualNet,
          total: manualTotal,
        },
      });
      setManualItems([]);
      setManualCustomer('');
      setManualNotes('');
      setCommissionBase('');
      setCommissionRows([]);
      // Hotfix #157 — el pedido ahora SÍ crea la orden POS (Ventas/Delivery).
      toast.success('Pedido registrado — aparece en Ventas/Delivery');
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

          {/* Hotfix #153 — Toggle de descuento de inventario por tenant */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 no-print">
            <PackageCheck className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-300 flex items-center gap-2 cursor-pointer">
                Descontar inventario
                <button
                  type="button"
                  role="switch"
                  aria-checked={deductStock}
                  disabled={toggleSaving}
                  onClick={() => handleToggleDeductStock(!deductStock)}
                  className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${
                    deductStock ? 'bg-emerald-500' : 'bg-white/10'
                  }`}
                  title="Al activarlo, cada pedido manual registrado descontará stock de los ingredientes (según las recetas vinculadas)"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      deductStock ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
              </label>
              <span className="text-[10px] text-gray-500">
                Descuenta ingredientes al registrar un pedido manual
              </span>
              {toggleMsg && (
                <span
                  className={`text-[10px] mt-0.5 ${
                    toggleMsg.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {toggleMsg.text}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10 w-fit">
            {/* Hotfix #157 — tab Mapeos OCULTO de la navegación visible (los
                mapeos persisten en BD: alimentan la priorización de la grilla
                #152 y el futuro modo automático). El botón no se renderiza;
                la vista no es alcanzable desde la UI (default: Ingreso Manual). */}
            {false && (
              <button
                onClick={() => setTab('mappings')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === 'mappings' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Link2 className="w-4 h-4" />
                Mapeos
              </button>
            )}
            <button
              onClick={() => setTab('manual')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === 'manual' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Ingreso Manual
            </button>
            <button
              onClick={() => setTab('history')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === 'history' ? 'bg-brand-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              Historial
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
                    {commissionError && (
                      <p className="mt-1 text-[11px] text-red-400 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        {commissionError}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-white">
                    <span>Total</span>
                    <span className="tabular-nums">{fmtCLP(manualTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                    <span className="font-bold text-emerald-300 text-sm">TE QUEDA</span>
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
                  Al confirmar, el pedido queda registrado en esta sección (con su historial y ticket
                  interno) y aparece en Ventas/Delivery. No se envía comanda a cocina.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB HISTORIAL (Hotfix #153 — solo platform_orders) ── */}
        {!loading && !error && tab === 'history' && (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Pedidos manuales registrados ({historyTotal})
              </span>
              <button
                onClick={() => loadHistory(historyPage)}
                disabled={historyLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
            {historyError ? (
              <div className="px-4 py-10 text-center text-sm text-red-400">{historyError}</div>
            ) : historyLoading && history.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">Cargando historial…</div>
            ) : history.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">
                Sin pedidos manuales todavía. Regístralos desde la pestaña Ingreso Manual.
              </div>
            ) : (
              <>
                <div className="divide-y divide-white/5">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-400 tabular-nums">
                            {h.createdAt ? new Date(h.createdAt).toLocaleString('es-CL') : '—'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10 uppercase">
                            {h.platform}
                          </span>
                          {h.customerName && (
                            <span className="text-xs text-gray-400 truncate max-w-[140px]">
                              · {h.customerName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 truncate mt-0.5">
                          {h.items.map((i) => `${i.qty}× ${i.nombre}`).join(', ')}
                        </p>
                        <div className="flex items-center gap-3 text-xs mt-1 tabular-nums">
                          <span className="text-gray-400">
                            Subtotal {h.totals.subtotal != null ? fmtCLP(h.totals.subtotal) : '—'}
                          </span>
                          <span className="text-amber-300/80">
                            Comisiones{' '}
                            {h.totals.totalComisiones != null ? fmtCLP(h.totals.totalComisiones) : '—'}
                          </span>
                          <span className="font-bold text-emerald-300">
                            Te queda {h.totals.neto != null ? fmtCLP(h.totals.neto) : '—'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setTicketData({
                            platform: h.platform,
                            createdAt: h.createdAt,
                            customerName: h.customerName,
                            notes: h.notes,
                            items: h.items,
                            commissions: h.commissions,
                            totals: h.totals,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/30 hover:bg-brand-500/20 transition-colors flex-shrink-0 no-print"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Ticket
                      </button>
                    </div>
                  ))}
                </div>
                {historyTotal > 20 && (
                  <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 no-print">
                    <button
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage <= 1 || historyLoading}
                      className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40"
                    >
                      ← Anterior
                    </button>
                    <span className="tabular-nums">
                      Página {historyPage} de {Math.ceil(historyTotal / 20)}
                    </span>
                    <button
                      onClick={() => setHistoryPage((p) => p + 1)}
                      disabled={historyPage >= Math.ceil(historyTotal / 20) || historyLoading}
                      className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Hotfix #153 — TICKET IMPRIMIBLE INTERNO (formato propio de la sección;
          PROHIBIDO reutilizar estilos de comanda de cocina). Contenedor dedicado
          + @media print ocultando el resto de la UI. */}
      {ticketData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm no-print"
          onClick={() => setTicketData(null)}
        >
          <div
            className="bg-gray-900 border border-white/10 rounded-xl max-w-sm w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Ticket interno</span>
              <button
                onClick={() => setTicketData(null)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              {/* Cuerpo imprimible — monospace, formato propio */}
              <div id="delivery-ticket-print" className="bg-white text-black rounded-lg p-4 font-mono text-[11px] leading-relaxed">
                <div className="text-center">
                  <p className="font-bold text-sm uppercase">Registro interno — Mapeo Delivery</p>
                  <p className="text-[10px] mt-1">
                    {ticketData.createdAt ? new Date(ticketData.createdAt).toLocaleString('es-CL') : '—'}
                  </p>
                  <p className="text-[10px] uppercase font-semibold">
                    Plataforma: {ticketData.platform}
                  </p>
                  {ticketData.customerName && (
                    <p className="text-[10px]">Cliente: {ticketData.customerName}</p>
                  )}
                </div>
                <div className="border-t border-dashed border-black my-2" />
                {ticketData.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between gap-2">
                    <span className="truncate">
                      {it.qty}× {it.nombre}
                    </span>
                    <span className="whitespace-nowrap">
                      {fmtCLP(it.precioUnit)} · {fmtCLP(it.subtotal)}
                    </span>
                  </div>
                ))}
                <div className="border-t border-dashed border-black my-2" />
                {ticketData.commissions.length > 0 ? (
                  ticketData.commissions.map((c, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate">
                        Comisión: {c.name ?? 'Comisión'}
                        {c.type === 'percent' && c.value ? ` (${c.value}%)` : ''}
                      </span>
                      <span className="whitespace-nowrap">
                        {c.amount != null ? fmtCLP(c.amount) : '—'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between">
                    <span>Comisiones</span>
                    <span>
                      {ticketData.totals.totalComisiones != null
                        ? fmtCLP(ticketData.totals.totalComisiones)
                        : '—'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold mt-1">
                  <span>Total comisiones</span>
                  <span>
                    {ticketData.totals.totalComisiones != null
                      ? fmtCLP(ticketData.totals.totalComisiones)
                      : '—'}
                  </span>
                </div>
                <div className="border-t border-black my-2" />
                <div className="flex justify-between font-bold text-sm">
                  <span>TE QUEDA</span>
                  <span>
                    {ticketData.totals.neto != null ? fmtCLP(ticketData.totals.neto) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total plataforma</span>
                  <span>
                    {ticketData.totals.total != null ? fmtCLP(ticketData.totals.total) : '—'}
                  </span>
                </div>
                {ticketData.notes && (
                  <>
                    <div className="border-t border-dashed border-black my-2" />
                    <p className="text-[10px]">Notas: {ticketData.notes}</p>
                  </>
                )}
                <div className="border-t border-dashed border-black my-2" />
                <p className="text-center text-[9px]">
                  Registro interno — Mapeo Delivery · BullWeb
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => window.print()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-brand-500 hover:bg-brand-600 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir ticket
                </button>
                <button
                  onClick={() => setTicketData(null)}
                  className="px-4 py-2.5 rounded-lg text-sm text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10"
                >
                  Cerrar
                </button>
              </div>
              <Link
                to="/delivery/mappings"
                onClick={() => setTicketData(null)}
                className="block mt-3 text-center text-xs text-brand-400 hover:text-brand-300"
              >
                Ver en Historial →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
