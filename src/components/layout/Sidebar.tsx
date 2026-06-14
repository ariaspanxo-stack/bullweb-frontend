import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useStockAlerts } from '@/hooks/useStockAlerts';
import api from '@/services/api';
import {
  Receipt,
  UtensilsCrossed,
  Package,
  Warehouse,
  LogOut,
  User,
  Users,
  UserCheck,
  BarChart3,
  Mail,
  Megaphone,
  Heart,
  X,
  ShieldCheck,
  Users2,
  FileText,
  ChevronRight,
  LayoutDashboard,
  Building2,
  Monitor,
  Key,
  Webhook,
  MonitorSmartphone,
  HeartPulse,
  BarChart2,
  Lock,
  Database,
  Bell,
  Cpu,
  Paintbrush,
  Plug2,
  CreditCard,
  FileBarChart2,
  Printer,
  Coins,
  Settings2,
  BellRing,
  Smartphone,
  TrendingUp,
  Clock,
  QrCode,
  Tv,
  Receipt as ReceiptIcon,
  Tag,
  Truck,
  Wrench,
  Shield,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';

// ============================================================================
// TIPOS
// ============================================================================

interface SubItem {
  name: string;
  icon: React.ElementType;
  path: string;
  permission?: string | string[];
  openExternal?: boolean;
}

interface MenuItem {
  name: string;
  icon: React.ElementType;
  path: string;
  permission?: string | string[];
  badge?: string;
  subItems?: SubItem[];
  superAdminOnly?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
  colorClass?: string;
  superAdminOnly?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// CONFIGURACIÓN DEL MENÚ PRINCIPAL
// ============================================================================

const menuSections: MenuSection[] = [
  {
    title: 'Ventas',
    colorClass: 'text-orange-400',
    items: [
      { name: 'Restaurant',       icon: UtensilsCrossed, path: '/restaurant',    permission: 'pos.access'   },
      { name: 'Órdenes',          icon: Receipt,         path: '/orders',        permission: 'pos.access'   },
      { name: 'Pedidos Online',   icon: ShoppingBag,     path: '/online-orders', permission: 'pos.access'   },
      { name: 'Ventas',           icon: TrendingUp,      path: '/sales',         permission: 'sales.view'   },
      { name: 'KDS',              icon: Tv,              path: '/kds',           permission: 'kds.view'     },
    ]
  },
  {
    title: 'Gestión',
    colorClass: 'text-sky-400',
    items: [
      {
        name: 'Productos', icon: Package,    path: '/products', permission: 'products.view',
        subItems: [
          { name: 'Inventario', icon: Warehouse, path: '/inventory', permission: 'inventory.view' },
        ]
      },
      { name: 'Clientes',  icon: Users,     path: '/customers', permission: 'customers.view' },
      {
        name: 'Empleados', icon: UserCheck, path: '/employees', permission: 'employees.view',
        subItems: [
          { name: 'Asistencia', icon: Clock, path: '/kiosk/__TENANT__', openExternal: true, permission: 'employees.view' },
        ]
      },
    ]
  },
  {
    title: 'Canales',
    colorClass: 'text-emerald-400',
    items: [
      { name: 'Apps',         icon: Smartphone,        path: '/apps',             permission: 'apps.view'      },
      { name: 'App Mesero',   icon: MonitorSmartphone, path: '/admin/mesero-app', permission: 'apps.view', badge: 'Nuevo' },
      { name: 'Fidelización', icon: Heart,             path: '/campaigns',        permission: 'marketing.view', badge: '$4.990' },
      { name: 'Carta QR',    icon: QrCode,            path: '/carta-qr',         permission: 'marketing.view' },
      { name: 'Cupones',     icon: Tag,               path: '/coupons',          permission: 'coupons.view'   },
    ]
  },
  {
    title: 'Análisis',
    colorClass: 'text-orange-400',
    items: [
      { name: 'Reportes',    icon: BarChart3,    path: '/reports',        permission: 'reports.view'  },
      { name: 'Boletas DTE', icon: ReceiptIcon,  path: '/dte/documentos', permission: 'billing.view'  },
    ]
  },
];

// ============================================================================
// MENÚ ADMIN — secciones del panel de administración
// ============================================================================

const adminSections: MenuSection[] = [
  {
    title: 'General',
    superAdminOnly: true,
    items: [
      { name: 'Resumen',    icon: LayoutDashboard, path: '/admin'            },
      { name: 'Analíticas', icon: BarChart2,        path: '/admin/analytics' },
    ]
  },
  {
    title: 'Identidad',
    items: [
      { name: 'Usuarios',    icon: Users2,      path: '/admin/users'    },
      { name: 'Roles',       icon: ShieldCheck, path: '/admin/roles'    },
      // Sucursales: solo plan Enterprise — oculto para cliente mensual estándar
      { name: 'Dispositivos',icon: Monitor,     path: '/admin/devices', superAdminOnly: true  },
    ]
  },
  {
    title: 'Seguridad',
    superAdminOnly: true,
    items: [
      // Auditoría, Sesiones y API Keys son herramientas técnicas — ocultas
      { name: '2FA',       icon: Lock,              path: '/admin/2fa'      },
    ]
  },
  {
    title: 'Sistema',
    superAdminOnly: true,
    items: [
      { name: 'Config',         icon: Settings2, path: '/admin/settings'      },
      // Estado, Email y Backups son técnicos — ocultos
      { name: 'Notificaciones', icon: Bell,       path: '/admin/notifications' },
      { name: 'Alertas',        icon: BellRing,   path: '/admin/alerts'        },
      { name: 'Branding',       icon: Paintbrush, path: '/admin/branding'      },
    ]
  },
  {
    title: 'Negocio',
    items: [
      { name: 'Medios de Pago', icon: CreditCard,    path: '/admin/payment-methods' },
      { name: 'Propina',       icon: Coins,         path: '/admin/propina'        },
      { name: 'Impresoras',    icon: Printer,       path: '/admin/printers'      },
      { name: 'Impresión',     icon: Printer,       path: '/settings/print'      },
      { name: 'Reportes',      icon: FileBarChart2, path: '/admin/reports',       superAdminOnly: true },
      // Integraciones y Webhooks son avanzados — ocultos
      { name: 'Módulos',       icon: Cpu,           path: '/admin/modules',       superAdminOnly: true },
      { name: 'App Mesero',    icon: MonitorSmartphone, path: '/admin/mesero-app', badge: 'Nuevo' },
    ]
  },
  {
    title: 'Infraestructura',
    superAdminOnly: true,
    items: [
      { name: 'Health',        icon: HeartPulse, path: '/admin/health'          },
      { name: 'Logs',          icon: FileText,   path: '/admin/logs'            },
      { name: 'Backup',        icon: Database,   path: '/admin/backup'          },
      { name: 'Scheduler',     icon: Clock,      path: '/admin/scheduler'       },
      { name: 'Mantenimiento', icon: Wrench,     path: '/admin/maintenance'     },
      { name: 'Rate Limiter',  icon: BarChart2,  path: '/admin/rate-limiter'    },
      { name: 'IP Blocklist',  icon: Shield,     path: '/admin/ip-blocklist'    },
      { name: 'Seg. Policy',   icon: Lock,       path: '/admin/security-policy' },
      { name: 'Email SMTP',    icon: Mail,       path: '/admin/email'           },
    ]
  },
  {
    title: 'Desarrollo',
    superAdminOnly: true,
    items: [
      { name: 'API Keys',       icon: Key,      path: '/admin/keys'          },
      { name: 'Webhooks',       icon: Webhook,  path: '/admin/webhooks'      },
      { name: 'Feature Flags',  icon: Cpu,      path: '/admin/feature-flags' },
      { name: 'API Playground', icon: Monitor,  path: '/admin/api-playground'},
      { name: 'Integraciones',  icon: Plug2,    path: '/admin/integrations'  },
      { name: 'Audit',          icon: FileText, path: '/admin/audit'         },
      { name: 'Audit Trail',    icon: FileText, path: '/admin/audit-trail'   },
    ]
  },
  {
    title: 'Datos Avanzados',
    superAdminOnly: true,
    items: [
      { name: 'Data Import',      icon: Database,   path: '/admin/data-import'      },
      { name: 'Privacidad',       icon: Lock,       path: '/admin/data-privacy'     },
      { name: 'Multi-Tenant',     icon: Building2,  path: '/admin/tenants'          },
      { name: 'Sucursales',       icon: Building2,  path: '/admin/branches'         },
      { name: 'Ticket Templates', icon: Printer,    path: '/admin/ticket-templates' },
      { name: 'RBAC Avanzado',    icon: ShieldCheck,path: '/admin/rbac'             },
    ]
  },
];

// ============================================================================
// COMPONENTE SIDEBAR
// ============================================================================

function avatarGradient(name: string) {
  const palettes = [
    'from-blue-500 to-blue-600', 'from-violet-500 to-violet-600',
    'from-emerald-500 to-emerald-600', 'from-orange-500 to-orange-600',
    'from-pink-500 to-pink-600', 'from-teal-500 to-teal-600',
  ];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return palettes[Math.abs(h) % palettes.length];
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [adminOpen, setAdminOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { lowStockCount } = useStockAlerts();
  const isSuperAdmin = useIsSuperAdmin();

  // ── Badge contador pedidos QR pendientes ─────────────────────────────────
  const [pendingQrCount, setPendingQrCount] = useState(0);
  useEffect(() => {
    const fetchCount = () => {
      api.get('/qr-orders/online/count')
        .then(r => setPendingQrCount(r.data?.count ?? 0))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  const isAdminSection = location.pathname.startsWith('/admin');

  // Permisos del usuario actual
  const userPermissions = (user?.role?.permissions ?? []) as string[];
  const isAdmin = userPermissions.includes('ALL_PERMISSIONS');

  /** Verifica si el usuario puede ver un item según su permiso requerido */
  const canSee = (permission?: string | string[]): boolean => {
    if (!permission) return true;
    if (isAdmin) return true;
    if (Array.isArray(permission)) return permission.some(p => userPermissions.includes(p));
    return userPermissions.includes(permission);
  };

  /** Filtra las secciones del menú según los permisos del usuario */
  const visibleSections = menuSections
    .map(section => ({
      ...section,
      items: section.items
        .filter(item => canSee(item.permission))
        .map(item => ({
          ...item,
          subItems: item.subItems?.filter(sub => canSee(sub.permission)),
        })),
    }))
    .filter(section => section.items.length > 0);

  const handleAdminNav = (path: string) => {
    navigate(path);
    setAdminOpen(false);
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel admin deslizante */}
      {adminOpen && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setAdminOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-72 bg-gray-950 border-r border-gray-800 z-[60] flex flex-col shadow-2xl overflow-hidden">
            {/* Header panel admin */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-blue-600/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Panel Admin</p>
                  <p className="text-xs text-gray-400">Enterprise</p>
                </div>
              </div>
              <button
                onClick={() => setAdminOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav del panel admin */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              <div className="space-y-5">
                {adminSections
                  .filter(s => !s.superAdminOnly || isSuperAdmin)
                  .map(section => (
                  <div key={section.title}>
                    <p className="px-2 mb-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {section.title}
                    </p>
                    <div className="space-y-0.5">
                      {section.items
                        .filter(item => !item.superAdminOnly || isSuperAdmin)
                        .map(item => {
                        const Icon    = item.icon;
                        const active  = location.pathname === item.path ||
                                        (item.path === '/admin' && location.pathname === '/admin');
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleAdminNav(item.path)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                              active
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            )}
                          >
                            <Icon className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1">{item.name}</span>
                            {item.badge && (
                              <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold leading-none flex-shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>

            {/* Footer panel admin */}
            <div className="px-4 py-3 border-t border-gray-800">
              <button
                onClick={() => { handleAdminNav('/dashboard'); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                Volver al sistema
              </button>
            </div>
          </div>
        </>
      )}

      {/* Sidebar principal */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50',
          'w-[220px] border-r border-white/5',
          'transform transition-transform duration-300 ease-in-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1B2B5E 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2.5 px-4 py-3 flex-1">
            <div className="flex items-center gap-2">
              <img
                src="/logo-bullweb-white.png"
                alt="BullWeb Chile"
                className="h-10 w-auto object-contain flex-shrink-0"
              />
              <span className="text-white font-bold text-sm leading-tight">
                BullWeb<br/>Chile
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 mr-2"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5 text-white/60" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-1 px-1 [&::-webkit-scrollbar]:w-0">
          <div>
            {visibleSections.map((section, sIdx) => (
              <div key={section.title}>
                <div className="flex items-center gap-2 px-4 pt-2 pb-0.5">
                  <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/30 whitespace-nowrap">
                    {section.title}
                  </p>
                  <div className="flex-1 h-px bg-white/[0.08]" />
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon        = item.icon;
                    const isActive    = location.pathname === item.path;
                    const hasChildren = !!item.subItems?.length;
                    const childActive = item.subItems?.some(s => location.pathname === s.path) ?? false;
                    return (
                      <div key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                          className={cn(
                          'relative flex items-center gap-3 px-4 py-1.5 rounded-xl mx-1',
                            'text-sm font-medium transition-all duration-150',
                            isActive || childActive
                              ? 'bg-white/10 text-white'
                              : 'text-white/60 hover:text-white hover:bg-white/5'
                          )}
                        >
                          {(isActive || childActive) && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-r-full" />
                          )}
                          <Icon className={cn(
                            'h-4 w-4 flex-shrink-0',
                            isActive || childActive
                              ? 'text-orange-400'
                              : (section.colorClass ?? 'text-white/40')
                          )} />
                          <span className="flex-1 truncate">{item.name}</span>
                          {item.badge && (
                            <span className="bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none flex-shrink-0">
                              {item.badge}
                            </span>
                          )}
                          {item.path === '/online-orders' && pendingQrCount > 0 && (
                            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none flex-shrink-0 animate-pulse">
                              {pendingQrCount > 9 ? '9+' : pendingQrCount}
                            </span>
                          )}
                        </Link>
                        {hasChildren && (
                          <div className="mt-0.5 ml-4 pl-3 border-l border-white/[0.08] space-y-0.5">
                            {item.subItems!.map(sub => {
                              const SubIcon     = sub.icon;
                              const resolvedPath = sub.path.replace('__TENANT__', user?.tenantId ?? '');
                              const isSubActive = !sub.openExternal && location.pathname === sub.path;
                              if (sub.openExternal) {
                                return (
                                  <button
                                    key={sub.path}
                                    type="button"
                                    onClick={() => { window.open(resolvedPath, '_blank'); if (window.innerWidth < 1024) onClose(); }}
                                    className={cn(
                                      'relative flex items-center gap-3 px-4 py-1.5 rounded-xl w-full',
                                      'text-sm font-medium transition-all duration-150',
                                      'text-white/60 hover:text-white hover:bg-white/5'
                                    )}
                                  >
                                    <SubIcon className={cn('h-3.5 w-3.5 flex-shrink-0', section.colorClass ?? 'text-white/40')} />
                                    <span>{sub.name}</span>
                                  </button>
                                );
                              }
                              return (
                                <Link
                                  key={sub.path}
                                  to={sub.path}
                                  onClick={() => window.innerWidth < 1024 && onClose()}
                                  className={cn(
                                    'relative flex items-center gap-3 px-4 py-1.5 rounded-xl',
                                    'text-sm font-medium transition-all duration-150',
                                    isSubActive
                                      ? 'bg-white/10 text-white'
                                      : 'text-white/60 hover:text-white hover:bg-white/5'
                                  )}
                                >
                                  {isSubActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-orange-500 rounded-r-full" />
                                  )}
                                  <SubIcon className={cn(
                                    'h-3.5 w-3.5 flex-shrink-0',
                                    isSubActive ? 'text-orange-400' : (section.colorClass ?? 'text-white/40')
                                  )} />
                                  <span>{sub.name}</span>
                                  {/* Badge rojo para stock bajo en Inventario */}
                                  {sub.path === '/inventory' && lowStockCount > 0 && (
                                    <span className="ml-auto inline-flex items-center justify-center w-4 h-4 text-xs font-bold bg-red-500 text-white rounded-full">
                                      {lowStockCount > 9 ? '9+' : lowStockCount}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {sIdx < visibleSections.length - 1 && (
                  <div className="mx-4 mt-2 border-t border-white/[0.06]" />
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Card usuario */}
        {user && (
          <div className="border-t border-white/10 p-3 space-y-1">
            {/* Links rápidos */}
            <div className="grid grid-cols-2 gap-1 px-1 pb-1">
              <Link
                to="/profile"
                onClick={() => window.innerWidth < 1024 && onClose()}
                className="flex items-center justify-center gap-1.5 text-xs text-white/50 hover:text-white/90 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                Perfil
              </Link>
              {isAdmin && (
              <Link
                to="/settings"
                onClick={() => window.innerWidth < 1024 && onClose()}
                className="flex items-center justify-center gap-1.5 text-xs text-white/50 hover:text-white/90 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Config
              </Link>
              )}
              {isAdmin && (
              <Link
                to="/profile/restaurant"
                onClick={() => window.innerWidth < 1024 && onClose()}
                className="flex items-center justify-center gap-1.5 text-xs text-white/50 hover:text-white/90 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5" />
                Local
              </Link>
              )}
              <button
                onClick={() => logout()}
                className="col-span-2 flex items-center justify-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors border border-red-500/10"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </button>
            </div>
            {/* Info usuario */}
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-white/5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-orange-500/30">
                {user.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold leading-tight break-words">{user.name ?? 'Usuario'}</p>
                <p className="text-white/40 text-[10px] truncate leading-tight">{user.role?.name ?? 'Sin rol'}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 ring-2 ring-emerald-400/30" />
            </div>
          </div>
        )}

        {/* Botón Administración — solo visible para admins */}
        {(isAdmin || userPermissions.includes('employees.manage')) && (
        <div className="px-3 pb-4 pt-1 border-t border-white/10">
          <button
            onClick={() => setAdminOpen(true)}
            className={cn(
              'w-full flex items-center justify-between gap-3 px-4 py-2 rounded-xl',
              'text-sm font-semibold transition-all',
              isAdminSection
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            )}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className={cn('h-4 w-4 flex-shrink-0', isAdminSection ? 'text-white' : 'text-purple-400')} />
              <span>Administración</span>
            </div>
            <ChevronRight className="h-4 w-4 opacity-60" />
          </button>
        </div>
        )}
      </aside>
    </>
  );
}
