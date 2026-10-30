import { useState, memo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, AlertTriangle, Plus, Trash2, CreditCard, Banknote, Smartphone, ArrowLeftRight, ChevronDown, CheckCircle } from 'lucide-react';
import type { Payment, Table, CartItem } from '../../../types/restaurant.types';
import { paymentMethodsService } from '@/services/paymentMethodsService';
import { cashRegistersService } from '@/services/cashRegistersService';
import api from '@/services/api';
import { LoyaltyPanel } from '@/components/pos/LoyaltyPanel';
import { useAuthStore } from '@/store/authStore';
import { usePlan } from '@/hooks/usePlan';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { EmitBoletaButton } from '../../../components/pos/EmitBoletaButton';
import { applyOrderDiscount, discountInputAllowed, discountLimitHint, useAdminPin } from '../../../components/pos/discountControl';

interface TipSettings {
  enabled_dine_in:         boolean;
  enabled_counter:         boolean;
  tip_percentage:          number;
  ignore_discounts:        boolean;
}

interface PaymentModalProps {
  table?: Table;
  total: number;
  subtotal: number;
  tax: number;
  deliveryFee?: number;
  items?: CartItem[];
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  orderType?: string;
  initialDiscount?: { type: 'PERCENTAGE' | 'FIXED'; value: number };
  orderId?: string;
  /** Hotfix #257: orden donde se guarda el descuento (origen único). Sin ella el descuento no se edita aquí. */
  discountOrderId?: string;
  onClose: () => void;
  /** Hotfix #256: tips = pagos de propina, cada uno con su propio medio */
  onConfirm: (payments: Payment[], tips: Payment[], discount?: { type: 'PERCENTAGE' | 'FIXED'; value: number }, couponId?: string) => Promise<void>;
}

type Medium = string;

interface Row {
  id: number;
  method: Medium;   // UUID del payment_method en la BD
  amount: string;
}

/** Hotfix #256: un solo slot de descuento; el origen define la confirmación de reemplazo */
type DiscountSource = 'manual' | 'coupon' | 'points' | null;

const REPLACE_MSG = 'Esto reemplaza el descuento actual';

/** Ícono para método de pago */
function methodIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('efectivo') || n.includes('cash')) return Banknote;
  if (n.includes('tarjeta') || n.includes('crédit') || n.includes('credit')) return CreditCard;
  if (n.includes('débit') || n.includes('debit')) return CreditCard;
  if (n.includes('transfer')) return ArrowLeftRight;
  return Smartphone;
}

const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString('es-CL');

// Hotfix #256 (D4): un solo patrón de tarjeta, campos y botones de contorno
const CARD        = 'rounded-xl border border-slate-200 bg-white p-3';
const CARD_TITLE  = 'text-xs font-bold uppercase tracking-wider text-slate-600';
const FIELD       = 'w-full min-h-[44px] border border-slate-300 rounded-xl bg-white text-base font-bold text-slate-900 focus:outline-none focus:border-slate-500 transition-colors';
const BTN_OUTLINE = 'min-h-[44px] px-3 border border-slate-300 rounded-xl bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed';
const BTN_ICON    = 'w-11 h-11 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors flex-shrink-0';
const AMBER_NOTE  = 'flex items-start gap-2 text-sm font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2';

let _id = 0;
const uid = () => ++_id;

