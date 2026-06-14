import { useSearchParams } from 'react-router-dom';

export default function Suspended() {
  const [params] = useSearchParams();
  const cancelled = params.get('reason') === 'cancelled';

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">
        <div className="text-6xl mb-6">{cancelled ? '❌' : '🔒'}</div>

        <h1 className="text-2xl font-bold text-white mb-3">
          {cancelled ? 'Cuenta Cancelada' : 'Cuenta Suspendida'}
        </h1>

        <p className="text-gray-400 mb-6 leading-relaxed">
          {cancelled
            ? 'Tu cuenta ha sido cancelada. Para más información contacta al equipo de BullWeb Chile.'
            : 'Tu cuenta ha sido suspendida temporalmente. Para reactivarla contacta al administrador de BullWeb Chile.'}
        </p>

        <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">📧 Soporte</p>
          <p className="text-orange-400 font-medium">admin@bullwebchile.com</p>
        </div>

        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = '/login';
          }}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
