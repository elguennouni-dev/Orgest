// Aides pour le graphique des ventes : échelle "propre", regroupement jour/semaine/mois, formats compacts.

/** Échelle lisible : maximum arrondi à 1, 2, 2.5, 5 × 10^n, avec `count` graduations régulières. */
export function niceScale(maxValue, count = 4) {
  const m = Number(maxValue);
  if (!(m > 0)) return { max: 1, step: 1 / count, ticks: Array.from({ length: count + 1 }, (_, i) => i / count) };
  const raw = m / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const mult = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => f <= x + 1e-9);
  const step = mult * pow;
  const ticks = Array.from({ length: count + 1 }, (_, i) => Math.round(i * step * 1e6) / 1e6);
  return { max: ticks[count], step, ticks };
}

export function fmtCompact(v) {
  const n = Number(v) || 0;
  const a = Math.abs(n);
  const trim = (x) => String(Math.round(x * 10) / 10).replace('.', ',');
  if (a >= 1e6) return trim(n / 1e6) + ' M';
  if (a >= 1e3) return trim(n / 1e3) + ' k';
  return String(Math.round(n));
}

const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Jour (≤ 45 j) → semaine (≤ 150 j) → mois : garde le graphique lisible sur toute période. */
export function bucketize(byDay) {
  const n = byDay.length;
  const mode = n <= 45 ? 'day' : n <= 150 ? 'week' : 'month';
  if (mode === 'day') return { mode, items: byDay.map((d) => ({ start: d.date, total: Number(d.total), days: 1 })) };
  const map = new Map();
  for (const d of byDay) {
    const dt = parse(d.date);
    let start;
    if (mode === 'week') { const back = (dt.getDay() + 6) % 7; start = key(new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - back)); }
    else start = key(new Date(dt.getFullYear(), dt.getMonth(), 1));
    const cur = map.get(start) || { start, total: 0, days: 0 };
    cur.total += Number(d.total); cur.days += 1;
    map.set(start, cur);
  }
  return { mode, items: [...map.values()].map((x) => ({ ...x, total: Math.round(x.total * 100) / 100 })) };
}
