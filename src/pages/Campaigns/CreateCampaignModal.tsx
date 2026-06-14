import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Users, Loader2, Check, LayoutTemplate } from 'lucide-react';
import campaignsService from '@/services/campaignsService';
import type { Campaign, CampaignType, CreateCampaignDTO, CampaignTemplate } from '@/types/campaigns.types';

interface CreateCampaignModalProps {
  onClose: () => void;
  onSuccess: (campaign: Campaign) => void;
}

const STEPS = ['Información', 'Destinatarios', 'Contenido', 'Envío'] as const;
type Step = 0 | 1 | 2 | 3;

const TYPE_OPTIONS: { value: CampaignType; label: string; icon: string }[] = [
  { value: 'EMAIL',    label: 'Email',     icon: '📧' },
  { value: 'SMS',      label: 'SMS',       icon: '💬' },
  { value: 'PUSH',     label: 'Push',      icon: '🔔' },
  { value: 'WHATSAPP', label: 'WhatsApp',  icon: '💚' },
];

const SEGMENT_OPTIONS = [
  { value: '',           label: 'Todos los clientes' },
  { value: 'VIP',        label: '⭐ VIP' },
  { value: 'FREQUENT',   label: '🔥 Frecuentes' },
  { value: 'REGULAR',    label: '👤 Regulares' },
  { value: 'NEW',        label: '🆕 Nuevos' },
  { value: 'INACTIVE',   label: '😴 Inactivos' },
  { value: 'AT_RISK',    label: '⚠️ En riesgo' },
];

