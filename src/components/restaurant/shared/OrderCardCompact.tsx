// ═══════════════════════════════════════════════════════════════
// OrderCardCompact — Tarjeta de orden para Mostrador y Delivery
// Usada en MostradorTab y DeliveryTab
// Estructura: encabezado · cuerpo · pie anclado (total + acciones)
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
  import {
    CheckCircle, Package, DollarSign,
    MoreHorizontal, X,
    Truck, Pencil, Play,
    MapPin, Phone, MessageSquare,
    ShoppingBag, Bike,
    CreditCard, Banknote, ArrowLeftRight, Coins,
  } from 'lucide-react';
import { fmt, useElapsed } from './helpers';
import { STATUS_STYLES, TIME_WARN_MIN, TIME_ALERT_MIN } from './orderStatusStyles';
import { formatSaleNumber } from '../../../utils/formatSaleNumber';
import { posService } from '../../../services/posService';
import { EditCustomerModal } from './EditCustomerModal';
import type { Sale } from '../../../types/restaurant.types';
import { usePermission } from '../../../hooks/usePermission';
import { usePlan } from '../../../hooks/usePlan';
import { ItemPrepList, ItemsProgress } from './ItemPrepList';
import toast from 'react-hot-toast';
import { modifierNames } from './ModifierGroupsModal'; // HOTFIX 291

// ─── Clases de botones (fila de acciones, todos 44px) ─────────
const BTN_PRIMARY   = 'h-11 px-4 flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] transition-colors disabled:opacity-60';
const BTN_SECONDARY = 'h-11 px-4 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-slate-800 bg-white border-[1.5px] border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-60 flex-shrink-0';
const BTN_ICON      = 'w-11 h-11 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0';

// ─── Formatos solo de pantalla ─────────────────────────────────
const toTitleCase = (s: string) =>
  s.split(' ').map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w)).join(' ');

const capitalizeFirst = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const formatPhoneCL = (raw: string) => {
  const d = raw.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('569')) return `+56 9 ${d.slice(3, 7)} ${d.slice(7)}`;
  if (d.length === 9 && d.startsWith('9'))    return `+56 9 ${d.slice(1, 5)} ${d.slice(5)}`;
  return raw;
};

// Ícono del medio de pago según su nombre (solo pantalla)
const paymentIcon = (label: string) => {
  const n = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (n.includes('debito') || n.includes('credito') || n.includes('tarjeta')) return CreditCard;
  if (n.includes('efectivo')) return Banknote;
  if (n.includes('transferencia')) return ArrowLeftRight;
  return Coins;
};

