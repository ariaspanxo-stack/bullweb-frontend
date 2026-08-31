import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Menu, Bell, MessageCircle, User, Settings, LogOut, ChevronRight, ShoppingBag, AlertCircle, CheckCircle, X, Package, Download, Headset } from 'lucide-react';
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
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-white/10"
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
    <header className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur border-b border-white/5 shadow-sm">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Left: Menu button + Breadcrumbs */}
        <div className="flex items-center gap-4">
          {/* Botón menú (mobile) */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Inicio</span>
            {breadcrumb !== 'Inicio' && (
              <>
                <ChevronRight className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-white">{breadcrumb}</span>
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Abrir chat de soporte"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Soporte</span>
          </button>

          {/* Botón Soporte Remoto (descarga TeamViewer QuickSupport) */}
          <a
            href="https://download.teamviewer.com/download/TeamViewerQS.exe"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-white/10"
            title="Descargar TeamViewer QuickSupport"
          >
            <Headset className="h-4 w-4" />
            <span className="hidden sm:inline">Soporte Remoto</span>
          </a>

          {/* Notificaciones */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotif(v => !v)}
              className="relative p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-brand-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 mt-2 w-80 bg-gray-900 rounded-xl shadow-2xl border border-white/10 z-50 overflow-hidden">
                {/* Header panel */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <span className="font-semibold text-white text-sm">Notificaciones</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-brand-400 hover:underline">
                      Marcar todas como leídas
                    </button>
                  )}
                </div>

                {/* Lista */}
                <ul className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {notifications.length === 0 && (
                    <li className="px-4 py-8 text-center text-sm text-gray-400">Sin notificaciones</li>
                  )}
                  {notifications.map(n => (
                    <li key={n.id} className={cn('flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors', !n.read && 'bg-brand-500/10')}>
                      <div className="mt-0.5 p-1.5 rounded-lg bg-white/5 flex-shrink-0">
                        {notifIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm truncate', !n.read ? 'font-semibold text-white' : 'text-gray-300')}>{n.title}</p>
                        <p className="text-xs text-gray-500 truncate">{n.body}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{formatRelative(n.createdAt)}</p>
                      </div>
                      <button onClick={() => dismiss(n.id)} className="text-gray-600 hover:text-gray-400 flex-shrink-0">
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
                  'hover:bg-white/5 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500/50'
                )}
              >
                {/* Avatar */}
                <div className="bg-gradient-to-br from-brand-400 to-brand-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-2 ring-brand-500/30">
                  <span>
                    {(user?.name || 'Usuario')
                      .split(' ')
                      .slice(0, 2)
                      .map((w: string) => w.charAt(0).toUpperCase())
                      .join('')}
                  </span>
                </div>

                {/* Nombre (oculto en mobile) */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-white">{user?.name || 'Usuario'}</p>
                  <p className="text-xs text-gray-500">{user?.role?.name || 'N/A'}</p>
                </div>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={cn(
                  'min-w-56 bg-gray-900 rounded-lg shadow-2xl border border-white/10',
                  'py-1.5 z-50',
                  'animate-in fade-in-0 zoom-in-95'
                )}
                sideOffset={8}
                align="end"
              >
                {/* Header del dropdown */}
                <div className="px-3 py-2 border-b border-white/5">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>

                {/* Items del menú */}
                <DropdownMenu.Item
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm',
                    'text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer',
                    'focus:outline-none focus:bg-white/5'
                  )}
                  onSelect={() => navigate('/profile')}
                >
                  <User className="h-4 w-4" />
                  <span>Mi Perfil</span>
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm',
                    'text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer',
                    'focus:outline-none focus:bg-white/5'
                  )}
                  onSelect={() => navigate('/settings')}
                >
                  <Settings className="h-4 w-4" />
                  <span>Configuración</span>
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="h-px bg-white/5 my-1.5" />

                <DropdownMenu.Item
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm',
                    'text-red-400 hover:bg-red-500/10 cursor-pointer',
                    'focus:outline-none focus:bg-red-500/10'
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
