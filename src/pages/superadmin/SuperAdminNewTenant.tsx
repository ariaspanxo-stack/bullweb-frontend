import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Building2, Copy, Eye, EyeOff } from 'lucide-react';
import superadminService, { type CreateTenantDTO } from '@/services/superadmin/superadminService';

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
        <div className="bg-emerald-950 border border-emerald-700 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <h2 className="text-xl font-bold text-white mb-1">¡Cliente creado!</h2>
          <p className="text-sm text-emerald-300 mb-6">{created.tenantName}</p>

          <div className="bg-gray-900 rounded-xl p-4 text-left mb-6 space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Email de administrador</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-white flex-1">{created.adminEmail}</code>
                <button onClick={() => copyToClipboard(created.adminEmail)} className="text-gray-400 hover:text-white"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Contraseña temporal</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-amber-300 flex-1 font-mono tracking-widest">
                  {showPass ? created.tempPassword : '••••••••••••'}
                </code>
                <button onClick={() => setShowPass(v => !v)} className="text-gray-400 hover:text-white">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => copyToClipboard(created.tempPassword)} className="text-gray-400 hover:text-white"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-6">⚠️ Copia y comparte estas credenciales con el cliente. No se mostrarán nuevamente.</p>

          <button
            onClick={() => navigate('/superadmin/tenants')}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Ver lista de clientes
          </button>
        </div>
      </div>
    );
  }

  // ── Formulario ──────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-2xl mx-auto">

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            Nuevo cliente
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Crea un nuevo tenant en la plataforma</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">

        {/* Datos del negocio */}
        <div className="p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datos del negocio</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Nombre del negocio *</label>
            <input value={form.name} onChange={set('name')} placeholder="Ej: Restaurante La Canoa"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Slug (identificador único) *</label>
            <div className="flex items-center">
              <span className="bg-gray-800 border border-r-0 border-gray-700 rounded-l-lg px-3 py-2.5 text-sm text-gray-500 select-none">app/</span>
              <input value={form.slug} onChange={set('slug')} placeholder="la-canoa"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-r-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
            </div>
            <p className="text-xs text-gray-600 mt-1">Solo minúsculas, números y guiones. No se puede cambiar después.</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Plan *</label>
            <div className="grid grid-cols-3 gap-2">
              {PLANS.map(p => (
                <button type="button" key={p.value} onClick={() => setForm(prev => ({ ...prev, plan: p.value }))}
                  className={`border rounded-lg p-3 text-left transition-colors ${
                    form.plan === p.value ? 'border-indigo-500 bg-indigo-900/30' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  }`}>
                  <p className="text-sm font-semibold text-white">{p.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{p.price}</p>
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
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Email *</label>
            <input type="email" value={form.adminEmail} onChange={set('adminEmail')} placeholder="juan@restaurante.cl"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
          </div>

          <p className="text-xs text-yellow-600/80">Se generará una contraseña temporal automáticamente. Anótala al crear el cliente.</p>
        </div>

        {/* Botones */}
        <div className="p-5 flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2.5 text-sm text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
            {mutation.isPending ? 'Creando…' : 'Crear cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}
