import { useEffect, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Building2, LayoutDashboard, LogOut, CreditCard, Settings, Activity, ShieldCheck, Clock } from 'lucide-react';
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

const NAV_SECTIONS = [
  {
    label: 'Gestión',
    items: [
      { to: '/superadmin',          label: 'Dashboard',  icon: LayoutDashboard },
      { to: '/superadmin/tenants',  label: 'Clientes',   icon: Building2 },
      { to: '/superadmin/activity', label: 'Actividad',  icon: Activity },
      { to: '/superadmin/payments', label: 'Pagos',      icon: CreditCard },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/superadmin/audit',  label: 'Auditoría',     icon: ShieldCheck },
      { to: '/superadmin/config', label: 'Configuración', icon: Settings },
    ],
  },
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

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const clock = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

  function handleLogout() {
    localStorage.removeItem('superadmin_token');
    navigate('/superadmin/login', { replace: true });
  }

  return (
    <SuperAdminGuard>
      <div className="min-h-screen flex bg-gray-950 text-white" data-superadmin="true">

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className="w-64 flex-shrink-0 bg-gray-950 border-r border-white/5 flex flex-col">

          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
            <img
              src="/logo-bullweb.png"
              alt="BullWeb Chile"
              className="h-9 w-9 object-contain rounded-xl flex-shrink-0"
            />
            <span className="leading-tight">
              <span className="block font-bold text-white text-sm">BullWeb</span>
              <span className="block text-xs text-gray-500">Command Center</span>
            </span>
          </div>

          {/* Navegación */}
          <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map(({ to, label, icon: Icon }) => {
                    const active = location.pathname === to ||
                      (to !== '/superadmin' && location.pathname.startsWith(to));
                    const showBadge = to === '/superadmin' && criticalCount > 0;
                    return (
                      <Link
                        key={to}
                        to={to}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active
                          ? 'bg-brand-500/10 text-brand-400 ring-1 ring-inset ring-brand-500/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
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
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-3 pb-4 border-t border-white/5 pt-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* ── Contenido principal ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0A0A0B]">
          <header className="sticky top-0 z-40 h-14 border-b border-white/5 bg-gray-950/80 backdrop-blur px-6 flex items-center justify-between flex-shrink-0">
            <span className="text-sm text-gray-500">Super Admin</span>
            <span className="flex items-center gap-2 text-sm text-gray-400 tabular-nums">
              <Clock className="w-4 h-4 text-gray-500" />
              {clock} CLT
            </span>
          </header>
          <main className="flex-1 overflow-auto p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SuperAdminGuard>
  );
}
