import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks.js';
import { fmtMoney, fmtWeight, useI18n } from '../../i18n.jsx';
import { purity } from '../../lib/purity.js';
import { lineTotal, round2 } from '../../lib/money.js';
import { ErrorBox, Field, KARATS, Loading, PageHead } from '../../components/ui.jsx';

let uid = 0;
const EMPTY = { desc: '', karat: 18, weight: '', qty: 1, making: '' };

/** Création / modification d'un devis. Aucun mouvement de stock : le stock n'est touché qu'à la conversion en vente. */
export default function QuoteForm() {
  const { t } = useI18n();
  const nav = useNavigate();
  const { id } = useParams();
  const editing = !!id;
  const [existing, setExisting] = useState({ data: null, loading: editing, error: null });
  useEffect(() => {
    if (!editing) return;
    api(`/shop/quotes/${id}`).then((data) => setExisting({ data, loading: false, error: null }), (error) => setExisting({ data: null, loading: false, error }));
  }, [editing, id]);
  const prices = useApi('/shop/prices');
  const [q, setQ] = useState('');
  const items = useApi(`/shop/items?status=IN_STOCK&q=${encodeURIComponent(q)}&size=8`);
  const [cust, setCust] = useState({ name: '', phone: '' });
  const [note, setNote] = useState('');
  const [days, setDays] = useState(15);
  const [lines, setLines] = useState([]);
  const [free, setFree] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const sellOf = (k) => Number(prices.data?.find((p) => p.karat === k)?.sellPerGram || 0);

  useEffect(() => {
    const d = existing.data;
    if (!d) return;
    setCust({ name: d.customerName || '', phone: d.customerPhone || '' });
    setNote(d.note || '');
    setLines(d.lines.map((l) => ({ key: 'e' + (++uid), itemId: null, label: l.description, karat: l.karat, weightG: Number(l.weightG), qty: l.quantity, price: Number(l.pricePerGram), making: Number(l.makingPerGram) })));
  }, [existing.data]);

  const addItem = (it) => {
    if (lines.some((l) => l.itemId === it.id)) return;
    setLines([...lines, { key: 'i' + it.id, itemId: it.id, label: `${it.name} (${it.ref})`, karat: it.karat, weightG: Number(it.weightG), qty: 1, price: sellOf(it.karat), making: Number(it.makingPerGram || 0) }]);
  };
  const addFree = () => {
    const w = Number(free.weight);
    if (!free.desc.trim() || !(w > 0)) return;
    setLines([...lines, { key: 'f' + (++uid), itemId: null, label: free.desc.trim(), karat: Number(free.karat), weightG: w, qty: Math.max(1, Math.trunc(Number(free.qty || 1))), price: sellOf(Number(free.karat)), making: Number(free.making || 0) }]);
    setFree(EMPTY);
  };
  const upd = (key, k, v) => setLines(lines.map((l) => (l.key === key ? { ...l, [k]: v } : l)));

  const total = round2(lines.reduce((s, l) => s + lineTotal(l.weightG, l.price, l.making, l.qty), 0));
  const ok = lines.length > 0 && lines.every((l) => Number(l.price) > 0 && l.qty >= 1);

  const save = async () => {
    if (!ok) return;
    setBusy(true); setError(null);
    try {
      const body = {
        customerName: cust.name || null, customerPhone: cust.phone || null, note: note || null, validDays: Number(days) || 15,
        lines: lines.map((l) => (l.itemId
          ? { itemId: l.itemId, quantity: l.qty, pricePerGram: Number(l.price), makingPerGram: Number(l.making || 0) }
          : { description: l.label, karat: l.karat, weightG: l.weightG, quantity: l.qty, pricePerGram: Number(l.price), makingPerGram: Number(l.making || 0) })),
      };
      const r = await api(editing ? `/shop/quotes/${id}` : '/shop/quotes', { method: editing ? 'PUT' : 'POST', body });
      nav(`/app/quotes/${r.id}`);
    } catch (e) { setError(e); setBusy(false); }
  };

  if (editing && existing.loading) return <Loading />;
  if (editing && existing.error) return <ErrorBox error={existing.error} />;

  return (
    <>
      <PageHead title={editing ? t('quote.edit') : t('quote.new')}><Link className="btn" to="/app/quotes">{t('quote.title')}</Link></PageHead>
      <div className="card">
        <div className="grid g2">
          <Field label={t('pos.customer')}><input className="input" maxLength={120} value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} /></Field>
          <Field label={t('phone')}><input className="input" maxLength={30} inputMode="tel" dir="ltr" value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} /></Field>
          <Field label={t('quote.validDays')}><input className="input" type="number" min="1" max="365" dir="ltr" value={days} onChange={(e) => setDays(e.target.value)} /></Field>
          <Field label={t('note')}><input className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>{t('quote.addStock')}</h3>
        <input className="input" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
          {(items.data?.content || []).map((it) => (
            <button key={it.id} type="button" className="btn sm" onClick={() => addItem(it)}>
              {it.name} · {purity(it.karat)} · <bdi className="num">{fmtWeight(it.weightG)} {t('unit.g')}</bdi>
            </button>
          ))}
        </div>
        <h3 style={{ marginTop: 16 }}>{t('pos.offTitle')}</h3>
        <div className="grid g2">
          <Field label={t('pos.offDesc')}><input className="input" maxLength={160} value={free.desc} onChange={(e) => setFree({ ...free, desc: e.target.value })} /></Field>
          <Field label={t('karat')}><select value={free.karat} onChange={(e) => setFree({ ...free, karat: Number(e.target.value) })}>{KARATS.map((k) => <option key={k} value={k}>{purity(k)}</option>)}</select></Field>
          <Field label={t('weightG')}><input className="input" type="number" min="0" step="0.001" inputMode="decimal" dir="ltr" value={free.weight} onChange={(e) => setFree({ ...free, weight: e.target.value })} /></Field>
          <Field label={t('receipt.making')}><input className="input" type="number" min="0" step="0.01" inputMode="decimal" dir="ltr" value={free.making} onChange={(e) => setFree({ ...free, making: e.target.value })} /></Field>
        </div>
        <button type="button" className="btn" disabled={!free.desc.trim() || !(Number(free.weight) > 0)} onClick={addFree}>{t('pos.addLine')}</button>
      </div>

      <div className="card tablewrap" style={{ marginTop: 14 }}>
        <table>
          <thead><tr><th>{t('receipt.item')}</th><th>{t('stock.qty')}</th><th>{t('receipt.pricePerG')}</th><th>{t('receipt.making')}</th><th>{t('total')}</th><th /></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key}>
                <td>{l.label}<div className="muted">{purity(l.karat)} · <bdi className="num">{fmtWeight(l.weightG)} {t('unit.g')}</bdi></div></td>
                <td><input className="input" style={{ width: 70 }} type="number" min="1" dir="ltr" value={l.qty} onChange={(e) => upd(l.key, 'qty', Math.max(1, Math.trunc(Number(e.target.value) || 1)))} /></td>
                <td><input className="input" style={{ width: 100 }} type="number" min="0" step="0.01" dir="ltr" value={l.price} onChange={(e) => upd(l.key, 'price', e.target.value)} /></td>
                <td><input className="input" style={{ width: 90 }} type="number" min="0" step="0.01" dir="ltr" value={l.making} onChange={(e) => upd(l.key, 'making', e.target.value)} /></td>
                <td className="num">{fmtMoney(lineTotal(l.weightG, l.price, l.making, l.qty))}</td>
                <td><button type="button" className="btn sm" onClick={() => setLines(lines.filter((x) => x.key !== l.key))} aria-label={t('remove')}>✕</button></td>
              </tr>
            ))}
            {lines.length === 0 && <tr><td colSpan="6" className="muted">{t('quote.noLines')}</td></tr>}
          </tbody>
        </table>
      </div>

      <ErrorBox error={error} />
      <div className="row spread" style={{ marginTop: 14 }}>
        <div className="num" style={{ fontSize: 20, fontWeight: 700 }}>{t('total')}: {fmtMoney(total)} {t('dh')}</div>
        <button type="button" className="btn primary" disabled={!ok || busy} onClick={save}>{t('save')}</button>
      </div>
    </>
  );
}
