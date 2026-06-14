import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface TopProductsChartProps {
  data: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TopProductsChart({ data }: TopProductsChartProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Productos Más Vendidos</h3>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis 
            dataKey="productName" 
            type="category" 
            width={150}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
            formatter={(value: number, name: string) => {
              if (name === 'revenue') return [formatCurrency(value), 'Ingresos'];
              if (name === 'quantity') return [value, 'Cantidad'];
              return [value, name];
            }}
          />
          <Bar dataKey="quantity" name="Cantidad">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Lista detallada */}
      <div className="mt-6 space-y-2">
        {data.map((product, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              >
                {index + 1}
              </div>
              <span className="font-medium text-gray-900">{product.productName}</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-900">{formatCurrency(product.revenue)}</div>
              <div className="text-sm text-gray-600">{product.quantity} vendidos</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
