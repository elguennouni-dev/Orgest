import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useApi } from '../../hooks.js';
import { fmtInt, useI18n } from '../../i18n.jsx';
import { ErrorBox, Loading, PageHead } from '../../components/ui.jsx';

export default function Plans() {
  const { t } = useI18n();
  const { data, error, loading } = useApi('/admin/plans');
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setRows(data.map((p) => ({ months: p.months, price: String(p.price), popular: p.popular, active: p.active }))); }, [data]);
  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const set = (i, k, v) => { setOk(false); setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : k === 'popular' && v ? { ...r, popular: false } : r))); };
  const save = async () => {
    setBusy(true); setErr(null); setOk(false);
    try {
      const saved = await api('/admin/plans', { method: 'PUT', body: { plans: rows.map((r) => ({ months: Number(r.months), price: Number(r.price || 0), popular: r.popular, active: r.active })) } });
      setRows(saved.map((p) => ({ months: p.months, price: String(p.price), popular: p.popular, active: p.active }))); setOk(true);
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };
  const preview = rows.filter((r) => r.active && Number(r.months) > 0).sort((a, b) => a.months - b.months);

  return (
    <>
      <PageHead title={t('plans.title')} />
      <p className="muted" style={{ marginTop: -8 }}>{t('plans.help')}</p>
      <div className="card stack">
        <div className="tablewrap">
          <table>
            <thead><tr><th>{t('plans.months')}</th><th>{t('plans.price')}</th><th>{t('plans.popular')}</th><th>{t('plans.active')}</th><th /></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td><input className="input" style={{ width: 100 }} type="number" min="1" max="60" value={r.months} onChange={(e) => set(i, 'months', e.target.value)} dir="ltr" /></td>
                  <td><input className="input" style={{ width: 140 }} type="number" min="0" step="1" value={r.price} onChange={(e) => set(i, 'price', e.target.value)} dir="ltr" /></td>
                  <td><input type="radio" name="pop" checked={r.popular} onChange={() => set(i, 'popular', true)} aria-label={t('plans.popular')} /> {r.popular && <button type="button" className="btn sm" onClick={() => set(i, 'popular', false)}>✕</button>}</td>
                  <td><input type="checkbox" checked={r.active} onChange={(e) => set(i, 'active', e.target.checked)} aria-label={t('plans.active')} /></td>
                  <td><button type="button" className="btn sm danger" onClick={() => { setOk(false); setRows(rows.filter((_, j) => j !== i)); }}>{t('remove')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={() => setRows([...rows, { months: '', price: '', popular: false, active: true }])}>＋ {t('plans.add')}</button>
          <button type="button" className="btn primary" disabled={busy || rows.length === 0} onClick={save}>{busy ? t('loading') : t('save')}</button>
          {ok && <span className="okbox">{t('plans.saved')}</span>}
        </div>
        <ErrorBox error={err} />
      </div>
      <h2 style={{ margin: '24px 0 10px' }}>{t('plans.preview')}</h2>
      <div className="plans">
        {preview.map((r) => (
          <div key={r.months} className={'plan3' + (r.popular ? ' pop' : '')}>
            {r.popular && <span className="ribbon">{t('plan.popular')}</span>}
            <span className="pm"><b className="num">{r.months}</b> {t('landing.months')}</span>
            <div className="pp"><b className="num">{fmtInt(r.price)}</b> <span>{t('dh')}</span></div>
            <span className="muted">{t('plan.perMonth', { n: fmtInt(Number(r.price) / Number(r.months)) })}</span>
          </div>
        ))}
      </div>
    </>
  );
}
