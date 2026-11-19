import { useMemo, useState } from 'react';
import { bucketize, fmtCompact, niceScale } from '../lib/chart.js';
import { fmtDate, fmtMoney, Money, useI18n } from '../i18n.jsx';

const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dm = (s) => { const d = parse(s); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; };
const my = (s) => { const d = parse(s); return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`; };

/** Graphique lisible : axe des montants gradué, dates, valeur au toucher, meilleur jour et moyenne. */
export default function SalesChart({ byDay }) {
  const { t } = useI18n();
  const { mode, items } = useMemo(() => bucketize(byDay), [byDay]);
  const total = items.reduce((s, x) => s + x.total, 0);
  const best = items.reduce((b, x, i) => (x.total > (items[b]?.total ?? -1) ? i : b), 0);
  const scale = niceScale(Math.max(0, ...items.map((x) => x.total)), 4);
  const [sel, setSel] = useState(null);
  const active = Math.min(sel ?? best, items.length - 1);
  const cur = items[active];
  const withSales = byDay.filter((d) => Number(d.total) > 0).length;
  const step = Math.max(1, Math.ceil(items.length / 8));
  const showVals = items.length <= 12;
  const label = (x) => (mode === 'month' ? my(x.start) : dm(x.start));
  const describe = (x) => (mode === 'week' ? t('reports.weekOf', { d: fmtDate(x.start) }) : mode === 'month' ? t('reports.monthOf', { d: my(x.start) }) : fmtDate(x.start));

  if (!(total > 0)) return <p className="muted">{t('reports.noSales')}</p>;
  return (
    <div className="schart">
      <div className="readout" aria-live="polite">
        <span className="muted">{describe(cur)}</span>
        <b className="num"><Money v={cur.total} /></b>
        {active === best && <span className="badge ok">{t('reports.best')}</span>}
      </div>

      <div className="plot" dir="ltr">
        <div className="yaxis" aria-hidden="true">
          {[...scale.ticks].reverse().map((v) => <span key={v} className="num">{fmtCompact(v)}</span>)}
        </div>
        <div className="area">
          <div className="grid-lines" aria-hidden="true">{scale.ticks.map((v) => <i key={v} style={{ bottom: `${(v / scale.max) * 100}%` }} />)}</div>
          <div className="bars" role="group" aria-label={t('reports.byDay')}>
            {items.map((x, i) => (
              <button
                key={x.start}
                type="button"
                className={'bar' + (i === active ? ' on' : '') + (x.total > 0 ? '' : ' zero')}
                style={{ height: `${x.total > 0 ? Math.max(2, (x.total / scale.max) * 100) : 0}%` }}
                onClick={() => setSel(i)}
                onMouseEnter={() => setSel(i)}
                onFocus={() => setSel(i)}
                aria-label={`${describe(x)} : ${fmtMoney(x.total)} DH`}
              >
                {showVals && x.total > 0 && <em className="num">{fmtCompact(x.total)}</em>}
              </button>
            ))}
          </div>
        </div>
        <div className="xaxis" aria-hidden="true">
          {items.map((x, i) => <span key={x.start} className="num" style={{ visibility: i % step === 0 || i === items.length - 1 ? 'visible' : 'hidden' }}>{label(x)}</span>)}
        </div>
      </div>
      <p className="hint" style={{ margin: '4px 0 0' }}>{t('reports.touchHint')} · {t('reports.unit')} ({mode === 'day' ? t('reports.perDay') : mode === 'week' ? t('reports.perWeek') : t('reports.perMonth')})</p>

      <div className="grid g3" style={{ marginTop: 12 }}>
        <div className="mini-stat"><span className="muted">{t('reports.best')}</span><b className="num"><Money v={items[best].total} /></b><span className="muted num">{describe(items[best])}</span></div>
        <div className="mini-stat"><span className="muted">{t('reports.avgDay')}</span><b className="num"><Money v={total / Math.max(1, byDay.length)} /></b><span className="muted">{t('reports.overDays', { n: byDay.length })}</span></div>
        <div className="mini-stat"><span className="muted">{t('reports.activeDays')}</span><b className="num">{withSales} / {byDay.length}</b></div>
      </div>

      <details className="detail">
        <summary>{t('reports.detail')}</summary>
        <div className="tablewrap"><table>
          <thead><tr><th>{t('date')}</th><th className="num">{t('total')}</th></tr></thead>
          <tbody>{items.filter((x) => x.total > 0).map((x) => <tr key={x.start}><td className="num">{describe(x)}</td><td className="num"><Money v={x.total} /></td></tr>)}</tbody>
        </table></div>
      </details>
    </div>
  );
}
