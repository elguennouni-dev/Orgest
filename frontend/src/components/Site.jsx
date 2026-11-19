import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n.jsx';
import { Logo } from './ui.jsx';
import { LangToggle } from './Layouts.jsx';
import { waLink } from '../config.js';

export function SiteHeader() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const barRef = useRef(null);
  useEffect(() => { setOpen(false); }, [loc.pathname, loc.hash]);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || 0;
        setScrolled((v) => (v ? y > 12 : y > 48));
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (barRef.current) barRef.current.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const wa = waLink(t('landing.waMessage'));
  return (
    <header className={'site-head' + (scrolled ? ' scrolled' : '') + (open ? ' menu-open' : '')}>
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
      <i className="scroll-bar" ref={barRef} aria-hidden="true" />
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
