// ═══════════════════════════════════════════════════════════════
// MESERO ORDER VIEW — vista unificada orden + menú (2 columnas en desktop,
// tabs en móvil). Reemplaza MeseroOrderPanel + MeseroMenuSheet.
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import {
  X, Search, Plus, Minus, Trash2, ChefHat,
  Loader2, MoreHorizontal, ClipboardList, UtensilsCrossed,
} from 'lucide-react';
import { MeseroActionSheet }   from './MeseroActionSheet';
import { MeseroSplitSheet }    from './MeseroSplitSheet';
import { MeseroTransferSheet } from './MeseroTransferSheet';
import { MeseroCheckout }      from './MeseroCheckout';
import { MeseroModifiers }     from './MeseroModifiers';
import { useWaiterPermission } from '../hooks/useWaiterPermission';
import { meseroService } from '../meseroService';

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface Props {
  // Mesa
  table:         any;
  allTables:     any[];
  // Orden
  cart:          any[];
  newItems:      any[];
  cartTotal:     number;
  activeOrder:   any | null;
  loadingOrder:  boolean;
  submitting:    boolean;
  // Menú
  categories:    any[];
  products:      any[];         // lista completa (ya filtrada por categoría desde el hook)
  allProducts:   any[];         // lista completa sin filtro de categoría (para buscar)
  selectedCategory: string | null;
  loadingMenu:   boolean;
  // Callbacks — orden
  onClose:       () => void;
  onUpdateQty:   (index: number, qty: number) => void;
  onRemove:      (index: number) => void;
  onUpdateNote:  (index: number, note: string) => void;
  onSendKitchen: () => void;
  onRequestBill: () => void;   // mantenido por compatibilidad (no se usa en sheet)
  onRefresh:     () => void;
  // Callbacks — menú
  onSelectCategory: (id: string) => void;
  onAddProduct:     (product: any, modifiers: any[], notes: string) => void;
}

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export function MeseroOrderView({
  table, allTables,
  cart, newItems, cartTotal,
  activeOrder, loadingOrder, submitting,
  categories, products, allProducts, selectedCategory, loadingMenu,
  onClose, onUpdateQty, onRemove, onUpdateNote, onSendKitchen, onRequestBill, onRefresh,
  onSelectCategory, onAddProduct,
}: Props) {

  // ── Estado local ──
  const [activeTab,         setActiveTab]         = useState<'order' | 'menu'>('menu');
  const [search,            setSearch]            = useState('');
  const [pendingProduct,    setPendingProduct]    = useState<any | null>(null);
  const [showActionSheet,   setShowActionSheet]   = useState(false);
  const [showSplitSheet,    setShowSplitSheet]    = useState(false);
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [showCheckout,      setShowCheckout]      = useState(false);

  // ── Pre-cuenta: envía directo a la impresora via Print Agent ──
  const handlePreCuenta = async () => {
    if (!activeOrder?.id) return;
    try {
      await meseroService.printReceipt(activeOrder.id);
    } catch {
      // silencioso — el Print Agent mostrará el error si hay problema de conexión
    }
  };
  const canCharge   = useWaiterPermission('charge');
  const canSplit    = useWaiterPermission('split_bill');
  const canTransfer = useWaiterPermission('transfer_table');

  // ── Derivados ──
  const sentItems   = cart.filter(i => i.sentToKitchen);
  const sourceList  = search ? allProducts : products;
  const filtered    = sourceList.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );
  // Nombre del garzón asignado a la orden activa
  const waiterName  = activeOrder?.users_orders_waiterIdTousers?.name as string | undefined;

  // Ref para restaurar foco en el input de búsqueda tras re-render
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (search) searchInputRef.current?.focus();
  }, [search]);

  // ─────────────────────────────────────────────
  // Columna de orden (JSX inline — NO sub-componente para evitar remount)
  // ─────────────────────────────────────────────
  const orderColumn = (
    <div className="flex flex-col h-full">
      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loadingOrder ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            <span className="ml-2 text-sm text-gray-500">Cargando orden...</span>
          </div>
        ) : (
          <>
            {/* Garzón asignado */}
            {waiterName && (
              <div className="mx-4 mt-3 px-3 py-1.5 bg-blue-50 rounded-xl flex items-center gap-1.5">
                <span className="text-sm">👤</span>
                <span className="text-xs font-semibold text-blue-700">
                  Garzón: {waiterName.split(' ')[0].toUpperCase()}
                </span>
              </div>
            )}
            {/* Ítems ya enviados a cocina */}
            {sentItems.length > 0 && (
              <div className="px-4 pt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  ✅ Ya en cocina
                </p>
                <div className="space-y-1.5 mb-3">
                  {sentItems.map((item, i) => (
                    <div key={i}
                      className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {item.quantity}× {item.name}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-amber-600">📝 {item.notes}</p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 ml-2 flex-shrink-0">
                        ${(item.price * item.quantity).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nuevos ítems pendientes de enviar */}
            {newItems.length > 0 && (
              <div className="px-4 pt-1">
                <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-2">
                  🆕 Sin enviar
                </p>
                <div className="space-y-1.5">
                  {cart.map((item, i) => {
                    if (item.sentToKitchen) return null;
                    return (
                      <div key={i}
                        className="bg-orange-50 border border-orange-100 rounded-xl">
                        {/* Fila principal: controles + nombre + precio */}
                        <div className="flex items-center gap-2 px-3 py-2">
                          {/* Controles cantidad */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => onUpdateQty(i, item.quantity - 1)}
                              className="w-7 h-7 rounded-full bg-white border border-gray-200
                                         flex items-center justify-center active:scale-90"
                            >
                              <Minus className="w-3 h-3 text-gray-600" />
                            </button>
                            <span className="w-5 text-center font-bold text-gray-800 text-sm">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQty(i, item.quantity + 1)}
                              className="w-7 h-7 rounded-full bg-orange-500 flex items-center
                                         justify-center active:scale-90"
                            >
                              <Plus className="w-3 h-3 text-white" />
                            </button>
                          </div>

                          {/* Nombre */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                          </div>

                          {/* Precio + eliminar */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-sm font-semibold text-gray-700">
                              ${(item.price * item.quantity).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                            </span>
                            <button
                              onClick={() => onRemove(i)}
                              className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Textarea de nota */}
                        <div className="px-3 pb-2">
                          <textarea
                            placeholder="Nota: ej. sin mayonesa..."
                            value={item.notes ?? ''}
                            onChange={(e) => onUpdateNote(i, e.target.value)}
                            rows={1}
                            className="w-full text-xs text-gray-500 border border-gray-200
                                       rounded px-2 py-1 resize-none focus:outline-none
                                       focus:border-orange-400 bg-white"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Estado vacío */}
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 px-4">
                <span className="text-4xl mb-2">🍽️</span>
                <p className="text-sm font-medium">Sin pedido aún</p>
                <p className="text-xs mt-1 text-center">Agrega productos desde el menú</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer — total + botones acción */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 space-y-2 bg-white">
        {/* Total */}
        {cartTotal > 0 && (
          <div className="flex justify-between items-center px-1 text-sm">
            <span className="text-gray-500">Total:</span>
            <span className="font-black text-gray-800 text-lg">
              ${cartTotal.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          {/* Enviar a cocina */}
          {newItems.length > 0 && (
            <button
              onClick={onSendKitchen}
              disabled={submitting}
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-400 text-white font-semibold
                         rounded-2xl flex items-center justify-center gap-2
                         disabled:opacity-50 active:scale-[0.98] transition-all text-sm"
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ChefHat className="w-4 h-4" />
              }
              {submitting ? 'Enviando...' : `Cocina (${newItems.length})`}
            </button>
          )}

          {/* Más opciones */}
          {activeOrder && (
            <button
              onClick={() => setShowActionSheet(true)}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700
                         font-semibold rounded-2xl flex items-center justify-center
                         gap-2 active:scale-[0.98] transition-all text-sm"
            >
              <MoreHorizontal className="w-4 h-4" />
              Más
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // Columna de menú (JSX inline — NO sub-componente para evitar remount)
  // ─────────────────────────────────────────────
  const menuColumn = (
    <div className="flex flex-col h-full">
      {/* Buscador */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="search"
            className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* Categorías */}
      {!search && (
        <div className="flex gap-2 px-3 pb-2 overflow-x-auto flex-shrink-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${selectedCategory === cat.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Lista de productos */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {loadingMenu ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">🔍</p>
            <p className="text-sm">Sin resultados</p>
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            {filtered.map(product => {
              const hasMods = (product.product_modifiers ?? product.modifiers ?? []).length > 0;
              return (
                <button
                  key={product.id}
                  onClick={() => {
                    if (hasMods) {
                      setPendingProduct(product);
                    } else {
                      onAddProduct(product, [], '');
                    }
                  }}
                  className="w-full flex items-center gap-3 p-2.5 bg-white border
                             border-gray-100 rounded-2xl transition-all text-left
                             active:scale-[0.98] hover:border-orange-200 hover:bg-orange-50"
                >
                  {/* Imagen */}
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center
                                  justify-center flex-shrink-0 overflow-hidden">
                    {product.image
                      ? <img src={product.image} alt={product.name}
                             className="w-full h-full object-cover" />
                      : <span className="text-xl">🍽️</span>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{product.description}</p>
                    )}
                    {hasMods && (
                      <p className="text-xs text-orange-500 mt-0.5">+ opciones</p>
                    )}
                  </div>

                  {/* Precio + botón + */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-gray-800 text-sm">
                      ${product.price.toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center
                                    justify-center flex-shrink-0">
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // Render principal
  // ─────────────────────────────────────────────
  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col bg-white">

        {/* ── Header común ── */}
        <div className="flex-shrink-0 flex items-center justify-between
                        px-4 py-3 border-b border-gray-100 bg-white">
          <div>
            <h2 className="text-xl font-black text-gray-800 leading-tight">
              Mesa {table.number}
            </h2>
            <p className="text-xs text-gray-400">
              {table.section?.name}{table.section?.name ? ' · ' : ''}
              {table.status === 'OCCUPIED' ? '🔴 Ocupada' : '🟢 Libre'}
              {waiterName && (
                <span className="ml-1 text-blue-500 font-medium">
                  · 👤 {waiterName.split(' ')[0].toUpperCase()}
                </span>
              )}
            </p>
          </div>

          {/* Indicador # ítems nuevos — solo en móvil cuando estás en tab menú */}
          {newItems.length > 0 && (
            <span className="md:hidden mr-auto ml-3 bg-orange-500 text-white text-xs
                             font-bold px-2.5 py-0.5 rounded-full">
              {newItems.length} sin enviar
            </span>
          )}

          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 ml-2">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── Tabs móvil (< md) ── */}
        <div className="flex-shrink-0 flex md:hidden border-b border-gray-100">
          <button
            onClick={() => setActiveTab('order')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold
                        transition-colors border-b-2
              ${activeTab === 'order'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500'
              }`}
          >
            <ClipboardList className="w-4 h-4" />
            Orden
            {newItems.length > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold
                               w-5 h-5 rounded-full flex items-center justify-center">
                {newItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold
                        transition-colors border-b-2
              ${activeTab === 'menu'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-500'
              }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            Menú
          </button>
        </div>

        {/* ── Cuerpo: 2 columnas en desktop, tab único en móvil ── */}
        <div className="flex-1 min-h-0 flex">

          {/* ─ Col orden: siempre visible en desktop, tab en móvil ─ */}
          <div className={`
            flex-col border-r border-gray-100 bg-white
            ${activeTab === 'order' ? 'flex' : 'hidden'}
            md:flex md:w-[40%]
          `}>
            {orderColumn}
          </div>

          {/* ─ Col menú: siempre visible en desktop, tab en móvil ─ */}
          <div className={`
            flex-col bg-gray-50
            ${activeTab === 'menu' ? 'flex' : 'hidden'}
            md:flex md:flex-1
          `}>
            {menuColumn}
          </div>
        </div>
      </div>

      {/* ── Sub-sheets (igual que OrderPanel) ── */}
      <MeseroActionSheet
        isOpen={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        hasItems={cart.length > 0}
        onPreCuenta={handlePreCuenta}
        onSplitBill={() => setShowSplitSheet(true)}
        onTransfer={() => setShowTransferSheet(true)}
        onCharge={() => { setShowActionSheet(false); setShowCheckout(true); }}
        canCharge={canCharge}
        canSplit={canSplit}
        canTransfer={canTransfer}
      />

      <MeseroSplitSheet
        isOpen={showSplitSheet}
        orderId={activeOrder?.id ?? ''}
        items={activeOrder?.order_items ?? []}
        onClose={() => setShowSplitSheet(false)}
        onSplit={onRefresh}
      />

      <MeseroTransferSheet
        isOpen={showTransferSheet}
        fromTableId={table?.id ?? ''}
        fromTableName={`Mesa ${table?.number ?? ''}`}
        tables={allTables}
        onClose={() => setShowTransferSheet(false)}
        onTransfer={() => { onRefresh(); onClose(); }}
      />

      <MeseroCheckout
        isOpen={showCheckout}
        orderId={activeOrder?.id ?? ''}
        tableNum={table?.number ?? ''}
        tableId={table?.id}
        items={(activeOrder?.order_items ?? []).map((it: any) => ({
          id:       it.id,
          quantity: it.quantity,
          name:     it.products?.name ?? it.name ?? 'Producto',
          price:    it.products?.price ?? it.price ?? 0,
        }))}
        total={cartTotal}
        onClose={() => setShowCheckout(false)}
        onSuccess={() => { setShowCheckout(false); onRefresh(); onClose(); }}
      />

      {/* ── Modal modificadores ── */}
      {pendingProduct && (
        <MeseroModifiers
          product={pendingProduct}
          onConfirm={(modifiers, notes, customPrice) => {
            const prod = customPrice
              ? { ...pendingProduct, price: customPrice }
              : pendingProduct;
            onAddProduct(prod, modifiers, notes);
            setPendingProduct(null);
            setActiveTab('order');
          }}
          onClose={() => setPendingProduct(null)}
        />
      )}
    </>
  );
}
