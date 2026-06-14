import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Clock, 
  Users,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Check,
  X,
  ChefHat,
  UserCheck,
  Send
} from 'lucide-react';
import tablesService from '@/services/tablesService';
import { menuService } from '@/services/menuService';
import { posService } from '@/services/posService';
import { toast } from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import api from '@/services/api';

type POSMode = 'mesas' | 'mostrador' | 'delivery';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function POS() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<POSMode>('mesas');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [searchProduct, setSearchProduct] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  
  // Estados para configuraci�n de mesa
  const [guestCount, setGuestCount] = useState<number>(0);
  const [selectedWaiter, setSelectedWaiter] = useState<string>('');

  // Queries
  const { data: tablesData, isLoading: loadingTables } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesService.getTables(),
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => menuService.getProducts(),
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: () => posService.getOrders({ status: 'pending' }),
    enabled: mode !== 'mesas',
  });

  // Query para obtener empleados/garzones
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees');
      return response.data.data || [];
    },
  });

  // Mutation para ocupar mesa
  const occupyTableMutation = useMutation({
    mutationFn: async ({ tableId, guestCount, waiterId }: any) => {
      await tablesService.occupyTable(tableId, guestCount);
      // Aqu� se podr�a asignar el garz�n si la API lo soporta
      return { tableId, guestCount, waiterId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Mesa abierta exitosamente');
    },
    onError: () => {
      toast.error('Error al abrir la mesa');
    }
  });

  // Mutation para crear orden
  const createOrderMutation = useMutation({
    mutationFn: (orderData: any) => posService.createOrder(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      clearCart();
      toast.success('Pedido creado exitosamente');
    },
    onError: () => {
      toast.error('Error al crear el pedido');
    }
  });

  const tables = tablesData?.tables || [];
  const sections = tablesData?.sections || [];

  // Funciones del carrito
  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        id: Math.random().toString(),
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      }]);
    }
    toast.success(`${product.name} agregado`);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
    toast.success('Item eliminado');
  };

  const clearCart = () => {
    setCart([]);
    setSelectedTable(null);
    setCustomerName('');
    setGuestCount(2);
    setSelectedWaiter('');
  };

  const handleOpenTable = async () => {
    if (!selectedTable) {
      toast.error('Selecciona una mesa');
      return;
    }

    if (!selectedWaiter) {
      toast.error('Asigna un garz�n');
      return;
    }

    if (guestCount < 1) {
      toast.error('Ingresa el n�mero de personas');
      return;
    }

    try {
      await occupyTableMutation.mutateAsync({
        tableId: selectedTable.id,
        guestCount,
        waiterId: selectedWaiter
      });
      
      // Actualizar el estado local de la mesa para reflejar que est� ocupada
      setSelectedTable({
        ...selectedTable,
        status: 'OCCUPIED',
        guestCount,
        waiterId: selectedWaiter
      });
    } catch (error) {
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    if (mode === 'mesas' && !selectedTable) {
      toast.error('Selecciona una mesa');
      return;
    }

    if (mode !== 'mesas' && !customerName.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }

    try {
      const orderData = {
        type: mode === 'mesas' ? 'DINE_IN' : mode === 'mostrador' ? 'TAKEAWAY' : 'DELIVERY',
        tableId: mode === 'mesas' ? selectedTable.id : undefined,
        customerName: mode !== 'mesas' ? customerName : undefined,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      await createOrderMutation.mutateAsync(orderData);
    } catch (error) {
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Filtrar productos
  const filteredProducts = products.filter((p: any) =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) && p.available
  );

  // Filtrar mesas por sección
  const filteredTables = selectedSection
    ? tables.filter((t: any) => t.sectionId === selectedSection)
    : tables;

  if (loadingTables || loadingProducts) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* ZONA A: Selectores de Flujo */}
      <div className="flex gap-4 p-6 bg-zinc-900/50 border-b border-zinc-800">
        <button
          onClick={() => {
            setMode('mesas');
            clearCart();
          }}
          className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300
            ${mode === 'mesas'
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/50'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'}`}
        >
          <div className="flex items-center justify-center gap-3">
            <Users className="w-6 h-6" />
            <span>MESAS</span>
          </div>
        </button>

        <button
          onClick={() => {
            setMode('mostrador');
            clearCart();
          }}
          className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300
            ${mode === 'mostrador'
              ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/50'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'}`}
        >
          <div className="flex items-center justify-center gap-3">
            <ShoppingCart className="w-6 h-6" />
            <span>MOSTRADOR</span>
          </div>
        </button>

        <button
          onClick={() => {
            setMode('delivery');
            clearCart();
          }}
          className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300
            ${mode === 'delivery'
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/50'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'}`}
        >
          <div className="flex items-center justify-center gap-3">
            <ChefHat className="w-6 h-6" />
            <span>DELIVERY</span>
          </div>
        </button>
      </div>

      {/* Layout Principal: Zona B + Zona C */}
      <div className="flex flex-1 overflow-hidden">
        {/* ZONA B: Lienzo Dinámico (70%) */}
        <div className="flex-1 overflow-auto bg-zinc-950/50">
          {mode === 'mesas' ? (
            /* Plano de Mesas */
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-zinc-100 mb-2">Plano de Mesas</h2>
                <p className="text-zinc-400">
                  Selecciona una mesa para iniciar un pedido
                </p>
              </div>

              {/* Selector de sección */}
              {sections.length > 0 && (
                <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                  <button
                    onClick={() => setSelectedSection(null)}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all whitespace-nowrap
                      ${!selectedSection
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  >
                    Todas
                  </button>
                  {sections.map((section: any) => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className={`px-6 py-2 rounded-lg font-semibold transition-all whitespace-nowrap
                        ${selectedSection === section.id
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                      {section.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Grid de mesas */}
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
                {filteredTables.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-zinc-500">
                    No hay mesas disponibles
                  </div>
                ) : (
                  filteredTables.map((table: any) => (
                    <button
                      key={table.id}
                      onClick={() => setSelectedTable(table)}
                      disabled={table.status !== 'AVAILABLE'}
                      className={`aspect-square rounded-2xl border-2 transition-all duration-300 
                        hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                        flex flex-col items-center justify-center gap-2
                        ${selectedTable?.id === table.id
                          ? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/50'
                          : table.status === 'AVAILABLE'
                          ? 'bg-emerald-500/10 border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/50'
                          : 'bg-red-500/10 border-red-500'}`}
                    >
                      <span className="text-3xl font-bold text-zinc-100">
                        {table.number}
                      </span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {table.capacity}
                      </span>
                      {table.status !== 'AVAILABLE' && (
                        <span className="text-xs text-red-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Ocupada
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Timeline de Pedidos (Mostrador/Delivery) */
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                  Pedidos {mode === 'mostrador' ? 'Para Llevar' : 'Delivery'}
                </h2>
                <p className="text-zinc-400">
                  {activeOrders.length} pedido(s) activo(s)
                </p>
              </div>

              <div className="space-y-4">
                {activeOrders.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                    No hay pedidos activos
                  </div>
                ) : (
                  activeOrders.map((order: any) => (
                    <div 
                      key={order.id} 
                      className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:bg-zinc-900/70 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-zinc-100 text-lg">
                            Pedido #{order.number}
                          </h3>
                          <p className="text-sm text-zinc-400">{order.customerName || 'Cliente'}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold
                          ${order.status === 'READY' 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-amber-500/20 text-amber-400'}`}
                        >
                          {order.status === 'READY' ? 'Listo' : 'En preparación'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-500">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>15 min</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4" />
                          <span>{order.items?.length || 0} items</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ZONA C: Panel de Comanda (30% - Fijo) */}
        <div className="w-full lg:w-[380px] xl:w-[420px] bg-zinc-900/50 border-l border-zinc-800 flex flex-col">
          {/* Header del panel */}
          <div className="p-6 border-b border-zinc-800 bg-zinc-900/80">
            <h3 className="text-xl font-bold text-zinc-100 mb-4">
              {mode === 'mesas' && selectedTable
                ? `Mesa ${selectedTable.number}`
                : mode === 'mostrador'
                ? 'Pedido Mostrador'
                : 'Pedido Delivery'}
            </h3>

            {/* Campo nombre cliente: solo en mostrador/delivery */}
            {mode !== 'mesas' && (
              <input
                type="text"
                placeholder="Nombre del cliente..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg 
                         text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 
                         focus:ring-blue-500 mb-4 transition-all"
              />
            )}

            {/* Buscador de productos: solo cuando no es mesa disponible */}
            {!(mode === 'mesas' && selectedTable?.status === 'AVAILABLE') && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg 
                           text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 
                           focus:ring-blue-500 transition-all"
                />
              </div>
            )}
          </div>

          {/* CASO 1: Mesa disponible ? Formulario de apertura */}
          {mode === 'mesas' && selectedTable?.status === 'AVAILABLE' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-900/30">
              <div className="w-full max-w-sm space-y-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                    <UserCheck className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-zinc-100 mb-2">Mesa Disponible</h4>
                  <p className="text-sm text-zinc-400">Configure los detalles para abrir la mesa</p>
                </div>

                {/* Selector de personas */}
                <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
                  <label className="block text-sm font-medium text-zinc-300 mb-3">N�mero de personas</label>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setGuestCount(Math.max(0, guestCount - 1))}
                      disabled={guestCount === 0}
                      className="w-12 h-12 rounded-xl bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors border border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-6 h-6 text-zinc-100" />
                    </button>
                    <div className="w-24 h-16 bg-zinc-900 rounded-xl flex items-center justify-center border-2 border-blue-500">
                      {guestCount === 0 ? (
                        <span className="text-lg font-medium text-zinc-500">0</span>
                      ) : (
                        <span className="text-3xl font-bold text-blue-400">{guestCount}</span>
                      )}
                    </div>
                    <button
                      onClick={() => setGuestCount(Math.min(20, guestCount + 1))}
                      className="w-12 h-12 rounded-xl bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors border border-zinc-600"
                    >
                      <Plus className="w-6 h-6 text-zinc-100" />
                    </button>
                  </div>
                </div>

                {/* Selector de garz�n */}
                <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
                  <label className="block text-sm font-medium text-zinc-300 mb-3">Garz�n asignado <span className="text-zinc-500 text-xs">(Opcional)</span></label>
                  <select
                    value={selectedWaiter}
                    onChange={(e) => setSelectedWaiter(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 
                             focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">Seleccionar garz�n...</option>
                    {employees
                      .filter((emp: any) => emp.role?.name === 'WAITER')
                      .map((emp: any) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Bot�n abrir mesa */}
                <button
                  onClick={handleOpenTable}
                  disabled={guestCount === 0 || occupyTableMutation.isPending}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl 
                           hover:from-blue-500 hover:to-blue-400 transition-all flex items-center justify-center gap-3 
                           font-bold text-lg shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserCheck className="w-6 h-6" />
                  {occupyTableMutation.isPending ? 'Abriendo...' : 'Abrir Mesa'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* CASO 2 y 3: Mesa ocupada o Mostrador/Delivery ? Interface de productos */}
              {/* Grid de productos */}
              <div className="flex-1 overflow-auto p-6 bg-zinc-900/30">
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.length === 0 ? (
                    <div className="col-span-2 text-center py-8 text-zinc-500">
                      No hay productos disponibles
                    </div>
                  ) : (
                    filteredProducts.map((product: any) => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="relative bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 
                                 rounded-xl p-4 text-left transition-all duration-300 
                                 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 
                                 hover:border-blue-500 active:scale-95"
                      >
                        {/* Badge de estado de stock */}
                        {product.stockStatus && product.stockStatus !== 'ok' && (
                          <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full pointer-events-none
                            ${product.stockStatus === 'out'      ? 'bg-red-900/80 text-red-200'      :
                              product.stockStatus === 'critical' ? 'bg-orange-900/80 text-orange-200' :
                                                                   'bg-yellow-900/80 text-yellow-200'}`}>
                            {product.stockStatus === 'out'      ? 'Sin stock'  :
                             product.stockStatus === 'critical' ? 'Crítico'    : 'Stock bajo'}
                          </span>
                        )}
                        <div className="font-semibold text-zinc-100 mb-2 text-sm leading-tight">
                          {product.name}
                        </div>
                        <div className="text-blue-400 font-bold text-lg">
                          ${product.price?.toLocaleString() || '0'}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Resumen del pedido con scroll interno y botones sticky */}
              <div className="border-t border-zinc-800 bg-zinc-900/80">
                {cart.length === 0 ? (
                  <div className="text-center text-zinc-500 py-8 px-6 bg-zinc-800/30 mx-6 my-6 rounded-xl">
                    Carrito vac�o
                  </div>
                ) : (
                  <>
                    {/* Lista de items con scroll interno */}
                    <div className="px-6 pt-6 pb-4 max-h-64 overflow-y-auto">
                      <div className="space-y-3">
                        {cart.map(item => (
                          <div key={item.id} className="flex items-center gap-3 bg-zinc-800/50 rounded-lg p-3 border border-zinc-700">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-zinc-100 truncate">
                                {item.name}
                              </div>
                              <div className="text-xs text-zinc-400">
                                ${item.price.toLocaleString()} c/u
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-7 h-7 rounded-lg bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center font-bold text-zinc-100">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-7 h-7 rounded-lg bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total y botones - Siempre visibles (sticky bottom) */}
                    <div className="px-6 pb-6 sticky bottom-0 bg-zinc-900/95 backdrop-blur-sm">
                      <div className="border-t border-zinc-700 pt-4 mb-4">
                        <div className="flex justify-between text-lg font-bold mb-2">
                          <span className="text-zinc-100">TOTAL</span>
                          <span className="text-blue-400 text-2xl">
                            ${total.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500">
                          {cart.reduce((sum, item) => sum + item.quantity, 0)} item(s)
                        </div>
                      </div>

                      {/* Botones de acci�n */}
                      {mode === 'mesas' && selectedTable?.status !== 'AVAILABLE' ? (
                        /* Mesa ocupada: Bot�n enviar cocina + bot�n cerrar mesa */
                        <div className="space-y-2">
                          <button
                            onClick={handleCheckout}
                            disabled={createOrderMutation.isPending}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg 
                                     hover:from-blue-500 hover:to-blue-400 transition-all 
                                     flex items-center justify-center gap-2 font-semibold shadow-lg shadow-blue-500/30
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send className="w-5 h-5" />
                            {createOrderMutation.isPending ? 'Enviando...' : 'Enviar a Cocina'}
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={clearCart}
                              className="py-2 px-4 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg 
                                       hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 font-semibold text-sm"
                            >
                              <X className="w-4 h-4" />
                              Cancelar
                            </button>
                            <button
                              className="py-2 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg 
                                       hover:from-emerald-500 hover:to-emerald-400 transition-all 
                                       flex items-center justify-center gap-2 font-semibold shadow-lg shadow-emerald-500/30 text-sm"
                            >
                              <Check className="w-4 h-4" />
                              Cerrar Mesa
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Mostrador/Delivery: Cancelar + Cobrar */
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={clearCart}
                            className="py-3 px-4 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg 
                                     hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 font-semibold"
                          >
                            <X className="w-5 h-5" />
                            Cancelar
                          </button>
                          <button
                            onClick={handleCheckout}
                            disabled={createOrderMutation.isPending}
                            className="py-3 px-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg 
                                     hover:from-emerald-500 hover:to-emerald-400 transition-all 
                                     flex items-center justify-center gap-2 font-semibold shadow-lg shadow-emerald-500/30
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Check className="w-5 h-5" />
                            {createOrderMutation.isPending ? 'Procesando...' : 'Cobrar'}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}