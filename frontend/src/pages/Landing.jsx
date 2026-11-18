import { Link } from 'react-router-dom';
import { useI18n } from '../i18n.jsx';
import { SiteFooter, SiteHeader } from '../components/Site.jsx';
import { Icon, P } from '../components/icons.jsx';
import Louiz from '../components/Louiz.jsx';
import { PLAN_PRICES, waLink } from '../config.js';
import { fmtInt } from '../i18n.jsx';

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
        <p className="muted" style={{ margin: '-12px 0 24px' }}>{t('plan.sub')}</p>
        <div className="plans">
          {Object.entries(PLAN_PRICES).map(([m, price]) => {
            const months = Number(m);
            const pop = months === 6;
            const per = Math.round(price / months);
            const first = Object.entries(PLAN_PRICES)[0];
            const save = first && months > 1 ? Math.round((1 - price / (months * first[1])) * 100) : 0;
            return (
              <div className={'plan3' + (pop ? ' pop' : '')} key={m}>
                {pop && <span className="ribbon">{t('plan.popular')}</span>}
                <span className="pm"><b className="num">{months}</b> {t('landing.months')}</span>
                <div className="pp"><b className="num">{fmtInt(price)}</b> <span>{t('dh')}</span></div>
                <span className="muted">{t('plan.perMonth', { n: fmtInt(per) })}{save > 0 ? ` · ${t('plan.save', { n: save })}` : ''}</span>
                <ul>{['plan.i1', 'plan.i2', 'plan.i3', 'plan.i4'].map((k) => <li key={k}><Icon d={P.check} size={16} sw={2.4} /> {t(k)}</li>)}</ul>
                <a className={'btn ' + (pop ? 'primary' : '')} href={waLink(`${t('landing.waMessage')} (${months} ${t('landing.months')} — ${fmtInt(price)} ${t('dh')})`)} target="_blank" rel="noopener noreferrer">{t('plan.choose')}</a>
              </div>
            );
          })}
        </div>
        <p className="muted" style={{ marginTop: 16 }}>{t('landing.payInfo')}</p>
      </section>
      <SiteFooter />
    </div>
  );
}
