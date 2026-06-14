import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Loader2, CheckCircle2, Users, LayoutGrid, Clock, ShieldCheck, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import superadminService, { type PlanConfig } from '@/services/superadmin/superadminService';

const PLAN_COLOR: Record<string, string> = {
  BULLWEB_COMPLETO_INICIO: 'bg-purple-600',
};

const PLAN_BADGE: Record<string, string> = {
  BULLWEB_COMPLETO_INICIO: 'Completo',
};

function fmtCLP(n: number) {
  return `$${Number(n).toLocaleString('es-CL')} CLP`;
}

interface PlanEditorProps {
  plan: PlanConfig;
}

function PlanEditor({ plan }: PlanEditorProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    displayName: plan.displayName,
    priceCLP:    String(plan.priceCLP),
    trialDays:   String(plan.trialDays),
    maxUsers:    String(plan.maxUsers),
    maxTables:   String(plan.maxTables),
    features:    Array.isArray(plan.features) ? plan.features.join('\n') : '',
    isActive:    plan.isActive,
  });
  const [dirty, setDirty] = useState(false);

  const mut = useMutation({
    mutationFn: () => superadminService.updatePlan(plan.plan, {
      displayName: form.displayName,
      priceCLP:    Number(form.priceCLP),
      trialDays:   Number(form.trialDays),
      maxUsers:    Number(form.maxUsers),
      maxTables:   Number(form.maxTables),
      features:    form.features.split('\n').map(s => s.trim()).filter(Boolean),
      isActive:    form.isActive,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin', 'plans'] });
      toast.success(`Plan ${plan.plan} actualizado`);
      setDirty(false);
    },
    onError: () => toast.error('Error al guardar el plan'),
  });

  function onChange(field: keyof typeof form, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-4 ${PLAN_COLOR[plan.plan] ?? 'border-gray-700 bg-gray-900'}`}>
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PLAN_BADGE[plan.plan] ?? 'bg-gray-700 text-gray-300'}`}>
            {plan.plan}
          </span>
          {!plan.isActive && (
            <span className="text-xs bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full">INACTIVO</span>
          )}
        </div>
        {dirty && (
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors"
          >
            {mut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Guardar
          </button>
        )}
        {!dirty && mut.isSuccess && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Guardado
          </span>
        )}
      </div>

      {/* Campos */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Nombre visible</label>
          <input
            type="text"
            value={form.displayName}
            onChange={e => onChange('displayName', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Precio mensual (CLP)</label>
          <input
            type="number"
            value={form.priceCLP}
            onChange={e => onChange('priceCLP', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
          <p className="text-xs text-gray-600 mt-0.5">{fmtCLP(Number(form.priceCLP) || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Clock className="w-3 h-3" /> Trial (días)
          </label>
          <input
            type="number"
            value={form.trialDays}
            onChange={e => onChange('trialDays', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Users className="w-3 h-3" /> Max usuarios
          </label>
          <input
            type="number"
            value={form.maxUsers}
            onChange={e => onChange('maxUsers', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <LayoutGrid className="w-3 h-3" /> Max mesas
          </label>
          <input
            type="number"
            value={form.maxTables}
            onChange={e => onChange('maxTables', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Características (una por línea)</label>
        <textarea
          value={form.features}
          onChange={e => onChange('features', e.target.value)}
          rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
          placeholder="POS básico&#10;Carta digital&#10;Reportes"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange('isActive', !form.isActive)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isActive ? 'bg-indigo-600' : 'bg-gray-700'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
        <span className="text-xs text-gray-400">
          Plan {form.isActive ? 'activo (visible en onboarding)' : 'inactivo (oculto)'}
        </span>
      </div>
    </div>
  );
}

export default function SuperAdminConfig() {
  const { data: plans, isLoading, isError } = useQuery({
    queryKey: ['superadmin', 'plans'],
    queryFn:  superadminService.getPlans,
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center">
          <Settings className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Configuración de Planes</h1>
          <p className="text-xs text-gray-500">Precios, límites y características por plan</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      )}

      {isError && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4 text-red-400 text-sm">
          Error al cargar los planes. Verifica la conexión al backend.
        </div>
      )}

      {plans && (
        <div className="grid grid-cols-1 gap-4">
          {plans.map(plan => (
            <PlanEditor key={plan.plan} plan={plan} />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-600 mt-6 text-center">
        Los cambios de precio afectan el cálculo de MRR en tiempo real. Las suscripciones existentes mantienen su precio negociado.
      </p>

      {/* ── Sección 2FA ─────────────────────────────────────────────────────── */}
      <TwoFASection />
    </div>
  );
}

// ── Sección de configuración 2FA ─────────────────────────────────────────────

function TwoFASection() {
  const [qrUrl,    setQrUrl]    = useState<string | null>(null);
  const [code,     setCode]     = useState('');
  const [enabled,  setEnabled]  = useState<boolean | null>(null);
  const [busy,     setBusy]     = useState(false);

  // Leer estado actual de 2FA del perfil superadmin
  // (lo deducimos del localStorage token o hacemos un fetch simple)
  async function handleSetup() {
    setBusy(true);
    try {
      const result = await superadminService.setup2FA();
      setQrUrl(result.qrCodeUrl);
      toast.success('Escanea el código QR con Google Authenticator o Authy');
    } catch {
      toast.error('Error al generar 2FA');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (code.length !== 6) return;
    setBusy(true);
    try {
      await superadminService.verify2FA(code);
      setEnabled(true);
      setQrUrl(null);
      setCode('');
      toast.success('2FA activado correctamente');
    } catch {
      toast.error('Código inválido');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    if (!confirm('¿Deshabilitar 2FA? Esto reduce la seguridad del panel.')) return;
    setBusy(true);
    try {
      await superadminService.disable2FA();
      setEnabled(false);
      setQrUrl(null);
      toast.success('2FA deshabilitado');
    } catch {
      toast.error('Error al deshabilitar 2FA');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Autenticación de dos factores (2FA)</h2>
          <p className="text-xs text-gray-500">TOTP compatible con Google Authenticator / Authy</p>
        </div>
        {enabled === true && (
          <span className="ml-auto text-xs bg-emerald-900/50 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full">Activo</span>
        )}
        {enabled === false && (
          <span className="ml-auto text-xs bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full">Inactivo</span>
        )}
      </div>

      {!qrUrl && enabled !== true && (
        <button
          onClick={handleSetup}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" />
          {busy ? 'Generando...' : 'Configurar 2FA'}
        </button>
      )}

      {qrUrl && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-gray-400 text-center">
            Escanea este código QR con tu app de autenticación y luego ingresa el código de 6 dígitos para confirmar.
          </p>
          <img src={qrUrl} alt="QR 2FA" className="w-48 h-48 bg-white p-2 rounded-lg" />
          <div className="flex gap-2 w-full max-w-xs">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center text-lg tracking-widest focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleVerify}
              disabled={busy || code.length !== 6}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activar'}
            </button>
          </div>
        </div>
      )}

      {enabled === true && (
        <button
          onClick={handleDisable}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 bg-red-900/40 hover:bg-red-900/60 border border-red-700 text-red-300 text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          <ShieldOff className="w-4 h-4" />
          Deshabilitar 2FA
        </button>
      )}
    </div>
  );
}
