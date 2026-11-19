import { describe, expect, it } from 'vitest';
import { addMonths, buildSchedule, installmentError, lineTotal, netWeight, round2, round3, saleSummary, subtotalOf, tradeInValue } from '../src/lib/money.js';

const sum = (s) => Math.round(s.reduce((a, t) => a + t.amount * 100, 0));

describe('arrondis', () => {
  it('HALF_UP insensible aux erreurs binaires', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
    expect(round2(1.255)).toBe(1.26);
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(-1.005)).toBe(-1.01);
    expect(round3(2.0005)).toBe(2.001);
  });
  it('tolère texte, virgule, vide', () => {
    expect(round2('12,345')).toBe(12.35);
    expect(round2('')).toBe(0);
    expect(round2(undefined)).toBe(0);
    expect(round2('abc')).toBe(0);
  });
});

describe('lignes et sous-total', () => {
  it('poids × (prix + façon)', () => {
    expect(lineTotal(7.5, 640, 100)).toBe(5550);
    expect(lineTotal(3.333, 10.01, 0)).toBe(33.36);
    expect(lineTotal(1.001, 5, 0)).toBe(5.01);
  });
  it('somme des lignes déjà arrondies (comme le backend)', () => {
    const lines = [{ weightG: 3.333, price: 10.01, making: 0 }, { weightG: 3.333, price: 10.01, making: 0 }, { weightG: 3.333, price: 10.01, making: 0 }];
    expect(subtotalOf(lines)).toBe(100.08); // 3 × 33,36
  });
});

describe('or repris', () => {
  it('poids net', () => {
    expect(netWeight(10, 10)).toBe(9);
    expect(netWeight(10, 0)).toBe(10);
    expect(netWeight(9.876, 11.28)).toBe(8.762);
    expect(netWeight(10, 150)).toBe(0.1); // plafonné à 99 %
    expect(netWeight(10, -5)).toBe(10);
  });
  it('valeur de reprise', () => {
    expect(tradeInValue(5, 10, 560)).toBe(2520);
    expect(tradeInValue(2, 0, 500.004)).toBe(1000);
    expect(tradeInValue('', 0, 560)).toBe(0);
  });
});

describe('échéancier', () => {
  it('répartition exacte, écart ≤ 1 centime, centimes sur les premiers termes', () => {
    for (const months of [1, 2, 3, 4, 6, 7, 9, 12, 18, 24, 36]) {
      for (const bal of [0.01, 1, 99.99, 1000.01, 12345.67, 99999.99]) {
        const down = bal > 1 ? 0.5 : 0;
        const s = buildSchedule(bal, down, months, new Date(2026, 0, 31));
        expect(s).toHaveLength(months);
        expect(sum(s)).toBe(Math.round((bal - down) * 100));
        const a = s.map((t) => Math.round(t.amount * 100));
        expect(Math.max(...a) - Math.min(...a)).toBeLessThanOrEqual(1);
        expect(a).toEqual([...a].sort((x, y) => y - x));
      }
    }
    const s = buildSchedule(100, 0, 3, new Date(2026, 0, 31));
    expect(s.map((t) => t.amount)).toEqual([33.34, 33.33, 33.33]);
  });
  it('avance déduite', () => {
    const s = buildSchedule(10000, 4000, 6, new Date(2026, 0, 1));
    expect(s.every((t) => t.amount === 1000)).toBe(true);
  });
  it('dates : fin de mois ramenée au dernier jour valide', () => {
    expect(addMonths(new Date(2026, 0, 31), 1).getDate()).toBe(28);
    expect(addMonths(new Date(2024, 0, 31), 1).getDate()).toBe(29); // bissextile
    expect(addMonths(new Date(2026, 10, 30), 3).getMonth()).toBe(1);
    const s = buildSchedule(300, 0, 3, new Date(2026, 0, 31));
    expect(s.map((t) => `${t.dueDate.getMonth() + 1}/${t.dueDate.getDate()}`)).toEqual(['2/28', '3/31', '4/30']);
  });
  it('vide si paramètres invalides', () => {
    expect(buildSchedule(100, 100, 3)).toEqual([]);
    expect(buildSchedule(100, 0, 0)).toEqual([]);
    expect(buildSchedule(-5, 0, 3)).toEqual([]);
  });
  it('validation = règles du backend', () => {
    const ok = { balance: 5000, down: 0, months: 6, customerName: 'Fatima' };
    expect(installmentError(ok)).toBeNull();
    expect(installmentError({ ...ok, months: 36, down: 4999.99 })).toBeNull();
    expect(installmentError({ ...ok, customerName: '  ' })).toBe('CUSTOMER_REQUIRED');
    expect(installmentError({ ...ok, balance: 0 })).toBe('NO_BALANCE');
    expect(installmentError({ ...ok, balance: -10 })).toBe('NO_BALANCE');
    expect(installmentError({ ...ok, months: 0 })).toBe('INVALID_MONTHS');
    expect(installmentError({ ...ok, months: 37 })).toBe('INVALID_MONTHS');
    expect(installmentError({ ...ok, down: -1 })).toBe('DOWN_NEGATIVE');
    expect(installmentError({ ...ok, down: 5000 })).toBe('DOWN_TOO_HIGH');
    expect(installmentError({ ...ok, down: 6000 })).toBe('DOWN_TOO_HIGH');
  });
});

