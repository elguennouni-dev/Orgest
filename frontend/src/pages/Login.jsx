import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { ErrorBox, Field, LangSwitch, Logo } from '../components/ui.jsx';
import { waLink } from '../config.js';

export default function Login() {
  const { t } = useI18n();
  const { me, login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (me) return <Navigate to={me.role === 'ADMIN' ? '/admin' : '/app'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const u = await login(username.trim(), password);
      nav(u.role === 'ADMIN' ? '/admin' : '/app', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap light">
      <form className="login-card stack" onSubmit={submit} autoComplete="on">
        <div className="logo"><Logo /></div>
        <div className="row spread">
          <h1>{t('login.title')}</h1>
          <LangSwitch />
        </div>
        <Field label={t('login.username')}>
          <input className="input" name="username" autoComplete="username" value={username} maxLength={60}
                 onChange={(e) => setUsername(e.target.value)} required autoFocus dir="ltr" />
        </Field>
        <Field label={t('login.password')}>
          <input className="input" name="password" type="password" autoComplete="current-password" value={password}
                 maxLength={128} onChange={(e) => setPassword(e.target.value)} required dir="ltr" />
        </Field>
        <ErrorBox error={error} />
        <button className="btn primary block" disabled={busy}>{busy ? t('loading') : t('login.submit')}</button>
        <p className="hint">{t('login.noAccount')} <a href={waLink(t('landing.waMessage'))} target="_blank" rel="noopener noreferrer">WhatsApp</a></p>
        <Link to="/">← {t('login.back')}</Link>
      </form>
    </div>
  );
}
