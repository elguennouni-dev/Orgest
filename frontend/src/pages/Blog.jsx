import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n.jsx';
import { useApi, useSeo } from '../hooks.js';
import { SiteFooter, SiteHeader } from '../components/Site.jsx';
import { Icon, P } from '../components/icons.jsx';
import Louiz from '../components/Louiz.jsx';
import { waLink } from '../config.js';
import { assignPhotos, heroPhotos, photoFor } from '../lib/blogPhoto.js';

function Thumb({ a, map, small = true }) {
  const ph = photoFor(a, small, map);
  return (
    <div className="b-thumb">
      <img src={ph.src} alt={ph.alt} loading="lazy" decoding="async" width="640" height="384" />
    </div>
  );
}

const COPY = {
  fr: {
    seoTitle: 'Blog Orgest — Conseils pour bijoutiers : or, stock, à tempérament',
    seoDesc: 'Guides courts et concrets pour les bijoutiers : cours de l’or, reprise d’or ancien, ventes à tempérament, inventaire et gestion de boutique.',
    eyebrow: 'Le blog d\'Orgest', h1: 'Conseils et méthodes pour les bijoutiers qui comptent au gramme près.',
    lead: 'Cours de l\'or, reprise d\'or ancien, ventes à tempérament, atelier, inventaire : des guides courts et concrets, écrits pour le comptoir.',
    search: 'Rechercher : reprise, carat, inventaire…', searchLabel: 'Rechercher un article', all: 'Tous', filter: 'Filtrer par rubrique', featured: 'À LA UNE', read: 'min de lecture',
    allPosts: 'Tous les articles', count: (n) => `${n} article${n > 1 ? 's' : ''}`, by: 'Équipe Orgest', empty0: 'Les premiers articles arrivent bientôt.', empty1: 'Aucun article pour cette recherche.',
    ctaH: 'Moins de calculs, plus de ventes', ctaP: 'Orgest gère le stock au gramme, la reprise d\'or, les ventes à tempérament et les reçus. Demandez une démonstration avec vos propres articles.',
    demo: 'Demander une démo sur WhatsApp', demoMsg: 'Bonjour, je voudrais une démonstration d’Orgest.', pricing: 'Voir les tarifs',
    topicH: 'Un sujet à nous proposer ?', topicP: 'Les meilleures questions du comptoir deviennent des guides. Écrivez-nous sur WhatsApp.', topicBtn: 'Proposer un sujet', topicMsg: 'Bonjour, je voudrais proposer un sujet pour le blog Orgest.',
    photos: 'Photos', licence: '(licence libre)', other: 'العربية', otherLabel: 'Lire le blog en arabe',
  },
  ar: {
    seoTitle: 'مدونة Orgest — نصائح لأصحاب محلات الذهب: الذهب، السلعة، التقسيط',
    seoDesc: 'أدلة قصيرة وعملية لأصحاب محلات المجوهرات: ثمن الذهب، شراء الذهب القديم، البيع بالتقسيط، الجرد وتدبير المحل.',
    eyebrow: 'مدونة Orgest', h1: 'نصائح وطرق لأصحاب محلات الذهب لي كيحسبو بالغرام.',
    lead: 'ثمن الذهب، شراء الذهب القديم، البيع بالتقسيط، الورشة، الجرد: أدلة قصيرة وعملية، مكتوبة لي كيخدم فالمحل.',
    search: 'قلّب: ذهب قديم، عيار، جرد…', searchLabel: 'قلّب على مقال', all: 'الكل', filter: 'تصفية حسب الصنف', featured: 'مقال مميز', read: 'د للقراءة',
    allPosts: 'جميع المقالات', count: (n) => `${n} ${n > 10 ? 'مقالاً' : n === 1 ? 'مقال' : n === 2 ? 'مقالان' : 'مقالات'}`, by: 'فريق Orgest', empty0: 'أولى المقالات جايين قريب.', empty1: 'ما كاين حتى مقال لهاد البحث.',
    ctaH: 'حسابات أقل، مبيعات أكثر', ctaP: 'Orgest كيدبّر السلعة بالغرام، شراء الذهب القديم، البيع بالتقسيط والوصولات. طلب عرض تجريبي بسلعتك نتا.',
    demo: 'اطلب عرضاً تجريبياً عبر واتساب', demoMsg: 'السلام عليكم، بغيت عرض تجريبي ديال Orgest.', pricing: 'شوف الأثمنة',
    topicH: 'عندك موضوع تقترحو علينا؟', topicP: 'أحسن الأسئلة ديال المحل كيولّيو أدلة. كتب لينا على واتساب.', topicBtn: 'اقترح موضوع', topicMsg: 'السلام عليكم، بغيت نقترح موضوع لمدونة Orgest.',
    photos: 'الصور', licence: '(رخصة حرة)', other: 'Français', otherLabel: 'قراءة المدونة بالفرنسية',
  },
};

/** /blog : renvoie vers la page du blog dans la langue du site (français ou arabe, jamais mélangées). */
export function BlogIndex() {
  const { lang } = useI18n();
  return <Navigate to={`/blog/${lang === 'fr' ? 'fr' : 'ar'}`} replace />;
}

