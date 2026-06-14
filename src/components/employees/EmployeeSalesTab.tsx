import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Loader2, AlertCircle, ShoppingBag } from 'lucide-react';

interface Props {
  employeeId: string;
}

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n ?? 0);

const fmtDateTime = (dt: string) => {
  const d = new Date(dt);
  return (
    d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
  );
};

export function EmployeeSalesTab({ employeeId }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['employee-sales', employeeId],
    queryFn: () =>
      api.get(`/employees/${employeeId}/sales`).then(r => r.data),
    staleTime: 60_000,
  });

  // Respuesta: { success, data: { sales, orders, averageTicket, recentOrders } }
  const payload    = data?.data ?? data;
  const orders: any[] = payload?.recentOrders ?? [];
  const totalSales: number = payload?.sales ?? 0;
  const totalOrders: number = payload?.orders ?? 0;
  const avgTicket: number  = payload?.averageTicket ?? 0;

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
    </div>
  );

  if (isError) return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <AlertCircle className="w-8 h-8 text-red-300" />
      <p className="text-sm text-gray-400">Error al cargar las ventas</p>
    </div>
  );

  if (orders.length === 0) return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <ShoppingBag className="w-8 h-8 text-gray-200" />
      <p className="text-sm text-gray-400">Sin ventas registradas</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-gray-800">{totalOrders}</p>
          <p className="text-xs text-gray-400 mt-0.5">Órdenes</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-3 text-center">
          <p className="text-sm font-black text-indigo-600 leading-tight">{formatCLP(totalSales)}</p>
          <p className="text-xs text-gray-400 mt-0.5">En ventas</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-sm font-black text-gray-800 leading-tight">{formatCLP(avgTicket)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Ticket prom.</p>
        </div>
      </div>

      {/* Lista de órdenes recientes */}
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide pt-1">
        Últimas {orders.length} órdenes
      </p>
      <div className="space-y-1.5">
        {orders.map((order: any) => (
          <div
            key={order.id}
            className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-base">
                {order.type === 'DINE_IN' ? '🍴' : order.type === 'TAKEAWAY' ? '🛍️' : '🚴'}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {order.orderNumber ?? `#${order.id.slice(-6).toUpperCase()}`}
                  {order.tables?.number ? ` · Mesa ${order.tables.number}` : ''}
                </p>
                <p className="text-xs text-gray-400">{fmtDateTime(order.createdAt)}</p>
              </div>
            </div>
            <p className="text-sm font-bold text-gray-800">{formatCLP(order.total)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
