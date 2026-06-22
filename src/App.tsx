import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from 'react-hot-toast';
import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PermissionGuard } from '@/components/PermissionGuard';
import Layout from '@/components/layout/Layout';
import Login from '@/pages/auth/Login';
import Restaurant from '@/pages/Restaurant/Restaurant';
import Orders from '@/pages/Orders';
import OnlineOrders from '@/pages/OnlineOrders';
import { FullPageSpinner } from '@/components/ui/Spinner';

// ── Lazy-loaded pages (code-splitting) ──────────────────────────────────────
const Dashboard       = lazy(() => import('@/pages/Dashboard'));
const Products        = lazy(() => import('@/pages/Products/Products'));
const KDS             = lazy(() => import('@/pages/KDS/KDS'));
const Inventory       = lazy(() => import('@/pages/Inventory'));
const Customers       = lazy(() => import('@/pages/Customers'));
const Campaigns       = lazy(() => import('@/pages/Campaigns'));
const Delivery        = lazy(() => import('@/pages/Delivery'));
const Reports         = lazy(() => import('@/pages/Reports'));
const Sales           = lazy(() => import('@/pages/Sales/Sales').then(m => ({ default: m.Sales })));

const AdminUsers      = lazy(() => import('@/pages/Admin/AdminUsers'));
const RoleMatrix      = lazy(() => import('@/pages/Admin/RoleMatrix'));
const AuditLogPanel   = lazy(() => import('@/pages/Admin/AuditLogPanel'));
const AdminLayout     = lazy(() => import('@/pages/Admin/AdminLayout'));
const AdminDashboard  = lazy(() => import('@/pages/Admin/AdminDashboard'));
const Branches        = lazy(() => import('@/pages/Admin/Branches'));
const Devices         = lazy(() => import('@/pages/Admin/Devices'));
const ApiKeys         = lazy(() => import('@/pages/Admin/ApiKeys'));
const Webhooks        = lazy(() => import('@/pages/Admin/Webhooks'));
const Alerts          = lazy(() => import('@/pages/Admin/Alerts'));
const Settings        = lazy(() => import('@/pages/Admin/Settings').then(m => ({ default: m.default || m.Settings })));
const TipSettingsPanel = lazy(() => import('@/pages/Admin/Settings').then(m => ({ default: m.TipSettingsPanel })));
const Health          = lazy(() => import('@/pages/Admin/Health'));
const UserDetail      = lazy(() => import('@/pages/Admin/UserDetail'));
const Analytics       = lazy(() => import('@/pages/Admin/Analytics'));
const MaintenancePage = lazy(() => import('@/pages/Admin/MaintenancePage'));
const LogsPage        = lazy(() => import('@/pages/Admin/LogsPage'));
const IpBlocklistPage  = lazy(() => import('@/pages/Admin/IpBlocklistPage'));
const FeatureFlagsPage = lazy(() => import('@/pages/Admin/FeatureFlagsPage'));
const EmailPage       = lazy(() => import('@/pages/Admin/EmailPage'));
const BackupPage      = lazy(() => import('@/pages/Admin/BackupPage'));
const SchedulerPage   = lazy(() => import('@/pages/Admin/SchedulerPage'));
const TwoFactorPage   = lazy(() => import('@/pages/Admin/TwoFactorPage'));
const NotificationsPage = lazy(() => import('@/pages/Admin/NotificationsPage'));
const ModulesPage     = lazy(() => import('@/pages/Admin/ModulesPage'));
const SecurityPolicyPage = lazy(() => import('@/pages/Admin/SecurityPolicyPage'));
const RateLimiterPage  = lazy(() => import('@/pages/Admin/RateLimiterPage'));
const DataPrivacyPage  = lazy(() => import('@/pages/Admin/DataPrivacyPage'));
const RBACPage        = lazy(() => import('@/pages/Admin/RBACPage'));
const BrandingPage    = lazy(() => import('@/pages/Admin/BrandingPage'));
const IntegrationsPage = lazy(() => import('@/pages/Admin/IntegrationsPage'));
const ReportBuilderPage = lazy(() => import('@/pages/Admin/ReportBuilderPage'));
const DataImportPage  = lazy(() => import('@/pages/Admin/DataImportPage'));
const MultiTenantPage = lazy(() => import('@/pages/Admin/MultiTenantPage'));
const ApiPlaygroundPage = lazy(() => import('@/pages/Admin/ApiPlaygroundPage'));
const AuditTrailPage  = lazy(() => import('@/pages/Admin/AuditTrailPage'));
const PrintersPage    = lazy(() => import('@/pages/Admin/PrintersPage'));
const TicketTemplatesPage = lazy(() => import('@/pages/Admin/TicketTemplatesPage'));
const PaymentMethodsPage = lazy(() => import('@/pages/Admin/PaymentMethodsPage'));
const MeseroAppPage   = lazy(() => import('@/pages/Admin/MeseroAppPage'));

