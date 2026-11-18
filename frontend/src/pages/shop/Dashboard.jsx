import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks.js';
import { fmtDateTime, fmtInt, fmtWeight, Money, useI18n } from '../../i18n.jsx';
import { ErrorBox, Kpi, Loading, PageHead } from '../../components/ui.jsx';

function Prices({ prices, onSaved }) {
  const { t } = useI18n();
  const [edit, setEdit] = useState(false);
  const [vals, setVals] = useState({});
  const [error, setError] = useState(null);
  const start = () => {
    const v = {};
    prices.forEach((p) => { v[p.karat] = { sell: p.sellPerGram, buy: p.buyPerGram }; });
    setVals(v); setEdit(true); setError(null);
  };
  const save = async () => {
    try {
      await api('/shop/prices', { method: 'PUT', body: { prices: Object.entries(vals).map(([k, v]) => ({ karat: Number(k), sellPerGram: Number(v.sell || 0), buyPerGram: Number(v.buy || 0) })) } });
      setEdit(false); onSaved();
    } catch (e) { setError(e); }
  };
  return (
    <div className="card">
      <div className="row spread">
        <h2>{t('dash.prices')}</h2>
        {!edit ? <button className="btn sm" onClick={start}>{t('edit')}</button>
          : <div className="row"><button className="btn sm primary" onClick={save}>{t('save')}</button><button className="btn sm" onClick={() => setEdit(false)}>{t('cancel')}</button></div>}
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>{t('karat')}</th><th>{t('dash.sellPrice')}</th><th>{t('dash.buyPrice')}</th></tr></thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p.karat}>
                <td><b>{p.karat}K</b></td>
                {edit ? (
                  <>
                    <td><input className="input" type="number" min="0" step="0.01" value={vals[p.karat]?.sell ?? ''} onChange={(e) => setVals({ ...vals, [p.karat]: { ...vals[p.karat], sell: e.target.value } })} /></td>
                    <td><input className="input" type="number" min="0" step="0.01" value={vals[p.karat]?.buy ?? ''} onChange={(e) => setVals({ ...vals, [p.karat]: { ...vals[p.karat], buy: e.target.value } })} /></td>
                  </>
                ) : (<><td><Money v={p.sellPerGram} /></td><td><Money v={p.buyPerGram} /></td></>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">{t('dash.pricesHint')}</p>
      <ErrorBox error={error} />
    </div>
  );
}

export default function Dashboard() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi('/shop/dashboard');
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const d = data;
  return (
    <>
      <PageHead title={t('nav.dashboard')}>
        <Link className="btn primary" to="/app/sale">{t('nav.sale')}</Link>
        <Link className="btn" to="/app/exchange">{t('nav.exchange')}</Link>
        <Link className="btn" to="/app/buyback">{t('nav.buyback')}</Link>
      </PageHead>
      <div className="stack">
        <div className="grid g4">
          <Kpi label={t('dash.salesToday')} value={<Money v={d.salesToday} />} sub={t('dash.salesCount', { n: d.salesCountToday })} />
          <Kpi label={t('dash.salesMonth')} value={<Money v={d.salesMonth} />} sub={`${t('dash.buybackMonth')}: ${Math.round(d.buybackMonth)} ${t('dh')}`} />
          <Kpi label={t('dash.stock')} value={<span className="num">{fmtInt(d.stockCount)}</span>} sub={`${fmtWeight(d.stockWeightG)} g · ${t('dash.value')} ≈ ${Math.round(d.stockValue)} ${t('dh')}`} />
          <Kpi label={t('dash.installments')} value={<Money v={d.installmentsOutstanding} />} sub={t('dash.overdue', { n: d.overdueInstallments })} />
        </div>
        <div className="grid g2">
          <Prices prices={d.prices} onSaved={reload} />
          <div className="card">
            <div className="row spread"><h2>{t('dash.recent')}</h2><Link to="/app/sales">{t('seeAll')}</Link></div>
            {d.recentSales.length === 0 ? <p className="muted">{t('dash.noSales')}</p> : (
              <div className="tablewrap"><table><tbody>
                {d.recentSales.map((s) => (
                  <tr key={s.id}>
                    <td><Link to={`/app/sales/${s.id}`}>{s.number}</Link></td>
                    <td>{s.customerName || '—'}</td>
                    <td className="muted">{fmtDateTime(s.createdAt)}</td>
                    <td><Money v={s.subtotal} /></td>
                  </tr>
                ))}
              </tbody></table></div>
            )}
            <p className="hint">{t('dash.workshopOpen', { n: d.openWorkshop })}</p>
          </div>
        </div>
      </div>
    </>
  );
}
