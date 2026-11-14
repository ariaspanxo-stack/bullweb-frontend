// TAREA 335: reloj compartido del KDS (un solo setInterval de 1 s para toda la pantalla).
// Cada componente lee solo lo que necesita con un selector: el ticket se repinta cuando cambia su nivel de semaforo,
// y solo el texto mm:ss se repinta cada segundo (300 tickets sin repintar la grilla completa).
import { useSyncExternalStore } from 'react';

let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const subs = new Set<() => void>();

function subscribe(cb: () => void) {
  subs.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      subs.forEach((f) => f());
    }, 1000);
  }
  return () => {
    subs.delete(cb);
    if (!subs.size && timer) { clearInterval(timer); timer = null; }
  };
}

const read = () => (timer ? now : (now = Date.now()));

export function useNow<T>(select: (n: number) => T): T {
  return useSyncExternalStore(subscribe, () => select(read()));
}
