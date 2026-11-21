// Client REST : cookies HttpOnly (JWT) + en-tête CSRF (double-submit cookie XSRF-TOKEN).
import { fallback, isNetworkError, remember } from './lib/offline.js';
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export class ApiError extends Error {
  constructor(status, code, data) {
    super(code || 'ERROR');
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export async function ensureCsrf(force = false) {
  if (force || !getCookie('XSRF-TOKEN')) {
    await fetch('/api/auth/csrf', { credentials: 'same-origin', headers: { 'X-Orgest-Client': 'web' } });
  }
}

export async function api(path, { method = 'GET', body, form } = {}, retried = false) {
  const headers = { Accept: 'application/json', 'X-Orgest-Client': 'web' };
  if (method !== 'GET') {
    await ensureCsrf();
    const token = getCookie('XSRF-TOKEN');
    if (token) headers['X-XSRF-TOKEN'] = token;
  }
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: payload, credentials: 'same-origin' });
  } catch (e) {
    // Hors ligne : les lectures essentielles (profil, prix, stock, clients) sont servies depuis le cache local.
    if (method === 'GET' && isNetworkError(e)) { const cached = await fallback(path); if (cached !== undefined) return cached; }
    throw e;
  }
  if (res.status === 204) return null;
  const isJson = (res.headers.get('content-type') || '').includes('json');
  const data = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const code = data && data.code;
    if (res.status === 403 && code === 'FORBIDDEN' && method !== 'GET' && !retried) {
      await ensureCsrf(true);
      return api(path, { method, body, form }, true);
    }
    if (res.status === 401 && path !== '/auth/login') window.dispatchEvent(new Event('orgest:unauth'));
    if (code === 'SUBSCRIPTION_EXPIRED') window.dispatchEvent(new Event('orgest:expired'));
    throw new ApiError(res.status, code, data);
  }
  if (method === 'GET') remember(path, data).catch(() => {});
  return data;
}

export async function download(path, filename) {
  const res = await fetch('/api' + path, { credentials: 'same-origin', headers: { 'X-Orgest-Client': 'web' } });
  if (!res.ok) throw new ApiError(res.status, 'DOWNLOAD_FAILED');
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
