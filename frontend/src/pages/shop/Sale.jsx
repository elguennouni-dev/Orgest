import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks.js';
import { fmtDate, fmtMoney, fmtWeight, Money, useI18n } from '../../i18n.jsx';
import { purity } from '../../lib/purity.js';
import { ErrorBox, Field, KARATS, Loading, Modal } from '../../components/ui.jsx';
import { Icon, P } from '../../components/icons.jsx';
import Louiz from '../../components/Louiz.jsx';
import { lineTotal, round2, saleSummary } from '../../lib/money.js';
import { cameraScanSupported, exactRef } from '../../lib/scan.js';
import ScanModal from '../../components/ScanModal.jsx';
import { newRef } from '../../lib/offline.js';
import { enqueueSale, isNetworkError } from '../../lib/sync.js';

let uid = 0;
const PAY_METHODS = ['CASH', 'CHEQUE', 'CARD', 'TRANSFER', 'CREDIT'];

export default function Sale({ mode }) {
  const { t } = useI18n();
  const nav = useNavigate();
  const isEx = mode === 'EXCHANGE';
  const [q, setQ] = useState('');
  const [karat, setKarat] = useState(0);
  const items = useApi(`/shop/items?status=IN_STOCK&q=${encodeURIComponent(q)}&karat=${karat}&size=60`);
  const prices = useApi('/shop/prices');
  const custList = useApi('/shop/customers?size=100');
  const [lines, setLines] = useState([]);
  const [cust, setCust] = useState({ name: '', phone: '' });
  const [showCust, setShowCust] = useState(false);
  const [withOld, setWithOld] = useState(isEx);
  const [old, setOld] = useState({ karat: 18, gross: '', ded: '0', price: '', description: '' });
  const [pay, setPay] = useState({ mode: 'CASH', months: 6, down: '', method: 'CASH' });
  const [free, setFree] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [queued, setQueued] = useState(false);
  const clientRef = useRef(newRef());
  const [scanMsg, setScanMsg] = useState(null);

  const sellOf = (k) => Number(prices.data?.find((p) => p.karat === k)?.sellPerGram || 0);
  const buyOf = (k) => Number(prices.data?.find((p) => p.karat === k)?.buyPerGram || 0);
  const pricesSet = KARATS.some((k) => sellOf(k) > 0);

  const toggle = (it) => {
    if (lines.some((l) => l.itemId === it.id)) setLines(lines.filter((l) => l.itemId !== it.id));
    else setLines([...lines, { key: 'i' + it.id, itemId: it.id, label: `${it.name} (${it.ref})`, karat: it.karat, weightG: Number(it.weightG), qty: 1, max: it.quantity ?? 1, price: sellOf(it.karat), making: Number(it.makingPerGram) }]);
  };
  const linesRef = useRef(lines); linesRef.current = lines;
  const addByCode = async (code) => {
    setScanMsg(null);
    try {
      const r = await api(`/shop/items?status=IN_STOCK&q=${encodeURIComponent(code)}&size=10`);
      const it = exactRef(r.content, code);
      if (!it) { setScanMsg(t('scan.notFound') + code); return false; }
      if (!linesRef.current.some((l) => l.itemId === it.id)) toggle(it);
      return true;
    } catch (e) { setError(e); return false; }
  };
  const upd = (key, k, v) => setLines(lines.map((l) => (l.key === key ? { ...l, [k]: v } : l)));

  const oldPrice = old.price !== '' ? Number(old.price) : buyOf(old.karat);
  const calc = useMemo(() => saleSummary({
    lines, withOld, old, buyPrice: buyOf(old.karat), mode: pay.mode, months: pay.months, down: pay.down, customerName: cust.name,
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [lines, withOld, old, pay, cust.name, prices.data]);

  const linesOk = lines.every((l) => Number(l.price) > 0 && Number(l.weightG) > 0 && Number(l.making || 0) >= 0 && l.qty >= 1 && l.qty <= l.max);
  const oldOk = !withOld || (Number(old.gross) > 0 && Number(old.ded || 0) >= 0 && Number(old.ded || 0) <= 99 && oldPrice > 0 && calc.net > 0);
  const instErr = pay.mode === 'INSTALLMENT' ? calc.instError : null;
  const isCredit = pay.mode === 'CASH' && pay.method === 'CREDIT';
  const creditDown = Math.max(Number(pay.down || 0), 0);
  const creditErr = !isCredit ? null : !cust.name.trim() ? 'CUSTOMER_REQUIRED' : !(calc.balance > 0) ? 'NO_BALANCE' : creditDown >= calc.balance ? 'DOWN_TOO_HIGH' : null;
  const canSubmit = lines.length > 0 && linesOk && oldOk && !instErr && !creditErr && !busy;
  const blocker = lines.length === 0 ? t('pos.needOne') : !linesOk ? t('pos.fixPrice') : !oldOk ? t('pos.fixOld') : null;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setError(null);
    let body = null;
    try {
      body = {
        type: isEx ? 'EXCHANGE' : 'SALE',
        customerName: cust.name || null,
        customerPhone: cust.phone || null,
        lines: lines.map((l) => (l.itemId
          ? { itemId: l.itemId, quantity: l.qty, pricePerGram: Number(l.price || 0), makingPerGram: Number(l.making || 0) }
          : { description: l.label, karat: l.karat, weightG: l.weightG, quantity: l.qty, pricePerGram: Number(l.price || 0), makingPerGram: Number(l.making || 0) })),
        oldGold: withOld ? { karat: Number(old.karat), grossWeightG: Number(old.gross), deductionPct: Number(old.ded || 0), pricePerGram: oldPrice, description: old.description || null, customerName: cust.name || null, customerPhone: cust.phone || null } : null,
        paymentMode: pay.mode,
        payMethod: pay.method,
        downPayment: pay.mode === 'INSTALLMENT' || isCredit ? Number(pay.down || 0) : null,
        months: pay.mode === 'INSTALLMENT' ? Number(pay.months) : null,
        clientRef: clientRef.current,
      };
      const sale = await api('/shop/sales', { method: 'POST', body });
      nav(`/app/sales/${sale.id}`, { state: { celebrate: true } });
    } catch (e) {
      if (isNetworkError(e)) {
        // Pas de connexion : la vente est gardée sur l'appareil et partira toute seule au retour d'Internet.
        await enqueueSale(body, { total: calc.balance, customer: cust.name, n: lines.length });
        clientRef.current = newRef();
        setLines([]); setCust({ name: '', phone: '' }); setQueued(true); setBusy(false);
      } else { setError(e); setBusy(false); }
    }
  };

  // Entrée valide la vente (sauf dans la recherche et les champs texte).
  const submitRef = useRef(submit);
  submitRef.current = submit;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      const el = e.target;
      const tag = (el.tagName || '').toLowerCase();
      if (tag === 'select' || tag === 'button' || tag === 'a') return;
      // Dans un champ : seulement Ctrl/Cmd+Entrée (évite de valider une vente en tapant un montant).
      if ((tag === 'input' || tag === 'textarea') && !(e.ctrlKey || e.metaKey)) return;
      if (document.querySelector('.modal')) return;
      e.preventDefault();
      submitRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const addFree = () => {
    const w = Number(free.weight);
    if (!free.desc.trim() || !(w > 0)) return;
    setLines([...lines, { key: 'f' + (++uid), itemId: null, label: free.desc.trim(), karat: Number(free.karat), weightG: w, qty: Math.max(1, Math.trunc(Number(free.qty || 1))), max: 999, price: sellOf(Number(free.karat)), making: Number(free.making || 0) }]);
    setFree(null);
  };

  const ticketRef = useRef(null);
  const [ticketSeen, setTicketSeen] = useState(false);
  useEffect(() => {
    const el = ticketRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setTicketSeen(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const list = items.data?.content || [];
  const emptyStock = !items.loading && list.length === 0 && !q && !karat;

  return (
    <div className="pos">
      <header className="pos-top no-print">
        <h1>{isEx ? t('nav.exchange') : t('pos.title')}</h1>
        <div className="seg" role="group" aria-label="Type">
          <Link to="/app/sale" className={!isEx ? 'on' : ''} aria-current={!isEx}>{t('nav.sale')}</Link>
          <Link to="/app/exchange" className={isEx ? 'on' : ''} aria-current={isEx}>{t('nav.exchange')}</Link>
          <Link to="/app/buyback">{t('nav.buyback')}</Link>
        </div>
        <Link to="/app" className="price-chip" title={t('dash.pricesTitle')}>
          <Icon d={P.warn} size={16} sw={2} />
          {KARATS.filter((k) => k < 100 || sellOf(k) > 0).map((k) => `${purity(k)} ${sellOf(k) > 0 ? fmtMoney(sellOf(k)) : '—'}`).join(' · ')} {t('dh')}/g{!pricesSet && ` · ${t('pos.priceChip')}`}
        </Link>
      </header>

      <div className="pos-body">
        <section className="pos-items" aria-label="Articles">
          <div className="bar">
            <label className="search grow" style={{ flex: '1 1 280px' }}>
              <Icon d={P.search} size={18} />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('pos.search')} aria-label={t('search')} autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && q.trim() && !e.isComposing) { e.preventDefault(); addByCode(q.trim()).then((ok) => { if (ok) setQ(''); }); } }} />
            </label>
            {cameraScanSupported() && <button type="button" className="btn" onClick={() => setScanning(true)}>{t('scan.btn')}</button>}
            <div className="chips" role="group">
              {[0, ...KARATS].map((k) => (
                <button key={k} type="button" className={'chip' + (karat === k ? ' on' : '')} aria-pressed={karat === k} onClick={() => setKarat(k)}>{k ? `${purity(k)}` : t('pos.all')}</button>
              ))}
            </div>
          </div>

          {scanMsg && <p role="alert" className="muted">{scanMsg}</p>}
          {items.loading && !items.data ? <Loading /> : emptyStock ? (
            <div className="empty-louiz" style={{ flex: 1, minHeight: 420 }}>
              <Louiz mood="thinking" size={140} />
              <h2>{t('pos.emptyTitle')}</h2>
              <p>{t('pos.emptyText')}</p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <Link className="btn primary" to="/app/stock/new">{t('pos.addStock')}</Link>
                <button type="button" className="btn" onClick={() => setFree({ desc: '', karat: 18, weight: '', making: '', qty: 1 })}>{t('pos.offStock')}</button>
              </div>
            </div>
          ) : (
            <>
              <div className="pos-grid">
                {list.map((it) => (
                  <button key={it.id} type="button" className={'pcard' + (lines.some((l) => l.itemId === it.id) ? ' sel' : '')} onClick={() => toggle(it)} aria-pressed={lines.some((l) => l.itemId === it.id)}>
                    <div className="ph">{it.hasPhoto ? <img loading="lazy" src={`/api/shop/items/${it.id}/photo`} alt="" /> : <span>◈</span>}<span className="k">{purity(it.karat)}</span></div>
                    <div className="bd"><b>{it.name}</b><span className="muted num">{fmtWeight(it.weightG)} g · {it.ref}</span></div>
                    {(it.quantity ?? 1) > 1 && <span className="qbadge num">×{it.quantity}</span>}
                  </button>
                ))}
              </div>
              {list.length === 0 && <p className="muted" style={{ textAlign: 'center' }}>{t('stock.empty')}</p>}
              <div><button type="button" className="btn" onClick={() => setFree({ desc: '', karat: 18, weight: '', making: '', qty: 1 })}>{t('pos.offStock')}</button></div>
            </>
          )}
        </section>

        <aside className="ticket" aria-label={t('pos.ticket')} ref={ticketRef}>
          <div className="hd"><h2>{t('pos.ticket')}</h2><span className="muted" style={{ fontSize: 13 }}>{t('pos.articles', { n: lines.length })}</span></div>

          {lines.length === 0 ? <div className="dash">{t('pos.touch')}</div> : lines.map((l) => (
            <div key={l.key} className="tline">
              <div className="t"><b>{l.label}</b><span className="num muted">{purity(l.karat)} · {l.qty > 1 ? `${l.qty} × ` : ''}{fmtWeight(l.weightG)} g</span></div>
              <div className="qty" role="group" aria-label={t('stock.qty')}>
                <button type="button" className="btn sm" aria-label="−" disabled={l.qty <= 1} onClick={() => upd(l.key, 'qty', l.qty - 1)}>−</button>
                <b className="num">{l.qty}</b>
                <button type="button" className="btn sm" aria-label="+" disabled={l.qty >= l.max} onClick={() => upd(l.key, 'qty', l.qty + 1)}>+</button>
                <span className="hint">{l.itemId ? t('stock.available', { n: l.max }) : ''}</span>
              </div>
              <div className="f">
                <label className="field"><span className="hint">{t('receipt.pricePerG')}</span><input className="input" type="number" min="0" step="0.01" inputMode="decimal" dir="ltr" value={l.price} onChange={(e) => upd(l.key, 'price', e.target.value)} /></label>
                <label className="field"><span className="hint">{t('receipt.making')}</span><input className="input" type="number" min="0" step="0.01" inputMode="decimal" dir="ltr" value={l.making} onChange={(e) => upd(l.key, 'making', e.target.value)} /></label>
              </div>
              {!(Number(l.price) > 0) && <span className="hint" style={{ color: 'var(--warn)' }}>{t('pos.noPrice')}</span>}
              <div className="row spread" style={{ gap: 6 }}>
                <button type="button" className="btn sm danger" onClick={() => setLines(lines.filter((x) => x.key !== l.key))}>{t('remove')}</button>
                <b><Money v={lineTotal(l.weightG, l.price, l.making, l.qty)} /></b>
              </div>
            </div>
          ))}

          <div className="switchrow">
            <div><b style={{ fontSize: 15, fontWeight: 500 }}>{t('pos.oldGold')}</b><span className="s">{t('pos.oldGoldSub')}</span></div>
            <button type="button" role="switch" className="sw" aria-checked={withOld} aria-label={t('pos.oldGold')} disabled={isEx} onClick={() => setWithOld(!withOld)}><i /></button>
          </div>
          {withOld && (
            <div className="grid g2">
              <Field label={t('karat')}><select value={old.karat} onChange={(e) => setOld({ ...old, karat: Number(e.target.value), price: '' })}>{KARATS.map((k) => <option key={k} value={k}>{purity(k)}</option>)}</select></Field>
              <Field label={t('buyback.gross')}><input className="input" type="number" min="0" step="0.001" inputMode="decimal" value={old.gross} onChange={(e) => setOld({ ...old, gross: e.target.value })} dir="ltr" /></Field>
              <Field label={t('buyback.deduction')}><input className="input" type="number" min="0" max="99" step="0.1" inputMode="decimal" value={old.ded} onChange={(e) => setOld({ ...old, ded: e.target.value })} dir="ltr" /></Field>
              <Field label={t('buyback.priceG')}><input className="input" type="number" min="0" step="0.01" placeholder={String(buyOf(old.karat))} value={old.price} onChange={(e) => setOld({ ...old, price: e.target.value })} dir="ltr" /></Field>
              <div className="hint" style={{ gridColumn: '1 / -1' }}>{t('buyback.net')}: <b className="num">{fmtWeight(calc.net)} g</b> → <Money v={calc.tradeIn} /></div>
            </div>
          )}

          <button type="button" className="btn" style={{ justifyContent: 'flex-start', minHeight: 48 }} onClick={() => setShowCust(!showCust)} aria-expanded={showCust}>
            <Icon d={P.user} size={18} />
            <span style={{ flex: 1, textAlign: 'start', fontWeight: 400 }}>{cust.name || <>{t('pos.customer')} <span className="muted">{t('pos.customerOpt')}</span></>}</span>
            <span style={{ color: 'var(--gold-700)' }}>{t('pos.add')}</span>
          </button>
          {showCust && (
            <div className="grid g2">
              <Field label={t('name')}><input className="input" list="cust-list" value={cust.name} maxLength={120} onChange={(e) => { const v = e.target.value; const m = (custList.data?.content || []).find((c) => c.name === v); setCust({ name: v, phone: m && m.phone && !cust.phone ? m.phone : cust.phone }); }} /><datalist id="cust-list">{(custList.data?.content || []).map((c) => <option key={c.id} value={c.name} />)}</datalist></Field>
              <Field label={t('phone')}><input className="input" value={cust.phone} maxLength={30} onChange={(e) => setCust({ ...cust, phone: e.target.value })} dir="ltr" /></Field>
            </div>
          )}

          <div className="stack" style={{ gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{t('pos.payment')}</span>
            <div className="paymodes" role="group">
              <button type="button" className={pay.mode === 'CASH' ? 'on' : ''} aria-pressed={pay.mode === 'CASH'} onClick={() => setPay({ ...pay, mode: 'CASH' })}>{t('pay.cash')}</button>
              <button type="button" className={pay.mode === 'INSTALLMENT' ? 'on' : ''} aria-pressed={pay.mode === 'INSTALLMENT'} onClick={() => { setPay({ ...pay, mode: 'INSTALLMENT', method: pay.method === 'CREDIT' ? 'CASH' : pay.method }); setShowCust(true); }}>{t('sale.installment')}</button>
            </div>
            <Field label={t('paym.label')}>
              <select value={pay.method} onChange={(e) => { setPay({ ...pay, method: e.target.value }); if (e.target.value === 'CREDIT') setShowCust(true); }}>
                {PAY_METHODS.filter((m) => m !== 'CREDIT' || pay.mode === 'CASH').map((m) => <option key={m} value={m}>{t('paym.' + m)}</option>)}
              </select>
            </Field>
            {isCredit && (
              <div className="stack" style={{ gap: 6 }}>
                <Field label={t('sale.down')}><input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={pay.down} onChange={(e) => setPay({ ...pay, down: e.target.value })} dir="ltr" /></Field>
                <div className="hint" aria-live="polite">
                  {creditErr ? <span style={{ color: 'var(--bad)' }}>{t('err.' + creditErr)}</span> : <>{t('credit.due')}: <b><Money v={round2(calc.balance - creditDown)} /></b></>}
                </div>
              </div>
            )}
            {pay.mode === 'INSTALLMENT' && (
              <div className="grid g2">
                <Field label={t('sale.down')}><input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={pay.down} onChange={(e) => setPay({ ...pay, down: e.target.value })} dir="ltr" /></Field>
                <Field label={t('sale.months')}><select value={pay.months} onChange={(e) => setPay({ ...pay, months: Number(e.target.value) })}>{[2, 3, 4, 6, 9, 12, 18, 24].map((m) => <option key={m} value={m}>{m}</option>)}</select></Field>
                <div className="hint" style={{ gridColumn: '1 / -1' }} aria-live="polite">
                  {instErr ? <span style={{ color: 'var(--bad)' }}>{t('err.' + instErr)}</span> : (
                    <>
                      {t('sale.remainder')}: <b><Money v={calc.remainder} /></b><br />
                      {t('sale.monthly')}: <b><Money v={calc.monthly} /></b> × {calc.schedule.length}
                      {calc.lastAmount !== calc.monthly && <> · {t('sale.last')}: <b><Money v={calc.lastAmount} /></b></>}<br />
                      {t('sale.firstDue')}: <b className="num">{fmtDate(calc.schedule[0]?.dueDate)}</b> · {t('sale.lockedHint')}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="totals">
            <div className="r"><span>{t('pos.subtotal')}</span><span className="num"><Money v={calc.subtotal} /></span></div>
            {withOld && <div className="r"><span>{t('receipt.tradeIn')}</span><span className="num">− <Money v={calc.tradeIn} /></span></div>}
            {isCredit && !creditErr && <div className="r"><span>{t('credit.due')}</span><span className="num"><Money v={round2(calc.balance - creditDown)} /></span></div>}
            {pay.mode === 'INSTALLMENT' && !instErr && <div className="r"><span>{t('receipt.paidNow')}</span><span className="num"><Money v={calc.down} /></span></div>}
            <div className="big"><b>{calc.balance < 0 ? t('pos.refund') : t('pos.rest')}</b><b className="num"><Money v={Math.abs(calc.balance)} /></b></div>
          </div>
          <ErrorBox error={error} />
          <button type="button" className="validate" disabled={!canSubmit} onClick={submit}>{busy ? t('loading') : t('pos.validate')}</button>
          {blocker && <span className="hint" style={{ textAlign: 'center' }}>{blocker}</span>}
        </aside>
      </div>

      {lines.length > 0 && !ticketSeen && (
        <button type="button" className="cartbar no-print" onClick={() => ticketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span>{t('pos.ticket')} · {t('pos.articles', { n: lines.length })}</span>
          <b><Money v={calc.balance} /></b>
          <i aria-hidden="true">↓</i>
        </button>
      )}

      {queued && (
        <Modal title={t('off.savedTitle')} onClose={() => setQueued(false)}>
          <p>{t('off.savedText')}</p>
          <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn primary" onClick={() => setQueued(false)}>OK</button></div>
        </Modal>
      )}
      {scanning && <ScanModal onClose={() => setScanning(false)} onCode={addByCode} />}
      {free && (
        <Modal title={t('pos.offTitle')} onClose={() => setFree(null)}>
          <div className="stack">
            <Field label={t('pos.offDesc')}><input className="input" autoFocus maxLength={160} value={free.desc} onChange={(e) => setFree({ ...free, desc: e.target.value })} /></Field>
            <div className="grid g2">
              <Field label={t('karat')}><select value={free.karat} onChange={(e) => setFree({ ...free, karat: Number(e.target.value) })}>{KARATS.map((k) => <option key={k} value={k}>{purity(k)}</option>)}</select></Field>
              <Field label={t('weightG')}><input className="input" type="number" min="0" step="0.001" inputMode="decimal" dir="ltr" value={free.weight} onChange={(e) => setFree({ ...free, weight: e.target.value })} /></Field>
              <Field label={t('stock.qty')}><input className="input" type="number" min="1" max="999" step="1" inputMode="numeric" dir="ltr" value={free.qty} onChange={(e) => setFree({ ...free, qty: e.target.value })} /></Field>
              <Field label={t('receipt.making')}><input className="input" type="number" min="0" step="0.01" inputMode="decimal" dir="ltr" value={free.making} onChange={(e) => setFree({ ...free, making: e.target.value })} /></Field>
            </div>
            <button type="button" className="btn primary" disabled={!free.desc.trim() || !(Number(free.weight) > 0)} onClick={addFree}>{t('pos.addLine')}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
