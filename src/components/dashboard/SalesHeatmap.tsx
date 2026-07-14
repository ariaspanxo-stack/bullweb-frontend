import { useMemo, useState } from 'react';
import { Clock, TrendingUp } from 'lucide-react';

interface HourPoint {
  hour: number;
  sales: number;
  orders?: number;
}

interface SalesHeatmapProps {
  /** Datos por hora (0-23) provenientes del dashboard (backend, con TZ Chile) */
  salesByHour: HourPoint[];
  /** Loading state del dashboard */
  isLoading?: boolean;
}

/**
 * Heatmap de Ventas por Hora (00:00 → 23:00).
 * - Verde claro  = poco movimiento
 * - Verde oscuro = movimiento medio-alto
 * - Naranjo/rojo = hora pico
 *
 * El cálculo de intensidad usa los datos ya corregidos por timezone desde el backend
 * (EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'America/Santiago')).
 */
export function SalesHeatmap({ salesByHour, isLoading = false }: SalesHeatmapProps) {
  const [hovered, setHovered] = useState<HourPoint | null>(null);

  // Normaliza a 24 horas (0-23) rellenando vacíos con 0
  const full24 = useMemo<HourPoint[]>(() => {
    const map = new Map<number, HourPoint>();
    salesByHour.forEach((h) => map.set(Number(h.hour), {
      hour:   Number(h.hour),
      sales:  Number(h.sales)  || 0,
      orders: Number(h.orders) || 0,
    }));
    return Array.from({ length: 24 }, (_, h) =>
      map.get(h) ?? { hour: h, sales: 0, orders: 0 },
    );
  }, [salesByHour]);

  const maxSales = useMemo(
    () => Math.max(...full24.map((h) => h.sales), 1),
    [full24],
  );
  const peak = useMemo(
    () => full24.reduce((m, h) => (h.sales > m.sales ? h : m), full24[0]),
    [full24],
  );

  const formatCLP = (v: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
    }).format(v);

  /**
   * Escala de color según intensidad (0 → 1):
   *  0.00 – 0.25  → verde muy claro
   *  0.25 – 0.50  → verde medio
   *  0.50 – 0.75  → verde oscuro
   *  0.75 – 1.00  → naranjo / rojo (hora pico)
   */
  const cellColor = (intensity: number): string => {
    if (intensity <= 0) return '#f1f5f9'; // slate-100 (sin ventas)
    if (intensity < 0.25) {
      // verde muy claro → verde claro
      const a = 0.25 + intensity; // 0.25 – 0.50 opacidad
      return `rgba(134, 239, 172, ${a.toFixed(2)})`; // green-300
    }
    if (intensity < 0.5) {
      const a = 0.45 + intensity;
      return `rgba(74, 222, 128, ${a.toFixed(2)})`; // green-400
    }
    if (intensity < 0.75) {
      const a = 0.65 + (intensity - 0.5);
      return `rgba(22, 163, 74, ${a.toFixed(2)})`; // green-600
    }
    // Hora pico: naranjo → rojo
    const a = 0.75 + (intensity - 0.75) * 1.0;
    return `rgba(249, 115, 22, ${Math.min(a, 0.98).toFixed(2)})`; // orange-500
  };

  const textColor = (intensity: number): string =>
    intensity >= 0.5 ? '#ffffff' : '#475569';

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="mb-4 flex items-center gap-2">
          <Clock size={20} className="text-amber-600" />
          <h2 className="text-xl font-bold text-slate-800">Mapa de Calor — Ventas por Hora</h2>
        </div>
        <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="animate-pulse h-16 rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  const totalVentas = full24.reduce((s, h) => s + h.sales, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={20} className="text-amber-600" />
          <h2 className="text-xl font-bold text-slate-800">Mapa de Calor — Ventas por Hora</h2>
        </div>
        {peak.sales > 0 && (
          <div className="hidden md:flex items-center gap-2 text-sm">
            <TrendingUp size={16} className="text-orange-500" />
            <span className="text-slate-500">Hora pico:</span>
            <span className="font-bold text-slate-800">
              {String(peak.hour).padStart(2, '0')}:00
            </span>
            <span className="text-slate-400">·</span>
            <span className="font-semibold text-orange-600">{formatCLP(peak.sales)}</span>
          </div>
        )}
      </div>

      {/* Leyenda de escala */}
      <div className="mb-3 flex items-center justify-end gap-2 text-xs text-slate-500">
        <span>Menos ventas</span>
        <div className="flex gap-0.5">
          <span className="h-3 w-6 rounded-sm" style={{ background: 'rgba(134,239,172,0.4)' }} />
          <span className="h-3 w-6 rounded-sm" style={{ background: 'rgba(74,222,128,0.7)' }} />
          <span className="h-3 w-6 rounded-sm" style={{ background: 'rgba(22,163,74,0.9)' }} />
          <span className="h-3 w-6 rounded-sm" style={{ background: 'rgba(249,115,22,0.95)' }} />
        </div>
        <span>Más ventas</span>
      </div>

      {/* Grid de 24 celdas */}
      <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1.5">
        {full24.map((h) => {
          const intensity = h.sales / maxSales;
          const isPeak = h.hour === peak.hour && peak.sales > 0;
          return (
            <div
              key={h.hour}
              onMouseEnter={() => setHovered(h)}
              onMouseLeave={() => setHovered(null)}
              className={`relative flex flex-col items-center justify-center rounded-lg cursor-default transition-transform hover:scale-105 hover:z-10 ${isPeak ? 'ring-2 ring-orange-400' : ''}`}
              style={{
                background: cellColor(intensity),
                color: textColor(intensity),
                minHeight: '64px',
              }}
            >
              <span className="text-[10px] font-semibold opacity-80">
                {String(h.hour).padStart(2, '0')}:00
              </span>
              {h.sales > 0 && (
                <span className="text-[9px] font-bold leading-tight">
                  {h.sales >= 1000
                    ? `$${Math.round(h.sales / 1000)}K`
                    : formatCLP(h.sales)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip flotante / detalle */}
      <div className="mt-3 min-h-[40px] flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-sm">
        {hovered ? (
          <>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-400" />
              <span className="font-semibold text-slate-700">
                {String(hovered.hour).padStart(2, '0')}:00 hrs
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-500">
                <span className="font-bold text-slate-800">{hovered.orders}</span> órdenes
              </span>
              <span className="font-bold text-amber-600">{formatCLP(hovered.sales)}</span>
            </div>
          </>
        ) : (
          <>
            <span className="text-slate-400">Pasa el mouse sobre una hora para ver el detalle</span>
            <span className="font-semibold text-slate-600">
              Total del período: <span className="text-slate-800">{formatCLP(totalVentas)}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default SalesHeatmap;