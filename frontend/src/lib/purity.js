// « karat » = titre du métal : 18/21/24 = or (carats) ; 800/925/999 = argent (millièmes).
export const GOLD = [18, 21, 24];
export const SILVER = [800, 925, 999];
export const PURITIES = [...GOLD, ...SILVER];
export const isSilver = (k) => Number(k) >= 100;
let silverWord = 'Ag';
/** Appelé par le fournisseur de langue : en arabe, l'argent s'écrit « فضة 925 ». */
export const setPurityLang = (lang) => { silverWord = lang === 'ar' ? 'فضة' : 'Ag'; };
export const silverLabel = () => silverWord;
export const purity = (k) => (isSilver(k) ? `${silverWord} ${k}` : `${k}K`);
/** Poids lisible : grammes, ou kilogrammes dès 1 kg. */
export function weightLabel(g, fmt, unitG = 'g', unitKg = 'kg') {
  const n = Number(g || 0);
  return n >= 1000 ? `${fmt(n / 1000)} ${unitKg}` : `${fmt(n)} ${unitG}`;
}
