# Frontend Parte 2 - Layout y Dashboard

Sistema de Punto de Venta - Layout Principal y Dashboard con Estadísticas en Tiempo Real

## 🎯 Objetivo de esta Parte

Implementar el layout principal del sistema (Sidebar + Header + Layout) y el Dashboard con estadísticas en tiempo real conectadas al backend.

## ✅ Características Implementadas

### 1. **Layout Principal**

#### **Sidebar** (`src/components/layout/Sidebar.tsx`)
- Navegación lateral responsive (colapsable en mobile)
- Logo "Bullweb 3.0" con branding
- Menú organizado por secciones:
  - **Principal:** Dashboard
  - **Ventas:** POS, Órdenes
  - **Operaciones:** Mesas, Cocina
  - **Gestión:** Menú, Inventario, Clientes, Empleados
  - **Reportes:** Ventas, Analytics
  - **Sistema:** Configuración
- Iconos de Lucide React
- Estado activo resaltado (highlight)
- Hover effects y transiciones suaves
- Overlay oscuro en mobile
- Indicador de "Sistema en línea"

**Diseño:**
- Width: 288px (18rem) en desktop
- Background: Dark theme (bg-gray-900)
- Active state: bg-blue-600
- Animaciones: transform + transitions

#### **Header** (`src/components/layout/Header.tsx`)
- Barra superior sticky
- Botón hamburguesa para toggle sidebar (mobile)
- Breadcrumbs de navegación (ruta actual)
- Notificaciones con badge contador
- Dropdown de usuario con:
  - Avatar con iniciales
  - Nombre y rol del usuario
  - Mi Perfil
  - Configuración
  - Cerrar Sesión (con confirmación)

**Diseño:**
- Height: 64px (h-16)
- Background: bg-white con border-bottom
- Shadow: shadow-sm
- Sticky top-0

#### **Layout** (`src/components/layout/Layout.tsx`)
- Componente contenedor principal
- Integra Sidebar + Header + Outlet
- Estado global de sidebar (abierto/cerrado)
- Responsive: overlay en mobile, fixed en desktop
- Scroll independiente en main content

### 2. **Componentes UI Adicionales**

#### **StatCard** (`src/components/ui/StatCard.tsx`)
- Card de estadística con icono
- Muestra título, valor y tendencia
- Colores personalizables: blue, green, orange, purple, red
- Trend indicator (positivo/negativo con %)
- Loading skeleton

**Props:**
```typescript
{
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  loading?: boolean;
}
```

#### **DataTable** (`src/components/ui/DataTable.tsx`)
- Tabla reutilizable con tipado genérico
- Soporte para columnas custom (render functions)
- Paginación integrada
- Loading state
- Empty state automático
- Hover effects en filas
- Responsive scroll

**Props:**
```typescript
{
  columns: Column<T>[];
  data: T[];
  pagination?: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  loading?: boolean;
  emptyMessage?: string;
}
```

#### **EmptyState** (`src/components/ui/EmptyState.tsx`)
- Estado vacío genérico
- Icono personalizable
- Título y descripción
- Acción opcional (botón)
- Variantes predefinidas:
  - NoDataState
  - NoResultsState
  - ErrorState

### 3. **Servicios de Reportes**

#### **reportsService.ts** (`src/services/reportsService.ts`)

**Métodos:**
- `getDashboard(filters?)`: Estadísticas del dashboard
- `getSales(filters?)`: Reporte de ventas
- `getTopProducts(filters?)`: Productos más vendidos
- `exportToExcel(type, filters?)`: Exportar a Excel

**Tipos:**
```typescript
interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  averageTicket: number;
  topProducts: Array<{...}>;
  salesByHour: Array<{...}>;
  salesByWaiter: Array<{...}>;
  recentOrders: Array<{...}>;
}
```

**Endpoints consumidos:**
- `GET /api/reports/dashboard`
- `GET /api/reports/sales`
- `GET /api/reports/products`
- `GET /api/reports/{type}/export`

### 4. **Dashboard** (`src/pages/Dashboard.tsx`)

**Características:**
- Conectado a backend vía React Query
- Auto-refresh cada 30 segundos
- Loading skeleton mientras carga
- Error handling con toast
- 4 tarjetas de estadísticas principales
- 2 gráficos (Recharts):
  - Ventas por hora (LineChart)
  - Productos más vendidos (BarChart horizontal)
- 2 tablas de datos:
  - Órdenes recientes
  - Rendimiento de meseros

**Estadísticas mostradas:**
1. **Ventas del Día**
   - Valor total
   - Trend vs. ayer (+12.5%)
   - Color: green

2. **Órdenes**
   - Número total de órdenes
   - Color: blue

3. **Ticket Promedio**
   - Valor promedio por orden
   - Color: purple

4. **Mesas Activas**
   - Mesas ocupadas / total
   - Color: orange

