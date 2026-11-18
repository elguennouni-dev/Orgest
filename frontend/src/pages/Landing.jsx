import { Link } from 'react-router-dom';
import { useI18n } from '../i18n.jsx';
import { LangSwitch, Logo } from '../components/ui.jsx';
import { waLink } from '../config.js';

const FEATURES = ['stock', 'sale', 'exchange', 'buyback', 'installments', 'workshop', 'receipts', 'excel'];

export default function Landing() {
  const { t } = useI18n();
  return (
    <div className="dark-page">
      <header className="land-nav">
        <Logo />
        <div className="row">
          <LangSwitch />
          <Link className="btn primary" to="/login">{t('landing.login')}</Link>
        </div>
      </header>

      <section className="hero">
        <div className="stack">
          <h1>{t('landing.title1')} <b>{t('landing.title2')}</b></h1>
          <p>{t('landing.subtitle')}</p>
          <div className="row">
            <a className="btn primary" href={waLink(t('landing.waMessage'))} target="_blank" rel="noopener noreferrer">{t('landing.cta')}</a>
            <Link className="btn dark" to="/login" style={{ borderColor: '#4A3E15' }}>{t('landing.login')}</Link>
          </div>
        </div>
        <Logo variant="full" className="big" />
      </section>

      <section className="section">
        <h2>{t('landing.featuresTitle')}</h2>
        <div className="grid g4">
          {FEATURES.map((f) => (
            <div className="feature" key={f}>
              <h3>{t('landing.f.' + f)}</h3>
              <p>{t('landing.f.' + f + '.d')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>{t('landing.howTitle')}</h2>
        <div className="grid g3">
          {[1, 2, 3].map((n) => (
            <div className="feature" key={n}>
              <h3>{n}. {t('landing.step' + n)}</h3>
              <p>{t('landing.step' + n + '.d')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>{t('landing.plansTitle')}</h2>
        <div className="grid g4">
          {[1, 3, 6, 12].map((m) => (
            <div className="plan" key={m}><b>{m}</b>{t('landing.months')}</div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 12 }}>{t('landing.payInfo')}</p>
        <a className="btn wa" href={waLink(t('landing.waMessage'))} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </section>

      <footer className="footer">© {new Date().getFullYear()} Orgest — {t('tagline')}</footer>
    </div>
  );
}
