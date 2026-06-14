/**
 * BULLWEB ENTERPRISE — Admin Layout
 * Wrapper mínimo: banner de alertas críticas + Outlet (el sidebar lo provee el Layout principal).
 */

import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BellRing } from 'lucide-react';
import { adminService } from '@/services/adminService';

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export default function AdminLayout() {
  const { data: alertCount } = useQuery({
    queryKey: ['admin', 'alertCount'],
    queryFn:  () => adminService.getAlertCount(),
    refetchInterval: 30_000,
  });

  const criticalAlerts = alertCount?.critical ?? 0;

  return (
    <>
      {/* ── Banner alertas críticas ── */}
      {criticalAlerts > 0 && (
        <div className="mb-4 bg-gradient-to-r from-red-700 to-red-500 text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-2 shadow-lg rounded-lg">
          <BellRing className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span>
            <strong>{criticalAlerts} alerta{criticalAlerts > 1 ? 's' : ''} crítica{criticalAlerts > 1 ? 's' : ''}</strong>
            {' '}requieren atención inmediata.
          </span>
          <a href="/admin/alerts" className="underline ml-2 font-semibold hover:text-red-100 transition-colors">Ver alertas →</a>
        </div>
      )}
      <Outlet />
    </>
  );
}
