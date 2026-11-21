// « karat » = titre du métal : 18/21/24 = or (carats) ; 800/925/999 = argent (millièmes).
export const GOLD = [18, 21, 24];
export const SILVER = [800, 925, 999];
export const PURITIES = [...GOLD, ...SILVER];
export const isSilver = (k) => Number(k) >= 100;
export const purity = (k) => (isSilver(k) ? `Ag ${k}` : `${k}K`);
/** Poids lisible : grammes, ou kilogrammes dès 1 kg. */
export function weightLabel(g, fmt) {
  const n = Number(g || 0);
  return n >= 1000 ? `${fmt(n / 1000)} kg` : `${fmt(n)} g`;
}
