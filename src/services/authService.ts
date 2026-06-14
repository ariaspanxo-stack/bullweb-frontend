import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface TwoFactorRequired {
  requiresTwoFactor: true;
  tempToken: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse | TwoFactorRequired> {
    try {
      console.log('[AUTH] Enviando credenciales:', { email: credentials.email });
      
      const response = await api.post('/auth/login', credentials);
      
      console.log('[AUTH] Respuesta completa del servidor:', response.data);

      // Extraer data (puede venir envuelta o directa)
      const data = response.data?.data ?? response.data;

      // Caso 2FA: requiresTwoFactor + tempToken
      if (data?.requiresTwoFactor && data?.tempToken) {
        console.log('[AUTH] Formato detectado: 2FA REQUERIDO');
        return { requiresTwoFactor: true as const, tempToken: data.tempToken };
      }
      
      let token: string;
      let user: any;
      
      // CASO 1: Respuesta directa { token, user }
      if (response.data.token && response.data.user) {
        console.log('[AUTH] Formato detectado: DIRECTO');
        token = response.data.token;
        user = response.data.user;
      }
      // CASO 2: Respuesta envuelta { data: { token, user } }
      else if (response.data.data?.token && response.data.data?.user) {
        console.log('[AUTH] Formato detectado: ENVUELTO EN DATA');
        token = response.data.data.token;
        user = response.data.data.user;
      }
      // CASO 3: Respuesta con success { success, token, user }
      else if (response.data.success && response.data.token && response.data.user) {
        console.log('[AUTH] Formato detectado: CON SUCCESS');
        token = response.data.token;
        user = response.data.user;
      }
      // CASO 4: Error - formato no reconocido
      else {
        console.error('[AUTH] Formato de respuesta no reconocido:', response.data);
        throw new Error('Formato de respuesta inesperado del servidor');
      }
      
      if (!token) {
        console.error('[AUTH] Token no encontrado en respuesta');
        throw new Error('Token no recibido del servidor');
      }
      
      if (!user) {
        console.error('[AUTH] User no encontrado en respuesta');
        throw new Error('Datos de usuario no recibidos del servidor');
      }

      // Normalizar: backend devuelve "roles" (plural) pero el frontend usa "role"
      if (!user.role && user.roles) {
        user = { ...user, role: user.roles };
      }
      
      console.log('[AUTH] Token extraído:', token.substring(0, 20) + '...');
      console.log('[AUTH] Usuario extraído:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
      
      // Guardar en localStorage
      localStorage.setItem('bullweb_token', token);
      localStorage.setItem('bullweb_user', JSON.stringify(user));
      
      console.log('[AUTH] Login exitoso, datos guardados en localStorage');
      
      return { token, user };
      
    } catch (error: any) {
      console.error('[AUTH] Error completo en login:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Tenant suspendido/cancelado — propagar como error especial
      const code = error.data?.code ?? error.response?.data?.code;
      if (code === 'TENANT_SUSPENDED') {
        const e = new Error('Tu cuenta está suspendida. Contacta al administrador de BullWeb Chile.') as any;
        e.code = 'TENANT_SUSPENDED';
        throw e;
      }
      if (code === 'TENANT_CANCELLED') {
        const e = new Error('Tu cuenta ha sido cancelada.') as any;
        e.code = 'TENANT_CANCELLED';
        throw e;
      }
      
      throw new Error(
        error.response?.data?.message || 
        error.response?.data?.error || 
        'Error al iniciar sesión'
      );
    }
  }

  logout(): void {
    localStorage.removeItem('bullweb_token');
    localStorage.removeItem('bullweb_user');
    // Limpiar también el store de Zustand para evitar que
    // isAuthenticated:true persista tras el redirect de logout
    localStorage.removeItem('auth-storage');
    window.location.href = '/login';
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('bullweb_user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('bullweb_token');
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  async getMe(): Promise<User> {
    try {
      const response = await api.get('/auth/me');
      
      // Manejar formato envuelto en data
      let user: any;
      if (response.data.data) {
        user = response.data.data;
      } else {
        user = response.data;
      }
      
      // Normalizar: backend puede devolver "roles" (plural)
      if (!user.role && user.roles) {
        user = { ...user, role: user.roles };
      }

      // Actualizar usuario en localStorage
      localStorage.setItem('bullweb_user', JSON.stringify(user));
      
      return user;
    } catch (error: any) {
      console.error('[AUTH] Error en getMe:', error);
      throw error;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('bullweb_token');
  }

  async updateProfile(data: { name?: string; email?: string }): Promise<any> {
    const response = await api.patch('/auth/profile', data);
    let user = response.data?.data ?? response.data;
    if (!user.role && user.roles) {
      user = { ...user, role: user.roles };
    }
    localStorage.setItem('bullweb_user', JSON.stringify(user));
    return user;
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await api.post('/auth/change-password', data);
  }

  // ── 2FA TOTP ──────────────────────────────────────────────────────────────

  async get2FAStatus(): Promise<{ enabled: boolean }> {
    const response = await api.get('/auth/2fa/status');
    return response.data?.data ?? response.data;
  }

  async setup2FA(): Promise<{ secret: string; qrDataUrl: string; otpauthUrl: string }> {
    const response = await api.post('/auth/2fa/setup');
    return response.data?.data ?? response.data;
  }

  async confirm2FA(token: string): Promise<{ success: boolean; recoveryCodes?: string[] }> {
    const response = await api.post('/auth/2fa/confirm', { token });
    return response.data?.data ?? response.data;
  }

  async completeTwoFactorLogin(
    tempToken: string,
    code: string,
  ): Promise<{ token: string; user: any }> {
    const response = await api.post('/auth/2fa/verify', { tempToken, code });
    return response.data?.data ?? response.data;
  }

  async disable2FA(token: string): Promise<void> {
    await api.post('/auth/2fa/disable', { token });
  }
}

export default new AuthService();
