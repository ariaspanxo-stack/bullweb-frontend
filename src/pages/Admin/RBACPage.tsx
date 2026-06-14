import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  ShieldCheck, Plus, Pencil, Trash2, Save, Users,
  Key, Lock, RefreshCw, X, Check, Copy, GitCompare,
  ChevronDown, Sparkles, Crown, LayoutGrid, AlertTriangle, Loader2, Settings,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type { CustomRole, RBACStats } from '@/services/adminService';
import { employeesService } from '@/services/employeesService';
import { PERMISSION_TREE } from '@/constants/permissionTree';
import { useAuthStore } from '@/store/authStore';

// ── Acciones Estándar CRUD ────────────────────────────────────────────────────────────────────────────────────
const STD_ACTIONS = [
  { key: 'view',   label: 'Ver',      color: 'text-blue-300',   activeBg: 'bg-blue-600 border-blue-500'     },
  { key: 'create', label: 'Crear',    color: 'text-green-300',  activeBg: 'bg-green-600 border-green-500'   },
  { key: 'edit',   label: 'Editar',   color: 'text-amber-300',  activeBg: 'bg-amber-600 border-amber-500'   },
  { key: 'delete', label: 'Eliminar', color: 'text-red-300',    activeBg: 'bg-red-600 border-red-500'       },
  { key: 'export', label: 'Exportar', color: 'text-purple-300', activeBg: 'bg-purple-600 border-purple-500' },
] as const;

type Risk = 'critical' | 'high' | 'medium' | 'low';
const RISK_META: Record<Risk, { label: string; dot: string; text: string; border: string; rowBg: string; activeBg: string }> = {
  critical: { label: 'CRÍTICO', dot: 'bg-red-400',    text: 'text-red-300',    border: 'border-red-800',    rowBg: 'bg-red-950/25',    activeBg: 'bg-red-600'    },
  high:     { label: 'ALTO',    dot: 'bg-orange-400', text: 'text-orange-300', border: 'border-orange-800', rowBg: 'bg-orange-950/25', activeBg: 'bg-orange-600' },
  medium:   { label: 'MEDIO',   dot: 'bg-yellow-400', text: 'text-yellow-300', border: 'border-yellow-800', rowBg: 'bg-yellow-950/20', activeBg: 'bg-yellow-600' },
  low:      { label: 'BAJO',    dot: 'bg-gray-400',   text: 'text-gray-300',   border: 'border-gray-700',   rowBg: 'bg-gray-800/20',   activeBg: 'bg-gray-600'   },
};

interface SupervisorPerm { key: string; label: string; description: string; risk: Risk; icon: string; moduleKey: string; moduleLabel: string; }
interface GastroMod { key: string; label: string; icon: string; std: string[]; sup: SupervisorPerm[]; }

// ── Plantillas de roles del sistema ───────────────────────────────────────────
const SYSTEM_TEMPLATES = [
  {
    key: 'super_admin',
    name: 'Super Admin',
    color: '#ef4444',
    icon: Crown,
    description: 'Acceso total sin restricciones. No se puede denegársele nada.',
    tip: 'Solo para el dueño del sistema.',
    perms: { all: true },
  },
  {
    key: 'gerente',
    name: 'Gerente',
    color: '#8b5cf6',
    icon: ShieldCheck,
    description: 'Todo excepto gestión de usuarios y roles.',
    tip: 'Para el gerente de sucursal.',
    perms: { except: ['admin'] },
  },
  {
    key: 'cajero',
    name: 'Cajero',
    color: '#3b82f6',
    icon: Key,
    description: 'Ventas, caja, y consulta de clientes.',
    tip: 'Turno de caja estándar.',
    perms: { modules: ['ventas', 'caja', 'clientes'] },
  },
  {
    key: 'garzon',
    name: 'Garzón',
    color: '#22c55e',
    icon: Users,
    description: 'POS, ver menú, sin acceso a costos ni reportes.',
    tip: 'Personal de sala.',
    perms: { modules: ['ventas', 'menu'] },
  },
  {
    key: 'cocinero',
    name: 'Cocinero',
    color: '#f97316',
    icon: ShieldCheck,
    description: 'Solo KDS y cambio de estados de órdenes.',
    tip: 'Pantalla de cocina.',
    perms: { modules: ['cocina'] },
  },
  {
    key: 'delivery',
    name: 'Repartidor',
    color: '#06b6d4',
    icon: Users,
    description: 'Solo órdenes delivery asignadas a él.',
    tip: 'App de delivery.',
    perms: { modules: ['ventas'] },
  },
  {
    key: 'solo_lectura',
    name: 'Solo Lectura',
    color: '#6b7280',
    icon: Lock,
    description: 'Ve reportes y analíticas, no puede escribir ni eliminar nada.',
    tip: 'Para auditores externos.',
    perms: { actions: ['read', 'export'] },
  },
] as const;

