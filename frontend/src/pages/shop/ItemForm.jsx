import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useI18n } from '../../i18n.jsx';
import { CATEGORIES, ErrorBox, Field, KARATS, PageHead } from '../../components/ui.jsx';
import PhotoCapture from '../../components/PhotoCapture.jsx';

export default function ItemForm() {
  const { t } = useI18n();
  const { id } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', category: 'ring', karat: 18, weightG: '', makingPerGram: '65', note: '' });
  const [photo, setPhoto] = useState(null);
  const [existing, setExisting] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (!id) return;
    api(`/shop/items/${id}`).then((i) => {
      setF({ name: i.name, category: i.category, karat: i.karat, weightG: i.weightG, makingPerGram: i.makingPerGram, note: i.note || '' });
      if (i.hasPhoto) setExisting(`/api/shop/items/${i.id}/photo`);
    }).catch(setError);
  }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const body = { name: f.name, category: f.category, karat: Number(f.karat), weightG: Number(f.weightG), makingPerGram: Number(f.makingPerGram || 0), note: f.note || null };
      const item = id ? await api(`/shop/items/${id}`, { method: 'PUT', body }) : await api('/shop/items', { method: 'POST', body });
      if (photo) {
        const form = new FormData();
        form.append('file', photo, 'photo.jpg');
        await api(`/shop/items/${item.id}/photo`, { method: 'POST', form });
      }
      nav('/app/stock');
    } catch (err) { setError(err); setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(t('stock.confirmDelete'))) return;
    try { await api(`/shop/items/${id}`, { method: 'DELETE' }); nav('/app/stock'); } catch (err) { setError(err); }
  };

  return (
    <>
      <PageHead title={id ? t('stock.edit') : t('stock.add')} />
      <form className="grid g2" onSubmit={submit}>
        <div className="card"><h2>{t('stock.photo')}</h2><PhotoCapture onChange={setPhoto} existingUrl={existing} /></div>
        <div className="card stack">
          <Field label={t('stock.name')}><input className="input" value={f.name} onChange={set('name')} maxLength={120} required /></Field>
          <div className="grid g2">
            <Field label={t('stock.category')}>
              <select value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c} value={c}>{t('cat.' + c)}</option>)}</select>
            </Field>
            <Field label={t('karat')}>
              <select value={f.karat} onChange={set('karat')}>{KARATS.map((k) => <option key={k} value={k}>{k}K</option>)}</select>
            </Field>
            <Field label={t('weightG')}><input className="input" type="number" step="0.001" min="0.001" value={f.weightG} onChange={set('weightG')} required dir="ltr" /></Field>
            <Field label={t('stock.makingPerGram')}><input className="input" type="number" step="0.01" min="0" value={f.makingPerGram} onChange={set('makingPerGram')} required dir="ltr" /></Field>
          </div>
          <Field label={t('note')}><textarea value={f.note} onChange={set('note')} maxLength={500} /></Field>
          <ErrorBox error={error} />
          <div className="row">
            <button className="btn primary" disabled={busy}>{busy ? t('loading') : t('save')}</button>
            <button type="button" className="btn" onClick={() => nav('/app/stock')}>{t('cancel')}</button>
            {id && <button type="button" className="btn danger" onClick={remove}>{t('delete')}</button>}
          </div>
        </div>
      </form>
    </>
  );
}
