import { Link } from 'react-router-dom';
import { useApi } from '../../hooks.js';
import { fmtDate, useI18n } from '../../i18n.jsx';
import { ErrorBox, Loading, PageHead } from '../../components/ui.jsx';
import Louiz from '../../components/Louiz.jsx';

export default function BlogAdmin() {
  const { t } = useI18n();
  const { data, error, loading } = useApi('/admin/posts');
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <>
      <PageHead title={t('blogA.title')}><Link className="btn primary" to="/admin/blog/new">＋ {t('blogA.new')}</Link></PageHead>
      {data.length === 0 ? (
        <div className="empty-louiz"><Louiz mood="thinking" size={120} /><p>{t('blogA.empty')}</p><Link className="btn primary" to="/admin/blog/new">{t('blogA.new')}</Link></div>
      ) : (
        <div className="card">
          <div className="tablewrap">
            <table>
              <thead><tr><th /><th>{t('blogA.t')}</th><th>{t('blogA.category')}</th><th>{t('status')}</th><th>{t('date')}</th><th /></tr></thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    <td style={{ width: 72 }}>{p.cover ? <img src={`/api/public/blog-cover/${p.cover}`} alt="" style={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 8, display: 'block' }} /> : <Louiz mood="happy" size={40} />}</td>
                    <td className="wrap"><Link to={`/admin/blog/${p.id}`} style={{ fontWeight: 600 }}>{p.title}</Link><br /><span className="muted" dir="ltr" style={{ fontSize: 12 }}>/blog/{p.slug}</span></td>
                    <td>{p.category || '—'}</td>
                    <td><span className={'badge ' + (p.published ? 'ok' : 'warn')}>{p.published ? t('blogA.live') : t('blogA.draft')}</span></td>
                    <td className="muted">{fmtDate(p.updatedAt)}</td>
                    <td>{p.published && <Link className="btn sm" to={`/blog/${p.slug}`} target="_blank">{t('blogA.view')}</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
