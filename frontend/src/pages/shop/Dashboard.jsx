import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { useApi } from '../../hooks.js';
import { fmtDateTime, fmtInt, fmtMoney, fmtWeight, Money, useI18n } from '../../i18n.jsx';
import { ErrorBox, Loading } from '../../components/ui.jsx';
import { Icon, P } from '../../components/icons.jsx';
import Louiz from '../../components/Louiz.jsx';
import Tour from '../../components/Tour.jsx';
import { round2 as r2 } from '../../lib/money.js';

const isToday = (iso) => !!iso && new Date(iso).toDateString() === new Date().toDateString();

function PricesCard({ prices, entered, editing, setEditing, onSaved }) {
  const { t } = useI18n();
  const [vals, setVals] = useState({});
  const [dirty, setDirty] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    const v = {};
    prices.forEach((p) => { v[p.karat] = { sell: p.sellPerGram > 0 ? String(p.sellPerGram) : '', buy: p.buyPerGram > 0 ? String(p.buyPerGram) : '' }; });
    setVals(v); setDirty({}); setError(null);
  }, [editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (karat, field, value) => {
    const next = { ...vals, [karat]: { ...vals[karat], [field]: value } };
    const d = { ...dirty };
    d[`${karat}.${field}`] = true;
    // Astuce : 18K et 21K se déduisent du 24K tant qu'on ne les a pas corrigés à la main.
    if (karat === 24) {
      const n = Number(value);
      [[18, 0.75], [21, 0.875]].forEach(([k, f]) => {
        if (!d[`${k}.${field}`]) next[k] = { ...next[k], [field]: value === '' || !n ? '' : String(r2(n * f)) };
      });
      delete d[`24.${field}`]; d[`24.${field}`] = true;
    }
    setVals(next); setDirty(d);
  };

  const save = async () => {
    setBusy(true); setError(null);
    try {
      await api('/shop/prices', { method: 'PUT', body: { prices: Object.entries(vals).map(([k, v]) => ({ karat: Number(k), sellPerGram: Number(v.sell || 0), buyPerGram: Number(v.buy || 0) })) } });
      setEditing(false); onSaved();
    } catch (e) { setError(e); } finally { setBusy(false); }
  };

  const order = [18, 21, 24];
  return (
    <section className="panel" id="prices-card">
      <div className="hd">
        <h2>{t('dash.pricesTitle')} <small>{t('dash.perG')}</small></h2>
        <span className={'tag ' + (entered ? 'ok' : 'warn')}>{entered ? t('dash.updated') : t('dash.notToday')}</span>
        {!editing
          ? <button type="button" className="btn" onClick={() => setEditing(true)}>{t('edit')}</button>
          : <div className="row"><button type="button" className="btn primary" disabled={busy} onClick={save}>{t('save')}</button><button type="button" className="btn" onClick={() => setEditing(false)}>{t('cancel')}</button></div>}
      </div>
      <div className="carats">
        {order.map((k) => {
          const p = prices.find((x) => x.karat === k) || { karat: k, sellPerGram: 0, buyPerGram: 0 };
          const empty = !(p.sellPerGram > 0);
          return (
            <div key={k} className={'carat' + (empty && !editing ? ' empty' : '')}>
              <b>{k}K</b>
              {['sell', 'buy'].map((f) => (
                <div className="ln" key={f}>
                  <span>{f === 'sell' ? t('dash.sell') : t('dash.buy')}</span>
                  {editing
                    ? <input className="input" type="number" min="0" step="0.01" inputMode="decimal" dir="ltr" aria-label={`${k}K ${f}`} value={vals[k]?.[f] ?? ''} onChange={(e) => change(k, f, e.target.value)} />
                    : <b>{empty ? '—' : fmtMoney(f === 'sell' ? p.sellPerGram : p.buyPerGram)} {empty ? t('dh') : ''}</b>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <p className="hint" style={{ margin: '12px 0 0' }}>{t('dash.tip')}</p>
      <ErrorBox error={error} />
    </section>
  );
}

export default function Dashboard() {
  const { t, lang } = useI18n();
  const { me } = useAuth();
  const nav = useNavigate();
  const { data: d, error, loading, reload } = useApi('/shop/dashboard');
  const [editing, setEditing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const tourKey = `orgest_tour_${me.username}`;
  const [tour, setTour] = useState(() => { try { return !localStorage.getItem(tourKey); } catch { return false; } });
  const closeTour = () => { try { localStorage.setItem(tourKey, '1'); } catch { /* ignore */ } setTour(false); };

  const entered = useMemo(() => !!d && d.prices.some((p) => p.sellPerGram > 0 && isToday(p.updatedAt)), [d]);

  if (loading && !d) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const todo = [
    { k: 'shop', done: !!(me.address && me.phone), to: '/app/account', cta: t('dash.fill') },
    { k: 'sale', done: d.recentSales.length > 0 || d.salesMonth > 0, to: '/app/sale', cta: t('dash.enter') },
    { k: 'prices', done: entered, act: () => { setEditing(true); document.getElementById('prices-card')?.scrollIntoView({ behavior: 'smooth' }); }, cta: t('dash.enter') },
    { k: 'stock', done: d.stockCount > 0, to: '/app/stock/new', cta: t('dash.addShort') },
  ];
  const doneN = todo.filter((x) => x.done).length;
  const goPrices = () => { setEditing(true); document.getElementById('prices-card')?.scrollIntoView({ behavior: 'smooth' }); };
  const today = new Date().toLocaleDateString(lang === 'ar' ? 'ar-MA-u-nu-latn' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const avg = d.salesCountToday > 0 ? d.salesToday / d.salesCountToday : 0;

  const actions = [
    { to: '/app/sale', l: t('qa.sale'), s: t('qa.sale.s'), key: 'F2', ic: P.sale, bg: '#FFF1C7', fg: '#8A6209' },
    { to: '/app/exchange', l: t('qa.ex'), s: t('qa.ex.s'), key: 'F3', ic: P.exchange, bg: '#E6EEF9', fg: '#1E4F8F' },
    { to: '/app/buyback', l: t('qa.buy'), s: t('qa.buy.s'), key: 'F4', ic: P.buyback, bg: '#E7F4EC', fg: '#1E5E3F' },
    { to: '/app/stock/new', l: t('qa.add'), s: t('qa.add.s'), key: 'F6', ic: P.plus, bg: '#F3E8F7', fg: '#6B2F86' },
  ];

  return (
    <div className="stack" style={{ gap: 24 }}>
      {tour && <Tour onClose={closeTour} />}
      <header>
        <h1 style={{ fontSize: 28, fontWeight: 600 }}>{t('top.hello', { name: me.ownerName || me.shopName || me.username })}</h1>
        <span className="muted" style={{ fontSize: 14 }}>{today} · {t('top.cashOpen')}</span>
      </header>

      {!entered && !dismissed && (
        <section className="alert-louiz" aria-label="Alerte">
          <Louiz mood="worried" size={76} />
          <div className="tx"><strong style={{ fontSize: 16, fontWeight: 600 }}>{t('dash.alertTitle')}</strong><span>{t('dash.alertText')}</span></div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn ink" onClick={goPrices}>{t('dash.enterPrices')}</button>
            <button type="button" className="btn" style={{ background: 'transparent', borderColor: '#E0C77E', color: '#5C4A1C' }} onClick={() => setDismissed(true)}>{t('dash.later')}</button>
          </div>
        </section>
      )}

      <section className="quick" aria-label="Actions rapides">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className="qa">
            <span className="ic" style={{ background: a.bg, color: a.fg }}><Icon d={a.ic} size={24} /></span>
            <span className="tx"><b>{a.l}</b><span>{a.s}</span></span>
            <kbd className="kbd">{a.key}</kbd>
          </Link>
        ))}
      </section>

      <section className="kpis" aria-label="KPI">
        <div className="kpi2"><span className="l">{t('dash.salesToday')}</span><span className="v num">{fmtInt(d.salesToday)} <small>{t('dh')}</small></span><span className="s">{t('dash.salesCount', { n: d.salesCountToday })}{d.salesCountToday > 0 ? ` · ${t('dash.avgBasket')} ${fmtInt(avg)} ${t('dh')}` : ''}</span></div>
        <div className="kpi2"><span className="l">{t('dash.salesMonth')}</span><span className="v num">{fmtInt(d.salesMonth)} <small>{t('dh')}</small></span><span className="s">{t('dash.buybackMonth')} : {fmtInt(d.buybackMonth)} {t('dh')}</span></div>
        <div className="kpi2"><span className="l">{t('dash.stock')}</span><span className="v num">{fmtInt(d.stockCount)} <small>{t('dash.piece')}</small></span><span className="s">{fmtWeight(d.stockWeightG)} g · {t('dash.value')} ≈ {fmtInt(d.stockValue)} {t('dh')}</span></div>
        <div className="kpi2"><span className="l">{t('dash.installments')}</span><span className="v num">{fmtInt(d.installmentsOutstanding)} <small>{t('dh')}</small></span><span className={'s' + (d.overdueInstallments === 0 ? ' ok' : '')}>{d.overdueInstallments === 0 ? t('dash.noneLate') : t('dash.overdue', { n: d.overdueInstallments })}</span></div>
      </section>

      <div className="dash-cols">
        <div className="l">
          <PricesCard prices={d.prices} entered={entered} editing={editing} setEditing={setEditing} onSaved={reload} />
          <section className="panel">
            <div className="hd"><h2>{t('dash.topCats')}</h2></div>
            {(d.topCategories || []).length === 0 ? <p className="muted" style={{ margin: 0 }}>{t('dash.noCats')}</p> : (
              <ul className="topcats">
                {d.topCategories.map((c) => (
                  <li key={c.category}>
                    <span className="n">{c.category === 'AUTRE' ? t('cat.other') : t('cat.' + c.category.toLowerCase())}</span>
                    <span className="bar"><i style={{ width: Math.max(4, (Number(c.total) / Number(d.topCategories[0].total)) * 100) + '%' }} /></span>
                    <span className="num">{fmtInt(c.total)} {t('dh')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel">
            <div className="hd"><h2>{t('dash.recent')}</h2><Link to="/app/sales" style={{ fontSize: 14, fontWeight: 500 }}>{t('seeAll')}</Link></div>
            {d.recentSales.length === 0 ? <p className="muted" style={{ margin: 0 }}>{t('dash.noSales')}</p> : (
              <div className="tablewrap">
                <table style={{ minWidth: 520 }}>
                  <thead><tr><th>{t('receipt.title')}</th><th>{t('customer')}</th><th>{t('date')}</th><th style={{ textAlign: 'end' }}>{t('total')}</th><th /></tr></thead>
                  <tbody>
                    {d.recentSales.map((s) => (
                      <tr key={s.id}>
                        <td><Link to={`/app/sales/${s.id}`} style={{ fontWeight: 600 }}>{s.number}</Link></td>
                        <td>{s.customerName || '—'}</td>
                        <td className="muted">{fmtDateTime(s.createdAt)}</td>
                        <td style={{ textAlign: 'end', fontWeight: 600 }}><Money v={s.subtotal} /></td>
                        <td style={{ textAlign: 'end' }}><button type="button" className="btn sm" aria-label={t('dash.reprint')} onClick={() => nav(`/app/sales/${s.id}`)}><Icon d={P.print} size={18} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="r">
          <section className="guide">
            <div className="hd">
              <Louiz mood={doneN === 4 ? 'proud' : 'happy'} size={72} />
              <div><small>{t('dash.guide')}</small><b>{t('dash.startSteps', { a: doneN, b: 4 })}</b></div>
            </div>
            <div className="bar"><i style={{ width: (doneN / 4) * 100 + '%' }} /></div>
            <ul>
              {todo.map((x) => (
                <li key={x.k} className={x.done ? 'done' : ''}>
                  <span className="dot">{x.done && <Icon d={P.check} size={14} sw={3} />}</span>
                  <span className="t">{t(`dash.todo.${x.k}`)}</span>
                  {!x.done && (x.to ? <Link to={x.to}>{x.cta}</Link> : <button type="button" className="lnk" onClick={x.act}>{x.cta}</button>)}
                </li>
              ))}
            </ul>
            <button type="button" className="lnk" onClick={() => setTour(true)}>{t('dash.replayTour')}</button>
          </section>

          <section className="panel stack" style={{ gap: 10 }}>
            <h2>{t('dash.workshopTitle')}</h2>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>{d.openWorkshop > 0 ? t('dash.workshopOpen', { n: d.openWorkshop }) : t('dash.workshopEmpty')}</p>
            <Link className="btn" style={{ alignSelf: 'flex-start' }} to="/app/workshop">{d.openWorkshop > 0 ? t('seeAll') : t('dash.newOrder')}</Link>
          </section>

          <section className="panel stack" style={{ gap: 10 }}>
            <h2>{t('dash.instTitle')}</h2>
            <p className="muted" style={{ margin: 0, fontSize: 14 }}><b className="num" style={{ color: 'var(--ink)' }}>{fmtInt(d.installmentsOutstanding)} {t('dh')}</b> · {d.overdueInstallments === 0 ? t('dash.instEmpty') : t('dash.overdue', { n: d.overdueInstallments })}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
