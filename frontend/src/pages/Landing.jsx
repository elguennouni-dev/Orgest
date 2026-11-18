import { Link } from 'react-router-dom';
import { useI18n } from '../i18n.jsx';
import { SiteFooter, SiteHeader } from '../components/Site.jsx';
import { Icon, P } from '../components/icons.jsx';
import Louiz from '../components/Louiz.jsx';
import { waLink } from '../config.js';

const FEATURES = [
  ['stock', P.stock, '#FFF1C7', '#8A6209'], ['sale', P.sale, '#E6EEF9', '#1E4F8F'], ['exchange', P.exchange, '#E7F4EC', '#1E5E3F'], ['buyback', P.buyback, '#F3E8F7', '#6B2F86'],
  ['installments', P.calendar, '#FDECE3', '#9A3412'], ['workshop', P.workshop, '#FFF1C7', '#8A6209'], ['receipts', P.print, '#E6EEF9', '#1E4F8F'], ['excel', P.chart, '#E7F4EC', '#1E5E3F'],
];

export default function Landing() {
  const { t } = useI18n();
  const wa = waLink(t('landing.waMessage'));
  return (
    <div className="site">
      <SiteHeader />
      <section className="site-hero">
        <div className="in">
          <div className="stack" style={{ gap: 20 }}>
            <span className="eyebrow">{t('landing.eyebrow')}</span>
            <h1>{t('landing.title1')} <b>{t('landing.title2')}</b></h1>
            <p>{t('landing.subtitle')}</p>
            <div className="row">
              <a className="btn primary" href={wa} target="_blank" rel="noopener noreferrer" style={{ minHeight: 52 }}>{t('landing.cta')}</a>
              <Link className="btn" to="/blog" style={{ minHeight: 52, background: 'transparent', color: '#FFF4D6', borderColor: '#4A3E15' }}>{t('landing.readBlog')}</Link>
            </div>
          </div>
          <div className="hero-louiz">
            <div className="bubble">{t('landing.louiz')}</div>
            <Louiz mood="wave" size={240} />
          </div>
        </div>
      </section>

      <section className="site-sec" id="features">
        <h2>{t('landing.featuresTitle')}</h2>
        <div className="feat-grid">
          {FEATURES.map(([f, ic, bg, fg]) => (
            <div className="feat" key={f}>
              <span className="ic" style={{ background: bg, color: fg }}><Icon d={ic} size={24} /></span>
              <h3>{t('landing.f.' + f)}</h3>
              <p>{t('landing.f.' + f + '.d')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="site-sec alt">
        <h2>{t('landing.howTitle')}</h2>
        <div className="feat-grid three">
          {[1, 2, 3].map((n) => (
            <div className="feat" key={n}>
              <span className="ic num-ic">{n}</span>
              <h3>{t('landing.step' + n)}</h3>
              <p>{t('landing.step' + n + '.d')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="site-sec" id="pricing">
        <h2>{t('landing.plansTitle')}</h2>
        <div className="feat-grid four">
          {[1, 3, 6, 12].map((m) => (<div className="plan2" key={m}><b className="num">{m}</b><span>{t('landing.months')}</span></div>))}
        </div>
        <p className="muted" style={{ marginTop: 16 }}>{t('landing.payInfo')}</p>
        <a className="btn wa" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </section>
      <SiteFooter />
    </div>
  );
}
