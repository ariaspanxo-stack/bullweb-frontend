/**
 * Sonido de alerta para nuevos pedidos QR.
 * Usa Web Audio API (sin archivos externos).
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(
  audioCtx: AudioContext,
  freq:     number,
  start:    number,
  duration: number,
  vol:      number,
) {
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.01);
  gain.gain.linearRampToValueAtTime(0,   start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/**
 * Secuencia de 4 pitidos ascendentes.
 * @param volume  0.0 – 1.0  (default 0.8)
 */
export function playOrderAlert(volume = 0.8): void {
  try {
    const audioCtx = getCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    beep(audioCtx, 440, now + 0.0,  0.15, volume);
    beep(audioCtx, 560, now + 0.2,  0.15, volume);
    beep(audioCtx, 660, now + 0.4,  0.15, volume);
    beep(audioCtx, 880, now + 0.6,  0.25, volume); // beep final más largo
  } catch {
    /* Browsers pueden bloquear AudioContext sin interacción — se ignora */
  }
}
