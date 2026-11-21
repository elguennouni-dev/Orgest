import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { useApi } from '../../hooks.js';
import { useI18n } from '../../i18n.jsx';
import { ErrorBox, Loading, PageHead } from '../../components/ui.jsx';
import { ReceiptFrame, QuoteDoc } from '../../components/ReceiptView.jsx';
import { QuoteBadge } from './Quotes.jsx';
import { whatsappUrl } from '../../lib/quote.js';

export default function QuoteView() {
  const { t } = useI18n();
  const { me } = useAuth();
  const nav = useNavigate();
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/shop/quotes/${id}`);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const run = async (fn) => {
    setBusy(true); setErr(null);
    try { await fn(); } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  const setStatus = (s) => run(async () => { await api(`/shop/quotes/${id}/status`, { method: 'POST', body: { status: s } }); reload?.(); });
  const convert = () => run(async () => {
    if (!window.confirm(t('quote.convertConfirm'))) return;
    const sale = await api(`/shop/quotes/${id}/convert`, { method: 'POST', body: { paymentMode: 'CASH', payMethod: 'CASH' } });
    nav(`/app/sales/${sale.id}`, { state: { celebrate: true } });
  });
  const done = data.status === 'CONVERTED';
  const wa = whatsappUrl(data, me?.shopName, t);

  return (
    <>
      <PageHead title={`${t('quote.one')} ${data.number}`}>
        <QuoteBadge q={data} />
        <Link className="btn" to="/app/quotes">{t('quote.title')}</Link>
      </PageHead>
      <ErrorBox error={err} />
      <div className="row no-print" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
        {!done && <Link className="btn" to={`/app/quotes/${id}/edit`}>{t('edit')}</Link>}
        {!done && data.status !== 'SENT' && <button className="btn" disabled={busy} onClick={() => setStatus('SENT')}>{t('quote.markSent')}</button>}
        {!done && data.status !== 'ACCEPTED' && <button className="btn" disabled={busy} onClick={() => setStatus('ACCEPTED')}>{t('quote.markAccepted')}</button>}
        {!done && data.status !== 'REJECTED' && <button className="btn" disabled={busy} onClick={() => setStatus('REJECTED')}>{t('quote.markRejected')}</button>}
        {wa && <a className="btn" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
        {!done && data.status !== 'REJECTED' && <button className="btn primary" disabled={busy} onClick={convert}>{t('quote.convert')}</button>}
        {done && data.saleId && <Link className="btn primary" to={`/app/sales/${data.saleId}`}>{t('quote.openSale')}</Link>}
      </div>
      <ReceiptFrame><QuoteDoc quote={data} /></ReceiptFrame>
    </>
  );
}
