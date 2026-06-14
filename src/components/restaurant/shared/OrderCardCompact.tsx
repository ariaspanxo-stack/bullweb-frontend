// ═══════════════════════════════════════════════════════════════
// OrderCardCompact — Tarjeta compacta ~110px para Mostrador y Delivery
// Usada en MostradorTab y DeliveryTab
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import {
  ChefHat, CheckCircle, Package, DollarSign,
  MoreHorizontal, X,
  Truck,
} from 'lucide-react';
import { fmt, ElapsedTime } from './helpers';
import { formatSaleNumber } from '../../../utils/formatSaleNumber';
import { posService } from '../../../services/posService';
import type { Sale } from '../../../types/restaurant.types';
import { usePermission } from '../../../hooks/usePermission';

// ─── Borde izquierdo por estado ────────────────────────────────
const BORDER: Record<string, string> = {
  PENDING:   'border-l-red-400',
  PREPARING: 'border-l-yellow-400',
  READY:     'border-l-green-400',
  CANCELLED: 'border-l-gray-300',
};

// ─── Badge por estado ──────────────────────────────────────────
const BADGE: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Pendiente' },
  PREPARING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Prep.' },
  READY:     { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Listo' },
  CANCELLED: { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Cancelado' },
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
}

// ─── Resumen inline de ítems ───────────────────────────────────
function ItemsSummaryInline({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-gray-400 italic">Sin ítems</p>;
  }
  const visible = items.slice(0, 2);
  const hidden  = items.length - 2;
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
  order, variant, onEdit, onPay, onCancel, onUpdateStatus, onCardClick,
}: OrderCardCompactProps) {
  const [showMenu, setShowMenu] = useState(false);
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
    <div
      className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 border-l-4 overflow-visible cursor-pointer ${leftColor}`}
      onClick={() => onCardClick?.(order)}
    >
      <div className="px-3 py-2.5 flex flex-col gap-1.5">

        {/* ── Fila 1: #número · cliente · tiempo · badge ── */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-black text-gray-900 text-sm leading-none flex-shrink-0">
            {formatSaleNumber(order.orderNumber || order.id.slice(-6).toUpperCase())}
          </span>
          <span className="text-sm font-semibold text-gray-700 truncate flex-1 min-w-0">
            {order.customerName || 'Cliente'}
          </span>
          <ElapsedTime createdAt={createdAt} />
          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${badge.bg} ${badge.text}`}>
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

        {/* ── Fila 2: resumen ítems ── */}
        <ItemsSummaryInline items={order.items as any || []} />

        {/* ── Fila 3: total · acción · cobrar · ··· ── */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50 min-w-0">
          {/* Total */}
          <span className="font-black text-gray-800 text-sm flex-1 min-w-0 truncate">
            ${fmt(order.total || 0)}
            {variant === 'delivery' && deliveryFee && deliveryFee > 0 && (
              <span className="text-[10px] text-gray-400 font-normal ml-1">
                +${fmt(deliveryFee)} env.
              </span>
            )}
          </span>

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

          {/* Botón Cobrar — siempre visible */}
          {canCobrar && (
            <button
              onClick={e => { e.stopPropagation(); onPay(order); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-green-500 hover:bg-green-600 text-white transition-colors flex-shrink-0"
            >
              <DollarSign size={12} />
              <span>Cobrar</span>
            </button>
          )}

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
  );
}
