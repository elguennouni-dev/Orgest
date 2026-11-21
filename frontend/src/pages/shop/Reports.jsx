import { useState } from 'react';
import { download } from '../../api.js';
import { useApi } from '../../hooks.js';
import { fmtInt, fmtWeight, Money, useI18n } from '../../i18n.jsx';
import { ErrorBox, Kpi, Loading, PageHead } from '../../components/ui.jsx';
import SalesChart from '../../components/SalesChart.jsx';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // date locale (pas UTC)

export default function Reports() {
  const { t } = useI18n();
  const today = new Date();
  const [from, setFrom] = useState(iso(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(iso(today));
  const { data, error, loading } = useApi(`/shop/reports?from=${from}&to=${to}`);
  const [dlErr, setDlErr] = useState(null);
  const dl = async (path, name) => { setDlErr(null); try { await download(path, name); } catch (e) { setDlErr(e); } };
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
            <Kpi label={t('reports.buybacks')} value={<Money v={data.buybackTotal} />} sub={`${fmtWeight(data.buybackWeightG)} {t('unit.g')}`} />
          </div>
          <div className="card">
            <h2>{t('reports.byDay')}</h2>
            <SalesChart byDay={data.byDay} />
          </div>
        </div>
      )}
    </>
  );
}
