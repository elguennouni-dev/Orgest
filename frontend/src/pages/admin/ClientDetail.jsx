import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks.js';
import { fmtDate, fmtDateTime, Money, useI18n } from '../../i18n.jsx';
import { ErrorBox, Field, Loading, Modal, PageHead } from '../../components/ui.jsx';
import Credentials from './Credentials.jsx';
import { STATUS_BADGE } from './Clients.jsx';
import { METHODS } from './NewClient.jsx';

export default function ClientDetail() {
  const { t } = useI18n();
  const { id } = useParams();
  const { data, error, loading, setData } = useApi(`/admin/shops/${id}`);
  const [renew, setRenew] = useState(null);
  const [edit, setEdit] = useState(null);
  const [cred, setCred] = useState(null);
  const [err, setErr] = useState(null);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const s = data.shop;

  const run = async (fn) => { setErr(null); try { await fn(); } catch (e) { setErr(e); } };
  const doRenew = (e) => { e.preventDefault(); run(async () => { setData(await api(`/admin/shops/${id}/renew`, { method: 'POST', body: { ...renew, months: Number(renew.months), amount: Number(renew.amount || 0), reference: renew.reference || null, note: renew.note || null } })); setRenew(null); }); };
  const doEdit = (e) => { e.preventDefault(); run(async () => { setData(await api(`/admin/shops/${id}`, { method: 'PUT', body: edit })); setEdit(null); }); };
  const toggle = () => run(async () => { if (s.active && !window.confirm(t('admin.confirmSuspend'))) return; setData(await api(`/admin/shops/${id}/${s.active ? 'suspend' : 'activate'}`, { method: 'POST' })); });
  const reset = () => run(async () => { if (!window.confirm(t('admin.confirmReset'))) return; setCred(await api(`/admin/shops/${id}/reset-password`, { method: 'POST' })); });

  return (
    <>
      <PageHead title={s.shopName}><Link className="btn" to="/admin">← {t('nav.clients')}</Link></PageHead>
      <ErrorBox error={err} />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card stack">
          <div className="row spread"><h2>{t('admin.subscription')}</h2><span className={'badge ' + STATUS_BADGE[s.status]}>{t('astatus.' + s.status)}</span></div>
          <div>{t('account.endsOn')}: <b className="num">{fmtDate(s.subscriptionEnd)}</b> {s.status !== 'EXPIRED' && s.status !== 'SUSPENDED' && <span className="muted">({s.daysLeft}{t('admin.d')})</span>}</div>
          <div className="row">
            <button className="btn primary" onClick={() => setRenew({ months: 1, method: 'WAFACASH', amount: '', reference: '', note: '' })}>{t('admin.renew')}</button>
            <button className={'btn' + (s.active ? ' danger' : '')} onClick={toggle}>{s.active ? t('admin.suspend') : t('admin.activate')}</button>
            <button className="btn" onClick={reset}>{t('admin.resetPassword')}</button>
          </div>
        </div>
        <div className="card stack">
          <div className="row spread"><h2>{t('admin.info')}</h2><button className="btn sm" onClick={() => setEdit({ shopName: s.shopName, ownerName: s.ownerName || '', phone: s.phone || '', city: s.city || '' })}>{t('edit')}</button></div>
          <div>{t('login.username')}: <b className="num">{s.username}</b></div>
          <div>{t('account.owner')}: {s.ownerName || '—'}</div>
          <div>{t('phone')}: <span className="num">{s.phone || '—'}</span></div>
          <div>{t('account.city')}: {s.city || '—'}</div>
        </div>
      </div>
      <div className="card tablewrap" style={{ marginTop: 14 }}>
        <h2>{t('admin.payments')}</h2>
        <table>
          <thead><tr><th>{t('date')}</th><th>{t('admin.duration')}</th><th>{t('admin.period')}</th><th>{t('admin.method')}</th><th>{t('admin.amount')}</th><th>{t('admin.reference')}</th></tr></thead>
          <tbody>
            {data.payments.map((p) => (
              <tr key={p.id}><td className="num">{fmtDateTime(p.paidAt)}</td><td>{t('admin.nMonths', { n: p.months })}</td><td className="num">{fmtDate(p.periodStart)} → {fmtDate(p.periodEnd)}</td><td>{t('method.' + p.method)}</td><td><Money v={p.amount} /></td><td className="num">{p.reference}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {renew && (
        <Modal title={t('admin.renew')} onClose={() => setRenew(null)}>
          <form className="stack" onSubmit={doRenew}>
            <Field label={t('admin.duration')}><select value={renew.months} onChange={(e) => setRenew({ ...renew, months: e.target.value })}>{[1, 3, 6, 12].map((m) => <option key={m} value={m}>{t('admin.nMonths', { n: m })}</option>)}</select></Field>
            <Field label={t('admin.method')}><select value={renew.method} onChange={(e) => setRenew({ ...renew, method: e.target.value })}>{METHODS.map((m) => <option key={m} value={m}>{t('method.' + m)}</option>)}</select></Field>
            <Field label={t('admin.amount')}><input className="input" type="number" min="0" step="0.01" required value={renew.amount} onChange={(e) => setRenew({ ...renew, amount: e.target.value })} dir="ltr" /></Field>
            <Field label={t('admin.reference')}><input className="input" maxLength={80} value={renew.reference} onChange={(e) => setRenew({ ...renew, reference: e.target.value })} dir="ltr" /></Field>
            <Field label={t('note')}><input className="input" maxLength={255} value={renew.note} onChange={(e) => setRenew({ ...renew, note: e.target.value })} /></Field>
            <button className="btn primary">{t('admin.renew')}</button>
          </form>
        </Modal>
      )}
      {edit && (
        <Modal title={t('admin.info')} onClose={() => setEdit(null)}>
          <form className="stack" onSubmit={doEdit}>
            <Field label={t('account.shopName')}><input className="input" required maxLength={120} value={edit.shopName} onChange={(e) => setEdit({ ...edit, shopName: e.target.value })} /></Field>
            <Field label={t('account.owner')}><input className="input" maxLength={120} value={edit.ownerName} onChange={(e) => setEdit({ ...edit, ownerName: e.target.value })} /></Field>
            <Field label={t('phone')}><input className="input" maxLength={30} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} dir="ltr" /></Field>
            <Field label={t('account.city')}><input className="input" maxLength={80} value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} /></Field>
            <button className="btn primary">{t('save')}</button>
          </form>
        </Modal>
      )}
      {cred && <Credentials cred={cred} phone={s.phone} onClose={() => setCred(null)} />}
    </>
  );
}
