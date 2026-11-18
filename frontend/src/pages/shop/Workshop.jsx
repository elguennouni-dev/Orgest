import { useState } from 'react';
import { api } from '../../api.js';
import { useApi, waPhone } from '../../hooks.js';
import { fmtDate, fmtWeight, Money, useI18n } from '../../i18n.jsx';
import { ErrorBox, Field, KARATS, Loading, Modal, PageHead } from '../../components/ui.jsx';

const EMPTY = { customerName: '', customerPhone: '', description: '', karat: 18, artisanName: '', artisanPhone: '', givenWeightG: '0', labourCost: '0', depositAmount: '0', agreedPrice: '0', dueDate: '', note: '' };
const BADGE = { SENT: 'warn', READY: 'ok', DELIVERED: '', CANCELLED: 'bad' };

export default function Workshop() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi('/shop/workshop');
  const [form, setForm] = useState(null);
  const [ready, setReady] = useState(null);
  const [recv, setRecv] = useState('');
  const [err, setErr] = useState(null);

  const save = async (e) => {
    e.preventDefault(); setErr(null);
    try {
      const body = { ...form, karat: Number(form.karat), givenWeightG: Number(form.givenWeightG || 0), labourCost: Number(form.labourCost || 0), depositAmount: Number(form.depositAmount || 0), agreedPrice: Number(form.agreedPrice || 0), dueDate: form.dueDate || null, customerName: form.customerName || null, customerPhone: form.customerPhone || null, artisanPhone: form.artisanPhone || null, note: form.note || null };
      delete body.id;
      await api(form.id ? `/shop/workshop/${form.id}` : '/shop/workshop', { method: form.id ? 'PUT' : 'POST', body });
      setForm(null); reload();
    } catch (e2) { setErr(e2); }
  };
  const setStatus = async (id, status, receivedWeightG) => {
    setErr(null);
    try { await api(`/shop/workshop/${id}/status`, { method: 'POST', body: { status, receivedWeightG: receivedWeightG ?? null } }); setReady(null); reload(); } catch (e) { setErr(e); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHead title={t('nav.workshop')}><button className="btn primary" onClick={() => { setForm({ ...EMPTY }); setErr(null); }}>＋ {t('workshop.new')}</button></PageHead>
      <p className="hint">{t('workshop.help')}</p>
      <ErrorBox error={err || error} />
      {loading && !data ? <Loading /> : (
        <div className="card tablewrap">
          <table>
            <thead><tr><th>N°</th><th>{t('workshop.order')}</th><th>{t('workshop.artisan')}</th><th>{t('workshop.given')}</th><th>{t('workshop.received')}</th><th>{t('workshop.loss')}</th><th>{t('workshop.due')}</th><th>{t('status')}</th><th /></tr></thead>
            <tbody>
              {data?.map((w) => {
                const wa = waPhone(w.customerPhone);
                return (
                  <tr key={w.id}>
                    <td>{w.number}</td>
                    <td className="wrap"><b>{w.description}</b><br /><span className="muted">{w.customerName || '—'} · {w.karat}K</span></td>
                    <td className="wrap">{w.artisanName}<br /><span className="muted num">{w.artisanPhone}</span></td>
                    <td className="num">{fmtWeight(w.givenWeightG)} g</td>
                    <td className="num">{w.receivedWeightG != null ? `${fmtWeight(w.receivedWeightG)} g` : '—'}</td>
                    <td className="num">{w.lossG != null ? `${fmtWeight(w.lossG)} g` : '—'}</td>
                    <td className="num">{fmtDate(w.dueDate)}</td>
                    <td><span className={'badge ' + BADGE[w.status]}>{t('wstatus.' + w.status)}</span></td>
                    <td>
                      <div className="row">
                        {w.status === 'SENT' && <button className="btn sm primary" onClick={() => { setReady(w); setRecv(''); }}>{t('workshop.markReady')}</button>}
                        {w.status === 'READY' && <button className="btn sm primary" onClick={() => setStatus(w.id, 'DELIVERED')}>{t('workshop.markDelivered')}</button>}
                        {w.status === 'READY' && wa && <a className="btn sm wa" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(t('workshop.waReady', { d: w.description }))}`}>WhatsApp</a>}
                        {(w.status === 'SENT' || w.status === 'READY') && <button className="btn sm" onClick={() => { setForm({ ...w, dueDate: w.dueDate || '', customerName: w.customerName || '', customerPhone: w.customerPhone || '', artisanPhone: w.artisanPhone || '', note: w.note || '' }); setErr(null); }}>{t('edit')}</button>}
                        {w.status === 'SENT' && <button className="btn sm danger" onClick={() => window.confirm(t('confirm')) && setStatus(w.id, 'CANCELLED')}>{t('cancel')}</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data?.length === 0 && <tr><td colSpan="9" className="muted">{t('workshop.none')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal title={form.id ? t('workshop.edit') : t('workshop.new')} onClose={() => setForm(null)}>
          <form className="stack" onSubmit={save}>
            <Field label={t('workshop.order')}><input className="input" required maxLength={255} value={form.description} onChange={set('description')} /></Field>
            <div className="grid g2">
              <Field label={t('workshop.artisan')}><input className="input" required maxLength={120} value={form.artisanName} onChange={set('artisanName')} /></Field>
              <Field label={t('workshop.artisanPhone')}><input className="input" maxLength={30} value={form.artisanPhone} onChange={set('artisanPhone')} dir="ltr" /></Field>
              <Field label={t('customer')}><input className="input" maxLength={120} value={form.customerName} onChange={set('customerName')} /></Field>
              <Field label={t('phone')}><input className="input" maxLength={30} value={form.customerPhone} onChange={set('customerPhone')} dir="ltr" /></Field>
              <Field label={t('karat')}><select value={form.karat} onChange={set('karat')}>{KARATS.map((k) => <option key={k} value={k}>{k}K</option>)}</select></Field>
              <Field label={t('workshop.given')}><input className="input" type="number" min="0" step="0.001" value={form.givenWeightG} onChange={set('givenWeightG')} dir="ltr" /></Field>
              <Field label={t('workshop.labour')}><input className="input" type="number" min="0" step="0.01" value={form.labourCost} onChange={set('labourCost')} dir="ltr" /></Field>
              <Field label={t('workshop.price')}><input className="input" type="number" min="0" step="0.01" value={form.agreedPrice} onChange={set('agreedPrice')} dir="ltr" /></Field>
              <Field label={t('workshop.deposit')}><input className="input" type="number" min="0" step="0.01" value={form.depositAmount} onChange={set('depositAmount')} dir="ltr" /></Field>
              <Field label={t('workshop.due')}><input className="input" type="date" value={form.dueDate} onChange={set('dueDate')} dir="ltr" /></Field>
            </div>
            <Field label={t('note')}><textarea maxLength={500} value={form.note} onChange={set('note')} /></Field>
            <ErrorBox error={err} />
            <button className="btn primary">{t('save')}</button>
          </form>
        </Modal>
      )}

      {ready && (
        <Modal title={t('workshop.markReady')} onClose={() => setReady(null)}>
          <div className="stack">
            <p>{ready.description} — {t('workshop.given')}: <b className="num">{fmtWeight(ready.givenWeightG)} g</b></p>
            <Field label={t('workshop.received')} hint={t('workshop.lossHint')}><input className="input" type="number" min="0.001" step="0.001" value={recv} onChange={(e) => setRecv(e.target.value)} dir="ltr" autoFocus /></Field>
            {recv && <p>{t('workshop.loss')}: <b className="num">{fmtWeight(Number(ready.givenWeightG) - Number(recv))} g</b></p>}
            <ErrorBox error={err} />
            <button className="btn primary" disabled={!(Number(recv) > 0)} onClick={() => setStatus(ready.id, 'READY', Number(recv))}>{t('save')}</button>
          </div>
        </Modal>
      )}
      <span hidden><Money v={0} /></span>
    </>
  );
}
