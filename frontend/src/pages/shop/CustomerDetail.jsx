import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks.js';
import { fmtDateTime, Money, useI18n } from '../../i18n.jsx';
import { ErrorBox, Field, Loading, PageHead } from '../../components/ui.jsx';

const METHODS = ['CASH', 'CHEQUE', 'CARD', 'TRANSFER'];

export default function CustomerDetail() {
  const { t } = useI18n();
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/shop/customers/${id}`);
  const [f, setF] = useState({ amount: '', method: 'CASH', note: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading />;
  if (!data) return <ErrorBox error={error} />;
  const c = data.customer;
  const due = Number(c.creditDue);

  const pay = async (e) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      await api(`/shop/customers/${id}/payments`, { method: 'POST', body: { amount: Number(f.amount), method: f.method, note: f.note || null } });
      setF({ amount: '', method: 'CASH', note: '' });
      await reload();
    } catch (x) { setErr(x); }
    setBusy(false);
  };

  return (
    <>
      <PageHead title={c.name}><Link className="btn" to="/app/customers">‹ {t('nav.customers')}</Link></PageHead>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <div className="card">
            <p style={{ margin: 0 }}>{t('phone')}: <b dir="ltr">{c.phone || '—'}</b></p>
            {c.note && <p className="muted">{c.note}</p>}
            <p style={{ fontSize: 20, margin: '10px 0 0' }}>{t('credit.due')}: <b style={{ color: due > 0 ? 'var(--bad)' : 'inherit' }}><Money v={c.creditDue} /></b></p>
          </div>
          {due > 0 && (
            <form className="card stack" onSubmit={pay}>
              <h2>{t('cust.collect')}</h2>
              <Field label={t('cust.amount')}><input className="input" type="number" required min="0.01" max={due} step="0.01" inputMode="decimal" dir="ltr" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
              <Field label={t('paym.label')}><select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{METHODS.map((m) => <option key={m} value={m}>{t('paym.' + m)}</option>)}</select></Field>
              <Field label={t('note')}><input className="input" maxLength={255} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
              <button type="button" className="btn" onClick={() => setF({ ...f, amount: String(due) })}>{t('cust.all')}</button>
              <ErrorBox error={err} />
              <button className="btn primary" disabled={busy}>{t('cust.record')}</button>
            </form>
          )}
        </div>
        <div className="stack">
          <div className="card">
            <h2>{t('nav.sales')}</h2>
            <div className="tablewrap"><table>
              <tbody>
                {data.sales.map((s) => (
                  <tr key={s.id}>
                    <td><Link to={`/app/sales/${s.id}`}>{s.number}</Link></td>
                    <td className="muted">{fmtDateTime(s.createdAt)}</td>
                    <td style={{ textAlign: 'end' }}><Money v={s.subtotal} /></td>
                    <td>{s.payMethod && s.payMethod !== 'CASH' ? t('paym.' + s.payMethod) : ''}</td>
                  </tr>
                ))}
                {data.sales.length === 0 && <tr><td className="muted">{t('dash.noSales')}</td></tr>}
              </tbody>
            </table></div>
          </div>
          <div className="card">
            <h2>{t('cust.payments')}</h2>
            <div className="tablewrap"><table>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="muted">{fmtDateTime(p.createdAt)}</td>
                    <td>{t('paym.' + p.method)}</td>
                    <td style={{ textAlign: 'end' }}><Money v={p.amount} /></td>
                  </tr>
                ))}
                {data.payments.length === 0 && <tr><td className="muted">—</td></tr>}
              </tbody>
            </table></div>
          </div>
        </div>
      </div>
    </>
  );
}
