/**
 * BULLWEB ENTERPRISE — Maintenance Banner
 * Banner global que aparece en la app cuando el modo mantenimiento está activo.
 * Consulta el endpoint público /api/status cada 60s.
 */

import { useQuery } from '@tanstack/react-query';
import { Wrench, Clock, X } from 'lucide-react';
import { useState } from 'react';
import axios from 'axios';

async function fetchStatus() {
  try {
    const { data } = await axios.get('/api/status');
    return data.maintenance as { enabled: boolean; message: string; endAt: string | null };
  } catch {
    return { enabled: false, message: '', endAt: null };
  }
}

export function MaintenanceBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ['public-maintenance-status'],
    queryFn:  fetchStatus,
    refetchInterval: 60000,
    staleTime:       30000,
  });

  if (!data?.enabled || dismissed) return null;

  return (
    <div className="w-full bg-amber-500 text-white text-sm px-4 py-2.5 flex items-center gap-3 z-50">
      <Wrench className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 font-medium">
        {data.message || 'El sistema está en mantenimiento. Algunas funciones pueden no estar disponibles.'}
      </span>
      {data.endAt && (
        <span className="flex items-center gap-1 text-amber-100 text-xs whitespace-nowrap">
          <Clock className="w-3 h-3" />
          Retorno est.: {new Date(data.endAt).toLocaleString('es-CL')}
        </span>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded hover:bg-amber-400 flex-shrink-0"
        aria-label="Cerrar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
