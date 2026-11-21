import { useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { fmtDate, useI18n } from '../../i18n.jsx';
import { ErrorBox, Field, PageHead } from '../../components/ui.jsx';
import { waLink } from '../../config.js';

export default function Account() {
  const { t } = useI18n();
  const { me, setMe } = useAuth();
  const [f, setF] = useState({ shopName: me.shopName || '', ownerName: me.ownerName || '', phone: me.phone || '', city: me.city || '', address: me.address || '', ice: me.ice || '', receiptFooter: me.receiptFooter || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState(null);
  const [perr, setPerr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const [logoV, setLogoV] = useState(0);
  const uploadLogo = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setErr(null);
    try { const form = new FormData(); form.append('file', file); setMe(await api('/shop/logo', { method: 'POST', form })); setLogoV((v) => v + 1); setMsg(t('saved')); } catch (x) { setErr(x); }
  };
  const removeLogo = async () => { setErr(null); try { setMe(await api('/shop/logo', { method: 'DELETE' })); setMsg(t('saved')); } catch (x) { setErr(x); } };

  const saveProfile = async (e) => {
    e.preventDefault(); setErr(null); setMsg('');
    try { setMe(await api('/shop/account/profile', { method: 'PUT', body: f })); setMsg(t('saved')); } catch (x) { setErr(x); }
  };
  const savePw = async (e) => {
    e.preventDefault(); setPerr(null); setMsg('');
    if (pw.newPassword !== pw.confirm) { setPerr('PASSWORD_MISMATCH'); return; }
    try { setMe(await api('/shop/account/password', { method: 'POST', body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } })); setPw({ currentPassword: '', newPassword: '', confirm: '' }); setMsg(t('saved')); } catch (x) { setPerr(x); }
  };

  return (
    <>
      <PageHead title={t('nav.account')} />
      {msg && <div className="okbox" style={{ marginBottom: 12 }}>{msg}</div>}
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <div className="card stack">
            <h2>{t('logo.title')}</h2>
            <p className="muted" style={{ margin: 0 }}>{t('logo.help')}</p>
            {me.hasLogo && <img src={`/api/shop/logo?v=${logoV}`} alt="" style={{ maxHeight: 90, maxWidth: '100%', objectFit: 'contain', alignSelf: 'flex-start' }} />}
            <div className="row">
              <label className="btn">{t('logo.upload')}<input type="file" accept="image/png,image/jpeg" hidden onChange={uploadLogo} /></label>
              {me.hasLogo && <button type="button" className="btn" onClick={removeLogo}>{t('logo.remove')}</button>}
            </div>
          </div>
          <div className="card">
            <h2>{t('account.subscription')}</h2>
            <p>{t('status')}: {me.subscriptionValid ? <span className="badge ok">{t('account.active')}</span> : <span className="badge bad">{t('account.expired')}</span>}</p>
            <p>{t('account.endsOn')}: <b className="num">{fmtDate(me.subscriptionEnd)}</b> {me.subscriptionValid && <span className="muted">({t('account.daysLeft', { n: me.daysLeft })})</span>}</p>
            <a className="btn wa" target="_blank" rel="noopener noreferrer" href={waLink(t('account.waRenew', { u: me.username }))}>{t('account.renew')}</a>
          </div>
          <form className="card stack" onSubmit={savePw}>
            <h2>{t('account.password')}</h2>
            <Field label={t('account.current')}><input className="input" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required dir="ltr" /></Field>
            <Field label={t('account.new')} hint={t('account.pwHint')}><input className="input" type="password" autoComplete="new-password" minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required dir="ltr" /></Field>
            <Field label={t('account.confirm')}><input className="input" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required dir="ltr" /></Field>
            <ErrorBox error={perr} />
            <button className="btn primary">{t('save')}</button>
          </form>
        </div>
        <form className="card stack" onSubmit={saveProfile}>
          <h2>{t('account.shopInfo')}</h2>
          <p className="hint">{t('account.receiptHint')}</p>
          <Field label={t('account.shopName')}><input className="input" required maxLength={120} value={f.shopName} onChange={set('shopName')} /></Field>
          <Field label={t('account.owner')}><input className="input" maxLength={120} value={f.ownerName} onChange={set('ownerName')} /></Field>
          <div className="grid g2">
            <Field label={t('phone')}><input className="input" maxLength={30} value={f.phone} onChange={set('phone')} dir="ltr" /></Field>
            <Field label={t('account.city')}><input className="input" maxLength={80} value={f.city} onChange={set('city')} /></Field>
          </div>
          <Field label={t('account.address')}><input className="input" maxLength={255} value={f.address} onChange={set('address')} /></Field>
          <Field label="ICE"><input className="input" maxLength={30} value={f.ice} onChange={set('ice')} dir="ltr" /></Field>
          <Field label={t('account.footer')}><input className="input" maxLength={255} value={f.receiptFooter} onChange={set('receiptFooter')} /></Field>
          <ErrorBox error={err} />
          <button className="btn primary">{t('save')}</button>
        </form>
      </div>
    </>
  );
}
