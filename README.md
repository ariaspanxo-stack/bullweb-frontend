# 🍔 Bullweb 3.0 - Frontend

Sistema POS para restaurantes con gestión de mesas, mostrador y delivery.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build producción
npm run build

# Deploy a VPS
npm run deploy:prod
```

## 🔧 Configuración

### Variables de Entorno

**Desarrollo (.env.development):**
```env
VITE_API_URL=http://localhost:4200/api
VITE_WS_URL=ws://localhost:4200
VITE_ENV=development
```

**Producción (.env.production):**
```env
VITE_API_URL=https://app.bullwebchile.com/api
VITE_WS_URL=wss://app.bullwebchile.com
VITE_ENV=production
```

## 📦 Estructura

```
frontend/
├── src/
│   ├── components/     # Componentes reutilizables
│   ├── pages/          # Páginas principales
│   │   ├── Dashboard/  # Dashboard analytics
│   │   ├── Customers/  # Gestión clientes
│   │   └── Restaurant/ # POS (Mesas/Mostrador/Delivery)
│   ├── services/       # Servicios API
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── customersService.ts
│   │   ├── productsService.ts
│   │   ├── ordersService.ts
│   │   ├── tablesService.ts
│   │   └── dashboardService.ts
│   └── utils/          # Utilidades
├── .env.development
├── .env.production
├── deploy.ps1          # Script de deploy
└── vite.config.ts
```

## 🔌 API Integration

El frontend se conecta con backend Node.js + Express + PostgreSQL:

- **Auth:** JWT tokens en localStorage
- **Interceptores:** Renovación automática de tokens
- **Error Handling:** Manejo global de errores 401/500
- **Loading States:** Estados de carga en todos los componentes

## 🚀 Deploy

### Deploy Manual
```bash
npm run build
npm run deploy:prod
```

### Deploy Rápido (sin rebuild)
```bash
npm run deploy:quick
```

### Deploy Desarrollo
```bash
npm run deploy:dev
```

## 👤 Credenciales

**Admin:**
- Email: `admin@bullwebchile.com`
- Password: `Admin123!`

## 📊 Módulos

- ✅ **Dashboard:** Analytics en tiempo real
- ✅ **Customers:** CRM + historial
- ✅ **Restaurant:**
  - Mesas (abrir/cerrar/transferir/juntar)
  - Mostrador (pedidos take away)
  - Delivery (asignación repartidores)
- ✅ **Payments:** Múltiples métodos + división cuenta
- ✅ **Auth:** Login con JWT

## 🛠️ Tech Stack

- React 18
- TypeScript 5
- Vite 7
- Tailwind CSS
- Axios
- Chart.js
- React Router DOM
- Zustand (state management)
- React Query (TanStack)

## 📝 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo (puerto 5173)
- `npm run build` - Build optimizado para producción
- `npm run preview` - Preview del build local
- `npm run lint` - Linter ESLint
- `npm run deploy:dev` - Deploy a VPS (modo desarrollo)
- `npm run deploy:prod` - Deploy a VPS (modo producción)
- `npm run deploy:quick` - Deploy rápido sin rebuild

## 🔐 Autenticación

El sistema usa JWT (JSON Web Tokens) almacenados en localStorage:

- **Token:** `bullweb_token`
- **Usuario:** `bullweb_user`

Los interceptores de Axios inyectan automáticamente el token en cada request y manejan la renovación/logout en caso de token expirado (401).

## 🌐 URLs

- **Desarrollo:** http://localhost:5173
- **Producción:** https://app.bullwebchile.com

## 🐛 Debug

Si encuentras problemas:

1. **Cache del navegador:** Ctrl+Shift+R (hard refresh)
2. **Modo incógnito:** Siempre muestra versión fresca
3. **Limpiar localStorage:** `localStorage.clear()` en consola
4. **Verificar backend:** Asegúrate de que el backend esté corriendo en puerto 4200

## 📄 Logs

Los logs del frontend están disponibles en:
- **Consola del navegador** (F12 → Console)
- **Network tab** para requests HTTP (F12 → Network)

---

**Desarrollado con ❤️ para Bullweb Chile**
