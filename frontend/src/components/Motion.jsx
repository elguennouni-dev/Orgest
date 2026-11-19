import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SEL = '.feat, .plan3, .site-sec > h2, .site-sec > p.muted, .b-card, .b-feature, .b-series, .b-faq, .site-foot .col, .kpi';

// Révélation douce au scroll (public) : ajoute .rv puis .in quand l'élément entre à l'écran.
export function Page({ children }) {
  const loc = useLocation();
  return <div key={loc.pathname} className="page-in">{children}</div>;
}

export function useReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    const seen = new WeakSet();
    const scan = () => {
      document.querySelectorAll(SEL).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const sib = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
        el.style.setProperty('--d', Math.min(sib, 6) * 70 + 'ms');
        el.classList.add('rv');
        io.observe(el);
      });
    };
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); io.disconnect(); };
  }, []);
}

export function MotionRoot() {
  useReveal();
  const loc = useLocation();
  // Ancres (#features, #pricing) : défilement doux après le changement de page
  useEffect(() => {
    if (!loc.hash) { if (!loc.state?.keepScroll) window.scrollTo({ top: 0 }); return undefined; }
    const t = setTimeout(() => {
      const el = document.getElementById(decodeURIComponent(loc.hash.slice(1)));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
    return () => clearTimeout(t);
  }, [loc.pathname, loc.hash]);
  return null;
}
