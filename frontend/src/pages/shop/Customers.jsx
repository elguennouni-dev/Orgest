import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks.js';
import { fmtDate, Money, useI18n } from '../../i18n.jsx';
import { ErrorBox, Field, Loading, Modal, PageHead } from '../../components/ui.jsx';

export default function Customers() {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [debt, setDebt] = useState(false);
  const [page, setPage] = useState(0);
  const { data, error, loading, reload } = useApi(`/shop/customers?q=${encodeURIComponent(q)}&debt=${debt}&page=${page}&size=30`);
  const [add, setAdd] = useState(null);
  const [err, setErr] = useState(null);
  const pages = data ? Math.ceil(data.total / data.size) : 0;

  const save = async (e) => {
    e.preventDefault(); setErr(null);
    try { await api('/shop/customers', { method: 'POST', body: add }); setAdd(null); reload(); } catch (x) { setErr(x); }
  };

  return (
    <>
      <PageHead title={t('nav.customers')}>
        <button type="button" className="btn primary" onClick={() => setAdd({ name: '', phone: '', note: '' })}>＋ {t('cust.add')}</button>
      </PageHead>
      <div className="card row" style={{ marginBottom: 14 }}>
        <input className="input grow" placeholder={t('search')} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={debt} onChange={(e) => { setDebt(e.target.checked); setPage(0); }} /> {t('cust.onlyDebt')}</label>
      </div>
      <ErrorBox error={error} />
      {loading && !data ? <Loading /> : (
        <div className="tablewrap">
          <table>
            <thead><tr><th>{t('name')}</th><th>{t('phone')}</th><th>{t('cust.since')}</th><th style={{ textAlign: 'end' }}>{t('credit.due')}</th><th /></tr></thead>
            <tbody>
              {(data?.content || []).map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/app/customers/${c.id}`} style={{ fontWeight: 600 }}>{c.name}</Link></td>
                  <td dir="ltr">{c.phone || '—'}</td>
                  <td className="muted">{fmtDate(c.createdAt)}</td>
                  <td style={{ textAlign: 'end' }}>{Number(c.creditDue) > 0 ? <b style={{ color: 'var(--bad)' }}><Money v={c.creditDue} /></b> : '—'}</td>
                  <td style={{ textAlign: 'end' }}><Link className="btn sm" to={`/app/customers/${c.id}`}>{t('receipt.open')}</Link></td>
                </tr>
              ))}
              {(data?.content || []).length === 0 && <tr><td colSpan="5" className="muted">{t('cust.none')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="row" style={{ marginTop: 14, justifyContent: 'center' }}>
          <button className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
          <span className="num">{page + 1} / {pages}</span>
          <button className="btn sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>›</button>
        </div>
      )}
      {add && (
        <Modal title={t('cust.add')} onClose={() => setAdd(null)}>
          <form className="stack" onSubmit={save}>
            <Field label={t('name')}><input className="input" required autoFocus maxLength={120} value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} /></Field>
            <Field label={t('phone')}><input className="input" maxLength={30} dir="ltr" value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} /></Field>
            <Field label={t('note')}><input className="input" maxLength={500} value={add.note} onChange={(e) => setAdd({ ...add, note: e.target.value })} /></Field>
            <ErrorBox error={err} />
            <button className="btn primary">{t('save')}</button>
          </form>
        </Modal>
      )}
    </>
  );
}
