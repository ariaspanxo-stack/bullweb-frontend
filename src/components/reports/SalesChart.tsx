import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface SalesChartProps {
  data: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
  type: 'line' | 'bar';
  title: string;
  comparison?: {
    value: number;
    isPositive: boolean;
  };
}

export default function SalesChart({ data, type, title, comparison }: SalesChartProps) {
  const Chart = type === 'line' ? LineChart : BarChart;
  const DataComponent = type === 'line' ? Line : Bar;

  const totalSales = data.reduce((sum, item) => sum + item.sales, 0);
  const totalOrders = data.reduce((sum, item) => sum + item.orders, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center gap-4 mt-2">
            <div>
              <div className="text-sm text-gray-600">Total Ventas</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalSales)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Órdenes</div>
              <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
            </div>
          </div>
        </div>
        {comparison && (
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${
            comparison.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {comparison.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-bold">{Math.abs(comparison.value).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <Chart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              // Formatear fecha según el período
              const date = new Date(value);
              return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
            }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `S/ ${value}`}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
            formatter={(value: number, name: string) => {
              if (name === 'sales') return [formatCurrency(value), 'Ventas'];
              if (name === 'orders') return [value, 'Órdenes'];
              return [value, name];
            }}
          />
          <Legend />
          <DataComponent 
            type="monotone" 
            dataKey="sales" 
            stroke="#3b82f6" 
            fill="#3b82f6"
            strokeWidth={2}
            name="Ventas"
          />
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
