import { Link, NavLink } from 'react-router-dom';
import { useI18n } from '../i18n.jsx';
import { Logo } from './ui.jsx';
import { LangToggle } from './Layouts.jsx';
import { waLink } from '../config.js';

export function SiteHeader() {
  const { t } = useI18n();
  return (
    <header className="site-head">
      <div className="in">
        <Link to="/" aria-label="Orgest"><Logo size={36} /></Link>
        <nav aria-label="Site">
          <a href="/#features">{t('site.features')}</a>
          <a href="/#pricing">{t('site.pricing')}</a>
          <NavLink to="/blog">{t('site.blog')}</NavLink>
          <a href={waLink(t('landing.waMessage'))} target="_blank" rel="noopener noreferrer">{t('site.help')}</a>
        </nav>
        <LangToggle />
        <Link to="/login" className="lnk">{t('site.login')}</Link>
        <a className="btn primary" href={waLink(t('landing.waMessage'))} target="_blank" rel="noopener noreferrer">{t('site.try')}</a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="site-foot">
      <div className="in">
        <div className="about">
          <Logo size={40} />
          <p>{t('site.footerText')}</p>
        </div>
        <div className="col"><strong>{t('site.product')}</strong><a href="/#features">{t('site.features')}</a><a href="/#pricing">{t('site.pricing')}</a><Link to="/login">{t('site.login')}</Link></div>
        <div className="col"><strong>{t('site.blog')}</strong><Link to="/blog">{t('site.blog')}</Link></div>
        <div className="col"><strong>{t('site.support')}</strong><a href={waLink(t('landing.waMessage'))} target="_blank" rel="noopener noreferrer">{t('site.contact')}</a></div>
      </div>
      <div className="copy">{t('site.made')}</div>
    </footer>
  );
}