// ── RowInput definido FUERA del componente padre para evitar
// que React lo desmonte en cada re-render y pierda el foco ──
interface RowInputProps {
  row: Row;
  onMethod: (v: string) => void;
  onAmount: (v: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  placeholder: string;
  activeMethods: { code: string; name: string }[];
  quickFill?: number;
}
const RowInput = memo(({ row, onMethod, onAmount, onRemove, canRemove, placeholder, activeMethods, quickFill }: RowInputProps) => {
  const selectedName = activeMethods.find(m => m.code === row.method)?.name ?? '';
  const Icon = methodIcon(selectedName);
  return (
    <div className="flex items-center gap-2">
      {/* Selector de método */}
      <div className="relative flex-shrink-0">
        <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10 text-slate-500" />
        <select
          value={row.method}
          onChange={e => onMethod(e.target.value)}
          className="appearance-none min-h-[44px] pl-9 pr-8 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 cursor-pointer focus:outline-none focus:border-slate-500 transition-colors"
        >
          <option value="" disabled>Método...</option>
          {activeMethods.map(m => (
            <option key={m.code} value={m.code}>{m.name}</option>
          ))}
        </select>
        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
      </div>
      {/* Monto */}
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold pointer-events-none">$</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          placeholder={placeholder}
          value={row.amount}
          onChange={e => onAmount(e.target.value)}
          onFocus={e => e.target.select()}
          className={`${FIELD} pl-7 pr-2`}
        />
      </div>
      {quickFill !== undefined && quickFill > 0 && (
        <button type="button" onClick={() => onAmount(String(quickFill))} className={`${BTN_OUTLINE} flex-shrink-0`}>
          Exacto
        </button>
      )}
      {canRemove && (
        <button type="button" onClick={onRemove} className={BTN_ICON} aria-label="Quitar fila">
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
});

export const PaymentModal = ({
  table,
  total,
  subtotal,
  tax: _tax,
  deliveryFee = 0,
  items = [],
  orderNumber,
  customerId,
  customerName,
  initialDiscount,
  orderId,
  discountOrderId,
  orderType,
  onClose,
  onConfirm,
}: PaymentModalProps) => {
  const authUser = useAuthStore(s => s.user);
  // HOTFIX 262: puntos (CRM) no están en Básico — se ocultan, sin llamadas.
  // HOTFIX 278: cupones sí (gate por feature 'coupons' de plan_config).
  const { isBasico, hasFeature } = usePlan();
  const userPermsDiscount = (authUser?.role?.permissions ?? []) as string[];
  const discountPermByType: Record<string, string> = {
    DINE_IN: 'pos.discount_table', TAKEAWAY: 'pos.discount_counter', DELIVERY: 'pos.discount_delivery',
  };
  const requiredDiscountPerm = discountPermByType[(orderType ?? '').toUpperCase()] ?? null;
  const canApplyDiscount =
    userPermsDiscount.includes('ALL_PERMISSIONS') ||
    (requiredDiscountPerm
      ? userPermsDiscount.includes(requiredDiscountPerm)
      : ['pos.discount_table', 'pos.discount_counter', 'pos.discount_delivery'].some(p => userPermsDiscount.includes(p)));

  // Carga async de métodos desde la BD. `code` = UUID real, `name` = nombre para mostrar.
  const [activeMethods, setActiveMethods] = useState<{ code: string; name: string }[]>([]);
  const defaultMethodRef = useRef<string>('');
  const [cashSessionActive, setCashSessionActive] = useState<boolean | null>(null);
  const [tipRows, setTipRows] = useState<Row[]>([]);
  const [payRows, setPayRows] = useState<Row[]>([{ id: uid(), method: '', amount: '' }]);
  const [tipConfig, setTipConfig] = useState<TipSettings | null>(null);
  const tipAutoAddedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const { dteIsConfigured, lastPaidOrderId } = useRestaurant();

  useEffect(() => {
    cashRegistersService.getActiveRegister()
      .then(r => setCashSessionActive(r?.isOpen ?? false))
      .catch(() => setCashSessionActive(null));
  }, []);

  // Cargar configuración de propinas del tenant
  useEffect(() => {
    api.get<TipSettings>('/tenant/tip-settings')
      .then(res => setTipConfig(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    paymentMethodsService.getActiveAsync().then(methods => {
      const mapped = methods.map(m => ({ code: m.id, name: m.name }));
      setActiveMethods(mapped);
      if (mapped.length > 0) {
        defaultMethodRef.current = mapped[0].code;
        // Actualizar la fila de pago inicial con el UUID correcto
        setPayRows(r => r.map((row, i) => i === 0 ? { ...row, method: mapped[0].code } : row));
      }
    });
  }, []);

  // Auto-añadir fila de propina cuando la config y los métodos ya estén listos
  useEffect(() => {
    if (!tipConfig || tipAutoAddedRef.current || activeMethods.length === 0) return;
    const isTable = !!table;
    const tipEnabled = isTable ? tipConfig.enabled_dine_in : tipConfig.enabled_counter;
    if (!tipEnabled || tipConfig.tip_percentage <= 0) return;
    tipAutoAddedRef.current = true;
    const base = tipConfig.ignore_discounts ? subtotal : total;
    const autoTip = Math.round(base * tipConfig.tip_percentage / 100);
    if (autoTip > 0) {
      setTipRows([{ id: uid(), method: activeMethods[0].code, amount: String(autoTip) }]);
    }
  }, [tipConfig, activeMethods, table, total, subtotal]);

  const defaultMethod = useCallback(() => defaultMethodRef.current || activeMethods[0]?.code || '', [activeMethods]);

  const [error, setError] = useState('');

  // ── Descuento: UN SOLO SLOT (manual, cupón o puntos) — Hotfix #256 (D2)
  const [discountEnabled, setDiscountEnabled] = useState(() => !!initialDiscount);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>(() => initialDiscount?.type ?? 'PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(() => initialDiscount ? String(initialDiscount.value) : '');
  const [discountSource, setDiscountSource] = useState<DiscountSource>(() => initialDiscount ? 'manual' : null);

  // ── Cupón ────────────────────────────────────────────────────
  const [couponCode,      setCouponCode]      = useState('');
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
  const [couponLoading,   setCouponLoading]   = useState(false);
  const [couponMsg,       setCouponMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  // ── DOBLE SEGURIDAD: recalcular totales excluyendo ítems cancelados ──
  // El padre (Restaurant.tsx) ya filtra isCancelled, pero si por algún motivo
  // llegaran items cancelados en la lista, los excluimos del cobro.
  const activeItemsForCalc = items.filter((i: any) => !i.isCancelled);
  const internalSubtotal = activeItemsForCalc.reduce(
    (s, i) => s + (Number(i.total ?? i.subtotal ?? 0)), 0
  ) + deliveryFee;
  // Si el recálculo interno difiere del total recibido por props (por ej. porque
  // el padre no filtró correctamente), confiamos en el cálculo local defensivo.
  const effectiveTotal = internalSubtotal > 0 && Math.abs(internalSubtotal - total) > 0.5
    ? internalSubtotal
    : total;
  const effectiveSubtotal = subtotal > 0 ? Math.min(subtotal, internalSubtotal || subtotal) : subtotal;

  // Hotfix #256 (D2): cálculo único, % sobre el subtotal (antes de propina)
  const discountAmount = (() => {
    const v = parseFloat(discountValue) || 0;
    if (!discountEnabled || v <= 0) return 0;
    if (discountType === 'PERCENTAGE') return Math.round(effectiveSubtotal * Math.min(v, 100) / 100);
    return Math.min(Math.round(v), effectiveSubtotal);
  })();

  const tipTotal  = tipRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const payTotal  = payRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  // Venta (lo que cubren los pagos) y total a cobrar (venta + propinas con su medio)
  const saleTotal = effectiveTotal - discountAmount;
  const finalTotal = saleTotal + tipTotal;
  const balance = payTotal - saleTotal; // negativo = falta, positivo = vuelto
  const missing = balance < -0.5;

  /** Confirma el reemplazo si ya hay un descuento de otro origen en el slot */
  const confirmReplace = (next: Exclude<DiscountSource, null>) =>
    !(discountAmount > 0 && discountSource && discountSource !== next) || window.confirm(REPLACE_MSG);

  // ── Hotfix #257 (D1): el descuento vive en la orden; aquí se edita con el mismo endpoint ──
  const { requestPin, pinModal } = useAdminPin();
  const canEditDiscount = !!discountOrderId;
  const [savedDiscount, setSavedDiscount] = useState<{ type: 'PERCENTAGE' | 'FIXED'; value: number } | null>(
    () => (initialDiscount && initialDiscount.value > 0 ? initialDiscount : null),
  );
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const currentDiscount = discountEnabled && (parseFloat(discountValue) || 0) > 0
    ? { type: discountType, value: parseFloat(discountValue) || 0 }
    : null;
  const discountDirty = JSON.stringify(currentDiscount) !== JSON.stringify(savedDiscount);

  /** Guarda el descuento en la orden (topes + PIN). null = quitar. */
  const persistDiscount = async (d: { type: 'PERCENTAGE' | 'FIXED'; value: number } | null, reason?: string): Promise<boolean> => {
    if (!discountOrderId) return false;
    if (d && !discountInputAllowed(d.type, String(d.value), effectiveSubtotal)) {
      setError(discountLimitHint(d.type, effectiveSubtotal));
      return false;
    }
    setApplyingDiscount(true);
    setError('');
    try {
      const ok = await applyOrderDiscount(
        discountOrderId,
        d ? { ...d, ...(reason ? { reason } : {}) } : { type: 'FIXED', value: 0 },
        requestPin,
      );
      if (ok) setSavedDiscount(d);
      return ok;
    } catch (e: any) {
      setError(e?.message || 'No se pudo aplicar el descuento');
      return false;
    } finally {
      setApplyingDiscount(false);
    }
  };

  const clearDiscount = async () => {
    if (savedDiscount && !(await persistDiscount(null))) return;
    setDiscountEnabled(false);
    setDiscountValue('');
    setDiscountSource(null);
    setAppliedCouponId(null);
    setCouponMsg(null);
  };

  /** Edición manual: si el slot lo ocupa un cupón o puntos, confirma y lo reemplaza */
  const editManual = (apply: () => void) => {
    if (discountSource !== 'manual') {
      if (!confirmReplace('manual')) return;
      setAppliedCouponId(null);
      setCouponMsg(null);
      setDiscountSource('manual');
    }
    setDiscountEnabled(true);
    apply();
  };

  const handleValidateCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await api.post('/coupons/validate/code', { code: couponCode.trim(), orderTotal: total }) as { data: { valid: boolean; reason?: string; discountAmount?: number; coupon?: { id: string; type: string; value: number } } };
      const d = res.data;
      if (d.valid && d.coupon && d.discountAmount !== undefined) {
        if (!confirmReplace('coupon')) return;
        const cType = d.coupon.type as 'PERCENTAGE' | 'FIXED';
        const cValue = cType === 'PERCENTAGE' ? d.coupon.value : d.discountAmount;
        // Hotfix #279: el cupón se aplica en el servidor (sin PIN del descuento manual) y queda
        // ligado a la orden; el backend calcula el descuento y consume el uso al cobrar.
        if (!discountOrderId) {
          setCouponMsg({ ok: false, text: 'Cupón no aplicado' });
          return;
        }
        try {
          await api.post(`/pos/orders/${discountOrderId}/coupon`, { code: couponCode.trim() });
          setSavedDiscount({ type: cType, value: cValue });
        } catch (e: any) {
          setCouponMsg({ ok: false, text: e?.message || 'Cupón no aplicado' });
          return;
        }
        setDiscountEnabled(true);
        setDiscountType(cType);
        setDiscountValue(String(cValue));
        setDiscountSource('coupon');
        setAppliedCouponId(d.coupon.id);
        setCouponMsg({ ok: true, text: `Cupón aplicado: -$${Math.round(d.discountAmount).toLocaleString('es-CL')}` });
      } else {
        setCouponMsg({ ok: false, text: d.reason ?? 'Cupón inválido' });
      }
    } catch {
      setCouponMsg({ ok: false, text: 'Error al validar cupón' });
    } finally {
      setCouponLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCode, total, discountAmount, discountSource, discountOrderId, effectiveSubtotal]);

  // ── helpers ──────────────────────────────────────────────
  const addTipRow = () => {
    const pct = (tipConfig?.tip_percentage ?? 10) / 100;
    const base = tipConfig?.ignore_discounts ? subtotal : (total - discountAmount);
    setTipRows(r => [...r, { id: uid(), method: defaultMethod(), amount: String(Math.round(base * pct)) }]);
  };
  const addPayRow = () => setPayRows(r => [...r, { id: uid(), method: defaultMethod(), amount: '' }]);

  const updateTip = (id: number, field: 'method' | 'amount', val: string) =>
    setTipRows(r => r.map(x => x.id === id ? { ...x, [field]: val } : x));
  const updatePay = (id: number, field: 'method' | 'amount', val: string) =>
    setPayRows(r => r.map(x => x.id === id ? { ...x, [field]: val } : x));

  const removeTip = (id: number) => setTipRows(r => r.filter(x => x.id !== id));
  const removePay = (id: number) => {
    setPayRows(r => {
      const next = r.filter(x => x.id !== id);
      return next.length === 0 ? [{ id: uid(), method: defaultMethod(), amount: '' }] : next;
    });
  };

  const payments: Payment[] = payRows
    .filter(r => parseFloat(r.amount) > 0)
    .map(r => ({ method: r.method, amount: Math.round(parseFloat(r.amount)) }));
  // Hotfix #256 (D3): no se puede cobrar mientras la suma de pagos no cubra la venta
  const confirmBlocked = loading || applyingDiscount || missing || (saleTotal > 0.5 && payments.length === 0);

  const handleConfirm = async () => {
    setError('');
    if (confirmBlocked) return;
    // Hotfix #257: un cambio de descuento sin aplicar se guarda en la orden antes de cobrar
    if (canEditDiscount && discountDirty && !(await persistDiscount(currentDiscount))) return;
    const tips: Payment[] = tipRows
      .filter(r => parseFloat(r.amount) > 0)
      .map(r => ({ method: r.method, amount: Math.round(parseFloat(r.amount)) }));
    try {
      setLoading(true);
      // Hotfix #257: el descuento ya está guardado en la orden; no se reenvía al cobrar.
      // El cupón se valida e incrementa atómicamente en el backend (registerPayment)
      // dentro de la misma transacción del pago.
      await onConfirm(payments, tips, undefined, appliedCouponId ?? undefined);
      setPaymentCompleted(true);
      setAppliedCouponId(null);
    } catch (e: any) {
      setError(e.message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  const channelLabel = table
    ? `Mesa ${table.number}`
    : (orderType ?? '').toUpperCase() === 'DELIVERY' ? 'Delivery' : 'Mostrador';

  if (paymentCompleted) {
    return createPortal(
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-orange-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Pago registrado</h3>
          <p className="text-sm text-slate-500 mb-6">La orden ha sido cobrada correctamente</p>
          {dteIsConfigured && lastPaidOrderId && (
            <div className="mb-6">
              <EmitBoletaButton
                orderId={lastPaidOrderId}
                isConfigured={dteIsConfigured}
                onEmitted={() => {}}
              />
            </div>
          )}
          <button
            onClick={() => {
              setPaymentCompleted(false);
              onClose();
            }}
            className={`${BTN_OUTLINE} w-full`}
          >
            Cerrar
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]" onClick={onClose} />

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
          style={{ height: 'min(92vh, 780px)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* HEADER — una sola línea (D4) */}
          <div className="flex-shrink-0 flex items-center justify-between gap-3 px-5 min-h-[60px] border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 truncate">
              {channelLabel} · <span className="font-black">${fmt(finalTotal)}</span>
              {orderNumber && <span className="ml-2 text-xs font-medium text-slate-400">{orderNumber}</span>}
            </h2>
            <button onClick={onClose} className={BTN_ICON} aria-label="Cerrar">
              <X size={16} />
            </button>
          </div>

          {/* BODY */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* ── COLUMNA IZQUIERDA: Cuenta ── */}
            <div className="w-[38%] border-r border-slate-200 flex flex-col bg-slate-50 min-h-0">
              <p className={`${CARD_TITLE} px-3 pt-3 pb-2 flex-shrink-0`}>Cuenta</p>

              <div className="flex-1 overflow-y-auto px-3 pb-1 space-y-1 min-h-0">
                {items.length === 0 && (
                  <p className="text-xs text-slate-400 text-center pt-3">Sin items</p>
                )}
                {items.map((item, i) => {
                  const cancelled = !!(item as any).isCancelled;
                  return (
                    <div
                      key={item.id ?? i}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border border-slate-200 bg-white ${cancelled ? 'opacity-50' : ''}`}
                      title={cancelled ? (item as any).cancelReason : undefined}
                    >
                      <span className="w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center flex-shrink-0 bg-slate-100 text-slate-700">
                        {item.quantity}
                      </span>
                      <span className={`flex-1 text-sm font-medium leading-snug truncate ${cancelled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {item.productName}
                      </span>
                      <span className={`font-bold text-sm whitespace-nowrap ${cancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        ${fmt(item.total ?? item.subtotal ?? 0)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Totales */}
              <div className="px-3 py-2 border-t border-slate-200 space-y-1 flex-shrink-0 text-sm">
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Costo de envío</span><span className="font-bold">${fmt(deliveryFee)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Descuento{discountType === 'PERCENTAGE' ? ` ${discountValue}%` : ''}</span>
                    <span className="font-bold">-${fmt(discountAmount)}</span>
                  </div>
                )}
                {tipTotal > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Propina</span><span className="font-bold">+${fmt(tipTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-300">
                  <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Total</span>
                  <span className="text-2xl font-black text-slate-900">${fmt(finalTotal)}</span>
                </div>
              </div>
            </div>

            {/* ── COLUMNA DERECHA: Descuento / Propina / Pago ── */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-3 min-h-0">

                {/* DESCUENTO — un solo slot: manual, cupón o puntos */}
                <section className={CARD}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={CARD_TITLE}>Descuento</p>
                    {discountAmount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">-${fmt(discountAmount)}</span>
                        <button onClick={clearDiscount} className={BTN_ICON} aria-label="Quitar descuento">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {!canEditDiscount && (
                    <p className="text-sm text-slate-400 mb-2">Envía el pedido a cocina para aplicar un descuento.</p>
                  )}
                  {canApplyDiscount && canEditDiscount ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="flex rounded-xl border border-slate-300 overflow-hidden flex-shrink-0">
                          {(['PERCENTAGE', 'FIXED'] as const).map(t => (
                            <button
                              key={t}
                              onClick={() => editManual(() => { setDiscountType(t); setDiscountValue(''); })}
                              className={`min-h-[44px] px-3 text-sm font-bold transition-colors ${
                                discountEnabled && discountType === t
                                  ? 'bg-white text-slate-900 underline underline-offset-4 decoration-2'
                                  : 'bg-white text-slate-400 hover:text-slate-700'
                              }`}
                            >{t === 'PERCENTAGE' ? '%' : '$'}</button>
                          ))}
                        </div>
                        <input
                          type="number" inputMode="numeric" min="0"
                          max={discountType === 'PERCENTAGE' ? 100 : Math.round(effectiveSubtotal)}
                          placeholder={discountType === 'PERCENTAGE' ? 'Porcentaje' : 'Monto'}
                          value={discountEnabled ? discountValue : ''}
                          onChange={e => {
                            const v = e.target.value;
                            // Hotfix #257 (D2): el input bloquea % > 100 y monto > subtotal
                            if (!discountInputAllowed(discountType, v, effectiveSubtotal)) return;
                            editManual(() => setDiscountValue(v));
                          }}
                          onFocus={e => e.target.select()}
                          className={`${FIELD} px-3`}
                        />
                        {discountDirty && discountSource === 'manual' && (
                          <button
                            type="button"
                            onClick={() => persistDiscount(currentDiscount)}
                            disabled={applyingDiscount}
                            className={`${BTN_OUTLINE} flex-shrink-0`}
                          >
                            {applyingDiscount ? '…' : 'Aplicar'}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {discountLimitHint(discountType, effectiveSubtotal)}
                        {!discountDirty && savedDiscount ? ' · guardado en la orden' : ''}
                      </p>
                    </>
                  ) : discountAmount === 0 && canEditDiscount && (
                    <p className="text-sm text-slate-400">Sin descuento aplicado</p>
                  )}

                  {/* Cupón: mismo slot — HOTFIX 278: visible si el plan incluye la feature coupons (Básico incluido) */}
                  {canEditDiscount && hasFeature('coupons') && <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Código de cupón"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponMsg(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleValidateCoupon()}
                      className={`${FIELD} px-3 font-mono uppercase`}
                    />
                    <button
                      type="button"
                      onClick={handleValidateCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className={`${BTN_OUTLINE} flex-shrink-0`}
                    >
                      {couponLoading ? '…' : 'Aplicar'}
                    </button>
                  </div>}
                  {couponMsg && (
                    <p className="text-xs mt-1.5 font-semibold text-slate-600">
                      {couponMsg.ok ? '✓' : '✗'} {couponMsg.text}
                    </p>
                  )}

                  {/* Puntos de fidelidad: mismo slot */}
                  {canEditDiscount && !isBasico && customerId && customerName && discountOrderId && (
                    <div className="mt-2">
                      <LoyaltyPanel
                        orderId={discountOrderId}
                        customerId={customerId}
                        customerName={customerName}
                        beforeRedeem={() => confirmReplace('points')}
                        saleTotal={effectiveTotal} /* HOTFIX 298: total antes del descuento y sin propina */
                        onApplied={(cashDiscount) => {
                          // HOTFIX #282: el servidor ya descontó los puntos y guardó el descuento en la orden
                          setSavedDiscount({ type: 'FIXED', value: cashDiscount });
                          setAppliedCouponId(null);
                          setCouponMsg(null);
                          setDiscountEnabled(true);
                          setDiscountType('FIXED');
                          setDiscountValue(String(cashDiscount));
                          setDiscountSource('points');
                        }}
                      />
                    </div>
                  )}
                </section>

                {/* PROPINA — solo visible si el canal lo tiene habilitado (o si hay filas ya cargadas) */}
                {(() => {
                  const anyTipEnabled = tipConfig
                    ? (tipConfig.enabled_dine_in || tipConfig.enabled_counter)
                    : false;
                  if (!anyTipEnabled && tipRows.length === 0) return null;
                  return (
                    <section className={CARD}>
                      <div className="flex items-center justify-between mb-2">
                        <p className={CARD_TITLE}>
                          Propina
                          {tipConfig && <span className="ml-1 normal-case tracking-normal font-medium text-slate-400">({tipConfig.tip_percentage}%)</span>}
                        </p>
                        <button onClick={addTipRow} className={BTN_OUTLINE}>
                          <Plus size={14} /> Agregar
                        </button>
                      </div>
                      {tipRows.length === 0 && (
                        <p className="text-sm text-slate-400">Sin propina</p>
                      )}
                      <div className="space-y-2">
                        {tipRows.map(r => (
                          <RowInput
                            key={r.id}
                            row={r}
                            onMethod={v => updateTip(r.id, 'method', v)}
                            onAmount={v => updateTip(r.id, 'amount', v)}
                            onRemove={() => removeTip(r.id)}
                            canRemove={true}
                            placeholder="Monto propina"
                            activeMethods={activeMethods}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })()}

                {/* PAGO */}
                <section className={CARD}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={CARD_TITLE}>
                      Pago
                      <span className="ml-1 normal-case tracking-normal font-medium text-slate-400">· venta ${fmt(saleTotal)}</span>
                    </p>
                    <button onClick={addPayRow} className={BTN_OUTLINE}>
                      <Plus size={14} /> Agregar medio
                    </button>
                  </div>
                  <div className="space-y-2">
                    {payRows.map(r => (
                      <RowInput
                        key={r.id}
                        row={r}
                        onMethod={v => updatePay(r.id, 'method', v)}
                        onAmount={v => updatePay(r.id, 'amount', v)}
                        onRemove={() => removePay(r.id)}
                        canRemove={payRows.length > 1}
                        placeholder={`Venta: $${fmt(saleTotal)}`}
                        activeMethods={activeMethods}
                        quickFill={payRows.length === 1 ? Math.round(saleTotal) : Math.round(Math.max(0, saleTotal - payRows.filter(x => x.id !== r.id).reduce((s, x) => s + (parseFloat(x.amount) || 0), 0)))}
                      />
                    ))}
                  </div>

                  {/* Balance: Faltan (ámbar) / Vuelto (neutro) */}
                  {missing ? (
                    <div className={`${AMBER_NOTE} mt-2`}>
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>Faltan <span className="font-bold">${fmt(balance)}</span></span>
                    </div>
                  ) : payTotal > 0 && balance > 0.5 && (
                    <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <span className="font-medium">Vuelto</span>
                      <span className="font-bold text-slate-900">${fmt(balance)}</span>
                    </div>
                  )}
                </section>
              </div>

              {/* CTA — siempre visible */}
              <div className="px-4 py-3 border-t border-slate-200 flex-shrink-0 bg-white space-y-2">
                {cashSessionActive === false && (
                  <div className={AMBER_NOTE}>
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>Sin arqueo activo — la venta se registrará sin sesión de caja</span>
                  </div>
                )}
                {error && (
                  <div className={AMBER_NOTE}>
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span className="font-semibold">{error}</span>
                  </div>
                )}
                {dteIsConfigured && orderId && (
                  <EmitBoletaButton
                    orderId={orderId}
                    isConfigured={true}
                    onEmitted={() => {}}
                  />
                )}
                <button
                  onClick={handleConfirm}
                  disabled={confirmBlocked}
                  className="w-full min-h-[52px] rounded-xl bg-[#F97316] hover:bg-orange-600 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      Procesando...
                    </>
                  ) : (
                    <>Cobrar <span className="font-black">${fmt(finalTotal)}</span></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {pinModal}
    </>,
    document.body
  );
};

export default PaymentModal;
