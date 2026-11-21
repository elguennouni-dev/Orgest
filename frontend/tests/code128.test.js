import { describe, expect, it } from 'vitest';
import { code128Bars, code128Modules, code128Symbols } from '../src/lib/code128.js';
import ref from './fixtures-code128.json';

describe('code128', () => {
  it('correspond à une implémentation de référence (python-barcode)', () => {
    Object.entries(ref).forEach(([text, modules]) => expect(code128Modules(text)).toBe(modules));
  });
  it('somme de contrôle : A → 104 + 33 = 137 mod 103 = 34', () => {
    const v = code128Symbols('A');
    expect(v).toEqual([104, 33, 34, 106]);
  });
  it('chaque symbole fait 11 modules, arrêt 13', () => {
    expect(code128Modules('BAG-12').length).toBe(11 * 8 + 13);
  });
  it('barres fusionnées', () => {
    const { bars, width } = code128Bars('A');
    expect(width).toBe(code128Modules('A').length);
    expect(bars[0]).toEqual({ x: 0, w: 2 });
  });
  it('refuse vide et caractères hors ASCII', () => {
    expect(() => code128Modules('')).toThrow();
    expect(() => code128Modules('é')).toThrow();
  });
});
