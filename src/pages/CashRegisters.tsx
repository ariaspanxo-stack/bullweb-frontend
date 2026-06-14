import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashRegistersService } from '@/services/cashRegistersService';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { CreditCard,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Clock,
  CheckCircle,
  XCircle,
  FileDown,
} from 'lucide-react';
import { ShiftPrinterSelect } from '@/components/cash/ShiftPrinterSelect';
import { OpenShiftModal } from '@/components/cash/OpenShiftModal';
import toast from 'react-hot-toast';
import { exportToExcel } from '@/utils/exportExcel';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtCLP = (n: number | null | undefined) => {
  if (n == null) return '—';
  return `$${Number(n).toLocaleString('es-CL')}`;
};
const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ open }: { open: boolean }) {
  return open ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      <CheckCircle className="w-3 h-3" /> Abierta
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
      <XCircle className="w-3 h-3" /> Cerrada
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CashRegisters() {
  const qc = useQueryClient();
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  const [tab, setTab] = useState<'registers' | 'sessions'>('registers');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [editingRegister, setEditingRegister] = useState<any>(null);
  const [isOpenSessionModal, setIsOpenSessionModal] = useState(false);
  const [isCloseSessionModal, setIsCloseSessionModal] = useState(false);
  const [targetRegister, setTargetRegister] = useState<any>(null);

  // ─── Queries ─────────────────────────────────────────────────
  const { data: registersData, isLoading: loadingRegisters } = useQuery({
    queryKey: ['cash-registers'],
    queryFn: () => cashRegistersService.getRegisters(),
    staleTime: 30_000,
  });

  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ['cash-sessions'],
    queryFn: () => cashRegistersService.getAllSessions(),
    enabled: tab === 'sessions',
    staleTime: 30_000,
  });

  const registersList: any[] = registersData?.registers ?? [];
  const sessionsList: any[] = sessionsData?.sessions ?? [];

  // ─── Mutations ───────────────────────────────────────────────
  const createRegister = useMutation({
    mutationFn: (d: any) => cashRegistersService.createRegister(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-registers'] }); setIsRegisterModalOpen(false); toast.success('Caja creada'); },
    onError: (e: any) => {
      const status = e?.status ?? e?.response?.status;
      if (status === 402 || (e?.message ?? '').includes('l\u00edmite')) {
        toast.error('Plan actual incluye 1 caja. Contacta soporte para agregar m\u00e1s.');
      } else {
        toast.error(e?.message ?? e?.response?.data?.error ?? 'Error al crear');
      }
    },
  });

  const updateRegister = useMutation({
    mutationFn: ({ id, data }: any) => cashRegistersService.updateRegister(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-registers'] }); toast.success('Caja actualizada'); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Error al actualizar'),
  });

  const deleteRegister = useMutation({
    mutationFn: (id: string) => cashRegistersService.deleteRegister(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cash-registers'] }); toast.success('Caja eliminada'); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'No se puede eliminar'),
  });

  const closeSession = useMutation({
    mutationFn: ({ id, data }: any) => cashRegistersService.closeSession(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-registers'] });
      qc.invalidateQueries({ queryKey: ['cash-sessions'] });
      toast.success('Sesión cerrada');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Error al cerrar sesión'),
  });

  // ─── Export ───────────────────────────────────────────────────
  const handleExport = () => {
    const rows = sessionsList.map((s: any) => ({
      Caja: s.register?.name ?? '—',
      Apertura: s.openedAt ? new Date(s.openedAt).toLocaleString('es-CL') : '—',
      Cierre: s.closedAt ? new Date(s.closedAt).toLocaleString('es-CL') : '—',
      'Efectivo apertura': s.openingCash ?? 0,
      'Efectivo cierre': s.closingCash ?? 0,
      Estado: s.status,
      Notas: s.notes ?? '',
    }));
    exportToExcel([{ sheetName: 'Sesiones', rows }], 'sesiones-caja');
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cajas Registradoras</h1>
            <p className="text-sm text-slate-500">Gestiona las cajas y sus sesiones de apertura/cierre</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <FileDown className="w-4 h-4" /> Exportar Excel
          </button>
          {tab === 'registers' && (
            registersList.length >= 1 ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                <span>🔒</span>
                <span className="font-medium">1 caja incluida en tu plan</span>
              </div>
            ) : (
              <Button onClick={() => { setEditingRegister(null); setIsRegisterModalOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Nueva Caja
              </Button>
            )
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['registers', 'sessions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'registers' ? 'Cajas' : 'Sesiones'}
          </button>
        ))}
      </div>

      {/* ─── Tab: Cajas ─────────────────────────────────────── */}
      {tab === 'registers' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loadingRegisters ? (
            <div className="p-8 text-center text-slate-500">Cargando cajas...</div>
          ) : registersList.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No hay cajas registradas.{' '}
              <button className="text-indigo-600 underline" onClick={() => { setEditingRegister(null); setIsRegisterModalOpen(true); }}>
                Crear una
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Sesiones</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Activa</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registersList.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge open={r.isOpen} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r._count?.sessions ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block w-2 h-2 rounded-full ${r.active ? 'bg-green-500' : 'bg-slate-300'}`} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {r.isOpen ? (
                          <button
                            title="Cerrar sesión"
                            className="p-1.5 rounded hover:bg-red-50 text-red-500"
                            onClick={() => { setTargetRegister(r); setIsCloseSessionModal(true); }}
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            title="Abrir sesión"
                            className="p-1.5 rounded hover:bg-green-50 text-green-600"
                            onClick={() => { setTargetRegister(r); setIsOpenSessionModal(true); }}
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          title="Editar"
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-600"
                          onClick={() => { setEditingRegister(r); setIsRegisterModalOpen(true); }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          title="Eliminar"
                          className="p-1.5 rounded hover:bg-red-50 text-red-500"
                          onClick={async () => {
                            const ok = await confirmDialog({ message: `¿Eliminar la caja "${r.name}"?`, confirmLabel: 'Eliminar' });
                            if (ok) deleteRegister.mutate(r.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Tab: Sesiones ──────────────────────────────────── */}
      {tab === 'sessions' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loadingSessions ? (
            <div className="p-8 text-center text-slate-500">Cargando sesiones...</div>
          ) : sessionsList.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No hay sesiones registradas.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Caja</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Apertura</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Cierre</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Efectivo apertura</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Efectivo cierre</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessionsList.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {s.cash_register?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {fmtDate(s.openedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fmtDate(s.closedAt)}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtCLP(s.openingCash)}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtCLP(s.closingCash)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge open={s.status === 'OPEN'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {s.status === 'CLOSED' && (
                        <ShiftPrinterSelect
                          registerId={s.registerId}
                          sessionId={s.id}
                          variant="full"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ─── Modal: Register Create/Edit ────────────────────── */}
      {isRegisterModalOpen && (
        <RegisterModal
          register={editingRegister}
          onClose={() => setIsRegisterModalOpen(false)}
          onSave={(data) => {
            if (editingRegister) {
              updateRegister.mutate({ id: editingRegister.id, data }, {
                onSuccess: () => setIsRegisterModalOpen(false),
              });
            } else {
              createRegister.mutate(data, {
                onSuccess: () => setIsRegisterModalOpen(false),
              });
            }
          }}
          loading={createRegister.isPending || updateRegister.isPending}
        />
      )}

      {/* ─── Modal: Open Session ────────────────────────────── */}
      {isOpenSessionModal && targetRegister && (
        <OpenShiftModal
          register={targetRegister}
          isOpen={isOpenSessionModal}
          onClose={() => setIsOpenSessionModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['cash-registers'] });
            qc.invalidateQueries({ queryKey: ['cash-sessions'] });
            setIsOpenSessionModal(false);
          }}
        />
      )}

      {/* ─── Modal: Close Session ───────────────────────────── */}
      {isCloseSessionModal && targetRegister && (
        <CloseSessionModal
          register={targetRegister}
          onClose={() => setIsCloseSessionModal(false)}
          onSave={(data) => {
            closeSession.mutate({ id: targetRegister.id, data }, {
              onSuccess: () => setIsCloseSessionModal(false),
            });
          }}
          loading={closeSession.isPending}
        />
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ─── RegisterModal ────────────────────────────────────────────────────────────
function RegisterModal({ register, onClose, onSave, loading }: {
  register: any;
  onClose: () => void;
  onSave: (data: any) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    name:   register?.name   ?? '',
    active: register?.active ?? true,
  });
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          {register ? 'Editar Caja' : 'Nueva Caja Registradora'}
        </h2>

        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nombre *</span>
            <input
              type="text"
              value={form.name}
              onChange={e => f('name', e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej: Caja Principal"
            />
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => f('active', e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-slate-700">Caja activa</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">
            Cancelar
          </button>
          <Button
            onClick={() => onSave(form)}
            disabled={!form.name.trim() || loading}
          >
            {loading ? 'Guardando...' : register ? 'Guardar cambios' : 'Crear caja'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── CloseSessionModal ────────────────────────────────────────────────────────
interface CuadreData {
  openingCash: number;
  cashSales: number;
  expectedCash: number;
  totalSales: number;
  byMethod: { method: string; count: number; total: number }[];
}

function CloseSessionModal({ register, onClose, onSave, loading }: {
  register: any;
  onClose: () => void;
  onSave: (data: any) => void;
  loading: boolean;
}) {
  const [closingCash, setClosingCash] = useState('0');
  const [notes, setNotes] = useState('');
  const [cuadre, setCuadre] = useState<CuadreData | null>(null);
  const [cuadreLoading, setCuadreLoading] = useState(true);

  useEffect(() => {
    cashRegistersService.getSessionCuadre(register.id)
      .then((data: any) => setCuadre(data))
      .catch(() => setCuadre(null))
      .finally(() => setCuadreLoading(false));
  }, [register.id]);

  const closing = Number(closingCash) || 0;
  const diff = cuadre ? closing - cuadre.expectedCash : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-red-500" />
          Cerrar Sesión — {register.name}
        </h2>

        {/* Cuadre de caja */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cuadre de caja</p>
          {cuadreLoading ? (
            <p className="text-sm text-slate-400 text-center py-2">Calculando cuadre...</p>
          ) : cuadre ? (
            <>
              {/* Por método */}
              {cuadre.byMethod.length > 0 && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-200">
                      <th className="text-left pb-1">Método</th>
                      <th className="text-center pb-1">Pedidos</th>
                      <th className="text-right pb-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cuadre.byMethod.map((m) => (
                      <tr key={m.method} className="border-b border-slate-100 last:border-0">
                        <td className="py-1 text-slate-700 capitalize">{m.method}</td>
                        <td className="py-1 text-center text-slate-500">{m.count}</td>
                        <td className="py-1 text-right font-medium text-slate-800">{fmtCLP(m.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="pt-2 space-y-1 border-t border-slate-200 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Apertura de caja</span>
                  <span>{fmtCLP(cuadre.openingCash)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Ventas en efectivo</span>
                  <span>+ {fmtCLP(cuadre.cashSales)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-900 text-base pt-1">
                  <span>Efectivo esperado</span>
                  <span>{fmtCLP(cuadre.expectedCash)}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">No hay sesión abierta o no se pudieron calcular los datos.</p>
          )}
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Efectivo final en caja ($)</span>
            <input
              type="number"
              min="0"
              value={closingCash}
              onChange={e => setClosingCash(e.target.value)}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          {/* Diferencia en tiempo real */}
          {cuadre && diff !== null && (
            <div className={`flex justify-between items-center text-sm font-semibold px-3 py-2 rounded-lg ${
              diff === 0 ? 'bg-green-50 text-green-700' :
              diff > 0  ? 'bg-blue-50 text-blue-700' :
                          'bg-red-50 text-red-700'
            }`}>
              <span>{diff > 0 ? 'Sobrante' : diff < 0 ? 'Faltante' : 'Cuadrado'}</span>
              <span>{diff >= 0 ? '+' : ''}{fmtCLP(diff)}</span>
            </div>
          )}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Notas</span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50">
            Cancelar
          </button>
          <Button
            onClick={() => onSave({ closingCash: closing, notes: notes || undefined })}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Cerrando...' : 'Cerrar sesión'}
          </Button>
        </div>
      </div>
    </div>
  );
}
