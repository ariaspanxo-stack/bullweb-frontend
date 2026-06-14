// ═══════════════════════════════════════════════════════════════
// ELAPSED TIME — componente reutilizable de tiempo transcurrido
// Alerta visual: gris < 15min, amber 15-30min, rojo > 30min
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

interface Props {
  createdAt: string;
}

export function ElapsedTime({ createdAt }: Props) {
  const [elapsed, setElapsed] = useState('');
  const [mins,    setMins]    = useState(0);

  useEffect(() => {
    const update = () => {
      const d = new Date(createdAt);
      if (!createdAt || isNaN(d.getTime())) {
        setElapsed('--');
        setMins(0);
        return;
      }
      const m = Math.floor((Date.now() - d.getTime()) / 60_000);
      setMins(m);
      if (m < 1)       setElapsed('ahora');
      else if (m < 60) setElapsed(`${m}m`);
      else             setElapsed(`${Math.floor(m / 60)}h ${m % 60}m`);
    };
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [createdAt]);

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0
      ${mins > 30 ? 'bg-red-100 text-red-600'
      : mins > 15 ? 'bg-amber-100 text-amber-600'
      :             'bg-gray-100 text-gray-500'
      }`}>
      ⏱ {elapsed}
    </span>
  );
}
