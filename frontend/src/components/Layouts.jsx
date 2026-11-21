import OfflineBar from './OfflineBar.jsx';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { fmtDate, useI18n } from '../i18n.jsx';
import { Logo } from './ui.jsx';
import { Icon, P } from './icons.jsx';
import Louiz from './Louiz.jsx';
import Expired from '../pages/shop/Expired.jsx';

export function LangToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="langtog no-print" role="group" aria-label="Langue / اللغة">
      <button type="button" className={lang === 'fr' ? 'on' : ''} aria-pressed={lang === 'fr'} onClick={() => setLang('fr')}>FR</button>
      <button type="button" className={lang === 'ar' ? 'on' : ''} aria-pressed={lang === 'ar'} onClick={() => setLang('ar')}>العربية</button>
    </div>
  );
}

/** Louiz s'endort après 2 minutes d'inactivité ; un geste suffit à le réveiller. Il ne bloque jamais rien. */
function SleepyLouiz() {
  const { t } = useI18n();
  const [asleep, setAsleep] = useState(false);
  const timer = useRef(null);
  useEffect(() => {
    const reset = () => {
      setAsleep(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setAsleep(true), 120000);
    };
    reset();
    const ev = ['pointerdown', 'keydown', 'pointermove', 'scroll'];
    ev.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => { clearTimeout(timer.current); ev.forEach((e) => window.removeEventListener(e, reset)); };
  }, []);
  if (!asleep) return null;
  return (
    <div className="louiz-dock no-print" role="status">
      <div className="bubble">{t('louiz.sleepy')}</div>
      <Louiz mood="sleepy" size={84} />
    </div>
  );
}

/** Mobile : chaque tableau devient une liste de cartes (étiquette = en-tête de colonne). */
function useResponsiveTables(ref, dep) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const run = () => {
      el.querySelectorAll('table').forEach((tb) => {
        if (tb.closest('.receipt') || tb.classList.contains('keep')) return;
        tb.classList.add('rt');
        const heads = [...tb.querySelectorAll('thead th')].map((th) => th.textContent.trim());
        if (!heads.length) return;
        tb.querySelectorAll('tbody tr').forEach((tr) => {
          [...tr.children].forEach((td, i) => {
            if (heads[i] && td.dataset.label !== heads[i]) td.dataset.label = heads[i];
            const multi = td.childNodes.length > 1 ? '1' : '0';
            if (td.dataset.multi !== multi) td.dataset.multi = multi;
          });
        });
      });
    };
    run();
    const mo = new MutationObserver(run);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [ref, dep]);
}