export default function Blog({ lang: L = 'fr' }) {
  const c = COPY[L];
  const rtl = L === 'ar';
  const nav = useNavigate();
  const { lang: siteLang, setLang } = useI18n();
  const prev = useRef(null);
  // Le sélecteur de langue du site change aussi de page de blog ; à l'arrivée, le site prend la langue de la page.
  useEffect(() => {
    if (prev.current === null) { prev.current = siteLang; if (siteLang !== L) setLang(L); return; }
    if (prev.current !== siteLang) { prev.current = siteLang; if (siteLang !== L) nav(`/blog/${siteLang}`, { replace: true }); }
  }, [siteLang, L, nav, setLang]);
  useSeo({ title: c.seoTitle, description: c.seoDesc });
  const { data, loading } = useApi('/public/posts');
  const allPosts = data || [];
  const posts = useMemo(() => allPosts.filter((p) => (p.lang || 'fr') === L), [allPosts, L]);
  const photoMap = useMemo(() => assignPhotos(allPosts), [allPosts]);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const cats = useMemo(() => [...new Set(posts.map((p) => p.category).filter(Boolean))], [posts]);
  const shown = useMemo(() => posts.filter((a) => (cat === 'all' || a.category === cat) && (!q.trim() || ((a.title || '') + ' ' + (a.excerpt || '')).toLowerCase().includes(q.trim().toLowerCase()))), [posts, cat, q]);
  const [lead, ...rest] = shown;
  const wa = waLink(c.topicMsg);

  return (
    <div className="site blog" lang={L} dir={rtl ? 'rtl' : 'ltr'}>
      <SiteHeader />
      <section className="b-hero">
        <div className="in">
          <div className="stack" style={{ gap: 18 }}>
            <span className="eyebrow" style={{ color: 'var(--gold-300)' }}>{c.eyebrow}</span>
            <h1>{c.h1}</h1>
            <p>{c.lead}</p>
            <label className="b-search">
              <Icon d={P.search} />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.search} aria-label={c.searchLabel} />
            </label>
            <Link className="b-other" to={`/blog/${L === 'fr' ? 'ar' : 'fr'}`} hrefLang={L === 'fr' ? 'ar' : 'fr'} lang={L === 'fr' ? 'ar' : 'fr'} aria-label={c.otherLabel}>{c.other} →</Link>
          </div>
          <div className="b-hero-l" aria-hidden="true">
            {heroPhotos().map((ph, i) => <img key={ph.src} className={'bh-ph p' + (i + 1)} src={ph.src} alt="" width="1200" height="720" decoding="async" fetchPriority={i === 0 ? 'high' : 'low'} />)}
          </div>
        </div>
      </section>

      <main className="b-main">
        {cats.length > 1 && (
          <div className="chips" role="group" aria-label={c.filter}>
            {['all', ...cats].map((k) => (
              <button key={k} type="button" className={'chip' + (cat === k ? ' on' : '')} aria-pressed={cat === k} onClick={() => setCat(k)}>
                {k === 'all' ? c.all : k} <span style={{ opacity: .6 }}>{k === 'all' ? posts.length : posts.filter((a) => a.category === k).length}</span>
              </button>
            ))}
          </div>
        )}

        {lead && (
          <section className="b-feature" aria-label={c.featured}>
            <Link to={`/blog/${lead.slug}`} className="bf-main">
              <div className="vis"><Thumb a={lead} map={photoMap} small={false} /></div>
              <div className="txt">
                <div><span className="b-tag">{c.featured}{lead.category ? ` · ${lead.category}` : ''}</span> · {lead.readMinutes} {c.read}</div>
                <h2>{lead.title}</h2>
                <p>{lead.excerpt}</p>
              </div>
            </Link>
          </section>
        )}

        <section aria-label={c.allPosts}>
          {rest.length > 0 && <div className="row spread"><h2 className="b-h2">{c.allPosts}</h2><span className="muted" aria-live="polite">{c.count(shown.length)}</span></div>}
          <div className="b-grid" style={{ marginTop: 16 }}>
            {rest.map((a) => (
              <article className="b-card" key={a.slug}>
                <Link to={`/blog/${a.slug}`} aria-label={a.title}><Thumb a={a} map={photoMap} /></Link>
                <div className="txt"><span className="b-tag">{a.category}</span><strong><Link to={`/blog/${a.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{a.title}</Link></strong><p>{a.excerpt}</p><span className="muted">{a.readMinutes} {c.read} · {c.by}</span></div>
              </article>
            ))}
          </div>
          {!loading && shown.length === 0 && <div className="empty-louiz"><Louiz mood="thinking" size={110} /><p>{posts.length === 0 ? c.empty0 : c.empty1}</p></div>}
        </section>

        <p className="b-credit muted">{c.photos} : <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer">Unsplash</a> {c.licence}, Syed F Hashemi, Luisana Galicia, LUM3N, Sama Hosseini, Fallon Michael, Yasamine June.</p>

        <section className="post-cta" aria-label="Orgest">
          <h2>{c.ctaH}</h2>
          <p>{c.ctaP}</p>
          <div className="row" style={{ gap: 10 }}>
            <a className="btn primary" href={waLink(c.demoMsg)} target="_blank" rel="noopener noreferrer">{c.demo}</a>
            <a className="btn" href="/#pricing">{c.pricing}</a>
          </div>
        </section>

        <section className="b-news" aria-label={c.topicH}>
          <Louiz mood="happy" size={120} />
          <div className="stack" style={{ gap: 10 }}>
            <h2>{c.topicH}</h2>
            <p className="muted" style={{ margin: 0 }}>{c.topicP}</p>
            <a className="btn" style={{ alignSelf: 'flex-start' }} href={wa} target="_blank" rel="noopener noreferrer">{c.topicBtn}</a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