const CashRegisters   = lazy(() => import('@/pages/CashRegisters'));
const CashPage        = lazy(() => import('@/pages/Cash/CashPage').then(m => ({ default: m.CashPage })));
const Employees       = lazy(() => import('@/pages/Employees'));
const Profile         = lazy(() => import('@/pages/Profile'));
const AppSettings     = lazy(() => import('@/pages/Settings'));
const PrintSettingsPage = lazy(() => import('@/pages/Settings/PrintSettingsPage'));
const AttendanceKiosk = lazy(() => import('@/pages/AttendanceKiosk'));
const AttendanceCheckin = lazy(() => import('@/pages/AttendanceCheckin'));
const KioskPage       = lazy(() => import('@/pages/KioskPage'));
const CartaDigital    = lazy(() => import('@/pages/CartaDigital'));
const ReceiptPage     = lazy(() => import('@/pages/ReceiptPage'));
const CartaQRPage     = lazy(() => import('@/pages/CartaQRPage'));
const MesaQR          = lazy(() => import('@/pages/MesaQR'));

const MeseroPage          = lazy(() => import('@/pages/mesero/MeseroPage').then(m => ({ default: m.MeseroPage })));
const WaiterLoginPage     = lazy(() => import('@/pages/mesero/WaiterLoginPage').then(m => ({ default: m.WaiterLoginPage })));
const ToastContainer      = lazy(() => import('./components/ToastContainer').then(m => ({ default: m.ToastContainer })));

const SuperAdminLayout       = lazy(() => import('@/pages/superadmin/SuperAdminLayout'));
const SuperAdminDashboard    = lazy(() => import('@/pages/superadmin/SuperAdminDashboard'));
const SuperAdminTenants      = lazy(() => import('@/pages/superadmin/SuperAdminTenants'));
const SuperAdminNewTenant    = lazy(() => import('@/pages/superadmin/SuperAdminNewTenant'));
const SuperAdminLogin        = lazy(() => import('@/pages/superadmin/SuperAdminLogin'));
const SuperAdminPayments     = lazy(() => import('@/pages/superadmin/SuperAdminPayments'));
const SuperAdminConfig      = lazy(() => import('@/pages/superadmin/SuperAdminConfig'));
const SuperAdminActivity    = lazy(() => import('@/pages/superadmin/SuperAdminActivity'));
const SuperAdminAudit       = lazy(() => import('@/pages/superadmin/SuperAdminAudit'));
const SuperAdminTenantDetail = lazy(() => import('@/pages/superadmin/SuperAdminTenantDetail'));

