import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { LangSwitch, Logo } from './ui.jsx';
import Expired from '../pages/shop/Expired.jsx';

function Shell({ items, children }) {
  const { t } = useI18n();
  const { me, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  return (
    <div className="shell">
      <div className="topbar no-print">
        <button className="btn" type="button" onClick={() => setOpen(true)} aria-label="Menu">☰</button>
        <Logo style={{ height: 34 }} />
        <LangSwitch />
      </div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={'side no-print' + (open ? ' open' : '')}>
        <div className="brand"><Logo variant="wordmark" /></div>
        <nav className="nav" onClick={() => setOpen(false)}>
          {items.map(([to, key, icon, end]) => (
            <NavLink key={to} to={to} end={end}>
              <span aria-hidden="true">{icon}</span> {t(key)}
            </NavLink>
          ))}
        </nav>
        <div className="foot">
          <div><b>{me.shopName || me.username}</b><br /><span style={{ opacity: .7 }}>{me.username}</span></div>
          <LangSwitch />
          <button className="btn sm" type="button" onClick={logout}>{t('logout')}</button>
        </div>
      </aside>
      <main className="main" key={loc.pathname}>{children}</main>
    </div>
  );
}

const SHOP_NAV = [
  ['/app', 'nav.dashboard', '▦', true],
  ['/app/stock', 'nav.stock', '◈'],
  ['/app/sale', 'nav.sale', '＄'],
  ['/app/exchange', 'nav.exchange', '⇄'],
  ['/app/buyback', 'nav.buyback', '⬇'],
  ['/app/workshop', 'nav.workshop', '⚒'],
  ['/app/installments', 'nav.installments', '◷'],
  ['/app/sales', 'nav.sales', '☰'],
  ['/app/reports', 'nav.reports', '▤'],
  ['/app/account', 'nav.account', '☺'],
];

export function ShopLayout() {
  const { me } = useAuth();
  const loc = useLocation();
  const blocked = !me.subscriptionValid && !loc.pathname.startsWith('/app/account');
  return (
    <Shell items={SHOP_NAV}>
      {blocked ? <Expired /> : <Outlet />}
    </Shell>
  );
}

const ADMIN_NAV = [
  ['/admin', 'nav.clients', '▦', true],
  ['/admin/new', 'nav.newClient', '＋'],
  ['/admin/account', 'nav.account', '☺'],
];

export function AdminLayout() {
  return (
    <Shell items={ADMIN_NAV}>
      <Outlet />
    </Shell>
  );
}
