// ═══════════════════════════════════════════════════════════════
// OrderCardCompact — Tarjeta compacta ~110px para Mostrador y Delivery
// Usada en MostradorTab y DeliveryTab
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
  import {
    ChefHat, CheckCircle, Package, DollarSign,
    MoreHorizontal, X,
    Truck, Pencil,
    Phone, MessageSquare,
  } from 'lucide-react';
import { fmt, ElapsedTime } from './helpers';
import { formatSaleNumber } from '../../../utils/formatSaleNumber';
import { posService } from '../../../services/posService';
import { EditCustomerModal } from './EditCustomerModal';
import type { Sale } from '../../../types/restaurant.types';
import { usePermission } from '../../../hooks/usePermission';
import toast from 'react-hot-toast';

// ─── Borde izquierdo por estado ────────────────────────────────
const BORDER: Record<string, string> = {
  PENDING:   'border-l-amber-500',
  PREPARING: 'border-l-blue-500',
  READY:     'border-l-green-500',
  CANCELLED: 'border-l-gray-300',
};

// ─── Badge por estado ──────────────────────────────────────────
const BADGE: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: 'bg-amber-500',  text: 'text-white', label: 'Pendiente' },
  PREPARING: { bg: 'bg-blue-500',   text: 'text-white', label: 'En Prep.' },
  READY:     { bg: 'bg-green-500',  text: 'text-white', label: 'Listo' },
  CANCELLED: { bg: 'bg-gray-400',   text: 'text-white', label: 'Cancelado' },
};

// ─── Props ─────────────────────────────────────────────────────
export interface OrderCardCompactProps {
  order:          Sale;
  variant:        'mostrador' | 'delivery';
  onEdit:         (order: Sale) => void;
  onPay:          (order: Sale) => void;
  onCancel:       (order: Sale) => void;
  onUpdateStatus: (order: Sale, status: string) => void;
  onCardClick?:   (order: Sale) => void;
  onRefresh?:     () => void;
}

// ─── Resumen inline de ítems ───────────────────────────────────
function ItemsSummaryInline({ items }: { items: any[] }) {
  // Soft-delete: excluir ítems cancelados del resumen
  const active = (items ?? []).filter((i: any) => !i.isCancelled);
  if (active.length === 0) {
    return <p className="text-xs text-gray-400 italic">Sin ítems</p>;
  }
  const visible = active.slice(0, 2);
  const hidden  = active.length - 2;
  const parts   = visible.map((i: any) => `${i.quantity}× ${i.productName}`);
  return (
    <p className="text-xs text-gray-600 truncate leading-tight">
      {parts.join(' · ')}
      {hidden > 0 && <span className="text-gray-400"> y {hidden} más</span>}
    </p>
  );
}