export function CreateCampaignModal({ onClose, onSuccess }: CreateCampaignModalProps) {
  const [step, setStep]       = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [audienceEst, setAudienceEst] = useState<number | null>(null);
  const [templates, setTemplates]     = useState<CampaignTemplate[]>([]);
  const [loadingTpls, setLoadingTpls] = useState(false);

  const [formData, setFormData] = useState<CreateCampaignDTO>({
    name:           '',
    description:    '',
    type:           'EMAIL',
    targetSegment:  undefined,
    subject:        '',
    message:        '',
    scheduledAt:    undefined,
  });

  /* Estimate audience whenever segment changes */
  useEffect(() => {
    let cancelled = false;
    const doEstimate = async () => {
      if (step !== 1) return;
      setEstimating(true);
      try {
        const count = await campaignsService.estimateAudience(
          formData.targetSegment as any,
          {}
        );
        if (!cancelled) setAudienceEst(count);
      } catch {
        if (!cancelled) setAudienceEst(null);
      } finally {
        if (!cancelled) setEstimating(false);
      }
    };
    doEstimate();
    return () => { cancelled = true; };
  }, [step, formData.targetSegment]);

  /* Load templates when entering step 2 */
  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    const loadTemplates = async () => {
      setLoadingTpls(true);
      try {
        const tpls = await campaignsService.listTemplates(formData.type);
        if (!cancelled) setTemplates(Array.isArray(tpls) ? tpls : []);
      } catch {
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setLoadingTpls(false);
      }
    };
    loadTemplates();
    return () => { cancelled = true; };
  }, [step, formData.type]);

  const update = (patch: Partial<CreateCampaignDTO>) =>
    setFormData((prev) => ({ ...prev, ...patch }));

  const canNext = () => {
    if (step === 0) return formData.name.trim().length > 0;
    if (step === 2) return formData.message.trim().length > 0 && (formData.type !== 'EMAIL' || formData.subject!.trim().length > 0);
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const campaign = await campaignsService.createCampaign(formData);
      onSuccess(campaign);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al crear campaña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Nueva Campaña</h2>
            <p className="text-orange-100 text-xs mt-0.5">Paso {step + 1} de {STEPS.length}: {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="text-orange-100 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-gray-100">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`flex-1 py-2 text-center text-xs font-medium transition-colors ${
                i === step
                  ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
                  : i < step
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
            >
              {i < step ? <Check className="h-3 w-3 inline mr-1" /> : null}
              {label}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="p-6 min-h-[280px]">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 0 — Información */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  autoFocus
                  type="text"
                  value={formData.name}
                  onChange={(e) => update({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
                  placeholder="Ej: Promoción Verano 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => update({ description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
                  placeholder="Descripción breve (opcional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Canal *</label>
                <div className="grid grid-cols-4 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update({ type: opt.value })}
                      className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 text-xs font-medium transition-all ${
                        formData.type === opt.value
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      <span className="text-2xl mb-1">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Destinatarios */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Segmento objetivo</label>
                <div className="grid grid-cols-2 gap-2">
                  {SEGMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update({ targetSegment: opt.value as any })}
                      className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                        (formData.targetSegment ?? '') === opt.value
                          ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs text-blue-700 font-medium">Audiencia estimada</p>
                  {estimating ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                      <span className="text-xs text-blue-500">Calculando...</span>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-blue-800 mt-0.5">
                      {audienceEst != null
                        ? Number(audienceEst).toLocaleString('es-CL') + ' clientes'
                        : '—'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Contenido */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Template selector */}
              {(loadingTpls || templates.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                    <LayoutTemplate className="h-4 w-4 text-orange-400" />
                    Usar plantilla
                  </label>
                  {loadingTpls ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando plantillas…
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            update({ subject: t.subject ?? '', message: t.body });
                            void campaignsService.useTemplate(t.id).catch(() => null);
                          }}
                          className="px-3 py-1.5 text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-100 font-medium transition-colors"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <hr className="my-3 border-gray-100" />
                </div>
              )}
              {formData.type === 'EMAIL' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asunto del email *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => update({ subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
                    placeholder="Ej: ¡Descuento especial solo para ti!"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje *</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => update({ message: e.target.value })}
                  rows={7}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
                  placeholder="Escribe el contenido del mensaje..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Variables: {'{{nombre}}'}, {'{{apellido}}'}, {'{{email}}'}
                </p>
              </div>
            </div>
          )}

          {/* Step 3 — Programación */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => update({ scheduledAt: undefined })}
                  className={`flex flex-col items-center py-5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    !formData.scheduledAt
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <span className="text-3xl mb-2">⚡</span>
                  Enviar ahora
                  <span className="text-xs font-normal text-gray-500 mt-1">Inmediatamente</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setHours(d.getHours() + 1, 0, 0, 0);
                    update({ scheduledAt: d.toISOString() });
                  }}
                  className={`flex flex-col items-center py-5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    formData.scheduledAt
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <span className="text-3xl mb-2">📅</span>
                  Programar
                  <span className="text-xs font-normal text-gray-500 mt-1">Elige fecha y hora</span>
                </button>
              </div>

              {formData.scheduledAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora de envío</label>
                  <input
                    type="datetime-local"
                    value={new Date(formData.scheduledAt).toISOString().slice(0, 16)}
                    onChange={(e) =>
                      update({ scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
                  />
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-sm space-y-1">
                <p className="font-semibold text-gray-900 mb-2">Resumen</p>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Nombre:</span><span className="font-medium">{formData.name}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Canal:</span><span className="font-medium">{formData.type}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Segmento:</span><span className="font-medium">{formData.targetSegment || 'Todos'}</span></div>
                {audienceEst != null && (
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Audiencia:</span><span className="font-medium">{Number(audienceEst).toLocaleString('es-CL')} clientes</span></div>
                )}
                <div className="flex justify-between text-xs"><span className="text-gray-500">Envío:</span><span className="font-medium">{formData.scheduledAt ? new Date(formData.scheduledAt).toLocaleString('es-CL') : 'Inmediato'}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between gap-3">
          <button
            type="button"
            onClick={step === 0 ? onClose : () => { setError(null); setStep((s) => (s - 1) as Step); }}
            className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white text-sm text-gray-700"
          >
            {step > 0 && <ChevronLeft className="h-3.5 w-3.5" />}
            {step === 0 ? 'Cancelar' : 'Anterior'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => { setError(null); setStep((s) => (s + 1) as Step); }}
              disabled={!canNext()}
              className="flex items-center gap-1 px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium disabled:opacity-50"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {formData.scheduledAt ? 'Programar campaña' : 'Crear y enviar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
