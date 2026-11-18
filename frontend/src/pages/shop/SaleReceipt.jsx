import { Link, useLocation, useParams } from 'react-router-dom';
import Louiz from '../../components/Louiz.jsx';
import { useApi } from '../../hooks.js';
import { useI18n } from '../../i18n.jsx';
import { ErrorBox, Loading, PageHead } from '../../components/ui.jsx';
import { ReceiptFrame, SaleReceipt as View } from '../../components/ReceiptView.jsx';

export default function SaleReceipt() {
  const { t } = useI18n();
  const { id } = useParams();
  const celebrate = !!useLocation().state?.celebrate;
  const { data, error, loading } = useApi(`/shop/sales/${id}`);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <>
      <PageHead title={t('receipt.title')}><Link className="btn" to="/app/sales">{t('nav.sales')}</Link></PageHead>
      {celebrate && (
        <div className="alert-louiz no-print" style={{ marginBottom: 16 }} role="status">
          <Louiz mood="celebrate" size={72} />
          <div className="tx"><strong style={{ fontSize: 16, fontWeight: 600 }}>{t('louiz.done')}</strong></div>
        </div>
      )}
      <ReceiptFrame><View sale={data} /></ReceiptFrame>
    </>
  );
}
