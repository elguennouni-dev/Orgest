import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dict } from '../src/dict.js';

const root = new URL('../../', import.meta.url).pathname;

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

describe('dictionnaire', () => {
  const fr = dict.fr, ar = dict.ar;
  it('FR et AR ont exactement les mêmes clés', () => {
    const missingAr = Object.keys(fr).filter((k) => !(k in ar));
    const missingFr = Object.keys(ar).filter((k) => !(k in fr));
    expect({ missingAr, missingFr }).toEqual({ missingAr: [], missingFr: [] });
  });
  it('mêmes paramètres {x} dans les deux langues', () => {
    const params = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    const bad = Object.keys(fr).filter((k) => k in ar && params(fr[k]) !== params(ar[k]));
    expect(bad).toEqual([]);
  });
  it('chaque code d’erreur métier du backend a un message dans les 2 langues', () => {
    const codes = new Set();
    for (const f of walk(join(root, 'backend/src/main/java')).filter((p) => p.endsWith('.java'))) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/AppException\.(?:bad|conflict)\("([A-Z_]+)"\)/g)) codes.add(m[1]);
      for (const m of src.matchAll(/new AppException\([^,]+,\s*"([A-Z_]+)"\)/g)) codes.add(m[1]);
    }
    expect(codes.size).toBeGreaterThan(10);
    const missing = [...codes].filter((c) => !fr['err.' + c] || !ar['err.' + c]);
    expect(missing).toEqual([]);
  });
});
