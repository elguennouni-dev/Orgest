import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../hooks.js';
import { useI18n } from '../../i18n.jsx';
import { ErrorBox, Loading, PageHead } from '../../components/ui.jsx';
import { ReceiptFrame, SaleReceipt as View } from '../../components/ReceiptView.jsx';

export default function SaleReceipt() {
  const { t } = useI18n();
  const { id } = useParams();
  const { data, error, loading } = useApi(`/shop/sales/${id}`);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <>
      <PageHead title={t('receipt.title')}><Link className="btn" to="/app/sales">{t('nav.sales')}</Link></PageHead>
      <ReceiptFrame><View sale={data} /></ReceiptFrame>
    </>
  );
}
