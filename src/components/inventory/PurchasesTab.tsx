// LOTE 310: Inventario > Compras con medio de pago, estado y documento.
// Tabla con Medio, Estado y Documento; barra de cuentas por pagar; detalle con "Marcar pagada"; "Registrar factura" que cierra
// guias pendientes de un proveedor; y el modal Nueva Compra. El total y las reglas de pago los valida el servidor.
import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, FileText, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { inventoryService } from '@/services/inventoryService';

export const METHOD_LABEL: Record<string, string> = { CASH: 'Efectivo', TRANSFER: 'Transferencia', CARD: 'Tarjeta', SUPPLIER_CREDIT: 'Crédito proveedor' };
export const DOC_LABEL: Record<string, string> = { GUIDE: 'Guía', INVOICE: 'Factura', RECEIPT: 'Boleta', NONE: 'Sin documento' };
export const STATUS_LABEL: Record<string, string> = { PAID: 'Pagada', PENDING: 'Por pagar', PARTIAL: 'Parcial', OVERDUE: 'Vencida' };

const clp = (n: any) => `$${Math.round(Number(n ?? 0)).toLocaleString('es-CL')}`;
const qty = (n: any) => Math.round(Number(n ?? 0) * 1000) / 1000;
export const todayCL = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
const addDays = (day: string, n: number) => { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const fmtDay = (day?: string | null) => (day ? day.split('-').reverse().join('-') : '—');
const inputCls = 'w-full min-h-[44px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';

/** Estado visible de una compra (o de una fila de la tabla): Vencida si esta abierta y su vencimiento ya paso */
export const statusOf = (p: any): string => {
  if (!p) return 'PAID';
  if (p.paymentStatus !== 'PAID' && p.overdue) return 'OVERDUE';
  return p.paymentStatus ?? 'PAID';
};

const CHIP: Record<string, string> = {
  PAID: 'bg-slate-100 text-slate-700 border-slate-200',
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  PARTIAL: 'bg-blue-50 text-blue-700 border-blue-200',
  OVERDUE: 'bg-red-50 text-red-700 border-red-300',
};
export function StatusChip({ status }: { status: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap ${CHIP[status] ?? CHIP.PAID}`}>{STATUS_LABEL[status] ?? status}</span>;
}

const docText = (p: any) => (p && p.documentType && p.documentType !== 'NONE' ? `${DOC_LABEL[p.documentType] ?? p.documentType}${p.documentNumber ? ` ${p.documentNumber}` : ''}` : '—');

function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 text-slate-900" onClick={onClose}>
      <div role="dialog" aria-label={title} className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200 flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        {footer && <div className="flex-wrap p-5 border-t border-gray-200 flex gap-3 justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ============================================================================
// Pestaña Compras
// ============================================================================
export default function PurchasesTab({ canPurchases }: { canPurchases: boolean }) {
  const queryClient = useQueryClient();
  const [detailRow, setDetailRow] = useState<any>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const { data: purchasesData, isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => inventoryService.getPurchases({ perPage: 50 }),
  });
  const { data: payables } = useQuery({
    queryKey: ['purchases-payables'],
    queryFn: () => inventoryService.getPayables(),
  });
  const list: any[] = Array.isArray(purchasesData) ? purchasesData : (purchasesData as any)?.purchases ?? [];
  const pay: any = payables ?? {};

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['purchases'] });
    queryClient.invalidateQueries({ queryKey: ['purchases-payables'] });
    queryClient.invalidateQueries({ queryKey: ['purchases-open'] });
    queryClient.invalidateQueries({ queryKey: ['purchase-detail'] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-900">Registro de Compras</h2>
      </div>

      {/* Barra de cuentas por pagar */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-wrap items-center justify-between gap-3" data-testid="barra-por-pagar">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-700">
          <span>Por pagar <strong className="font-bold text-gray-900" data-testid="por-pagar">{clp(pay.totalPending)}</strong></span>
          <span className="text-gray-300" aria-hidden>·</span>
          <span>Vencidas <strong className={`font-bold ${Number(pay.totalOverdue) > 0 ? 'text-red-600' : 'text-gray-900'}`} data-testid="vencidas">{clp(pay.totalOverdue)}</strong></span>
        </div>
        {canPurchases && (
          <Button variant="outline" onClick={() => setInvoiceOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Registrar factura
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando compras...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Ingrediente</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Costo/u</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Medio</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Documento</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">No hay compras registradas</td>
                </tr>
              ) : (
                list.map((row: any) => {
                  const pu = row.purchase;
                  return (
                    <tr key={row.id} onClick={() => setDetailRow(row)} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" title="Ver detalle">
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(row.createdAt).toLocaleDateString('es-CL')}</td>
                      <td className="px-4 py-3 font-medium">{row.supplier || pu?.supplier || '—'}</td>
                      <td className="px-4 py-3 text-sm">{row.ingredients?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{qty(row.quantity)} {row.ingredients?.unit ?? ''}</td>
                      <td className="px-4 py-3 text-sm text-gray-600" title={row.lineCost === null || row.lineCost === undefined ? 'Costo promedio actual (compra anterior a los medios de pago)' : undefined}>
                        {clp(row.lineCost ?? row.unitCost)}
                      </td>
                      <td className="px-4 py-3 font-bold">{clp(row.lineTotal ?? row.total)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{pu?.paymentMethod ? METHOD_LABEL[pu.paymentMethod] : '—'}</td>
                      <td className="px-4 py-3"><StatusChip status={statusOf(pu)} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{docText(pu)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {detailRow && <PurchaseDetailModal row={detailRow} canPurchases={canPurchases} onClose={() => setDetailRow(null)} onPaid={refresh} />}
      {invoiceOpen && <InvoiceModal onClose={() => setInvoiceOpen(false)} onDone={() => { refresh(); setInvoiceOpen(false); }} />}
    </div>
  );
}

// ============================================================================
// Detalle de compra + Marcar pagada
// ============================================================================
function PurchaseDetailModal({ row, canPurchases, onClose, onPaid }: { row: any; canPurchases: boolean; onClose: () => void; onPaid: () => void }) {
  const id = row.purchase?.id ?? null;
  const { data: detail, isLoading } = useQuery({
    queryKey: ['purchase-detail', id],
    queryFn: () => inventoryService.getPurchaseDetail(id as string),
    enabled: !!id,
  });
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState('TRANSFER');
  const [paidAt, setPaidAt] = useState(todayCL());
  const [invoice, setInvoice] = useState('');
  const markPaid = useMutation({
    mutationFn: () => inventoryService.markPurchasePaid(id as string, { paymentMethod: method, paidAt, invoiceNumber: invoice.trim() || undefined }),
    onSuccess: () => { toast.success('Compra marcada como pagada'); setPaying(false); onPaid(); },
    onError: (err: any) => toast.error(err.message || 'No se pudo marcar la compra como pagada'),
  });

  if (!id) {
    return (
      <Modal title="Detalle de compra" onClose={onClose} footer={<button type="button" onClick={onClose} className="min-h-[44px] px-4 py-2 text-gray-600 hover:text-gray-900">Cerrar</button>}>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-500">Fecha</dt><dd>{new Date(row.createdAt).toLocaleDateString('es-CL')}</dd>
          <dt className="text-gray-500">Proveedor</dt><dd>{row.supplier || '—'}</dd>
          <dt className="text-gray-500">Ingrediente</dt><dd>{row.ingredients?.name ?? '—'} · {qty(row.quantity)} {row.ingredients?.unit ?? ''}</dd>
          <dt className="text-gray-500">Estado</dt><dd><StatusChip status="PAID" /></dd>
          <dt className="text-gray-500">Documento</dt><dd>—</dd>
        </dl>
        <p className="text-sm text-gray-500">Compra registrada antes de los medios de pago: se considera Pagada.</p>
      </Modal>
    );
  }

  const d: any = detail ?? row.purchase;
  const st = statusOf(d);
  const open = d?.paymentStatus === 'PENDING' || d?.paymentStatus === 'PARTIAL';
  return (
    <Modal
      title="Detalle de compra"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="min-h-[44px] px-4 py-2 text-gray-600 hover:text-gray-900">Cerrar</button>
          {canPurchases && open && !paying && <Button onClick={() => setPaying(true)}>Marcar pagada</Button>}
          {canPurchases && open && paying && (
            <Button onClick={() => markPaid.mutate()} disabled={markPaid.isPending}>{markPaid.isPending ? 'Guardando...' : 'Confirmar pago'}</Button>
          )}
        </>
      }
    >
      {isLoading && !detail ? <div className="text-gray-500 text-sm">Cargando...</div> : null}
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-gray-500">Fecha</dt><dd>{new Date(d.createdAt).toLocaleDateString('es-CL')}</dd>
        <dt className="text-gray-500">Proveedor</dt><dd>{d.supplier || '—'}</dd>
        <dt className="text-gray-500">Medio de pago</dt><dd>{d.paymentMethod ? METHOD_LABEL[d.paymentMethod] : '—'}</dd>
        <dt className="text-gray-500">Estado</dt><dd><StatusChip status={st} /></dd>
        <dt className="text-gray-500">Documento</dt><dd>{docText(d)}</dd>
        <dt className="text-gray-500">Vencimiento</dt><dd className={st === 'OVERDUE' ? 'text-red-600 font-semibold' : ''}>{fmtDay(d.dueDate)}</dd>
        {d.invoiceNumber && (<><dt className="text-gray-500">Factura</dt><dd>{d.invoiceNumber}</dd></>)}
        <dt className="text-gray-500">Total</dt><dd className="font-bold">{clp(d.total)}</dd>
        <dt className="text-gray-500">Pagado</dt><dd className="font-bold">{clp(d.paidAmount)}</dd>
        <dt className="text-gray-500">Pendiente</dt><dd className="font-bold">{clp(d.pendingAmount)}</dd>
      </dl>
      {Array.isArray(detail?.items) && detail.items.length > 0 && (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-gray-500 uppercase"><th className="py-1">Ingrediente</th><th className="py-1">Cant.</th><th className="py-1">Costo/u</th><th className="py-1 text-right">Total</th></tr></thead>
          <tbody>
            {detail.items.map((it: any, i: number) => (
              <tr key={i} className="border-t border-gray-100"><td className="py-1">{it.name}</td><td className="py-1">{qty(it.quantity)} {it.unit}</td><td className="py-1">{clp(it.cost)}</td><td className="py-1 text-right font-bold">{clp(it.total)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      {d.notes && <p className="text-sm text-gray-500">{d.notes}</p>}
      {paying && (
        <div className="space-y-3 border-t border-gray-200 pt-3">
          <div>
            <label htmlFor="mp-medio" className="block text-sm font-medium text-gray-700 mb-1">¿Cómo se pagó?</label>
            <select id="mp-medio" value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
              <option value="TRANSFER">Transferencia</option><option value="CASH">Efectivo</option><option value="CARD">Tarjeta</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="mp-fecha" className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago</label>
              <input id="mp-fecha" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="mp-factura" className="block text-sm font-medium text-gray-700 mb-1">N° factura (opcional)</label>
              <input id="mp-factura" value={invoice} onChange={(e) => setInvoice(e.target.value)} className={inputCls} />
            </div>
          </div>
          <p className="text-sm text-gray-700">Se paga <strong className="font-bold">{clp(d.pendingAmount)}</strong> pendiente.</p>
        </div>
      )}
    </Modal>
  );
}

// ============================================================================
// Registrar factura: cierra guias pendientes de un proveedor
// ============================================================================
function InvoiceModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['purchases-open'], queryFn: () => inventoryService.getOpenPurchases() });
  const open: any[] = Array.isArray(data) ? data : [];
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; name: string; items: any[] }>();
    for (const p of open) {
      const g = m.get(p.supplierKey) ?? { key: p.supplierKey, name: p.supplier || 'Sin proveedor', items: [] as any[] };
      g.items.push(p);
      m.set(p.supplierKey, g);
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [open]);
  const [key, setKey] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [invoice, setInvoice] = useState('');
  const [method, setMethod] = useState('TRANSFER');
  const [paidAt, setPaidAt] = useState(todayCL());
  useEffect(() => { setSel([]); }, [key]);
  const group = groups.find((g) => g.key === key);
  const selTotal = (group?.items ?? []).filter((p) => sel.includes(p.id)).reduce((s, p) => s + Number(p.pendingAmount ?? 0), 0);
  const close = useMutation({
    mutationFn: () => inventoryService.closeWithInvoice({ purchaseIds: sel, invoiceNumber: invoice.trim(), paymentMethod: method, paidAt }),
    onSuccess: (r: any) => { toast.success(`Factura ${invoice.trim()} registrada: ${r?.closed ?? sel.length} compra${(r?.closed ?? sel.length) === 1 ? '' : 's'} pagada${(r?.closed ?? sel.length) === 1 ? '' : 's'}`); onDone(); },
    onError: (err: any) => toast.error(err.message || 'No se pudo registrar la factura'),
  });
  const submit = () => {
    if (!sel.length) return toast.error('Marca al menos una compra pendiente');
    if (!invoice.trim()) return toast.error('Indica el número de factura');
    close.mutate();
  };
  return (
    <Modal
      title="Registrar factura"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="min-h-[44px] px-4 py-2 text-gray-600 hover:text-gray-900">Cancelar</button>
          <Button onClick={submit} disabled={close.isPending || !sel.length}>{close.isPending ? 'Guardando...' : 'Registrar factura'}</Button>
        </>
      }
    >
      {isLoading ? <div className="text-sm text-gray-500">Cargando compras pendientes...</div> : groups.length === 0 ? (
        <p className="text-sm text-gray-500">No hay compras por pagar.</p>
      ) : (
        <>
          <div>
            <label htmlFor="rf-proveedor" className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
            <select id="rf-proveedor" value={key} onChange={(e) => setKey(e.target.value)} className={inputCls}>
              <option value="">Elegir proveedor...</option>
              {groups.map((g) => <option key={g.key} value={g.key}>{g.name} ({g.items.length})</option>)}
            </select>
          </div>
          {group && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">Compras pendientes</p>
              {group.items.map((p) => (
                <label key={p.id} className="flex items-center gap-3 min-h-[44px] px-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-orange-500" checked={sel.includes(p.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))} />
                  <span className="flex-1 text-sm">
                    {new Date(p.createdAt).toLocaleDateString('es-CL')} · {docText(p)} · vence {fmtDay(p.dueDate)}
                  </span>
                  <StatusChip status={statusOf(p)} />
                  <strong className="font-bold text-sm">{clp(p.pendingAmount)}</strong>
                </label>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="rf-numero" className="block text-sm font-medium text-gray-700 mb-1">N° factura</label>
              <input id="rf-numero" value={invoice} onChange={(e) => setInvoice(e.target.value)} className={inputCls} placeholder="Ej: 12345" />
            </div>
            <div>
              <label htmlFor="rf-fecha" className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago</label>
              <input id="rf-fecha" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label htmlFor="rf-medio" className="block text-sm font-medium text-gray-700 mb-1">¿Cómo se pagó?</label>
            <select id="rf-medio" value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
              <option value="TRANSFER">Transferencia</option><option value="CASH">Efectivo</option><option value="CARD">Tarjeta</option>
            </select>
          </div>
          <p className="text-sm text-gray-700">Total a pagar: <strong className="font-bold text-gray-900" data-testid="total-factura">{clp(selTotal)}</strong></p>
        </>
      )}
    </Modal>
  );
}

// ============================================================================
// Nueva Compra
// ============================================================================
export function PurchaseFormModal({ ingredients, onClose, onSubmit, isSubmitting }: { ingredients: any[]; onClose: () => void; onSubmit: (data: any) => void; isSubmitting: boolean }) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierSel, setSupplierSel] = useState(''); // '' = texto libre, '__new__' = crear, o id del proveedor
  const [supplierText, setSupplierText] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ingredientId: '', quantity: '', cost: '' }]);
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('PAID');
  const [paidAmount, setPaidAmount] = useState('');
  const [docType, setDocType] = useState('NONE');
  const [docNumber, setDocNumber] = useState('');
  const [dueDate, setDueDate] = useState(addDays(todayCL(), 30));

  useEffect(() => {
    inventoryService.getSuppliers({ perPage: 500 })
      .then((res: any) => setSuppliers(((res?.suppliers ?? []) as any[]).filter((s) => s?.name)))
      .catch(() => setSuppliers([]));
  }, []);
  useEffect(() => { if (method === 'SUPPLIER_CREDIT') setStatus('PENDING'); }, [method]);

  const addItem = () => setItems((prev) => [...prev, { ingredientId: '', quantity: '', cost: '' }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) => setItems((prev) => { const next = [...prev]; next[i] = { ...next[i], [field]: value }; return next; });
  const validItems = items.filter((it) => it.ingredientId && it.quantity && it.cost);
  const total = Math.round(validItems.reduce((s, it) => s + parseFloat(it.quantity) * parseFloat(it.cost), 0) * 100) / 100;
  const open = status !== 'PAID';

  const createSupplier = async () => {
    const name = newName.trim();
    if (name.length < 2) { toast.error('Escribe el nombre del proveedor'); return; }
    setCreating(true);
    try {
      const s: any = await inventoryService.createSupplier({ name });
      setSuppliers((prev) => [...prev, s].sort((a, b) => String(a.name).localeCompare(String(b.name))));
      setSupplierSel(s.id);
      setNewName('');
      toast.success('Proveedor creado');
    } catch (err: any) {
      toast.error(err.message || 'No se pudo crear el proveedor');
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = () => {
    const invalidCount = items.length - validItems.length;
    if (validItems.length === 0) { toast.error('Agrega al menos un ítem completo: ingrediente, cantidad y costo'); return; }
    if (supplierSel === '__new__') { toast.error('Crea el proveedor o elige otro'); return; }
    if (status === 'PARTIAL') {
      const pa = parseFloat(paidAmount);
      if (!(pa > 0 && pa < total)) { toast.error(`En un pago parcial el monto pagado debe ser mayor a $0 y menor al total (${clp(total)})`); return; }
    }
    if (invalidCount > 0) {
      const ok = window.confirm(`${invalidCount} fila${invalidCount > 1 ? 's' : ''} incompleta${invalidCount > 1 ? 's' : ''} se omitirá${invalidCount > 1 ? 'n' : ''}. ¿Guardar con ${validItems.length} ítem${validItems.length !== 1 ? 's' : ''} válido${validItems.length !== 1 ? 's' : ''}?`);
      if (!ok) return;
    }
    const chosen = suppliers.find((s) => s.id === supplierSel);
    onSubmit({
      supplier: chosen ? chosen.name : supplierText,
      ...(chosen ? { supplierId: chosen.id } : {}),
      notes,
      items: validItems.map((it) => ({ ingredientId: it.ingredientId, quantity: parseFloat(it.quantity), cost: parseFloat(it.cost) })),
      ...(method ? { paymentMethod: method } : {}),
      paymentStatus: status,
      ...(status === 'PARTIAL' ? { paidAmount: parseFloat(paidAmount) } : {}),
      documentType: docType,
      ...(docType !== 'NONE' && docNumber.trim() ? { documentNumber: docNumber.trim() } : {}),
      ...(open && dueDate ? { dueDate } : {}),
    });
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 text-slate-900">
      <div role="dialog" aria-label="Nueva Compra" className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Nueva Compra</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="nc-proveedor" className="block text-sm font-medium text-gray-700">Proveedor</label>
            <select id="nc-proveedor" value={supplierSel} onChange={(e) => setSupplierSel(e.target.value)} className={inputCls}>
              <option value="">Escribir nombre (sin registrar)</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              <option value="__new__">+ Crear nuevo proveedor</option>
            </select>
            {supplierSel === '' && (
              <input type="text" value={supplierText} onChange={(e) => setSupplierText(e.target.value)} className={inputCls} placeholder="Nombre del proveedor (opcional)" />
            )}
            {supplierSel === '__new__' && (
              <div className="flex gap-2">
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className={inputCls} placeholder="Nombre del proveedor nuevo" />
                <Button variant="outline" onClick={createSupplier} disabled={creating}>{creating ? 'Creando...' : 'Crear'}</Button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <label className="block text-sm font-medium text-gray-700">Ítems</label>
              <button type="button" onClick={addItem} className="min-h-[44px] text-sm text-orange-600 hover:text-orange-700 font-medium">+ Agregar ítem</button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_88px_88px_44px] gap-2 text-xs text-gray-500 px-1">
                <span>Ingrediente</span><span>Cantidad</span><span>Costo/u</span><span />
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_88px_88px_44px] gap-2 items-center">
                  <select value={item.ingredientId} onChange={(e) => updateItem(i, 'ingredientId', e.target.value)} className="min-h-[44px] border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                    <option value="">Seleccionar...</option>
                    {ingredients.map((ing: any) => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
                  </select>
                  <input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} placeholder="0" min="0.01" step="0.01" className="min-h-[44px] border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  <input type="number" value={item.cost} onChange={(e) => updateItem(i, 'cost', e.target.value)} placeholder="0" min="0" step="1" className="min-h-[44px] border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  {items.length > 1 ? <button type="button" onClick={() => removeItem(i)} aria-label="Quitar ítem" className="min-h-[44px] text-red-400 hover:text-red-600 text-xl leading-none">×</button> : <span />}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="nc-medio" className="block text-sm font-medium text-gray-700 mb-1">Medio de pago</label>
              <select id="nc-medio" value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                <option value="">Sin indicar</option>
                <option value="CASH">Efectivo</option>
                <option value="TRANSFER">Transferencia</option>
                <option value="CARD">Tarjeta</option>
                <option value="SUPPLIER_CREDIT">Crédito proveedor</option>
              </select>
            </div>
            <div>
              <label htmlFor="nc-estado" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select id="nc-estado" value={status} onChange={(e) => setStatus(e.target.value)} disabled={method === 'SUPPLIER_CREDIT'} className={`${inputCls} disabled:bg-gray-100`}>
                <option value="PAID">Pagada</option>
                <option value="PENDING">Por pagar</option>
                <option value="PARTIAL">Parcial</option>
              </select>
            </div>
          </div>
          {method === 'SUPPLIER_CREDIT' && <p className="text-xs text-gray-500 -mt-2">Con crédito del proveedor la compra queda Por pagar.</p>}
          {status === 'PARTIAL' && (
            <div>
              <label htmlFor="nc-pagado" className="block text-sm font-medium text-gray-700 mb-1">Monto pagado</label>
              <input id="nc-pagado" type="number" min="1" step="1" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className={inputCls} placeholder="0" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="nc-doc" className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
              <select id="nc-doc" value={docType} onChange={(e) => setDocType(e.target.value)} className={inputCls}>
                <option value="NONE">Sin documento</option>
                <option value="GUIDE">Guía de despacho</option>
                <option value="INVOICE">Factura</option>
                <option value="RECEIPT">Boleta</option>
              </select>
            </div>
            <div>
              <label htmlFor="nc-docnum" className="block text-sm font-medium text-gray-700 mb-1">N° documento</label>
              <input id="nc-docnum" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} disabled={docType === 'NONE'} className={`${inputCls} disabled:bg-gray-100`} />
            </div>
          </div>
          {open && (
            <div>
              <label htmlFor="nc-vence" className="block text-sm font-medium text-gray-700 mb-1">Vencimiento</label>
              <input id="nc-vence" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" rows={2} placeholder="Notas adicionales..." />
          </div>
          <p className="text-base text-gray-700 text-right">Total: <strong className="font-bold text-gray-900" data-testid="total-compra">{clp(total)}</strong></p>
        </div>
        <div className="flex-wrap p-6 border-t border-gray-200 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="min-h-[44px] px-4 py-2 text-gray-600 hover:text-gray-900">Cancelar</button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Registrar Compra'}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
