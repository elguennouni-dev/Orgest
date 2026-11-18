import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks.js';
import { fmtDate, Money, useI18n } from '../../i18n.jsx';
import { ErrorBox, Kpi, Loading, PageHead } from '../../components/ui.jsx';

export const STATUS_BADGE = { ACTIVE: 'ok', EXPIRING: 'warn', EXPIRED: 'bad', SUSPENDED: 'bad' };

export default function Clients() {
  const { t } = useI18n();
  const stats = useApi('/admin/stats');
  const { data, error, loading } = useApi('/admin/shops');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  if (loading && !data) return <Loading />;
  const rows = (data || []).filter((s) => (!status || s.status === status)
    && (!q || `${s.shopName} ${s.username} ${s.ownerName || ''} ${s.city || ''}`.toLowerCase().includes(q.toLowerCase())));
  const st = stats.data;
  return (
    <>
      <PageHead title={t('nav.clients')}><Link className="btn primary" to="/admin/new">＋ {t('nav.newClient')}</Link></PageHead>
      {st && (
        <div className="grid g4" style={{ marginBottom: 14 }}>
          <Kpi label={t('admin.active')} value={st.active} />
          <Kpi label={t('admin.expiring')} value={st.expiringSoon} />
          <Kpi label={t('admin.expired')} value={st.expired + st.suspended} />
          <Kpi label={t('admin.revenue')} value={<Money v={st.monthRevenue} />} />
        </div>
      )}
      <div className="card row" style={{ marginBottom: 14 }}>
        <input className="input grow" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ width: 170 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('admin.allStatus')}</option>
          {['ACTIVE', 'EXPIRING', 'EXPIRED', 'SUSPENDED'].map((s) => <option key={s} value={s}>{t('astatus.' + s)}</option>)}
        </select>
      </div>
      <ErrorBox error={error} />
      <div className="card tablewrap">
        <table>
          <thead><tr><th>{t('account.shopName')}</th><th>{t('login.username')}</th><th>{t('account.city')}</th><th>{t('phone')}</th><th>{t('account.endsOn')}</th><th>{t('status')}</th><th /></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td><b>{s.shopName}</b><br /><span className="muted">{s.ownerName}</span></td>
                <td className="num">{s.username}</td><td>{s.city}</td><td className="num">{s.phone}</td>
                <td className="num">{fmtDate(s.subscriptionEnd)}{s.status !== 'EXPIRED' && s.status !== 'SUSPENDED' && <span className="muted"> ({s.daysLeft}{t('admin.d')})</span>}</td>
                <td><span className={'badge ' + STATUS_BADGE[s.status]}>{t('astatus.' + s.status)}</span></td>
                <td><Link className="btn sm" to={`/admin/${s.id}`}>{t('admin.manage')}</Link></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="7" className="muted">{t('admin.none')}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
