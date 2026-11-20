import { round2 } from './money.js';

export const CARATS = [24, 22, 21, 20, 18, 14, 9];

/** Valeur d'un gramme pour chaque carat à partir du prix d'un carat de référence : prix × carat / carat de référence. */
export function convertCarats(price, fromCarat) {
  const p = Number(price);
  const from = Number(fromCarat);
  if (!Number.isFinite(p) || p <= 0 || !CARATS.includes(from)) return [];
  return CARATS.map((c) => ({ carat: c, purity: round2((c / 24) * 100), price: round2((p * c) / from) }));
}