// ── M\u00f3dulos Gastron\u00f3micos con Control de Riesgo Financiero \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// prettier-ignore
const GASTRO_CATEGORIES: { label: string; icon: string; modules: GastroMod[] }[] = [
  {
    label: 'Operaciones de Sala', icon: '\ud83c\udf7d\ufe0f',
    modules: [
      { key: 'pos', label: 'POS / Punto de Venta', icon: '\ud83d\udda5\ufe0f', std: ['view','create','edit','delete'],
        sup: [
          { key: 'reopen_table',       label: 'Reabrir Mesa',             icon: '\ud83d\udd13', risk: 'high',     moduleKey: 'pos', moduleLabel: 'POS',     description: 'Permite reabrir una mesa ya cerrada o pagada para agregar consumos' },
          { key: 'discount_over_20',   label: 'Descuento Mayor al 20%',   icon: '\ud83d\udcb8', risk: 'critical', moduleKey: 'pos', moduleLabel: 'POS',     description: 'Autoriza descuentos superiores al 20% del total de una cuenta' },
          { key: 'void_printed_order', label: 'Anular Comanda Impresa',   icon: '\ud83d\udeab', risk: 'critical', moduleKey: 'pos', moduleLabel: 'POS',     description: 'Anula un pedido ya enviado e impreso en cocina o barra' },
          { key: 'price_override',     label: 'Modificar Precio en Mesa', icon: '\u270f\ufe0f', risk: 'critical', moduleKey: 'pos', moduleLabel: 'POS',     description: 'Cambia el precio de un producto al momento de la venta' },
          { key: 'split_bill',         label: 'Dividir Cuenta',           icon: '\u2797', risk: 'medium',   moduleKey: 'pos', moduleLabel: 'POS',     description: 'Divide la cuenta entre m\u00faltiples pagadores o formas de pago' },
          { key: 'merge_tables',       label: 'Unir Mesas',               icon: '\ud83d\udd17', risk: 'medium',   moduleKey: 'pos', moduleLabel: 'POS',     description: 'Fusiona dos o m\u00e1s mesas activas en una sola cuenta' },
        ],
      },
      { key: 'orders', label: 'Pedidos', icon: '\ud83d\udccb', std: ['view','create','edit','delete'],
        sup: [
          { key: 'cancel_sent_order', label: 'Cancelar Pedido Enviado', icon: '\ud83d\udeab', risk: 'high',     moduleKey: 'orders', moduleLabel: 'Pedidos', description: 'Cancela un pedido ya enviado al KDS o impresora de cocina' },
          { key: 'modify_after_send', label: 'Modificar Post-Env\u00edo',    icon: '\u270d\ufe0f', risk: 'critical', moduleKey: 'orders', moduleLabel: 'Pedidos', description: 'Agrega o quita productos de un pedido ya enviado a cocina' },
          { key: 'order_refund',      label: 'Emitir Reembolso',         icon: '\ud83d\udcb0', risk: 'critical', moduleKey: 'orders', moduleLabel: 'Pedidos', description: 'Procesa devoluci\u00f3n de dinero a cliente por pedido ya cobrado' },
        ],
      },
      { key: 'kitchen', label: 'Cocina / KDS', icon: '\ud83d\udc68\u200d\ud83c\udf73', std: ['view','edit'],
        sup: [
          { key: 'force_complete', label: 'Marcar Listo sin Preparar', icon: '\u2705', risk: 'high',   moduleKey: 'kitchen', moduleLabel: 'Cocina', description: 'Marca un \u00edtem como listo sin haberlo preparado realmente' },
          { key: 'skip_queue',     label: 'Saltar Cola de Pedidos',   icon: '\u23e9', risk: 'medium', moduleKey: 'kitchen', moduleLabel: 'Cocina', description: 'Prioriza un pedido saltando el orden cronol\u00f3gico' },
        ],
      },
      { key: 'delivery', label: 'Delivery', icon: '\ud83d\uded5', std: ['view','create','edit'],
        sup: [
          { key: 'assign_driver',   label: 'Asignar Repartidor',       icon: '\ud83d\udeb4', risk: 'medium', moduleKey: 'delivery', moduleLabel: 'Delivery', description: 'Asigna manualmente un repartidor a un pedido delivery' },
          { key: 'cancel_delivery', label: 'Cancelar Delivery Activo', icon: '\ud83d\udeab', risk: 'high',   moduleKey: 'delivery', moduleLabel: 'Delivery', description: 'Cancela un delivery ya en curso o asignado a repartidor' },
        ],
      },
    ],
  },
  {
    label: 'Inventario & Productos', icon: '\ud83d\udce6',
    modules: [
      { key: 'inventory', label: 'Inventario', icon: '\ud83c\udfea', std: ['view','export'],
        sup: [
          { key: 'view_costs',     label: 'Ver Costos de Productos',   icon: '\ud83d\udcb0', risk: 'critical', moduleKey: 'inventory', moduleLabel: 'Inventario', description: 'Accede al costo de compra de cada producto (dato financiero sensible)' },
          { key: 'manual_adjust',  label: 'Ajuste Manual de Stock',    icon: '\u2696\ufe0f', risk: 'critical', moduleKey: 'inventory', moduleLabel: 'Inventario', description: 'Aumenta o disminuye stock sin generar una orden de compra registrada' },
          { key: 'receive_stock',  label: 'Recibir Mercanc\u00eda',         icon: '\ud83d\udce5', risk: 'high',     moduleKey: 'inventory', moduleLabel: 'Inventario', description: 'Registra la entrada de stock desde proveedores al almac\u00e9n' },
          { key: 'stock_writeoff', label: 'Dar de Baja (Merma)',        icon: '\ud83d\uddd1\ufe0f', risk: 'critical', moduleKey: 'inventory', moduleLabel: 'Inventario', description: 'Registra productos dados de baja por vencimiento, rotura o merma' },
          { key: 'view_suppliers', label: 'Ver Proveedores y Precios',  icon: '\ud83e\udd1d', risk: 'high',     moduleKey: 'inventory', moduleLabel: 'Inventario', description: 'Accede a la lista de proveedores y precios de compra negociados' },
        ],
      },
      { key: 'menu', label: 'Men\u00fa / Productos', icon: '\ud83c\udf55', std: ['view','create','edit','delete','export'],
        sup: [
          { key: 'change_price', label: 'Cambiar Precios de Venta',  icon: '\ud83d\udcb2', risk: 'critical', moduleKey: 'menu', moduleLabel: 'Men\u00fa', description: 'Modifica el precio de venta de productos del men\u00fa vigente' },
          { key: 'set_combo',    label: 'Crear / Modificar Combos', icon: '\ud83d\udce6', risk: 'medium',   moduleKey: 'menu', moduleLabel: 'Men\u00fa', description: 'Define o edita combos y promociones del men\u00fa' },
          { key: 'hide_product', label: 'Ocultar Producto en POS',  icon: '\ud83d\udc41\ufe0f', risk: 'low',      moduleKey: 'menu', moduleLabel: 'Men\u00fa', description: 'Oculta un producto en la pantalla de venta sin eliminarlo' },
        ],
      },
    ],
  },
  {
    label: 'Caja & Finanzas', icon: '\ud83d\udcb5',
    modules: [
      { key: 'cash', label: 'Caja', icon: '\ud83c\udfe7', std: ['view','create'],
        sup: [
          { key: 'blind_close',      label: 'Cierre Ciego (Sin Ver Total)', icon: '\ud83d\ude48', risk: 'critical', moduleKey: 'cash', moduleLabel: 'Caja', description: 'El cajero no ve el total esperado hasta terminar el arqueo. Previene manipulaci\u00f3n.' },
          { key: 'open_drawer',      label: 'Abrir Caj\u00f3n Sin Venta',        icon: '\ud83d\uddc4\ufe0f', risk: 'high',     moduleKey: 'cash', moduleLabel: 'Caja', description: 'Abre el caj\u00f3n de dinero sin registrar una venta asociada' },
          { key: 'petty_cash',       label: 'Gastos de Caja Chica',         icon: '\ud83d\udcb5', risk: 'high',     moduleKey: 'cash', moduleLabel: 'Caja', description: 'Registra egresos de caja por gastos operativos menores' },
          { key: 'register_expense', label: 'Registrar Gasto Manual',       icon: '\ud83d\udcdd', risk: 'high',     moduleKey: 'cash', moduleLabel: 'Caja', description: 'Ingresa egresos no categorizados en la caja del d\u00eda' },
          { key: 'force_open_shift', label: 'Forzar Apertura de Turno',     icon: '\ud83d\udd13', risk: 'critical', moduleKey: 'cash', moduleLabel: 'Caja', description: 'Abre un nuevo turno de caja aunque ya exista uno activo' },
        ],
      },
      { key: 'discounts', label: 'Descuentos & Cortes\u00edas', icon: '\ud83c\udf81', std: ['view','create'],
        sup: [
          { key: 'discount_table',    label: 'Descuento en Mesa',       icon: '\ud83c\udff7\ufe0f', risk: 'medium',   moduleKey: 'discounts', moduleLabel: 'Descuentos', description: 'Aplica descuentos en \u00f3rdenes de mesa (DINE_IN)' },
          { key: 'discount_counter',  label: 'Descuento en Mostrador',  icon: '\ud83c\udff7\ufe0f', risk: 'medium',   moduleKey: 'discounts', moduleLabel: 'Descuentos', description: 'Aplica descuentos en \u00f3rdenes de mostrador (TAKEAWAY)' },
          { key: 'discount_delivery', label: 'Descuento en Delivery',   icon: '\ud83c\udff7\ufe0f', risk: 'medium',   moduleKey: 'discounts', moduleLabel: 'Descuentos', description: 'Aplica descuentos en \u00f3rdenes de delivery' },
          { key: 'over_20_discount', label: 'Descuento Mayor al 20%', icon: '\ud83d\udcb8', risk: 'critical', moduleKey: 'discounts', moduleLabel: 'Descuentos', description: 'Autorizaci\u00f3n especial para descuentos excepcionales sobre el 20%' },
          { key: 'courtesy',         label: 'Marcar como Cortes\u00eda',   icon: '\ud83c\udf81', risk: 'high',     moduleKey: 'discounts', moduleLabel: 'Descuentos', description: 'Entrega un producto o cuenta completa sin costo (invitaci\u00f3n)' },
          { key: 'employee_meal',    label: 'Consumo de Empleado',    icon: '\ud83d\udc64', risk: 'medium',   moduleKey: 'discounts', moduleLabel: 'Descuentos', description: 'Registra consumo interno del personal con descuento o sin costo' },
        ],
      },
      { key: 'payments', label: 'Medios de Pago', icon: '\ud83d\udcb3', std: ['view','create'],
        sup: [
          { key: 'accept_voucher',  label: 'Aceptar Vouchers / Bonos', icon: '\ud83e\uddfe', risk: 'medium',   moduleKey: 'payments', moduleLabel: 'Pagos', description: 'Cobra con vouchers, Junaeb u otros bonos de beneficios' },
          { key: 'on_credit',       label: 'Venta a Cr\u00e9dito / Fiado',  icon: '\ud83d\udccb', risk: 'high',     moduleKey: 'payments', moduleLabel: 'Pagos', description: 'Registra una venta sin cobro inmediato (cuenta pendiente)' },
          { key: 'void_payment',    label: 'Anular Cobro Realizado',   icon: '\u274c', risk: 'critical', moduleKey: 'payments', moduleLabel: 'Pagos', description: 'Revierte un pago ya procesado y registrado en el sistema' },
          { key: 'partial_payment', label: 'Pago Parcial / Abono',     icon: '\u2797', risk: 'medium',   moduleKey: 'payments', moduleLabel: 'Pagos', description: 'Registra un cobro parcial y deja saldo pendiente' },
        ],
      },
    ],
  },
  {
    label: 'Reportes & Gesti\u00f3n', icon: '\ud83d\udcca',
    modules: [
      { key: 'reports', label: 'Reportes', icon: '\ud83d\udcc8', std: ['view','export'],
        sup: [
          { key: 'view_profits',    label: 'Ver Utilidad Neta',    icon: '\ud83d\udcc8', risk: 'critical', moduleKey: 'reports', moduleLabel: 'Reportes', description: 'Accede a reportes de utilidad, margen y rentabilidad del negocio' },
          { key: 'view_costs_rpt',  label: 'Ver Costos y Compras', icon: '\ud83d\udcb0', risk: 'critical', moduleKey: 'reports', moduleLabel: 'Reportes', description: 'Muestra costos del per\u00edodo y detalle de \u00f3rdenes de compra' },
          { key: 'compare_periods', label: 'Comparar Per\u00edodos',    icon: '\ud83d\udcc5', risk: 'high',     moduleKey: 'reports', moduleLabel: 'Reportes', description: 'Compara ventas, costos y m\u00e9tricas entre distintos per\u00edodos' },
        ],
      },
      { key: 'customers', label: 'Clientes', icon: '\ud83d\udc65', std: ['view','create','edit','delete','export'],
        sup: [
          { key: 'loyalty_adjust', label: 'Ajustar Puntos Fidelidad',  icon: '\u2b50', risk: 'medium', moduleKey: 'customers', moduleLabel: 'Clientes', description: 'Modifica manualmente los puntos de fidelidad de un cliente' },
          { key: 'view_history',   label: 'Ver Historial de Consumo',  icon: '\ud83d\udccb', risk: 'low',    moduleKey: 'customers', moduleLabel: 'Clientes', description: 'Consulta el historial completo de compras de un cliente' },
          { key: 'blacklist',      label: 'Bloquear / Lista Negra',    icon: '\ud83d\udeab', risk: 'medium', moduleKey: 'customers', moduleLabel: 'Clientes', description: 'Bloquea a un cliente para que no pueda realizar pedidos' },
        ],
      },
      { key: 'employees', label: 'Empleados', icon: '\ud83e\uddd1\u200d\ud83d\udcbc', std: ['view','create','edit','delete'],
        sup: [
          { key: 'view_salaries',   label: 'Ver Sueldos y Liquidaciones', icon: '\ud83d\udcb0', risk: 'critical', moduleKey: 'employees', moduleLabel: 'Empleados', description: 'Accede a los datos de remuneraci\u00f3n del personal' },
          { key: 'manage_schedule', label: 'Gestionar Horarios',          icon: '\ud83d\udcc5', risk: 'medium',   moduleKey: 'employees', moduleLabel: 'Empleados', description: 'Crea y modifica los turnos y horarios del personal' },
          { key: 'view_perf',       label: 'Ver Rendimiento Individual',  icon: '\ud83d\udcca', risk: 'medium',   moduleKey: 'employees', moduleLabel: 'Empleados', description: 'Consulta m\u00e9tricas de ventas y desempe\u00f1o por empleado' },
        ],
      },
    ],
  },
];

