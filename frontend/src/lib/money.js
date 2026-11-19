// Calculs de vente / échange / échéancier. Fonctions pures : elles reproduisent EXACTEMENT
// les règles du backend (SalesService + Money) pour que l'écran affiche ce qui sera enregistré.
// Les montants sont manipulés en centimes entiers pour éviter les erreurs de virgule flottante.

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Arrondi commercial (HALF_UP, éloigné de zéro) à `d` décimales, insensible aux erreurs binaires. */
export function round(v, d = 2) {
  const n = num(v);
  const f = 10 ** d;
  const x = Number((Math.abs(n) * f).toPrecision(15));
  const r = Math.floor(x + 0.5) / f;
  return n < 0 ? -r : r;
}
export const round2 = (v) => round(v, 2);
export const round3 = (v) => round(v, 3);
export const cents = (v) => Math.round(round2(v) * 100);
export const fromCents = (c) => c / 100;

/** Total d'une ligne : quantité × poids unitaire × (prix/g + façon/g), arrondi comme le backend. */
export function lineTotal(weightG, pricePerGram, makingPerGram, qty = 1) {
  const q = Math.max(1, Math.trunc(num(qty)) || 1);
  return round2(round3(weightG) * q * (round2(pricePerGram) + round2(makingPerGram)));
}

export function subtotalOf(lines) {
  return round2(lines.reduce((s, l) => s + lineTotal(l.weightG, l.price, l.making, l.qty), 0));
}

/** Poids net après déduction (%) : brut(3 déc.) × (1 − déduction(2 déc.)/100), arrondi à 3 déc. */
export function netWeight(grossG, deductionPct) {
  const gross = round3(grossG);
  const ded = Math.min(Math.max(round2(deductionPct), 0), 99);
  const factor = round(1 - ded / 100, 6);
  return round3(gross * factor);
}

/** Valeur de reprise de l'ancien or. */
export function tradeInValue(grossG, deductionPct, pricePerGram) {
  return round2(netWeight(grossG, deductionPct) * round2(pricePerGram));
}

/**
 * Échéancier : le reste (solde − avance) est réparti en centimes ; les premiers termes
 * reçoivent le centime d'écart, de sorte que la somme est exacte et que l'écart max est 0,01.
 * Échéances à J + i mois (fin de mois ramenée au dernier jour valide, comme java.time).
 */
export function buildSchedule(balance, down, months, start = new Date()) {
  const n = Math.trunc(num(months));
  const remainder = cents(balance) - cents(down);
  if (n < 1 || remainder <= 0) return [];
  const base = Math.floor(remainder / n);
  const extra = remainder - base * n;
  const out = [];
  for (let i = 1; i <= n; i += 1) {
    out.push({ seq: i, dueDate: addMonths(start, i), amount: fromCents(base + (i <= extra ? 1 : 0)) });
  }
  return out;
}

export function addMonths(date, m) {
  const y = date.getFullYear();
  const mo = date.getMonth() + m;
  const last = new Date(y, mo + 1, 0).getDate();
  return new Date(y, mo, Math.min(date.getDate(), last));
}

/**
 * Validation de l'échéancier. Renvoie un code d'erreur (clé `err.<CODE>`) ou null.
 * Mêmes règles que le backend : client nommé, solde > 0, 1 ≤ mois ≤ 36, 0 ≤ avance < solde.
 */
export function installmentError({ balance, down, months, customerName }) {
  const b = cents(balance);
  const d = cents(down);
  if (!String(customerName || '').trim()) return 'CUSTOMER_REQUIRED';
  if (b <= 0) return 'NO_BALANCE';
  if (!(Number.isInteger(Number(months)) && months >= 1 && months <= 36)) return 'INVALID_MONTHS';
  if (d < 0) return 'DOWN_NEGATIVE';
  if (d >= b) return 'DOWN_TOO_HIGH';
  return null;
}

/** Résumé complet d'une vente pour l'écran. */
export function saleSummary({ lines, withOld, old, buyPrice, mode, months, down, customerName, start }) {
  const subtotal = subtotalOf(lines);
  const net = withOld ? netWeight(old.gross, old.ded) : 0;
  const price = old && old.price !== '' && old.price != null ? old.price : buyPrice;
  const tradeIn = withOld ? tradeInValue(old.gross, old.ded, price) : 0;
  const balance = round2(subtotal - tradeIn);
  const inst = mode === 'INSTALLMENT';
  const d = inst ? round2(Math.max(num(down), 0)) : 0;
  const instError = inst ? installmentError({ balance, down: num(down), months, customerName }) : null;
  const schedule = inst && !instError ? buildSchedule(balance, d, months, start) : [];
  return {
    subtotal, net, tradeIn, balance, down: d,
    remainder: inst ? round2(balance - d) : 0,
    monthly: schedule.length ? schedule[0].amount : 0,
    lastAmount: schedule.length ? schedule[schedule.length - 1].amount : 0,
    schedule, instError,
    toCollectNow: inst ? d : Math.max(balance, 0),
  };
}
