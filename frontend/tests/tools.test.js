import { describe, expect, it } from 'vitest';
import { convertCarats } from '../src/lib/tools.js';

describe('convertCarats', () => {
  it('24K → 18K et 21K (exemples des guides)', () => {
    const r = Object.fromEntries(convertCarats(700, 24).map((x) => [x.carat, x.price]));
    expect(r[24]).toBe(700);
    expect(r[18]).toBe(525);
    expect(r[21]).toBe(612.5);
  });
  it('part de 18K vers 24K', () => {
    const r = Object.fromEntries(convertCarats(525, 18).map((x) => [x.carat, x.price]));
    expect(r[24]).toBe(700);
  });
  it('pureté en %', () => {
    const r = Object.fromEntries(convertCarats(100, 24).map((x) => [x.carat, x.purity]));
    expect(r[18]).toBe(75);
    expect(r[21]).toBe(87.5);
  });
  it('entrées invalides', () => {
    expect(convertCarats(0, 24)).toEqual([]);
    expect(convertCarats('abc', 24)).toEqual([]);
    expect(convertCarats(100, 19)).toEqual([]);
  });
});
