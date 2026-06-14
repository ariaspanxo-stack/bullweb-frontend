const CONTACT_WHATSAPP = '56956739153';
const WA_MSG = encodeURIComponent(
  'Hola BullWeb quiero activar el módulo de Clientes $4.990/mes'
);

export default function ClientesPaywall() {
  const waLink = `https://wa.me/${CONTACT_WHATSAPP}?text=${WA_MSG}`;

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">👥 Clientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Historial, segmentación y fidelización</p>
      </div>

      {/* Hero banner */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-8 mb-6 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
            👥 MÓDULO OPCIONAL
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3 leading-tight">
            Conoce a tus clientes<br />y hazlos volver siempre
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Base de datos completa de tus clientes. Historial de visitas, gasto total,
            puntos acumulados y segmentación por comportamiento.
            Todo integrado con tu POS.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
            >
              👥 Activar por $4.990/mes vía WhatsApp
            </a>
            <a
              href="mailto:hola@bullwebchile.com?subject=Activar%20Clientes"
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
              <span className="font-semibold text-gray-800">Clientes VIP</span>
              <span className="text-lg">🏆</span>
            </div>
            <div className="text-gray-400 text-xs mb-2">maika · 3 órdenes $14k</div>
            <div className="border-t pt-2 text-gray-600">
              Próxima visita estimada: 3 días
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-xs text-gray-600">
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-500">Total clientes</span>
              <span className="font-bold text-gray-800">142</span>
            </div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-gray-500">Nuevos este mes</span>
              <span className="font-bold text-green-600">18</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="text-gray-500">Gasto promedio</span>
              <span className="font-bold text-gray-800">$8.500</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features grid 2×3 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[
          {
            icon: '👤',
            title: 'Ficha de cliente',
            desc: 'Nombre, teléfono, email, historial completo de visitas y órdenes.',
          },
          {
            icon: '💰',
            title: 'Gasto total',
            desc: 'Ve cuánto ha gastado cada cliente desde su primera visita.',
          },
          {
            icon: '⭐',
            title: 'Puntos acumulados',
            desc: 'Integrado con módulo de Fidelización para acumular y canjear puntos.',
          },
          {
            icon: '🏆',
            title: 'Clientes VIP',
            desc: 'Identifica automáticamente a tus mejores clientes por frecuencia y gasto.',
          },
          {
            icon: '📊',
            title: 'Exportar datos',
            desc: 'Descarga tu base de clientes en Excel o CSV cuando quieras.',
          },
          {
            icon: '🔍',
            title: 'Búsqueda y filtros',
            desc: 'Busca por nombre, teléfono o email al instante.',
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
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Activar Clientes por $4.990/mes →
          </a>
          <p className="text-xs text-gray-400 mt-2">Sin contrato. Cancela cuando quieras. IVA incluido.</p>
        </div>
      </div>

    </div>
  );
}
