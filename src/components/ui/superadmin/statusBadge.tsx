type BadgeKind = 'tenant' | 'payment' | 'plan' | 'order' | 'audit';

type BadgeStyle = {
  label: string;
  pill: string;
};

const SEMANTIC = {
  emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  amber:   'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  rose:    'bg-rose-500/10 text-rose-400 ring-rose-500/20',
  gray:    'bg-gray-500/10 text-gray-400 ring-gray-500/20',
  sky:     'bg-sky-500/10 text-sky-400 ring-sky-500/20',
  brand:   'bg-brand-500/10 text-brand-400 ring-brand-500/20',
} as const;

const MAPS: Record<BadgeKind, Record<string, BadgeStyle>> = {
  tenant: {
    ACTIVE:    { label: 'Activo',   pill: SEMANTIC.emerald },
    TRIAL:     { label: 'Trial',    pill: SEMANTIC.amber },
    PAST_DUE:  { label: 'Vencido',  pill: SEMANTIC.rose },
    SUSPENDED: { label: 'Suspendido', pill: SEMANTIC.gray },
  },
  payment: {
    PAID:      { label: 'Pagado',    pill: SEMANTIC.emerald },
    PENDING:   { label: 'Pendiente', pill: SEMANTIC.amber },
    OVERDUE:   { label: 'Vencido',   pill: SEMANTIC.rose },
    FAILED:    { label: 'Fallido',   pill: SEMANTIC.rose },
    REFUNDED:  { label: 'Reembolsado', pill: SEMANTIC.sky },
    CANCELLED: { label: 'Cancelado', pill: SEMANTIC.gray },
  },
  plan: {
    STARTER: { label: 'Starter', pill: SEMANTIC.brand },
    PRO:     { label: 'Pro',     pill: SEMANTIC.sky },
    ENTERPRISE: { label: 'Enterprise', pill: SEMANTIC.brand },
  },
  order: {
    PENDING:   { label: 'Pendiente', pill: SEMANTIC.amber },
    PREPARING: { label: 'Preparando', pill: SEMANTIC.sky },
    READY:     { label: 'Listo',     pill: SEMANTIC.emerald },
    DELIVERED: { label: 'Entregado', pill: SEMANTIC.gray },
    CANCELLED: { label: 'Cancelado', pill: SEMANTIC.rose },
  },
  audit: {
    SUSPEND_TENANT:    { label: '🔴 Suspensión',      pill: SEMANTIC.rose },
    ACTIVATE_TENANT:   { label: '🟢 Activación',      pill: SEMANTIC.emerald },
    CHANGE_PLAN:       { label: '🔄 Cambio plan',     pill: SEMANTIC.sky },
    IMPERSONATE:       { label: '👤 Impersonación',   pill: SEMANTIC.amber },
    EXTEND_TRIAL:      { label: '⏳ Extender trial',  pill: SEMANTIC.sky },
    CLEAN_DEMO:        { label: '🧹 Limpieza demo',   pill: SEMANTIC.gray },
    CREATE_PAYMENT:    { label: '💳 Pago registrado', pill: SEMANTIC.emerald },
    CREATE_TENANT:     { label: '🏪 Nuevo cliente',   pill: SEMANTIC.brand },
    UPDATE_PLAN_PRICE: { label: '💲 Cambio precio plan', pill: SEMANTIC.brand },
  },
};

export function StatusBadge({ status, kind }: { status: string; kind: BadgeKind }) {
  const entry = MAPS[kind]?.[status] ?? { label: status, pill: SEMANTIC.gray };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${entry.pill}`}>
      {entry.label}
    </span>
  );
}
