// TODO: Reemplazar CONTACT_WHATSAPP con el número real de BullWeb Chile
// Formato: 56 + número sin 0 inicial (ej: 56912345678)
const CONTACT_WHATSAPP = '56956739153';

interface Props {
  onActivated?: () => void;
}

function buildWhatsAppURL(): string {
  const msg = encodeURIComponent(
    'Hola, quiero activar el módulo de Fidelización ($4.990/mes) para mi restaurante en BullWeb Chile. ¿Cómo procedo?'
  );
  return `https://wa.me/${CONTACT_WHATSAPP}?text=${msg}`;
}

export function FidelizacionPaywall({ onActivated: _onActivated }: Props) {
  const handleActivate = () => {
    window.open(buildWhatsAppURL(), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">💜 Fidelización de Clientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Automatizaciones, campañas y puntos de lealtad</p>
      </div>

      {/* Hero banner — idéntico al DTE */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-8 mb-6 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
            💜 Módulo opcional
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3 leading-tight">
            Fideliza a tus clientes<br />y haz que vuelvan solos
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Activa emails automáticos, campañas masivas y puntos de lealtad.
            Cada cliente que vuelve es una venta sin costo de adquisición.
            Integrado directo con tu POS BullWeb.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleActivate}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
            >
              💬 Activar por $4.990/mes vía WhatsApp
            </button>
            <a
              href="mailto:contacto@bullwebchile.com"
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium px-6 py-3 rounded-xl border border-gray-200 transition-colors"
            >
              Consultar por email →
            </a>
          </div>
        </div>

        {/* Preview cards — solo desktop */}
        <div className="hidden md:flex flex-col gap-3 min-w-[220px]">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-xs text-gray-600">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-800">Email automático</span>
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                ✅ Enviado
              </span>
            </div>
            <div className="text-gray-400 text-xs mb-2">Cumpleaños · María G.</div>
            <div className="border-t pt-2 text-gray-600">
              "¡Feliz cumpleaños! 20% de descuento hoy"
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-xs text-gray-600">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-800">Puntos acumulados</span>
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                1.240 pts
              </span>
            </div>
            <div className="text-gray-400 text-xs mb-2">Carlos R. · Cliente VIP</div>
            <div className="border-t pt-2 font-bold text-gray-800">
              Canje: Postre gratis
            </div>
          </div>
        </div>
      </div>

      {/* Features grid 2×3 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          {
            icon: '⚡',
            title: 'Emails automáticos',
            desc: 'Se envían solos según las reglas que configures. Sin hacer nada extra.',
          },
          {
            icon: '📢',
            title: 'Campañas masivas',
            desc: 'Envío a segmentos de clientes. Descuentos, novedades, promociones.',
          },
          {
            icon: '⭐',
            title: 'Puntos de lealtad',
            desc: 'Los clientes acumulan puntos por compra y los canjean en tu local.',
          },
          {
            icon: '🎂',
            title: 'Cumpleaños VIP',
            desc: 'Email automático el día del cumpleaños con regalo o descuento especial.',
          },
          {
            icon: '📊',
            title: 'Estadísticas',
            desc: 'Ve emails enviados, abiertos y cuántos clientes volvieron.',
          },
          {
            icon: '🔄',
            title: 'Recuperar inactivos',
            desc: 'Email automático a clientes sin visita en 30 o más días.',
          },
        ].map(f => (
          <div
            key={f.title}
            className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="font-semibold text-gray-800 text-sm mb-1">{f.title}</div>
            <div className="text-xs text-gray-500 leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Pasos 1-2-3 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">
          ¿Cómo activarlo?
        </h3>
        <div className="flex flex-col md:flex-row gap-4">
          {[
            {
              n: '1',
              title: 'Contáctanos',
              desc: 'Escribe por WhatsApp o email indicando tu restaurante y te respondemos en minutos.',
              color: 'bg-orange-100 text-orange-600',
            },
            {
              n: '2',
              title: 'Realiza el pago',
              desc: 'Te enviamos el link de pago de $4.990/mes vía Flow o transferencia bancaria.',
              color: 'bg-blue-100 text-blue-600',
            },
            {
              n: '3',
              title: 'Acceso inmediato',
              desc: 'Al confirmar el pago activamos el módulo al instante. Sin esperas.',
              color: 'bg-green-100 text-green-600',
            },
          ].map(step => (
            <div key={step.n} className="flex gap-3 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${step.color}`}>
                {step.n}
              </div>
              <div>
                <div className="font-medium text-gray-800 text-sm mb-0.5">{step.title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-gray-100">
          <button
            onClick={handleActivate}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            💬 Activar Fidelización por $4.990/mes →
          </button>
          <p className="text-xs text-gray-400 mt-2">Sin contrato. Cancela cuando quieras. IVA incluido.</p>
        </div>
      </div>

    </div>
  );
}