// \u2500\u2500 helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function hasPerm(perms: Set<string>, module: string, action: string) {
  return perms.has(`${module}::${action}`);
}
function getAllSupervisorPerms(): SupervisorPerm[] {
  return GASTRO_CATEGORIES.flatMap(c => c.modules.flatMap(m => m.sup));
}

// \u2500\u2500 RoleModal \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
interface RoleModalProps {
  role?: CustomRole | null;
  onClose: () => void;
  onSave: (role: CustomRole) => void;
}
function RoleModal({ role, onClose, onSave }: RoleModalProps) {
  const [name,        setName]        = useState(role?.name        ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [color,       setColor]       = useState(role?.color       ?? '#6366f1');
  const [template,    setTemplate]    = useState<string>('');
  const [saving,      setSaving]      = useState(false);
  const [step,        setStep]        = useState<'template' | 'form'>(role ? 'form' : 'template');

  const applyTemplate = (tpl: typeof SYSTEM_TEMPLATES[number]) => {
    setName(tpl.name + ' (custom)');
    setDescription(tpl.description);
    setColor(tpl.color);
    setTemplate(tpl.key);
    setStep('form');
  };

  const submit = async () => {
    if (!name.trim()) return toast.error('El nombre es requerido');
    setSaving(true);
    try {
      const saved = role
        ? await adminService.updateRBACRole(role.id, { name, description, color })
        : await adminService.createRBACRole({ name, description, color, templateKey: template || undefined });
      toast.success(role ? 'Rol actualizado' : 'Rol creado');
      onSave(saved);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-600 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-600">
          <h2 className="text-lg font-semibold text-white">
            {role ? 'Editar rol' : step === 'template' ? 'Nuevo rol — elegir plantilla' : 'Configurar rol'}
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white"><X size={18} /></button>
        </div>

        {/* Step 1: elegir plantilla (solo en creación) */}
        {step === 'template' && !role && (
          <div className="p-6">
            <p className="text-sm text-gray-200 mb-4">
              Empieza desde una plantilla o crea un rol en blanco:
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {SYSTEM_TEMPLATES.map(tpl => (
                <button
                  key={tpl.key}
                  onClick={() => applyTemplate(tpl)}
                  className="flex flex-col items-start p-3 rounded-lg border border-gray-600 hover:border-indigo-400 hover:bg-indigo-900/20 transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: tpl.color }} />
                    <span className="text-sm font-semibold text-white group-hover:text-indigo-200">{tpl.name}</span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-snug">{tpl.tip}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('form')}
              className="w-full py-2 border border-dashed border-gray-500 rounded-lg text-sm text-gray-200 hover:text-white hover:border-gray-300 transition"
            >
              + Empezar en blanco
            </button>
          </div>
        )}

        {/* Step 2: form */}
        {step === 'form' && (
          <div className="p-6 space-y-4">
            {template && (
              <div className="flex items-center gap-2 text-xs bg-indigo-900/30 text-indigo-300 border border-indigo-700 rounded-lg px-3 py-2">
                <Sparkles size={12} />
                Basado en plantilla: <strong className="ml-1 capitalize">{template}</strong>
                <button onClick={() => { setTemplate(''); setStep('template'); }} className="ml-auto text-gray-300 hover:text-white">
                  <X size={12} />
                </button>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Nombre *</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                disabled={role?.is_system}
                className="w-full bg-gray-900 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-indigo-400 disabled:opacity-50"
                placeholder="Ej: Cajero Nocturno"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Descripción</label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-gray-900 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-indigo-400 resize-none"
                placeholder="¿Qué puede hacer este rol?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Color del rol</label>
              <div className="flex items-center gap-3">
                <input
                  type="color" value={color} onChange={e => setColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="text-sm text-gray-100 font-mono">{color}</span>
                <div className="flex gap-1 ml-2 flex-wrap">
                  {['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#6366f1','#6b7280'].map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      className="w-5 h-5 rounded-full border-2 transition-all"
                      style={{ background: c, borderColor: color === c ? 'white' : 'transparent' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-2">
              {!role && (
                <button onClick={() => setStep('template')} className="text-sm text-gray-300 hover:text-white flex items-center gap-1">
                  ← Plantillas
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-200 hover:text-white">Cancelar</button>
                <button
                  onClick={submit} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DiffModal: Comparar dos roles ─────────────────────────────────────────────
function DiffModal({ roles, onClose }: {
  roles: CustomRole[];
  onClose: () => void;
}) {
  const [roleAId, setRoleAId] = useState('');
  const [roleBId, setRoleBId] = useState('');
  const [permsA,  setPermsA]  = useState<Set<string>>(new Set());
  const [permsB,  setPermsB]  = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadDiff = async () => {
    if (!roleAId || !roleBId) return;
    setLoading(true);
    try {
      const [pa, pb] = await Promise.all([
        adminService.getRolePermissions(roleAId),
        adminService.getRolePermissions(roleBId),
      ]);
      setPermsA(new Set(pa));
      setPermsB(new Set(pb));
    } catch { toast.error('Error cargando permisos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadDiff(); }, [roleAId, roleBId]);

  const roleA = roles.find(r => r.id === roleAId);
  const roleB = roles.find(r => r.id === roleBId);
  const onlyInA = [...permsA].filter(p => !permsB.has(p)).length;
  const onlyInB = [...permsB].filter(p => !permsA.has(p)).length;
  const inBoth  = [...permsA].filter(p =>  permsB.has(p)).length;

  const allKnownPerms: { key: string; label: string; moduleLabel: string; moduleIcon: string; isSuper: boolean; risk: Risk }[] =
    GASTRO_CATEGORIES.flatMap(cat =>
      cat.modules.flatMap(mod => [
        ...mod.std.map(a => ({
          key: `${mod.key}::${a}`,
          label: STD_ACTIONS.find(s => s.key === a)?.label ?? a,
          moduleLabel: mod.label, moduleIcon: mod.icon, isSuper: false, risk: 'low' as Risk,
        })),
        ...mod.sup.map(s => ({
          key: `${mod.key}::${s.key}`,
          label: s.label,
          moduleLabel: mod.label, moduleIcon: mod.icon, isSuper: true, risk: s.risk,
        })),
      ])
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-600 w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-600 shrink-0">
          <div className="flex items-center gap-2">
            <GitCompare size={18} className="text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Comparar Roles</h2>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 border-b border-gray-600 flex items-center gap-4 shrink-0">
          <select value={roleAId} onChange={e => setRoleAId(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-500 text-white text-sm rounded-lg px-3 py-2 focus:outline-none">
            <option value="">— Rol A —</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <span className="text-gray-200 text-sm font-bold flex-shrink-0">vs</span>
          <select value={roleBId} onChange={e => setRoleBId(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-500 text-white text-sm rounded-lg px-3 py-2 focus:outline-none">
            <option value="">— Rol B —</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        {roleAId && roleBId && !loading && (
          <div className="px-6 py-3 flex items-center gap-6 text-sm border-b border-gray-600 shrink-0">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /><span className="text-gray-300"><strong className="text-white">{onlyInA}</strong> solo en <span style={{ color: roleA?.color }}>{roleA?.name}</span></span></span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-gray-300"><strong className="text-white">{onlyInB}</strong> solo en <span style={{ color: roleB?.color }}>{roleB?.name}</span></span></span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-500" /><span className="text-gray-300"><strong className="text-white">{inBoth}</strong> en com\u00fan</span></span>
          </div>
        )}
        <div className="overflow-auto flex-1 px-6 py-4">
          {loading && <div className="flex items-center justify-center h-32 text-gray-400"><RefreshCw className="animate-spin mr-2" size={18} /> Cargando\u2026</div>}
          {(!roleAId || !roleBId) && <div className="flex items-center justify-center h-32 text-gray-300 text-sm">Selecciona dos roles para ver las diferencias</div>}
          {roleAId && roleBId && !loading && (() => {
            const diffs = allKnownPerms.filter(p => permsA.has(p.key) !== permsB.has(p.key));
            const common = allKnownPerms.filter(p => permsA.has(p.key) && permsB.has(p.key));
            if (!diffs.length) return (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Check size={24} className="text-green-400" />
                <span className="text-gray-300 text-sm">Los roles tienen los mismos permisos</span>
              </div>
            );
            return (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-3">{diffs.length} permisos con diferencias</p>
                {diffs.map(p => {
                  const inA = permsA.has(p.key);
                  const inB = permsB.has(p.key);
                  const meta = RISK_META[p.risk];
                  return (
                    <div key={p.key} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${p.isSuper ? meta.border + ' ' + meta.rowBg : 'border-gray-700 bg-gray-800/40'}`}>
                      <span className="text-lg">{p.moduleIcon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">{p.label}</span>
                          <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{p.moduleLabel}</span>
                          {p.isSuper && <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${meta.border} ${meta.text}`}>{meta.label}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${inA ? 'bg-green-900/50 text-green-300' : 'bg-gray-800 text-gray-500'}`}>
                          {inA ? <Check size={10} /> : <X size={10} />} {roleA?.name?.slice(0, 9)}
                        </span>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${inB ? 'bg-blue-900/50 text-blue-300' : 'bg-gray-800 text-gray-500'}`}>
                          {inB ? <Check size={10} /> : <X size={10} />} {roleB?.name?.slice(0, 9)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {common.length > 0 && (
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                    <Check size={11} className="inline text-green-600 mr-1" />{common.length} permisos id\u00e9nticos en ambos roles
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
// ── RoleDropdown: selector accesible con contraste garantizado ───────────────
function RoleDropdown({ roles, selected, onSelect }: {
  roles: CustomRole[];
  selected: CustomRole | null;
  onSelect: (r: CustomRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 min-w-52 px-3 py-2 bg-gray-800 border border-gray-500 rounded-lg text-sm text-white hover:border-indigo-400 transition-colors"
      >
        {selected ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: selected.color }} />
            <span className="flex-1 text-left">{selected.name}{selected.is_system ? ' 🔒' : ''}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-gray-400">— Selecciona un rol —</span>
        )}
        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-52 bg-gray-800 border border-gray-500 rounded-lg shadow-2xl overflow-hidden">
          {roles.map(r => (
            <button
              key={r.id}
              onClick={() => { onSelect(r); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-gray-700 transition-colors ${
                selected?.id === r.id ? 'bg-indigo-700/40 text-indigo-200' : 'text-white'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
              <span>{r.name}{r.is_system ? ' 🔒' : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RBACPage() {
  const { loadUser } = useAuthStore();
  const [tab,          setTab]          = useState<'roles' | 'matrix'>('roles');
  const [stats,        setStats]        = useState<RBACStats | null>(null);
  const [roles,        setRoles]        = useState<CustomRole[]>([]);
  const [matrixRoles,  setMatrixRoles]  = useState<CustomRole[]>([]);
  const [loading,      setLoading]      = useState(true);

  // matriz
  const [selectedRole,      setSelectedRole]      = useState<CustomRole | null>(null);
  const [currentPermissions, setCurrentPermissions] = useState<string[]>([]);
  const [savedPermissions,   setSavedPermissions]   = useState<string[]>([]);
  const [loadingPerms,       setLoadingPerms]       = useState(false);
  const [saving,             setSaving]             = useState(false);
  const [pendingRole,        setPendingRole]        = useState<CustomRole | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // modal
  const [modal,        setModal]        = useState<'none' | 'create' | 'edit' | 'diff'>('none');
  const [editing,      setEditing]      = useState<CustomRole | null>(null);
  const [deleting,     setDeleting]     = useState<string | null>(null);
  const [cloningId,    setCloningId]    = useState<string | null>(null);
  const [cloneDialogRole, setCloneDialogRole] = useState<CustomRole | null>(null);
  const [cloneDialogName, setCloneDialogName] = useState('');

  const hasUnsavedChanges = useMemo(() => {
    return [...currentPermissions].sort().join(',') !== [...savedPermissions].sort().join(',');
  }, [currentPermissions, savedPermissions]);

  const diffCount = useMemo(() => {
    const added   = currentPermissions.filter(p => !savedPermissions.includes(p));
    const removed = savedPermissions.filter(p => !currentPermissions.includes(p));
    return added.length + removed.length;
  }, [currentPermissions, savedPermissions]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Roles son la carga principal — nunca deben fallar silenciosamente
      const tenantRoles = await adminService.listMatrixRoles();
      setRoles(tenantRoles);
      setMatrixRoles(tenantRoles);
    } catch (e) {
      console.error('[RBAC] Error cargando roles:', e);
      toast.error('Error cargando roles');
    } finally {
      setLoading(false);
    }
    // Stats son secundarias — no bloquean si fallan
    try {
      const s = await adminService.getRolesStats();
      setStats(s);
    } catch (e) {
      console.warn('[RBAC] Stats no disponibles:', e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadRole = async (role: CustomRole) => {
    setLoadingPerms(true);
    setSelectedRole(role);
    try {
      const result = await adminService.getRolePermissions(role.id);
      console.log('[RBAC] loadRole response:', JSON.stringify({ roleId: result.roleId, name: result.name, count: result.permissions?.length, permissions: result.permissions }));
      // Actualizar roleId si el backend devolvió la copia del tenant
      if (result.roleId && result.roleId !== role.id) {
        const updatedRole = { ...role, id: result.roleId };
        setSelectedRole(updatedRole);
        setMatrixRoles(prev => prev.map(r => r.id === role.id ? updatedRole : r));
      }
      const perms = Array.isArray(result.permissions) ? result.permissions : [];
      console.log('[RBAC] setCurrentPermissions:', perms.length, 'perms');
      setCurrentPermissions(perms);
      setSavedPermissions(perms);
    } catch (e: any) {
      console.error('[RBAC] loadRole error:', e?.response?.status, e?.response?.data ?? e?.message);
      toast.error(`Error cargando permisos: ${e?.response?.data?.message ?? e?.message ?? 'desconocido'}`);
      setCurrentPermissions([]);
      setSavedPermissions([]);
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleSelectRole = (role: CustomRole) => {
    if (hasUnsavedChanges) {
      setPendingRole(role);
      setShowUnsavedWarning(true);
      return;
    }
    loadRole(role);
  };

  const isSuperAdmin = (role: CustomRole | null) => role?.name === 'Super Admin';

  const togglePermission = (key: string) => {
    if (isSuperAdmin(selectedRole)) return;
    setCurrentPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key],
    );
  };

  const toggleSection = (sectionKeys: string[]) => {
    if (isSuperAdmin(selectedRole)) return;
    const allActive = sectionKeys.every(p => currentPermissions.includes(p));
    setCurrentPermissions(prev =>
      allActive
        ? prev.filter(p => !sectionKeys.includes(p))
        : [...prev.filter(p => !sectionKeys.includes(p)), ...sectionKeys],
    );
  };

  const toggleModule = (moduleKeys: string[]) => {
    if (isSuperAdmin(selectedRole)) return;
    const allActive = moduleKeys.every(p => currentPermissions.includes(p));
    setCurrentPermissions(prev =>
      allActive
        ? prev.filter(p => !moduleKeys.includes(p))
        : [...prev.filter(p => !moduleKeys.includes(p)), ...moduleKeys],
    );
  };

  const handleSave = async () => {
    if (!selectedRole || !hasUnsavedChanges) return;
    setSaving(true);
    try {
      const result = await adminService.setRolePermissions(selectedRole.id, currentPermissions);
      setSavedPermissions([...currentPermissions]);
      // Actualizar roleId si hubo copy-on-write
      const newRoleId = result?.roleId;
      if (newRoleId && newRoleId !== selectedRole.id) {
        const updatedRole = { ...selectedRole, id: newRoleId };
        setSelectedRole(updatedRole);
        setMatrixRoles(prev => prev.map(r => r.id === selectedRole.id ? updatedRole : r));
        setRoles(prev => prev.map(r => r.id === selectedRole.id ? { ...r, id: newRoleId, permission_count: result?.total ?? currentPermissions.length } : r));
      } else {
        setRoles(prev => prev.map(r =>
          r.id === selectedRole.id ? { ...r, permission_count: currentPermissions.length } : r,
        ));
      }
      toast.success(`Permisos de "${selectedRole.name}" guardados ✅`);
      loadUser();
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleting !== id) { setDeleting(id); return; }
    try {
      await adminService.deleteRBACRole(id);
      toast.success('Rol eliminado');
      setDeleting(null);
      if (selectedRole?.id === id) setSelectedRole(null);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Error');
      setDeleting(null);
    }
  };

  const handleClone = (role: CustomRole) => {
    setCloneDialogRole(role);
    setCloneDialogName(`${role.name} (copia)`);
  };

  const doClone = async () => {
    if (!cloneDialogRole || !cloneDialogName.trim()) return;
    const role = cloneDialogRole;
    const name = cloneDialogName.trim();
    setCloneDialogRole(null);
    setCloningId(role.id);
    try {
      await adminService.cloneRBACRole(role.id, name);
      toast.success(`Rol "${name}" creado`);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Error al clonar');
    } finally {
      setCloningId(null);
    }
  };

  const CRITICAL_PERMS = ['admin.access', 'admin.manage', 'pos.access'];

  const DEFAULT_PERMISSIONS: Record<string, string[]> = {
    Mesero: [
      'waiter.view', 'waiter.orders', 'waiter.tables',
      'pos.access', 'pos.mesas', 'pos.create_order', 'pos.edit_order', 'pos.transfer_order',
      'tables.view', 'tables.assign', 'menu.view',
      'waiter_app.view_orders', 'waiter_app.edit_order', 'waiter_app.transfer_table',
      'waiter_app.modifiers', 'waiter_app.variants',
      'waiter_app.discount_table',
    ],
    Cajero: [
      'pos.access', 'pos.mesas', 'pos.mostrador', 'pos.create_order', 'pos.edit_order', 'pos.cobrar',
      'pos.split_bill', 'pos.discount_table', 'pos.discount_counter', 'pos.discount_delivery',
      'tables.view', 'tables.manage',
      'cash.view', 'cash.open', 'cash.close',
      'billing.view', 'billing.issue_boleta',
      'customers.view', 'sales.view',
      'waiter_app.view_orders', 'waiter_app.charge',
      'waiter_app.select_payment', 'waiter_app.print_receipt',
      'waiter_app.discount_counter',
    ],
    Cocinero: [
      'kitchen.view', 'kitchen.update', 'menu.view',
    ],
    Gerente: [
      'pos.access', 'pos.mesas', 'pos.mostrador', 'pos.delivery', 'pos.create_order', 'pos.edit_order', 'pos.cobrar',
      'pos.cancel_order', 'pos.split_bill', 'pos.discount_table', 'pos.discount_counter', 'pos.discount_delivery', 'pos.transfer_order',
      'pos.view_all_orders',
      'tables.view', 'tables.manage', 'tables.assign',
      'sales.view', 'sales.export',
      'reports.view', 'reports.export',
      'cash.view', 'cash.open', 'cash.close',
      'billing.view', 'billing.issue_boleta', 'billing.issue_factura',
      'customers.view', 'customers.manage',
      'employees.view',
      'menu.view', 'products.view',
      'inventory.view', 'inventory.purchases', 'inventory.adjustments',
      'delivery.view',
      'marketing.view',
      'admin.access',
      'waiter_app.discount_table', 'waiter_app.discount_counter', 'waiter_app.discount_delivery',
    ],
  };

  const handleTogglePermission = async (permission: string, currentlyOn: boolean) => {
    if (!selectedRole || isSuperAdmin(selectedRole)) return;
    if (currentlyOn && CRITICAL_PERMS.includes(permission)) {
      if (!window.confirm(`¿Quitar "${permission}"? Esto puede bloquear el acceso del rol.`)) return;
    }
    togglePermission(permission);
  };

  const handleApplyDefaults = (roleId: string, roleName: string) => {
    const defaults = DEFAULT_PERMISSIONS[roleName] ?? [];
    if (defaults.length === 0) return;
    setCurrentPermissions([...defaults]);
    toast(`Permisos recomendados de ${roleName} cargados. Click “Guardar” para confirmar.`);
  };

  const handleActivateAllInModule = (moduleKeys: string[]) => {
    if (!selectedRole || isSuperAdmin(selectedRole)) return;
    toggleModule(moduleKeys);
  };

  const handleEditPermissions = (role: CustomRole) => {
    setTab('matrix');
    loadRole(role);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const ROLE_DESCRIPTIONS: Record<string, string> = {
    Administrador: 'Acceso total al sistema',
    Gerente:       'Todo excepto gestión de usuarios y roles',
    Cajero:        'Ventas, caja y consulta de clientes',
    Mesero:        'POS, ver menú, sin acceso a costos',
    Cocinero:      'Pantalla de cocina (KDS)',
    Inventario:    'Solo módulo de inventario',
  };

  const systemRoles = roles.filter(r => r.is_system);
  const customRoles = roles.filter(r => !r.is_system);

  return (
    <div className="bg-gray-900 min-h-full rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-indigo-400" size={24} />
          <div>
            <h1 className="text-xl font-bold text-white">Roles & Permisos</h1>
            <p className="text-sm text-gray-300">Control de acceso basado en roles (RBAC)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModal('diff')}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm border border-gray-600"
          >
            <GitCompare size={14} /> Comparar roles
          </button>

          {tab === 'matrix' && selectedRole && (
            <button
              onClick={handleSave} disabled={saving || !hasUnsavedChanges}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {hasUnsavedChanges ? `Guardar (${diffCount} cambio${diffCount !== 1 ? 's' : ''})` : 'Sin cambios'}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Roles totales',    value: stats.total_roles,        icon: Users,      color: 'text-indigo-400' },
            { label: 'Roles sistema',    value: stats.system_roles,       icon: Lock,       color: 'text-blue-400'   },
            { label: 'Roles custom',     value: stats.custom_roles_count, icon: ShieldCheck,color: 'text-green-400'  },
            { label: 'Permisos activos', value: stats.total_permissions,  icon: Key,        color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-600 p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={16} className={s.color} />
                <span className="text-xs text-gray-200 font-medium">{s.label}</span>
              </div>
              <span className="text-2xl font-bold text-white">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit border border-gray-700">
        {(['roles', 'matrix'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'roles' ? <><LayoutGrid size={13} className="inline mr-1.5" />Roles</> : <><Key size={13} className="inline mr-1.5" />Matriz de Permisos</>}
          </button>
        ))}
      </div>

      {/* ── Tab: Roles ── */}
      {tab === 'roles' && (
        loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <RefreshCw className="animate-spin mr-2" size={18} /> Cargando…
          </div>
        ) : (
          <div className="space-y-6">
            {/* Roles del tenant (roles base del sistema) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Crown size={14} className="text-yellow-400" />
                <h2 className="text-sm font-semibold text-gray-100">Roles del tenant</h2>
                <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full ml-1">{systemRoles.length} roles</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {systemRoles.length === 0 && (
                  <p className="text-sm text-gray-400 col-span-3">No hay roles configurados.</p>
                )}
                {systemRoles.map(role => (
                  <div key={role.id}
                    className="bg-gray-800 rounded-xl border border-gray-600 p-4 hover:border-gray-400 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: role.color }} />
                        <div>
                          <h3 className="font-semibold text-white text-sm">{role.name}</h3>
                          <p className="text-[11px] text-gray-400 mt-0.5">{role.description || ROLE_DESCRIPTIONS[role.name] || ''}</p>
                        </div>
                      </div>
                      {role.is_system && <Lock size={13} className="text-gray-600 mt-0.5 flex-shrink-0" />}
                    </div>
                    <div className="text-xs text-gray-400 mb-3">
                      <span className="text-indigo-300 font-medium">{role.permission_count}</span> permisos configurados
                    </div>
                    <button
                      onClick={() => handleEditPermissions(role)}
                      className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 px-2 py-1 rounded-lg hover:bg-orange-900/20 transition"
                    >
                      <Settings size={11} /> Editar permisos
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-indigo-400" />
                <h2 className="text-sm font-semibold text-gray-100">Roles personalizados</h2>
                <span className="text-[10px] bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded-full ml-1">{customRoles.length} roles</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {customRoles.length === 0 && (
                  <p className="text-sm text-gray-400 col-span-3">No hay roles personalizados. Crea uno con + Nuevo rol.</p>
                )}
                {customRoles.map(role => (
                  <div key={role.id} className="bg-gray-800 rounded-xl border border-gray-600 p-5 hover:border-gray-400 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: role.color }} />
                        <div>
                          <h3 className="font-semibold text-white text-sm">{role.name}</h3>
                          {role.description && (
                            <p className="text-xs text-gray-200 mt-0.5 line-clamp-2">{role.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-300">
                        <span className="text-indigo-300 font-medium">{role.permission_count}</span> permisos
                      </span>
                      <button
                        onClick={() => handleEditPermissions(role)}
                        className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 px-2 py-1 rounded hover:bg-orange-900/20"
                      >
                        <Settings size={11} /> Editar permisos
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}

      {/* ── Tab: Matriz ── */}
      {tab === 'matrix' && (
        <div className="space-y-4">
          {/* Selector de rol */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-gray-200 whitespace-nowrap">Rol a editar:</label>
            <RoleDropdown
              roles={matrixRoles}
              selected={selectedRole}
              onSelect={handleSelectRole}
            />
            {selectedRole && !loadingPerms && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ background: selectedRole.color }} />
                <span className="text-white">{selectedRole.name}</span>
                <span className="text-gray-400">·</span>
                <span className="text-indigo-300">{currentPermissions.length} permisos</span>
                {hasUnsavedChanges && (
                  <span className="text-amber-400 text-xs font-medium">· {diffCount} cambio{diffCount !== 1 ? 's' : ''} sin guardar</span>
                )}
                {isSuperAdmin(selectedRole) && (
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">Solo lectura</span>
                )}
              </div>
            )}
          </div>

          {!selectedRole && (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">
              Selecciona un rol para editar su matriz de permisos
            </div>
          )}

          {selectedRole && loadingPerms && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <RefreshCw className="animate-spin mr-2" size={18} /> Cargando permisos…
            </div>
          )}

          {selectedRole && !loadingPerms && (
            <div className="space-y-3">
              {/* Banner permisos vacíos */}
              {currentPermissions.length === 0 && !isSuperAdmin(selectedRole) && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-orange-400">Este rol no tiene permisos configurados</p>
                    <p className="text-xs text-gray-400 mt-1">Puedes aplicar los permisos recomendados para este rol</p>
                  </div>
                  {DEFAULT_PERMISSIONS[selectedRole.name] && (
                    <button
                      onClick={() => handleApplyDefaults(selectedRole.id, selectedRole.name)}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg px-4 py-2 whitespace-nowrap flex-shrink-0"
                    >
                      Aplicar permisos recomendados
                    </button>
                  )}
                </div>
              )}

              {PERMISSION_TREE.map(mod => {
                const allModuleKeys = mod.sections.flatMap(s => s.permissions.map(p => p.key));
                const activeInModule = allModuleKeys.filter(k => currentPermissions.includes(k));
                const allModuleActive = allModuleKeys.length > 0 && allModuleKeys.every(k => currentPermissions.includes(k));
                const someModuleActive = activeInModule.length > 0 && !allModuleActive;
                return (
                  <div key={mod.module} className="rounded-xl border border-gray-700 overflow-hidden">
                    {/* Cabecera del módulo */}
                    <div
                      className="flex items-center justify-between px-4 py-3 border-b border-gray-700"
                      style={{ background: `${mod.color}18` }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: mod.color }} />
                        <span className="text-sm font-semibold text-white">{mod.module}</span>
                        <span className={`text-xs font-mono font-semibold ${
                          activeInModule.length === 0
                            ? 'text-gray-500'
                            : activeInModule.length === allModuleKeys.length
                            ? 'text-green-400'
                            : 'text-orange-400'
                        }`}>
                          {activeInModule.length}/{allModuleKeys.length}
                        </span>
                      </div>
                      {!isSuperAdmin(selectedRole) && (
                        <button
                          onClick={() => allModuleActive ? toggleModule(allModuleKeys) : handleActivateAllInModule(allModuleKeys)}
                          title={allModuleActive ? 'Desactivar todo el módulo' : 'Activar todo el módulo'}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                            allModuleActive
                              ? 'border-white/30 text-white bg-white/10 hover:bg-white/20'
                              : someModuleActive
                              ? 'border-yellow-500/50 text-yellow-300 bg-yellow-900/20 hover:bg-yellow-900/40'
                              : 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-400'
                          }`}
                        >
                          {allModuleActive ? 'Desactivar todo' : 'Activar todo'}
                        </button>
                      )}
                    </div>

                    {/* Secciones del módulo */}
                    <div className="p-4 space-y-4 bg-gray-900/40">
                      {mod.sections.map(section => {
                        const sectionKeys = section.permissions.map(p => p.key);
                        const allSecActive = sectionKeys.every(k => currentPermissions.includes(k));
                        return (
                          <div key={section.label}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                {section.label}
                              </span>
                              {!isSuperAdmin(selectedRole) && sectionKeys.length > 1 && (
                                <button
                                  onClick={() => toggleSection(sectionKeys)}
                                  className="text-[11px] text-indigo-400 hover:text-indigo-300 px-1.5 py-0.5 rounded hover:bg-indigo-900/30 transition-all"
                                >
                                  {allSecActive ? 'Ninguno' : 'Todos'}
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {section.permissions.map(perm => {
                                const active = currentPermissions.includes(perm.key);
                                return (
                                  <button
                                    key={perm.key}
                                    onClick={() => handleTogglePermission(perm.key, active)}
                                    disabled={isSuperAdmin(selectedRole)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all disabled:cursor-not-allowed ${
                                      active
                                        ? 'border-indigo-500 bg-indigo-900/30 hover:bg-indigo-900/50'
                                        : 'border-gray-700 bg-gray-800/40 hover:border-gray-500 hover:bg-gray-800/80'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                      active ? 'bg-indigo-500 border-indigo-500' : 'border-gray-600 bg-transparent'
                                    }`}>
                                      {active && <Check size={10} strokeWidth={3} className="text-white" />}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-medium text-white truncate">{perm.label}</div>
                                      <div className="text-[10px] text-gray-500 font-mono truncate">{perm.key}</div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Barra de acciones flotante */}
              {hasUnsavedChanges && !isSuperAdmin(selectedRole) && (
                <div className="sticky bottom-4 flex items-center justify-between gap-4 bg-gray-800 border border-amber-600/40 rounded-xl px-4 py-3 shadow-xl">
                  <div className="flex items-center gap-2 text-sm text-amber-300">
                    <AlertTriangle size={15} />
                    <span>{diffCount} cambio{diffCount !== 1 ? 's' : ''} sin guardar</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setCurrentPermissions([...savedPermissions]); }}
                      className="px-3 py-1.5 text-xs text-gray-300 hover:text-white border border-gray-600 rounded-lg hover:bg-gray-700 transition-all"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-lg disabled:opacity-50 transition-all"
                    >
                      {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: cambios sin guardar al cambiar rol */}
      {showUnsavedWarning && pendingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 rounded-xl border border-gray-600 w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle size={18} />
              <h3 className="font-semibold">Cambios sin guardar</h3>
            </div>
            <p className="text-sm text-gray-300">
              Tienes <strong className="text-white">{diffCount}</strong> cambio{diffCount !== 1 ? 's' : ''} sin guardar en <strong className="text-white">{selectedRole?.name}</strong>. ¿Qué deseas hacer?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  await handleSave();
                  setShowUnsavedWarning(false);
                  if (pendingRole) { loadRole(pendingRole); setPendingRole(null); }
                }}
                className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-all"
              >
                Guardar y cambiar de rol
              </button>
              <button
                onClick={() => {
                  setShowUnsavedWarning(false);
                  if (pendingRole) { loadRole(pendingRole); setPendingRole(null); }
                }}
                className="w-full py-2 border border-gray-600 text-gray-300 hover:text-white text-sm rounded-lg hover:bg-gray-700 transition-all"
              >
                Descartar cambios y cambiar
              </button>
              <button
                onClick={() => { setShowUnsavedWarning(false); setPendingRole(null); }}
                className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {(modal === 'create' || modal === 'edit') && (
        <RoleModal
          role={modal === 'edit' ? editing : null}
          onClose={() => { setModal('none'); setEditing(null); }}
          onSave={() => { setModal('none'); setEditing(null); load(); }}
        />
      )}
      {modal === 'diff' && (
        <DiffModal
          roles={roles}
          onClose={() => setModal('none')}
        />
      )}

      {cloneDialogRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 flex flex-col gap-4">
            <h3 className="text-base font-semibold text-gray-900">Clonar rol</h3>
            <p className="text-sm text-gray-500">Nombre para el clon de <strong>{cloneDialogRole.name}</strong>:</p>
            <input
              type="text"
              value={cloneDialogName}
              onChange={e => setCloneDialogName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doClone(); if (e.key === 'Escape') setCloneDialogRole(null); }}
              autoFocus
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setCloneDialogRole(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={doClone} disabled={!cloneDialogName.trim()} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">Clonar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
