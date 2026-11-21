// Code 128 (jeu B : ASCII 32–126) — encodeur sans dépendance. Chaque motif = largeurs alternées barre/espace (6 chiffres ; arrêt = 7).
const P = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 '
  + '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 '
  + '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 '
  + '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 '
  + '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 '
  + '114131 311141 411131 211412 211214 211232 2331112').split(' ');
const START_B = 104;
const STOP = 106;

/** Valeurs de symboles (début, données, somme de contrôle, arrêt) pour un texte ASCII imprimable. */
export function code128Symbols(text) {
  const s = String(text ?? '');
  if (!s.length) throw new Error('EMPTY');
  const vals = [START_B];
  let sum = START_B;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    if (c < 32 || c > 126) throw new Error('UNSUPPORTED_CHAR');
    const v = c - 32;
    vals.push(v);
    sum += v * (i + 1);
  }
  vals.push(sum % 103, STOP);
  return vals;
}

/** Suite de modules (1 = barre, 0 = espace) avec zone calme non incluse. */
export function code128Modules(text) {
  let bits = '';
  code128Symbols(text).forEach((v) => {
    [...P[v]].forEach((w, i) => { bits += (i % 2 === 0 ? '1' : '0').repeat(Number(w)); });
  });
  return bits;
}

/** Barres fusionnées : [{x, w}] en unités de module. */
export function code128Bars(text) {
  const bits = code128Modules(text);
  const bars = [];
  for (let i = 0; i < bits.length;) {
    if (bits[i] === '1') { let j = i; while (bits[j] === '1') j += 1; bars.push({ x: i, w: j - i }); i = j; } else i += 1;
  }
  return { bars, width: bits.length };
}
