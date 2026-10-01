import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Loader2, CheckCircle2, Users, LayoutGrid, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import superadminService, { type PlanConfig } from '@/services/superadmin/superadminService';
import { StatusBadge } from '@/components/ui/superadmin/statusBadge';
import { Button } from '@/components/ui/superadmin/button';
import { PageHeader } from '@/components/ui/superadmin/pageHeader';

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
    <div className="rounded-xl border border-white/5 bg-gray-900/60 p-5 flex flex-col gap-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={plan.plan} kind="plan" />
          {!plan.isActive && (
            <span className="text-xs bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full ring-1 ring-inset ring-rose-500/20">INACTIVO</span>
          )}
        </div>
        {dirty && (
          <Button variant="primary" size="sm" onClick={() => mut.mutate()} loading={mut.isPending}>
            {!mut.isPending && <Save className="w-3 h-3" />}
            Guardar
          </Button>
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
            className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Precio mensual (CLP)</label>
          <input
            type="number"
            value={form.priceCLP}
            onChange={e => onChange('priceCLP', e.target.value)}
            className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
          />
          <p className="text-xs text-gray-600 mt-0.5 tabular-nums">{fmtCLP(Number(form.priceCLP) || 0)}</p>
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
            className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
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
            className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
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
            className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Características (una por línea)</label>
        <textarea
          value={form.features}
          onChange={e => onChange('features', e.target.value)}
          rows={4}
          className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors resize-none"
          placeholder="POS básico&#10;Carta digital&#10;Reportes"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange('isActive', !form.isActive)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isActive ? 'bg-brand-500' : 'bg-gray-700'}`}
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

export default function SuperAdminPlans() {
  const { data: plans, isLoading, isError } = useQuery({
    queryKey: ['superadmin', 'plans'],
    queryFn:  superadminService.getPlans,
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <PageHeader
        icon={Settings}
        title="Configuración de Planes"
        sub="Precios, límites y características por plan"
      />

      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        </div>
      )}

      {isError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm">
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
    </div>
  );
}
