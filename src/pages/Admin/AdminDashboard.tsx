/**
 * BULLWEB ENTERPRISE — Admin Dashboard
 * Resumen ejecutivo del sistema: usuarios, roles, seguridad, actividad reciente.
 */

import { useQuery } from '@tanstack/react-query';
import {
  Users2, ShieldCheck, FileText, Building2,
  AlertTriangle, TrendingUp, Activity, Lock,
  CheckCircle2, XCircle, MonitorSmartphone, BellRing,
  Monitor, Key, Settings2,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------
interface StatCardProps {
  label:    string;
  value:    string | number;
  sub?:     string;
  icon:     React.ElementType;
  color:    string;
  to?:      string;
  loading?: boolean;
}

const StatCard = ({ label, value, sub, icon: Icon, color, to, loading }: StatCardProps) => {
  const inner = (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 ${to ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        {loading ? (
          <div className="h-7 w-16 bg-gray-100 animate-pulse rounded mt-1" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        )}
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

// ---------------------------------------------------------------------------
// Severity dot
// ---------------------------------------------------------------------------
const SeverityDot = ({ severity }: { severity: string }) => {
  const map: Record<string, string> = {
    INFO:     'bg-blue-400',
    WARNING:  'bg-yellow-400',
    CRITICAL: 'bg-red-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${map[severity] ?? 'bg-gray-300'}`} />;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export default function AdminDashboard() {
  const { data: _auditStats, isLoading: _loadingStats } = useQuery({
    queryKey: ['admin-audit-stats'],
    queryFn:  () => adminService.getAuditStats(),
    staleTime: 30000,
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users-summary'],
    queryFn:  () => adminService.listUsers({ limit: 1 }),
    staleTime: 30000,
  });

  const { data: rolesData, isLoading: loadingRoles } = useQuery({
    queryKey: ['admin-roles-summary'],
    queryFn:  () => adminService.listRoles(),
    staleTime: 30000,
  });

  const { data: recentLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['admin-recent-audit'],
    queryFn:  () => adminService.listAuditLogs({ limit: 8, page: 1 }),
    staleTime: 15000,
  });

  const { data: securityEvents, isLoading: loadingSec } = useQuery({
    queryKey: ['admin-security-events'],
    queryFn:  () => adminService.listAuditLogs({ severity: 'CRITICAL', limit: 5, page: 1 }),
    staleTime: 15000,
  });

  const { data: alertCount, isLoading: loadingAlerts } = useQuery({
    queryKey: ['admin', 'alertCount'],
    queryFn:  () => adminService.getAlertCount(),
    staleTime: 30000,
  });

  const { data: branchesData, isLoading: loadingBranches } = useQuery({
    queryKey: ['admin-branches-summary'],
    queryFn:  () => adminService.listBranches(),
    staleTime: 60000,
  });

  const { data: devicesData, isLoading: loadingDevices } = useQuery({
    queryKey: ['admin-devices-summary'],
    queryFn:  () => adminService.listDevices(),
    staleTime: 60000,
  });

  const totalUsers   = usersData?.meta?.total ?? 0;
  const totalRoles   = rolesData?.length ?? 0;
  const criticalEvt  = (securityEvents?.data ?? []).length;
  const totalAudit   = recentLogs?.meta?.total ?? 0;
  const pendingAlert = alertCount?.total ?? 0;
  const critAlert    = alertCount?.critical ?? 0;
  const totalBranch  = branchesData?.length ?? 0;
  const activeBranch = branchesData?.filter(b => b.isActive)?.length ?? 0;
  const totalDev     = devicesData?.length ?? 0;
  const onlineDev    = devicesData?.filter(d => d.status === 'ONLINE')?.length ?? 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Resumen operacional del sistema Bullweb Enterprise
        </p>
      </div>

      {/* Stats — fila 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Usuarios"
          value={totalUsers}
          sub="registrados en el sistema"
          icon={Users2}
          color="bg-blue-500"
          to="/admin/users"
          loading={loadingUsers}
        />
        <StatCard
          label="Roles"
          value={totalRoles}
          sub="perfiles de acceso"
          icon={ShieldCheck}
          color="bg-indigo-500"
          to="/admin/roles"
          loading={loadingRoles}
        />
        <StatCard
          label="Sucursales"
          value={totalBranch}
          sub={`${activeBranch} activas`}
          icon={Building2}
          color="bg-emerald-500"
          to="/admin/branches"
          loading={loadingBranches}
        />
        <StatCard
          label="Dispositivos"
          value={totalDev}
          sub={`${onlineDev} en línea`}
          icon={Monitor}
          color="bg-teal-500"
          to="/admin/devices"
          loading={loadingDevices}
        />
      </div>

      {/* Stats — fila 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Alertas pendientes"
          value={pendingAlert}
          sub={critAlert > 0 ? `${critAlert} críticas` : 'Sin alertas críticas'}
          icon={BellRing}
          color={critAlert > 0 ? 'bg-red-500' : pendingAlert > 0 ? 'bg-amber-500' : 'bg-green-500'}
          to="/admin/alerts"
          loading={loadingAlerts}
        />
        <StatCard
          label="Eventos críticos"
          value={criticalEvt}
          sub="últimas 24h (CRITICAL)"
          icon={AlertTriangle}
          color={criticalEvt > 0 ? 'bg-red-500' : 'bg-green-500'}
          to="/admin/audit"
          loading={loadingSec}
        />
        <StatCard
          label="Registro auditoría"
          value={totalAudit.toLocaleString('es-CL')}
          sub="entradas totales"
          icon={FileText}
          color="bg-purple-500"
          to="/admin/audit"
          loading={loadingLogs}
        />
      </div>

      {/* Grid inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Actividad reciente */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-gray-400" />
              <h2 className="font-semibold text-gray-800 text-sm">Actividad reciente</h2>
            </div>
            <Link to="/admin/audit" className="text-xs text-indigo-600 hover:text-indigo-700">
              Ver todo →
            </Link>
          </div>
          <div className="divide-y">
            {loadingLogs
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-100 rounded-full animate-pulse" />
                    <div className="flex-1 h-4 bg-gray-50 rounded animate-pulse" />
                    <div className="w-24 h-3 bg-gray-50 rounded animate-pulse" />
                  </div>
                ))
              : (recentLogs?.data ?? []).map((log) => (
                  <div key={log.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <SeverityDot severity={log.severity} />
                    <span className="flex-1 text-sm text-gray-700 truncate">
                      <code className="bg-gray-100 text-xs px-1 py-0.5 rounded mr-1.5 font-mono">{log.action}</code>
                      {log.targetDesc ?? log.module}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
            }
            {!loadingLogs && (recentLogs?.data ?? []).length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                No hay actividad registrada aún
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho */}
        <div className="flex flex-col gap-4">

          {/* Alertas de seguridad */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
              <Lock size={15} className="text-red-400" />
              <h2 className="font-semibold text-gray-800 text-sm">Alertas de seguridad</h2>
            </div>
            <div className="divide-y max-h-52 overflow-auto">
              {loadingSec
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="px-5 py-3">
                      <div className="h-3 bg-gray-50 rounded animate-pulse" />
                    </div>
                  ))
                : (securityEvents?.data ?? []).length === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <CheckCircle2 size={28} className="text-green-400 mx-auto mb-1.5" />
                      <p className="text-xs text-gray-400">Sin alertas críticas</p>
                    </div>
                  )
                : (securityEvents?.data ?? []).map((ev) => (
                    <div key={ev.id} className="px-5 py-3">
                      <div className="flex items-start gap-2">
                        <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-800">{ev.action}</p>
                          <p className="text-xs text-gray-400">{ev.targetDesc ?? ev.module}</p>
                          <p className="text-[10px] text-gray-300 mt-0.5">
                            {new Date(ev.createdAt).toLocaleString('es-CL')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>
            <div className="px-5 py-3 border-t border-gray-50">
              <Link to="/admin/audit" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <TrendingUp size={11} />
                Ver historial completo
              </Link>
            </div>
          </div>

          {/* Roles del sistema */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-indigo-400" />
                <h2 className="font-semibold text-gray-800 text-sm">Roles activos</h2>
              </div>
              <Link to="/admin/roles" className="text-xs text-indigo-600 hover:text-indigo-700">
                Gestionar →
              </Link>
            </div>
            <div className="px-5 py-3 flex flex-wrap gap-2">
              {loadingRoles
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                  ))
                : (rolesData ?? []).map((role) => (
                    <span
                      key={role.id}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        role.isSystem
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      {role.isSystem && <ShieldCheck size={9} />}
                      {role.name}
                      <span className="text-gray-300 ml-0.5">{role.userCount}</span>
                    </span>
                  ))
              }
              {!loadingRoles && (rolesData ?? []).length === 0 && (
                <p className="text-xs text-gray-400 py-2">Sin roles configurados</p>
              )}
            </div>
          </div>

          {/* Accesos rápidos */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-800 text-sm">Accesos rápidos</h2>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {[
                { label: 'Usuarios',     to: '/admin/users',    icon: Users2,          color: 'text-blue-600   bg-blue-50'    },
                { label: 'Roles',        to: '/admin/roles',    icon: ShieldCheck,     color: 'text-indigo-600 bg-indigo-50'  },
                { label: 'Sucursales',   to: '/admin/branches', icon: Building2,       color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Dispositivos', to: '/admin/devices',  icon: Monitor,         color: 'text-teal-600   bg-teal-50'    },
                { label: 'Alertas',      to: '/admin/alerts',   icon: BellRing,        color: 'text-red-600    bg-red-50'     },
                { label: 'API Keys',     to: '/admin/keys',     icon: Key,             color: 'text-amber-600  bg-amber-50'   },
                { label: 'Config',       to: '/admin/settings', icon: Settings2,       color: 'text-purple-600 bg-purple-50'  },
              ].map((q) => (
                <Link
                  key={q.to}
                  to={q.to}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg ${q.color} flex items-center justify-center`}>
                    <q.icon size={15} />
                  </div>
                  <span className="text-xs text-gray-600 text-center leading-tight">{q.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
