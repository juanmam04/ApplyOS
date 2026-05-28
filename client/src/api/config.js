/** Origen del backend Express (sin /api). En dev vacío → proxy de Vite a localhost:47291 */
const origin = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const API_BASE = origin ? `${origin}/api` : '/api';

export function apiUrl(path = '') {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