**Gráficos:**
- **Ventas por Hora:** LineChart con eje X (horas) y eje Y (ventas en S/)
- **Productos Top:** BarChart horizontal con top 5 productos

**Tablas:**
- **Órdenes Recientes:** Muestra últimas órdenes con estado
- **Meseros:** Ranking por ventas y número de órdenes

### 5. **Routing Actualizado**

**App.tsx actualizado:**
- QueryClientProvider configurado
- Layout como contenedor de rutas protegidas
- Outlet para renderizar páginas hijas
- Rutas implementadas:
  - `/dashboard` → Dashboard completo
  - `/pos`, `/orders`, `/tables`, etc. → Placeholders
- Redirect `/` → `/dashboard`
- 404 NotFound

**Estructura de rutas:**
```
/login (pública)
/ → /dashboard (protegida, con Layout)
  /dashboard
  /pos
  /orders
  /tables
  /kitchen
  /menu
  /inventory
  /customers
  /employees
  /reports/sales
  /reports/analytics
  /settings
  /profile
* → 404
```

## 📁 Archivos Generados (Parte 2)

1. ✅ `src/components/layout/Sidebar.tsx` (~280 líneas)
2. ✅ `src/components/layout/Header.tsx` (~180 líneas)
3. ✅ `src/components/layout/Layout.tsx` (~30 líneas)
4. ✅ `src/components/ui/StatCard.tsx` (~120 líneas)
5. ✅ `src/components/ui/DataTable.tsx` (~200 líneas)
6. ✅ `src/components/ui/EmptyState.tsx` (~100 líneas)
7. ✅ `src/services/reportsService.ts` (~150 líneas)
8. ✅ `src/pages/Dashboard.tsx` (~300 líneas)
9. ✅ `src/App.tsx` (actualizado, ~150 líneas)
10. ✅ `FRONTEND_PARTE_2.md` (esta documentación)

**TOTAL: 10 archivos completos**

## 🎨 Diseño y UX

### **Paleta de Colores**

**Sidebar:**
- Background: `gray-900`
- Text: `gray-100`
- Active: `blue-600`
- Hover: `gray-800`

**Stats Cards:**
- Blue: Órdenes
- Green: Ventas
- Purple: Ticket promedio
- Orange: Mesas

**Status Badges:**
- Warning (amarillo): Pendiente
- Info (azul): Preparando
- Success (verde): Listo/Entregado
- Danger (rojo): Cancelado

### **Responsive Design**

**Mobile (< 1024px):**
- Sidebar: overlay con backdrop blur
- Header: botón hamburguesa visible
- Stats: 1 columna
- Gráficos: 1 columna
- Tablas: scroll horizontal

**Desktop (≥ 1024px):**
- Sidebar: fixed, siempre visible
- Header: breadcrumbs completos
- Stats: 4 columnas
- Gráficos: 2 columnas
- Tablas: 2 columnas

### **Animaciones**

- Sidebar: `transform translate` con transition
- Cards: `hover:shadow-md`
- Buttons: `transition-colors`
- Dropdowns: `animate-in fade-in zoom-in`

## 🔧 Configuración de React Query

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000
    }
  }
});
```

**Dashboard query:**
```typescript
useQuery({
  queryKey: ['dashboard'],
  queryFn: () => reportsService.getDashboard(),
  refetchInterval: 30000, // Auto-refresh cada 30s
  retry: 2
});
```

## 📊 Gráficos con Recharts

### **LineChart (Ventas por Hora)**
```typescript
<LineChart data={stats.salesByHour}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="hour" tickFormatter={(v) => `${v}:00`} />
  <YAxis tickFormatter={(v) => `S/ ${v}`} />
  <Tooltip />
  <Line 
    type="monotone" 
    dataKey="sales" 
    stroke="#3b82f6" 
    strokeWidth={2} 
  />
</LineChart>
```

### **BarChart (Productos Top)**
```typescript
<BarChart data={topProducts.slice(0, 5)} layout="vertical">
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis type="number" />
  <YAxis dataKey="product.name" type="category" width={140} />
  <Tooltip />
  <Bar dataKey="quantity" fill="#10b981" radius={[0, 4, 4, 0]} />
</BarChart>
```

## 🚀 Uso de los Componentes

### **StatCard**
```tsx
import StatCard from '@/components/ui/StatCard';
import { DollarSign } from 'lucide-react';

<StatCard
  title="Ventas del Día"
  value={formatCurrency(1234.50)}
  icon={DollarSign}
  trend={{ value: 12.5, isPositive: true }}
  color="green"
/>
```

### **DataTable**
```tsx
import DataTable from '@/components/ui/DataTable';

<DataTable
  columns={[
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nombre' },
    { 
      key: 'total', 
      label: 'Total',
      render: (item) => formatCurrency(item.total)
    }
  ]}
  data={orders}
  pagination={{
    page: 1,
    totalPages: 5,
    onPageChange: setPage
  }}