const elapsedClass = (minutes: number) => {
  if (minutes > TIME_ALERT_MIN) return 'text-red-700 bg-red-100 px-1.5 rounded';
  if (minutes >= TIME_WARN_MIN) return 'text-amber-700';
  return 'text-slate-600';
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
    return (
      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <ShoppingBag size={14} className="flex-shrink-0" />
        Sin ítems
      </p>
    );
  }
  const visible = active.slice(0, 3);
  const hidden  = active.length - 3;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {visible.map((i: any, idx: number) => (
        <p key={idx} className="text-[15px] text-slate-800 truncate leading-snug">
          <span className="font-bold text-slate-900">{i.quantity}×</span> {i.productName}
          {/* HOTFIX 291: modificadores elegidos */}
          {modifierNames(i.modifiers) && <span className="block text-xs text-slate-500 truncate">+ {modifierNames(i.modifiers)}</span>}
        </p>
      ))}
      {hidden > 0 && (
        <p className="text-[13px] font-medium text-slate-500 leading-snug">+{hidden} productos</p>
      )}
    </div>
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

  const { isBasico: planBasico, planReady } = usePlan();
  const isBasico  = planReady && planBasico;
  const inKitchen = ['PENDING', 'PREPARING', 'READY'].includes(order.status);

  const statusStyle     = STATUS_STYLES[order.status] ?? STATUS_STYLES.PENDING;
  const leftColor       = STATUS_STYLES[order.status]?.border ?? 'border-l-gray-300';
  const deliveryAddress = (order as any).customerAddress as string | undefined;
  const deliveryFee     = (order as any).deliveryFee     as number | undefined;
  const createdAt       = (order as any).createdAt       as string | undefined;
  const customerPhone   = (order as any).customerPhone   as string | undefined;
  const elapsed         = useElapsed(createdAt);

  // Medio de pago (solo texto del pie) — resiliente a ambos modelos:
  //  · Pedidos manuales: paymentMethodId (FK) + paymentMethod.name (objeto)
  //  · Pedidos QR: paymentMethod (string plano, ej. "Efectivo")
  const pmRaw   = (order as any).paymentMethod;
  const pmLabel = ((order as any).paymentMethodId || pmRaw)
    ? (pmRaw?.name ?? (typeof pmRaw === 'string' ? pmRaw : undefined) ?? 'Pago asignado')
    : null;
  const PmIcon = pmLabel ? paymentIcon(pmLabel) : null;

  // Botón de acción principal según estado
  type ActionConfig = {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  };

  const mainAction: ActionConfig | null = (() => {
    if (order.status === 'PENDING') {
      if (!canCreateOrder) return null;
      return {
        label:     'Iniciar preparación',
        icon:      <Play size={14} />,
        onClick:   () => onUpdateStatus(order, 'PREPARING'),
      };
    }
    if (order.status === 'PREPARING') {
      return {
        label:     variant === 'delivery' ? 'Enviado' : 'Listo',
        icon:      variant === 'delivery' ? <Truck size={14} /> : <CheckCircle size={14} />,
        onClick:   () => onUpdateStatus(order, 'READY'),
      };
    }
    if (order.status === 'READY') {
      return {
        label:     'Entregado',
        icon:      <Package size={14} />,
        onClick:   () => onPay(order),
      };
    }
    return null;
  })();

  // ─── Jerarquía de botones (solo estilo; mismas acciones) ────
  // mostrador: PRIMARIO = Cobrar si existe; avance de estado SECUNDARIO.
  // delivery:  PRIMARIO = avance de estado; si no hay, Cerrar Pedido. Cobrar SECUNDARIO.
  const isDeliveryClose = variant === 'delivery' && !!(order as any).paymentMethodId;
  const mainIsPrimary   = variant === 'delivery' ? true : !canCobrar;
  const slotIsPrimary   = variant === 'delivery' ? (!mainAction && isDeliveryClose) : true;
  const primaryCls   = `${BTN_PRIMARY} order-1`;
  const secondaryCls = `${BTN_SECONDARY} order-2`;

  return (
    <>
    <div
      className={`p-4 rounded-xl border border-slate-200 bg-white border-l-4 ${leftColor} flex flex-col h-full gap-3 overflow-visible cursor-pointer hover:shadow-md transition-shadow`}
      onClick={() => onCardClick?.(order)}
    >

      {/* ── ENCABEZADO: #número · canal · cliente | tiempo · estado ── */}
      <div className="flex items-center gap-2 min-w-0 -m-4 mb-3 px-4 py-3 rounded-t-xl bg-slate-50">
        <span className="flex-shrink-0 inline-flex items-center h-7 px-2.5 rounded-md bg-slate-100 text-slate-800 text-sm font-bold tabular-nums">
          {formatSaleNumber(order.orderNumber || order.id.slice(-6).toUpperCase())}
        </span>
        {variant === 'delivery'
          ? <Bike size={16} className="text-slate-500 flex-shrink-0" />
          : <ShoppingBag size={16} className="text-slate-500 flex-shrink-0" />}
        <span className="text-lg font-semibold text-slate-900 truncate flex-1 min-w-0">
          {toTitleCase(order.customerName || 'Cliente')}
        </span>
        {elapsed && (
          <span
            className={`flex-shrink-0 text-sm font-semibold tabular-nums whitespace-nowrap ${elapsedClass(elapsed.minutes)}`}
            title={elapsed.title}
          >
            {elapsed.text}
          </span>
        )}
        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[13px] font-semibold whitespace-nowrap ${statusStyle.badgeBg} ${statusStyle.badgeText}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
          {statusStyle.label}
        </span>
      </div>

      {/* ── CUERPO ── */}
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        {/* Delivery: dirección y teléfono (sin caja ni etiquetas) */}
        {variant === 'delivery' && deliveryAddress && (
          <div className="flex items-start gap-1.5 min-w-0">
            <MapPin size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-slate-900 truncate">{deliveryAddress}</p>
          </div>
        )}
        {variant === 'delivery' && customerPhone && (
          <div className="flex items-center gap-1.5 min-w-0">
            <Phone size={14} className="text-slate-500 flex-shrink-0" />
            <p className="text-[13px] text-slate-600 truncate tabular-nums">{formatPhoneCL(customerPhone)}</p>
          </div>
        )}

        {/* TAREA 280: avance por ítem; en Básico (sin KDS) la cocina marca cada ítem desde aquí */}
        {inKitchen && <ItemsProgress items={order.items as any} />}
        {inKitchen && isBasico
          ? <ItemPrepList orderId={order.id} items={order.items as any || []} onChanged={onRefresh} />
          : <ItemsSummaryInline items={order.items as any || []} />}

        {/* Nota del cliente (ambas variantes) */}
        {order.notes && (
          <div className="flex items-start gap-1.5 min-w-0 text-[13px] font-medium text-yellow-900 bg-yellow-50 px-2 py-1.5 rounded-md">
            <MessageSquare size={14} className="flex-shrink-0 mt-px" />
            <p className="min-w-0 break-words">{order.notes}</p>
          </div>
        )}
      </div>

      {/* ── PIE anclado: total + acciones ── */}
      <div className="mt-auto flex flex-col gap-3">
        {/*
          order.total proviene del backend y YA incluye el deliveryFee
          (ver pos.service.ts: total = subtotal + deliveryFeeAmt).
          NO se debe volver a sumar el envío aquí; solo se aclara que está incluido.
        */}
        <div className="flex justify-between items-end gap-2 pt-3 border-t border-slate-200">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 tracking-wide min-w-0">
            <span className="flex-shrink-0">TOTAL{pmLabel ? ' ·' : ''}</span>
            {pmLabel && PmIcon && <PmIcon size={14} className="flex-shrink-0" />}
            {pmLabel && <span className="truncate">{capitalizeFirst(pmLabel)}</span>}
          </span>
          <div className="text-right flex-shrink-0">
            <span className="text-[26px] font-bold text-slate-900 tabular-nums block leading-tight">
              ${fmt(Number(order.total) || 0)}
            </span>
            {variant === 'delivery' && deliveryFee && Number(deliveryFee) > 0 && (
              <span className="text-xs text-slate-500 block">
                Incl. ${fmt(Number(deliveryFee))} envío
              </span>
            )}
          </div>
        </div>

        {/* ── Acciones ── */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Botón acción principal (avance de estado) */}
          {mainAction && (
            <button
              onClick={e => { e.stopPropagation(); mainAction.onClick(); }}
              className={mainIsPrimary ? primaryCls : secondaryCls}
            >
              {mainAction.icon}
              <span>{mainAction.label}</span>
            </button>
          )}

          {/* Botón Cobrar / Cerrar Pedido — directo si delivery con medio de pago asignado */}
          {canCobrar && (
            isDeliveryClose ? (
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
                className={slotIsPrimary ? primaryCls : secondaryCls}
              >
                <CheckCircle size={16} />
                <span>{isClosing ? 'Cerrando...' : 'Cerrar Pedido'}</span>
              </button>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); onPay(order); }}
                className={slotIsPrimary ? primaryCls : secondaryCls}
              >
                <DollarSign size={16} />
                <span>Cobrar</span>
              </button>
            )
          )}

          {/* Botón Editar cliente — solo ícono, siempre presente */}
          <button
            onClick={e => { e.stopPropagation(); setShowEditModal(true); }}
            className={`${BTN_ICON} order-3 ml-auto`}
            aria-label="Editar cliente"
            title="Editar cliente"
          >
            <Pencil size={18} />
          </button>

          {/* Menú ··· — solo visible si puede cancelar */}
          {canCancel && (
            <div className="relative flex-shrink-0 order-4" ref={menuRef}>
              <button
                onClick={e => { e.stopPropagation(); setShowMenu((v) => !v); }}
                className={BTN_ICON}
                aria-label="Más opciones"
              >
                <MoreHorizontal size={18} />
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
