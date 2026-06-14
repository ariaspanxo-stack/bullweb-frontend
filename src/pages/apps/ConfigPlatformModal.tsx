import { useState } from 'react';
import { X, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Copy } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  integrationsService,
  type PlatformConfig,
  type PlatformId,
  type SaveConfigDTO,
} from '@/services/integrationsService';

// ─── Campos por plataforma ────────────────────────────────────────────────────
interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'password';
  help: string;
  required?: boolean;
}

const PLATFORM_FIELDS: Record<string, FieldDef[]> = {
  ubereats: [
    { key: 'apiKey',       label: 'Client ID',     type: 'text',     required: true,  help: 'En Uber Eats Developer → Apps → Client ID' },
    { key: 'apiSecret',    label: 'Client Secret', type: 'password', required: true,  help: 'En Uber Eats Developer → Apps → Client Secret' },
    { key: 'storeId',      label: 'Store ID',      type: 'text',     required: true,  help: 'ID de tu local en Uber Eats' },
    { key: 'webhookSecret',label: 'Webhook Secret',type: 'password', required: false, help: 'Secreto para verificar la firma del webhook (recomendado)' },
  ],
  rappi: [
    { key: 'apiKey',       label: 'API Key',        type: 'password', required: true,  help: 'En Rappi Partner Portal → Integraciones → API Key' },
    { key: 'storeId',      label: 'Restaurant ID',  type: 'text',     required: true,  help: 'ID de tu restaurante en Rappi' },
    { key: 'webhookSecret',label: 'Webhook Secret', type: 'password', required: false, help: 'Secreto para verificar la firma del webhook' },
  ],
  pedidosya: [
    { key: 'apiKey',       label: 'Client ID',      type: 'text',     required: true,  help: 'En PedidosYa Developer Portal → Credenciales' },
    { key: 'apiSecret',    label: 'Client Secret',  type: 'password', required: true,  help: 'Secret de tu aplicación en PedidosYa' },
    { key: 'storeId',      label: 'Restaurant ID',  type: 'text',     required: true,  help: 'ID de tu local en PedidosYa' },
    { key: 'webhookSecret',label: 'Webhook Secret', type: 'password', required: false, help: 'Secreto para verificar la firma del webhook' },
  ],
};

const PLATFORM_LABELS: Record<string, string> = {
  ubereats: 'Uber Eats', rappi: 'Rappi', pedidosya: 'PedidosYa',
};

// ─── Pasos del modal ──────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;

interface Props {
  platform: PlatformId;
  existingConfig: PlatformConfig | undefined;
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ConfigPlatformModal({ platform, existingConfig, tenantId, onClose, onSaved }: Props) {
  const fields = PLATFORM_FIELDS[platform] ?? [];
  const [step, setStep] = useState<Step>(1);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<Record<string, string>>({
    storeId: existingConfig?.storeId ?? '',
  });
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const webhookUrl = integrationsService.buildWebhookUrl(platform, tenantId);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: SaveConfigDTO = {
        storeId:       form.storeId       || undefined,
        apiKey:        form.apiKey        || undefined,
        apiSecret:     form.apiSecret     || undefined,
        webhookSecret: form.webhookSecret || undefined,
      };
      return integrationsService.saveConfig(platform, payload);
    },
    onSuccess: () => {
      setStep(2);
    },
    onError: () => toast.error('Error al guardar configuración'),
  });

  const testMutation = useMutation({
    mutationFn: () => integrationsService.testConnection(platform),
    onSuccess: (data) => {
      setTestResult(data);
      if (data.ok) setStep(3);
    },
    onError: () => {
      setTestResult({ ok: false, message: 'Error de conexión' });
    },
  });

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('URL copiada');
  };

  const canSave = fields.filter((f) => f.required).every((f) => {
    if (f.key === 'storeId') return !!form.storeId?.trim();
    return existingConfig != null || !!form[f.key]?.trim();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Configurar {PLATFORM_LABELS[platform] ?? platform}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Paso {step} de 3
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-0 border-b">
          {(['Credenciales', 'Test conexión', 'Activar'] as const).map((label, i) => (
            <div
              key={label}
              className={`flex-1 py-2 text-xs font-medium text-center transition-colors ${
                step === i + 1
                  ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-500'
                  : step > i + 1
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}
            >
              {step > i + 1 ? '✓ ' : ''}{label}
            </div>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {/* PASO 1 — Credenciales */}
          {step === 1 && (
            <>
              <p className="text-sm text-gray-500">
                Introduce las credenciales de tu cuenta{' '}
                <strong>{PLATFORM_LABELS[platform]}</strong>.
                Las claves se guardan encriptadas (AES-256-GCM).
              </p>
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                      value={form[field.key] ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={existingConfig && field.type === 'password' ? '••••••••' : ''}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    {field.type === 'password' && (
                      <button
                        type="button"
                        onClick={() => setShowPasswords((p) => ({ ...p, [field.key]: !p[field.key] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{field.help}</p>
                </div>
              ))}

              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !canSave}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 font-medium transition-colors disabled:opacity-50"
              >
                {saveMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</span>
                ) : 'Guardar y continuar →'}
              </button>
            </>
          )}

          {/* PASO 2 — Test conexión */}
          {step === 2 && (
            <>
              <p className="text-sm text-gray-500">
                Haz clic en <strong>Probar conexión</strong> para verificar que las credenciales son correctas.
              </p>

              {testResult && (
                <div className={`flex items-center gap-3 p-3 rounded-lg ${testResult.ok ? 'bg-green-50' : 'bg-red-50'}`}>
                  {testResult.ok
                    ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                  <span className={`text-sm ${testResult.ok ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.message}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                  ← Atrás
                </button>
                <button
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 font-medium transition-colors disabled:opacity-50"
                >
                  {testMutation.isPending
                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Probando...</span>
                    : '🔗 Probar conexión'}
                </button>
                {testResult?.ok && (
                  <button onClick={() => setStep(3)} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 font-medium">
                    Continuar →
                  </button>
                )}
              </div>
            </>
          )}

          {/* PASO 3 — URL webhook + activar */}
          {step === 3 && (
            <>
              <div className="bg-green-50 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">¡Conexión verificada!</p>
                  <p className="text-xs text-green-600 mt-0.5">Ahora configura el webhook en la plataforma.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                  URL Webhook — pegar en {PLATFORM_LABELS[platform]}
                </label>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-xs text-gray-700 break-all">
                    {webhookUrl}
                  </code>
                  <button
                    onClick={copyUrl}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex-shrink-0"
                    title="Copiar URL"
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Pega esta URL como endpoint de webhook en el panel de {PLATFORM_LABELS[platform]}.
                </p>
              </div>

              <button
                onClick={() => {
                  integrationsService.togglePlatform(platform, true).then(() => {
                    toast.success(`${PLATFORM_LABELS[platform]} activado`);
                    onSaved();
                    onClose();
                  }).catch(() => toast.error('Error al activar'));
                }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 font-bold transition-colors"
              >
                ✅ Activar integración
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
