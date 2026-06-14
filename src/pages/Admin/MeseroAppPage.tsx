// ══════════════════════════════════════════════════════════════════
// MESERO APP PAGE — Página admin para instalar la PWA del mesero
// ══════════════════════════════════════════════════════════════════

import { useState }     from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';

import { useAuthStore }   from '@/store/authStore';

const APP_BASE_URL = import.meta.env.VITE_MESERO_APP_URL ?? 'https://app.bullwebchile.com/mesero/login';

export default function MeseroAppPage() {
  const { user } = useAuthStore();
  const [copied, setCopied] = useState(false);

  const tenantSlug = user?.tenantSlug ?? (user as any)?.tenantId ?? '';

  const meseroUrl = tenantSlug
    ? `${APP_BASE_URL}?tenant=${tenantSlug}`
    : APP_BASE_URL;

  function handleCopy() {
    navigator.clipboard.writeText(meseroUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="bg-orange-500 rounded-2xl p-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-xl font-bold">App Mesero</h1>
          <p className="text-orange-100 text-sm mt-1">
            PWA — funciona en cualquier celular o tablet, sin App Store
          </p>
        </div>
        <a
          href={meseroUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-white text-orange-500 font-medium text-sm
                     rounded-xl px-4 py-2.5 hover:bg-orange-50 transition-colors shrink-0"
        >
          <ExternalLink size={15} />
          Abrir app
        </a>
      </div>

      {/* URL de acceso */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔗</span>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              URL de acceso para tus meseros
            </p>
            <p className="text-xs text-gray-400">
              Comparte este enlace por WhatsApp o mensaje de texto
            </p>
          </div>
        </div>

        {/* URL + botón copiar */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3">
          <span className="text-xs text-gray-700 font-mono flex-1 break-all leading-relaxed">
            {meseroUrl}
          </span>
          <button
            onClick={handleCopy}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-medium rounded-lg
                        px-3 py-2 transition-all
                        ${copied
                          ? 'bg-green-500 text-white'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                        }`}
          >
            {copied
              ? <><Check size={13} /> Copiado</>
              : <><Copy size={13} /> Copiar</>
            }
          </button>
        </div>

        {/* Pasos para el mesero */}
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-blue-700 mb-2">📱 El mesero debe:</p>
          <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
            <li>Abrir el enlace en su celular</li>
            <li>Seleccionar su nombre</li>
            <li>Ingresar su PIN de 4 dígitos</li>
            <li>¡Listo! Ya puede tomar órdenes</li>
          </ol>
        </div>
      </div>

      {/* Instrucciones instalación PWA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Android */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📱</span>
            <p className="text-sm font-semibold text-gray-900">Android (Chrome)</p>
          </div>
          <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside">
            <li>Abre el enlace en Chrome</li>
            <li>Toca el menú ⋮ (tres puntos)</li>
            <li>Selecciona "Instalar aplicación"</li>
            <li>El ícono aparece en el escritorio</li>
          </ol>
        </div>

        {/* iPhone */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🍎</span>
            <p className="text-sm font-semibold text-gray-900">iPhone / iPad (Safari)</p>
          </div>
          <ol className="text-xs text-gray-500 space-y-1.5 list-decimal list-inside">
            <li>Abre el enlace en Safari</li>
            <li>Toca el botón Compartir ↑</li>
            <li>Selecciona "Añadir a pantalla inicio"</li>
            <li>El ícono aparece en el home</li>
          </ol>
        </div>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-3.5">
          <span className="text-lg shrink-0">📶</span>
          <div>
            <p className="text-xs font-semibold text-gray-900">Wi-Fi del local</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Conecta el celular a la red del restaurante para mejor rendimiento.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-3.5">
          <span className="text-lg shrink-0">🔐</span>
          <div>
            <p className="text-xs font-semibold text-gray-900">PIN de acceso</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Configura el PIN de cada mesero en Administración → Usuarios.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
