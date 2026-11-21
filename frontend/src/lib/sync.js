import { api } from '../api.js';
import { decrementStock, isNetworkError, kvSet, newRef, queueAll, queueDelete, queuePut, syncQueue } from './offline.js';

export const OFFLINE_EVENT = 'orgest:queue';
const notify = () => window.dispatchEvent(new Event(OFFLINE_EVENT));

/** Télécharge tout le stock disponible pour pouvoir vendre sans connexion (pagination, 2000 articles max). */
export async function prefetchStock() {
  const all = [];
  for (let page = 0; page < 20; page += 1) {
    const r = await api(`/shop/items?status=IN_STOCK&q=&karat=0&page=${page}&size=100`);
    all.push(...r.content);
    if (all.length >= r.total || r.content.length === 0) break;
  }
  await kvSet('items', all);
}

/** Met une vente en file d'attente locale (appelée quand le serveur est injoignable). */
export async function enqueueSale(body, summary) {
  const clientRef = body.clientRef || newRef();
  const entry = { clientRef, at: Date.now(), body: { ...body, clientRef }, summary };
  await queuePut(entry);
  await decrementStock(body.lines);
  notify();
  return entry;
}

let running = false;
/** Envoie les ventes en attente ; sans effet si déjà en cours. */
export async function flushQueue() {
  if (running) return null;
  running = true;
  try {
    const r = await syncQueue((body) => api('/shop/sales', { method: 'POST', body }));
    if (r.sent > 0) prefetchStock().catch(() => {});
    return r;
  } finally { running = false; notify(); }
}

export const pendingSales = () => queueAll();
export const discardSale = async (ref) => { await queueDelete(ref); notify(); };
export { isNetworkError };
