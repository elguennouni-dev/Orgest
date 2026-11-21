import { useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { useApi } from '../../hooks.js';
import { fmtDate, useI18n } from '../../i18n.jsx';
import { ErrorBox, Field, Loading, PageHead } from '../../components/ui.jsx';

export default function Team() {
  const { t } = useI18n();
  const { me } = useAuth();
  const { data, loading, error, reload } = useApi('/shop/team');
  const [f, setF] = useState({ code: '', name: '', password: '' });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const prefix = `${(me.username || '').toLowerCase()}.`;

  const run = async (fn) => { setErr(null); setBusy(true); try { await fn(); await reload(); } catch (e) { setErr(e); } setBusy(false); };
  const add = (e) => { e.preventDefault(); run(async () => { await api('/shop/team', { method: 'POST', body: f }); setF({ code: '', name: '', password: '' }); }); };
  const toggle = (s) => run(() => api(`/shop/team/${s.id}`, { method: 'PUT', body: { active: !s.active } }));
  const reset = (s) => { const pw = window.prompt(t('team.newPw')); if (pw) run(() => api(`/shop/team/${s.id}`, { method: 'PUT', body: { password: pw } })); };
  const del = (s) => { if (window.confirm(t('team.confirmDel', { n: s.name || s.username }))) run(() => api(`/shop/team/${s.id}`, { method: 'DELETE' })); };

  return (
    <>
      <PageHead title={t('nav.team')} />
      <p className="muted">{t('team.help')}</p>
      <ErrorBox error={err || error} />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <form className="card stack" onSubmit={add}>
          <h2>{t('team.add')}</h2>
          <Field label={t('team.name')}><input className="input" required maxLength={120} value={f.name} onChange={set('name')} /></Field>
          <Field label={t('team.code')}>
            <div className="row" dir="ltr" style={{ gap: 4, alignItems: 'center' }}>
              <span className="muted">{prefix}</span>
              <input className="input grow" required pattern="[A-Za-z0-9]{2,19}" maxLength={19} value={f.code} onChange={set('code')} autoCapitalize="none" />
            </div>
          </Field>
          <Field label={t('team.password')}><input className="input" type="text" required minLength={8} maxLength={128} value={f.password} onChange={set('password')} dir="ltr" autoComplete="off" /></Field>
          <button className="btn primary" disabled={busy}>{t('team.create')}</button>
        </form>
        <div className="card">
          <h2>{t('team.members')}</h2>
          {loading && !data ? <Loading /> : (data || []).length === 0 ? <p className="muted">{t('team.none')}</p> : (
            <div className="tablewrap">
              <table>
                <thead><tr><th>{t('team.name')}</th><th>{t('team.login')}</th><th>{t('status')}</th><th /></tr></thead>
                <tbody>
                  {data.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name || '—'}<div className="muted" style={{ fontSize: 12 }}>{fmtDate(s.createdAt)}</div></td>
                      <td dir="ltr"><code>{s.username}</code></td>
                      <td><span className={'badge' + (s.active ? ' ok' : ' bad')}>{s.active ? t('team.active') : t('team.off')}</span></td>
                      <td style={{ textAlign: 'end', whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn sm" disabled={busy} onClick={() => toggle(s)}>{s.active ? t('team.disable') : t('team.enable')}</button>{' '}
                        <button type="button" className="btn sm" disabled={busy} onClick={() => reset(s)}>{t('team.reset')}</button>{' '}
                        <button type="button" className="btn sm" disabled={busy} onClick={() => del(s)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h3 style={{ marginTop: 16 }}>{t('team.perms')}</h3>
          <ul className="muted" style={{ margin: 0, paddingInlineStart: 18 }}>
            <li>{t('team.p1')}</li><li>{t('team.p2')}</li>
          </ul>
        </div>
      </div>
    </>
  );
}
