import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Loader2, FileDown, ChevronRight, Check, PlusCircle, Trash2, TrendingUp, TrendingDown, AlertTriangle, Clock, User, Info, Printer } from 'lucide-react';
import { exportSheet } from '@/utils/exportExcel';
import { cashRegistersService } from '@/services/cashRegistersService';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';
import { createPortal } from 'react-dom'; // HOTFIX 299
import { CashMovementModal } from '@/components/cash/CashMovementModal'; // HOTFIX 299

const fmt = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(v);

const fmtDate = (s: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(new Date(s));

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia',
  DEBIT: 'Debito', CREDIT: 'Credito', SODEXO: 'Sodexo',
  TRANSBANK: 'Transbank', SODEXO_APP: 'Sodexo app',
  SODEXO_TARJETA: 'Sodexo tarjeta', OTHER: 'Otro',
};

const calcDuration = (openedAt: string | null | undefined, closedAt?: string | null): string => {
  if (!openedAt) return '-';
  const start = new Date(openedAt).getTime();
  const end   = closedAt ? new Date(closedAt).getTime() : Date.now();
  const diffMs = end - start;
  if (diffMs < 0) return '-';
  const totalMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins  = totalMins % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

// BUG-5: Hook para duración reactiva (sesiones OPEN)
function useElapsedDuration(openedAt: string | null | undefined, isOpen: boolean): string {
  const [dur, setDur] = useState(() => calcDuration(openedAt, null));
  useEffect(() => {
    if (!isOpen || !openedAt) return;
    const update = () => setDur(calcDuration(openedAt, null));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [openedAt, isOpen]);
  return dur || calcDuration(openedAt, null);
}

// BUG-5: Componente LiveDuration para mostrar duración reactiva en tabla
function LiveDuration({ openedAt }: { openedAt: string }) {
  const dur = useElapsedDuration(openedAt, true);
  return <>{dur}</>;
}

export const TabArqueos = () => {
  const qc = useQueryClient();

  const canIncome  = usePermission('cash_movements.income');
  const canExpense = usePermission('cash_movements.expense');

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED' | 'DELETED'>('ALL');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [userAmounts, setUserAmounts] = useState<Record<string, string>>({});
  const [comment, setComment] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteJustification, setDeleteJustification] = useState(''); // HOTFIX 299 (B2-05)
  const [justification, setJustification] = useState('');

  // Modal apertura
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openDate, setOpenDate] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [openMonto, setOpenMonto] = useState('');

  // Modal movimientos manuales (HOTFIX 299: componente compartido CashMovementModal)
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN');

  // Confirmar cierre con diferencia grande
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const DIFF_THRESHOLD = 10000;
  const DELETE_MIN_CHARS = 15; // HOTFIX 299 (B2-05)
  const [displayLimit, setDisplayLimit] = useState(20);

  // Hotfix #254: valores sugeridos al abrir el modal; si el usuario no los
  // edita, la hora de apertura la fija el backend al momento de enviar.
  const openDefaultsRef = useRef<{ date: string; time: string }>({ date: '', time: '' });

  const handleShowOpenModal = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    // Usar fecha y hora LOCAL (no UTC) para que el modal muestre el día correcto en Chile
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    openDefaultsRef.current = { date, time };
    setOpenDate(date);
    setOpenTime(time);
    setOpenMonto('');
    setShowOpenModal(true);
  };

  const { data: sessionsData, isLoading: loadingSessions, error: sessionsError, refetch: refetchSessions } = useQuery({
    queryKey: ['cash-sessions-all'],
    queryFn: async () => {
      // Fix #5 — usa el servicio en lugar de api.get directo
      const raw = await cashRegistersService.getAllSessions({ perPage: 100 });
      if (Array.isArray(raw)) return { sessions: raw };
      if (Array.isArray(raw?.sessions)) return raw;
      if (Array.isArray(raw?.data)) return { sessions: raw.data };
      return { sessions: [] };
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Cargar el register activo para poder abrir sesión aunque no haya historial de sesiones
  const { data: activeRegisterRaw } = useQuery({
    queryKey: ['active-register'],
    queryFn: () => cashRegistersService.getActiveRegister(),
    staleTime: 30_000,
  });

  const allSessions: any[] = sessionsData?.sessions ?? [];
  const sessions = allSessions.filter((s: any) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'DELETED') return !!s.deletedAt;
    return s.status === statusFilter && !s.deletedAt;
  });

  const activeSession = allSessions.find((s: any) => s.status === 'OPEN' && !s.deletedAt);
  const effectiveSelectedId = selectedSessionId ?? activeSession?.id ?? null;
  const selectedSession = allSessions.find((s: any) => s.id === effectiveSelectedId);
  const isActiveSelected = selectedSession?.status === 'OPEN' && !selectedSession?.deletedAt;
  // Fallback al register activo cuando no hay sesiones (tenant nuevo sin historial)
  const fallbackRegisterId: string | undefined =
    activeRegisterRaw?.data?.id ?? activeRegisterRaw?.id;
  const registerId: string | undefined =
    activeSession?.registerId ?? selectedSession?.registerId ?? fallbackRegisterId;

  const { data: cuadre, isLoading: loadingCuadre, refetch: refetchCuadre } = useQuery({
    queryKey: ['cash-cuadre', selectedSession?.id],
    queryFn: () => cashRegistersService.getSessionCuadreById(selectedSession!.id),
    enabled: !!selectedSession?.id,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: selectedSession?.status === 'OPEN' ? 15000 : false,
  });

  const byMethod: any[] = cuadre?.byMethod ?? [];
  const sistemaInicial: number = Number(cuadre?.openingCash ?? selectedSession?.openingCash ?? 0);
  const sistemaIngreso: number = Number(cuadre?.totalSales ?? 0);
  const totalCashIn: number = Number(cuadre?.totalCashIn ?? 0);
  const totalCashOut: number = Number(cuadre?.totalCashOut ?? 0);
  // Hotfix #256: propinas aparte de las ventas; el dinero sí está en caja/medios
  const cuadreTips: any = (cuadre as any)?.tips;
  const tipsByMethod: any[] = cuadreTips?.byMethod ?? [];
  const tipsTotal: number = Number(cuadreTips?.total ?? 0);
  const tipsCash: number = Number(cuadreTips?.cash ?? 0);
  const sistemaTotal: number = sistemaInicial + sistemaIngreso + tipsTotal + totalCashIn - totalCashOut;
  const expectedCash: number = Number(cuadre?.expectedCash ?? sistemaTotal);
  const movements: any[] = cuadre?.movements ?? [];
  // HOTFIX 303 (B4-05): devoluciones registradas al anular ventas pagadas
  const refunds: any[] = (cuadre as any)?.refunds ?? [];
  const totalRefunds: number = Number((cuadre as any)?.totalRefunds ?? 0);
  const cancellations: any = cuadre?.cancellations ?? { count: 0, total: 0 };

  const totalUsuario = Object.values(userAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  // HOTFIX 299 (B2-03): la diferencia del cierre es SOLO efectivo contado - efectivo esperado.
  // Sesion cerrada: se lee session.difference (no se recalcula). Sesion abierta: vista previa con la
  // misma formula del backend, sobre lo declarado en Efectivo.
  const efectivoDeclarado: number = parseFloat(userAmounts['Efectivo'] ?? '') || 0;
  const closedDifference: number | null =
    selectedSession?.difference != null && !isNaN(Number(selectedSession.difference))
      ? Number(selectedSession.difference)
      : null;
  const diferencia: number = isActiveSelected
    ? Math.round(efectivoDeclarado - expectedCash)
    : (closedDifference ?? 0);
  const diffAbsLarge = Math.abs(diferencia) > DIFF_THRESHOLD && !isNaN(diferencia);
  const fmtDiff = (d: number) => (d === 0 ? 'Cuadre' : `${d > 0 ? '+' : '-'}${fmt(Math.abs(d))}`);
  const needsJustification = diffAbsLarge && justification.trim().length < 5;

  // BUG-6: usar snapshot cuando no hay cuadre en vivo
  const liveExpectedCash = cuadre
    ? expectedCash
    : (selectedSession as any)?.snapshotExpectedCash ?? 0;
  const liveVentas = cuadre
    ? sistemaIngreso
    : (selectedSession as any)?.snapshotTotalSales ?? 0;
  const statsCancellations = (cuadre && cancellations?.count > 0)
    ? cancellations
    : { count: 0, total: 0 };

  const buildClosingByMethod = () => {
    const result: Record<string, number> = {};
    Object.entries(userAmounts).forEach(([k, v]) => {
      const n = parseFloat(v);
      if (!isNaN(n) && n >= 0) result[k] = n;
    });
    return result;
  };

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => cashRegistersService.deleteSession(sessionId, deleteJustification.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cash-sessions-all'] });
      qc.invalidateQueries({ queryKey: ['active-register'] });
      setConfirmDeleteId(null);
      setDeleteJustification('');
      if (selectedSessionId === confirmDeleteId) setSelectedSessionId(null);
      toast.success('Arqueo eliminado (visible como tachado).');
    },
    onError: (e: any) => toast.error(e?.data?.error ?? e?.message ?? 'Error al eliminar arqueo'),
  });

  const openMutation = useMutation({
    mutationFn: () => {
      const edited = openDate !== openDefaultsRef.current.date || openTime !== openDefaultsRef.current.time;
      return cashRegistersService.openSession(registerId!, {
        openingCash: parseFloat(openMonto) || 0,
        ...(edited ? { openedAt: new Date(`${openDate}T${openTime}`).toISOString() } : {}),
      });
    },
    onSuccess: (result: any) => {
      qc.invalidateQueries({ queryKey: ['active-register'] });
      qc.invalidateQueries({ queryKey: ['cash-sessions-all'] });
      setShowOpenModal(false);
      toast.success('Caja abierta correctamente.');
      const adopted = result?.adoptedPayments;
      if (adopted?.count > 0) {
        toast.success(`Se sumaron ${adopted.count} cobros previos por $${Math.round(adopted.amount).toLocaleString('es-CL')}`);
      }
    },
    // Hotfix #254: mensaje del backend tal cual (409 caja abierta / 400 hora inválida)
    onError: (e: any) => toast.error(e?.data?.error ?? e?.message ?? 'Error al abrir caja'),
  });

  const closeMutation = useMutation({
    mutationFn: () =>
      // HOTFIX 299: closingCash = efectivo contado; closingByMethod = declarado por medio; esperado = efectivo esperado
      cashRegistersService.closeSession(registerId!, {
        closingCash: efectivoDeclarado,
        notes: comment || undefined,
        closingByMethod: buildClosingByMethod(),
        expectedCash,
        justification: diffAbsLarge ? justification.trim() : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['active-register'] });
      qc.invalidateQueries({ queryKey: ['cash-sessions-all'] });
      qc.invalidateQueries({ queryKey: ['cash-sessions-closed'] });
      qc.invalidateQueries({ queryKey: ['cash-sessions-movements'] });
      setUserAmounts({});
      setComment('');
      setShowCloseConfirm(false);
      toast.success('Arqueo confirmado. Caja cerrada correctamente.');
    },
    onError: (e: any) => toast.error(e?.data?.error ?? e?.response?.data?.error ?? e?.message ?? 'Error al confirmar arqueo'),
  });

  // HOTFIX 271 — imprimir arqueo en la impresora de caja (la de pre-cuenta); sin impresora el backend avisa
  const printArqueoMutation = useMutation({
    mutationFn: (sessionId: string) => cashRegistersService.printArqueo(sessionId),
    onSuccess: (r: any) => toast.success(`${r?.partial ? 'Arqueo parcial' : 'Arqueo'} enviado a ${r?.printer ?? 'la impresora'}.`),
    onError: (e: any) => toast.error(e?.data?.error ?? e?.response?.data?.error ?? e?.message ?? 'No se pudo imprimir el arqueo'),
  });

  const handleConfirmClose = () => {
    if (needsJustification) {
      toast.error('La diferencia supera $10.000. Debes ingresar una justificación de al menos 5 caracteres.');
      return;
    }
    if (diffAbsLarge && !showCloseConfirm) {
      setShowCloseConfirm(true);
      return;
    }
    closeMutation.mutate();
  };

  const handleExport = () => {
    // BUG-2: closingByMethod persistido en la sesión tiene prioridad
    const closingByMethod = (selectedSession as any)?.closingByMethod as Record<string, number> | null | undefined
      ?? cuadre?.closingByMethod as Record<string, number> | null | undefined;
    const rows: any[] = byMethod.map((m: any) => ({
      Metodo: METHOD_LABELS[m.method] ?? m.method,
      Transacciones: m.count,
      'Sistema (CLP)': m.total,
      'Usuario (CLP)': closingByMethod ? (closingByMethod[m.method] ?? 0) : (parseFloat(userAmounts[m.method] ?? '0') || 0),
      'Diferencia (CLP)': (closingByMethod ? (closingByMethod[m.method] ?? 0) : (parseFloat(userAmounts[m.method] ?? '0') || 0)) - m.total,
    }));
    // Hotfix #256: propinas en filas aparte (lo declarado por medio incluye la propina,
    // por eso la fila de propina resta su monto y la suma de diferencias cuadra con el TOTAL)
    for (const t of tipsByMethod) {
      rows.push({
        Metodo: `Propinas - ${METHOD_LABELS[t.method] ?? t.method}`,
        Transacciones: t.count,
        'Sistema (CLP)': t.total,
        'Usuario (CLP)': 0,
        'Diferencia (CLP)': -t.total,
      });
    }
    // HOTFIX 299 (B2-03): el total de todos los medios es informativo; la diferencia del arqueo
    // es solo la de efectivo (session.difference = contado - esperado)
    rows.push({
      Metodo: 'TOTAL (todos los medios)',
      Transacciones: byMethod.reduce((s: number, m: any) => s + m.count, 0),
      'Sistema (CLP)': sistemaTotal,
      'Usuario (CLP)': isActiveSelected
        ? totalUsuario
        : Object.values(((selectedSession as any)?.closingByMethod ?? {}) as Record<string, number>).reduce((s, v) => s + (Number(v) || 0), 0),
      'Diferencia (CLP)': '',
    });
    rows.push({
      Metodo: 'EFECTIVO esperado vs contado',
      Transacciones: '',
      'Sistema (CLP)': isActiveSelected ? expectedCash : ((selectedSession as any)?.snapshotExpectedCash ?? ''),
      'Usuario (CLP)': isActiveSelected ? efectivoDeclarado : (selectedSession?.closingCash ?? ''),
      'Diferencia (CLP)': isActiveSelected ? diferencia : (closedDifference ?? ''),
    });
    const label = selectedSession ? `Arqueo_${selectedSession.openedAt?.slice(0, 10) ?? 'Caja'}` : 'Arqueo_Caja';
    exportSheet(rows, label);
  };

  return (
    <div className="flex bg-gray-100 -m-6" style={{ minHeight: 'calc(100vh - 160px)' }}>

      {/* ── Panel izquierdo ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-gray-200">

        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Arqueos de Caja</h2>
          <div className="flex items-center gap-2">
            {!activeSession && registerId && (
              <button
                onClick={handleShowOpenModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 rounded hover:bg-orange-600 transition-colors"
              >
                <PlusCircle size={13} />
                Nueva Caja
              </button>
            )}
            <button
              onClick={handleExport}
              disabled={!selectedSession || byMethod.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors disabled:opacity-40"
            >
              <FileDown size={13} />
              Exportar
            </button>
            <button
              onClick={() => { refetchSessions(); refetchCuadre(); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 border-b border-gray-200 bg-white">
          {[
            { label: 'Arqueos de Caja',       value: allSessions.filter((s: any) => !s.deletedAt).length + ' Cajas' },
            { label: 'Efectivo esperado',      value: liveExpectedCash > 0 ? fmt(liveExpectedCash) : '-' },
            { label: 'Ventas sesión',          value: liveVentas > 0 ? fmt(liveVentas) : '-' },
            { label: 'Ingresos/Egresos',       value: (totalCashIn > 0 || totalCashOut > 0) ? `+${fmt(totalCashIn)} / -${fmt(totalCashOut)}` : '-' },
            { label: 'Cancelaciones',          value: statsCancellations?.count > 0 ? `${statsCancellations.count} pedidos` : '-' },
          ].map((s, i) => (
            <div key={i} className={`px-4 py-3 ${i < 4 ? 'border-r border-gray-200' : ''}`}>
              <p className="text-xs text-gray-400 mb-0.5 truncate">{s.label}</p>
              <p className="text-sm font-bold text-gray-800">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filtro */}
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <span className="text-xs text-gray-400">Estado</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            <option value="ALL">Todos</option>
            <option value="OPEN">Abierto</option>
            <option value="CLOSED">Cerrado</option>
            <option value="DELETED">Eliminados</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-orange-500" size={24} />
            </div>
          ) : sessionsError ? (
            <div className="text-center py-16 text-sm text-red-500 px-4">
              Error al cargar arqueos.{' '}
              <button onClick={() => refetchSessions()} className="mt-2 text-orange-500 underline text-xs">Reintentar</button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">Sin arqueos registrados</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200 sticky top-0">
                <tr>
                  {['Hora apertura', 'Hora cierre', 'Duracion', 'Esperado efectivo', 'Contado efectivo', 'Diferencia', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, displayLimit).map((s: any) => {
                  const isOpen = s.status === 'OPEN';
                  const isDeleted = !!s.deletedAt;
                  const isSelected = s.id === effectiveSelectedId;
                  // HOTFIX 299 (B2-03): columnas = efectivo esperado vs efectivo contado; la diferencia
                  // se lee SOLO de session.difference (no se recalcula). Abierta: esperado en vivo si esta seleccionada.
                  const userAmt: number | null = s.status === 'CLOSED' && s.closingCash != null ? Number(s.closingCash) : null;
                  const rowEsperado: number | null = s.status === 'CLOSED'
                    ? (s.snapshotExpectedCash != null ? Number(s.snapshotExpectedCash) : null)
                    : (isSelected && cuadre ? expectedCash : null);
                  const diff: number | null = s.status === 'CLOSED' && s.difference != null && !isNaN(Number(s.difference))
                    ? Number(s.difference)
                    : null;
                  const lineClass = isDeleted ? 'line-through text-gray-400 opacity-60' : '';
                  const dur = calcDuration(s.openedAt, s.closedAt);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedSessionId(s.id)}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${
                        isDeleted ? 'bg-red-50' : isSelected ? (isOpen ? 'bg-amber-50' : 'bg-orange-50') : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className={`px-4 py-3 font-medium ${lineClass || 'text-gray-800'}`}>{fmtDate(s.openedAt)}</td>
                      <td className={`px-4 py-3 ${lineClass || 'text-gray-500'}`}>{s.closedAt ? fmtDate(s.closedAt) : '-'}</td>
                      <td className={`px-4 py-3 text-xs ${lineClass || 'text-gray-400'}`}>
                        {isOpen ? <span className="text-amber-500 font-medium"><LiveDuration openedAt={s.openedAt} /></span> : dur}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${lineClass || 'text-gray-800'}`}>
                        {rowEsperado != null ? fmt(rowEsperado) : '-'}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${lineClass || 'text-gray-800'}`}>{userAmt != null ? fmt(userAmt) : '-'}</td>
                      <td
                        className={`px-4 py-3 font-semibold ${
                          isDeleted ? lineClass
                          : diff == null ? 'text-gray-300'
                          : diff === 0  ? 'text-gray-700'
                          : diff > 0   ? 'text-amber-600'
                          : 'text-red-600'
                        }`}
                        title={diff == null ? '' : diff === 0 ? 'Cuadre: el efectivo contado coincide con el esperado' : diff > 0 ? 'Sobrante: efectivo contado mayor al esperado' : 'Faltante: efectivo contado menor al esperado'}
                      >
                        {diff == null ? '-' : fmtDiff(diff)}
                      </td>
                      <td className="px-4 py-3">
                        {isDeleted ? (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-500">Eliminado</span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            isOpen ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {isOpen ? 'Abierto' : 'Cerrado'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        {!isDeleted && (
                          <button
                            onClick={() => printArqueoMutation.mutate(s.id)}
                            disabled={printArqueoMutation.isPending}
                            title="Imprimir arqueo"
                            aria-label="Imprimir arqueo"
                            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-colors disabled:opacity-40"
                          >
                            {printArqueoMutation.isPending && printArqueoMutation.variables === s.id
                              ? <Loader2 size={16} className="animate-spin" />
                              : <Printer size={16} />}
                          </button>
                        )}
                        {!isDeleted && (
                          <button
                            onClick={() => setConfirmDeleteId(s.id)}
                            title="Eliminar arqueo"
                            className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loadingSessions && !sessionsError && sessions.length > displayLimit && (
            <div className="py-2 text-center border-t border-gray-100">
              <button
                onClick={() => setDisplayLimit(d => d + 20)}
                className="text-xs text-orange-500 hover:underline"
              >
                Ver más ({sessions.length - displayLimit} restantes)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Panel derecho ── */}
      {selectedSession ? (
        <div className="w-[420px] flex-shrink-0 flex flex-col bg-white border-l border-gray-200 overflow-y-auto">

          {/* Header */}
          <div className="bg-orange-500 px-5 py-3 flex items-center justify-between flex-shrink-0">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider">Arqueo de Caja</h3>
            <div className="flex items-center gap-2">
              {isActiveSelected && (canIncome || canExpense) && (
                <>
                  {canIncome && (
                    <button
                      onClick={() => { setMovementType('CASH_IN'); setShowMovementModal(true); }}
                      className="flex items-center gap-1 px-3 min-h-[44px] text-xs font-semibold bg-white hover:bg-orange-50 text-orange-700 rounded"
                    >
                      <TrendingUp size={12} /> Ingreso
                    </button>
                  )}
                  {canExpense && (
                    <button
                      onClick={() => { setMovementType('CASH_OUT'); setShowMovementModal(true); }}
                      className="flex items-center gap-1 px-3 min-h-[44px] text-xs font-semibold bg-white hover:bg-orange-50 text-orange-700 rounded"
                    >
                      <TrendingDown size={12} /> Retiro
                    </button>
                  )}
                </>
              )}
              <button onClick={() => refetchCuadre()} className="p-1 rounded hover:bg-orange-400 transition-colors">
                <RefreshCw size={14} className="text-white" />
              </button>
            </div>
          </div>

          {/* Info sesion */}
          <div className="px-5 py-4 border-b border-gray-200 space-y-2 text-sm flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Hora de apertura</span>
              <span className="font-medium text-gray-800">{fmtDate(selectedSession.openedAt)}</span>
            </div>
            {selectedSession.closedAt && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Hora de cierre</span>
                <span className="font-medium text-gray-800">{fmtDate(selectedSession.closedAt)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1"><Clock size={12} /> Duracion</span>
              <span className="font-medium text-gray-800">{calcDuration(selectedSession.openedAt, selectedSession.closedAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1"><User size={12} /> Abierto por</span>
              <span className="font-medium text-gray-800">
                {selectedSession.openedBy?.name ?? selectedSession.openedById ?? '-'}
              </span>
            </div>
            {selectedSession.closedAt && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-1"><User size={12} /> Cerrado por</span>
                <span className="font-medium text-gray-800">
                  {selectedSession.closedBy?.name ?? selectedSession.closedById ?? '-'}
                </span>
              </div>
            )}
            {selectedSession?.register?.name && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Caja</span>
                <span className="font-medium text-gray-800">{selectedSession.register.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Estado</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                selectedSession.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {selectedSession.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
              </span>
            </div>
            {!selectedSession.deletedAt && (
              <button
                onClick={() => printArqueoMutation.mutate(selectedSession.id)}
                disabled={printArqueoMutation.isPending}
                className="w-full min-h-[44px] mt-1 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {printArqueoMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                {isActiveSelected ? 'Imprimir arqueo parcial' : 'Imprimir arqueo'}
              </button>
            )}
            {cancellations?.count > 0 && (
              <div className="flex items-center justify-between bg-orange-50 rounded px-3 py-2 border border-orange-100">
                <span className="text-orange-700 text-xs font-medium">Cancelaciones</span>
                <span className="text-orange-700 text-xs font-bold">
                  {cancellations.count} pedidos / {fmt(cancellations.total)}
                </span>
              </div>
            )}
          </div>

          {/* Segun Sistema */}
          <div className="bg-gray-600 px-5 py-2 flex-shrink-0">
            <span className="text-white text-xs font-bold uppercase tracking-wider">Segun Sistema</span>
          </div>

          {/* Hotfix #254: cobros sin caja abierta desde la apertura (informativo) */}
          {!loadingCuadre && Number(cuadre?.orphanPayments?.count ?? 0) > 0 && (
            <div className="px-5 pt-3 flex-shrink-0">
              <div className="flex items-start gap-2 text-sm font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                <span>
                  {cuadre.orphanPayments.count} cobros por <span className="font-bold">{fmt(Number(cuadre.orphanPayments.amount ?? 0))}</span> se hicieron sin caja abierta desde la apertura. No están en este arqueo.
                </span>
              </div>
            </div>
          )}

          {loadingCuadre ? (
            <div className="px-5 py-6 flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="animate-spin" size={14} /> Cargando cuadre...
            </div>
          ) : (
            <div className="px-5 py-3 text-sm flex-shrink-0">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600 font-semibold uppercase text-xs tracking-wide">Monto Inicial</span>
                <span className="font-bold text-gray-800">{fmt(sistemaInicial)}</span>
              </div>
              <div className="py-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-semibold uppercase text-xs tracking-wide flex items-center gap-1">
                    Ventas
                    <span
                      title={`Pagos cobrados desde apertura del turno (${fmtDate(cuadre?.openedAt ?? selectedSession?.openedAt ?? '')}). Puede incluir cobros de órdenes de días anteriores.`}
                      className="cursor-help text-gray-400 hover:text-gray-600"
                    >
                      <Info size={11} />
                    </span>
                  </span>
                  <span className="font-bold text-gray-800">{fmt(sistemaIngreso)}</span>
                </div>
                {byMethod.length > 0 && (
                  <div className="ml-1 mt-2 space-y-1.5">
                    {byMethod.map((m: any) => (
                      <div key={m.method} className="flex justify-between text-gray-500">
                        <span className="flex items-center gap-1">
                          <ChevronRight size={11} className="text-gray-400" />
                          {METHOD_LABELS[m.method] ?? m.method}
                          <span className="text-xs text-gray-400 ml-1">({m.count})</span>
                        </span>
                        <span className="font-medium text-gray-700">{fmt(m.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {tipsTotal > 0 && (
                <div className="py-2 border-t border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-semibold uppercase text-xs tracking-wide">Propinas</span>
                    <span className="font-bold text-gray-800">{fmt(tipsTotal)}</span>
                  </div>
                  <div className="ml-1 mt-2 space-y-1.5">
                    {tipsByMethod.map((m: any) => (
                      <div key={`tip-${m.method}`} className="flex justify-between text-gray-500">
                        <span className="flex items-center gap-1">
                          <ChevronRight size={11} className="text-gray-400" />
                          {METHOD_LABELS[m.method] ?? m.method}
                          <span className="text-xs text-gray-400 ml-1">({m.count})</span>
                        </span>
                        <span className="font-medium text-gray-700">{fmt(m.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {totalCashIn > 0 && (
                <div className="flex justify-between py-1.5 border-t border-gray-100">
                  <span className="text-green-600 text-xs font-semibold">+ Ingresos manuales</span>
                  <span className="font-bold text-green-600">{fmt(totalCashIn)}</span>
                </div>
              )}
              {totalCashOut > 0 && (
                <div className="flex justify-between py-1.5 border-t border-gray-100">
                  <span className="text-red-500 text-xs font-semibold">- Egresos manuales</span>
                  <span className="font-bold text-red-500">-{fmt(totalCashOut)}</span>
                </div>
              )}
              {/* HOTFIX 303 (B4-05): devoluciones de ventas anuladas en este turno (egreso ya descontado de su medio) */}
              {refunds.length > 0 && (
                <div className="py-1.5 border-t border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-red-500 text-xs font-semibold">- Devoluciones de ventas anuladas</span>
                    <span className="font-bold text-red-500">-{fmt(totalRefunds)}</span>
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {refunds.map((r: any) => (
                      <div key={`refund-${r.id}`} className="flex justify-between text-xs text-gray-500">
                        <span>{r.orderNumber} · {METHOD_LABELS[r.method] ?? r.method}{r.reason ? ` · ${r.reason}` : ''}{r.by ? ` · ${r.by}` : ''}</span>
                        <span className="font-bold text-gray-700">-{fmt(r.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">ya restadas en el total de su medio de pago</p>
                </div>
              )}
              <div className="flex justify-between py-2 border-t-2 border-gray-300 mt-1">
                <span className="text-gray-700 font-bold text-sm">Total todos los medios</span>
                <span className="font-black text-gray-900 text-base">{fmt(sistemaTotal)}</span>
              </div>
              {tipsTotal > 0 && (
                <p className="text-xs text-gray-400 text-right -mt-1">
                  incluye {fmt(tipsTotal)} de propinas{tipsCash > 0 ? ` (${fmt(tipsCash)} en efectivo)` : ''}
                </p>
              )}
              {/* HOTFIX 299 (B2-03/B2-07): base de la diferencia = efectivo esperado */}
              <div className="flex justify-between py-2 border-t border-gray-200 mt-1">
                <span className="text-gray-700 font-bold text-sm">Efectivo esperado</span>
                <span className="font-black text-gray-900 text-base">
                  {fmt(isActiveSelected || (selectedSession as any)?.snapshotExpectedCash == null
                    ? expectedCash
                    : Number((selectedSession as any).snapshotExpectedCash))}
                </span>
              </div>
              <p className="text-xs text-gray-400 -mt-1">
                Apertura {fmt(sistemaInicial)} + ventas en efectivo {fmt(Number((cuadre as any)?.cashSales ?? 0))}
                {' '}+ propinas en efectivo {fmt(tipsCash)} + ingresos {fmt(totalCashIn)} - retiros {fmt(totalCashOut)}
              </p>
              {movements.length > 0 && (
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Movimientos manuales</p>
                  <div className="space-y-1">
                    {movements.map((mov: any) => (
                      <div key={mov.id} className="flex justify-between text-xs bg-gray-50 rounded px-2 py-1.5">
                        <span className={`font-semibold ${mov.type === 'CASH_IN' ? 'text-green-600' : 'text-red-500'}`}>
                          {mov.type === 'CASH_IN' ? '+ Ingreso' : '- Egreso'}: {fmt(mov.amount)}
                        </span>
                        <div className="flex flex-col items-end ml-2">
                          <span className="text-gray-400 truncate max-w-[160px]">{mov.reason}</span>
                          {mov.performedByName && (
                            <span className="text-gray-400 text-[10px]">Por: {mov.performedByName}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Segun Usuario */}
          <div className="bg-gray-600 px-5 py-2 flex-shrink-0">
            <span className="text-white text-xs font-bold uppercase tracking-wider">Segun Usuario</span>
          </div>

          {isActiveSelected ? (
            <>
              <div className="px-5 py-3 flex-shrink-0">
                <div className="space-y-3 mb-3">
                  {[
                    { key: 'Efectivo', label: 'Efectivo' },
                    // Hotfix #256: también los medios que solo recibieron propinas
                    ...[...new Set([...byMethod, ...tipsByMethod].map((m: any) => m.method as string))]
                      .filter((method) => !/efectivo|cash|contado/i.test(method))
                      .map((method) => ({ key: method, label: METHOD_LABELS[method] ?? method })),
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <label className="text-sm text-gray-700 font-medium flex-1">
                        {label} <span className="text-red-400">*</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 text-sm">$</span>
                        <input
                          type="number" min="0"
                          placeholder="0"
                          value={userAmounts[key] ?? ''}
                          onChange={e => setUserAmounts(prev => ({ ...prev, [key]: e.target.value }))}
                          className="w-28 px-2 py-1.5 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {diffAbsLarge && (
                  <div className="mb-3">
                    <label className="text-sm font-semibold text-red-600 block mb-1 flex items-center gap-1.5">
                      <AlertTriangle size={14} />
                      Justificación de la diferencia (Obligatorio) <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={justification}
                      onChange={e => setJustification(e.target.value)}
                      rows={3}
                      placeholder="Explica el motivo del faltante/sobrante (mín. 5 caracteres). Ej: Pago en efectivo no registrado, vuelto mal entregado..."
                      className={`w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:border-orange-400 outline-none resize-none ${
                        justification.trim().length >= 5
                          ? 'border-gray-300 focus:ring-orange-400'
                          : 'border-red-300 bg-red-50 focus:ring-red-400'
                      }`}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Diferencia de {fmt(Math.abs(diferencia))}. Quedará registrada en el cierre.
                    </p>
                  </div>
                )}
                <div className="mb-3">
                  <label className="text-sm text-gray-500 block mb-1">Comentario</label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={2}
                    placeholder="Observaciones del arqueo..."
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none resize-none"
                  />
                </div>
                <div className="flex justify-between py-2 border-t-2 border-gray-300">
                  <span className="text-gray-700 font-bold text-sm">Total declarado (todos los medios)</span>
                  <span className="font-black text-gray-900 text-base">{fmt(totalUsuario)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-700 font-bold text-sm">Efectivo contado</span>
                  <span className="font-black text-gray-900 text-base">{fmt(efectivoDeclarado)}</span>
                </div>
              </div>

              {/* HOTFIX 299: diferencia = efectivo contado - efectivo esperado (vista previa) */}
              <div className={`px-5 py-4 flex items-center justify-between flex-shrink-0 ${
                diferencia === 0 ? 'bg-gray-700' : diffAbsLarge ? 'bg-red-600' : 'bg-amber-600'
              }`}>
                <span className="text-white font-bold text-sm uppercase tracking-wide flex items-center gap-1.5">
                  {diffAbsLarge && <AlertTriangle size={15} />}
                  Diferencia efectivo
                </span>
                <span className="text-white font-black text-xl">
                  {fmtDiff(diferencia)}
                </span>
              </div>

              {diffAbsLarge && (
                <div className="px-5 py-2 bg-red-50 border-b border-red-100 flex-shrink-0">
                  <p className="text-xs text-red-600 font-medium">
                    Diferencia mayor a {fmt(DIFF_THRESHOLD)}. Verifica los montos antes de confirmar.
                  </p>
                </div>
              )}

              <div className="px-5 py-4 flex-shrink-0">
                <button
                  disabled={closeMutation.isPending || needsJustification}
                  onClick={handleConfirmClose}
                  className="w-full min-h-[44px] py-3 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600"
                >
                  {closeMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  {diffAbsLarge ? 'Confirmar de todas formas' : 'Confirmar Arqueo'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="px-5 py-4 text-sm flex-shrink-0">
                {/* BUG-2: usar closingByMethod persistido en la sesión primero */}
                {(() => {
                  const cbm: Record<string, number> | null =
                    (selectedSession as any).closingByMethod ?? cuadre?.closingByMethod ?? null;
                  return cbm && Object.keys(cbm).length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {Object.entries(cbm).map(([method, amount]) => (
                        <div key={method} className="flex justify-between">
                          <span className="text-gray-500">{METHOD_LABELS[method] ?? method}</span>
                          <span className="font-medium text-gray-800">{fmt(amount)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600 font-medium">Monto de Cierre</span>
                      <span className="font-bold text-gray-800">
                        {selectedSession.closingCash != null ? fmt(selectedSession.closingCash) : '-'}
                      </span>
                    </div>
                  );
                })()}
                {selectedSession.notes && (
                  <div className="mt-2 bg-gray-50 rounded-lg p-3 text-gray-500 text-xs border border-gray-100">
                    {selectedSession.notes}
                  </div>
                )}
                <div className="flex justify-between py-2 border-t-2 border-gray-300 mt-2">
                  <span className="text-gray-700 font-bold text-sm">Efectivo contado</span>
                  <span className="font-black text-gray-900 text-base">
                    {selectedSession.closingCash != null ? fmt(selectedSession.closingCash) : '-'}
                  </span>
                </div>
              </div>
              {/* HOTFIX 299 (B2-03): diferencia SOLO desde session.difference */}
              {closedDifference != null && (
                <div className={`px-5 py-4 flex items-center justify-between flex-shrink-0 ${
                  closedDifference === 0 ? 'bg-gray-700' : Math.abs(closedDifference) > DIFF_THRESHOLD ? 'bg-red-600' : 'bg-amber-600'
                }`}>
                  <span className="text-white font-bold text-sm uppercase tracking-wide">Diferencia efectivo</span>
                  <span className="text-white font-black text-xl">
                    {fmtDiff(closedDifference)}
                  </span>
                </div>
              )}
              {selectedSession.status === 'CLOSED' && selectedSession.justification && (
                <div className="px-5 py-3 bg-amber-50 border-t border-amber-200 flex-shrink-0">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={13} />
                    Justificación del cajero
                  </p>
                  <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">
                    {selectedSession.justification}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="w-96 flex-shrink-0 flex items-center justify-center bg-gray-50 border-l border-gray-200">
          <p className="text-gray-400 text-sm">Selecciona un arqueo para ver detalles</p>
        </div>
      )}

      {/* ── Modal: Confirmar eliminacion ── */}
      {/* HOTFIX 299 (B2-05): justificacion obligatoria (min 15) enviada en body y ?justification= ; portal z-[100] */}
      {confirmDeleteId && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gray-900 px-5 py-3">
              <h3 className="text-white font-bold text-sm uppercase tracking-wide">Eliminar Arqueo</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700 mb-1">
                El arqueo quedara visible como <span className="font-semibold">tachado</span> para auditoria, pero no contara como activo.
              </p>
              <p className="text-xs text-gray-400 mt-2">Esta accion no se puede deshacer.</p>
              <label className="block text-sm font-semibold text-gray-700 mt-4 mb-1">
                Justificacion <span className="text-red-500">*</span>
              </label>
              <textarea
                value={deleteJustification}
                onChange={e => setDeleteJustification(e.target.value)}
                rows={3}
                placeholder="Explica por que se elimina este arqueo (minimo 15 caracteres)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
              <p className={`text-xs mt-1 text-right font-semibold ${
                deleteJustification.trim().length >= DELETE_MIN_CHARS ? 'text-gray-500' : 'text-red-500'
              }`}>
                {deleteJustification.trim().length}/{DELETE_MIN_CHARS} caracteres minimos
              </p>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button
                onClick={() => { setConfirmDeleteId(null); setDeleteJustification(''); }}
                className="min-h-[44px] px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={deleteMutation.isPending || deleteJustification.trim().length < DELETE_MIN_CHARS}
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                className="min-h-[44px] px-4 py-2 text-sm rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold transition-colors flex items-center gap-2"
              >
                {deleteMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />}
                Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Modal: Nueva Caja ── */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-orange-500 px-5 py-3">
              <h3 className="text-white font-bold text-sm uppercase tracking-wide">Nuevo Arqueo de Caja</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de apertura <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={openDate}
                    onChange={e => setOpenDate(e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <input
                    type="time"
                    step="1"
                    value={openTime}
                    onChange={e => setOpenTime(e.target.value)}
                    className="w-32 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">Las ventas desde esta hora se sumaran al arqueo.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Inicial <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={openMonto}
                    onChange={e => setOpenMonto(e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button
                onClick={() => setShowOpenModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={openMutation.isPending || !openDate || !openTime}
                onClick={() => openMutation.mutate()}
                className="px-4 py-2 text-sm rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold transition-colors flex items-center gap-2"
              >
                {openMutation.isPending && <Loader2 className="animate-spin" size={15} />}
                Iniciar Arqueo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Movimiento manual ── */}
      {/* HOTFIX 299 (B2-06): modal compartido con el turno del cajero (confirma retiros grandes adentro) */}
      {showMovementModal && selectedSession?.id && (
        <CashMovementModal
          sessionId={selectedSession.id}
          initialType={movementType}
          canIncome={canIncome}
          canExpense={canExpense}
          onClose={() => setShowMovementModal(false)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['cash-cuadre', selectedSession?.id] })}
        />
      )}

      {/* ── Modal: Confirmar cierre diferencia grande ── */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-red-600 px-5 py-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-white" />
              <h3 className="text-white font-bold text-sm uppercase tracking-wide">Diferencia Grande</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700 mb-2">
                La diferencia es de{' '}
                <span className="font-bold text-red-600">{fmt(Math.abs(diferencia))}</span>,
                {' '}lo que supera el umbral de {fmt(DIFF_THRESHOLD)}.
              </p>
              <p className="text-xs text-gray-500">Confirma que los montos son correctos antes de cerrar la caja.</p>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Revisar montos
              </button>
              <button
                disabled={closeMutation.isPending}
                onClick={() => closeMutation.mutate()}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold transition-colors flex items-center gap-2"
              >
                {closeMutation.isPending ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
                Cerrar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
