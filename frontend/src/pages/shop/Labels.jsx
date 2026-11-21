import { useState } from 'react';
import { useAuth } from '../../auth.jsx';
import { useApi } from '../../hooks.js';
import { fmtWeight, useI18n } from '../../i18n.jsx';
import Barcode from '../../components/Barcode.jsx';
import { ErrorBox, Loading, PageHead } from '../../components/ui.jsx';

/** Planche d'étiquettes à code-barres (Code 128 = la référence de l'article, lisible par tout lecteur USB). */
export default function Labels() {
  const { t } = useI18n();
  const { me } = useAuth();
  const [q, setQ] = useState('');
  const [fmt, setFmt] = useState('a4');
  const [sel, setSel] = useState({});          // id -> { item, copies }
  const { data, error, loading } = useApi(`/shop/items?status=IN_STOCK&q=${encodeURIComponent(q)}&size=48`);
  const list = data?.content || [];

  const toggle = (it) => setSel((s) => { const n = { ...s }; if (n[it.id]) delete n[it.id]; else n[it.id] = { item: it, copies: 1 }; return n; });
  const copies = (id, v) => setSel((s) => ({ ...s, [id]: { ...s[id], copies: Math.max(1, Math.min(100, Math.trunc(Number(v) || 1))) } }));
  const labels = Object.values(sel).flatMap(({ item, copies: n }) => Array.from({ length: n }, (_, i) => ({ item, k: `${item.id}-${i}` })));
  const page = fmt === 'a4' ? '@page { size: A4 portrait; margin: 0; }' : '@page { size: 50mm 25mm; margin: 0; }';

  return (
    <>
      <style>{page}</style>
      <PageHead title={t('labels.title')}>
        <button type="button" className="btn primary" disabled={labels.length === 0} onClick={() => window.print()}>🖨 {t('print')} ({labels.length})</button>
      </PageHead>
      <div className="no-print">
        <p className="muted">{t('labels.help')}</p>
        <div className="card row" style={{ marginBottom: 14 }}>
          <input className="input grow" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={fmt} onChange={(e) => setFmt(e.target.value)} style={{ width: 240 }} aria-label={t('labels.format')}>
            <option value="a4">{t('labels.a4')}</option>
            <option value="roll">{t('labels.roll')}</option>
          </select>
        </div>
        <ErrorBox error={error} />
        {loading && !data ? <Loading /> : (
          <div className="tablewrap">
            <table>
              <thead><tr><th /><th>{t('labels.ref')}</th><th>{t('stock.name')}</th><th>K</th><th>g</th><th>{t('labels.copies')}</th></tr></thead>
              <tbody>
                {list.map((it) => (
                  <tr key={it.id}>
                    <td><input type="checkbox" checked={!!sel[it.id]} onChange={() => toggle(it)} aria-label={it.ref} /></td>
                    <td className="num" dir="ltr">{it.ref}</td>
                    <td>{it.name}</td>
                    <td>{it.karat}K</td>
                    <td className="num">{fmtWeight(it.weightG)}</td>
                    <td>{sel[it.id] && <input className="input" type="number" min="1" max="100" style={{ width: 80 }} value={sel[it.id].copies} onChange={(e) => copies(it.id, e.target.value)} />}</td>
                  </tr>
                ))}
                {list.length === 0 && <tr><td colSpan="6" className="muted">{t('stock.empty')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className={'label-sheet ' + fmt} aria-hidden="true">
        {labels.map(({ item, k }) => (
          <div className="label" key={k}>
            <div className="ls">{me.shopName}</div>
            <div className="ln" dir="auto">{item.name}</div>
            <div className="lk num">{item.karat}K · {fmtWeight(item.weightG)} g</div>
            <Barcode value={item.ref} height={30} />
          </div>
        ))}
      </div>
    </>
  );
}
