import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, BarChart2 } from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { Printer as PrinterType } from '@/services/adminService';

interface HistoryDay {
  day:          string;
  total_jobs:   number;
  successful:   number;
  failed:       number;
  cancelled:    number;
  success_rate: number;
}

export function PrinterHistoryModal({
  printer,
  onClose,
}: {
  printer: PrinterType;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getPrinterHistory(printer.id)
      .then(data => setHistory(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [printer.id]);

  const totals = useMemo(() => ({
    jobs:       history.reduce((s, d) => s + Number(d.total_jobs),  0),
    successful: history.reduce((s, d) => s + Number(d.successful),  0),
    failed:     history.reduce((s, d) => s + Number(d.failed),      0),
    avgRate:    history.length > 0
      ? history.reduce((s, d) => s + Number(d.success_rate), 0) / history.length
      : 0,
  }), [history]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-black text-gray-800 text-lg">Historial — {printer.name}</h2>
            <p className="text-sm text-gray-400 mt-0.5">Últimos 30 días</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Stats globales del período */}
        <div className="grid grid-cols-4 gap-2 p-4 border-b border-gray-100">
          {[
            { label: 'Total',      value: totals.jobs,      color: 'text-gray-800', bg: 'bg-gray-50' },
            { label: 'Exitosos',   value: totals.successful, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Fallidos',   value: totals.failed,    color: 'text-red-500',   bg: 'bg-red-50' },
            {
              label: 'Tasa éxito',
              value: `${totals.avgRate.toFixed(0)}%`,
              color: totals.avgRate >= 95 ? 'text-green-600' : totals.avgRate >= 80 ? 'text-amber-500' : 'text-red-500',
              bg:    totals.avgRate >= 95 ? 'bg-green-50'    : totals.avgRate >= 80 ? 'bg-amber-50'    : 'bg-red-50',
            },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} rounded-2xl p-3 text-center`}>
              <p className={`text-lg font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Lista de días */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Sin actividad en los últimos 30 días</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(day => {
                const rate = Number(day.success_rate);
                return (
                  <div key={day.day} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                    <span className="text-sm text-gray-500 w-24 flex-shrink-0">
                      {new Date(day.day).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                    </span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          rate >= 95 ? 'bg-green-500' : rate >= 80 ? 'bg-amber-400' : 'bg-red-500'
                        }`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <div className="flex gap-3 text-xs flex-shrink-0">
                      <span className="text-green-600 font-medium">✓ {Number(day.successful)}</span>
                      {Number(day.failed) > 0 && (
                        <span className="text-red-500 font-medium">✗ {Number(day.failed)}</span>
                      )}
                      <span className="text-gray-400">{rate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
