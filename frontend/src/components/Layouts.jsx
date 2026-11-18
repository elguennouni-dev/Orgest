import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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

function Shell({ groups, children, searchable }) {
  const { t } = useI18n();
  const { me, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const searchRef = useRef(null);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  const total = 30;
  const left = Math.max(0, me.daysLeft || 0);
  const initial = (me.ownerName || me.shopName || me.username || '?').trim().charAt(0).toUpperCase();

  const onSearch = (e) => {
    e.preventDefault();
    if (q.trim()) nav(`/app/stock?q=${encodeURIComponent(q.trim())}`);
  };

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
        <div className="userbox">
          <div className="av">{initial}</div>
          <div className="nm">{me.ownerName || me.username}<small>{me.role === 'ADMIN' ? t('role.admin') : t('role.owner')}</small></div>
          <button type="button" onClick={logout} aria-label={t('logout')} title={t('logout')}><Icon d={P.out} /></button>
        </div>
      </aside>
      <main className="main" key={loc.pathname}>
        <div className="inner">
          {searchable && (
            <div className="top no-print">
              <form className="search" onSubmit={onSearch} role="search" style={{ flex: '1 1 320px' }}>
                <Icon d={P.search} size={18} />
                <input ref={searchRef} id="global-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('top.search')} aria-label={t('search')} />
                <kbd className="kbd">/</kbd>
              </form>
              <span style={{ flex: 1 }} />
              <LangToggle />
              <Link className="btn primary" to="/app/sale"><Icon d={P.plus} size={18} sw={2} /> {t('top.newSale')} <kbd className="kbd">F2</kbd></Link>
            </div>
          )}
          {children}
        </div>
      </main>
      {searchable && <SleepyLouiz />}
    </div>
  );
}

const SHOP_GROUPS = [
  { items: [['/app', 'nav.dashboard', 'dash', true]] },
  { title: 'nav.g.cash', items: [['/app/sale', 'nav.sale', 'sale'], ['/app/exchange', 'nav.exchange', 'exchange'], ['/app/buyback', 'nav.buyback', 'buyback']] },
  { title: 'nav.g.inv', items: [['/app/stock', 'nav.stock', 'stock'], ['/app/workshop', 'nav.workshop', 'workshop']] },
  { title: 'nav.g.follow', items: [['/app/installments', 'nav.installments', 'calendar'], ['/app/sales', 'nav.sales', 'list'], ['/app/reports', 'nav.reports', 'chart']] },
  { title: 'nav.g.account', items: [['/app/account', 'nav.myshop', 'user']] },
];

function useShortcuts() {
  const nav = useNavigate();
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
      const map = { F2: '/app/sale', F3: '/app/exchange', F4: '/app/buyback', F6: '/app/stock/new' };
      if (map[e.key]) { e.preventDefault(); nav(map[e.key]); return; }
      if (e.key === '/' && !typing) { const el = document.getElementById('global-search'); if (el) { e.preventDefault(); el.focus(); } }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav]);
}

export function ShopLayout() {
  const { me } = useAuth();
  const loc = useLocation();
  useShortcuts();
  const blocked = !me.subscriptionValid && !loc.pathname.startsWith('/app/account');
  const pos = loc.pathname === '/app/sale' || loc.pathname === '/app/exchange';
  if (pos && !blocked) return <Outlet />;
  return (
    <Shell groups={SHOP_GROUPS} searchable>
      {blocked ? <Expired /> : <Outlet />}
    </Shell>
  );
}

const ADMIN_GROUPS = [
  { items: [['/admin', 'nav.clients', 'dash', true], ['/admin/new', 'nav.newClient', 'plus'], ['/admin/account', 'nav.account', 'user']] },
];

export function AdminLayout() {
  return (
    <Shell groups={ADMIN_GROUPS}>
      <div className="top no-print" style={{ justifyContent: 'flex-end' }}><LangToggle /></div>
      <Outlet />
    </Shell>
  );
}
