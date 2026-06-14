// ═══════════════════════════════════════════════════════════════
// withRetry — Resiliencia de red para llamadas críticas al backend
// Solo reintenta errores de red (status 0 / sin respuesta).
// NO reintenta errores 4xx (errores de datos/negocio).
// ═══════════════════════════════════════════════════════════════

const showToast = (type: 'error' | 'warning' | 'success', message: string) => {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { type, message } }));
};

/**
 * Ejecuta `fn` con reintentos automáticos ante errores de red.
 * @param fn        Función async a ejecutar (llamada a API)
 * @param retries   Número máximo de intentos (default: 3)
 * @param delayMs   Espera entre intentos en ms (default: 5000)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 5000,
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await fn();
      if (attempt > 0) {
        // Se recuperó tras reintentos
        showToast('success', '✅ Conexión recuperada — solicitud enviada');
      }
      return result;
    } catch (err: any) {
      const status: number | undefined = err?.status;

      // No reintentar errores 4xx (problemas de datos/negocio/auth)
      if (status && status >= 400 && status < 500) {
        throw err;
      }

      const isLast = attempt === retries - 1;
      if (isLast) {
        showToast('error', '⚠️ Sin conexión — no se pudo enviar la solicitud');
        throw err;
      }

      if (attempt === 0) {
        showToast('error', '⚠️ Sin conexión — reintentando en 5s...');
      } else {
        showToast('warning', `🔄 Reintentando envío (intento ${attempt + 1}/${retries - 1})...`);
      }

      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  // Nunca se alcanza, pero TypeScript lo requiere
  throw new Error('withRetry: max retries exceeded');
}
