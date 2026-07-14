import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Search, Truck, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';

// ============================================================================
// TIPOS
// ============================================================================

type Platform = 'UBER_EATS' | 'RAPPI' | 'PEDIDOS_YA' | 'OTHER';

interface UnmappedItem {
  externalId: string;
  externalName: string;
  platform: Platform;
}

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  price?: number;
}

interface MappingPayload {
  externalId: string;
  externalName: string;
  platform: Platform;
  productId: string;
}

// ============================================================================
// HELPERS
// ============================================================================

const PLATFORM_LABEL: Record<Platform, string> = {
  UBER_EATS: 'Uber Eats',
  RAPPI: 'Rappi',
  PEDIDOS_YA: 'PedidosYa',
  OTHER: 'Otro',
};

const PLATFORM_BADGE: Record<Platform, string> = {
  UBER_EATS: 'bg-black text-white',
  RAPPI: 'bg-pink-100 text-pink-700 border border-pink-200',
  PEDIDOS_YA: 'bg-orange-100 text-orange-700 border border-orange-200',
  OTHER: 'bg-gray-100 text-gray-700 border border-gray-200',
};

function normalizePlatform(p?: string): Platform {
  if (!p) return 'OTHER';
  const u = p.toUpperCase().replace(/\s+/g, '_');
  if (u.includes('UBER')) return 'UBER_EATS';
  if (u.includes('RAPPI')) return 'RAPPI';
  if (u.includes('PEDIDOS') || u.includes('YA')) return 'PEDIDOS_YA';
  if (u === 'UBER_EATS' || u === 'RAPPI' || u === 'PEDIDOS_YA') return u as Platform;
  return 'OTHER';
}

