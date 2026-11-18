import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useI18n } from '../../i18n.jsx';
import { ErrorBox, Field, PageHead } from '../../components/ui.jsx';
import Credentials from './Credentials.jsx';

export const METHODS = ['WAFACASH', 'VIREMENT', 'CASHPLUS', 'CASH'];

export default function NewClient() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [f, setF] = useState({ shopName: '', ownerName: '', phone: '', city: '', username: '', password: '', months: 1, method: 'WAFACASH', amount: '', reference: '' });
  const [cred, setCred] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      const c = await api('/admin/shops', { method: 'POST', body: { ...f, months: Number(f.months), amount: Number(f.amount || 0), password: f.password || null, ownerName: f.ownerName || null, phone: f.phone || null, city: f.city || null, reference: f.reference || null } });
      setCred(c);
    } catch (err) { setError(err); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title={t('nav.newClient')} />
      <form className="card stack" style={{ maxWidth: 760 }} onSubmit={submit}>
        <div className="grid g2">
          <Field label={t('account.shopName')}><input className="input" required maxLength={120} value={f.shopName} onChange={set('shopName')} /></Field>
          <Field label={t('account.owner')}><input className="input" maxLength={120} value={f.ownerName} onChange={set('ownerName')} /></Field>
          <Field label={t('phone')}><input className="input" maxLength={30} value={f.phone} onChange={set('phone')} dir="ltr" /></Field>
          <Field label={t('account.city')}><input className="input" maxLength={80} value={f.city} onChange={set('city')} /></Field>
          <Field label={t('login.username')} hint={t('admin.usernameHint')}><input className="input" required pattern="[A-Za-z0-9._\-]{3,40}" value={f.username} onChange={set('username')} dir="ltr" /></Field>
          <Field label={t('login.password')} hint={t('admin.passwordHint')}><input className="input" minLength={8} maxLength={128} value={f.password} onChange={set('password')} dir="ltr" /></Field>
        </div>
        <h2>{t('admin.firstPayment')}</h2>
        <div className="grid g2">
          <Field label={t('admin.duration')}><select value={f.months} onChange={set('months')}>{[1, 3, 6, 12].map((m) => <option key={m} value={m}>{t('admin.nMonths', { n: m })}</option>)}</select></Field>
          <Field label={t('admin.method')}><select value={f.method} onChange={set('method')}>{METHODS.map((m) => <option key={m} value={m}>{t('method.' + m)}</option>)}</select></Field>
          <Field label={t('admin.amount')}><input className="input" type="number" min="0" step="0.01" required value={f.amount} onChange={set('amount')} dir="ltr" /></Field>
          <Field label={t('admin.reference')}><input className="input" maxLength={80} value={f.reference} onChange={set('reference')} dir="ltr" /></Field>
        </div>
        <ErrorBox error={error} />
        <button className="btn primary" disabled={busy}>{busy ? t('loading') : t('admin.create')}</button>
      </form>
      {cred && <Credentials cred={cred} phone={f.phone} onClose={() => nav(`/admin/${cred.id}`)} />}
    </>
  );
}
