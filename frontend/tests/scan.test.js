import { describe, expect, it } from 'vitest';
import { exactRef, normCode } from '../src/lib/scan.js';

const list = [{ id: 1, ref: 'BAG-0012' }, { id: 2, ref: 'BAG-00123' }];
describe('scan', () => {
  it('normalise', () => expect(normCode('  bag-1 ')).toBe('BAG-1'));
  it('référence exacte uniquement', () => {
    expect(exactRef(list, 'bag-0012').id).toBe(1);
    expect(exactRef(list, 'BAG-001')).toBeNull();
    expect(exactRef(list, '')).toBeNull();
  });
});
