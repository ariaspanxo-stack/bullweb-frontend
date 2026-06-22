import { useState, memo, useEffect, useCallback, useRef } from 'react';
import { X, Check, AlertCircle, Plus, Trash2, CreditCard, Banknote, Smartphone, ArrowLeftRight, Tag, ChevronRight, ChevronDown, CheckCircle, Printer, FileText } from 'lucide-react';
import type { Payment, Table, CartItem } from '../../../types/restaurant.types';
import { paymentMethodsService } from '@/services/paymentMethodsService';
import { cashRegistersService } from '@/services/cashRegistersService';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { LoyaltyPanel } from '@/components/pos/LoyaltyPanel';
import { useAuthStore } from '@/store/authStore';
import { useRestaurant } from '../../../contexts/RestaurantContext';
import { EmitBoletaButton } from '../../../components/pos/EmitBoletaButton';

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
  onClose: () => void;
  onConfirm: (payments: Payment[], tip: number, discount?: { type: 'PERCENTAGE' | 'FIXED'; value: number }) => Promise<void>;
}

type Medium = string;

interface Row {
  id: number;
  method: Medium;   // UUID del payment_method en la BD
  amount: string;
}

/** Ícono para método de pago */
function methodIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('efectivo') || n.includes('cash')) return Banknote;
  if (n.includes('tarjeta') || n.includes('crédit') || n.includes('credit')) return CreditCard;
  if (n.includes('débit') || n.includes('debit')) return CreditCard;
  if (n.includes('transfer')) return ArrowLeftRight;
  return Smartphone;
}

/** Clases del select según método seleccionado */
function methodSelectClasses(name: string, hasValue: boolean): string {
  if (!hasValue) return 'border-2 border-gray-200 bg-white text-gray-400';
  const n = name.toLowerCase();
  if (n.includes('efectivo') || n.includes('cash'))                          return 'border-2 border-emerald-400 bg-emerald-50 text-emerald-800';
  if (n.includes('débit') || n.includes('debit') || n.includes('debito'))    return 'border-2 border-cyan-400 bg-cyan-50 text-cyan-800';
  if (n.includes('crédit') || n.includes('credit') || n.includes('tarjeta')) return 'border-2 border-blue-400 bg-blue-50 text-blue-800';
  if (n.includes('transfer'))                                                 return 'border-2 border-violet-400 bg-violet-50 text-violet-800';
  return 'border-2 border-slate-400 bg-slate-100 text-slate-800';
}

/** Color del ícono del método */
function methodIconColor(name: string, hasValue: boolean): string {
  if (!hasValue) return 'text-gray-400';
  const n = name.toLowerCase();
  if (n.includes('efectivo') || n.includes('cash'))                          return 'text-emerald-600';
  if (n.includes('débit') || n.includes('debit') || n.includes('debito'))    return 'text-cyan-600';
  if (n.includes('crédit') || n.includes('credit') || n.includes('tarjeta')) return 'text-blue-600';
  if (n.includes('transfer'))                                                 return 'text-violet-600';
  return 'text-slate-600';
}

