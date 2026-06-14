import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, DollarSign, Smartphone } from 'lucide-react';

interface PaymentMethodsChartProps {
  data: Array<{
    method: string;
    amount: number;
    count: number;
  }>;
}

const COLORS: Record<string, string> = {
  'Efectivo': '#10b981',
  'Tarjeta': '#3b82f6',
  'Yape': '#8b5cf6',
  'Plin': '#f59e0b'
};

const ICONS: Record<string, any> = {
  'Efectivo': DollarSign,
  'Tarjeta': CreditCard,
  'Yape': Smartphone,
  'Plin': Smartphone
};

export default function PaymentMethodsChart({ data }: PaymentMethodsChartProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Métodos de Pago</h3>

      <div className="grid grid-cols-2 gap-6">
        {/* Gráfico */}
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="method"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.method] || '#999'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '8px' }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Leyenda personalizada */}
        <div className="space-y-3">
          {data.map((item, index) => {
            const Icon = ICONS[item.method] || DollarSign;
            const percentage = ((item.amount / total) * 100).toFixed(1);
            
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[item.method] || '#999' }}
                  />
                  <Icon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">{item.method}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{formatCurrency(item.amount)}</div>
                  <div className="text-xs text-gray-600">{percentage}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
