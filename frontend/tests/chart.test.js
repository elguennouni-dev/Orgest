import { describe, expect, it } from 'vitest';
import { bucketize, fmtCompact, niceScale } from '../src/lib/chart.js';

describe('niceScale', () => {
  it('graduations rondes et max ≥ valeur', () => {
    for (const v of [1, 7, 99, 1234, 45000, 272997.4, 1e6, 0.5]) {
      const s = niceScale(v, 4);
      expect(s.max).toBeGreaterThanOrEqual(v);
      expect(s.ticks).toHaveLength(5);
      expect(s.ticks[0]).toBe(0);
      expect(s.max).toBeLessThan(v * 1.7 + 1);
    }
    expect(niceScale(45000, 4).ticks).toEqual([0, 12500, 25000, 37500, 50000]);
    expect(niceScale(1234, 4).max).toBe(1600);
  });
  it('valeur nulle', () => { expect(niceScale(0).max).toBeGreaterThan(0); });
});

describe('fmtCompact', () => {
  it('k et M', () => {
    expect(fmtCompact(950)).toBe('950');
    expect(fmtCompact(12500)).toBe('12,5 k');
    expect(fmtCompact(45000)).toBe('45 k');
    expect(fmtCompact(2300000)).toBe('2,3 M');
  });
});

describe('bucketize', () => {
  const days = (n, start = new Date(2026, 0, 1)) => Array.from({ length: n }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, total: '10.00' };
  });
  it('jours jusqu’à 45', () => { const r = bucketize(days(31)); expect(r.mode).toBe('day'); expect(r.items).toHaveLength(31); });
  it('semaines (lundi) entre 46 et 150 jours, total conservé', () => {
    const r = bucketize(days(90));
    expect(r.mode).toBe('week');
    expect(r.items.reduce((s, x) => s + x.total, 0)).toBe(900);
    expect(r.items.reduce((s, x) => s + x.days, 0)).toBe(90);
    expect(new Date(r.items[1].start + 'T00:00:00').getDay()).toBe(1);
  });
  it('mois au-delà', () => {
    const r = bucketize(days(365));
    expect(r.mode).toBe('month');
    expect(r.items).toHaveLength(12);
    expect(r.items[0].start).toBe('2026-01-01');
    expect(r.items[0].total).toBe(310);
  });
});
