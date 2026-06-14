import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Play, Pause, X, Trash2, Calendar, Users, Loader2 } from 'lucide-react';
import campaignsService from '@/services/campaignsService';
import type { Campaign } from '@/types/campaigns.types';

interface CampaignDetailsProps {
  campaign: Campaign | null;
  onUpdate: () => void;
}

// MENOR 16: helper seguro para formatear fechas
function safeFormat(date: string | null | undefined, fmt: string): string {
  if (!date) return '—';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return format(d, fmt, { locale: es });
  } catch {
    return '—';
  }
}

// MENOR 12: normalizar openRate (puede venir como fracción 0-1 o porcentaje 1-100)
function formatRate(rate: number | null | undefined): string {
  if (rate == null) return '0.0%';
  const pct = rate <= 1 ? rate * 100 : rate;
  return pct.toFixed(1) + '%';
}

interface CampaignDetailsProps {
  campaign: Campaign | null;
  onUpdate: () => void;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  RUNNING: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  PAUSED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  SCHEDULED: 'Programada',
  RUNNING: 'En curso',
  COMPLETED: 'Completada',
  PAUSED: 'Pausada',
  CANCELLED: 'Cancelada',
};

export function CampaignDetails({ campaign, onUpdate }: CampaignDetailsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [showScheduleInput, setShowScheduleInput] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MENOR 11: reset estado local cuando cambia la campaña seleccionada
  useEffect(() => {
    setConfirmDelete(false);
    setShowScheduleInput(false);
    setScheduleDate('');
    setError(null);
  }, [campaign?.id]);

  if (!campaign) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500 text-sm">Selecciona una campaña para ver los detalles</p>
      </div>
    );
  }

  const handleAction = async (action: string, fn: () => Promise<unknown>) => {
    setLoading(action);
    setError(null);
    try {
      await fn();
      await onUpdate();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Error al ejecutar la acción');
    } finally {
      setLoading(null);
    }
  };

  const handleSend     = () => handleAction('send',   () => campaignsService.sendCampaign(campaign.id));
  const handlePause    = () => handleAction('pause',  () => campaignsService.pauseCampaign(campaign.id));
  const handleCancel   = () => handleAction('cancel', () => campaignsService.cancelCampaign(campaign.id));
  const handleSchedule = () => {
    if (!scheduleDate) return;
    handleAction('schedule', () => campaignsService.scheduleCampaign(campaign.id, new Date(scheduleDate)));
    setShowScheduleInput(false);
    setScheduleDate('');
  };
  const handleDelete   = () => handleAction('delete', async () => {
    await campaignsService.deleteCampaign(campaign.id);
    setConfirmDelete(false);
  });

  const isBusy = (action: string) => loading === action;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-lg">{campaign.name}</h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
            {statusLabels[campaign.status]}
          </span>
        </div>
        {campaign.description && (
          <p className="text-sm text-gray-600">{campaign.description}</p>
        )}
      </div>

      {/* Metadata */}
      <div className="p-4 space-y-3 border-b border-gray-200">
        <div className="flex items-center text-sm">
          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-600">Creada:</span>
          <span className="ml-auto font-medium text-gray-900">
            {safeFormat(campaign.createdAt, 'dd/MM/yyyy HH:mm')}
          </span>
        </div>

        {campaign.scheduledAt && (
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 text-blue-400 mr-2" />
            <span className="text-gray-600">Programada:</span>
            <span className="ml-auto font-medium text-blue-600">
              {safeFormat(campaign.scheduledAt, 'dd/MM/yyyy HH:mm')}
            </span>
          </div>
        )}

        <div className="flex items-center text-sm">
          <Users className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-600">Destinatarios:</span>
          <span className="ml-auto font-medium text-gray-900">
            {(campaign.totalRecipients ?? 0).toLocaleString('es-CL')}
          </span>
        </div>

        {campaign.targetSegment && (
          <div className="flex items-center text-sm">
            <span className="text-gray-600">Segmento:</span>
            <span className="ml-auto font-medium text-gray-900">
              {campaign.targetSegment}
            </span>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="p-4 space-y-3 border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 text-sm">Rendimiento</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Enviados</div>
            <div className="text-lg font-bold text-gray-900">
              {(campaign.successfulDeliveries ?? 0).toLocaleString('es-CL')}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 mb-1">Fallidos</div>
            <div className="text-lg font-bold text-red-600">
              {campaign.failedDeliveries}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs text-blue-700 mb-1">Apertura</div>
            <div className="text-lg font-bold text-blue-700">
              {formatRate(campaign.openRate)}
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs text-purple-700 mb-1">Clicks</div>
            <div className="text-lg font-bold text-purple-700">
              {formatRate(campaign.clickRate)}
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs text-green-700 mb-1">Conversión</div>
            <div className="text-lg font-bold text-green-700">
              {formatRate(campaign.conversionRate)}
            </div>
          </div>

          <div className="bg-emerald-50 rounded-lg p-3">
            <div className="text-xs text-emerald-700 mb-1">Revenue</div>
            <div className="text-lg font-bold text-emerald-700">
              ${(campaign.actualRevenue || 0).toLocaleString('es-CL')}
            </div>
          </div>
        </div>
      </div>

      {/* Message Preview */}
      {campaign.subject && (
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900 text-sm mb-2">Asunto</h4>
          <p className="text-sm text-gray-600">{campaign.subject}</p>
        </div>
      )}

      <div className="p-4">
        <h4 className="font-semibold text-gray-900 text-sm mb-2">Mensaje</h4>
        <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3">
          {campaign.message}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-3 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Schedule input */}
      {showScheduleInput && (
        <div className="mx-4 mb-3 space-y-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-800">Fecha y hora de envío:</p>
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="w-full border border-blue-300 rounded px-2 py-1 text-xs bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSchedule}
              disabled={!scheduleDate || isBusy('schedule')}
              className="flex-1 bg-blue-500 text-white rounded py-1.5 text-xs font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
            >
              {isBusy('schedule') ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmar'}
            </button>
            <button
              onClick={() => setShowScheduleInput(false)}
              className="px-3 border border-gray-200 rounded py-1.5 text-xs hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-red-800">¿Eliminar esta campaña permanentemente?</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isBusy('delete')}
              className="flex-1 bg-red-500 text-white rounded py-1.5 text-xs font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center"
            >
              {isBusy('delete') ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sí, eliminar'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="px-3 border border-gray-200 rounded py-1.5 text-xs hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 flex flex-wrap gap-2">
        {campaign.status === 'DRAFT' && (
          <button
            onClick={() => setShowScheduleInput(!showScheduleInput)}
            disabled={loading !== null}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs font-medium disabled:opacity-50"
          >
            <Calendar className="h-3.5 w-3.5" />
            Programar
          </button>
        )}

        {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED') && (
          <button
            onClick={handleSend}
            disabled={loading !== null}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-medium disabled:opacity-50"
          >
            {isBusy('send') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Enviar
          </button>
        )}

        {campaign.status === 'RUNNING' && (
          <button
            onClick={handlePause}
            disabled={loading !== null}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-xs font-medium disabled:opacity-50"
          >
            {isBusy('pause') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
            Pausar
          </button>
        )}

        {(campaign.status === 'SCHEDULED' || campaign.status === 'PAUSED') && (
          <button
            onClick={handleCancel}
            disabled={loading !== null}
            className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs disabled:opacity-50"
          >
            {isBusy('cancel') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          </button>
        )}

        {campaign.status !== 'RUNNING' && campaign.status !== 'COMPLETED' && (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={loading !== null || confirmDelete}
            className="flex items-center justify-center gap-1.5 px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-xs disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
