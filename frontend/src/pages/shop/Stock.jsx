import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { download } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { useApi } from '../../hooks.js';
import { fmtWeight, Money, useI18n } from '../../i18n.jsx';
import { purity } from '../../lib/purity.js';
import Louiz from '../../components/Louiz.jsx';
import { ErrorBox, KARATS, Loading, PageHead } from '../../components/ui.jsx';

export default function Stock() {
  const { t } = useI18n();
  const [sp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  useEffect(() => { setQ(sp.get('q') || ''); setPage(0); }, [sp]);
  const [karat, setKarat] = useState(0);
  const [status, setStatus] = useState('IN_STOCK');
  const [page, setPage] = useState(0);
  const { data, error, loading } = useApi(`/shop/items?status=${status}&q=${encodeURIComponent(q)}&karat=${karat}&page=${page}&size=24`);
  const [dlErr, setDlErr] = useState(null);
  const owner = useAuth().me.role !== 'STAFF';
  const exportItems = async () => { try { await download('/shop/export/items.xlsx', 'stock.xlsx'); } catch (e) { setDlErr(e); } };
  const pages = data ? Math.ceil(data.total / data.size) : 0;

  return (
    <>
      <PageHead title={t('nav.stock')}>
        {owner && <button className="btn" onClick={exportItems}>⬇ {t('exportExcel')}</button>}
        {owner && <Link className="btn primary" to="/app/stock/new">＋ {t('stock.add')}</Link>}
      </PageHead>
      <ErrorBox error={dlErr} />
      <div className="card row" style={{ marginBottom: 14 }}>
        <input className="input grow" placeholder={t('search')} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <select style={{ width: 130 }} value={karat} onChange={(e) => { setKarat(Number(e.target.value)); setPage(0); }}>
          <option value={0}>{t('allKarats')}</option>
          {KARATS.map((k) => <option key={k} value={k}>{purity(k)}</option>)}
        </select>
        <select style={{ width: 150 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
          <option value="IN_STOCK">{t('stock.inStock')}</option>
          <option value="SOLD">{t('stock.soldOut')}</option>
          <option value="ALL">{t('stock.all')}</option>
        </select>
      </div>
      {loading && !data ? <Loading /> : error ? <ErrorBox error={error} /> : data.content.length === 0 ? (
        <div className="empty-louiz">
          <Louiz mood="thinking" size={130} />
          <h2>{t('pos.emptyTitle')}</h2>
          <p>{t('pos.emptyText')}</p>
          <Link className="btn primary" to="/app/stock/new">{t('pos.addStock')}</Link>
        </div>
      ) : (
        <div className="items">
          {data.content.map((i) => (
            <div className={'item' + (i.quantity === 0 ? ' out' : '')} key={i.id}>
              <div className="ph">{i.hasPhoto ? <img loading="lazy" src={`/api/shop/items/${i.id}/photo`} alt={i.name} /> : <span>◈</span>}
                <span className={'qtag num' + (i.quantity === 0 ? ' zero' : '')}>{i.quantity === 0 ? t('stock.soldOut') : `${t('stock.qtyShort')} ${i.quantity}`}</span>
              </div>
              <div className="body">
                <b>{i.name}</b>
                <span className="muted">{i.ref} · {purity(i.karat)} · <span className="num">{fmtWeight(i.weightG)} {t('unit.g')}</span></span>
                <span className="hint">{t('stock.making')}: <Money v={i.makingPerGram} />/{t('unit.g')}</span>
                <span className="hint num">{t('stock.totalWeight')}: {fmtWeight(Number(i.weightG) * i.quantity)} {t('unit.g')}</span>
                {owner && <Link className="btn sm" to={`/app/stock/${i.id}/edit`}>{i.quantity === 0 ? t('stock.restock') : t('edit')}</Link>}
              </div>
            </div>
          ))}
        </div>
      )}
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
