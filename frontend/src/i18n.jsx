import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dict } from './dict.js';

const Ctx = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('orgest_lang') || 'ar'; } catch { return 'ar'; }
  });
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem('orgest_lang', lang); } catch { /* ignore */ }
  }, [lang]);
  const t = useCallback((key, vars) => {
    let s = (dict[lang] && dict[lang][key]) || (dict.fr && dict.fr[key]) || key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);

// ----- Formats : chiffres latins pour les deux langues (usage au Maroc) -----
const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf3 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 3 });
export const fmtInt = (v) => nf0.format(Number(v || 0));
export const fmtMoney = (v) => {
  const n = Number(v || 0);
  return Number.isInteger(n) ? nf0.format(n) : nf2.format(n);
};
export const fmtWeight = (v) => nf3.format(Number(v || 0));
const asDate = (v) => {
  if (v instanceof Date) return v;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(v); // date seule = jour local (pas de décalage UTC)
};
export const fmtDate = (v) => (v ? asDate(v).toLocaleDateString('fr-FR') : '');
export const fmtDateTime = (v) => (v ? new Date(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '');

export function Money({ v }) {
  const { t } = useI18n();
  return <span className="num">{fmtMoney(v)} {t('dh')}</span>;
}
