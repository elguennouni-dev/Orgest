import { useI18n } from '../i18n.jsx';
import Louiz from './Louiz.jsx';
import OrgestMark from './OrgestMark.jsx';
import { useEffect, useState } from 'react';

/** Logo vectoriel : symbole + nom. `variant` : "wordmark" (symbole + nom), "icon" (symbole seul), "full" (empilé). */
export function Logo({ variant = 'wordmark', size, gap = '#14120E', ink = '#FFFFFF', className, style }) {
  const { lang } = useI18n();
  const name = lang === 'ar' ? 'أورجست' : 'Orgest';
  if (variant === 'icon') return <OrgestMark size={size || 40} gap={gap} className={className} style={style} />;
  const stacked = variant === 'full';
  const s = size || (stacked ? 96 : 36);
  return (
    <span className={'logo-lockup' + (stacked ? ' stacked' : '') + (className ? ' ' + className : '')} style={{ color: ink, ...style }} dir="ltr">
      <OrgestMark size={s} gap={gap} />
      <span style={{ fontSize: stacked ? s * 0.5 : s * 0.56 }}>{name}</span>
    </span>
  );
}

export function LangSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="langswitch" role="group" aria-label={t('a11y.lang')}>
      <button type="button" className={lang === 'ar' ? 'on' : ''} onClick={() => setLang('ar')}>العربية</button>
      <button type="button" className={lang === 'fr' ? 'on' : ''} onClick={() => setLang('fr')}>Français</button>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function ErrorBox({ error }) {
  const { t } = useI18n();
  if (!error) return null;
  const code = typeof error === 'string' ? error : error.code;
  const key = 'err.' + code;
  const msg = t(key);
  return (
    <div className="err-louiz" role="alert">
      <Louiz mood="worried" size={52} />
      <span>{msg === key ? t('err.generic') : msg}</span>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="row spread" style={{ marginBottom: 12 }}>
          <h2>{title}</h2>
          <button className="btn sm" type="button" onClick={onClose} aria-label={t('close')}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHead({ title, children }) {
  return (
    <div className="pagehead">
      <h1>{title}</h1>
      <div className="row no-print">{children}</div>
    </div>
  );
}

export function Kpi({ label, value, sub }) {
  return (
    <div className="card kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

const LOAD_STEPS = [
  { mood: 'thinking', fr: 'Je vérifie le cours de l’or du jour…', ar: 'كنشوف ثمن الذهب ديال اليوم…', pct: 18 },
  { mood: 'thinking', fr: 'Je pèse votre stock, gramme par gramme…', ar: 'كنوزن الستوك…', pct: 46 },
  { mood: 'happy', fr: 'Je range les ventes et les échéances…', ar: 'كنرتب المبيعات و التقسيط…', pct: 72 },
  { mood: 'proud', fr: 'Presque prêt…', ar: 'تقريبا واجد…', pct: 92 },
];

/** Chargement avec Louiz : étapes animées sur l'écran plein, version compacte dans les pages. */
export function Loader({ full = false, size = 88, label }) {
  const { t, lang } = useI18n();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!full) return undefined;
    const id = setInterval(() => setI((n) => Math.min(n + 1, LOAD_STEPS.length - 1)), 1100);
    return () => clearInterval(id);
  }, [full]);
  if (!full) {
    return (
      <div className="loader-inline" role="status" aria-live="polite">
        <div className="load-card">
          <Louiz mood="thinking" size={Math.max(48, Math.min(size, 64))} />
          <div className="grow">
            <span style={{ fontSize: 15, fontWeight: 500 }}>{label || t('loading')}</span>
            <div className="shimbar"><i /></div>
          </div>
        </div>
      </div>
    );
  }
  const st = LOAD_STEPS[i];
  return (
    <div className="splash" role="status" aria-live="polite">
      <div className="splash-louiz"><span className="pulse" /><Louiz mood={st.mood} size={190} /></div>
      <div className="splash-msg" key={i}>
        <span>{lang === 'ar' ? st.ar : st.fr}</span>
        {lang !== 'ar' && <span lang="ar" className="muted">{st.ar}</span>}
      </div>
      <div className="splash-bar">
        <div className="shimbar big" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={st.pct}><i style={{ width: st.pct + '%' }} /></div>
        <div className="row spread muted" style={{ fontSize: 13 }}><span>{label || t('loading')}</span><span className="num">{st.pct} %</span></div>
      </div>
    </div>
  );
}

export function Loading() {
  return <Loader size={72} />;
}

export const KARATS = [18, 21, 24, 800, 925, 999];
export const CATEGORIES = ['ring', 'bracelet', 'necklace', 'earrings', 'pendant', 'chain', 'set', 'other'];
