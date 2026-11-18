import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useApi } from '../../hooks.js';
import { useI18n } from '../../i18n.jsx';
import { ErrorBox, Field, Loading, PageHead } from '../../components/ui.jsx';
import Markdown from '../../components/Markdown.jsx';

const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
const EMPTY = { slug: '', title: '', excerpt: '', content: '', category: '', coverAlt: '', metaTitle: '', metaDescription: '', keywords: '', readMinutes: 3, published: false };

export default function PostEditor() {
  const { t } = useI18n();
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = id === 'new';
  const { data, loading } = useApi(isNew ? '/public/plans' : `/admin/posts/${id}`);
  const [f, setF] = useState(EMPTY);
  const [cover, setCover] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('edit');

  useEffect(() => {
    if (!isNew && data) { setF({ ...EMPTY, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? EMPTY[k] ?? ''])) }); setCover(data.cover); setSlugTouched(true); }
  }, [data, isNew]);

  const set = (k, v) => { setOk(false); setF((p) => ({ ...p, [k]: v, ...(k === 'title' && !slugTouched ? { slug: slugify(v) } : {}) })); };
  const words = useMemo(() => (f.content.trim() ? f.content.trim().split(/\s+/).length : 0), [f.content]);
  const checks = [
    ['blogA.ck.title', (f.metaTitle || f.title).length >= 30 && (f.metaTitle || f.title).length <= 60],
    ['blogA.ck.desc', f.metaDescription.length >= 120 && f.metaDescription.length <= 160],
    ['blogA.ck.words', words >= 300],
    ['blogA.ck.h2', (f.content.match(/^##\s+/gm) || []).length >= 2],
    ['blogA.ck.cover', !!cover && f.coverAlt.trim().length > 0],
    ['blogA.ck.kw', f.keywords.trim().length > 0],
  ];
  const origin = typeof window !== 'undefined' ? window.location.host : '';

  if (!isNew && loading && !data) return <Loading />;

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null); setOk(false);
    try {
      const body = { ...f, readMinutes: Number(f.readMinutes) || Math.max(1, Math.round(words / 200)) };
      const saved = isNew ? await api('/admin/posts', { method: 'POST', body }) : await api(`/admin/posts/${id}`, { method: 'PUT', body });
      setOk(true);
      if (isNew) nav(`/admin/blog/${saved.id}`, { replace: true });
    } catch (x) { setErr(x); } finally { setBusy(false); }
  };
  const upload = async (file) => {
    if (!file || isNew) return;
    setErr(null);
    try { const fd = new FormData(); fd.append('file', file); const saved = await api(`/admin/posts/${id}/cover`, { method: 'POST', form: fd }); setCover(saved.cover); }
    catch (x) { setErr(x); }
  };
  const remove = async () => {
    if (!window.confirm(t('blogA.confirmDel'))) return;
    try { await api(`/admin/posts/${id}`, { method: 'DELETE' }); nav('/admin/blog', { replace: true }); } catch (x) { setErr(x); }
  };

  const serpTitle = f.metaTitle || f.title || '…';
  const serpDesc = f.metaDescription || f.excerpt || '';

  return (
    <>
      <PageHead title={isNew ? t('blogA.new') : t('blogA.edit')}>
        <Link className="btn" to="/admin/blog">←</Link>
        {!isNew && f.published && <Link className="btn" target="_blank" to={`/blog/${f.slug}`}>{t('blogA.view')}</Link>}
      </PageHead>
      <form className="editor" onSubmit={save}>
        <div className="stack">
          <div className="card stack">
            <Field label={t('blogA.t')}><input className="input" required maxLength={160} value={f.title} onChange={(e) => set('title', e.target.value)} dir="auto" /></Field>
            <div className="grid g2">
              <Field label={t('blogA.slug')} hint={t('blogA.slugHint')}><input className="input" required pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={120} value={f.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} dir="ltr" /></Field>
              <Field label={t('blogA.category')}><input className="input" maxLength={60} value={f.category} onChange={(e) => set('category', e.target.value)} dir="auto" /></Field>
            </div>
            <Field label={t('blogA.excerpt')} hint={`${f.excerpt.length}/300`}><textarea maxLength={300} rows={2} value={f.excerpt} onChange={(e) => set('excerpt', e.target.value)} dir="auto" /></Field>
            <div className="row spread">
              <b>{t('blogA.content')}</b>
              <div className="row" style={{ gap: 6 }}>
                <span className="hint">{t('blogA.words', { n: words })}</span>
                <button type="button" className={'btn sm' + (tab === 'edit' ? ' primary' : '')} onClick={() => setTab('edit')}>✎</button>
                <button type="button" className={'btn sm' + (tab === 'preview' ? ' primary' : '')} onClick={() => setTab('preview')}>{t('plans.preview')}</button>
              </div>
            </div>
            {tab === 'edit'
              ? <textarea required rows={22} maxLength={60000} value={f.content} onChange={(e) => set('content', e.target.value)} dir="auto" style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 14 }} />
              : <div className="b-article"><div className="body" dir="auto" style={{ maxWidth: 'none' }}><Markdown source={f.content} /></div></div>}
            <span className="hint">{t('blogA.mdHelp')}</span>
          </div>
        </div>

        <div className="stack">
          <div className="card stack">
            <label className="row"><input type="checkbox" checked={f.published} onChange={(e) => set('published', e.target.checked)} /> <b>{t('blogA.publish')}</b></label>
            <Field label={t('blogA.minutes')}><input className="input" type="number" min="1" max="60" value={f.readMinutes} onChange={(e) => set('readMinutes', e.target.value)} dir="ltr" /></Field>
            <ErrorBox error={err} />
            {ok && <div className="okbox">{t('saved')}</div>}
            <button className="btn primary" disabled={busy}>{busy ? t('loading') : t('save')}</button>
            {!isNew && <button type="button" className="btn danger" onClick={remove}>{t('blogA.delete')}</button>}
          </div>

          <div className="card stack">
            <h2>{t('blogA.cover')}</h2>
            {isNew ? <p className="hint">{t('blogA.coverSave')}</p> : (
              <>
                {cover && <img src={`/api/public/blog-cover/${cover}`} alt="" style={{ width: '100%', borderRadius: 12 }} />}
                <input type="file" accept="image/jpeg,image/png" onChange={(e) => upload(e.target.files?.[0])} />
              </>
            )}
            <Field label={t('blogA.coverAlt')}><input className="input" maxLength={160} value={f.coverAlt} onChange={(e) => set('coverAlt', e.target.value)} dir="auto" /></Field>
          </div>

          <div className="card stack">
            <h2>{t('blogA.seo')}</h2>
            <Field label={t('blogA.metaTitle')} hint={`${(f.metaTitle || '').length}/70`}><input className="input" maxLength={70} value={f.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} dir="auto" /></Field>
            <Field label={t('blogA.metaDesc')} hint={`${f.metaDescription.length}/170`}><textarea rows={3} maxLength={170} value={f.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} dir="auto" /></Field>
            <Field label={t('blogA.keywords')}><input className="input" maxLength={200} value={f.keywords} onChange={(e) => set('keywords', e.target.value)} dir="auto" /></Field>
            <div className="serp" dir="ltr">
              <span className="muted" style={{ fontSize: 12 }}>{t('blogA.serp')}</span>
              <div className="u">{origin} › blog › {f.slug || '…'}</div>
              <div className="t">{serpTitle.slice(0, 60)}</div>
              <div className="d">{serpDesc.slice(0, 160)}</div>
            </div>
            <ul className="checks"><li className="muted"><b>{t('blogA.checks')}</b></li>{checks.map(([k, good]) => <li key={k} className={good ? 'good' : ''}><span>{good ? '✓' : '○'}</span> {t(k)}</li>)}</ul>
          </div>
        </div>
      </form>
    </>
  );
}