/>
```

### **EmptyState**
```tsx
import EmptyState from '@/components/ui/EmptyState';
import { Package } from 'lucide-react';

<EmptyState
  icon={Package}
  title="No hay órdenes"
  description="Las órdenes aparecerán aquí"
  action={{
    label: 'Crear Orden',
    onClick: () => navigate('/pos')
  }}
/>
```

### **Layout**
```tsx
// App.tsx
<Route path="/" element={
  <ProtectedRoute>
    <Layout />
  </ProtectedRoute>
}>
  <Route path="dashboard" element={<Dashboard />} />
  <Route path="pos" element={<POS />} />
  {/* más rutas... */}
</Route>
```

## 🔗 Integración con Backend

### **Endpoints consumidos:**

1. **Dashboard Stats**
   ```
   GET /api/reports/dashboard
   Query params: dateFrom?, dateTo?
   ```

2. **Sales Report**
   ```
   GET /api/reports/sales
   Query params: dateFrom?, dateTo?, waiterId?, paymentMethod?
   ```

3. **Products Report**
   ```
   GET /api/reports/products
   Query params: dateFrom?, dateTo?
   ```

### **Formato de respuesta esperado:**

```typescript
{
  success: true,
  data: {
    totalSales: 1234.50,
    totalOrders: 25,
    averageTicket: 49.38,
    topProducts: [...],
    salesByHour: [...],
    salesByWaiter: [...],
    recentOrders: [...]
  }
}
```

## 🐛 Manejo de Errores

### **Dashboard:**
1. Si `isLoading`: Muestra DashboardSkeleton
2. Si `error` o `!stats`: Muestra EmptyState con botón "Recargar"
3. Si datos vacíos: Cada gráfico/tabla muestra su propio EmptyState

### **React Query Error Handling:**
```typescript
onError: (error: any) => {
  console.error('Error al cargar dashboard:', error);
  toast.error('Error al cargar las estadísticas');
}
```

## 📱 Screenshots de Funcionalidad

**Dashboard completo:**
- 4 StatCards en grid responsivo
- 2 gráficos con datos en tiempo real
- 2 tablas con órdenes y meseros
- Auto-refresh cada 30 segundos

**Sidebar:**
- Navegación por secciones
- Indicador de ruta activa
- Colapsable en mobile con overlay

**Header:**
- Breadcrumbs dinámicos
- Notificaciones (badge)
- Dropdown de usuario con logout

## ✅ Checklist de Verificación

- [x] Sidebar responsive con navegación completa
- [x] Header con breadcrumbs y usuario dropdown
- [x] Layout que integra sidebar + header + content
- [x] StatCard con variantes de colores
- [x] DataTable genérico con paginación
- [x] EmptyState para estados vacíos
- [x] reportsService con todos los métodos
- [x] Dashboard con 4 stats + 2 gráficos + 2 tablas
- [x] React Query configurado y funcionando
- [x] Auto-refresh cada 30 segundos
- [x] Loading skeletons implementados
- [x] Error handling con toasts
- [x] Responsive design mobile-first
- [x] Recharts configurados con tema
- [x] Routing actualizado con Layout
- [x] TypeScript sin errores
- [x] Tailwind CSS aplicado correctamente

## 🚧 Próximas Partes

- **Parte 3:** Módulo POS (Punto de Venta completo)
- **Parte 4:** Módulo de Mesas y Gestión de Salones
- **Parte 5:** Módulo de Cocina (Kitchen Display System)
- **Parte 6:** Módulo de Productos e Inventario
- **Parte 7:** Módulo de Reportes Avanzados
- **Parte 8:** Módulo de Clientes y Empleados

## 🔑 Dependencias Clave

**Ya instaladas en Parte 1:**
```json
{
  "react-router-dom": "^7.13.0",
  "zustand": "^5.0.11",
  "axios": "^1.13.5",
  "@tanstack/react-query": "^5.14.2",
  "recharts": "^2.10.3",
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "lucide-react": "^0.563.0",
  "react-hot-toast": "^2.4.1"
}
```

## 📚 Recursos Útiles

- **React Router:** Nested routes con Outlet
- **React Query:** Data fetching y cache management
- **Recharts:** Biblioteca de gráficos para React
- **Radix UI:** Dropdown Menu primitives
- **Lucide React:** iconos SVG
- **Tailwind CSS:** Utility-first CSS

## 🎯 Estado Actual

**PARTE 2: ✅ COMPLETA**

10 archivos generados:
- 3 componentes de layout (Sidebar, Header, Layout)
- 3 componentes UI (StatCard, DataTable, EmptyState)
- 1 servicio (reportsService)
- 1 página completa (Dashboard)
- 1 App.tsx actualizado con routing
- 1 documentación completa

**Layout profesional + Dashboard funcional con estadísticas en tiempo real del backend.**

---

**Siguiente paso:** Implementar el módulo POS (Punto de Venta) en la Parte 3.
