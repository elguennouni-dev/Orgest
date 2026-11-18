import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../hooks.js';
import { useI18n } from '../../i18n.jsx';
import { ErrorBox, Loading, PageHead } from '../../components/ui.jsx';
import { BuybackReceipt as View, ReceiptFrame } from '../../components/ReceiptView.jsx';

export default function BuybackReceipt() {
  const { t } = useI18n();
  const { id } = useParams();
  const { data, error, loading } = useApi(`/shop/buybacks/${id}`);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <>
      <PageHead title={t('receipt.title')}><Link className="btn" to="/app/buyback">{t('nav.buyback')}</Link></PageHead>
      <ReceiptFrame><View b={data} /></ReceiptFrame>
    </>
  );
}
