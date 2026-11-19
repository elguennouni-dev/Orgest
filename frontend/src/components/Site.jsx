import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n.jsx';
import { Logo } from './ui.jsx';
import { LangToggle } from './Layouts.jsx';
import { waLink } from '../config.js';

export function SiteHeader() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname, loc.hash]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const wa = waLink(t('landing.waMessage'));
  return (
    <header className="site-head">
      <div className="in">
        <Link to="/" aria-label="Orgest" className="brand-l"><Logo size={36} /></Link>
        <nav id="site-nav" aria-label="Site" className={open ? 'open' : ''} onClick={(e) => { if (e.target.closest('a')) setOpen(false); }}>
          <a href="/#features">{t('site.features')}</a>
          <a href="/#pricing">{t('site.pricing')}</a>
          <NavLink to="/blog">{t('site.blog')}</NavLink>
          <a href={wa} target="_blank" rel="noopener noreferrer">{t('site.help')}</a>
          <Link to="/login" className="m-only">{t('site.login')}</Link>
          <a className="btn primary m-only" href={wa} target="_blank" rel="noopener noreferrer">{t('site.try')}</a>
        </nav>
        <LangToggle />
        <Link to="/login" className="lnk desk">{t('site.login')}</Link>
        <a className="btn primary desk" href={wa} target="_blank" rel="noopener noreferrer">{t('site.try')}</a>
        <button type="button" className="burger" aria-label="Menu" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen(!open)}>
          <span /><span /><span />
        </button>
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