function extractArray<T>(resp: unknown): T[] {
  if (!resp) return [];
  const data = (resp as Record<string, unknown>);
  if (Array.isArray(resp)) return resp as T[];
  if (data && typeof data === 'object') {
    if (Array.isArray((data as Record<string, unknown>).data)) return (data as Record<string, unknown>).data as T[];
    if (Array.isArray((data as Record<string, unknown>).items)) return (data as Record<string, unknown>).items as T[];
  }
  return [];
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DeliveryMappings() {
  const [items, setItems] = useState<UnmappedItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selección por item: externalId -> productId
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  // Búsqueda de productos externos
  const [query, setQuery] = useState('');

  // ── Cargar datos iniciales ────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [unmappedRes, productsRes] = await Promise.all([
        api.get('/delivery/unmapped-items').catch((e) => {
          // Endpoint puede no existir aún — devolver vacío en lugar de romper
          if (e?.response?.status === 404) return { data: [] };
          throw e;
        }),
        api.get('/products').catch(async () => {
          // Fallback al endpoint de menú si /products no existe
          const r = await api.get('/menu/products', { params: { perPage: 500 } });
          return r;
        }),
      ]);

      const unmapped = extractArray<Record<string, unknown>>(unmappedRes.data).map((it) => ({
        externalId: String(it.externalId ?? it.id ?? ''),
        externalName: String(it.externalName ?? it.name ?? ''),
        platform: normalizePlatform(String(it.platform ?? '')),
      }));
      const prods: Product[] = extractArray<Record<string, unknown>>(productsRes.data).map((p) => ({
        id: String(p.id ?? p.uuid ?? ''),
        name: String(p.name ?? ''),
        sku: (p.sku as string | null | undefined) ?? null,
        price: typeof p.price === 'number' ? p.price : undefined,
      }));

      setItems(unmapped);
      setProducts(prods);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'No se pudieron cargar los productos de delivery.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filtrado por búsqueda ─────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (it) =>
        it.externalName.toLowerCase().includes(q) ||
        PLATFORM_LABEL[it.platform].toLowerCase().includes(q)
    );
  }, [items, query]);

  // ── Guardar mapeo ─────────────────────────────────────────────────────────
  const handleSave = async (item: UnmappedItem) => {
    const productId = selections[item.externalId];
    if (!productId) {
      toast.error('Selecciona un producto interno antes de guardar.');
      return;
    }
    const product = products.find((p) => p.id === productId);
    setSavingId(item.externalId);
    try {
      const payload: MappingPayload = {
        externalId: item.externalId,
        externalName: item.externalName,
        platform: item.platform,
        productId,
      };
      await api.post('/delivery/mappings', payload);
      // Quitar el item de la lista
      setItems((prev) => prev.filter((x) => x.externalId !== item.externalId));
      setSelections((prev) => {
        const next = { ...prev };
        delete next[item.externalId];
        return next;
      });
      toast.success(`Mapeo guardado: "${item.externalName}" → "${product?.name ?? 'producto'}"`);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al guardar el mapeo.';
      toast.error(msg);
    } finally {
      setSavingId(null);
    }
  };

  // ── Auto-match simple: si nombre externo coincide exactamente con producto ─
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

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            to="/delivery"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <h1 className="text-xl font-bold text-gray-900 truncate">Mapeo Delivery</h1>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Vincula los productos de Uber Eats / Rappi con tu inventario interno.
            </p>
          </div>
          <button
            onClick={loadAll}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Estado de carga */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-500 text-sm">Cargando productos sin mapear…</p>
          </div>
        )}

        {/* Estado de error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">No se pudo cargar la lista</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={loadAll}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Todo mapeado */}
        {!loading && !error && items.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">¡Todos tus productos de Delivery están mapeados correctamente!</h3>
            <p className="text-sm text-gray-500 mt-2">
              No hay productos externos pendientes de vincular. Vuelve a revisar cuando recibas nuevos pedidos.
            </p>
            <Link
              to="/delivery"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Ir a Delivery
            </Link>
          </div>
        )}

        {/* Tabla de mapeo */}
        {!loading && !error && items.length > 0 && (
          <>
            {/* Toolbar */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar producto externo o plataforma…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <button
                onClick={handleAutoMatch}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                title="Selecciona automáticamente los nombres que coinciden exactamente"
              >
                <CheckCircle2 className="w-4 h-4" />
                Auto-match
              </button>
              <span className="text-xs text-gray-500 self-center px-2">
                {filteredItems.length} de {items.length} pendientes
              </span>
            </div>

            {/* Tabla / Cards responsive */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Desktop header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-2">Plataforma</div>
                <div className="col-span-4">Nombre Producto Externo</div>
                <div className="col-span-4">Producto Interno</div>
                <div className="col-span-2 text-right">Acción</div>
              </div>

              <div className="divide-y divide-gray-100">
                {filteredItems.map((item) => {
                  const selected = selections[item.externalId];
                  const isSaving = savingId === item.externalId;
                  return (
                    <div
                      key={`${item.platform}-${item.externalId}`}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 py-3 items-center hover:bg-gray-50/50 transition-colors"
                    >
                      {/* Plataforma */}
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLATFORM_BADGE[item.platform]}`}>
                            {PLATFORM_LABEL[item.platform]}
                          </span>
                        </div>
                        <p className="md:hidden text-[11px] text-gray-400 mt-1 font-mono truncate">
                          ID: {item.externalId}
                        </p>
                      </div>

                      {/* Nombre externo */}
                      <div className="md:col-span-4">
                        <p className="text-sm font-medium text-gray-900 break-words">{item.externalName}</p>
                        <p className="hidden md:block text-[11px] text-gray-400 font-mono truncate">
                          {item.externalId}
                        </p>
                      </div>

                      {/* Select interno */}
                      <div className="md:col-span-4">
                        <select
                          value={selected ?? ''}
                          onChange={(e) =>
                            setSelections((prev) => ({ ...prev, [item.externalId]: e.target.value }))
                          }
                          disabled={isSaving}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100"
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
                          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
                  <div className="px-4 py-10 text-center text-sm text-gray-500">
                    No se encontraron productos con "{query}".
                  </div>
                )}
              </div>
            </div>

            {/* Nota informativa */}
            <p className="mt-4 text-xs text-gray-400 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              La lista se obtiene de los pedidos de delivery recibidos cuyos productos aún no han sido vinculados con tu inventario.
              Usa "Auto-match" para pre-seleccionar los nombres que coinciden exactamente.
            </p>
          </>
        )}
      </main>
    </div>
  );
}