import { useI18n } from '../i18n.jsx';

export function Logo({ variant = 'wordmark', className, style }) {
  const src = variant === 'icon' ? '/assets/logo-icon.png' : variant === 'full' ? '/assets/logo-full.png' : '/assets/logo-wordmark.png';
  return <img src={src} alt="Orgest" className={className} style={style} />;
}

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="langswitch" role="group" aria-label="Langue / اللغة">
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
  return <div className="err" role="alert">{msg === key ? t('err.generic') : msg}</div>;
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="row spread" style={{ marginBottom: 12 }}>
          <h2>{title}</h2>
          <button className="btn sm" type="button" onClick={onClose} aria-label="Fermer">✕</button>
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

/** Chargement aux couleurs d'Orgest : anneau doré qui tourne autour de l'icône, halo pulsé et reflet. */
export function Loader({ full = false, size = 88, label }) {
  const { t } = useI18n();
  return (
    <div className={full ? 'splash' : 'loader-inline'} role="status" aria-live="polite">
      <div className="loader" style={{ '--s': size + 'px' }}>
        <span className="loader-ring" />
        <span className="loader-glow" />
        <img src="/assets/logo-icon.png" alt="" className="loader-logo" />
        <span className="loader-shine" />
      </div>
      {(label !== false) && <p className="loader-label">{label || t('loading')}</p>}
    </div>
  );
}

export function Loading() {
  return <Loader size={72} />;
}

export const KARATS = [18, 21, 24];
export const CATEGORIES = ['ring', 'bracelet', 'necklace', 'earrings', 'pendant', 'chain', 'set', 'other'];
