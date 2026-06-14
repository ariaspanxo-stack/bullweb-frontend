# Frontend - Bullweb POS 3.0

Sistema de Punto de Venta - Interfaz de Usuario Frontend

## 🚀 Configuración Base y Autenticación

Este es el **Frontend Parte 1** del sistema Bullweb POS, que incluye:

### ✅ Características Implementadas

- **Configuración Base**
  - Vite + React 19 + TypeScript 5.9
  - Tailwind CSS con CSS Variables para temas
  - Alias `@` configurado para imports absolutos
  - TypeScript en modo estricto

- **Sistema de Autenticación**
  - Login con validación (React Hook Form + Zod)
  - JWT Token Storage en localStorage
  - Axios con interceptors automáticos
  - Zustand store con persistencia
  - Rutas protegidas (ProtectedRoute)
  - Auto-logout en respuesta 401

- **Componentes UI Base**
  - Button (con variantes y loading state)
  - Input (con label y error display)
  - Card (container reutilizable)
  - Modal (usando Radix UI Dialog)
  - Spinner (loading indicators)
  - Badge (status badges con colores)

- **Servicios y Estado**
  - Axios configurado con baseURL
  - AuthService con métodos completos
  - AuthStore con Zustand + persist
  - Utilidades de formato y validación

## 📦 Dependencias Instaladas

```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "react-router-dom": "^7.13.0",
  "zustand": "^5.0.11",
  "axios": "^1.13.5",
  "react-hook-form": "^7.49.2",
  "@hookform/resolvers": "^3.3.4",
  "zod": "^3.22.4",
  "tailwindcss": "^4.1.18",
  "react-hot-toast": "^2.4.1",
  "@radix-ui/react-dialog": "^1.1.4",
  "lucide-react": "^0.563.0",
  "date-fns": "^3.0.6",
  "clsx": "^2.1.0",
  "tailwind-merge": "^2.2.1"
}
```

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Preview de producción
npm run preview
```

## 🌐 Variables de Entorno

Crear archivo `.env.local` en la raíz del frontend:

```env
VITE_API_URL=http://localhost:4200/api
VITE_SOCKET_URL=http://localhost:4200
```

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx       # Botón con variantes
│   │   │   ├── Input.tsx        # Input con validación
│   │   │   ├── Card.tsx         # Container reutilizable
│   │   │   ├── Modal.tsx        # Dialog modal
│   │   │   ├── Spinner.tsx      # Loading indicators
│   │   │   ├── Badge.tsx        # Status badges
│   │   │   └── index.ts         # Exportaciones centralizadas
│   │   └── ProtectedRoute.tsx   # Guard de autenticación
│   ├── pages/
│   │   └── auth/
│   │       └── Login.tsx        # Página de login
│   ├── services/
│   │   ├── api.ts              # Cliente Axios configurado
│   │   └── authService.ts      # Servicios de autenticación
│   ├── store/
│   │   └── authStore.ts        # Estado global de auth
│   ├── lib/
│   │   └── utils.ts            # Utilidades compartidas
│   ├── types/
│   │   └── index.ts            # Tipos TypeScript
│   ├── App.tsx                 # Router principal
│   ├── main.tsx                # Entry point
│   └── index.css               # Estilos globales
├── .env.local                  # Variables de entorno
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 🔐 Sistema de Autenticación

### Flujo de Login

1. Usuario ingresa credenciales en `/login`
2. Validación con Zod schema
3. Request a `POST /api/auth/login`
4. Guardar token + user en Zustand store
5. Store persiste en localStorage ('auth-storage')
6. Redirect a `/dashboard` o ruta previa
7. ProtectedRoute verifica autenticación
8. Axios interceptor agrega token a todos los requests

### Interceptors de Axios

**Request Interceptor:**
```typescript
// Agrega automáticamente el token JWT a todas las peticiones
Authorization: Bearer {token}
```

**Response Interceptor:**
```typescript
// 401 Unauthorized → Limpia auth + redirect /login
// 403 Forbidden → Log error permisos
// 404/500 → Log errors
```

### Store de Autenticación

```typescript
const authStore = useAuthStore();

// State
authStore.user          // Usuario actual
authStore.token         // JWT token
authStore.isAuthenticated
authStore.isLoading

// Actions
authStore.login(token, user)
authStore.logout()
authStore.loadUser()
authStore.updateUser(user)
```

## 🎨 Componentes UI

### Button

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" isLoading={false}>
  Guardar
</Button>

// Variantes: primary, secondary, outline, ghost, danger, success
// Sizes: sm, md, lg
```

