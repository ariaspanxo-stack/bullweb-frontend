/**
 * BULLWEB ENTERPRISE — Maintenance Mode Page
 * Permite activar / desactivar el modo mantenimiento con mensaje personalizado.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench, Power, PowerOff, Clock, MessageSquare,
  AlertTriangle, CheckCircle2, Save, Eye, CalendarClock,
  Info, ShieldAlert,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { MaintenanceStatus } from '@/services/adminService';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

// ── Preview banner ────────────────────────────────────────────────────────────
function PreviewBanner({ message, endAt }: { message: string; endAt: string }) {
  return (
    <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-4 flex items-start gap-3">
      <Wrench className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber-900">Sistema en mantenimiento</p>
        <p className="text-sm text-amber-800 mt-0.5">{message || 'El sistema está en mantenimiento. Vuelve pronto.'}</p>
        {endAt && (
          <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Retorno estimado: {new Date(endAt).toLocaleString('es-CL')}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const qc = useQueryClient();

  const { data: status, isLoading } = useQuery<MaintenanceStatus>({
    queryKey: ['admin-maintenance'],
    queryFn:  () => adminService.getMaintenanceStatus(),
    staleTime: 10000,
  });

  const [form, setForm] = useState({
    message: '',
    endAt:   '',
  });
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (status) {
      setForm({
        message: status.message,
        endAt:   status.endAt ? status.endAt.slice(0, 16) : '',   // datetime-local format
      });
    }
  }, [status]);

  const toggleMut = useMutation({
    mutationFn: (enabled: boolean) =>
      adminService.toggleMaintenance({
        enabled,
        message: form.message || undefined,
        endAt:   form.endAt   || null,
      }),
    onSuccess: (data) => {
      qc.setQueryData(['admin-maintenance'], data);
      toast.success(data.enabled ? '⚠️ Modo mantenimiento ACTIVADO' : '✅ Modo mantenimiento desactivado');
    },
    onError: () => toast.error('Error al actualizar modo mantenimiento'),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      adminService.toggleMaintenance({
        enabled: status?.enabled ?? false,
        message: form.message || undefined,
        endAt:   form.endAt   || null,
      }),
    onSuccess: (data) => {
      qc.setQueryData(['admin-maintenance'], data);
      toast.success('Configuración guardada');
    },
    onError: () => toast.error('Error al guardar'),
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-2xl" />)}
      </div>
    );
  }

  const isOn = status?.enabled ?? false;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-500" />
            Modo Mantenimiento
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Muestra un aviso a todos los usuarios mientras se realizan tareas de mantenimiento
          </p>
        </div>
        {/* Estado badge */}
        <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${
          isOn
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-green-100 text-green-800 border-green-300'
        }`}>
          {isOn
            ? <><AlertTriangle className="w-4 h-4" /> Activo</>
            : <><CheckCircle2 className="w-4 h-4" /> Inactivo</>
          }
        </span>
      </div>

      {/* Toggle principal */}
      <div className={`rounded-2xl border-2 p-6 transition-colors ${
        isOn ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="font-bold text-gray-900 text-lg mb-1">
              {isOn ? 'Mantenimiento activo' : 'Sistema operativo'}
            </h2>
            <p className="text-sm text-gray-500">
              {isOn
                ? 'Los usuarios ven el banner de mantenimiento en toda la aplicación.'
                : 'La aplicación está funcionando con normalidad.'
              }
            </p>
            {status?.updatedAt && (
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Último cambio {formatDistanceToNow(parseISO(status.updatedAt), { addSuffix: true, locale: es })}
                {status.updatedBy && ` — por ${status.updatedBy}`}
              </p>
            )}
          </div>
          {/* Big toggle */}
          <button
            onClick={() => toggleMut.mutate(!isOn)}
            disabled={toggleMut.isPending}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
              isOn
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            } disabled:opacity-60`}
          >
            {isOn
              ? <><PowerOff className="w-4 h-4" /> Desactivar</>
              : <><Power className="w-4 h-4" /> Activar mantenimiento</>
            }
          </button>
        </div>
      </div>

      {/* Warning about what activation does */}
      {!isOn && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            Al activar el mantenimiento, <strong>todos los usuarios no‑admins</strong> verán un
            banner de aviso en la parte superior de la aplicación. La aplicación seguirá siendo
            accesible pero con el aviso visible.
          </div>
        </div>
      )}

      {/* Config */}
      <div className="bg-white rounded-2xl border p-6 space-y-5">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          Configuración del mensaje
        </h2>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Mensaje para los usuarios</label>
          <textarea
            rows={3}
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="El sistema está en mantenimiento. Vuelve en unos minutos."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" />
            Retorno estimado (opcional)
          </label>
          <input
            type="datetime-local"
            value={form.endAt}
            onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {form.endAt && (
            <p className="text-xs text-gray-400 mt-1">
              Se mostrará a los usuarios como: {new Date(form.endAt).toLocaleString('es-CL')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saveMut.isPending ? 'Guardando…' : 'Guardar configuración'}
          </button>
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-2 px-4 py-2 text-sm border rounded-xl hover:bg-gray-50 text-gray-600"
          >
            <Eye className="w-4 h-4" />
            {preview ? 'Ocultar' : 'Vista previa'}
          </button>
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-400" />
            Vista previa del banner
          </h2>
          <p className="text-xs text-gray-400 mb-3">Así verán el aviso los usuarios en la barra superior:</p>
          <PreviewBanner message={form.message} endAt={form.endAt} />
        </div>
      )}

      {/* Info card */}
      <div className="bg-gray-50 rounded-2xl border p-5">
        <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm">
          <ShieldAlert className="w-4 h-4 text-gray-400" />
          Cómo funciona
        </h2>
        <ul className="space-y-2 text-sm text-gray-500">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
            Cuando está activo, aparece un <strong>banner naranja</strong> en la parte superior de la aplicación para todos los usuarios no-admins.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
            Los <strong>usuarios admin</strong> siguen viendo la app normalmente pero con un aviso diferenciado.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
            El estado de mantenimiento se actualiza en tiempo real — no requiere recarga de página.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
            Todo cambio queda registrado en el <strong>log de auditoría</strong>.
          </li>
        </ul>
      </div>
    </div>
  );
}
