import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks.js';
import { fmtDateTime, fmtMoney, fmtWeight, Money, useI18n } from '../../i18n.jsx';
import { purity } from '../../lib/purity.js';
import { ErrorBox, Field, KARATS, PageHead } from '../../components/ui.jsx';
import { netWeight, tradeInValue } from '../../lib/money.js';

export default function BuyBack() {
  const { t } = useI18n();
  const nav = useNavigate();
  const prices = useApi('/shop/prices');
  const list = useApi('/shop/buybacks?size=10');
  const [f, setF] = useState({ name: '', phone: '', cin: '', description: '', karat: 18, gross: '', ded: '0', price: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const buy = (k) => Number(prices.data?.find((p) => p.karat === Number(k))?.buyPerGram || 0);
  const price = Number(f.price || buy(f.karat));
  const calc = useMemo(() => {
    return { net: netWeight(f.gross, f.ded), total: tradeInValue(f.gross, f.ded, price) };
  }, [f.gross, f.ded, price]);

  const valid = Number(f.gross) > 0 && Number(f.ded || 0) >= 0 && Number(f.ded || 0) <= 99 && price > 0 && calc.net > 0;

  const submit = async (e) => {
    if (!valid) { e.preventDefault(); return; }
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const b = await api('/shop/buybacks', { method: 'POST', body: { customerName: f.name || null, customerPhone: f.phone || null, customerCin: f.cin || null, description: f.description || null, karat: Number(f.karat), grossWeightG: Number(f.gross), deductionPct: Number(f.ded || 0), pricePerGram: price } });
      nav(`/app/buyback/${b.id}`);
    } catch (err) { setError(err); setBusy(false); }
  };

  return (
    <>
      <PageHead title={t('nav.buyback')} />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <form className="card stack" onSubmit={submit}>
          <div className="grid g2">
            <Field label={t('name') + ` (${t('optional')})`}><input className="input" value={f.name} maxLength={120} onChange={set('name')} /></Field>
            <Field label={t('phone')}><input className="input" value={f.phone} maxLength={30} onChange={set('phone')} dir="ltr" /></Field>
            <Field label={'CIN (' + t('optional') + ')'}><input className="input" value={f.cin} maxLength={20} onChange={set('cin')} dir="ltr" /></Field>
            <Field label={t('buyback.description')}><input className="input" value={f.description} maxLength={255} onChange={set('description')} /></Field>
            <Field label={t('karat')}><select value={f.karat} onChange={(e) => setF({ ...f, karat: e.target.value, price: '' })}>{KARATS.map((k) => <option key={k} value={k}>{purity(k)}</option>)}</select></Field>
            <Field label={t('buyback.gross')}><input className="input" type="number" min="0.001" step="0.001" value={f.gross} onChange={set('gross')} required dir="ltr" /></Field>
            <Field label={t('buyback.deduction')} hint={t('buyback.deductionHint')}><input className="input" type="number" min="0" max="99" step="0.1" value={f.ded} onChange={set('ded')} dir="ltr" /></Field>
            <Field label={t('buyback.priceG')} hint={`${t('dash.buyPrice')}: ${fmtMoney(buy(f.karat))}`}><input className="input" type="number" min="0" step="0.01" placeholder={String(buy(f.karat))} value={f.price} onChange={set('price')} dir="ltr" /></Field>
          </div>
          <div className="card" style={{ background: 'var(--gold-50)' }}>
            <div className="row spread"><span>{t('buyback.net')}</span><b className="num">{fmtWeight(calc.net)} g</b></div>
            <div className="row spread" style={{ fontSize: 20 }}><b>{t('receipt.amountPaid')}</b><b><Money v={calc.total} /></b></div>
          </div>
          <ErrorBox error={error} />
          <button className="btn primary" disabled={busy || !valid}>{busy ? t('loading') : t('buyback.confirm')}</button>
        </form>
        <div className="card">
          <h2>{t('buyback.recent')}</h2>
          <div className="tablewrap"><table><tbody>
            {list.data?.content.map((b) => (
              <tr key={b.id}><td>{b.number}</td><td className="muted">{fmtDateTime(b.createdAt)}</td><td>{purity(b.karat)} · {fmtWeight(b.netWeightG)} g</td><td><Money v={b.total} /></td><td><Link className="btn sm" to={`/app/buyback/${b.id}`}>{t('receipt.open')}</Link></td></tr>
            ))}
            {list.data?.content.length === 0 && <tr><td className="muted">{t('buyback.none')}</td></tr>}
          </tbody></table></div>
        </div>
      </div>
    </>
  );
}
