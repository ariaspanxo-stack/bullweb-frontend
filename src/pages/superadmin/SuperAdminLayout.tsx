import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Building2, LayoutDashboard, LogOut, CreditCard, Settings, Activity, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import superadminService from '@/services/superadmin/superadminService';

function parseJwt(token: string): { exp?: number } | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('superadmin_token');
  if (!token) return <Navigate to="/superadmin/login" replace />;

  const payload = parseJwt(token);
  if (!payload) {
    localStorage.removeItem('superadmin_token');
    return <Navigate to="/superadmin/login" replace />;
  }

  // Token expirado
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    localStorage.removeItem('superadmin_token');
    return <Navigate to="/superadmin/login" replace />;
  }

  return <>{children}</>;
}

const NAV = [
  { to: '/superadmin',           label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/superadmin/tenants',   label: 'Clientes',   icon: Building2 },
  { to: '/superadmin/activity',  label: 'Actividad',  icon: Activity },
  { to: '/superadmin/payments',  label: 'Pagos',      icon: CreditCard },
  { to: '/superadmin/audit',     label: 'Auditoría',  icon: ShieldCheck },
  { to: '/superadmin/config',    label: 'Config',     icon: Settings },
];

export default function SuperAdminLayout() {
  const navigate   = useNavigate();
  const location   = useLocation();

  const { data: alertsData } = useQuery({
    queryKey: ['superadmin', 'alerts'],
    queryFn:  superadminService.getAlerts,
    refetchInterval: 5 * 60 * 1000,
  });
  const criticalCount = alertsData?.critical ?? 0;

  function handleLogout() {
    localStorage.removeItem('superadmin_token');
    navigate('/superadmin/login', { replace: true });
  }

  return (
    <SuperAdminGuard>
      <div className="min-h-screen flex bg-gray-950 text-white" data-superadmin="true">

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className="w-60 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">

          {/* Logo */}
          <div className="h-16 flex items-center gap-2 px-5 border-b border-gray-800">
            <img
              src="/images/bullweb-logo.png"
              alt="BullWeb Chile"
              className="h-10 w-10 object-contain rounded-full flex-shrink-0"
            />
            <span className="font-semibold text-sm leading-tight">
              BullWeb<br />
              <span className="text-indigo-400 text-xs font-normal">Super Admin</span>
            </span>
          </div>

          {/* Navegación */}
          <nav className="flex-1 py-4 px-3 space-y-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to ||
                (to !== '/superadmin' && location.pathname.startsWith(to));
              const showBadge = to === '/superadmin' && criticalCount > 0;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {showBadge && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-600 text-white leading-none">
                      {criticalCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-3 pb-4 border-t border-gray-800 pt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ── Contenido principal ─────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto bg-gray-950">
          <Outlet />
        </main>
      </div>
    </SuperAdminGuard>
  );
}
