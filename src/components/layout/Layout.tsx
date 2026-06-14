import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { MaintenanceBanner } from '@/components/MaintenanceBanner';
import { Security2FABanner } from './Security2FABanner';
import OnboardingWizard from '@/components/OnboardingWizard';
import { ImpersonateBanner } from '@/components/ImpersonateBanner';
import { QROrderAlert } from '@/components/orders/QROrderAlert';
import { useQROrderAlerts } from '@/hooks/useQROrderAlerts';
import { useTableRequestAlerts } from '@/hooks/useTableRequestAlerts';
import TableRequestAlert from '@/components/TableRequestAlert';
import SuspendedOverlay from '@/components/SuspendedOverlay';
import CrispChat from '@/components/CrispChat';
import { toast } from 'react-hot-toast';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

// ============================================================================
// COMPONENTE LAYOUT
// ============================================================================

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { pendingOrders, acceptOrder, cancelOrder } = useQROrderAlerts();
  const { pendingRequests, dismissRequest } = useTableRequestAlerts();
  const navigate = useNavigate();
  const { expiresAt, isSuperAdmin, logout, extendShift, user } = useAuthStore();

  // ── Modal de aviso de turno ──────────────────────────────────────────────
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  // Cuenta regresiva en segundos para el modal
  const [countdown, setCountdown] = useState(60);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Limpiar timers anteriores al re-montar o cambiar expiresAt
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current)  clearTimeout(logoutTimerRef.current);
    if (countdownRef.current)    clearInterval(countdownRef.current);

    // Superadmin no tiene cierre automático
    if (!expiresAt || isSuperAdmin) return;

    const msUntilExpiry = expiresAt - Date.now();
    if (msUntilExpiry <= 0) {
      // Ya expiró (race al recargar)
      logout('shift_expired');
      navigate('/login');
      return;
    }

    // Aviso 1 minuto antes
    const warningMs = msUntilExpiry - 60_000;

    if (warningMs > 0) {
      warningTimerRef.current = setTimeout(() => {
        setShowSessionWarning(true);
        setCountdown(60);
        // Iniciar cuenta regresiva visual
        countdownRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1_000);
      }, warningMs);
    } else {
      // Menos de 1 min restante, mostrar modal ahora
      const remaining = Math.max(0, Math.floor(msUntilExpiry / 1_000));
      setShowSessionWarning(true);
      setCountdown(remaining);
    }

    // Cierre automático al expirar
    logoutTimerRef.current = setTimeout(() => {
      setShowSessionWarning(false);
      if (countdownRef.current) clearInterval(countdownRef.current);
      logout('shift_expired');
      navigate('/login');
    }, msUntilExpiry);

    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current)  clearTimeout(logoutTimerRef.current);
      if (countdownRef.current)    clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, isSuperAdmin]);

  const handleExtendShift = () => {
    extendShift();
    setShowSessionWarning(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    toast.success('Sesión extendida 8 horas más ✅');
  };

  // Banner al cargar: si hay pedidos QR sin atender mostrar toast rojo
  useEffect(() => {
    api.get('/qr-orders/online/count')
      .then(r => {
        const count = r.data?.count ?? 0;
        if (count > 0) {
          toast(
            `🔔 Tienes ${count} pedido${count > 1 ? 's' : ''} QR sin atender`,
            {
              duration: 0,
              position: 'top-center',
              style: {
                background: '#dc2626',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '14px',
                padding: '12px 20px',
                cursor: 'pointer',
                borderRadius: '12px',
              },
              icon: '🛒',
            }
          );
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 flex-col">
      {/* Crisp chat widget con datos del usuario logueado */}
      <CrispChat userName={user?.name} userEmail={user?.email} />
      {/* Overlay de cuenta suspendida/cancelada */}
      <SuspendedOverlay />
      {/* Banner de impersonación SuperAdmin */}
      <ImpersonateBanner />
      {/* Banner global de mantenimiento */}
      <MaintenanceBanner />
      {/* Banner 2FA para admin */}
      <Security2FABanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Wizard de onboarding — se muestra sobre todo cuando hay cliente nuevo */}
      <OnboardingWizard />

      {/* Alertas de pedidos QR desde Carta Digital */}
      {pendingOrders.length > 0 && (
        <QROrderAlert
          order={pendingOrders[0]}
          onAccept={acceptOrder}
          onCancel={cancelOrder}
        />
      )}

      {/* Alertas de solicitudes de mesa (mesero/cuenta) vía Socket.IO */}
      <TableRequestAlert
        requests={pendingRequests}
        onDismiss={dismissRequest}
      />

      {/* Modal aviso de turno por terminar */}
      {showSessionWarning && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="text-5xl mb-4">⏰</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Tu turno está por terminar
            </h2>
            <p className="text-gray-500 text-sm mb-2">
              La sesión se cerrará en
              <span className="font-bold text-orange-500"> {countdown}s</span>
              {' '}por seguridad del turno.
            </p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
              <div
                className="bg-orange-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${(countdown / 60) * 100}%` }}
              />
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleExtendShift}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                ✅ Continuar sesión
              </button>
              <button
                onClick={() => { logout('manual'); navigate('/login'); }}
                className="text-gray-400 hover:text-gray-600 text-sm py-2"
              >
                Cerrar sesión ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
