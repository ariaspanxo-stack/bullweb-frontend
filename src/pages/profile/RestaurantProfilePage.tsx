import { useState, useEffect, useRef } from 'react';
import { Building2, Camera, Loader2, Globe, Instagram, Facebook } from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface TenantProfile {
  id: string;
  name: string;
  slug: string;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  rut: string | null;
  legalName: string | null;
  logo_url: string | null;
  primaryColor: string | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
  plan: string | null;
  status: string | null;
}

export function RestaurantProfilePage() {
  const [profile, setProfile]   = useState<TenantProfile | null>(null);
  const [form, setForm]         = useState<Partial<TenantProfile>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/tenant/profile')
      .then((r: any) => {
        const data: TenantProfile = r?.data ?? r;
        setProfile(data);
        setForm({
          name:          data.name,
          contact_phone: data.contact_phone ?? '',
          address:       data.address ?? '',
          city:          data.city ?? '',
          country:       data.country ?? 'Chile',
          rut:           data.rut ?? '',
          legalName:     data.legalName ?? '',
          primaryColor:  data.primaryColor ?? '#ea580c',
          instagram:     data.instagram ?? '',
          facebook:      data.facebook ?? '',
          website:       data.website ?? '',
        });
      })
      .catch(() => toast.error('Error al cargar perfil'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof TenantProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/tenant/profile', form);
      toast.success('Perfil actualizado');
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Máximo 2 MB'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const r: any = await api.postForm('/tenant/profile/logo', fd);
      const url = r?.data?.logo_url ?? r?.logo_url ?? r?.data?.data?.logo_url;
      if (url) setProfile(p => p ? { ...p, logo_url: url } : p);
      toast.success('Logo actualizado');
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al subir logo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-orange-100 p-2 rounded-xl">
          <Building2 className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="font-black text-xl text-gray-900">Perfil del restaurante</h1>
          <p className="text-gray-500 text-sm">Actualiza la información de tu negocio</p>
        </div>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Logo</h2>
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-8 h-8 text-gray-300" />
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {uploading ? 'Subiendo...' : 'Cambiar logo'}
            </button>
            <p className="text-xs text-gray-400 mt-1.5">PNG, JPG — máx. 2 MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleLogoChange}
          />
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSave} className="space-y-5">
        {/* Info básica */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Información básica</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre del negocio" required>
              <input value={form.name ?? ''} onChange={set('name')} required
                className={inputCls} />
            </Field>
            <Field label="Teléfono de contacto">
              <input value={form.contact_phone ?? ''} onChange={set('contact_phone')}
                className={inputCls} />
            </Field>
            <Field label="RUT empresa">
              <input value={form.rut ?? ''} onChange={set('rut')} placeholder="12.345.678-9"
                className={inputCls} />
            </Field>
            <Field label="Razón social">
              <input value={form.legalName ?? ''} onChange={set('legalName')}
                className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Ubicación */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Ubicación</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Dirección" className="sm:col-span-2">
              <input value={form.address ?? ''} onChange={set('address')}
                className={inputCls} />
            </Field>
            <Field label="Ciudad">
              <input value={form.city ?? ''} onChange={set('city')}
                className={inputCls} />
            </Field>
            <Field label="País">
              <input value={form.country ?? 'Chile'} onChange={set('country')}
                className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Personalización */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Personalización</h2>
          <Field label="Color principal">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primaryColor ?? '#ea580c'}
                onChange={set('primaryColor')}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                value={form.primaryColor ?? '#ea580c'}
                onChange={set('primaryColor')}
                placeholder="#ea580c"
                className={inputCls}
              />
            </div>
          </Field>
        </div>

        {/* Redes sociales */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Presencia digital</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Instagram">
              <div className="relative">
                <Instagram className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input value={form.instagram ?? ''} onChange={set('instagram')} placeholder="@tu_restaurante"
                  className={`${inputCls} pl-9`} />
              </div>
            </Field>
            <Field label="Facebook">
              <div className="relative">
                <Facebook className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input value={form.facebook ?? ''} onChange={set('facebook')} placeholder="fb.com/tu-restaurante"
                  className={`${inputCls} pl-9`} />
              </div>
            </Field>
            <Field label="Sitio web" className="sm:col-span-2">
              <div className="relative">
                <Globe className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input value={form.website ?? ''} onChange={set('website')} placeholder="https://tu-restaurante.com"
                  className={`${inputCls} pl-9`} />
              </div>
            </Field>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-xl transition-colors flex items-center gap-2 text-sm"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {/* Info de solo lectura */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 text-sm text-gray-500 space-y-1">
        <p><span className="font-medium text-gray-700">Slug:</span> {profile?.slug}</p>
        <p><span className="font-medium text-gray-700">Email de contacto:</span> {profile?.contact_email}</p>
        <p><span className="font-medium text-gray-700">Plan:</span> {profile?.plan}</p>
      </div>
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400';

function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