function Shell({ groups, children, searchable }) {
  const { t } = useI18n();
  const { me, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const mainRef = useRef(null);
  useResponsiveTables(mainRef, loc.pathname);
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const total = 30;
  const left = Math.max(0, me.daysLeft || 0);
  const initial = (me.ownerName || me.shopName || me.username || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="shell">
      <div className="topbar no-print">
        <button className="btn" type="button" onClick={() => setOpen(true)} aria-label="Menu"><Icon d={P.menu} /></button>
        <span className="t">Orgest</span>
        <LangToggle />
      </div>
      {open && <div className="scrim no-print" onClick={() => setOpen(false)} />}
      <aside className={'side no-print' + (open ? ' open' : '')}>
        <div className="brand">
          <span className="mark"><Logo variant="icon" /></span>
          <div><b>Orgest</b><small>{me.shopName || me.username}{me.city ? ` · ${me.city}` : ''}</small></div>
        </div>
        <nav className="nav" aria-label="Menu">
          {groups.map((g, gi) => (
            <div className="grp" key={gi}>
              {g.title && <span>{t(g.title)}</span>}
              {g.items.map(([to, key, icon, end]) => (
                <NavLink key={to} to={to} end={end}>
                  <Icon d={P[icon]} /> <span>{t(key)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        {me.role === 'SHOP' && (
          <div className="sub-card">
            <div className="r"><b style={{ fontWeight: 500 }}>{t('sub.title')}</b><span className={'pill' + (left <= 7 ? ' warn' : '')}>{left <= 7 ? t('sub.expiring') : t('sub.active')}</span></div>
            <div className="bar"><i style={{ width: Math.min(100, (left / total) * 100) + '%' }} /></div>
            <small>{t('sub.left', { n: left, d: fmtDate(me.subscriptionEnd) })}</small>
          </div>
        )}
        <LangToggle />
        <div className="userbox">
          <div className="av">{initial}</div>
          <div className="nm">{me.ownerName || me.username}<small>{me.role === 'ADMIN' ? t('role.admin') : me.role === 'STAFF' ? t('role.staff') : t('role.owner')}</small></div>
          <button type="button" onClick={logout} aria-label={t('logout')} title={t('logout')}><Icon d={P.out} /></button>
        </div>
      </aside>
      <main className="main" key={loc.pathname} ref={mainRef}>
        {me.role !== 'ADMIN' && <OfflineBar />}
        <div className="inner">
          {children}
        </div>
      </main>
      {searchable && <SleepyLouiz />}
    </div>
  );
}

const STAFF_GROUPS = [
  { title: 'nav.g.cash', items: [['/app/sale', 'nav.sale', 'sale'], ['/app/exchange', 'nav.exchange', 'exchange'], ['/app/buyback', 'nav.buyback', 'buyback']] },
  { title: 'nav.g.inv', items: [['/app/stock', 'nav.stock', 'stock'], ['/app/workshop', 'nav.workshop', 'workshop'], ['/app/labels', 'nav.labels', 'tag']] },
  { title: 'nav.g.follow', items: [['/app/installments', 'nav.installments', 'calendar'], ['/app/customers', 'nav.customers', 'user'], ['/app/sales', 'nav.sales', 'list']] },
];

const SHOP_GROUPS = [
  { items: [['/app', 'nav.dashboard', 'dash', true]] },
  { title: 'nav.g.cash', items: [['/app/sale', 'nav.sale', 'sale'], ['/app/exchange', 'nav.exchange', 'exchange'], ['/app/buyback', 'nav.buyback', 'buyback']] },
  { title: 'nav.g.inv', items: [['/app/stock', 'nav.stock', 'stock'], ['/app/workshop', 'nav.workshop', 'workshop'], ['/app/labels', 'nav.labels', 'tag']] },
  { title: 'nav.g.follow', items: [['/app/installments', 'nav.installments', 'calendar'], ['/app/customers', 'nav.customers', 'user'], ['/app/sales', 'nav.sales', 'list'], ['/app/reports', 'nav.reports', 'chart']] },
  { title: 'nav.g.account', items: [['/app/team', 'nav.team', 'user'], ['/app/account', 'nav.myshop', 'user']] },
];

function useShortcuts() {
  const nav = useNavigate();
  useEffect(() => {
    const onKey = (e) => {
      const map = { F2: '/app/sale', F3: '/app/exchange', F4: '/app/buyback', F6: '/app/stock/new' };
      if (map[e.key]) { e.preventDefault(); nav(map[e.key]); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav]);
}

export function ShopLayout() {
  const { me } = useAuth();
  const loc = useLocation();
  useShortcuts();
  const blocked = !me.subscriptionValid && !(me.role === 'SHOP' && loc.pathname.startsWith('/app/account'));
  return (
    <Shell groups={me.role === 'STAFF' ? STAFF_GROUPS : SHOP_GROUPS} searchable>
      {blocked ? <Expired /> : <Outlet />}
    </Shell>
  );
}

const ADMIN_GROUPS = [
  { items: [['/admin', 'nav.clients', 'dash', true], ['/admin/new', 'nav.newClient', 'plus']] },
  { title: 'nav.g.site', items: [['/admin/plans', 'nav.plans', 'tag'], ['/admin/blog', 'nav.blogAdmin', 'doc']] },
  { items: [['/admin/account', 'nav.account', 'user']] },
];

export function AdminLayout() {
  return (
    <Shell groups={ADMIN_GROUPS}>
      <Outlet />
    </Shell>
  );
}
