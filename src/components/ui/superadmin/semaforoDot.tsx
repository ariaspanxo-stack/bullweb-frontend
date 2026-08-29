const SEMAFORO: Record<string, { label: string; dot: string }> = {
  green:  { label: 'Activo',   dot: 'bg-emerald-400' },
  yellow: { label: 'Sin act.', dot: 'bg-yellow-400'  },
  red:    { label: 'Crítico',  dot: 'bg-red-500'     },
};

export function SemaforoDot({ status }: { status: string }) {
  const info = SEMAFORO[status] ?? { label: status, dot: 'bg-gray-500' };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${info.dot}`} />
      {info.label}
    </span>
  );
}
