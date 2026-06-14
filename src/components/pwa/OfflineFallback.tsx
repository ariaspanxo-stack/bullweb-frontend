import { WifiOff } from 'lucide-react';

export default function OfflineFallback() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <WifiOff className="w-20 h-20 text-gray-300 mb-6" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Sin conexión a internet</h1>
      <p className="text-gray-500 mb-8">Verifica tu conexión e intenta de nuevo</p>
      <button
        onClick={() => window.location.reload()}
        className="px-8 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30"
      >
        Reintentar
      </button>
    </div>
  );
}