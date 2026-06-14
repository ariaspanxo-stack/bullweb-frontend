const CONTACT_WHATSAPP = '56956739153';
const WA_MSG = encodeURIComponent(
  'Hola BullWeb quiero activar el módulo de Cupones $2.990/mes'
);

export function CuponesPaywall() {
  const waLink = `https://wa.me/${CONTACT_WHATSAPP}?text=${WA_MSG}`;

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">🎟️ Cupones & Promociones</h1>
        <p className="text-sm text-gray-500 mt-0.5">Descuentos por % o monto fijo, validación en el POS</p>
      </div>

      {/* Hero banner */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-8 mb-6 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
            🎟️ MÓDULO OPCIONAL
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3 leading-tight">
            Crea cupones de descuento<br />y aumenta tus ventas
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Genera códigos de descuento por % o monto fijo. Tus clientes los ingresan al
            momento del cobro en el POS. Sin límite de cupones.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
            >
              🎟️ Activar por $2.990/mes vía WhatsApp
            </a>
            <a
              href="mailto:hola@bullwebchile.com?subject=Activar%20Cupones"
              className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium px-6 py-3 rounded-xl border border-gray-200 transition-colors"
            >
              Consultar por email →
            </a>
          </div>
        </div>

        {/* Mock visual — solo desktop */}
        <div className="hidden md:flex flex-col gap-3 min-w-[220px]">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-xs text-gray-600">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-800">Cupón creado</span>
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                ✅ Activo
              </span>
            </div>
            <div className="text-gray-400 text-xs mb-2">VERANO20 · 20% dto.</div>
            <div className="border-t pt-2 text-gray-600">
              "Válido hasta 30/04"
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-xs text-gray-600">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-800">Usos totales</span>
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                12 usos
              </span>
            </div>
            <div className="text-gray-400 text-xs mb-2">BIENVENIDA10</div>
            <div className="border-t pt-2 font-bold text-gray-800">
              Descuento: $1.200
            </div>
          </div>
        </div>
      </div>

      {/* Features grid 2×3 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          {
            icon: '⚡',
            title: 'Descuento por %',
            desc: 'Configura el porcentaje de descuento. Ej: 10%, 20%, 50% off.',
          },
          {
            icon: '💰',
            title: 'Descuento monto fijo',
            desc: 'Descuento de $X en la cuenta. Ej: $1.000, $5.000 de descuento.',
          },
          {
            icon: '📅',
            title: 'Fecha de expiración',
            desc: 'Define cuándo vence el cupón automáticamente.',
          },
          {
            icon: '🔢',
            title: 'Límite de usos',
            desc: 'Controla cuántas veces se puede usar cada código.',
          },
          {
            icon: '📊',
            title: 'Estadísticas',
            desc: 'Ve cuántas veces se usó cada cupón y cuánto descuento otorgaste.',
          },
          {
            icon: '✅',
            title: 'Validación en el POS',
            desc: 'El cliente ingresa el código al momento del cobro. Validación instantánea.',
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
              desc: 'Escríbenos por WhatsApp o email indicando tu restaurante y te respondemos en minutos.',
              color: 'bg-orange-100 text-orange-600',
            },
            {
              n: '2',
              title: 'Realiza el pago',
              desc: 'Te enviamos el link de pago de $2.990/mes vía Flow o transferencia bancaria.',
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
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Activar Cupones por $2.990/mes →
          </a>
          <p className="text-xs text-gray-400 mt-2">Sin contrato. Cancela cuando quieras. IVA incluido.</p>
        </div>
      </div>

    </div>
  );
}
