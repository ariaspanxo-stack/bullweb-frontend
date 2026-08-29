import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Building2, Copy, Eye, EyeOff } from 'lucide-react';
import superadminService, { type CreateTenantDTO } from '@/services/superadmin/superadminService';
import { Button } from '@/components/ui/superadmin/button';
import { PageHeader } from '@/components/ui/superadmin/pageHeader';

const PLANS = [
  { value: 'STARTER',    label: 'Starter',    price: '$29.990 CLP/mes' },
  { value: 'PRO',        label: 'Pro',         price: '$59.990 CLP/mes' },
  { value: 'ENTERPRISE', label: 'Enterprise',  price: '$99.990 CLP/mes' },
];

interface CreatedResult {
  tempPassword: string;
  tenantName: string;
  adminEmail: string;
}

export default function SuperAdminNewTenant() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const [created, setCreated] = useState<CreatedResult | null>(null);
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState<CreateTenantDTO>({
    name: '', slug: '', plan: 'PRO', adminEmail: '', adminName: '',
  });

  const set = (field: keyof CreateTenantDTO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let val = e.target.value;
    if (field === 'slug') val = val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const mutation = useMutation({
    mutationFn: (dto: CreateTenantDTO) => superadminService.createTenant(dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['superadmin'] });
      setCreated({ tempPassword: data.tempPassword, tenantName: form.name, adminEmail: form.adminEmail });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error ?? 'Error al crear el cliente');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.slug || !form.adminEmail || !form.adminName) {
      toast.error('Completa todos los campos'); return;
    }
    mutation.mutate(form);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => toast.success('Copiado al portapapeles'));
  }

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (created) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-white">✓</div>
          <h2 className="text-xl font-bold text-white mb-1">¡Cliente creado!</h2>
          <p className="text-sm text-emerald-400 mb-6">{created.tenantName}</p>

          <div className="bg-gray-900/60 border border-white/5 rounded-xl p-4 text-left mb-6 space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Email de administrador</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-white flex-1">{created.adminEmail}</code>
                <button onClick={() => copyToClipboard(created.adminEmail)} className="text-gray-400 hover:text-white transition-colors"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Contraseña temporal</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-amber-400 flex-1 font-mono tracking-widest">
                  {showPass ? created.tempPassword : '••••••••••••'}
                </code>
                <button onClick={() => setShowPass(v => !v)} className="text-gray-400 hover:text-white transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => copyToClipboard(created.tempPassword)} className="text-gray-400 hover:text-white transition-colors"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-6">⚠️ Copia y comparte estas credenciales con el cliente. No se mostrarán nuevamente.</p>

          <Button
            variant="primary"
            className="w-full"
            onClick={() => navigate('/superadmin/tenants')}
          >
            Ver lista de clientes
          </Button>
        </div>
      </div>
    );
  }

  // ── Formulario ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-2xl mx-auto">

      <PageHeader
        icon={Building2}
        title="Nuevo cliente"
        sub="Crea un nuevo tenant en la plataforma"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="bg-gray-900/60 border border-white/5 rounded-xl divide-y divide-white/5">

        {/* Datos del negocio */}
        <div className="p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos del negocio</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Nombre del negocio *</label>
            <input value={form.name} onChange={set('name')} placeholder="Ej: Restaurante La Canoa"
              className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Slug (identificador único) *</label>
            <div className="flex items-center">
              <span className="bg-gray-900 border border-r-0 border-white/10 rounded-l-lg px-3 py-2.5 text-sm text-gray-500 select-none">app/</span>
              <input value={form.slug} onChange={set('slug')} placeholder="la-canoa"
                className="flex-1 bg-gray-950 border border-white/10 rounded-r-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors" />
            </div>
            <p className="text-xs text-gray-600 mt-1">Solo minúsculas, números y guiones. No se puede cambiar después.</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Plan *</label>
            <div className="grid grid-cols-3 gap-2">
              {PLANS.map(p => (
                <button type="button" key={p.value} onClick={() => setForm(prev => ({ ...prev, plan: p.value }))}
                  className={`border rounded-lg p-3 text-left transition-colors ${
                    form.plan === p.value ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 bg-gray-950 hover:border-white/20'
                  }`}>
                  <p className="text-sm font-semibold text-white">{p.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 tabular-nums">{p.price}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Administrador inicial */}
        <div className="p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Administrador inicial</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Nombre completo *</label>
            <input value={form.adminName} onChange={set('adminName')} placeholder="Juan Pérez"
              className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Email *</label>
            <input type="email" value={form.adminEmail} onChange={set('adminEmail')} placeholder="juan@restaurante.cl"
              className="w-full bg-gray-950 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-600 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-colors" />
          </div>

          <p className="text-xs text-amber-400/80">Se generará una contraseña temporal automáticamente. Anótala al crear el cliente.</p>
        </div>

        {/* Botones */}
        <div className="p-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {mutation.isPending ? 'Creando…' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </div>
  );
}
