// ═══════════════════════════════════════════════════════════════
// MESERO LAYOUT — layout móvil con navbar inferior
// ═══════════════════════════════════════════════════════════════

import { Home, ClipboardList, LogOut, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InstallPWA, useInstallPWA } from '@/components/pwa/InstallPWA';
import { ConnectionIndicator }  from './ConnectionIndicator';
import { useTableRequestAlerts } from '@/hooks/useTableRequestAlerts';
import TableRequestAlert from '@/components/TableRequestAlert';

interface Props {
  children:       React.ReactNode;
  activeView:     'mesas' | 'mis-ordenes';
  onChangeView:   (v: 'mesas' | 'mis-ordenes') => void;
  tablesOccupied: number;
  readyCount:     number;
}

export function MeseroLayout({
  children, activeView, onChangeView, tablesOccupied, readyCount,
}: Props) {
  const navigate = useNavigate();
  const { pendingRequests, dismissRequest } = useTableRequestAlerts();
  const { canInstall, handleInstall } = useInstallPWA();

  return (
    <>
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      {/* Header */}
      <header className="bg-orange-500 text-white px-4 py-3
                         flex items-center justify-between flex-shrink-0
                         safe-area-top">
        <div className="flex items-center gap-2">
          <img
            src="/images/bullweb-logo.png"
            alt="BullWeb Chile"
            className="h-8 w-8 object-contain"
          />
          <span className="font-bold text-lg">BullWeb</span>
          <span className="text-orange-200 text-sm">Mesero</span>
        </div>
        <div className="flex items-center gap-2">
          {canInstall && (
            <button
              onClick={handleInstall}
              className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              title="Instalar App"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Instalar</span>
            </button>
          )}
          <ConnectionIndicator />
          <button
            onClick={() => navigate('/login')}
            className="p-2 rounded-lg hover:bg-orange-400 transition-colors"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Contenido scrollable */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Navbar inferior */}
      <nav className="bg-white border-t border-gray-200 flex flex-shrink-0 safe-area-bottom">
        {([
          { id: 'mesas',       icon: Home,          label: 'Mesas',       badge: tablesOccupied },
          { id: 'mis-ordenes', icon: ClipboardList,  label: 'Mis Órdenes', badge: readyCount },
        ] as const).map(item => {
          const Icon   = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors
                ${active ? 'text-orange-500' : 'text-gray-400'}`}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {item.badge > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 bg-orange-500 text-white
                                   text-xs rounded-full w-4 h-4 flex items-center
                                   justify-center font-bold
                                   ${item.id === 'mis-ordenes' ? 'animate-pulse' : ''}`}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
    <InstallPWA />

    {/* Alertas de solicitudes de mesa (mesero/cuenta) vía Socket.IO */}
    <TableRequestAlert
      requests={pendingRequests}
      onDismiss={dismissRequest}
    />
    </>
  );
}
