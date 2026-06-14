// Generador de datos realistas para dashboard

export interface SalesData {
  date: string;
  total: number;
  orders: number;
  items: number;
}

export interface ProductSale {
  id: number;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
}

export interface HourlyData {
  hour: string;
  sales: number;
  orders: number;
}

export interface PaymentMethodData {
  method: string;
  amount: number;
  percentage: number;
  count: number;
}

// Generar ventas por hora (hoy)
export function generateHourlySales(): HourlyData[] {
  const hours = [];
  const now = new Date().getHours();
  
  for (let h = 8; h <= Math.min(23, now); h++) {
    const isPeak = (h >= 12 && h <= 14) || (h >= 19 && h <= 21);
    const baseAmount = isPeak ? 35000 : 15000;
    const variance = Math.random() * 10000;
    
    hours.push({
      hour: `${h}:00`,
      sales: Math.floor(baseAmount + variance),
      orders: Math.floor((baseAmount + variance) / 3500)
    });
  }
  
  return hours;
}

// Generar top productos
export function generateTopProducts(): ProductSale[] {
  const products = [
    { id: 1, name: 'Pizza Margarita', category: 'Platos Principales', baseQty: 45 },
    { id: 2, name: 'Hamburguesa Clásica', category: 'Platos Principales', baseQty: 38 },
    { id: 3, name: 'Pasta Carbonara', category: 'Platos Principales', baseQty: 32 },
    { id: 4, name: 'Ensalada César', category: 'Entradas', baseQty: 28 },
    { id: 5, name: 'Papas Fritas', category: 'Acompañamientos', baseQty: 52 },
    { id: 6, name: 'Coca Cola', category: 'Bebidas', baseQty: 67 },
    { id: 7, name: 'Cerveza Artesanal', category: 'Bebidas', baseQty: 41 },
    { id: 8, name: 'Brownie con Helado', category: 'Postres', baseQty: 24 },
    { id: 9, name: 'Café Americano', category: 'Bebidas', baseQty: 33 },
    { id: 10, name: 'Lomo Saltado', category: 'Platos Principales', baseQty: 19 },
  ];

  return products.map(p => {
    const variance = Math.floor(Math.random() * 10) - 5;
    const quantity = p.baseQty + variance;
    const avgPrice = p.category === 'Bebidas' ? 2500 : 
                     p.category === 'Platos Principales' ? 10000 : 
                     p.category === 'Postres' ? 5500 : 3500;
    
    return {
      ...p,
      quantity,
      revenue: quantity * avgPrice
    };
  }).sort((a, b) => b.quantity - a.quantity);
}

// Generar ventas por categoría
export function generateCategorySales() {
  return [
    { category: 'Platos Principales', amount: 850000, percentage: 42 },
    { category: 'Bebidas', amount: 520000, percentage: 26 },
    { category: 'Postres', amount: 350000, percentage: 17 },
    { category: 'Entradas', amount: 200000, percentage: 10 },
    { category: 'Acompañamientos', amount: 100000, percentage: 5 },
  ];
}

// Generar métodos de pago
export function generatePaymentMethods(): PaymentMethodData[] {
  const total = 2020000;
  
  return [
    { method: 'Efectivo', amount: 909000, percentage: 45, count: 87 },
    { method: 'Tarjeta', amount: 808000, percentage: 40, count: 72 },
    { method: 'Transferencia', amount: 303000, percentage: 15, count: 28 },
  ];
}

// Calcular KPIs
export function calculateKPIs() {
  const hourlySales = generateHourlySales();
  const todayTotal = hourlySales.reduce((sum, h) => sum + h.sales, 0);
  const todayOrders = hourlySales.reduce((sum, h) => sum + h.orders, 0);
  
  const yesterdayTotal = todayTotal * (0.85 + Math.random() * 0.3); // ±15%
  const lastWeekTotal = todayTotal * 7 * (0.9 + Math.random() * 0.2);
  
  const topProducts = generateTopProducts();
  const totalItems = topProducts.reduce((sum, p) => sum + p.quantity, 0);
  
  return {
    today: {
      total: todayTotal,
      orders: todayOrders,
      items: totalItems,
      avgTicket: Math.floor(todayTotal / todayOrders),
      topProduct: topProducts[0]
    },
    yesterday: {
      total: yesterdayTotal,
      change: ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
    },
    week: {
      total: lastWeekTotal
    },
    cash: todayTotal * 0.65 // Simular dinero en caja
  };
}

// Generar comparativa
export function generateComparison(period: 'day' | 'week' | 'month') {
  const current = generateHourlySales();
  const previous = current.map(h => ({
    ...h,
    sales: Math.floor(h.sales * (0.8 + Math.random() * 0.4))
  }));
  
  return { current, previous };
}

// Horarios pico
export function getPeakHours(): { hour: string; sales: number; orders: number; isPeak: boolean }[] {
  const hourly = generateHourlySales();
  const avgSales = hourly.reduce((sum, h) => sum + h.sales, 0) / hourly.length;
  
  return hourly
    .map(h => ({
      ...h,
      isPeak: h.sales > avgSales * 1.3
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);
}
