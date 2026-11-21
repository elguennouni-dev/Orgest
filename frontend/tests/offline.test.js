import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheKey, decrementStock, fallback, filterItems, isNetworkError, kvGet, kvSet, queueAll, queuePut, remember, syncQueue } from '../src/lib/offline.js';

const items = [
  { id: 1, ref: 'A-00001', name: 'Bague Soleil', karat: 18, quantity: 1 },
  { id: 2, ref: 'A-00002', name: 'Bracelet', karat: 21, quantity: 3 },
];

beforeEach(async () => {
  for (const e of await queueAll()) await (await import('../src/lib/offline.js')).queueDelete(e.clientRef);
  await kvSet('items', null);
});

describe('cache de lecture', () => {
  it('ne met en cache que les chemins prévus', () => {
    expect(cacheKey('/shop/items?status=IN_STOCK&q=&karat=0&size=60')).toBe('items');
    expect(cacheKey('/shop/prices')).toBe('get:/shop/prices');
    expect(cacheKey('/shop/sales')).toBeNull();
    expect(cacheKey('/shop/items?status=SOLD')).toBeNull();
  });
  it('filtre par nom, référence et carat', () => {
    expect(filterItems(items, 'brac', 0).map((i) => i.id)).toEqual([2]);
    expect(filterItems(items, 'a-00001', 0).map((i) => i.id)).toEqual([1]);
    expect(filterItems(items, '', 18).map((i) => i.id)).toEqual([1]);
  });
  it('repli hors ligne : liste complète mémorisée puis filtrée', async () => {
    await remember('/shop/items?status=IN_STOCK&q=&karat=0&size=60', { content: items, total: 2, page: 0, size: 60 });
    const r = await fallback('/shop/items?status=IN_STOCK&q=bag&karat=0&size=60');
    expect(r.content.map((i) => i.id)).toEqual([1]);
  });
  it('une liste partielle ou filtrée n’écrase pas le cache', async () => {
    await kvSet('items', items);
    await remember('/shop/items?status=IN_STOCK&q=bag&karat=0&size=60', { content: [items[0]], total: 1 });
    await remember('/shop/items?status=IN_STOCK&q=&karat=0&size=60', { content: [items[0]], total: 5 });
    expect((await kvGet('items')).length).toBe(2);
  });
  it('décrémente le stock local après une vente hors ligne', async () => {
    await kvSet('items', items);
    await decrementStock([{ itemId: 1, quantity: 1 }, { itemId: 2, quantity: 2 }]);
    const left = await kvGet('items');
    expect(left.map((i) => [i.id, i.quantity])).toEqual([[2, 1]]);
  });
});

describe('file de synchronisation', () => {
  const entry = (ref, at) => ({ clientRef: ref, at, body: { clientRef: ref } });
  it('envoie dans l’ordre et vide la file', async () => {
    await queuePut(entry('b', 2)); await queuePut(entry('a', 1));
    const sent = [];
    const r = await syncQueue(async (b) => { sent.push(b.clientRef); });
    expect(sent).toEqual(['a', 'b']);
    expect(r).toEqual({ sent: 2, failed: 0, pending: 0 });
    expect(await queueAll()).toEqual([]);
  });
  it('s’arrête sur une panne réseau et garde le reste', async () => {
    await queuePut(entry('a', 1)); await queuePut(entry('b', 2));
    const r = await syncQueue(async () => { throw new TypeError('Failed to fetch'); });
    expect(r.pending).toBe(2);
    expect((await queueAll()).length).toBe(2);
  });
  it('marque une vente refusée (409) sans bloquer les suivantes', async () => {
    await queuePut(entry('a', 1)); await queuePut(entry('b', 2));
    const send = vi.fn(async (b) => { if (b.clientRef === 'a') throw Object.assign(new Error('x'), { status: 409, code: 'ITEM_NOT_IN_STOCK' }); });
    const r = await syncQueue(send);
    expect(r).toEqual({ sent: 1, failed: 1, pending: 0 });
    const left = await queueAll();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ clientRef: 'a', failed: true, code: 'ITEM_NOT_IN_STOCK' });
  });
  it('distingue panne réseau et erreur serveur', () => {
    expect(isNetworkError(new TypeError('x'))).toBe(true);
    expect(isNetworkError(Object.assign(new Error('x'), { status: 500 }))).toBe(false);
  });
});
