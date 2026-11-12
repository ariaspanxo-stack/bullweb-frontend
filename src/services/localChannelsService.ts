// LOTE 324: Config > Local (enlace de resenas Google) y Config > Canales (Pantalla de pedidos).
import api from './api';

export interface LocalSettings {
  googleReviewUrl: string | null;
  valid:           boolean;
  qrPrintable:     boolean;
}

export interface ChannelsSettings {
  available: boolean;
  tvEnabled: boolean;
  tvToken:   string | null;
}

export const localChannelsService = {
  async getLocal(): Promise<LocalSettings> {
    const res = await api.get('/settings/local');
    return res.data as LocalSettings;
  },
  async saveLocal(googleReviewUrl: string | null): Promise<LocalSettings> {
    const res = await api.patch('/settings/local', { googleReviewUrl });
    return res.data as LocalSettings;
  },
  async getChannels(): Promise<ChannelsSettings> {
    const res = await api.get('/settings/channels');
    return res.data as ChannelsSettings;
  },
  async setTv(tvEnabled: boolean): Promise<ChannelsSettings> {
    const res = await api.patch('/settings/channels', { tvEnabled });
    return res.data as ChannelsSettings;
  },
  async regenerateTv(): Promise<ChannelsSettings> {
    const res = await api.post('/settings/channels/tv-token', {});
    return res.data as ChannelsSettings;
  },
};

/** Misma regla que el backend (src/shared/utils/google-review.ts): google.<tld>/maps, maps.google.<tld> o g.page, https. */
export function isGoogleReviewUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s || s.length > 500 || /\s/.test(s) || /[^\x21-\x7e]/.test(s)) return false;
  let u: URL;
  try { u = new URL(s); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return false;
  const host = u.hostname.toLowerCase();
  if (host === 'g.page' || host === 'www.g.page') return u.pathname.length > 1;
  if (/^maps\.google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)) return true;
  if (/^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)) return u.pathname === '/maps' || u.pathname.startsWith('/maps/');
  return false;
}

export const GOOGLE_REVIEW_QR_MAX = 124;

export const tvUrl = (token: string) => `${window.location.origin}/tv/${token}`;
