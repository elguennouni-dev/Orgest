import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks.js';
import { fmtMoney, fmtWeight, Money, useI18n } from '../../i18n.jsx';
import { ErrorBox, Field, KARATS, Loading, PageHead } from '../../components/ui.jsx';

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function Sale({ mode }) {
  const { t } = useI18n();
  const nav = useNavigate();
  const isEx = mode === 'EXCHANGE';
  const [q, setQ] = useState('');
  const items = useApi(`/shop/items?status=IN_STOCK&q=${encodeURIComponent(q)}&size=48`);
  const prices = useApi('/shop/prices');
  const [lines, setLines] = useState([]);
  const [cust, setCust] = useState({ name: '', phone: '' });
  const [withOld, setWithOld] = useState(isEx);
  const [old, setOld] = useState({ karat: 18, gross: '', ded: '0', price: '', description: '' });
  const [pay, setPay] = useState({ mode: 'CASH', months: 6, down: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const sellOf = (k) => Number(prices.data?.find((p) => p.karat === k)?.sellPerGram || 0);
  const buyOf = (k) => Number(prices.data?.find((p) => p.karat === k)?.buyPerGram || 0);

  const toggle = (it) => {
    if (lines.some((l) => l.itemId === it.id)) setLines(lines.filter((l) => l.itemId !== it.id));
    else setLines([...lines, { itemId: it.id, label: `${it.name} (${it.ref})`, karat: it.karat, weightG: Number(it.weightG), price: sellOf(it.karat), making: Number(it.makingPerGram) }]);
  };
  const upd = (id, k, v) => setLines(lines.map((l) => (l.itemId === id ? { ...l, [k]: v } : l)));

  const calc = useMemo(() => {
    const subtotal = r2(lines.reduce((s, l) => s + l.weightG * (Number(l.price || 0) + Number(l.making || 0)), 0));
    let net = 0, tradeIn = 0;
    if (withOld) {
      net = Math.round(Number(old.gross || 0) * (1 - Number(old.ded || 0) / 100) * 1000) / 1000;
      tradeIn = r2(net * Number(old.price || buyOf(old.karat)));
    }
    const balance = r2(subtotal - tradeIn);
    const down = pay.mode === 'INSTALLMENT' ? Number(pay.down || 0) : 0;
    const monthly = pay.mode === 'INSTALLMENT' && pay.months > 0 ? r2((balance - down) / pay.months) : 0;
    return { subtotal, net, tradeIn, balance, down, monthly };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, withOld, old, pay, prices.data]);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const body = {
        type: isEx ? 'EXCHANGE' : 'SALE',
        customerName: cust.name || null,
        customerPhone: cust.phone || null,
        lines: lines.map((l) => ({ itemId: l.itemId, pricePerGram: Number(l.price || 0), makingPerGram: Number(l.making || 0) })),
        oldGold: withOld ? { karat: Number(old.karat), grossWeightG: Number(old.gross), deductionPct: Number(old.ded || 0), pricePerGram: Number(old.price || buyOf(old.karat)), description: old.description || null, customerName: cust.name || null, customerPhone: cust.phone || null } : null,
        paymentMode: pay.mode,
        downPayment: pay.mode === 'INSTALLMENT' ? Number(pay.down || 0) : null,
        months: pay.mode === 'INSTALLMENT' ? Number(pay.months) : null,
      };
      const sale = await api('/shop/sales', { method: 'POST', body });
      nav(`/app/sales/${sale.id}`);
    } catch (e) { setError(e); setBusy(false); }
  };

  const canSubmit = lines.length > 0 && (!withOld || Number(old.gross) > 0) && !busy;

  return (
    <>
      <PageHead title={isEx ? t('nav.exchange') : t('nav.sale')} />
      {isEx && <p className="hint">{t('exchange.help')}</p>}
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <h2>{t('sale.pickItems')}</h2>
          <input className="input" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 12 }} />
          {items.loading && !items.data ? <Loading /> : (
            <div className="items" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
              {items.data?.content.map((it) => (
                <div key={it.id} className={'item pick' + (lines.some((l) => l.itemId === it.id) ? ' sel' : '')} onClick={() => toggle(it)}>
                  <div className="ph">{it.hasPhoto ? <img loading="lazy" src={`/api/shop/items/${it.id}/photo`} alt="" /> : <span>◈</span>}</div>
                  <div className="body"><b style={{ fontSize: 13 }}>{it.name}</b><span className="hint">{it.karat}K · {fmtWeight(it.weightG)} g</span></div>
                </div>
              ))}
              {items.data?.content.length === 0 && <p className="muted">{t('stock.empty')}</p>}
            </div>
          )}
        </div>

        <div className="stack">
          <div className="card stack">
            <h2>{t('sale.lines')}</h2>
            {lines.length === 0 && <p className="muted">{t('sale.noLines')}</p>}
            {lines.map((l) => (
              <div key={l.itemId} className="card" style={{ background: '#FFFCF1' }}>
                <div className="row spread"><b>{l.label}</b><span className="num">{l.karat}K · {fmtWeight(l.weightG)} g</span></div>
                <div className="grid g2" style={{ marginTop: 8 }}>
                  <Field label={t('receipt.pricePerG')}><input className="input" type="number" min="0" step="0.01" value={l.price} onChange={(e) => upd(l.itemId, 'price', e.target.value)} dir="ltr" /></Field>
                  <Field label={t('receipt.making')}><input className="input" type="number" min="0" step="0.01" value={l.making} onChange={(e) => upd(l.itemId, 'making', e.target.value)} dir="ltr" /></Field>
                </div>
                <div className="row spread" style={{ marginTop: 6 }}>
                  <button className="btn sm danger" onClick={() => setLines(lines.filter((x) => x.itemId !== l.itemId))}>{t('remove')}</button>
                  <b><Money v={r2(l.weightG * (Number(l.price || 0) + Number(l.making || 0)))} /></b>
                </div>
              </div>
            ))}
          </div>

          <div className="card stack">
            <div className="row spread">
              <h2>{t('sale.oldGold')}</h2>
              {!isEx && <label className="row"><input type="checkbox" checked={withOld} onChange={(e) => setWithOld(e.target.checked)} /> {t('sale.addOldGold')}</label>}
            </div>
            {withOld && (
              <div className="grid g2">
                <Field label={t('karat')}><select value={old.karat} onChange={(e) => setOld({ ...old, karat: Number(e.target.value), price: '' })}>{KARATS.map((k) => <option key={k} value={k}>{k}K</option>)}</select></Field>
                <Field label={t('buyback.gross')}><input className="input" type="number" min="0" step="0.001" value={old.gross} onChange={(e) => setOld({ ...old, gross: e.target.value })} dir="ltr" /></Field>
                <Field label={t('buyback.deduction')} hint={t('buyback.deductionHint')}><input className="input" type="number" min="0" max="99" step="0.1" value={old.ded} onChange={(e) => setOld({ ...old, ded: e.target.value })} dir="ltr" /></Field>
                <Field label={t('buyback.priceG')} hint={`${t('dash.buyPrice')}: ${fmtMoney(buyOf(old.karat))}`}><input className="input" type="number" min="0" step="0.01" placeholder={String(buyOf(old.karat))} value={old.price} onChange={(e) => setOld({ ...old, price: e.target.value })} dir="ltr" /></Field>
                <div className="hint">{t('buyback.net')}: <b className="num">{fmtWeight(calc.net)} g</b> → <Money v={calc.tradeIn} /></div>
              </div>
            )}
          </div>

          <div className="card stack">
            <h2>{t('customer')} ({t('optional')})</h2>
            <div className="grid g2">
              <Field label={t('name')}><input className="input" value={cust.name} maxLength={120} onChange={(e) => setCust({ ...cust, name: e.target.value })} /></Field>
              <Field label={t('phone')}><input className="input" value={cust.phone} maxLength={30} onChange={(e) => setCust({ ...cust, phone: e.target.value })} dir="ltr" /></Field>
            </div>
            <h2>{t('sale.payment')}</h2>
            <div className="row">
              <label className="row"><input type="radio" checked={pay.mode === 'CASH'} onChange={() => setPay({ ...pay, mode: 'CASH' })} /> {t('sale.cash')}</label>
              <label className="row"><input type="radio" checked={pay.mode === 'INSTALLMENT'} onChange={() => setPay({ ...pay, mode: 'INSTALLMENT' })} /> {t('sale.installment')}</label>
            </div>
            {pay.mode === 'INSTALLMENT' && (
              <div className="grid g2">
                <Field label={t('sale.down')}><input className="input" type="number" min="0" step="0.01" value={pay.down} onChange={(e) => setPay({ ...pay, down: e.target.value })} dir="ltr" /></Field>
                <Field label={t('sale.months')}><select value={pay.months} onChange={(e) => setPay({ ...pay, months: Number(e.target.value) })}>{[2, 3, 4, 6, 9, 12, 18, 24].map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>
                <div className="hint grow">{t('sale.monthly')}: <b><Money v={calc.monthly} /></b> · {t('sale.lockedHint')}</div>
              </div>
            )}
          </div>

          <div className="card stack" style={{ borderColor: 'var(--gold)' }}>
            <div className="row spread"><span>{t('receipt.subtotal')}</span><b><Money v={calc.subtotal} /></b></div>
            {withOld && <div className="row spread"><span>− {t('receipt.tradeIn')}</span><b><Money v={calc.tradeIn} /></b></div>}
            <div className="row spread" style={{ fontSize: 20 }}><b>{calc.balance < 0 ? t('receipt.refund') : t('receipt.toPay')}</b><b><Money v={Math.abs(calc.balance)} /></b></div>
            <ErrorBox error={error} />
            <button className="btn primary block" disabled={!canSubmit} onClick={submit}>{busy ? t('loading') : t('sale.confirm')}</button>
          </div>
        </div>
      </div>
    </>
  );
}