const fmt = (n: number) => Math.round(Math.abs(n)).toLocaleString('es-CL');

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
  const hasMethod = !!row.method;
  return (
    <div className="flex items-center gap-1.5">
      {/* Selector de método — una sola celda */}
      <div className="relative flex-shrink-0">
        <Icon
          size={12}
          className={`absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${
            methodIconColor(selectedName, hasMethod)
          }`}
        />
        <select
          value={row.method}
          onChange={e => onMethod(e.target.value)}
          className={`appearance-none pl-8 pr-6 py-2 rounded-xl border-2 text-[11px] font-black cursor-pointer focus:outline-none transition-all ${
            methodSelectClasses(selectedName, hasMethod)
          }`}
        >
          <option value="" disabled>Método...</option>
          {activeMethods.map(m => (
            <option key={m.code} value={m.code}>{m.name}</option>
          ))}
        </select>
        <ChevronDown
          size={10}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${
            methodIconColor(selectedName, hasMethod)
          } opacity-60`}
        />
      </div>
      {/* Input de monto */}
      <div className="relative flex-1">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold pointer-events-none">$</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          placeholder={placeholder}
          value={row.amount}
          onChange={e => onAmount(e.target.value)}
          onFocus={e => e.target.select()}
          className="w-full pl-7 pr-2 py-2 border-2 border-gray-200 rounded-xl text-base font-black text-gray-900 focus:outline-none focus:border-slate-400 bg-white transition-colors"
        />
      </div>
      {quickFill !== undefined && quickFill > 0 && (
        <button
          type="button"
          onClick={() => onAmount(String(quickFill))}
          className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[11px] font-bold text-slate-700 whitespace-nowrap transition-colors flex items-center gap-0.5 flex-shrink-0"
        >
          <ChevronRight size={11} />Exacto
        </button>
      )}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
});

export const PaymentModal = ({
  table,
  total,
  subtotal,
  tax,
  deliveryFee = 0,
  items = [],
  orderNumber,
  customerId,
  customerName,
  initialDiscount,
  orderId,
  orderType,
  onClose,
  onConfirm,
}: PaymentModalProps) => {
  const authUser = useAuthStore(s => s.user);
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

  // ── Descuento — inicializado desde prop al montar (solo una vez)
  const [discountEnabled, setDiscountEnabled] = useState(() => !!initialDiscount);
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>(() => initialDiscount?.type ?? 'PERCENTAGE');
  const [discountValue, setDiscountValue] = useState(() => initialDiscount ? String(initialDiscount.value) : '');

  // ── Cupón ────────────────────────────────────────────────────
  const [couponCode,      setCouponCode]      = useState('');
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
  const [couponLoading,   setCouponLoading]   = useState(false);
  const [couponMsg,       setCouponMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  const handleValidateCoupon = useCallback(async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await api.post('/coupons/validate/code', { code: couponCode.trim(), orderTotal: total }) as { data: { valid: boolean; reason?: string; discountAmount?: number; coupon?: { id: string; type: string; value: number } } };
      const d = res.data;
      if (d.valid && d.coupon && d.discountAmount !== undefined) {
        setDiscountEnabled(true);
        setDiscountType(d.coupon.type as 'PERCENTAGE' | 'FIXED');
        setDiscountValue(String(d.coupon.type === 'PERCENTAGE' ? d.coupon.value : d.discountAmount));
        setAppliedCouponId(d.coupon.id);
        setCouponMsg({ ok: true, text: `Cupón aplicado: -$${Math.round(d.discountAmount).toLocaleString('es-CL')}` });
      } else {
        setAppliedCouponId(null);
        setCouponMsg({ ok: false, text: d.reason ?? 'Cupón inválido' });
      }
    } catch {
      setAppliedCouponId(null);
      setCouponMsg({ ok: false, text: 'Error al validar cupón' });
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, total]);

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

  const discountAmount = (() => {
    const v = parseFloat(discountValue) || 0;
    if (!discountEnabled || v <= 0) return 0;
    if (discountType === 'PERCENTAGE') return Math.round(effectiveTotal * Math.min(v, 100) / 100);
    return Math.min(Math.round(v), effectiveTotal);
  })();

  const tipTotal = tipRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const payTotal = payRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const finalTotal = effectiveTotal - discountAmount + tipTotal;
  const balance = payTotal - finalTotal; // negativo = falta, positivo = vuelto

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

  // callbacks estables para no recrear RowInput en cada render
  const handleConfirm = async () => {
    setError('');
    if (payTotal < finalTotal - 0.5) {
      setError(`Faltan $${fmt(finalTotal - payTotal)} para completar el cobro`);
      return;
    }
    const payments: Payment[] = payRows
      .filter(r => parseFloat(r.amount) > 0)
      .map(r => ({ method: r.method, amount: Math.round(parseFloat(r.amount)) }));
    if (payments.length === 0) {
      setError('Ingresa al menos un monto de pago');
      return;
    }
    try {
      setLoading(true);
      const discountPayload = discountEnabled && discountAmount > 0
        ? { type: discountType, value: parseFloat(discountValue) || 0 }
        : undefined;
      await onConfirm(payments, Math.round(tipTotal), discountPayload);
      setPaymentCompleted(true);
      // CRÍTICO 1: incrementar uso del cupón al confirmar el pago
      if (appliedCouponId) {
        try {
          await api.post(`/coupons/${appliedCouponId}/use`);
        } catch {
          // no bloquear el flujo de pago si esto falla
        }
        setAppliedCouponId(null);
      }
    } catch (e: any) {
      setError(e.message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  if (paymentCompleted) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">¡Pago Exitoso!</h3>
          <p className="text-sm text-gray-500 mb-6">La orden ha sido cobrada correctamente</p>
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
            className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
          style={{ height: 'min(92vh, 780px)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex-shrink-0 bg-gradient-to-br from-slate-800 to-slate-900 text-white px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold leading-none">
                  {table ? `Mesa ${table.number}` : 'Finalizar Venta'}
                </p>
                {orderNumber && <p className="text-slate-500 text-[10px] mt-0.5">{orderNumber}</p>}
              </div>
              <div className="flex items-baseline gap-1.5">
                {discountAmount > 0 && (
                  <span className="text-slate-500 text-sm line-through">${fmt(total)}</span>
                )}
                <span className="text-2xl font-black text-white tracking-tight">${fmt(finalTotal)}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>

          {/* BODY */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* ── COLUMNA IZQUIERDA: Resumen fijo ── */}
            <div className="w-[38%] border-r border-gray-100 flex flex-col bg-gray-50 min-h-0">
              <div className="px-3 pt-3 pb-1.5 flex-shrink-0 flex items-center gap-1.5">
                <div className="w-4 h-4 bg-slate-800 rounded flex items-center justify-center">
                  <Tag size={9} className="text-white" />
                </div>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Cuenta</p>
              </div>

              {/* Items scrollable */}
              <div className="flex-1 overflow-y-auto px-2.5 pb-1 space-y-1 min-h-0">
                {items.length === 0 && (
                  <p className="text-xs text-gray-400 text-center pt-3">Sin items</p>
                )}
                {items.map((item, i) => {
                  const cancelled = !!(item as any).isCancelled;
                  return (
                  <div
                    key={item.id ?? i}
                    className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 border ${
                      cancelled
                        ? 'bg-red-50/60 border-red-100 opacity-60'
                        : 'bg-white border-gray-100'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center flex-shrink-0 ${
                      cancelled ? 'bg-red-200 text-red-600' : 'bg-slate-800 text-white'
                    }`}>
                      {item.quantity}
                    </span>
                    <span className={`flex-1 text-xs font-medium leading-snug truncate ${
                      cancelled ? 'text-red-500 line-through' : 'text-gray-800'
                    }`}>{item.productName}</span>
                    <span className={`font-black text-xs whitespace-nowrap ${
                      cancelled ? 'text-red-400 line-through' : 'text-gray-900'
                    }`}>
                      ${fmt(item.total ?? item.subtotal ?? 0)}
                    </span>
                    {cancelled && (item as any).cancelReason && (
                      <span className="text-[9px] text-red-500 font-semibold flex-shrink-0" title={(item as any).cancelReason}>
                        ✕
                      </span>
                    )}
                  </div>
                  );
                })}
              </div>

              {/* Totales fijos */}
              <div className="px-2.5 py-2 border-t border-gray-200 space-y-1 flex-shrink-0">
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>Costo de envío</span><span>${fmt(deliveryFee)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[11px] text-red-600 font-bold">
                    <span>Descuento{discountType === 'PERCENTAGE' ? ` ${discountValue}%` : ''}</span>
                    <span>-${fmt(discountAmount)}</span>
                  </div>
                )}
                {tipTotal > 0 && (
                  <div className="flex justify-between text-[11px] text-amber-600 font-bold">
                    <span>Propina</span><span>+${fmt(tipTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-1.5 border-t border-gray-300">
                  <span className="text-sm font-black text-gray-600 uppercase tracking-wider">Total</span>
                  <span className="text-2xl font-black text-slate-900">${fmt(finalTotal)}</span>
                </div>
              </div>
            </div>

            {/* ── COLUMNA DERECHA: Transacciones ── */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-3.5 pt-3 pb-2 space-y-2.5 min-h-0">

                {/* DESCUENTO */}
                {canApplyDiscount && <section className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-red-100 flex items-center justify-center">
                        <Tag size={10} className="text-red-500" />
                      </div>
                      <p className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Descuento</p>
                    </div>
                    <button
                      onClick={() => { setDiscountEnabled(v => !v); setDiscountValue(''); setAppliedCouponId(null); setCouponMsg(null); }}
                      className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Plus size={10} /> {discountEnabled ? 'Quitar' : 'Agregar'}
                    </button>
                  </div>
                  {!discountEnabled && (
                    <p className="text-[11px] text-gray-400 mt-1">Sin descuento aplicado</p>
                  )}
                  {discountEnabled && (
                    <div className="space-y-1.5 mt-2">
                      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                        <button
                          onClick={() => { setDiscountType('PERCENTAGE'); setDiscountValue(''); }}
                          className={`flex-1 py-1.5 text-[11px] font-black transition-colors ${
                            discountType === 'PERCENTAGE' ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'
                          }`}
                        >% Porcentaje</button>
                        <button
                          onClick={() => { setDiscountType('FIXED'); setDiscountValue(''); }}
                          className={`flex-1 py-1.5 text-[11px] font-black transition-colors ${
                            discountType === 'FIXED' ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'
                          }`}
                        >$ Monto fijo</button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                            {discountType === 'PERCENTAGE' ? '%' : '$'}
                          </span>
                          <input
                            type="number" inputMode="numeric" min="0"
                            max={discountType === 'PERCENTAGE' ? 100 : undefined}
                            placeholder={discountType === 'PERCENTAGE' ? 'Ej: 10' : 'Monto'}
                            value={discountValue}
                            onChange={e => setDiscountValue(e.target.value)}
                            onFocus={e => e.target.select()}
                            className="w-full pl-7 pr-2 py-2 border-2 border-gray-200 rounded-xl text-base font-black text-gray-900 focus:outline-none focus:border-red-400 bg-white"
                          />
                        </div>
                        {discountAmount > 0 && (
                          <span className="text-sm font-black text-red-600 whitespace-nowrap">-${fmt(discountAmount)}</span>
                        )}
                        <button
                          onClick={() => { setDiscountEnabled(false); setDiscountValue(''); setAppliedCouponId(null); setCouponMsg(null); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        ><Trash2 size={13} /></button>
                      </div>
                    </div>
                  )}
                </section>}

                {/* CUPÓN */}
                <section className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-5 h-5 rounded-md bg-purple-100 flex items-center justify-center">
                      <Tag size={10} className="text-purple-500" />
                    </div>
                    <p className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Cupón de descuento</p>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Código del cupón"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponMsg(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleValidateCoupon()}
                      className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-purple-400 bg-white uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleValidateCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-3 py-1.5 text-[11px] font-black text-white bg-purple-500 hover:bg-purple-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {couponLoading ? '…' : 'Aplicar'}
                    </button>
                  </div>
                  {couponMsg && (
                    <p className={`text-[11px] mt-1.5 font-semibold ${couponMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
                      {couponMsg.ok ? '✓' : '✗'} {couponMsg.text}
                    </p>
                  )}
                </section>

                {/* PUNTOS DE FIDELIDAD */}
                {customerId && customerName && (
                  <LoyaltyPanel
                    customerId={customerId}
                    customerName={customerName}
                    onRedeem={(cashDiscount) => {
                      setDiscountEnabled(true);
                      setDiscountType('FIXED');
                      setDiscountValue(String(cashDiscount));
                    }}
                  />
                )}

                {/* PROPINA — solo visible si el canal lo tiene habilitado (o si hay filas ya cargadas) */}
                {(() => {
                  // Mostrar si el tenant tiene propinas en CUALQUIER canal (o ya hay filas manuales)
                  // Ocultar mientras carga para evitar flicker (false por defecto)
                  const anyTipEnabled = tipConfig
                    ? (tipConfig.enabled_dine_in || tipConfig.enabled_counter)
                    : false;
                  if (!anyTipEnabled && tipRows.length === 0) return null;
                  return (
                <section className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center">
                        <Plus size={10} className="text-amber-500" />
                      </div>
                      <p className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Propina</p>
                      {tipConfig && (
                        <span className="text-[10px] text-amber-500 font-semibold">
                          ({tipConfig.tip_percentage}%)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={addTipRow}
                      className="flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 font-bold px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      <Plus size={10} /> Agregar
                    </button>
                  </div>
                  {tipRows.length === 0 && (
                    <p className="text-[11px] text-gray-400 mt-1">Sin propina</p>
                  )}
                  <div className="space-y-2.5 mt-2">
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
                <section className="bg-slate-50 rounded-xl p-2.5 border-2 border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center">
                        <CreditCard size={10} className="text-white" />
                      </div>
                      <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Pago</p>
                    </div>
                    <button
                      onClick={addPayRow}
                      className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-800 font-bold px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <Plus size={10} /> Agregar medio
                    </button>
                  </div>
                  <div className="space-y-3">
                    {payRows.map(r => (
                      <RowInput
                        key={r.id}
                        row={r}
                        onMethod={v => updatePay(r.id, 'method', v)}
                        onAmount={v => updatePay(r.id, 'amount', v)}
                        onRemove={() => removePay(r.id)}
                        canRemove={payRows.length > 1}
                        placeholder={`Total: $${fmt(finalTotal)}`}
                        activeMethods={activeMethods}
                        quickFill={payRows.length === 1 ? Math.round(finalTotal) : Math.round(Math.max(0, finalTotal - payRows.filter(x => x.id !== r.id).reduce((s, x) => s + (parseFloat(x.amount) || 0), 0)))}
                      />
                    ))}
                  </div>
                </section>

                {/* MONITOR DE BALANCE */}
                {payTotal > 0 && (
                  <div
                    className={`rounded-xl px-3 py-2 flex items-center justify-between border-2 transition-all ${
                      balance < -0.5
                        ? 'bg-red-50 border-red-300'
                        : 'bg-emerald-50 border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className={`text-[11px] font-black uppercase tracking-wider ${ balance < -0.5 ? 'text-red-500' : 'text-emerald-600' }`}>
                        {balance < -0.5 ? '⚠ Falta' : '✓ Vuelto'}
                      </p>
                      <p className={`text-xl font-black ${ balance < -0.5 ? 'text-red-600' : 'text-emerald-600' }`}>
                        {balance < -0.5 ? '-' : '+'}${fmt(balance)}
                      </p>
                    </div>
                    {balance >= -0.5 && (
                      <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CTA — siempre visible */}
              <div className="px-3.5 py-2.5 border-t border-gray-100 flex-shrink-0 bg-white">
                {cashSessionActive === false && (
                  <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5 mb-2">
                    <span className="text-yellow-500 text-xs flex-shrink-0">⚠️</span>
                    <p className="text-[11px] text-yellow-700 font-medium">Sin arqueo activo — la venta se registrará sin sesión de caja</p>
                  </div>
                )}
                {error && (
                  <div className="flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mb-2">
                    <AlertCircle size={12} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-700 font-semibold">{error}</p>
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
                  disabled={loading || payTotal < finalTotal - 0.5}
                  className="w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2
                    bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700
                    text-white shadow-lg shadow-emerald-200 transition-all active:scale-[0.99]
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      {table ? 'Cerrar Mesa' : 'Finalizar Venta'} &middot; ${fmt(finalTotal)}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentModal;