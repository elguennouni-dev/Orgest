// Mode hors ligne : cache de lecture (stock, prix, profil) + file d'attente des ventes, en IndexedDB
// (repli mémoire si indisponible, ex. tests). Chaque vente en file porte un `clientRef` : le serveur est idempotent.
const mem = { kv: new Map(), queue: new Map() };
let dbp = null;

function db() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!dbp) {
    dbp = new Promise((resolve) => {
      try {
        const r = indexedDB.open('orgest-offline', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('queue', { keyPath: 'clientRef' }); };
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }
  return dbp;
}

const wrap = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });

async function store(name, mode, fn, memFn) {
  const d = await db();
  if (!d) return memFn(mem[name]);
  return wrap(fn(d.transaction(name, mode).objectStore(name)));
}

export const kvGet = (k) => store('kv', 'readonly', (s) => s.get(k), (m) => m.get(k)).then((v) => v ?? null);
export const kvSet = (k, v) => store('kv', 'readwrite', (s) => s.put(v, k), (m) => { m.set(k, v); });
export const queueAll = () => store('queue', 'readonly', (s) => s.getAll(), (m) => [...m.values()]).then((a) => (a || []).sort((x, y) => x.at - y.at));
export const queuePut = (e) => store('queue', 'readwrite', (s) => s.put(e), (m) => { m.set(e.clientRef, e); });
export const queueDelete = (ref) => store('queue', 'readwrite', (s) => s.delete(ref), (m) => { m.delete(ref); });

/** Vide le cache local (déconnexion : l'appareil peut être partagé). La file de ventes est conservée. */
export async function clearCache() {
  const d = await db();
  if (!d) { mem.kv.clear(); return; }
  await wrap(d.transaction('kv', 'readwrite').objectStore('kv').clear());
}

export const newRef = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `r${Date.now()}${Math.random().toString(16).slice(2)}`);

/** Une panne réseau (fetch rejeté) — par opposition à une réponse d'erreur du serveur. */
export const isNetworkError = (e) => !(e && typeof e === 'object' && 'status' in e) && (e instanceof TypeError || e?.name === 'TypeError');

// ---- Cache de lecture ----
const CACHEABLE = [/^\/auth\/me$/, /^\/shop\/prices$/, /^\/shop\/customers\?/];
const ITEMS = /^\/shop\/items\?status=IN_STOCK/;
export const cacheKey = (path) => (ITEMS.test(path) ? 'items' : CACHEABLE.some((r) => r.test(path)) ? 'get:' + path : null);

/** Filtre local de la liste d'articles en cache (même logique que la recherche serveur : nom ou référence). */
export function filterItems(list, q, karat) {
  const s = String(q || '').trim().toLowerCase();
  return (list || []).filter((i) => (!karat || i.karat === Number(karat))
    && (!s || String(i.name).toLowerCase().includes(s) || String(i.ref).toLowerCase().includes(s)));
}

export function paramsOf(path) {
  const p = new URLSearchParams(path.split('?')[1] || '');
  return { q: p.get('q') || '', karat: Number(p.get('karat') || 0), size: Number(p.get('size') || 24) };
}

/** Écrit la réponse réseau dans le cache (liste d'articles : seulement la liste complète, sans filtre). */
export async function remember(path, data) {
  const key = cacheKey(path);
  if (!key) return;
  if (key === 'items') {
    const { q, karat } = paramsOf(path);
    if (!q && !karat && Array.isArray(data?.content) && data.total <= data.content.length) await kvSet('items', data.content);
    return;
  }
  await kvSet(key, data);
}

/** Réponse de repli hors ligne, ou undefined si rien en cache. */
export async function fallback(path) {
  const key = cacheKey(path);
  if (!key) return undefined;
  if (key === 'items') {
    const all = await kvGet('items');
    if (!all) return undefined;
    const { q, karat, size } = paramsOf(path);
    const f = filterItems(all, q, karat);
    return { content: f.slice(0, size), total: f.length, page: 0, size };
  }
  const v = await kvGet(key);
  return v ?? undefined;
}

/** Décrémente le stock en cache après une vente hors ligne (évite de revendre la même pièce). */
export async function decrementStock(lines) {
  const all = await kvGet('items');
  if (!all) return;
  const by = new Map(lines.filter((l) => l.itemId).map((l) => [l.itemId, l.quantity || 1]));
  const next = all.map((i) => (by.has(i.id) ? { ...i, quantity: (i.quantity ?? 1) - by.get(i.id) } : i)).filter((i) => (i.quantity ?? 1) > 0);
  await kvSet('items', next);
}

/**
 * Envoie la file dans l'ordre. send(body) → résolu si le serveur a accepté (ou connaît déjà le clientRef).
 * - succès : retiré ; - panne réseau / 5xx : on s'arrête (réessai plus tard) ; - refus 4xx : marqué « failed » avec le code.
 */
export async function syncQueue(send) {
  const out = { sent: 0, failed: 0, pending: 0 };
  const items = await queueAll();
  for (let i = 0; i < items.length; i += 1) {
    const e = items[i];
    if (e.failed) { out.failed += 1; continue; }
    try {
      await send(e.body);
      await queueDelete(e.clientRef);
      out.sent += 1;
    } catch (err) {
      if (isNetworkError(err) || !err?.status || err.status >= 500) { out.pending += items.length - i; break; }
      await queuePut({ ...e, failed: true, code: err.code || 'ERROR' });
      out.failed += 1;
    }
  }
  return out;
}
