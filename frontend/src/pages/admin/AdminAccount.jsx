import { useState } from 'react';
import { api } from '../../api.js';
import { useI18n } from '../../i18n.jsx';
import { ErrorBox, Field, PageHead } from '../../components/ui.jsx';

export default function AdminAccount() {
  const { t } = useI18n();
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(null); setOk(false);
    if (pw.newPassword !== pw.confirm) { setErr('PASSWORD_MISMATCH'); return; }
    try {
      await api('/admin/password', { method: 'POST', body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } });
      setPw({ currentPassword: '', newPassword: '', confirm: '' }); setOk(true);
    } catch (x) { setErr(x); }
  };
  return (
    <>
      <PageHead title={t('nav.account')} />
      <form className="card stack" style={{ maxWidth: 460 }} onSubmit={submit}>
        <h2>{t('account.password')}</h2>
        <Field label={t('account.current')}><input className="input" type="password" autoComplete="current-password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} dir="ltr" /></Field>
        <Field label={t('account.new')} hint={t('account.pwHint')}><input className="input" type="password" autoComplete="new-password" minLength={8} required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} dir="ltr" /></Field>
        <Field label={t('account.confirm')}><input className="input" type="password" autoComplete="new-password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} dir="ltr" /></Field>
        <ErrorBox error={err} />
        {ok && <div className="okbox">{t('saved')}</div>}
        <button className="btn primary">{t('save')}</button>
      </form>
    </>
  );
}