// ─── Componente principal ──────────────────────────────────────
export function OrderCardCompact({
  order, variant, onEdit, onPay, onCancel, onUpdateStatus, onCardClick, onRefresh,
}: OrderCardCompactProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  // ─── Permisos ───────────────────────────────────────────────
  const canCobrar    = usePermission('pos.cobrar');
  const canCancelOwn = usePermission('pos.cancel_order_own');
  const canCancelAny = usePermission('pos.cancel_order_any');
  const canCancel    = canCancelOwn || canCancelAny;
  const canCreateOrder = usePermission('pos.create_order');

  const badge       = BADGE[order.status]  ?? BADGE.PENDING;
  const leftColor   = BORDER[order.status] ?? 'border-l-gray-300';
  const deliveryAddress = (order as any).customerAddress as string | undefined;
  const deliveryFee     = (order as any).deliveryFee     as number | undefined;
  const createdAt       = (order as any).createdAt       as string | undefined;

  // Botón de acción principal según estado
  type ActionConfig = {
    label: string;
    icon: React.ReactNode;
    className: string;
    onClick: () => void;
  };

  const mainAction: ActionConfig | null = (() => {
    if (order.status === 'PENDING') {
      if (!canCreateOrder) return null;
      return {
        label:     'En Preparación',
        icon:      <ChefHat size={12} />,
        className: 'bg-amber-500 hover:bg-amber-600 text-white',
        onClick:   () => onUpdateStatus(order, 'PREPARING'),
      };
    }
    if (order.status === 'PREPARING') {
      return {
        label:     variant === 'delivery' ? 'Enviado' : 'Listo',
        icon:      variant === 'delivery' ? <Truck size={12} /> : <CheckCircle size={12} />,
        className: 'bg-sky-500 hover:bg-sky-600 text-white',
        onClick:   () => onUpdateStatus(order, 'READY'),
      };
    }
    if (order.status === 'READY') {
      return {
        label:     'Entregado',
        icon:      <Package size={12} />,
        className: 'bg-emerald-500 hover:bg-emerald-600 text-white',
        onClick:   () => onPay(order),
      };
    }
    return null;
  })();

  return (
    <>
    <div
      className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 border-l-4 overflow-visible cursor-pointer ${leftColor}`}
      onClick={() => onCardClick?.(order)}
    >
      <div className="px-3 py-2.5 flex flex-col gap-1.5">

        {/* ── Fila 1: #número · cliente · tiempo · badge ── */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-black text-gray-900 text-lg leading-none flex-shrink-0">
            {formatSaleNumber(order.orderNumber || order.id.slice(-6).toUpperCase())}
          </span>
          <span className="text-lg font-semibold text-gray-700 truncate flex-1 min-w-0">
            {order.customerName || 'Cliente'}
          </span>
          <ElapsedTime createdAt={createdAt} />
          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-sm font-bold whitespace-nowrap ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        </div>

        {/* ── Dirección delivery (solo variant=delivery) ── */}
        {variant === 'delivery' && deliveryAddress && (
          <div className="flex items-center gap-1 min-w-0">
            <Truck size={10} className="text-purple-400 flex-shrink-0" />
            <p className="text-[11px] text-gray-500 truncate">{deliveryAddress}</p>
          </div>
        )}
        {variant === 'delivery' && (order as any).customerPhone && (
          <div className="flex items-center gap-1 min-w-0">
            <Phone size={10} className="text-gray-400 flex-shrink-0" />
            <p className="text-[11px] text-gray-500 truncate">{(order as any).customerPhone}</p>
          </div>
        )}
        {variant === 'delivery' && order.notes && (
          <div className="flex items-center gap-1 min-w-0">
            <MessageSquare size={10} className="text-gray-400 flex-shrink-0" />
            <p className="text-[11px] text-gray-400 truncate italic">{order.notes}</p>
          </div>
        )}

        {/* ── Fila 2: resumen ítems ── */}
        <ItemsSummaryInline items={order.items as any || []} />

        {/* ── Fila 3: total · acción · cobrar · ··· ── */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50 min-w-0">
          {/*
            Total — order.total proviene del backend y YA incluye el deliveryFee
            (ver pos.service.ts: total = subtotal + deliveryFeeAmt).
            NO se debe volver a sumar el envío aquí; solo se aclara que está incluido.
          */}
          <span className="font-black text-gray-800 text-sm flex-1 min-w-0 truncate">
            Total ${fmt(Number(order.total) || 0)}
            {variant === 'delivery' && deliveryFee && Number(deliveryFee) > 0 && (
              <span className="text-[10px] text-gray-400 font-normal ml-1">
                (incluye ${fmt(Number(deliveryFee))} envío)
              </span>
            )}
          </span>

          {/* Chip de medio de pago — resiliente a ambos modelos:
              · Pedidos manuales: paymentMethodId (FK) + paymentMethod.name (objeto)
              · Pedidos QR: paymentMethod (string plano, ej. "Efectivo") */}
          {((order as any).paymentMethodId || (order as any).paymentMethod) && (
            <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full flex-shrink-0">
              {(order as any).paymentMethod?.name ?? (order as any).paymentMethod ?? 'Pago asignado'}
            </span>
          )}

          {/* Botón acción principal */}
          {mainAction && (
            <button
              onClick={e => { e.stopPropagation(); mainAction.onClick(); }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors flex-shrink-0 ${mainAction.className}`}
            >
              {mainAction.icon}
              <span>{mainAction.label}</span>
            </button>
          )}

          {/* Botón Cobrar / Cerrar Pedido — directo si delivery con medio de pago asignado */}
          {canCobrar && (
            variant === 'delivery' && (order as any).paymentMethodId ? (
              <button
                disabled={isClosing}
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsClosing(true);
                  try {
                    const totalNum = Number(order.total) || 0;

                    // Si la orden ya está pagada o el total es 0, cerrar directamente sin procesar pago
                    if (order.status === 'PAID' || totalNum <= 0) {
                      await posService.closeOrder(order.id);
                    } else {
                      // Si hay monto que cobrar, procesar el pago
                      await posService.processPayment(order.id, {
                        paymentMethodId: String((order as any).paymentMethodId),
                        amount: totalNum,
                        tip: 0,
                      });
                    }

                    toast.success('Pedido cerrado y pagado correctamente.');
                    onRefresh?.();
                  } catch (err: any) {
                    console.error('[Cerrar Delivery] Error DETALLADO:', err);
                    const errorData = err?.response?.data || err?.data || err;
                    const backendMsg = errorData?.error || errorData?.message || err?.message;
                    console.error('[Cerrar Delivery] Mensaje Backend:', backendMsg);
                    toast.error(backendMsg || 'Error al cerrar el pedido.');
                  } finally {
                    setIsClosing(false);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex-shrink-0 disabled:opacity-60"
              >
                <CheckCircle size={12} />
                <span>{isClosing ? 'Cerrando...' : 'Cerrar Pedido'}</span>
              </button>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); onPay(order); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-green-500 hover:bg-green-600 text-white transition-colors flex-shrink-0"
              >
                <DollarSign size={12} />
                <span>Cobrar</span>
              </button>
            )
          )}

          {/* Botón Editar cliente — MUY visible, siempre presente */}
          <button
            onClick={e => { e.stopPropagation(); setShowEditModal(true); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-blue-500 hover:bg-blue-600 text-white transition-colors flex-shrink-0 shadow-sm"
            aria-label="Editar cliente"
            title="Editar cliente"
          >
            <Pencil size={18} />
            <span>Editar</span>
          </button>

          {/* Menú ··· — solo visible si puede cancelar */}
          {canCancel && (
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                onClick={e => { e.stopPropagation(); setShowMenu((v) => !v); }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Más opciones"
              >
                <MoreHorizontal size={15} />
              </button>

              {showMenu && (
                <div className="absolute right-0 bottom-full mb-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                  {/* Cancelar orden */}
                  <button
                    onClick={() => { setShowMenu(false); onCancel(order); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <X size={13} className="text-red-400" />
                    Cancelar orden
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* ── Modal editar cliente ── */}
      {showEditModal && (
        <EditCustomerModal
          order={order}
          variant={variant}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            // Refrescar la lista de órdenes desde el backend
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}