import { useState } from 'react';
import React from 'react';
import { formatSaleNumber } from '@/utils/formatSaleNumber';
import type { Sale } from '@/types/sales.types';
import { QuickActionBar } from './QuickActionBar';
import { StatusBadge } from './StatusBadge';
import { PaymentBreakdown } from './PaymentBreakdown';
import { SmartSuggestions } from './SmartSuggestions';
import { User, MapPin, FileText, Users, Calendar, X, CheckCircle, XCircle, CreditCard, Clock, AlertCircle, Tag, Gift, ChefHat, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import salesService from '@/services/salesService';
import { ReprintModal } from '@/components/print/ReprintModal';

interface SaleDetailPanelProps {
  sale: Sale | null;
  onRefresh?: () => void;
}

export function SaleDetailPanel({ sale, onRefresh }: SaleDetailPanelProps) {
  const navigate = useNavigate();

  // Estado modales inline
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payReference, setPayReference] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showReprintModal, setShowReprintModal] = useState(false);

  // Estado modal edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editPersons, setEditPersons] = useState(1);
  const [editSaving, setEditSaving] = useState(false);

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  // HANDLERS para QuickActionBar
  const handlePay = async () => {
    if (!sale) return;
    setPayAmount(String(sale.total));
    setPayMethod('CASH');
    setPayReference('');
    setShowPayModal(true);
  };

  const handleConfirmPay = async () => {
    if (!sale) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    try {
      setPayLoading(true);
      await salesService.addPayment(sale.id, {
        method: payMethod,
        amount,
        reference: payReference || undefined,
      });
      toast.success('Pago registrado');
      setShowPayModal(false);
      onRefresh?.();
    } catch (e: any) {
      toast.error(e?.message || 'Error al registrar pago');
    } finally {
      setPayLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!sale) return;
    // Fix #4 — verifica que haya pago suficiente antes de cerrar
    const totalPaid = (sale.payments ?? []).reduce((s: number, p: any) => s + p.amount, 0);
    const faltante = sale.total - totalPaid;
    if (faltante > 0) {
      toast.error(`La orden no está completamente pagada. Falta: ${formatCurrency(faltante)}`);
      setPayAmount(String(faltante));
      setPayMethod('CASH');
      setShowPayModal(true);
      return;
    }
    try {
      await salesService.closeSale(sale.id);
      toast.success(`Venta ${formatSaleNumber(sale.saleNumber)} confirmada`);
      onRefresh?.();
    } catch (e: any) {
      const status = (e as any)?.response?.status;
      if (status === 422) {
        toast.error((e as any)?.response?.data?.message ?? 'Pago insuficiente para cerrar');
        setShowPayModal(true);
      } else {
        toast.error(e?.message || 'Error al confirmar venta');
      }
    }
  };

  // Fix #2 — abre ReprintModal con selector de impresora
  const handlePrint = () => {
    if (!sale?.id) return;
    setShowReprintModal(true);
  };

  const handleEdit = () => {
    if (!sale) return;
    setEditNotes((sale as any).notes ?? '');
    setEditPersons(sale.numberOfPeople || 1);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!sale) return;
    setEditSaving(true);
    try {
      await salesService.updateSale(sale.id, {
        notes:   editNotes || undefined,
        persons: editPersons,
      });
      toast.success('Venta actualizada');
      setShowEditModal(false);
      onRefresh?.();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!sale) return;
    setCancelReason('');
    setShowCancelModal(true);
  };

  // Usa /anular para ventas cerradas (PAID/closed), DELETE para ventas abiertas
  const handleConfirmCancel = async () => {
    if (!sale || !cancelReason.trim()) return;
    try {
      setCancelLoading(true);
      if (sale.status === 'closed') {
        // Venta pagada → anular (queda en DB como ANULADA)
        await salesService.anularSale(sale.id, cancelReason);
      } else {
        // Venta abierta → cancelar (flujo original)
        await salesService.cancelSale(sale.id, cancelReason);
      }
      toast.success(`Venta ${formatSaleNumber(sale.saleNumber)} anulada`);
      setShowCancelModal(false);
      onRefresh?.();
    } catch (e: any) {
      const status = (e as any)?.response?.status;
      if (status === 409) {
        toast.error((e as any)?.response?.data?.error || 'No se puede anular esta venta');
      } else {
        toast.error(e?.message || 'Error al anular venta');
      }
    } finally {
      setCancelLoading(false);
    }
  };

  const canCancel = sale
    ? !['cancelled', 'CANCELLED', 'ANULADA'].includes(sale.status ?? '')
    : false;

  if (!sale) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 flex items-center justify-center h-full">
        <div className="text-center text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Selecciona una venta</p>
          <p className="text-sm mt-1">para ver el detalle completo</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900">
            Venta {formatSaleNumber(sale.saleNumber)}
          </h3>
          <StatusBadge status={sale.status as import('@/types/sales.types').SaleStatus} />
        </div>
        <p className="text-sm text-gray-500">
          <Calendar className="w-3 h-3 inline mr-1" />
          {formatDateTime(sale.startTime)}
        </p>
      </div>

      {/* QUICK ACTIONS BAR */}
      <QuickActionBar
        sale={sale}
        onPrint={handlePrint}
        onEdit={handleEdit}
        onCancel={canCancel ? handleCancel : undefined}
      />

      {/* METADATA */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            <span>Mesa:</span>
          </div>
          <span className="font-medium text-gray-900">
            {sale.tableNumber || 'N/A'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <User className="w-4 h-4 mr-2" />
            <span>Garzón:</span>
          </div>
          <span className="font-medium text-gray-900">
            {sale.waiterName}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            <span>Cliente:</span>
          </div>
          <span className="font-medium text-gray-900">
            {sale.customerName || 'Público'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            <span>Personas:</span>
          </div>
          <span className="font-medium text-gray-900">
            {sale.numberOfPeople || 1}
          </span>
        </div>
      </div>

      {/* ÍTEMS - SCROLL INDEPENDIENTE */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Ítems Ordenados
        </h4>
        <div className="space-y-3">
          {sale.items.length > 0 ? (
            sale.items.map((item) => (
            <div 
              key={item.id} 
              className="border-l-3 border-l-orange-400 pl-3 pb-3 border-b border-gray-100 last:border-b-0"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    <span className="inline-block w-6 text-orange-600 font-semibold">
                      {item.quantity}x
                    </span>
                    {item.productName}
                  </p>
                  
                  {/* MODIFICADORES */}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="mt-1 ml-6 space-y-0.5">
                      {item.modifiers.map((mod, idx) => (
                        <p key={idx} className="text-xs text-orange-600">
                          • {typeof mod === 'string' ? mod : mod.name}
                        </p>
                      ))}
                    </div>
                  )}
                  
                  {/* NOTAS */}
                  {item.notes && (
                    <p className="text-xs text-gray-500 mt-1 ml-6 italic">
                      📝 {item.notes}
                    </p>
                  )}
                </div>
                
                <p className="font-semibold text-gray-900 ml-3 whitespace-nowrap">
                  {formatCurrency(item.total)}
                </p>
              </div>
              
              {/* PRECIO UNITARIO */}
              <p className="text-xs text-gray-500 ml-6">
                {formatCurrency(item.unitPrice)} c/u
              </p>
            </div>
          ))
          ) : (sale as any).cancelledItems?.length > 0 ? (
            <>
              <div className="mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-500 font-medium">Ítems al momento de anular</span>
              </div>
              {(sale as any).cancelledItems.map((item: any, i: number) => (
                <div key={i} className="border-l-3 border-l-red-300 pl-3 pb-3 border-b border-gray-100 last:border-b-0 opacity-70">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm text-gray-500 line-through">
                      <span className="inline-block w-6 text-red-400 font-semibold">{item.quantity}x</span>
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-400 line-through ml-3 whitespace-nowrap">
                      {formatCurrency(item.subtotal)}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 ml-6">{formatCurrency(item.unitPrice)} c/u</p>
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">Sin detalle de ítems disponible</p>
          )}
        </div>

        {/* PAYMENT BREAKDOWN - FASE 3 */}
        {sale.payments && sale.payments.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <PaymentBreakdown sale={sale} />
          </div>
        )}

        {/* AUDIT LOG MEJORADO — Mejora #7 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-1">
            <Clock className="w-4 h-4" /> Historial de Eventos
          </h4>
          {(() => {
            type AuditEntry = { icon: React.ReactNode; label: string; detail?: string; time?: Date; colorClass: string };
            const entries: AuditEntry[] = [];

            // 1 — Creación
            entries.push({
              icon: <FileText className="w-3.5 h-3.5" />,
              label: 'Venta creada',
              detail: sale.waiterName ? `por ${sale.waiterName}` : undefined,
              time:  sale.startTime ? new Date(sale.startTime) : undefined,
              colorClass: 'bg-blue-100 text-blue-700',
            });

            // 2 — Pagos
            (sale.payments ?? []).forEach(p => {
              entries.push({
                icon: <CreditCard className="w-3.5 h-3.5" />,
                label: `Pago registrado — ${p.method}`,
                detail: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(p.amount),
                time:  p.createdAt ? new Date(p.createdAt) : undefined,
                colorClass: 'bg-green-100 text-green-700',
              });
            });

            // 2b — Enviado a cocina (campo opcional del backend)
            if ((sale as any).sentToKitchenAt) {
              entries.push({
                icon: <ChefHat className="w-3.5 h-3.5" />,
                label: 'Enviado a cocina',
                time:  new Date((sale as any).sentToKitchenAt),
                colorClass: 'bg-orange-100 text-orange-700',
              });
            }

            // 2c — Descuento aplicado
            if (sale.discount > 0) {
              const dscFmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(sale.discount);
              entries.push({
                icon: <Tag className="w-3.5 h-3.5" />,
                label: 'Descuento aplicado',
                detail: sale.discountType === 'PERCENTAGE'
                  ? `${dscFmt} (porcentaje)`
                  : dscFmt,
                time: (sale as any).discountedAt
                  ? new Date((sale as any).discountedAt)
                  : sale.startTime ? new Date(sale.startTime) : undefined,
                colorClass: 'bg-purple-100 text-purple-700',
              });
            }

            // 2d — Propinas registradas
            if ((sale.tips ?? []).length > 0) {
              const tipTotal = (sale.tips ?? []).reduce((s, t) => s + t.amount, 0);
              entries.push({
                icon: <Gift className="w-3.5 h-3.5" />,
                label: 'Propina registrada',
                detail: new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(tipTotal),
                time: sale.closedAt ? new Date(sale.closedAt) : undefined,
                colorClass: 'bg-yellow-100 text-yellow-700',
              });
            }

            // 3 — Cierre
            if (sale.closedAt) {
              entries.push({
                icon: <CheckCircle className="w-3.5 h-3.5" />,
                label: 'Venta cerrada / confirmada',
                time:  new Date(sale.closedAt),
                colorClass: 'bg-emerald-100 text-emerald-700',
              });
            }

            // 4 — Cancelación
            if (sale.cancelledAt || sale.cancel_reason || sale.cancelled_by) {
              entries.push({
                icon: <XCircle className="w-3.5 h-3.5" />,
                label: 'Venta anulada',
                detail: [
                  sale.cancelled_by ? `por ${sale.cancelled_by}` : null,
                  sale.cancel_reason ? `"${sale.cancel_reason}"` : null,
                ].filter(Boolean).join(' — ') || undefined,
                time:  sale.cancelledAt ? new Date(sale.cancelledAt) : undefined,
                colorClass: 'bg-red-100 text-red-700',
              });
            } else if (sale.status === 'cancelled' || sale.status === 'CANCELLED') {
              entries.push({
                icon: <AlertCircle className="w-3.5 h-3.5" />,
                label: 'Venta en estado CANCELADO',
                colorClass: 'bg-red-100 text-red-700',
              });
            }

            // Ordenar por fecha
            entries.sort((a, b) => {
              if (!a.time && !b.time) return 0;
              if (!a.time) return 1;
              if (!b.time) return -1;
              return a.time.getTime() - b.time.getTime();
            });

            return (
              <div className="relative pl-4">
                {/* Línea vertical */}
                <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200" />

                <div className="space-y-3">
                  {entries.map((e, i) => (
                    <div key={i} className="relative flex items-start gap-3">
                      {/* Dot en la línea */}
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center -ml-1 ${e.colorClass}`}>
                        {e.icon}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm font-medium text-gray-800">{e.label}</p>
                        {e.detail && <p className="text-xs text-gray-500 mt-0.5 truncate">{e.detail}</p>}
                        {e.time && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(e.time)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* PROPINAS */}
        {sale.tips && sale.tips.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Propinas
            </h4>
            <div className="space-y-2">
              {sale.tips.map((tip) => (
                <div key={tip.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {tip.waiterName}
                  </span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(tip.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* SMART SUGGESTIONS - FASE 4 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <SmartSuggestions sale={sale} />
        </div>      </div>

      {/* TOTALIZADOR (FOOTER FIJO) */}
      <div className="bg-gray-800 p-4 border-t border-gray-700">
        <div className="space-y-2">
          {/* Subtotal */}
          <div className="flex justify-between text-sm text-gray-300">
            <span>Subtotal:</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>

          {/* Descuento */}
          {sale.discount > 0 && (
            <div className="flex justify-between text-sm text-green-300">
              <span>Descuento:</span>
              <span>- {formatCurrency(sale.discount)}</span>
            </div>
          )}

          {/* Impuestos */}
          {sale.tax > 0 && (
            <div className="flex justify-between text-sm text-gray-300">
              <span>Impuestos:</span>
              <span>{formatCurrency(sale.tax)}</span>
            </div>
          )}

          {/* Línea divisoria */}
          <div className="border-t border-gray-600 pt-2 mt-2">
            {sale.status === 'cancelled' ? (
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-red-400">TOTAL ANULADO:</span>
                <span className="text-2xl font-bold text-red-400 line-through">
                  {formatCurrency((sale as any).originalTotal ?? sale.total ?? 0)}
                </span>
              </div>
            ) : (
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-white">TOTAL:</span>
              <span className="text-2xl font-bold text-white">
                {formatCurrency(sale.total)}
              </span>
            </div>
            )}
          </div>

          {/* Info adicional */}
          {sale.payments.length > 0 && (
            <div className="pt-2 mt-2 border-t border-gray-700">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Total pagado:</span>
                <span>
                  {formatCurrency(
                    sale.payments.reduce((sum, p) => sum + p.amount, 0)
                  )}
                </span>
              </div>
              {sale.payments.reduce((sum, p) => sum + p.amount, 0) < sale.total && (
                <div className="flex justify-between text-xs text-orange-300 mt-1">
                  <span>Pendiente:</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      sale.total - sale.payments.reduce((sum, p) => sum + p.amount, 0)
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── MODAL PAGO ──────────────────────────────────────── */}
    {showPayModal && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Registrar Pago</h3>
            <button onClick={() => setShowPayModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
              <select
                value={payMethod}
                onChange={e => setPayMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="CASH">Efectivo</option>
                <option value="DEBIT">Débito Transbank</option>
                <option value="CREDIT">Crédito Transbank</option>
                <option value="TRANSFER">Transferencia</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {payMethod !== 'CASH' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia (opcional)</label>
                <input
                  type="text"
                  value={payReference}
                  onChange={e => setPayReference(e.target.value)}
                  placeholder="Nº boleta / comprobante"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setShowPayModal(false)}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmPay}
              disabled={payLoading}
              className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {payLoading ? 'Procesando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── MODAL ANULACIÓN ─────────────────────────────────── */}
    {showCancelModal && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Eliminar Venta</h3>
            <button onClick={() => setShowCancelModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            Indica el motivo de eliminación de la venta <strong>{formatSaleNumber(sale?.saleNumber)}</strong>:
          </p>

          <textarea
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            rows={3}
              placeholder="Motivo de eliminación..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowCancelModal(false)}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={cancelLoading || !cancelReason.trim()}
              className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {cancelLoading ? 'Eliminando...' : 'Eliminar Venta'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── MODAL EDITAR ─────────────────────────────────── */}
    {showEditModal && sale && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-900">
              Editar Venta {formatSaleNumber(sale.saleNumber)}
            </h3>
            <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Nota de la orden */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Nota de la orden
            </label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 resize-none"
              placeholder="Alergias, preferencias..."
            />
          </div>

          {/* Número de personas */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Personas
            </label>
            <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden w-fit">
              <button
                onClick={() => setEditPersons(p => Math.max(1, p - 1))}
                disabled={editPersons <= 1}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-gray-700 font-bold text-lg transition-colors"
              >
                −
              </button>
              <span className="w-12 text-center text-lg font-bold text-gray-900 select-none">
                {editPersons}
              </span>
              <button
                onClick={() => setEditPersons(p => p + 1)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-lg transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Ir al POS si tiene mesa */}
          {(sale.tableId || sale.tableNumber) && (
            <button
              onClick={() => {
                setShowEditModal(false);
                navigate('/restaurant', {
                  state: {
                    openTableId: sale.tableId,
                    openTableNumber: sale.tableNumber,
                    fromSales: true,
                  }
                });
              }}
              className="w-full mb-4 py-2 border border-orange-300 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-50 flex items-center justify-center gap-2"
            >
              Ir al POS para editar ítems
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowEditModal(false)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={editSaving}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60 transition"
            >
              {editSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    )}

    {showReprintModal && sale && (
      <ReprintModal
        open={showReprintModal}
        orderId={sale.id}
        orderNumber={sale.saleNumber}
        onClose={() => setShowReprintModal(false)}
      />
    )}
  </>
  );
}
