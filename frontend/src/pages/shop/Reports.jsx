import { useState } from 'react';
import { download } from '../../api.js';
import { useApi } from '../../hooks.js';
import { fmtDate, fmtInt, fmtWeight, Money, useI18n } from '../../i18n.jsx';
import { ErrorBox, Kpi, Loading, PageHead } from '../../components/ui.jsx';

const iso = (d) => d.toISOString().slice(0, 10);

export default function Reports() {
  const { t } = useI18n();
  const today = new Date();
  const [from, setFrom] = useState(iso(new Date(today.getFullYear(), today.getMonth(), 2)).slice(0, 8) + '01');
  const [to, setTo] = useState(iso(today));
  const { data, error, loading } = useApi(`/shop/reports?from=${from}&to=${to}`);
  const [dlErr, setDlErr] = useState(null);
  const dl = async (path, name) => { setDlErr(null); try { await download(path, name); } catch (e) { setDlErr(e); } };
  const max = data ? Math.max(1, ...data.byDay.map((d) => Number(d.total))) : 1;
  return (
    <>
      <PageHead title={t('nav.reports')} />
      <div className="card row" style={{ marginBottom: 14 }}>
        <label className="row">{t('from')} <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 160 }} dir="ltr" /></label>
        <label className="row">{t('to')} <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 160 }} dir="ltr" /></label>
        <span className="grow" />
        <button className="btn" onClick={() => dl(`/shop/export/sales.xlsx?from=${from}&to=${to}`, 'ventes.xlsx')}>⬇ {t('reports.exportSales')}</button>
        <button className="btn" onClick={() => dl(`/shop/export/buybacks.xlsx?from=${from}&to=${to}`, 'achats-or.xlsx')}>⬇ {t('reports.exportBuybacks')}</button>
        <button className="btn" onClick={() => dl('/shop/export/items.xlsx', 'stock.xlsx')}>⬇ {t('reports.exportItems')}</button>
      </div>
      <ErrorBox error={dlErr || error} />
      {loading && !data ? <Loading /> : data && (
        <div className="stack">
          <div className="grid g4">
            <Kpi label={t('reports.sales')} value={<Money v={data.salesTotal} />} sub={t('dash.salesCount', { n: data.salesCount })} />
            <Kpi label={t('reports.avg')} value={<Money v={data.averageTicket} />} />
            <Kpi label={t('reports.exchanges')} value={<span className="num">{fmtInt(data.exchangeCount)}</span>} />
            <Kpi label={t('reports.buybacks')} value={<Money v={data.buybackTotal} />} sub={`${fmtWeight(data.buybackWeightG)} g`} />
          </div>
          <div className="card">
            <h2>{t('reports.byDay')}</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160, overflowX: 'auto' }} dir="ltr">
              {data.byDay.map((d) => (
                <div key={d.date} title={`${fmtDate(d.date)} — ${Math.round(d.total)}`} style={{ flex: '1 0 8px', minWidth: 8, height: `${Math.max(2, (Number(d.total) / max) * 100)}%`, background: Number(d.total) > 0 ? 'var(--gold)' : 'var(--border)', borderRadius: '3px 3px 0 0' }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
