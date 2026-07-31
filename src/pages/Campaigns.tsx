export default function Campaigns() {
  // ── Módulo Fidelización/Campañas temporalmente bloqueado ──
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Próximamente</h2>
      <p className="text-gray-500 max-w-md">Estamos puliendo los detalles de nuestro módulo de Fidelización y Campañas para que sea una herramienta imbatible para tu restaurante. ¡Muy pronto disponible!</p>
    </div>
  );
}