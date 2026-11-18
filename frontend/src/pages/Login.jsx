import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { ErrorBox, Logo } from '../components/ui.jsx';
import { LangToggle } from '../components/Layouts.jsx';
import { Icon, P } from '../components/icons.jsx';
import Louiz from '../components/Louiz.jsx';
import { waLink } from '../config.js';

const EYE = 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z';
const EYE_OFF = 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 5.4-1.6';
const WA = 'M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20zM9 9.5c0 3 2.5 5.5 5.5 5.5l1.5-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2L9 9.5z';

export default function Login() {
  const { t } = useI18n();
  const { me, login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState('none');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (me) return <Navigate to={me.role === 'ADMIN' ? '/admin' : '/app'} replace />;

  let mood = 'wave', bubble = 'lz.login.wave';
  if (error) { mood = 'worried'; bubble = 'lz.login.err'; }
  else if (focus === 'pw' && show) { mood = 'thinking'; bubble = 'lz.login.peek'; }
  else if (focus === 'pw') { mood = 'sleepy'; bubble = 'lz.login.pw'; }
  else if (focus === 'id') { mood = 'happy'; bubble = 'lz.login.id'; }

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('MISSING'); return; }
    setBusy(true); setError(null);
    try {
      const u = await login(username.trim(), password);
      nav(u.role === 'ADMIN' ? '/admin' : '/app', { replace: true });
    } catch (err) {
      setError(err); setBusy(false);
    }
  };

  const feats = [[t('login.f1'), P.chart], [t('login.f2'), P.stock], [t('login.f3'), P.print]];

  return (
    <div className="login2">
      <section className="brandside">
        <Logo variant="wordmark" size={48} gap="#14120E" />
        <div className="stack" style={{ gap: 20, marginTop: 'auto' }}>
          <h2>{t('login.hero1')} <b>{t('login.hero2')}</b>{t('login.hero3')}</h2>
          <p>{t('login.heroText')}</p>
        </div>
        <ul>{feats.map(([f, d]) => <li key={f}><i><Icon d={d} /></i>{f}</li>)}</ul>
        <small>{t('login.made')}</small>
      </section>

      <section className="formside">
        <div className="row" style={{ justifyContent: 'flex-end' }}><LangToggle /></div>
        <div className="formwrap">
          <form onSubmit={submit} autoComplete="on" noValidate>
            <div className="louiz-row">
              <Louiz mood={mood} size={112} />
              <div className="bubble" aria-live="polite">{t(bubble)}</div>
            </div>
            <div className="stack" style={{ gap: 6 }}>
              <h1>{t('login.welcome')}</h1>
              <p className="muted" style={{ margin: 0 }}>{t('login.sub')}</p>
            </div>
            {error === 'MISSING' ? <div className="err-louiz" role="alert"><span>{t('login.fill')}</span></div> : <ErrorBox error={error} />}
            <div className="field">
              <label htmlFor="u">{t('login.user')}</label>
              <input id="u" className="input" name="username" autoComplete="username" placeholder={t('login.userPh')} value={username} maxLength={60}
                     onFocus={() => setFocus('id')} onBlur={() => setFocus('none')} onChange={(e) => { setUsername(e.target.value); setError(null); }} autoFocus dir="ltr" />
            </div>
            <div className="field">
              <label htmlFor="p">{t('login.password')}</label>
              <div className="pwwrap">
                <input id="p" className="input" name="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} maxLength={128}
                       onFocus={() => setFocus('pw')} onBlur={() => setFocus('none')} onChange={(e) => { setPassword(e.target.value); setError(null); }} dir="ltr" />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? t('login.hide') : t('login.show')}><Icon d={show ? EYE_OFF : EYE} /></button>
              </div>
            </div>
            <button className="go" disabled={busy}>{busy ? t('loading') : t('login.submit')}</button>
            <div className="sep">{t('login.new')}</div>
            <a className="wa" href={waLink(t('landing.waMessage'))} target="_blank" rel="noopener noreferrer">
              <Icon d={WA} /> {t('login.askWa')}
            </a>
          </form>
        </div>
      </section>
    </div>
  );
}
