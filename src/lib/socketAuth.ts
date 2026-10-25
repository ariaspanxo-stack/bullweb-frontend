// ═══════════════════════════════════════════════════════════════
// TAREA 281 — Credencial del handshake de Socket.IO
// El backend rechaza sockets sin credencial y ata cada conexión a un tenant.
// Se pasa como función para que cada reconexión lea el token vigente.
// ═══════════════════════════════════════════════════════════════

type AuthCb = (data: Record<string, string>) => void;

const read = (key: string) => {
  try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
};

/** Panel (POS, KDS, alertas): JWT del usuario */
export const staffSocketAuth = (cb: AuthCb) => cb({ token: read('bullweb_token') });

/** App mesero: JWT de mesero */
export const waiterSocketAuth = (cb: AuthCb) => cb({ token: read('waiterToken') });

/** Hooks compartidos entre panel y app mesero: elige según la ruta */
export const contextSocketAuth = (cb: AuthCb) =>
  cb({ token: window.location.pathname.startsWith('/mesero') ? read('waiterToken') : read('bullweb_token') });

/** Quiosco de asistencia público: solo recibe avisos sin datos */
export const kioskSocketAuth = (tenantId: string) => (cb: AuthCb) => cb({ kioskTenantId: tenantId });
