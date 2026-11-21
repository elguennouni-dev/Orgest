import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks.js';
import { fmtDateTime, Money, useI18n } from '../../i18n.jsx';
import { ErrorBox, Loading, PageHead } from '../../components/ui.jsx';

export default function Sales() {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const { data, error, loading } = useApi(`/shop/sales?page=${page}&size=20`);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const pages = Math.ceil(data.total / data.size);
  return (
    <>
      <PageHead title={t('nav.sales')} />
      <div className="card tablewrap">
        <table>
          <thead><tr><th>N°</th><th>{t('date')}</th><th>{t('type')}</th><th>{t('customer')}</th><th>{t('total')}</th><th>{t('sale.payment')}</th><th /></tr></thead>
          <tbody>
            {data.content.map((s) => (
              <tr key={s.id}>
                <td>{s.number}</td><td className="muted">{fmtDateTime(s.createdAt)}</td>
                <td><span className={'badge' + (s.type === 'EXCHANGE' ? ' warn' : '')}>{t('type.' + s.type)}</span></td>
                <td>{s.customerName || '—'}</td><td><Money v={s.subtotal} /></td>
                <td>{t('pay.' + s.paymentMode)}{s.payMethod && s.payMethod !== 'CASH' ? ` · ${t('paym.' + s.payMethod)}` : ''}</td>
                <td><Link className="btn sm" to={`/app/sales/${s.id}`}>{t('receipt.open')}</Link></td>
              </tr>
            ))}
            {data.content.length === 0 && <tr><td colSpan="7" className="muted">{t('dash.noSales')}</td></tr>}
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
