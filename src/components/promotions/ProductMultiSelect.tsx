import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, PackageSearch } from 'lucide-react';
import type { Product } from '@/types';

interface ProductMultiSelectProps {
  /** Lista completa de productos disponibles (ya cargados por el padre) */
  products: Product[];
  /** Array de IDs seleccionados */
  value: string[];
  /** Callback cuando cambia la selección */
  onChange: (ids: string[]) => void;
  /** Placeholder opcional del buscador */
  placeholder?: string;
}

/**
 * Selector múltiple de productos con buscador instantáneo y chips.
 * Filtra en cliente por nombre o SKU (case insensitive).
 */
export default function ProductMultiSelect({
  products,
  value,
  onChange,
  placeholder = 'Buscar por nombre o SKU…',
}: ProductMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Cerrar dropdown al hacer clic fuera ──
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // ── Productos seleccionados (para los chips) ──
  const selectedProducts = useMemo(
    () => products.filter((p) => value.includes(p.id)),
    [products, value]
  );

  // ── Filtrado en cliente por nombre o SKU ──
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  }, [products, query]);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const remove = (id: string) => {
    onChange(value.filter((v) => v !== id));
  };

  const formatPrice = (price: number) => `$${price.toLocaleString('es-CL')}`;

  return (
    <div ref={containerRef} className="relative">
      {/* ── Chips de productos seleccionados ── */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedProducts.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium"
            >
              <span className="max-w-[160px] truncate">{p.name}</span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="p-0.5 rounded hover:bg-orange-200 transition-colors"
                aria-label={`Quitar ${p.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Input de búsqueda ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <PackageSearch className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-xs">
                {products.length === 0
                  ? 'No hay productos disponibles'
                  : 'Sin resultados para tu búsqueda'}
              </p>
            </div>
          ) : (
            <ul className="py-1">
              {filtered.map((p) => {
                const isSelected = value.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
                        isSelected ? 'bg-orange-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {p.name}
                          </span>
                          {p.sku && (
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {p.sku}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                          {p.category?.name && <span>{p.category.name}</span>}
                          {p.category?.name && <span>·</span>}
                          <span>{formatPrice(p.price)}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}