describe('résumé de vente', () => {
  const lines = [{ weightG: 20, price: 747, making: 100 }];
  const base = { lines, withOld: false, old: { karat: 18, gross: '', ded: '0', price: '' }, buyPrice: 560, mode: 'CASH', months: 3, down: '', customerName: '' };
  it('comptant', () => {
    const r = saleSummary(base);
    expect(r.subtotal).toBe(16940);
    expect(r.balance).toBe(16940);
    expect(r.toCollectNow).toBe(16940);
    expect(r.schedule).toEqual([]);
  });
  it('échange + tempérament : même résultat que SalesServiceTests côté Java', () => {
    const r = saleSummary({ ...base, withOld: true, old: { karat: 18, gross: '10', ded: '0', price: '' }, mode: 'INSTALLMENT', down: '2000', customerName: 'Fatima', start: new Date(2026, 0, 15) });
    expect(r.tradeIn).toBe(5600);
    expect(r.balance).toBe(11340);
    expect(r.remainder).toBe(9340);
    expect(r.schedule.map((t) => t.amount)).toEqual([3113.34, 3113.33, 3113.33]);
    expect(r.monthly).toBe(3113.34);
    expect(r.lastAmount).toBe(3113.33);
    expect(r.instError).toBeNull();
    expect(r.toCollectNow).toBe(2000);
  });
  it('prix saisi prioritaire sur le prix du jour', () => {
    const r = saleSummary({ ...base, withOld: true, old: { karat: 18, gross: '10', ded: '10', price: '600' } });
    expect(r.net).toBe(9);
    expect(r.tradeIn).toBe(5400);
  });
  it('remboursement si la reprise dépasse l’achat', () => {
    const r = saleSummary({ ...base, lines: [{ weightG: 1, price: 640, making: 0 }], withOld: true, old: { karat: 18, gross: '10', ded: '0', price: '' } });
    expect(r.balance).toBe(-4960);
    expect(r.toCollectNow).toBe(0);
  });
  it('tempérament impossible si solde ≤ 0 ou avance ≥ solde', () => {
    expect(saleSummary({ ...base, lines: [{ weightG: 1, price: 640, making: 0 }], withOld: true, old: { karat: 18, gross: '10', ded: '0', price: '' }, mode: 'INSTALLMENT', customerName: 'F' }).instError).toBe('NO_BALANCE');
    expect(saleSummary({ ...base, mode: 'INSTALLMENT', customerName: 'F', down: '16940' }).instError).toBe('DOWN_TOO_HIGH');
    expect(saleSummary({ ...base, mode: 'INSTALLMENT', customerName: '', down: '0' }).instError).toBe('CUSTOMER_REQUIRED');
  });
});
