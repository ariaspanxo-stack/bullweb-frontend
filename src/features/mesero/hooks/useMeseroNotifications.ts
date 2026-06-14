// ═══════════════════════════════════════════════════════════════
// HOOK: useMeseroNotifications — Notificaciones push + vibración
// ═══════════════════════════════════════════════════════════════

export function useMeseroNotifications() {

  // Pedir permiso al montar
  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  };

  // Notificación cuando todos los platos de una mesa están listos
  const notifyOrderReady = (tableNumber: string) => {
    if (Notification.permission !== 'granted') return;
    new Notification('¡Platos listos! ✅', {
      body:              `Mesa ${tableNumber} — todos los platos están listos`,
      icon:              '/icon-192.png',
      badge:             '/icon-192.png',
      tag:               `order-ready-${tableNumber}`, // evita duplicados
      requireInteraction: true, // no desaparece sola en móvil
    });
  };

  // Vibración en móvil (sin notificación)
  const vibrate = (pattern: number[] = [200, 100, 200]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  return { requestPermission, notifyOrderReady, vibrate };
}
