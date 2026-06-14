import { formatCurrency } from '../lib/utils';

export interface ProductMetrics {
  marginPercent: number;
  marginAmount: number;
  markupPercent: number;
  roi: number;
}

/**
 * Calcula todas las métricas financieras de un producto
 */
export const calculateProductMetrics = (
  price: number,
  cost: number
): ProductMetrics => {
  // Margen % = ((Precio - Costo) / Precio) × 100
  const marginPercent = price > 0 ? ((price - cost) / price) * 100 : 0;

  // Margen $ = Precio - Costo (ganancia en pesos)
  const marginAmount = price - cost;

  // Markup % = ((Precio - Costo) / Costo) × 100
  const markupPercent = cost > 0 ? ((price - cost) / cost) * 100 : 0;

  // ROI = ((Ganancia - Inversión) / Inversión) × 100
  // En este caso: ((Precio - Costo) / Costo) × 100 = Markup
  const roi = markupPercent;

  return {
    marginPercent: parseFloat(marginPercent.toFixed(1)),
    marginAmount: parseFloat(marginAmount.toFixed(0)),
    markupPercent: parseFloat(markupPercent.toFixed(1)),
    roi: parseFloat(roi.toFixed(1)),
  };
};

/**
 * Formatea una métrica con su símbolo
 */
export const formatMetric = (
  value: number,
  type: 'percent' | 'currency'
): string => {
  if (type === 'percent') {
    return `${value}%`;
  }
  return formatCurrency(value);
};

/**
 * Obtiene el color según el valor de la métrica
 */
export const getMetricColor = (
  value: number,
  type: 'margin' | 'markup'
): string => {
  if (type === 'margin') {
    // Margen %: >40% excelente, >20% bueno, <20% bajo
    if (value >= 40) return 'text-green-600 bg-green-50';
    if (value >= 20) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  } else {
    // Markup %: >67% excelente, >25% bueno, <25% bajo
    if (value >= 67) return 'text-green-600 bg-green-50';
    if (value >= 25) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  }
};

/**
 * Descripción de cada métrica
 */
export const metricDescriptions = {
  marginPercent: 'Porcentaje de ganancia sobre el precio de venta. Indica qué % del precio final es ganancia.',
  marginAmount: 'Ganancia en pesos por cada unidad vendida. Precio - Costo.',
  markupPercent: 'Porcentaje de ganancia sobre el costo. Indica cuánto % ganaste sobre lo que invertiste.',
  roi: 'Retorno de inversión. Cuánto recuperas por cada peso invertido.',
};
