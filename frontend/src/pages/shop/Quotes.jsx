import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks.js';
import { fmtDate, Money, useI18n } from '../../i18n.jsx';
import { ErrorBox, Loading, PageHead } from '../../components/ui.jsx';

export function QuoteBadge({ q }) {
  const { t } = useI18n();
  const cls = q.status === 'ACCEPTED' || q.status === 'CONVERTED' ? ' ok' : q.status === 'REJECTED' || q.expired ? ' warn' : '';
  return <span className={'badge' + cls}>{q.expired ? t('quote.expired') : t('quote.s.' + q.status)}</span>;
}

export default function Quotes() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const { data, error, loading } = useApi(`/shop/quotes?page=${page}&size=20`);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const pages = Math.ceil(data.total / data.size);
  return (
    <>
      <PageHead title={t('quote.title')}><Link className="btn primary" to="/app/quotes/new">+ {t('quote.new')}</Link></PageHead>
      <div className="card tablewrap">
        <table>
          <thead><tr><th>N°</th><th>{t('date')}</th><th>{t('customer')}</th><th>{t('total')}</th><th>{t('quote.validUntil')}</th><th>{t('status')}</th><th /></tr></thead>
          <tbody>
            {data.content.map((q) => (
              <tr key={q.id}>
                <td>{q.number}</td><td className="muted">{fmtDate(q.createdAt)}</td>
                <td>{q.customerName || '—'}</td><td><Money v={q.subtotal} /></td>
                <td className="muted">{fmtDate(q.validUntil)}</td>
                <td><QuoteBadge q={q} /></td>
                <td><Link className="btn sm" to={`/app/quotes/${q.id}`}>{t('quote.open')}</Link></td>
              </tr>
            ))}
            {data.content.length === 0 && <tr><td colSpan="7" className="muted">{t('quote.empty')}</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="row" style={{ marginTop: 14, justifyContent: 'center' }}>
          <button className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
          <span className="num">{page + 1} / {pages}</span>
          <button className="btn sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>›</button>
        </div>
      )}
    </>
  );
}