### Input

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  type="email"
  error={errors.email?.message}
  helperText="Ingresa tu correo electrónico"
  required
/>
```

### Card

```tsx
import { Card } from '@/components/ui';

<Card
  title="Título"
  description="Descripción"
  actions={<Button>Acción</Button>}
>
  Contenido del card
</Card>
```

### Modal

```tsx
import { Modal } from '@/components/ui';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Título del Modal"
  size="md"
>
  Contenido del modal
</Modal>
```

### Spinner

```tsx
import { Spinner, FullPageSpinner } from '@/components/ui';

<Spinner size="md" label="Cargando..." />
<FullPageSpinner label="Cargando aplicación..." />
```

### Badge

```tsx
import { Badge } from '@/components/ui';

<Badge variant="success" dot>
  Activo
</Badge>

// Variantes: default, success, warning, danger, info, purple
```

## 📝 Utilidades

### Formateo

```typescript
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime,
  formatRelativeTime 
} from '@/lib/utils';

formatCurrency(150.50)              // "S/ 150.50"
formatDate(new Date())              // "25/01/2025"
formatDateTime(new Date())          // "25/01/2025 14:30"
formatRelativeTime(new Date())      // "Ahora" / "Hace 5m"
```

### Validaciones

```typescript
import { isValidEmail, isValidRUC, isValidDNI } from '@/lib/utils';

isValidEmail('test@example.com')    // true
isValidRUC('20123456789')           // true/false
isValidDNI('12345678')              // true/false
```

### Utilidades de Estado

```typescript
import { getOrderStatusColor, getOrderStatusText } from '@/lib/utils';

getOrderStatusColor('PENDING')      // "bg-yellow-100 text-yellow-800"
getOrderStatusText('PREPARING')     // "Preparando"
```

## 🔄 Rutas

```
/                  → Redirect a /dashboard
/login             → Página de login (pública)
/dashboard         → Dashboard principal (protegida)
*                  → 404 Not Found
```

## 🚧 Próximas Partes

- **Parte 2:** Dashboard, Estadísticas, Sidebar, Navbar
- **Parte 3:** Módulo POS (Punto de Venta)
- **Parte 4:** Módulo de Mesas y Comandas
- **Parte 5:** Módulo de Cocina
- **Parte 6:** Módulo de Productos e Inventario
- **Parte 7:** Módulo de Reportes
- **Parte 8:** Módulo de Clientes y Empleados

## 🐛 Debugging

### Ver estado de autenticación

```typescript
// En DevTools Console
localStorage.getItem('auth-storage')
```

### Limpiar autenticación

```typescript
localStorage.removeItem('auth-storage')
// O usando el store
const { logout } = useAuthStore.getState();
logout();
```

## 🔗 Backend

Asegúrate de que el backend esté corriendo en `http://localhost:4200`

Ver documentación del backend en `/backend/README.md`

## 📚 Tecnologías

- **React 19** - Library principal
- **TypeScript 5.9** - Tipado estático
- **Vite 7** - Build tool y dev server
- **Tailwind CSS 4** - Utility-first CSS
- **Zustand** - State management
- **React Router v7** - Routing
- **React Hook Form** - Manejo de formularios
- **Zod** - Validación de schemas
- **Axios** - HTTP client
- **Radix UI** - Componentes accesibles
- **Lucide React** - Sistema de iconos
- **date-fns** - Manejo de fechas

## ✅ Checklist de Verificación

- [x] Configuración base (Vite, TypeScript, Tailwind)
- [x] Variables de entorno (.env.local)
- [x] Tipos TypeScript completos
- [x] Cliente Axios con interceptors
- [x] Servicios de autenticación
- [x] Store Zustand con persistencia
- [x] Utilidades de formato y validación
- [x] Componentes UI base (6 componentes)
- [x] Sistema de rutas protegidas
- [x] Página de login funcional
- [x] App.tsx con Router
- [x] Notificaciones con React Hot Toast
- [x] TypeScript compila sin errores
- [x] No hay errores de linting

## 🎯 Estado Actual

**PARTE 1: ✅ COMPLETA**

21 archivos generados:
- 4 archivos de configuración
- 1 archivo de estilos
- 1 archivo de tipos
- 2 servicios
- 1 store
- 1 archivo de utilidades
- 7 componentes UI
- 1 componente ProtectedRoute
- 1 página Login
- 1 App.tsx
- 1 index barrel

¡Frontend listo para desarrollo de las siguientes partes!
