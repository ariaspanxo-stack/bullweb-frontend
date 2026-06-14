import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesService } from '@/services/employeesService';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useConfirm } from '@/hooks/useConfirm';
import { EmployeeSalesTab } from '@/components/employees/EmployeeSalesTab';
import { EmployeeAttendanceTab } from '@/components/employees/EmployeeAttendanceTab';
import { EditAttendanceModal } from '@/components/attendance/EditAttendanceModal';
import { JustificativosTab } from '@/components/attendance/JustificativosTab';
import { AlertasPanel, AlertasBadge } from '@/components/attendance/AlertasPanel';
import { CalendarioMensual } from '@/components/attendance/CalendarioMensual';
import { DashboardAsistencia } from '@/components/attendance/DashboardAsistencia';
import { EmployeeProfileModal } from '@/components/employees/EmployeeProfileModal';
import {
  Plus, Search, Pencil, Trash2, Users, Shield,
  CheckCircle, XCircle, Mail, Phone, Eye, EyeOff, FileDown, Clock, LogIn, LogOut,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  FileSpreadsheet, QrCode, X, User, ChevronUp, ChevronDown, AlertTriangle,
  KeyRound, Loader2, AlertCircle, Download, Printer, Bell, CalendarDays, FileText, BarChart3,
} from 'lucide-react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { exportToExcel, fmtDateTime } from '@/utils/exportExcel';
import { exportAttendanceDT } from '@/utils/exportAttendanceDT';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'employees' | 'roles' | 'attendance' | 'justificativos' | 'alertas' | 'calendario' | 'dashboard';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BADGE: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-gray-100  text-gray-500',
};
// ─── Helpers ────────────────────────────────────────────────────────────────────────────
const formatTime = (dt: string | Date) =>
  new Date(dt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

function calcWorkedHours(firstEntry: string, lastExit: string, colacionMin = 0): string {
  const ms = new Date(lastExit).getTime() - new Date(firstEntry).getTime();
  if (ms <= 0) return '—';
  const totalMin = Math.max(0, Math.floor(ms / 60_000) - colacionMin);
  const hours    = Math.floor(totalMin / 60);
  const minutes  = totalMin % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

function calcWorkedHoursExcel(firstEntry: string | null, lastExit: string | null, colacionMin = 0): string {
  if (!firstEntry) return '—';
  if (!lastExit)   return 'En curso';
  const ms = new Date(lastExit).getTime() - new Date(firstEntry).getTime();
  if (ms <= 0) return '—';
  const totalMin = Math.max(0, Math.floor(ms / 60_000) - colacionMin);
  const hours    = Math.floor(totalMin / 60);
  const minutes  = totalMin % 60;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

const fmtHoraChile = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
};

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n ?? 0);

// ─── Attendance type labels/colors (usados en tabla, timeline y Excel) ────────
const labelByType: Record<string, string> = {
  ENTRADA:          'Entrada',
  SALIDA_COLACION:  'Salida Colacion',
  ENTRADA_COLACION: 'Entrada Colacion',
  SALIDA:           'Salida',
  ENTRY:            'Entrada',
  EXIT:             'Salida',
  IN:               'Entrada',
  OUT:              'Salida',
};

const colorByType: Record<string, string> = {
  ENTRADA:          'bg-green-400',
  SALIDA_COLACION:  'bg-yellow-400',
  ENTRADA_COLACION: 'bg-orange-400',
  SALIDA:           'bg-red-400',
  ENTRY:            'bg-green-400',
  EXIT:             'bg-red-400',
  IN:               'bg-green-400',
  OUT:              'bg-red-400',
};

const badgeByType: Record<string, string> = {
  ENTRADA:          'bg-green-100 text-green-700',
  SALIDA_COLACION:  'bg-yellow-100 text-yellow-700',
  ENTRADA_COLACION: 'bg-orange-100 text-orange-700',
  SALIDA:           'bg-red-100 text-red-700',
  ENTRY:            'bg-green-100 text-green-700',
  EXIT:             'bg-red-100 text-red-700',
  IN:               'bg-green-100 text-green-700',
  OUT:              'bg-red-100 text-red-700',
};
// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Employees() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canManage = usePermission('employees.manage');
  const { confirm: confirmDialog, dialogProps } = useConfirm();
  const [activeTab, setActiveTab] = useState<Tab>('employees');
  const [search, setSearch]       = useState('');

  // ─── Employee state
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp]         = useState<any>(null);
  const [profilEmp,  setProfilEmp]          = useState<any>(null);

  // ─── Role state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole]         = useState<any>(null);

  // ─── Attendance state
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [qrEmp, setQrEmp]                 = useState<any>(null);

  // ─── Sort + search state
  const [sortBy,      setSortBy]      = useState<'name' | 'role' | 'status'>('name');
  const [sortDir,     setSortDir]     = useState<'asc' | 'desc'>('asc');
  const [rolesSearch, setRolesSearch] = useState('');

  // ─────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────
  const { data: empData, isLoading: empLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn:  () => employeesService.getEmployees({ search: search || undefined, perPage: 50 }),
    staleTime: 30_000,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['employee-roles'],
    queryFn:  () => employeesService.getRoles(),
    staleTime: 60_000,
  });

  const employees: any[] = empData?.employees ?? [];
  const roles: any[]     = rolesData?.roles ?? rolesData ?? [];

  // Mapa rápido employeeId → datos para lookup en asistencia
  const empMap = useMemo(() => {
    const m = new Map<string, any>();
    employees.forEach(e => m.set(e.id, e));
    return m;
  }, [employees]);

  // ─────────────────────────────────────────────────────────────
  // Mutations – employees
  // ─────────────────────────────────────────────────────────────
  const createEmpMutation = useMutation({
    mutationFn: employeesService.createEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Empleado creado'); setIsEmpModalOpen(false); },
    onError: (e: any) => toast.error(e?.message ?? e?.data?.error ?? 'Error al crear empleado'),
  });

  const updateEmpMutation = useMutation({
    mutationFn: ({ id, data }: any) => employeesService.updateEmployee(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Empleado actualizado'); setIsEmpModalOpen(false); setEditingEmp(null); },
    onError: (e: any) => toast.error(e?.message ?? e?.data?.error ?? 'Error al actualizar empleado'),
  });

  const deleteEmpMutation = useMutation({
    mutationFn: employeesService.deleteEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Empleado eliminado'); },
    onError: (e: any) => toast.error(e?.message ?? e?.data?.error ?? 'No se puede eliminar'),
  });

  // ─────────────────────────────────────────────────────────────
  // Mutations – roles
  // ─────────────────────────────────────────────────────────────
  const createRoleMutation = useMutation({
    mutationFn: employeesService.createRole,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-roles'] }); toast.success('Rol creado'); setIsRoleModalOpen(false); },
    onError: (e: any) => toast.error(e?.message ?? e?.data?.error ?? 'Error al crear rol'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: any) => employeesService.updateRole(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-roles'] }); toast.success('Rol actualizado'); setIsRoleModalOpen(false); setEditingRole(null); },
    onError: (e: any) => toast.error(e?.message ?? e?.data?.error ?? 'Error al actualizar rol'),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: employeesService.deleteRole,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employee-roles'] }); toast.success('Rol eliminado'); },
    onError: (e: any) => toast.error(e?.message ?? e?.data?.error ?? 'No se puede eliminar'),
  });

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─── Attendance state ────────────────────────────────────────────────────────
  // Fecha local del navegador (timezone Chile), no UTC
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [localDateFrom, setLocalDateFrom] = useState(today);
  const [localDateTo,   setLocalDateTo]   = useState(today);
  const [attDateFrom,   setAttDateFrom]   = useState(today);
  const [attDateTo,     setAttDateTo]     = useState(today);
  const [attPage,       setAttPage]       = useState(1);
  const [attEmployeeId, setAttEmployeeId] = useState('');
  const [attShift,      setAttShift]      = useState('');
  const ATT_PAGE_SIZE = 50;
  const [attView,       setAttView]       = useState<'diaria' | 'historial'>('diaria');
  const [expandedEmps,  setExpandedEmps]  = useState<Set<string>>(new Set());
  const [histPage,      setHistPage]      = useState(1);
  const HIST_PAGE_SIZE = 20;

  const { data: attRecordsData, isLoading: attLoading } = useQuery({
    queryKey: ['attendance-records', attDateFrom, attDateTo, attEmployeeId, attShift, attPage],
    queryFn: () =>
      api.get('/attendance/records', { params: { dateFrom: attDateFrom, dateTo: attDateTo, employeeId: attEmployeeId || undefined, shift: attShift || undefined, page: attPage, perPage: ATT_PAGE_SIZE } })
         .then(r => r.data),
    enabled: activeTab === 'attendance',
    staleTime: 30_000,
  });

  const { data: attSummaryData } = useQuery({
    queryKey: ['attendance-summary', attDateFrom, attDateTo],
    queryFn: () =>
      api.get('/attendance/summary', { params: { dateFrom: attDateFrom, dateTo: attDateTo } })
         .then(r => r.data.data),
    enabled: activeTab === 'attendance',
    staleTime: 30_000,
  });

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/attendance/today').then(r => r.data.data),
    enabled: activeTab === 'attendance',
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const attRecords: any[] = attRecordsData?.records ?? [];
  const attMeta           = attRecordsData?.meta;
  const attSummary: any[] = attSummaryData?.summary ?? attSummaryData ?? [];
  const todayDashboard    = todayData ?? null;

  const { data: histData, isLoading: histLoading } = useQuery({
    queryKey: ['attendance-grouped', attDateFrom, attDateTo, attEmployeeId, histPage],
    queryFn: () =>
      api.get('/attendance/grouped', {
        params: { dateFrom: attDateFrom, dateTo: attDateTo, employeeId: attEmployeeId || undefined, page: histPage, limit: HIST_PAGE_SIZE },
      }).then(r => r.data),
    enabled: activeTab === 'attendance' && attView === 'historial',
    staleTime: 30_000,
  });
  const histRows: any[]     = histData?.rows  ?? [];
  const histTotal: number   = histData?.total ?? 0;
  const histTotalPages      = Math.max(1, Math.ceil(histTotal / HIST_PAGE_SIZE));

  // Agrupa attRecords por empleado para la vista timeline
  const groupedByEmployee = useMemo(() => {
    const map = new Map<string, {
      employeeId: string; employeeName: string; records: any[];
      currentStatus: string | null; hoursWorked: string | null; colacionMin: number | null;
    }>();
    attRecords.forEach(r => {
      const key = r.employeeId ?? r.employeeName;
      if (!map.has(key)) {
        map.set(key, {
          employeeId: r.employeeId, employeeName: r.employeeName ?? '',
          records: [], currentStatus: null, hoursWorked: null, colacionMin: null,
        });
      }
      map.get(key)!.records.push(r);
    });
    map.forEach(emp => {
      const sorted = [...emp.records].sort((a, b) =>
        new Date(a.timestamp ?? a.createdAt).getTime() - new Date(b.timestamp ?? b.createdAt).getTime()
      );
      emp.currentStatus = sorted[sorted.length - 1]?.type ?? null;
      const entrada   = sorted.find(r => r.type === 'ENTRADA'          || r.type === 'ENTRY'  || r.type === 'IN');
      const salida    = sorted.find(r => r.type === 'SALIDA'           || r.type === 'EXIT'   || r.type === 'OUT');
      const salidaCol = sorted.find(r => r.type === 'SALIDA_COLACION');
      const entCol    = sorted.find(r => r.type === 'ENTRADA_COLACION');
      if (entrada && salida) {
        const ms = new Date(salida.timestamp ?? salida.createdAt).getTime() - new Date(entrada.timestamp ?? entrada.createdAt).getTime();
        const colMs = (salidaCol && entCol)
          ? new Date(entCol.timestamp ?? entCol.createdAt).getTime() - new Date(salidaCol.timestamp ?? salidaCol.createdAt).getTime()
          : 0;
        emp.hoursWorked = calcWorkedHoursExcel(
          entrada.timestamp ?? entrada.createdAt,
          salida.timestamp  ?? salida.createdAt,
          colMs > 0 ? Math.round(colMs / 60000) : 0,
        );
      }
      if (salidaCol && entCol) {
        const ms = new Date(entCol.timestamp ?? entCol.createdAt).getTime() - new Date(salidaCol.timestamp ?? salidaCol.createdAt).getTime();
        emp.colacionMin = Math.round(ms / 60000);
      }
    });
    return Array.from(map.values());
  }, [attRecords]);

  const todayStats = useMemo(() => {
    if (todayDashboard?.resumen) {
      return {
        trabajandoAhora: todayDashboard.resumen.presentes  ?? 0,
        enColacion:      todayDashboard.resumen.enColacion  ?? 0,
        sinMarcar:       todayDashboard.resumen.ausentes    ?? 0,
        finalizados:     todayDashboard.resumen.salieron    ?? 0,
      };
    }
    const trabajandoAhora = groupedByEmployee.filter(e =>
      e.currentStatus === 'ENTRADA' || e.currentStatus === 'ENTRY' || e.currentStatus === 'IN' || e.currentStatus === 'ENTRADA_COLACION'
    ).length;
    const enColacion  = groupedByEmployee.filter(e => e.currentStatus === 'SALIDA_COLACION').length;
    const finalizados = groupedByEmployee.filter(e =>
      e.currentStatus === 'SALIDA' || e.currentStatus === 'EXIT' || e.currentStatus === 'OUT'
    ).length;
    return { trabajandoAhora, enColacion, sinMarcar: 0, finalizados };
  }, [todayDashboard, groupedByEmployee]);

  const toggleExpandEmp = (id: string) => {
    setExpandedEmps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Debounce 400ms: sincroniza estado local de fechas → estado de query
  useEffect(() => {
    const timer = setTimeout(() => {
      setAttDateFrom(localDateFrom);
      setAttDateTo(localDateTo);
      setAttPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [localDateFrom, localDateTo]);

  // Reset página cuando cambia el empleado filtrado
  useEffect(() => { setAttPage(1); }, [attEmployeeId]);
  useEffect(() => { setAttPage(1); }, [attShift]);

  const handleAttExport = async () => {
    try {
      // Obtener TODOS los registros del período (sin paginación) para el export
      const [allRecordsRes, settingsRes] = await Promise.allSettled([
        api.get('/attendance/records', {
          params: { dateFrom: attDateFrom, dateTo: attDateTo, perPage: 10000, page: 1 },
        }).then(r => r.data),
        api.get('/admin/settings/flat').then(r => r.data).catch(() => ({})),
      ]);

      const allRecords: any[] = allRecordsRes.status === 'fulfilled'
        ? (allRecordsRes.value?.records ?? allRecordsRes.value ?? [])
        : attRecords;

      const flat: Record<string, any> = settingsRes.status === 'fulfilled'
        ? (settingsRes.value?.data ?? settingsRes.value ?? {})
        : {};

      await exportAttendanceDT(
        allRecords,
        empMap,
        attDateFrom,
        attDateTo,
        {
          razonSocial: flat.restaurantName ?? flat.razon_social ?? flat.business_name ?? '',
          rut:         flat.rut_empleador  ?? flat.rut_empresa  ?? flat.business_rut ?? flat.rut ?? '',
          direccion:   flat.direccion      ?? flat.address      ?? flat.business_address ?? '',
        }
      );
      toast.success('Libro de Asistencia exportado (Decreto 101 DT)');
    } catch (err: any) {
      toast.error('Error al exportar: ' + (err?.message ?? 'Error desconocido'));
    }
  };

  const handlePdfExport = () => {
    // VITE_API_URL ya incluye /api (ej: https://app.bullwebchile.com/api)
    // => usar directamente sin agregar /api de nuevo
    const baseUrl = (import.meta as any).env?.VITE_API_URL ?? '';
    const params  = new URLSearchParams({ dateFrom: attDateFrom, dateTo: attDateTo });
    window.open(`${baseUrl}/attendance/export/pdf?${params}`, '_blank');
  };

  // ─────────────────────────────────────────────────────────────
  const openNewEmp  = () => { setEditingEmp(null);  setIsEmpModalOpen(true);  };
  const openEditEmp = (e: any) => { setEditingEmp(e); setIsEmpModalOpen(true); };
  const confirmDeleteEmp = async (e: any) => {
    const ok = await confirmDialog({ message: `¿Eliminar empleado "${e.name}"?`, confirmLabel: 'Eliminar' });
    if (ok) deleteEmpMutation.mutate(e.id);
  };

  const openNewRole  = () => { setEditingRole(null);  setIsRoleModalOpen(true);  };
  const openEditRole = (r: any) => { setEditingRole(r); setIsRoleModalOpen(true); };
  const confirmDeleteRole = async (r: any) => {
    const ok = await confirmDialog({ message: `¿Eliminar rol "${r.name}"?`, confirmLabel: 'Eliminar' });
    if (ok) deleteRoleMutation.mutate(r.id);
  };

  const handleExport = () => {
    exportToExcel([
      {
        sheetName: 'Empleados',
        rows: employees.map((e: any) => ({
          'Nombre':   e.name ?? `${e.firstName ?? ''} ${e.lastName ?? ''}`.trim(),
          'Email':    e.email ?? '',
          'Teléfono': e.phone ?? '',
          'Rol':      e.role?.name ?? e.roleName ?? '',
          'Estado':   e.active !== false ? 'Activo' : 'Inactivo',
          'Creado':   e.createdAt ? fmtDateTime(e.createdAt) : '',
        })),
      },
      {
        sheetName: 'Roles',
        rows: roles.map((r: any) => ({
          'Nombre':       r.name,
          'Descripción':  r.description ?? '',
          'Empleados':    r.employeeCount ?? '',
        })),
      },
    ], `empleados_${new Date().toISOString().slice(0,10)}`);
    toast.success('Empleados exportados a Excel (2 hojas)');
  };

  // ─── Derived data ──────────────────────────────────────────────────────────
  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const sortedEmployees = useMemo(() => {
    return [...(employees ?? [])].sort((a, b) => {
      let valA: string;
      let valB: string;
      if (sortBy === 'name') {
        valA = a.name?.toLowerCase() ?? '';
        valB = b.name?.toLowerCase() ?? '';
      } else if (sortBy === 'role') {
        valA = (a.roles?.name ?? a.role?.name)?.toLowerCase() ?? 'zzz';
        valB = (b.roles?.name ?? b.role?.name)?.toLowerCase() ?? 'zzz';
      } else {
        valA = a.active !== false ? '0' : '1';
        valB = b.active !== false ? '0' : '1';
      }
      const cmp = valA.localeCompare(valB);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [employees, sortBy, sortDir]);

  const filteredRoles = useMemo(() => {
    if (!rolesSearch.trim()) return roles ?? [];
    const q = rolesSearch.toLowerCase();
    return (roles ?? []).filter((r: any) =>
      r.name.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.permissions?.some((p: string) => p.toLowerCase().includes(q))
    );
  }, [roles, rolesSearch]);

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="mt-1 text-sm text-gray-500">Gestiona el equipo y sus roles</p>
        </div>
        <div className="flex items-center gap-2">
          {(activeTab === 'employees' || activeTab === 'roles') && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <FileDown className="h-4 w-4" /> Exportar Excel
            </button>
          )}
          {(activeTab === 'employees' || activeTab === 'roles') && canManage && (
            <Button onClick={activeTab === 'employees' ? openNewEmp : openNewRole}>
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === 'employees' ? 'Nuevo Empleado' : 'Nuevo Rol'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          {([
            { value: 'employees',      label: 'Empleados',       icon: Users        },
            { value: 'roles',          label: 'Roles',            icon: Shield       },
            { value: 'attendance',     label: 'Asistencia',      icon: Clock        },
            { value: 'justificativos', label: 'Justificativos',  icon: FileText     },
            { value: 'alertas',        label: 'Alertas',          icon: Bell         },
            { value: 'calendario',     label: 'Calendario',      icon: CalendarDays },
            { value: 'dashboard',      label: 'Dashboard',       icon: BarChart3    },
          ] as { value: Tab; label: string; icon: any }[]).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === value
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {value === 'employees' && (
                <span className="ml-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{employees.length}</span>
              )}
              {value === 'roles' && (
                <span className="ml-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{roles.length}</span>
              )}
              {value === 'attendance' && (
                <span className="ml-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{attRecords.length}</span>
              )}
              {value === 'alertas' && <AlertasBadge />}
            </button>
          ))}
        </nav>
      </div>

      {/* ── EMPLOYEES TAB ── */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">{employees.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Activos</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{employees.filter((e) => e.active !== false).length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Inactivos</p>
              <p className="text-2xl font-bold mt-1 text-gray-400">{employees.filter((e) => e.active === false).length}</p>
            </div>
            {(() => {
              const sinRol = employees.filter(e => !e.roles?.name && !e.role?.name).length;
              return (
                <div className={`rounded-xl border p-4 ${sinRol > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-200'}`}>
                  <p className="text-sm text-gray-500">Sin rol</p>
                  <p className={`text-2xl font-bold mt-1 ${sinRol > 0 ? 'text-red-500' : 'text-gray-300'}`}>{sinRol}</p>
                  {sinRol > 0 && <p className="text-xs text-red-400 mt-1">⚠�? Sin acceso</p>}
                </div>
              );
            })()}
          </div>

          {/* Search */}
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar empleado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {empLoading ? (
              <div className="p-8 text-center text-gray-400">Cargando empleados…</div>
            ) : employees.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No hay empleados registrados</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {(['name', 'role'] as const).map(col => (
                      <th key={col} onClick={() => handleSort(col)}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 group">
                        <div className="flex items-center gap-1">
                          {col === 'name' ? 'Empleado' : 'Rol'}
                          <span className={`transition-opacity ${sortBy === col ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
                            {sortBy === col && sortDir === 'asc'
                              ? <ChevronUp className="w-3.5 h-3.5" />
                              : <ChevronDown className="w-3.5 h-3.5" />}
                          </span>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">RUT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Cargo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Turno</th>
                    <th onClick={() => handleSort('status')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 group">
                      <div className="flex items-center gap-1">
                        Estado
                        <span className={`transition-opacity ${sortBy === 'status' ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
                          {sortBy === 'status' && sortDir === 'asc'
                            ? <ChevronUp className="w-3.5 h-3.5" />
                            : <ChevronDown className="w-3.5 h-3.5" />}
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                            {emp.name?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{emp.name}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Mail className="h-3 w-3" />{emp.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(emp.roles?.name ?? emp.role?.name) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                            <Shield className="h-3 w-3" />
                            {emp.roles?.name ?? emp.role?.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-500">
                            <AlertTriangle className="h-3 w-3" />
                            Sin rol
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                        {emp.rut ? emp.rut : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {emp.cargo ? emp.cargo : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {emp.phone ? (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{emp.phone}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {emp.shift ? (
                          <span className="text-sm">
                            {emp.shift === 'morning' ? '🌅 Mañana'
                             : emp.shift === 'afternoon' ? '☀️ Tarde'
                             : emp.shift === 'night' ? '🌙 Noche'
                             : <><span className="mr-1">✏️</span>{emp.shift}</>}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${emp.active !== false ? BADGE.active : BADGE.inactive}`}>
                          {emp.active !== false
                            ? <><CheckCircle className="h-3 w-3" />Activo</>
                            : <><XCircle className="h-3 w-3" />Inactivo</>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {canManage && (
                            <button onClick={() => openEditEmp(emp)} className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 transition-colors" title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => setProfilEmp(emp)} className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 transition-colors" title="Ver Perfil">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setQrEmp(emp)} className="p-1.5 rounded hover:bg-purple-50 text-purple-500 transition-colors" title="QR Asistencia">
                            <QrCode className="h-3.5 w-3.5" />
                          </button>
                          {canManage && (
                            <button onClick={() => confirmDeleteEmp(emp)} className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors" title="Eliminar">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── ROLES TAB ── */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          {/* Buscador */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar rol o permiso..."
                value={rolesSearch}
                onChange={e => setRolesSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              {rolesSearch && (
                <button onClick={() => setRolesSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            {rolesSearch && (
              <span className="text-sm text-gray-400">
                {filteredRoles.length} resultado{filteredRoles.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {filteredRoles.length === 0 && rolesSearch ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Search className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-gray-400">No hay roles que coincidan con "{rolesSearch}"</p>
              <button onClick={() => setRolesSearch('')} className="text-sm text-indigo-500 hover:text-indigo-700">Limpiar búsqueda</button>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No hay roles definidos</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRoles.map((role: any) => (
                <div key={role.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{role.name}</h3>
                      {role.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {canManage && (
                        <button onClick={() => openEditRole(role)} className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canManage && (
                        <button onClick={() => confirmDeleteRole(role)} className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Permissions */}
                  {role.permissions?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 6).map((p: string) => (
                        <span key={p} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {p}
                        </span>
                      ))}
                      {role.permissions.length > 6 && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                          +{role.permissions.length - 6} más
                        </span>
                      )}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 border-t border-gray-100 pt-2">
                    {role._count?.employees ?? 0} empleado(s)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">

          {/* ─── Dashboard HOY ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                Estado de Hoy
              </h3>
              {todayLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
            </div>
            {/* Tarjetas resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-xl p-4 bg-gray-900 border-2 border-green-500 flex flex-col items-center justify-center text-center min-h-[90px]">
                <span className="text-4xl font-black text-green-400 leading-none">{todayStats.trabajandoAhora}</span>
                <span className="text-xs text-green-300 mt-1 font-medium">Trabajando ahora</span>
              </div>
              <div className="rounded-xl p-4 bg-gray-900 border-2 border-yellow-500 flex flex-col items-center justify-center text-center min-h-[90px]">
                <span className="text-4xl font-black text-yellow-400 leading-none">{todayStats.enColacion}</span>
                <span className="text-xs text-yellow-300 mt-1 font-medium">En colacion</span>
              </div>
              <div className="rounded-xl p-4 bg-gray-900 border-2 border-gray-500 flex flex-col items-center justify-center text-center min-h-[90px]">
                <span className="text-4xl font-black text-gray-200 leading-none">{todayStats.sinMarcar}</span>
                <span className="text-xs text-gray-400 mt-1 font-medium">Sin marcar hoy</span>
              </div>
              <div className="rounded-xl p-4 bg-gray-900 border-2 border-red-500 flex flex-col items-center justify-center text-center min-h-[90px]">
                <span className="text-4xl font-black text-red-400 leading-none">{todayStats.finalizados}</span>
                <span className="text-xs text-red-300 mt-1 font-medium">Turno finalizado</span>
              </div>
            </div>
            {/* Lista detalle empleados */}
            {todayDashboard && (
              <div className="divide-y divide-gray-50">
                  {(todayDashboard.empleados ?? []).map((emp: any) => {
                    const estadoColors: Record<string, string> = {
                      presente:   'bg-green-100 text-green-700',
                      tardanza:   'bg-amber-100 text-amber-700',
                      ausente:    'bg-red-100 text-red-700',
                      justificado:'bg-blue-100 text-blue-700',
                      libre:      'bg-gray-100 text-gray-500',
                    };
                    const badgeCls = estadoColors[emp.estado] ?? 'bg-gray-100 text-gray-500';
                    return (
                      <div key={emp.employeeId} className="flex items-center gap-3 py-2">
                        <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-indigo-600">{emp.employeeName.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{emp.employeeName}</p>
                          {emp.cargo && <p className="text-xs text-gray-400 truncate">{emp.cargo}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {emp.firstEntry && (
                            <span className="text-xs text-gray-500 font-mono">
                              {new Date(emp.firstEntry).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {emp.enLocal && !emp.colacionEnCurso && (
                            <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">En local</span>
                          )}
                          {emp.colacionEnCurso && (
                            <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-medium">Colación</span>
                          )}
                          {emp.netMinutes > 0 && emp.lastExit && (
                            <span className="text-xs font-bold text-indigo-600">
                              {Math.floor(emp.netMinutes / 60)}h {(emp.netMinutes % 60).toString().padStart(2, '0')}m
                            </span>
                          )}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${badgeCls}`}>
                            {emp.estado}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
            )}
          </div>
          {/* ────────────────────────────────────────────────────────────────── */}

          {/* Filtros de fecha + empleado + botones */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Desde</label>
              <input
                type="date"
                value={localDateFrom}
                onChange={e => setLocalDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Hasta</label>
              <input
                type="date"
                value={localDateTo}
                onChange={e => setLocalDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={attEmployeeId}
              onChange={e => { setAttEmployeeId(e.target.value); setAttPage(1); setHistPage(1); }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[160px]"
            >
              <option value="">Todos los empleados</option>
              {employees.length > 0
                ? employees.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))
                : attSummary.map((s: any) => (
                    <option key={s.employeeId} value={s.employeeId}>{s.employeeName}</option>
                  ))
              }
            </select>
            <select
              value={attShift}
              onChange={e => { setAttShift(e.target.value); setAttPage(1); }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Todos los turnos</option>
              <option value="morning">🌅 Mañana</option>
              <option value="afternoon">☀�? Tarde</option>
              <option value="night">🌙 Noche</option>
            </select>
            {attEmployeeId && (
              <span className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full">
                <User className="w-3 h-3" />
                {(employees.find((e: any) => e.id === attEmployeeId)?.name) ??
                 (attSummary.find((s: any) => s.employeeId === attEmployeeId)?.employeeName) ??
                 'Empleado'}
                <button onClick={() => { setAttEmployeeId(''); setAttPage(1); setHistPage(1); }} className="ml-0.5 hover:text-indigo-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleAttExport}
                disabled={!attRecords.length && !attSummary.length}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </button>
              <button
                onClick={handlePdfExport}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-xl transition-colors"
              >
                <FileDown className="w-4 h-4" />
                Libro PDF
              </button>
              <button
                onClick={() => window.open(`/kiosk/${user?.tenantSlug ?? user?.tenantId ?? ''}`, '_blank')}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                <QrCode className="w-4 h-4" />
                Abrir Kiosco
              </button>
            </div>
          </div>

          {/* ─── Sub-tabs Vista Diaria / Historial ───────────────────────── */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setAttView('diaria')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                attView === 'diaria'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Vista Diaria
            </button>
            <button
              onClick={() => { setAttView('historial'); setHistPage(1); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                attView === 'historial'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Historial
            </button>
          </div>

          {/* ─── Timeline por empleado (del periodo filtrado) ─────────────── */}
          {attView === 'diaria' && groupedByEmployee.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                Timeline del periodo
              </h3>
              <div className="space-y-2">
                {groupedByEmployee.map(emp => {
                  const empKey    = emp.employeeId ?? emp.employeeName;
                  const isExpanded = expandedEmps.has(empKey);
                  const sorted    = [...emp.records].sort((a, b) =>
                    new Date(a.timestamp ?? a.createdAt).getTime() - new Date(b.timestamp ?? b.createdAt).getTime()
                  );
                  const collapse  = sorted.length > 4 && !isExpanded;
                  const renderDot = (r: any, i: number, arr: any[]) => (
                    <div key={r.id ?? i} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorByType[r.type] ?? 'bg-gray-400'}`} />
                      <span className="text-xs text-gray-700 font-medium">{labelByType[r.type] ?? r.type}</span>
                      <span className="text-xs text-gray-400 font-mono">{fmtHoraChile(r.timestamp ?? r.createdAt)}</span>
                      {i < arr.length - 1 && <span className="text-gray-300 text-xs mx-0.5">&#8594;</span>}
                    </div>
                  );
                  return (
                  <div key={empKey} className="bg-white rounded-2xl border border-gray-100 p-4">
                    {/* Header tarjeta */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-indigo-600">
                            {(emp.employeeName ?? '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm">{emp.employeeName}</p>
                      </div>
                      {emp.currentStatus && (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badgeByType[emp.currentStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                          {labelByType[emp.currentStatus] ?? emp.currentStatus}
                        </span>
                      )}
                    </div>
                    {/* Timeline con colapso si > 4 eventos */}
                    {collapse ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {renderDot(sorted[0], 0, sorted)}
                        <span className="text-gray-300 text-xs mx-0.5">&#8594;</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          ... {sorted.length - 2} eventos ...
                        </span>
                        <span className="text-gray-300 text-xs mx-0.5">&#8594;</span>
                        {renderDot(sorted[sorted.length - 1], sorted.length - 1, sorted)}
                        <button
                          onClick={() => toggleExpandEmp(empKey)}
                          className="text-xs text-indigo-500 hover:text-indigo-700 ml-2 underline"
                        >
                          Ver todos
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {sorted.map((r, i) => renderDot(r, i, sorted))}
                        {sorted.length === 0 && <span className="text-xs text-gray-400">Sin registros</span>}
                        {isExpanded && sorted.length > 4 && (
                          <button onClick={() => toggleExpandEmp(empKey)} className="text-xs text-gray-400 hover:text-gray-600 ml-2 underline">
                            Colapsar
                          </button>
                        )}
                      </div>
                    )}
                    {/* Metricas */}
                    {(emp.hoursWorked || emp.colacionMin) && (
                      <div className="mt-2 pt-2 border-t border-gray-50 flex gap-4 text-xs text-gray-400">
                        {emp.hoursWorked && <span>Horas: <strong className="text-indigo-600">{emp.hoursWorked}</strong></span>}
                        {emp.colacionMin != null && <span>Colacion: <strong className="text-purple-500">{emp.colacionMin}min</strong></span>}
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resumen por empleado */}
          {attView === 'diaria' && attSummary.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {attSummary.map((s: any) => (
                <div key={s.employeeId ?? s.employeeName}
                  className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-indigo-600">
                        {s.employeeName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-800 text-sm truncate">{s.employeeName}</p>
                  </div>
                  {/* Conteos */}
                  <div className="flex gap-2 mb-3">
                    <span className="flex items-center gap-1 bg-green-50 text-green-600 text-xs font-medium px-2 py-1 rounded-lg">
                      <LogIn className="w-3 h-3" />{s.entries ?? 0} entrada{(s.entries ?? 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-medium px-2 py-1 rounded-lg">
                      <LogOut className="w-3 h-3" />{s.exits ?? 0} salida{(s.exits ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {/* firstEntry / lastExit / horas */}
                  {(s.firstEntry || s.lastExit) && (
                    <div className="space-y-1 pt-2 border-t border-gray-50">
                      {s.firstEntry && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Primera entrada</span>
                          <span className="text-xs font-mono font-medium text-gray-600">{formatTime(s.firstEntry)}</span>
                        </div>
                      )}
                      {s.lastExit && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Última salida</span>
                          <span className="text-xs font-mono font-medium text-gray-600">{formatTime(s.lastExit)}</span>
                        </div>
                      )}
                      {s.firstEntry && s.lastExit && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-gray-400">Horas trabajadas</span>
                          <span className="text-xs font-bold text-indigo-600">{calcWorkedHours(s.firstEntry, s.lastExit, s.colacionMin ?? 0)}</span>
                        </div>
                      )}
                      {(s.colacionMin ?? 0) > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Colación</span>
                          <span className="text-xs text-purple-500">{s.colacionMin} min</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ─── Vista Historial: 1 fila por empleado por dia ──────────── */}
          {attView === 'historial' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {histLoading ? (
                <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Cargando historial…
                </div>
              ) : histRows.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No hay registros para este período</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Fecha', 'Empleado', 'Entrada', 'S. Col.', 'E. Col.', 'Salida', 'H. Netas', 'Estado'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {histRows.map((row: any) => (
                      <tr key={`${row.date}-${row.employeeId}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                          {row.date ? new Date(row.date + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-indigo-600">
                                {(row.employeeName ?? '?').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-800">{row.employeeName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-green-600 font-mono font-medium">{row.entrada ?? '--'}</td>
                        <td className="px-4 py-2.5 text-xs text-yellow-600 font-mono">{row.salidaColacion ?? '--'}</td>
                        <td className="px-4 py-2.5 text-xs text-orange-600 font-mono">{row.entradaColacion ?? '--'}</td>
                        <td className="px-4 py-2.5 text-xs text-red-500 font-mono font-medium">{row.salida ?? '--'}</td>
                        <td className="px-4 py-2.5 text-xs text-indigo-600 font-bold">{row.horasNetas ?? '--'}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.estado === 'COMPLETO'
                              ? 'bg-green-100 text-green-700'
                              : row.estado === 'EN_CURSO'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {row.estado === 'COMPLETO' ? 'Completo' : row.estado === 'EN_CURSO' ? 'En curso' : 'Sin registro'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {/* Paginacion historial */}
              {histTotal > HIST_PAGE_SIZE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    Mostrando{' '}
                    <span className="font-semibold text-gray-600">
                      {(histPage - 1) * HIST_PAGE_SIZE + 1}–{Math.min(histPage * HIST_PAGE_SIZE, histTotal)}
                    </span>{' '}de{' '}
                    <span className="font-semibold text-gray-600">{histTotal}</span>{' '}registros
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setHistPage(1)} disabled={histPage === 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => setHistPage(p => p - 1)} disabled={histPage === 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600 px-2">
                      <span className="font-bold">{histPage}</span> / <span className="font-bold">{histTotalPages}</span>
                    </span>
                    <button onClick={() => setHistPage(p => p + 1)} disabled={histPage >= histTotalPages}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => setHistPage(histTotalPages)} disabled={histPage >= histTotalPages}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── JUSTIFICATIVOS TAB ── */}
      {activeTab === 'justificativos' && (
        <JustificativosTab employees={employees.map((e: any) => ({ id: e.id, name: e.name }))} />
      )}

      {/* ── ALERTAS TAB ── */}
      {activeTab === 'alertas' && (
        <AlertasPanel />
      )}

      {/* ── CALENDARIO TAB ── */}
      {activeTab === 'calendario' && (
        <CalendarioMensual employees={employees.map((e: any) => ({ id: e.id, name: e.name }))} />
      )}

      {/* ── DASHBOARD TAB ── */}
      {activeTab === 'dashboard' && (
        <DashboardAsistencia employees={employees} />
      )}

      {/* ── PERFIL EMPLEADO MODAL ── */}
      {profilEmp && (
        <EmployeeProfileModal
          employee={profilEmp}
          onClose={() => setProfilEmp(null)}
        />
      )}

      {/* ── MODALS ── */}
      {isEmpModalOpen && (
        <EmployeeModal
          employee={editingEmp}
          roles={roles}
          onClose={() => { setIsEmpModalOpen(false); setEditingEmp(null); }}
          onSubmit={(data: any) => {
            if (editingEmp) updateEmpMutation.mutate({ id: editingEmp.id, data });
            else            createEmpMutation.mutate(data);
          }}
          loading={createEmpMutation.isPending || updateEmpMutation.isPending}
        />
      )}

      {isRoleModalOpen && (
        <RoleModal
          role={editingRole}
          onClose={() => { setIsRoleModalOpen(false); setEditingRole(null); }}
          onSubmit={(data: any) => {
            if (editingRole) updateRoleMutation.mutate({ id: editingRole.id, data });
            else             createRoleMutation.mutate(data);
          }}
          loading={createRoleMutation.isPending || updateRoleMutation.isPending}
        />
      )}
      {qrEmp && (
        <EmployeeQrModal
          employee={qrEmp}
          onClose={() => setQrEmp(null)}
        />
      )}
      {editingRecord && (
        <EditAttendanceModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={() => {
            setEditingRecord(null);
            qc.invalidateQueries({ queryKey: ['attendance-records'] });
          }}
        />
      )}
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}

// ─── RUT helpers ─────────────────────────────────────────────────────────────
function validateRut(rut: string): boolean {
  const clean = rut.replace(/[.\-\s]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const digits = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0, mul = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const expected = 11 - (sum % 11);
  const dvExpected = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
  return dv === dvExpected;
}
function formatRut(value: string): string {
  const clean = value.replace(/[^\dkK]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv   = clean.slice(-1);
  const fmt  = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${fmt}-${dv}`;
}

// ─── Descripciones de rol para el dropdown ───────────────────────────────────
const ROLE_DESCRIPTIONS: Record<string, string> = {
  'Mesero':        'Toma pedidos, ve mesas y comandas',
  'Cajero':        'Cobra, cierra caja y ve ventas',
  'Cocinero':      'Ve KDS y gestiona preparaciones',
  'Gerente':       'Reportes, empleados y configuración parcial',
  'Inventario':    'Gestiona stock e ingredientes',
  'Administrador': 'Acceso completo al sistema',
  'Bartender':     'Pedidos de barra y tragos',
  'Delivery':      'Gestiona pedidos de delivery',
};

/** Sugiere un roleId dado un cargo libre */
function suggestRoleId(cargo: string, roles: any[]): string {
  if (!cargo) return '';
  const c = cargo.toLowerCase();
  const keywords: Record<string, string[]> = {
    'Mesero':     ['mesero','garzón','garzon','mozo','mesera'],
    'Cajero':     ['cajero','cajera','caja'],
    'Cocinero':   ['cocinero','cocinera','cocina','chef','ayudante cocina'],
    'Gerente':    ['gerente','supervisor','encargado','encargada'],
    'Inventario': ['inventario','bodega','bodeguero','stock'],
    'Bartender':  ['bartender','bar','barista'],
    'Delivery':   ['delivery','repartidor','reparto'],
  };
  for (const [name, kws] of Object.entries(keywords)) {
    if (kws.some(k => c.includes(k))) {
      const found = roles.find((r: any) => r.name === name);
      if (found) return found.id;
    }
  }
  return '';
}

// ─── EmployeeModal ────────────────────────────────────────────────────────────
function EmployeeModal({
  employee, roles, onClose, onSubmit, loading,
}: {
  employee: any; roles: any[]; onClose(): void;
  onSubmit(data: any): void; loading: boolean;
}) {
  const isEdit = !!employee;
  const [modalTab, setModalTab] = useState<'info' | 'sales' | 'attendance'>('info');
  const [rutError, setRutError] = useState('');
  const [form, setForm] = useState({
    // ── Datos Personales
    name:             employee?.name              ?? '',
    rut:              employee?.rut               ?? '',
    phone:            employee?.phone             ?? '',
    email:            employee?.email             ?? '',
    fecha_nacimiento: employee?.fecha_nacimiento
                        ? new Date(employee.fecha_nacimiento).toISOString().slice(0, 10) : '',
    direccion:        employee?.direccion         ?? '',
    // ── Datos Laborales
    cargo:            employee?.cargo             ?? '',
    tipo_contrato:    employee?.tipo_contrato     ?? '',
    fecha_inicio:     employee?.fecha_inicio
                        ? new Date(employee.fecha_inicio).toISOString().slice(0, 10) : '',
    fecha_termino:    employee?.fecha_termino
                        ? new Date(employee.fecha_termino).toISOString().slice(0, 10) : '',
    shift:            (employee?.shift && !['morning','afternoon','night'].includes(employee.shift)) ? 'custom' : (employee?.shift ?? 'morning'),
    shiftStart:       (employee?.shift && !['morning','afternoon','night'].includes(employee.shift)) ? (employee.shift.split('–')[0] ?? '') : '',
    shiftEnd:         (employee?.shift && !['morning','afternoon','night'].includes(employee.shift)) ? (employee.shift.split('–')[1] ?? '') : '',
    // ── Acceso al Sistema
    password:         '',
    roleId:           employee?.roleId            ?? '',
    active:           employee?.active            ?? true,
    pin:              '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [resetLoading, setResetLoading]         = useState(false);
  const [resetSuccess, setResetSuccess]         = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [changingPin, setChangingPin]           = useState(false);
  const hasPin = !!employee?.attendancePin;

  const { data: empDetails } = useQuery({
    queryKey: ['employee-detail', employee?.id],
    queryFn: () => employeesService.getEmployeeById(employee!.id),
    enabled: !!employee?.id,
    staleTime: 60_000,
  });
  const empStats = (empDetails as any)?.data?.stats ?? (empDetails as any)?.stats;

  const set = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, rut: e.target.value.replace(/[^\dkK.\-]/g, '') }));
    setRutError('');
  };

  /** Al cambiar cargo, auto-sugerir rol si aún no tiene uno asignado */
  const handleCargoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cargo = e.target.value;
    setForm(prev => {
      const suggested = !prev.roleId ? suggestRoleId(cargo, roles) : prev.roleId;
      return { ...prev, cargo, roleId: suggested };
    });
  };
  const handleRutBlur = () => {
    if (!form.rut) { setRutError(''); return; }
    const fmt = formatRut(form.rut);
    setForm(prev => ({ ...prev, rut: fmt }));
    setRutError(validateRut(form.rut) ? '' : 'RUT inválido (dígito verificador incorrecto)');
  };
  const handlePhoneBlur = () => {
    if (!form.phone) return;
    const d = form.phone.replace(/\D/g, '');
    if (d.startsWith('569') && d.length === 11)
      setForm(p => ({ ...p, phone: `+56 9 ${d.slice(3, 7)} ${d.slice(7)}` }));
    else if (d.startsWith('9') && d.length === 9)
      setForm(p => ({ ...p, phone: `+56 9 ${d.slice(1, 5)} ${d.slice(5)}` }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.rut && !validateRut(form.rut)) { setRutError('RUT inválido'); return; }
    if (!isEdit) {
      if (!form.password) {
        toast.error('La contraseña es obligatoria');
        return;
      }
      if (form.password.length < 8) {
        toast.error('La contraseña debe tener mínimo 8 caracteres');
        return;
      }
      if (!/[A-Z]/.test(form.password)) {
        toast.error('La contraseña debe contener al menos una letra mayúscula');
        return;
      }
      if (!/[0-9]/.test(form.password)) {
        toast.error('La contraseña debe contener al menos un número');
        return;
      }
    }
    if (form.shift === 'custom') {
      if (!form.shiftStart || !form.shiftEnd) {
        toast.error('Debes ingresar hora de inicio y hora de término para el turno personalizado');
        return;
      }
      if (form.shiftStart === form.shiftEnd) {
        toast.error('La hora de inicio y término no pueden ser iguales');
        return;
      }
    }
    const data: any = {
      name:             form.name,
      email:            form.email,
      roleId:           form.roleId,
      phone:            form.phone            || undefined,
      shift:            form.shift === 'custom'
                          ? `${form.shiftStart}–${form.shiftEnd}`
                          : form.shift            || null,
      rut:              form.rut              || undefined,
      cargo:            form.cargo            || undefined,
      tipo_contrato:    form.tipo_contrato    || undefined,
      fecha_inicio:     form.fecha_inicio     || undefined,
      fecha_termino:    form.fecha_termino    || undefined,
      fecha_nacimiento: form.fecha_nacimiento || undefined,
      direccion:        form.direccion        || undefined,
    };
    if (form.pin && /^\d{4}$/.test(form.pin)) {
      data.pin = form.pin;
      data.attendancePin = form.pin;
    }
    if (!isEdit && form.password) data.password = form.password;
    if (isEdit) data.active = form.active;
    onSubmit(data);
  };

  const handleResetPassword = () => { if (employee?.id) setResetConfirmOpen(true); };
  const doResetPassword = async () => {
    setResetConfirmOpen(false);
    setResetLoading(true);
    setResetSuccess(false);
    try {
      await api.post(`/employees/${employee.id}/reset-password`);
      setResetSuccess(true);
      toast.success(`Enlace de reset enviado a ${employee.email}`);
      setTimeout(() => setResetSuccess(false), 3_000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al enviar el reset de contraseña');
    } finally {
      setResetLoading(false);
    }
  };

  const isFechaTerminoRequired = form.tipo_contrato === 'plazo_fijo';

  return (
    <>
    <ConfirmModal
      isOpen={resetConfirmOpen}
      title="Resetear contraseña"
      message={`¿Resetear la contraseña de ${employee?.name}?\n\nSe enviará un enlace al correo: ${employee?.email}`}
      confirmLabel="Enviar enlace"
      variant="warning"
      onConfirm={doResetPassword}
      onCancel={() => setResetConfirmOpen(false)}
    />
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* Tabs — solo en edición */}
        {isEdit && (
          <div className="px-6 pt-4 flex-shrink-0">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {([
                { key: 'info',       label: 'Información' },
                { key: 'sales',      label: 'Ventas',     badge: empStats?.totalOrders > 0 ? String(empStats.totalOrders) : undefined },
                { key: 'attendance', label: 'Asistencia' },
              ] as { key: string; label: string; badge?: string }[]).map(t => (
                <button key={t.key} type="button"
                  onClick={() => setModalTab(t.key as any)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    modalTab === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                  {t.badge && <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full px-1.5 py-0.5">{t.badge}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto">
          {isEdit && modalTab === 'sales' && employee?.id && (
            <div className="p-6"><EmployeeSalesTab employeeId={employee.id} /></div>
          )}
          {isEdit && modalTab === 'attendance' && employee?.id && (
            <div className="p-6"><EmployeeAttendanceTab employeeId={employee.id} /></div>
          )}

          {(modalTab === 'info' || !isEdit) && (
            <form id="employee-form" onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Stats cards — solo edición */}
              {isEdit && empStats && (
                <div className="grid grid-cols-3 gap-3 pb-4 border-b border-gray-100">
                  <div className="bg-indigo-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-indigo-500 font-medium mb-0.5">Órdenes</p>
                    <p className="text-lg font-bold text-indigo-700">{empStats.totalOrders ?? 0}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-green-500 font-medium mb-0.5">Total ventas</p>
                    <p className="text-base font-bold text-green-700">{formatCLP(empStats.totalSales)}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-amber-500 font-medium mb-0.5">Ticket prom.</p>
                    <p className="text-base font-bold text-amber-700">{formatCLP(empStats.averageTicket)}</p>
                  </div>
                </div>
              )}

              {/* ─── SECCIÓN 1: Datos Personales ───────────────────────── */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  Datos Personales
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                    <input value={form.name} onChange={set('name')} required
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Nombre completo" />
                  </div>
                  {/* RUT */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RUT <span className="text-gray-400 font-normal text-xs">(12.345.678-9)</span>
                    </label>
                    <input
                      value={form.rut}
                      onChange={handleRutChange}
                      onBlur={handleRutBlur}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        rutError
                          ? 'border-red-400 focus:ring-red-400'
                          : 'border-gray-200 focus:ring-indigo-500'
                      }`}
                      placeholder="12.345.678-9"
                    />
                    {rutError && <p className="text-xs text-red-500 mt-1">{rutError}</p>}
                  </div>
                  {/* Fecha nacimiento */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                    <input type="date" value={form.fecha_nacimiento} onChange={set('fecha_nacimiento')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  {/* Teléfono */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input
                      value={form.phone}
                      onChange={set('phone')}
                      onBlur={handlePhoneBlur}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="+56 9 XXXX XXXX"
                    />
                  </div>
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" value={form.email} onChange={set('email')} required
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="empleado@restaurante.cl" />
                  </div>
                  {/* Dirección */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                    <input value={form.direccion} onChange={set('direccion')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Calle, número, comuna, ciudad" />
                  </div>
                </div>
              </div>

              {/* ─── SECCIÓN 2: Datos Laborales ────────────────────────── */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Datos Laborales
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Cargo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cargo / Puesto</label>
                    <input value={form.cargo} onChange={handleCargoChange}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: Mesero, Cajero, Cocinero" />
                  </div>
                  {/* Tipo contrato */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de contrato</label>
                    <select value={form.tipo_contrato} onChange={set('tipo_contrato')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value="">Seleccionar…</option>
                      <option value="indefinido">Indefinido</option>
                      <option value="plazo_fijo">Plazo fijo</option>
                      <option value="part_time">Part-time</option>
                    </select>
                  </div>
                  {/* Fecha inicio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
                    <input type="date" value={form.fecha_inicio} onChange={set('fecha_inicio')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  {/* Fecha término */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de término
                      {isFechaTerminoRequired
                        ? <span className="text-red-500 ml-1">*</span>
                        : <span className="text-gray-400 text-xs ml-1">(si aplica)</span>}
                    </label>
                    <input
                      type="date"
                      value={form.fecha_termino}
                      onChange={set('fecha_termino')}
                      required={isFechaTerminoRequired}
                      disabled={form.tipo_contrato === 'indefinido'}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
                    />
                  </div>
                  {/* Turno */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Turno
                      <span className="ml-1 text-xs text-gray-400 font-normal">(vinculado al QR de asistencia)</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'morning',   label: 'Mañana',       hours: '06:00–14:00', icon: '🌅' },
                        { value: 'afternoon', label: 'Tarde',         hours: '14:00–22:00', icon: '☀️' },
                        { value: 'night',     label: 'Noche',         hours: '22:00–06:00', icon: '🌙' },
                        { value: 'custom',    label: 'Personalizado', hours: 'hh:mm–hh:mm', icon: '✏️' },
                      ].map(t => (
                        <button key={t.value} type="button"
                          onClick={() => setForm(f => ({ ...f, shift: t.value }))}
                          className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-sm transition-colors ${
                            form.shift === t.value
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-lg">{t.icon}</span>
                          <span className="font-medium text-xs">{t.label}</span>
                          <span className="text-xs text-gray-400 font-normal">{t.hours}</span>
                        </button>
                      ))}
                    </div>
                    {form.shift === 'custom' && (
                      <div className="mt-3 grid grid-cols-2 gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                        <div>
                          <label className="block text-xs font-medium text-indigo-700 mb-1">Hora inicio *</label>
                          <input
                            type="time"
                            value={form.shiftStart}
                            onChange={e => setForm(f => ({ ...f, shiftStart: e.target.value }))}
                            required
                            className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-indigo-700 mb-1">Hora término *</label>
                          <input
                            type="time"
                            value={form.shiftEnd}
                            onChange={e => setForm(f => ({ ...f, shiftEnd: e.target.value }))}
                            required
                            className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ─── SECCIÓN 3: Acceso al Sistema ─────────────────────── */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Acceso al Sistema
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Password (solo crear) */}
                  {!isEdit && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                      <div className="relative">
                        <input
                          type={showPwd ? 'text' : 'password'}
                          value={form.password}
                          onChange={set('password')}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Mín. 8 caracteres, 1 mayúscula y 1 número"
                        />
                        <button type="button" onClick={() => setShowPwd(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Rol */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                    <select value={form.roleId} onChange={set('roleId')} required
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Seleccionar rol…</option>
                      {roles.map((r: any) => {
                        const desc = ROLE_DESCRIPTIONS[r.name];
                        return (
                          <option key={r.id} value={r.id}>
                            {desc ? `${r.name} — ${desc}` : r.name}
                          </option>
                        );
                      })}
                    </select>
                    {form.roleId && (() => {
                      const rol = roles.find((r: any) => r.id === form.roleId);
                      const desc = rol ? ROLE_DESCRIPTIONS[rol.name] : undefined;
                      return desc ? (
                        <p className="text-xs text-indigo-500 mt-1">{desc}</p>
                      ) : null;
                    })()}
                  </div>
                  {/* PIN Asistencia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PIN Asistencia
                      <span className="ml-1 text-gray-400 font-normal text-xs">(4 dígitos)</span>
                    </label>
                    {isEdit && hasPin && !changingPin ? (
                      <div className="flex items-center gap-2 py-2 px-3 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-green-700 text-sm font-medium">✅ PIN configurado</span>
                        <button
                          type="button"
                          onClick={() => setChangingPin(true)}
                          className="text-xs text-indigo-500 hover:text-indigo-700 underline ml-auto"
                        >
                          Cambiar PIN
                        </button>
                      </div>
                    ) : (
                      <input
                        type="password"
                        value={form.pin}
                        onChange={set('pin')}
                        maxLength={4}
                        inputMode="numeric"
                        pattern="\d{4}"
                        autoComplete="new-password"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-widest"
                        placeholder="••••"
                      />
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {isEdit && hasPin
                        ? 'Déjalo vacío para no cambiar el PIN actual.'
                        : 'PIN para marcar asistencia en el kiosco.'}
                    </p>
                  </div>
                  {/* Activo (solo editar) */}
                  {isEdit && (
                    <div className="col-span-2 flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="emp-active"
                        checked={form.active}
                        onChange={(e) => setForm(prev => ({ ...prev, active: e.target.checked }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="emp-active" className="text-sm text-gray-700">Empleado activo</label>
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer — siempre visible */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
          {isEdit ? (
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetLoading}
              className={`flex items-center gap-2 text-sm transition-colors disabled:opacity-40 ${
                resetSuccess ? 'text-green-500' : 'text-gray-400 hover:text-amber-500'
              }`}
            >
              {resetLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : resetSuccess
                  ? <CheckCircle className="w-4 h-4" />
                  : <KeyRound className="w-4 h-4" />
              }
              {resetLoading ? 'Enviando...' : resetSuccess ? 'Enviado' : 'Resetear contraseña'}
            </button>
          ) : <div />}
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            {(modalTab === 'info' || !isEdit) && (
              <Button type="submit" form="employee-form" disabled={loading}>
                {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear Empleado'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}


// ─── EmployeeQrModal ─────────────────────────────────────────────────────────
function EmployeeQrModal({ employee, onClose }: { employee: any; onClose(): void }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const BASE_URL = window.location.origin;

  useEffect(() => {
    const url = `${BASE_URL}/checkin?emp=${employee.id}`;
    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(() => {});
  }, [employee.id, BASE_URL]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr_asistencia_${(employee.name ?? 'empleado').replace(/\s+/g, '_').toLowerCase()}.png`;
    a.click();
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>QR Asistencia — ${employee.name}</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column;
           align-items: center; justify-content: center; min-height: 100vh; margin: 0;
           background: white; padding: 24px; box-sizing: border-box; }
    .card { border: 2px solid #e5e7eb; border-radius: 16px; padding: 32px 40px;
            display: flex; flex-direction: column; align-items: center; gap: 12px; }
    h2  { font-size: 22px; font-weight: 700; margin: 0; color: #111827; }
    p   { font-size: 13px; color: #6b7280; margin: 0; }
    img { margin: 8px 0; display: block; }
    .hint { font-size: 11px; color: #9ca3af; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${employee.name}</h2>
    <p>${employee.rut ? `RUT: ${employee.rut}` : ''}${employee.cargo ? ` · ${employee.cargo}` : ''}</p>
    <img src="${qrDataUrl}" width="220" height="220" alt="QR asistencia" />
    <p class="hint">Escanea para registrar entrada / salida</p>
  </div>
</body>
</html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">QR de Asistencia</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
            {employee.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">{employee.name}</p>
            {employee.rut   && <p className="text-xs text-gray-400 mt-0.5">{employee.rut}</p>}
            {employee.cargo && <p className="text-xs text-gray-400">{employee.cargo}</p>}
          </div>
          {qrDataUrl ? (
            <div className="p-3 bg-white border-2 border-gray-100 rounded-xl shadow-sm">
              <img src={qrDataUrl} alt="QR de asistencia" className="w-48 h-48" />
            </div>
          ) : (
            <div className="w-48 h-48 border-2 border-gray-100 rounded-xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
          )}
          <p className="text-xs text-gray-400 text-center max-w-[200px]">
            Escanea en el kiosco para registrar entrada / salida
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Descargar PNG
            </button>
            <button
              onClick={handlePrint}
              disabled={!qrDataUrl}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RoleModal ────────────────────────────────────────────────────────────────
// Permisos disponibles en BullWeb
const ALL_PERMISSIONS = [
  { group: 'POS',        perms: ['pos.access', 'pos.discount', 'pos.void'] },
  { group: 'Pedidos',    perms: ['orders.view', 'orders.manage', 'orders.void'] },
  { group: 'Menú',       perms: ['menu.view', 'menu.manage'] },
  { group: 'Inventario', perms: ['inventory.view', 'inventory.manage'] },
  { group: 'Clientes',   perms: ['customers.view', 'customers.manage'] },
  { group: 'Reportes',   perms: ['reports.view', 'reports.export'] },
  { group: 'Empleados',  perms: ['employees.view', 'employees.manage'] },
  { group: 'Admin',      perms: ['admin.view', 'admin.manage'] },
];

function RoleModal({
  role, onClose, onSubmit, loading,
}: {
  role: any; onClose(): void; onSubmit(data: any): void; loading: boolean;
}) {
  const isEdit = !!role;
  const [form, setForm] = useState({
    name:        role?.name        ?? '',
    description: role?.description ?? '',
  });
  const [selected, setSelected] = useState<Set<string>>(
    new Set(role?.permissions ?? [])
  );

  const toggle = (p: string) =>
    setSelected(prev => { const s = new Set(prev); s.has(p) ? s.delete(p) : s.add(p); return s; });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name:        form.name,
      description: form.description || undefined,
      permissions: Array.from(selected),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Editar Rol' : 'Nuevo Rol'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del rol *</label>
              <input value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Cajero, Mesero, Chef..." />
            </div>
            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Descripción opcional del rol" />
            </div>
            {/* Permisos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permisos{' '}
                <span className="text-xs font-normal text-gray-400">({selected.size} seleccionados · opcional)</span>
              </label>
              <div className="space-y-3 border border-gray-100 rounded-xl p-3 bg-gray-50">
                {ALL_PERMISSIONS.map(({ group, perms }) => (
                  <div key={group}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {perms.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => toggle(p)}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                            selected.has(p)
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 p-6 border-t border-gray-100 flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Guardando…' : isEdit ? 'Guardar' : 'Crear Rol'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