const LandingPage           = lazy(() => import('@/pages/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const RegisterPage          = lazy(() => import('@/pages/landing/RegisterPage').then(m => ({ default: m.RegisterPage })));
const InstallPWA            = lazy(() => import('@/components/pwa/InstallPWA').then(m => ({ default: m.InstallPWA })));
const PwaUpdateNotification = lazy(() => import('@/components/shared/PwaUpdateNotification').then(m => ({ default: m.PwaUpdateNotification })));
const DteConfigPage          = lazy(() => import('@/pages/apps/DteConfigPage'));
const AppsPage               = lazy(() => import('@/pages/Apps/AppsPage'));
const SuperAdminRoute       = lazy(() => import('@/components/admin/SuperAdminRoute').then(m => ({ default: m.SuperAdminRoute })));
const WaiterProtectedRoute  = lazy(() => import('@/components/WaiterProtectedRoute').then(m => ({ default: m.WaiterProtectedRoute })));
const DteDocumentsPage      = lazy(() => import('@/pages/dte/DteDocumentsPage').then(m => ({ default: m.DteDocumentsPage })));
const ForgotPasswordPage    = lazy(() => import('@/pages/auth/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage     = lazy(() => import('@/pages/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const RegisterTenant         = lazy(() => import('@/pages/auth/RegisterTenant'));
const RestaurantProfilePage = lazy(() => import('@/pages/profile/RestaurantProfilePage').then(m => ({ default: m.RestaurantProfilePage })));
const CouponsPage           = lazy(() => import('@/pages/coupons/CouponsPage').then(m => ({ default: m.CouponsPage })));
const OnboardingWizard       = lazy(() => import('@/components/OnboardingWizard'));
const Suspended              = lazy(() => import('@/pages/Suspended'));

// ── Spinner para Suspense ───────────────────────────────────────────────────
function LazyFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    </div>
  );
}

// Subscription page — redirect directo a Flow (variable de entorno)
function SubscriptionRedirect() {
  useEffect(() => { window.location.replace(import.meta.env.VITE_FLOW_REDIRECT_URL || 'https://www.flow.cl/uri/m8wWtWVC9'); }, []);
  return null;
}

// ============================================================================
// COMPONENTES PLACEHOLDER
// ============================================================================

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-500">Esta página será implementada en las siguientes partes</p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Página no encontrada</p>
        <a
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Volver al Dashboard
        </a>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE APP
// ============================================================================

export default function App() {
  const { isLoading, loadUser } = useAuthStore();

  // Cargar usuario al iniciar la app si hay token guardado
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Mostrar spinner mientras se verifica la autenticación inicial
  if (isLoading) {
    return <FullPageSpinner label="Cargando aplicación..." />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/"        element={<LandingPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/register" element={<RegisterTenant />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password"  element={<ResetPasswordPage />} />
            <Route path="/subscription"           element={<SubscriptionRedirect />} />
            <Route path="/subscription/success"   element={<SubscriptionRedirect />} />
            <Route path="/subscription/cancelled" element={<SubscriptionRedirect />} />
            <Route path="/suspended" element={<Suspended />} />
            <Route path="/onboarding" element={<OnboardingWizard />} />
            <Route path="/attendance"        element={<AttendanceKiosk />} />
            <Route path="/checkin"            element={<AttendanceCheckin />} />
            <Route path="/kiosk/:slug"         element={<KioskPage />} />          <Route path="/carta"      element={<CartaDigital />} />
            <Route path="/carta/:slug" element={<CartaDigital />} />
            <Route path="/mesa/:slug"  element={<MesaQR />} />
            <Route path="/r/:orderId"  element={<ReceiptPage />} />

            {/* App Mesero — login PWA (sin auth) */}
            <Route path="/mesero/login" element={<WaiterLoginPage />} />

            {/* App Mesero — layout propio (PWA) */}
            <Route
              path="/mesero"
              element={
                <WaiterProtectedRoute>
                  <MeseroPage />
                </WaiterProtectedRoute>
              }
            />

            {/* Rutas protegidas con Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Redirect raíz a restaurant */}
              <Route index element={<Navigate to="/restaurant" replace />} />
              
              {/* Dashboard — redirige a restaurant */}
              <Route path="dashboard" element={<Navigate to="/restaurant" replace />} />
              
              {/* Ventas */}
              <Route path="restaurant" element={<PermissionGuard permission="pos.access"><Restaurant /></PermissionGuard>} />
              <Route path="orders"     element={<PermissionGuard permission="pos.access"><Orders /></PermissionGuard>} />
              <Route path="online-orders" element={<PermissionGuard permission="pos.access"><OnlineOrders /></PermissionGuard>} />
              <Route path="sales"      element={<PermissionGuard permission="sales.view"><Sales /></PermissionGuard>} />
              
              {/* Redirects para compatibilidad con rutas antiguas */}
              <Route path="pos" element={<Navigate to="/restaurant" replace />} />
              
              {/* Operaciones */}
    
              <Route path="kds"    element={<PermissionGuard permission="kds.view"><KDS /></PermissionGuard>} />
              
              {/* Gestión */}
              <Route path="menu"           element={<Navigate to="/products" replace />} />
              <Route path="products"       element={<PermissionGuard permission="products.view"><Products /></PermissionGuard>} />
              <Route path="inventory"      element={<PermissionGuard permission="inventory.view"><Inventory /></PermissionGuard>} />
              <Route path="cash-registers" element={<PermissionGuard permission="cash.view"><CashRegisters /></PermissionGuard>} />
              <Route path="caja"           element={<PermissionGuard permission="pos.access"><CashPage /></PermissionGuard>} />
              <Route path="customers"      element={<PermissionGuard permission="customers.view"><Customers /></PermissionGuard>} />
              <Route path="campaigns"      element={<PermissionGuard permission="marketing.view"><Campaigns /></PermissionGuard>} />
              <Route path="carta-qr"       element={<PermissionGuard permission="marketing.view"><CartaQRPage /></PermissionGuard>} />
              <Route path="delivery"       element={<PermissionGuard permission="delivery.view"><Delivery /></PermissionGuard>} />
              <Route path="employees"      element={<PermissionGuard permission="employees.view"><Employees /></PermissionGuard>} />
              
              {/* Reportes */}
              <Route path="reports"          element={<PermissionGuard permission="reports.view"><Reports /></PermissionGuard>} />
              <Route path="reports/sales"    element={<Navigate to="/reports" replace />} />
              <Route path="reports/analytics" element={<Navigate to="/reports" replace />} />
              
              {/* Sistema */}
              <Route path="settings" element={<AppSettings />} />
              <Route path="settings/print" element={<PrintSettingsPage />} />
              <Route path="profile"  element={<Profile />} />
              <Route path="profile/restaurant" element={<RestaurantProfilePage />} />
              <Route path="apps/dte" element={<PermissionGuard permission="billing.config"><DteConfigPage /></PermissionGuard>} />
              <Route path="apps" element={<PermissionGuard permission="apps.view"><AppsPage /></PermissionGuard>} />
              <Route path="dte/documentos" element={<PermissionGuard permission="billing.view"><DteDocumentsPage /></PermissionGuard>} />
              <Route path="coupons" element={<PermissionGuard permission="coupons.view"><CouponsPage /></PermissionGuard>} />

            {/* Administración — usa el Layout principal con Sidebar.tsx */}
            <Route path="admin" element={<PermissionGuard permission={['employees.manage', 'ALL_PERMISSIONS']}><AdminLayout /></PermissionGuard>}>
              <Route index element={<SuperAdminRoute><AdminDashboard /></SuperAdminRoute>} />
              <Route path="users"           element={<AdminUsers />} />
              <Route path="roles"           element={<RBACPage />} />
              <Route path="devices"         element={<SuperAdminRoute><Devices /></SuperAdminRoute>} />
              <Route path="alerts"          element={<SuperAdminRoute><Alerts /></SuperAdminRoute>} />
              <Route path="settings"        element={<SuperAdminRoute><Settings /></SuperAdminRoute>} />
              <Route path="users/:id"       element={<UserDetail />} />
              <Route path="analytics"       element={<SuperAdminRoute><Analytics /></SuperAdminRoute>} />
              <Route path="2fa"             element={<SuperAdminRoute><TwoFactorPage /></SuperAdminRoute>} />
              <Route path="notifications"   element={<SuperAdminRoute><NotificationsPage /></SuperAdminRoute>} />
              <Route path="modules"         element={<SuperAdminRoute><ModulesPage /></SuperAdminRoute>} />
              <Route path="branding"        element={<SuperAdminRoute><BrandingPage /></SuperAdminRoute>} />
              <Route path="license"         element={<Navigate to="/admin" replace />} />
              <Route path="reports"         element={<SuperAdminRoute><ReportBuilderPage /></SuperAdminRoute>} />
              <Route path="printers"        element={<PrintersPage />} />
              <Route path="payment-methods" element={<PaymentMethodsPage />} />
              <Route path="propina"         element={<TipSettingsPanel />} />
              <Route path="mesero-app"      element={<MeseroAppPage />} />
              {/* ── Rutas exclusivas SuperAdmin ─────────────────────────────────── */}
              <Route path="audit"           element={<PermissionGuard permission="audit.view"><AuditLogPanel /></PermissionGuard>} />
              <Route path="branches"        element={<SuperAdminRoute><Branches /></SuperAdminRoute>} />
              <Route path="keys"            element={<SuperAdminRoute><ApiKeys /></SuperAdminRoute>} />
              <Route path="webhooks"        element={<SuperAdminRoute><Webhooks /></SuperAdminRoute>} />
              <Route path="health"          element={<SuperAdminRoute><Health /></SuperAdminRoute>} />
              <Route path="maintenance"     element={<SuperAdminRoute><MaintenancePage /></SuperAdminRoute>} />
              <Route path="logs"            element={<SuperAdminRoute><LogsPage /></SuperAdminRoute>} />
              <Route path="ip-blocklist"    element={<SuperAdminRoute><IpBlocklistPage /></SuperAdminRoute>} />
              <Route path="feature-flags"   element={<SuperAdminRoute><FeatureFlagsPage /></SuperAdminRoute>} />
              <Route path="email"           element={<SuperAdminRoute><EmailPage /></SuperAdminRoute>} />
              <Route path="backup"          element={<SuperAdminRoute><BackupPage /></SuperAdminRoute>} />
              <Route path="scheduler"       element={<SuperAdminRoute><SchedulerPage /></SuperAdminRoute>} />
              <Route path="security-policy" element={<SuperAdminRoute><SecurityPolicyPage /></SuperAdminRoute>} />
              <Route path="rate-limiter"    element={<SuperAdminRoute><RateLimiterPage /></SuperAdminRoute>} />
              <Route path="data-privacy"    element={<SuperAdminRoute><DataPrivacyPage /></SuperAdminRoute>} />
              <Route path="rbac"            element={<SuperAdminRoute><RBACPage /></SuperAdminRoute>} />
              <Route path="integrations"    element={<SuperAdminRoute><IntegrationsPage /></SuperAdminRoute>} />
              <Route path="data-import"     element={<SuperAdminRoute><DataImportPage /></SuperAdminRoute>} />
              <Route path="tenants"         element={<SuperAdminRoute><MultiTenantPage /></SuperAdminRoute>} />
              <Route path="api-playground"  element={<SuperAdminRoute><ApiPlaygroundPage /></SuperAdminRoute>} />
              <Route path="audit-trail"     element={<SuperAdminRoute><AuditTrailPage /></SuperAdminRoute>} />
              <Route path="ticket-templates" element={<SuperAdminRoute><TicketTemplatesPage /></SuperAdminRoute>} />
            </Route>
          </Route>

            {/* ── Panel Super Admin ──────────────────────────────────────────── */}
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route path="/superadmin" element={<SuperAdminLayout />}>
              <Route index                 element={<SuperAdminDashboard />} />
              <Route path="tenants"        element={<SuperAdminTenants />} />
              <Route path="tenants/new"    element={<SuperAdminNewTenant />} />
              <Route path="tenants/:id"     element={<SuperAdminTenantDetail />} />
              <Route path="activity"       element={<SuperAdminActivity />} />
              <Route path="payments"       element={<SuperAdminPayments />} />
              <Route path="audit"          element={<SuperAdminAudit />} />
              <Route path="config"         element={<SuperAdminConfig />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>

          {/* Notificaciones Toast */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#333',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                borderRadius: '0.5rem',
                padding: '1rem'
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff'
                }
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff'
                }
              }
            }}
          />

          {/* Sistema Toast Custom para Restaurant */}
          <ToastContainer />

          {/* Banner PWA — instalación en móvil */}
          <InstallPWA />

          {/* Notificación de actualización PWA */}
          <PwaUpdateNotification />
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}