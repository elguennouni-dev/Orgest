import { describe, expect, it } from 'vitest';
import { whatsappUrl } from '../src/lib/quote.js';
import { dict } from '../src/dict.js';

const t = (k, p = {}) => String(dict.fr[k]).replace(/\{(\w+)\}/g, (_, n) => p[n]);

describe('devis', () => {
  it('builds a WhatsApp link with a Moroccan international number', () => {
    const u = whatsappUrl({ customerPhone: '0612345678', number: 'D-00001', subtotal: 3800, validUntil: '2026-12-01' }, 'Atlas', t);
    expect(u.startsWith('https://wa.me/212612345678?text=')).toBe(true);
    expect(decodeURIComponent(u)).toContain('D-00001');
    expect(decodeURIComponent(u)).toContain('Atlas');
  });
  it('returns null without a usable phone', () => {
    expect(whatsappUrl({ customerPhone: '12', number: 'D-1', subtotal: 1, validUntil: 'x' }, 'A', t)).toBeNull();
    expect(whatsappUrl({ number: 'D-1', subtotal: 1, validUntil: 'x' }, 'A', t)).toBeNull();
  });
  it('has every devis key in both languages', () => {
    const keys = Object.keys(dict.fr).filter((k) => k.startsWith('quote.') || k === 'nav.quotes');
    expect(keys.length).toBeGreaterThan(20);
    for (const k of keys) expect(dict.ar[k], k).toBeTruthy();
  });
});
