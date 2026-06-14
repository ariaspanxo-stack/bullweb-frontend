export interface KPIData {
  label: string;
  value: string | number;
  change?: number; // Porcentaje de cambio (positivo o negativo)
  changeLabel?: string; // Ej: "vs mes anterior"
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

export interface SalesData {
  date: string;
  sales: number;
  cost: number;
  profit: number;
}

export interface ProductSalesData {
  productId: string;
  productName: string;
  unitsSold: number;
  revenue: number;
  profit: number;
}

export interface CategoryDistribution {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  productCount: number;
  percentage: number;
}

export interface DashboardData {
  kpis: KPIData[];
  salesHistory: SalesData[];
  topProducts: ProductSalesData[];
  categoryDistribution: CategoryDistribution[];
}
