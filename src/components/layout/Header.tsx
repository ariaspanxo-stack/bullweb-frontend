import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Menu, Bell, MessageCircle, User, Settings, LogOut, ChevronRight, ShoppingBag, AlertCircle, CheckCircle, X, Package, Download } from 'lucide-react';
import { useInstallPWA } from '@/components/pwa/InstallPWA';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { notificationsService, type RecentNotification } from '@/services/notificationsService';

// ============================================================================
// TIPOS
// ============================================================================

interface HeaderProps {
  onMenuClick: () => void;
}

// ============================================================================
// BREADCRUMB MAPPING
// ============================================================================

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/restaurant': 'Restaurant',
  '/orders': 'Órdenes',
  '/kitchen': 'Cocina',
  '/menu': 'Menú',
  '/inventory': 'Inventario',
  '/customers': 'Clientes',
  '/employees': 'Empleados',
  '/reports': 'Reportes',
  '/settings': 'Configuración'
};

// ============================================================================
// HELPERS
// ============================================================================

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)  return 'ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} hora${hrs > 1 ? 's' : ''}`;
  return `Hace ${Math.floor(hrs / 24)} día${Math.floor(hrs / 24) > 1 ? 's' : ''}`;
}

// ============================================================================
// BOTÓN INSTALAR PWA
// ============================================================================

function InstallAppButton() {
  const { canInstall, handleInstall } = useInstallPWA();
  if (!canInstall) return null;
  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
      title="Instalar aplicación"
    >
      <Download className="h-4 w-4" />
      <span className="hidden md:inline">Instalar App</span>
    </button>
  );
}

// ============================================================================
// COMPONENTE HEADER
// ============================================================================

export default function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [showNotif, setShowNotif]   = useState(false);
  const [dismissed, setDismissed]   = useState<Set<string>>(new Set());
  const [readIds, setReadIds]       = useState<Set<string>>(new Set());
  const notifRef = useRef<HTMLDivElement>(null);

  // Polling de notificaciones generales (30s fijo — table requests van por Socket.IO)
  const { data: rawNotifications_raw = [] } = useQuery<RecentNotification[]>({
    queryKey: ['notifications-recent'],
    queryFn:  () => notificationsService.getRecent(),
    refetchInterval: 30_000,
    staleTime:       3_000,
    retry: false,
  });

  // Filtrar descartadas y aplicar estado de lectura local
  const notifications: RecentNotification[] = rawNotifications_raw
    .filter((n: RecentNotification) => !dismissed.has(n.id))
    .map((n: RecentNotification) => ({ ...n, read: n.read || readIds.has(n.id) }));

  const unreadCount = notifications.filter(n => !n.read).length;

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = () =>
    setReadIds(prev => new Set([...prev, ...notifications.map(n => n.id)]));

  const dismiss = (id: string) =>
    setDismissed(prev => new Set([...prev, id]));

  const notifIcon = (type: string) => {
    if (type === 'NEW_ORDER')    return <ShoppingBag className="w-4 h-4 text-blue-500" />;
    if (type === 'ORDER_READY')  return <CheckCircle  className="w-4 h-4 text-green-500" />;
    if (type === 'LOW_STOCK')    return <AlertCircle  className="w-4 h-4 text-orange-500" />;
    if (type === 'OUT_OF_STOCK') return <Package     className="w-4 h-4 text-red-500" />;
    if (type === 'CASH_CLOSE')   return <CheckCircle  className="w-4 h-4 text-purple-500" />;
    if (type === 'TABLE_REQUEST') return <Bell        className="w-4 h-4 text-amber-500" />;
    return <Bell className="w-4 h-4 text-gray-400" />;
  };

  const breadcrumb = breadcrumbMap[location.pathname] || 'Inicio';

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada correctamente');
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Left: Menu button + Breadcrumbs */}
        <div className="flex items-center gap-4">
          {/* Botón menú (mobile) */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6 text-gray-700" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Inicio</span>
            {breadcrumb !== 'Inicio' && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-900">{breadcrumb}</span>
              </>
            )}
          </nav>
        </div>

        {/* Right: Notifications + User dropdown */}
        <div className="flex items-center gap-3">
          {/* Botón Instalar App (PWA) — visible solo si no está instalada */}
          <InstallAppButton />

          {/* Botón Soporte (abre Crisp chat) */}
          <button
            onClick={() => {
              if (window.$crisp) {
                window.$crisp.push(['do', 'chat:show'])
                window.$crisp.push(['do', 'chat:open'])
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            aria-label="Abrir chat de soporte"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Soporte</span>
          </button>

          {/* Notificaciones */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotif(v => !v)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5 text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                {/* Header panel */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="font-semibold text-gray-900 text-sm">Notificaciones</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                      Marcar todas como leídas
                    </button>
                  )}
                </div>

                {/* Lista */}
                <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 && (
                    <li className="px-4 py-8 text-center text-sm text-gray-400">Sin notificaciones</li>
                  )}
                  {notifications.map(n => (
                    <li key={n.id} className={cn('flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors', !n.read && 'bg-blue-50/40')}>
                      <div className="mt-0.5 p-1.5 rounded-lg bg-gray-100 flex-shrink-0">
                        {notifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm truncate', !n.read ? 'font-semibold text-gray-900' : 'text-gray-700')}>{n.title}</p>
                        <p className="text-xs text-gray-500 truncate">{n.body}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatRelative(n.createdAt)}</p>
                      </div>
                      <button onClick={() => dismiss(n.id)} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Dropdown de usuario */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg',
                  'hover:bg-gray-100 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500'
                )}
              >
                {/* Avatar */}
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>

                {/* Nombre (oculto en mobile) */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">{user?.name || 'Usuario'}</p>
                  <p className="text-xs text-gray-500">{user?.role?.name || 'N/A'}</p>
                </div>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={cn(
                  'min-w-56 bg-white rounded-lg shadow-lg border border-gray-200',
                  'py-1.5 z-50',
                  'animate-in fade-in-0 zoom-in-95'
                )}
                sideOffset={8}
                align="end"
              >
                {/* Header del dropdown */}
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>

                {/* Items del menú */}
                <DropdownMenu.Item
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm',
                    'text-gray-700 hover:bg-gray-100 cursor-pointer',
                    'focus:outline-none focus:bg-gray-100'
                  )}
                  onSelect={() => navigate('/profile')}
                >
                  <User className="h-4 w-4" />
                  <span>Mi Perfil</span>
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm',
                    'text-gray-700 hover:bg-gray-100 cursor-pointer',
                    'focus:outline-none focus:bg-gray-100'
                  )}
                  onSelect={() => navigate('/settings')}
                >
                  <Settings className="h-4 w-4" />
                  <span>Configuración</span>
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="h-px bg-gray-200 my-1.5" />

                <DropdownMenu.Item
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm',
                    'text-red-600 hover:bg-red-50 cursor-pointer',
                    'focus:outline-none focus:bg-red-50'
                  )}
                  onSelect={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

    </header>
  );
}
