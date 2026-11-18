import { Link } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';
import { fmtDate, useI18n } from '../../i18n.jsx';
import { waLink } from '../../config.js';

export default function Expired() {
  const { t } = useI18n();
  const { me } = useAuth();
  return (
    <div className="card stack" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', borderTop: '5px solid var(--gold)' }}>
      <h1>{me.active ? t('expired.title') : t('expired.suspended')}</h1>
      <p>{t('expired.text')}</p>
      {me.subscriptionEnd && <p className="muted">{t('account.endsOn')}: <b className="num">{fmtDate(me.subscriptionEnd)}</b></p>}
      <a className="btn wa" target="_blank" rel="noopener noreferrer" href={waLink(t('account.waRenew', { u: me.username }))}>{t('account.renew')}</a>
      <Link to="/app/account">{t('nav.account')}</Link>
    </div>
  );
}
