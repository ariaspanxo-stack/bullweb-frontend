import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import authService from '@/services/authService';
import { queryClient } from '@/lib/queryClient';

// ============================================================================
// TIPOS
// ============================================================================

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  serverDown: boolean;
  expiresAt: number | null;   // timestamp ms — fin del turno
  isSuperAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: (reason?: 'shift_expired' | 'manual') => void;
  extendShift: () => void;
  loadUser: () => Promise<void>;
  updateUser: (user: User) => void;
  setLoading: (isLoading: boolean) => void;
}

// ============================================================================
// STORE DE AUTENTICACIÓN
// ============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      serverDown: false,
      expiresAt: null,
      isSuperAdmin: false,

      /**
       * Iniciar sesión
       */
      login: (token: string, user: User) => {
        const u = user as any;
        const isSuperAdmin: boolean = u.isSuperAdmin ?? false;
        // expiresAt viene del backend; si no viene, calcular localmente
        const expiresAt: number = u.expiresAt
          ? Number(u.expiresAt)
          : isSuperAdmin
          ? Date.now() + 30 * 24 * 60 * 60 * 1000
          : Date.now() + 8 * 60 * 60 * 1000;
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
          serverDown: false,
          expiresAt,
          isSuperAdmin,
        });
      },

      /**
       * Cerrar sesión
       */
      logout: (reason?: 'shift_expired' | 'manual') => {
        if (reason === 'shift_expired') {
          localStorage.setItem('bw_session_expired', '1');
        } else {
          localStorage.removeItem('bw_session_expired');
        }
        authService.logout();
        queryClient.clear();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          serverDown: false,
          expiresAt: null,
          isSuperAdmin: false,
        });
      },

      /**
       * Extender turno 8h más (desde el modal de aviso)
       */
      extendShift: () => {
        const newExpiry = Date.now() + 8 * 60 * 60 * 1000;
        set({ expiresAt: newExpiry });
      },

      /**
       * Cargar usuario desde el token guardado.
       * Si el token local es válido y el turno no expiró, restaura la sesión
       * de forma instantánea sin llamada de red.
       */
      loadUser: async () => {
        const { token, user: persistedUser, expiresAt, isSuperAdmin } = get();

        if (!token) {
          set({ isLoading: false, isAuthenticated: false, serverDown: false });
          return;
        }

        // ── Comprobar expiración de turno ───────────────────────────────
        if (expiresAt && !isSuperAdmin && Date.now() > expiresAt) {
          console.warn('[AUTH] Turno expirado → cerrando sesión automáticamente');
          localStorage.setItem('bw_session_expired', '1');
          authService.logout();
          set({ user: null, token: null, isAuthenticated: false, isLoading: false, expiresAt: null, isSuperAdmin: false, serverDown: false });
          return;
        }

        // ── Validación local del JWT (sin red) ─────────────────────────
        try {
          const base64Payload = token.split('.')[1]
            ?.replace(/-/g, '+')
            .replace(/_/g, '/');
          const payload = JSON.parse(atob(base64Payload));
          const isExpired = payload.exp * 1000 < Date.now();

          if (!isExpired && persistedUser) {
            // Token JWT vigente + usuario en cache → sesión restaurada al instante
            set({ isAuthenticated: true, isLoading: false, serverDown: false });

            // Refrescar datos del usuario en segundo plano (silencioso)
            authService.getMe().then(user => {
              set({ user });
            }).catch(() => {
              // Error de red en background: ignorar, la sesión sigue activa
            });
            return;
          }
        } catch {
          // Token malformado → continuar con validación de red
        }

        // ── Token JWT expirado o malformado → validar contra el servidor ──
        try {
          set({ isLoading: true });
          const user = await authService.getMe();
          set({ user, isAuthenticated: true, isLoading: false, serverDown: false });
        } catch (error: any) {
          const status = error?.response?.status ?? error?.status;

          if (status === 401 || status === 403) {
            console.warn('[AUTH] Token inválido (status', status, ') → cerrando sesión');
            set({ user: null, token: null, isAuthenticated: false, isLoading: false, expiresAt: null, isSuperAdmin: false, serverDown: false });
          } else {
            // Error de red (502/503/sin conexión) → mantener sesión si la había
            const { user: existingUser } = get();
            const isServerDown = status === 502 || status === 503 || !status;
            console.warn('[AUTH] Error de red (status', status ?? 'network', ') → serverDown:', isServerDown);
            set({
              isLoading: false,
              isAuthenticated: !!existingUser,
              serverDown: isServerDown && !existingUser,
            });
          }
        }
      },

      /**
       * Actualizar datos del usuario
       */
      updateUser: (user: User) => {
        set({ user });
      },

      /**
       * Establecer estado de carga
       */
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token:           state.token,
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
        expiresAt:       state.expiresAt,
        isSuperAdmin:    state.isSuperAdmin,
      })
    }
  )
);
