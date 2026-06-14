export interface PermNode    { key: string; label: string; }
export interface PermSection { label: string; permissions: PermNode[]; }
export interface PermModule  {
  module: string;
  icon:   string;
  color:  string;
  sections: PermSection[];
}

export const PERMISSION_TREE: PermModule[] = [
  {
    module: '🏪 POS — General',
    icon: 'ShoppingCart',
    color: '#f97316',
    sections: [
      {
        label: 'Acceso General',
        permissions: [
          { key: 'pos.access',          label: 'Acceder al POS y ver órdenes' },
          { key: 'pos.view_all_orders', label: 'Ver órdenes de todos los usuarios' },
        ],
      },
      {
        label: 'Gestión de Órdenes',
        permissions: [
          { key: 'pos.create_order',     label: 'Crear órdenes nuevas' },
          { key: 'pos.edit_order',       label: 'Editar ítems de una orden' },
          { key: 'pos.cobrar',           label: 'Emitir boletas DTE desde orden' },
          { key: 'pos.cancel_order_own', label: 'Cancelar órdenes propias (activas)' },
          { key: 'pos.cancel_order_any', label: 'Cancelar cualquier orden / anular ventas PAID' },
          { key: 'pos.apply_discount',   label: 'Aplicar descuentos (todos los módulos)' },
          { key: 'pos.cancel_order',     label: 'Cancelar / anular órdenes (todas)' },
        ],
      },
      {
        label: 'Documentos',
        permissions: [
          { key: 'pos.view', label: 'Ver documentos y boletas DTE del POS' },
        ],
      },
    ],
  },
  {
    module: '🪑 Mesas',
    icon: 'LayoutGrid',
    color: '#6366f1',
    sections: [
      {
        label: 'Acceso',
        permissions: [
          { key: 'pos.mesas', label: 'Acceder al submenú Mesas' },
        ],
      },
      {
        label: 'Visualización',
        permissions: [
          { key: 'tables.view',  label: 'Ver mesas y secciones del salón' },
          { key: 'tables.order', label: 'Crear y editar órdenes de mesa' },
        ],
      },
      {
        label: 'Administración',
        permissions: [
          { key: 'tables.manage', label: 'Crear / editar / eliminar mesas' },
          { key: 'tables.assign', label: 'Asignar mesero a una mesa' },
        ],
      },
      {
        label: 'Operaciones',
        permissions: [
          { key: 'pos.discount_table',   label: 'Aplicar descuento en mesas' },
          { key: 'pos.transfer_order',   label: 'Transferir órdenes entre mesas' },
          { key: 'pos.cobrar',           label: 'Cobrar / emitir boleta' },
          { key: 'pos.cancel_order_own', label: 'Cancelar órdenes propias' },
          { key: 'pos.cancel_order_any', label: 'Cancelar cualquier orden / anular' },
        ],
      },
    ],
  },
  {
    module: '🖥️ Mostrador',
    icon: 'Monitor',
    color: '#0ea5e9',
    sections: [
      {
        label: 'Acceso',
        permissions: [
          { key: 'pos.mostrador', label: 'Acceder al submenú Mostrador' },
        ],
      },
      {
        label: 'Gestión de Órdenes',
        permissions: [
          { key: 'pos.create_order',     label: 'Crear órdenes nuevas' },
          { key: 'pos.edit_order',       label: 'Editar ítems de una orden' },
          { key: 'pos.cobrar',           label: 'Cobrar / emitir boleta' },
          { key: 'pos.cancel_order_own', label: 'Cancelar órdenes propias' },
          { key: 'pos.cancel_order_any', label: 'Cancelar cualquier orden / anular' },
        ],
      },
      {
        label: 'Operaciones',
        permissions: [
          { key: 'pos.discount_counter', label: 'Aplicar descuento en mostrador' },
        ],
      },
    ],
  },
  {
    module: '🍽️ Menú',
    icon: 'UtensilsCrossed',
    color: '#eab308',
    sections: [
      {
        label: 'Visualización',
        permissions: [
          { key: 'menu.view', label: 'Ver productos y categorías' },
        ],
      },
      {
        label: 'Administración',
        permissions: [
          { key: 'menu.manage', label: 'Crear / editar / eliminar productos' },
          { key: 'products.manage', label: 'Gestionar productos completo (maestro)' },
          { key: 'products.view', label: 'Ver catálogo de productos' },
        ],
      },
    ],
  },
  {
    module: '👨‍🍳 Cocina',
    icon: 'ChefHat',
    color: '#ef4444',
    sections: [
      {
        label: 'Visualización',
        permissions: [
          { key: 'kitchen.view', label: 'Ver órdenes en pantalla de cocina' },
        ],
      },
      {
        label: 'Operación',
        permissions: [
          { key: 'kitchen.update', label: 'Marcar ítems como preparando / listos' },
          { key: 'kitchen.manage', label: 'Gestionar estaciones de cocina' },
          { key: 'kds.view', label: 'Ver pantalla KDS' },
          { key: 'kds.manage', label: 'Administrar pantallas KDS' },
        ],
      },
    ],
  },
  {
    module: '📦 Inventario',
    icon: 'Package',
    color: '#14b8a6',
    sections: [
      {
        label: 'Visualización',
        permissions: [
          { key: 'inventory.view', label: 'Ver ingredientes y stock actual' },
        ],
      },
      {
        label: 'Administración',
        permissions: [
          { key: 'inventory.purchases',   label: 'Registrar compras de stock' },
          { key: 'inventory.adjustments', label: 'Ajuste manual de stock' },
          { key: 'inventory.recipes',     label: 'Crear y editar recetas' },
          { key: 'inventory.manage',      label: 'Gestionar inventario completo (maestro)' },
        ],
      },
    ],
  },
  {
    module: '📊 Reportes',
    icon: 'BarChart2',
    color: '#8b5cf6',
    sections: [
      {
        label: 'Acceso',
        permissions: [
          { key: 'reports.view',      label: 'Ver dashboard y reportes' },
          { key: 'reports.export',    label: 'Exportar reportes a Excel / PDF' },
          { key: 'reports.analytics', label: 'Ver análisis avanzado' },
          { key: 'sales.view', label: 'Ver registro de ventas' },
          { key: 'sales.export', label: 'Exportar ventas' },
        ],
      },
    ],
  },
  {
    module: '👥 Clientes',
    icon: 'Users',
    color: '#22c55e',
    sections: [
      {
        label: 'Visualización',
        permissions: [
          { key: 'customers.view', label: 'Ver lista y perfil de clientes' },
        ],
      },
      {
        label: 'Administración',
        permissions: [
          { key: 'customers.create',  label: 'Crear nuevos clientes' },
          { key: 'customers.edit',    label: 'Editar datos de clientes' },
          { key: 'customers.loyalty', label: 'Modificar puntos y fidelización' },
          { key: 'customers.delete',  label: 'Eliminar clientes' },
          { key: 'customers.manage',  label: 'Gestionar clientes completo (maestro)' },
        ],
      },
    ],
  },
  {
    module: '👤 Empleados',
    icon: 'UserCog',
    color: '#06b6d4',
    sections: [
      {
        label: 'Visualización',
        permissions: [
          { key: 'employees.view', label: 'Ver lista de empleados y roles' },
        ],
      },
      {
        label: 'Administración',
        permissions: [
          { key: 'employees.manage', label: 'Crear / editar / eliminar empleados' },
        ],
      },
    ],
  },
  {
    module: '⚙️ Configuración',
    icon: 'Settings',
    color: '#94a3b8',
    sections: [
      {
        label: 'Acceso',
        permissions: [
          { key: 'settings.view',   label: 'Ver configuración general' },
          { key: 'settings.manage', label: 'Editar configuración del sistema' },
          { key: 'settings.roles',  label: 'Gestionar roles y matriz de permisos' },
        ],
      },
    ],
  },
  // ── Módulos nuevos ─────────────────────────────────────────────────────────
  {
    module: '💰 Caja y Arqueos',
    icon: 'DollarSign',
    color: '#f59e0b',
    sections: [
      {
        label: 'Operación',
        permissions: [
          { key: 'cash.view',  label: 'Ver arqueos de caja' },
          { key: 'cash.open',  label: 'Abrir turno de caja' },
          { key: 'cash.close', label: 'Cerrar turno de caja' },
        ],
      },
      {
        label: 'Administración',
        permissions: [
          { key: 'cash.export',  label: 'Exportar arqueos' },
          { key: 'cash.manage',  label: 'Administrar cajas' },
        ],
      },
    ],
  },
  {
    module: '💸 Movimientos de Caja',
    icon: 'ArrowLeftRight',
    color: '#f97316',
    sections: [
      {
        label: 'Operación',
        permissions: [
          { key: 'cash_movements.view',    label: 'Ver movimientos' },
          { key: 'cash_movements.income',  label: 'Registrar ingreso de caja (CASH_IN)' },
          { key: 'cash_movements.expense', label: 'Registrar egreso / retiro de caja (CASH_OUT)' },
          { key: 'cash_movements.delete',  label: 'Eliminar movimiento' },
        ],
      },
    ],
  },
  {
    module: '🧾 Boletas DTE',
    icon: 'FileText',
    color: '#06b6d4',
    sections: [
      {
        label: 'Acceso',
        permissions: [
          { key: 'billing.view',          label: 'Ver documentos emitidos' },
          { key: 'billing.issue_boleta',  label: 'Emitir boletas electrónicas' },
          { key: 'billing.issue_factura', label: 'Emitir facturas electrónicas' },
          { key: 'billing.export',        label: 'Exportar boletas' },
          { key: 'billing.config',        label: 'Configurar facturación DTE' },
          { key: 'billing.void',          label: 'Anular documentos emitidos' },
        ],
      },
    ],
  },
  {
    module: '⭐ Propinas',
    icon: 'Star',
    color: '#eab308',
    sections: [
      {
        label: 'Acceso',
        permissions: [
          { key: 'tips.view',       label: 'Ver propinas' },
          { key: 'tips.approve',    label: 'Aprobar propinas' },
          { key: 'tips.distribute', label: 'Distribuir propinas al personal' },
          { key: 'tips.export',     label: 'Exportar propinas' },
        ],
      },
    ],
  },
  {
    module: '🛵 Delivery',
    icon: 'Truck',
    color: '#8b5cf6',
    sections: [
      {
        label: 'Acceso',
        permissions: [
          { key: 'pos.delivery', label: 'Acceder al submenú Delivery' },
        ],
      },
      {
        label: 'Gestión de Órdenes',
        permissions: [
          { key: 'pos.create_order',     label: 'Crear órdenes nuevas' },
          { key: 'pos.edit_order',       label: 'Editar ítems de una orden' },
          { key: 'pos.cobrar',           label: 'Cobrar / emitir boleta' },
          { key: 'pos.cancel_order_own', label: 'Cancelar órdenes propias' },
          { key: 'pos.cancel_order_any', label: 'Cancelar cualquier orden / anular' },
        ],
      },
      {
        label: 'Operaciones',
        permissions: [
          { key: 'pos.discount_delivery', label: 'Aplicar descuento en delivery' },
        ],
      },
      {
        label: 'Gestión de Pedidos',
        permissions: [
          { key: 'delivery.view',   label: 'Ver pedidos delivery' },
          { key: 'delivery.manage', label: 'Gestionar pedidos' },
          { key: 'delivery.assign', label: 'Asignar repartidor' },
        ],
      },
    ],
  },
  {
    module: '🏷️ Cupones',
    icon: 'Tag',
    color: '#f97316',
    sections: [
      {
        label: 'Acceso',
        permissions: [
          { key: 'coupons.view',   label: 'Ver y validar cupones' },
          { key: 'coupons.manage', label: 'Crear y editar cupones' },
        ],
      },
    ],
  },
  {
    module: '� Apps Externas',
    icon: 'Smartphone',
    color: '#f97316',
    sections: [
      {
        label: 'Acceso',
        permissions: [
          { key: 'apps.view', label: 'Ver integración Delivery y configurar App Mesero' },
        ],
      },
    ],
  },
  {
    module: '�🖨️ Impresoras',
    icon: 'Printer',
    color: '#64748b',
    sections: [
      {
        label: 'Acceso',
        permissions: [
          { key: 'printers.view',   label: 'Ver impresoras configuradas' },
          { key: 'printers.manage', label: 'Configurar y sincronizar impresoras' },
        ],
      },
    ],
  },
  {
    module: '🔐 Administración',
    icon: 'ShieldCheck',
    color: '#334155',
    sections: [
      {
        label: 'Acceso',
        permissions: [
          { key: 'admin.access', label: 'Acceso básico al panel de admin' },
          { key: 'admin.manage', label: 'Gestión completa del sistema' },
        ],
      },
    ],
  },
  {
    module: '📣 Marketing / Campañas / Carta QR',
    icon: 'Megaphone',
    color: '#ef4444',
    sections: [
      {
        label: 'Acceso',
        permissions: [
          { key: 'marketing.view',   label: 'Ver campañas, carta QR y fidelización' },
          { key: 'marketing.manage', label: 'Crear y editar campañas y carta QR' },
          { key: 'campaigns.view', label: 'Ver campañas activas' },
          { key: 'campaigns.manage', label: 'Gestionar campañas' },
        ],
      },
    ],
  },
  {
    module: '📱 App Mesero', icon: 'MonitorSmartphone', color: '#f97316',
    sections: [
      {
        label: 'Órdenes',
        permissions: [
          { key: 'waiter_app.view_orders',    label: 'Ver mis órdenes activas' },
          { key: 'waiter_app.edit_order',     label: 'Editar orden en curso' },
          { key: 'waiter_app.transfer_table', label: 'Transferir mesa' },
        ],
      },
      {
        label: 'Productos',
        permissions: [
          { key: 'waiter_app.modifiers',    label: 'Agregar modificadores y combos' },
          { key: 'waiter_app.variants',     label: 'Seleccionar variantes' },
          { key: 'waiter_app.custom_price', label: 'Modificar precio de ítem' },
        ],
      },
      {
        label: 'Cobro',
        permissions: [
          { key: 'waiter_app.charge',         label: 'Cobrar mesa desde la app' },
          { key: 'waiter_app.discount_table',    label: 'Descuento en mesa' },
          { key: 'waiter_app.discount_counter',  label: 'Descuento en mostrador' },
          { key: 'waiter_app.discount_delivery', label: 'Descuento en delivery' },
          { key: 'waiter_app.select_payment', label: 'Seleccionar método de pago' },
          { key: 'waiter_app.close_table',    label: 'Cerrar mesa sin cobrar' },
          { key: 'waiter_app.print_receipt',  label: 'Imprimir boleta/cuenta' },
        ],
      },
    ],
  },
];

/** Todos los permission keys del árbol como array plano */
export const ALL_PERMISSION_KEYS: string[] = PERMISSION_TREE.flatMap(m =>
  m.sections.flatMap(s => s.permissions.map(p => p.key)),
);
