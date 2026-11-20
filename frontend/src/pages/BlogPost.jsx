import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useApi, useSeo } from '../hooks.js';
import { fmtDate } from '../i18n.jsx';
import { SiteFooter, SiteHeader } from '../components/Site.jsx';
import Louiz from '../components/Louiz.jsx';
import Markdown, { headings } from '../components/Markdown.jsx';
import { waLink } from '../config.js';

const COPY = {
  fr: {
    blog: 'Blog', toc: 'Sommaire', by: 'Équipe Orgest', about: 'Orgest est un logiciel de gestion pour bijouteries au Maroc. L’équipe rédige ces guides à partir des questions du comptoir : poids, carats, reprise d’or, ventes à tempérament.',
    disclaimer: 'Ce guide est informatif : les prix et pourcentages cités sont des exemples et ne remplacent ni votre prix du jour, ni l’avis d’un comptable ou d’un juriste.',
    ctaH: 'Gérez votre bijouterie sans calculatrice', ctaP: 'Stock au gramme, prix du jour, reprise d’or, ventes à tempérament et reçus : Orgest fait les calculs pour vous.',
    demo: 'Demander une démo sur WhatsApp', pricing: 'Voir les tarifs', related: 'À lire aussi', min: 'min', msg: (t) => `Bonjour, j’ai lu « ${t} » et je voudrais une démonstration d’Orgest.`, q: (t) => `Bonjour, une question sur « ${t} »`, ask: 'Une question ?', write: 'Écrivez-nous sur WhatsApp',
  },
  ar: {
    blog: 'المدونة', toc: 'فهرس المقال', by: 'فريق Orgest', about: 'Orgest برنامج لتدبير محلات الذهب والمجوهرات بالمغرب. يكتب الفريق هذه الأدلة انطلاقاً من أسئلة الكونطوار: الوزن، العيار، استرجاع الذهب القديم والبيع بالتقسيط.',
    disclaimer: 'هذا الدليل للإخبار والتوضيح فقط: الأثمنة والنسب المذكورة أمثلة ولا تغني عن ثمن اليوم المعتمد عندك ولا عن استشارة محاسب أو مستشار قانوني.',
    ctaH: 'دبّر محل الذهب ديالك بلا آلة حاسبة', ctaP: 'الستوك بالغرام، ثمن اليوم، استرجاع الذهب القديم، التقسيط والوصولات: Orgest كيدير ليك الحساب.',
    demo: 'اطلب عرضاً تجريبياً عبر واتساب', pricing: 'شوف الأثمنة', related: 'اقرأ أيضاً', min: 'د', msg: (t) => `السلام عليكم، قريت مقال «${t}» وبغيت عرض تجريبي ديال Orgest.`, q: (t) => `السلام عليكم، عندي سؤال على مقال «${t}»`, ask: 'عندك سؤال؟', write: 'كتب لينا على واتساب',
  },
};

export default function BlogPost() {
  const { slug } = useParams();
  const { data: p, error, loading } = useApi(`/public/posts/${encodeURIComponent(slug)}`);
  const { data: all } = useApi('/public/posts');
  const related = useMemo(() => (all || []).filter((x) => x.slug !== slug).sort((a, b) => ((b.lang === p?.lang) * 2 + (b.category === p?.category)) - ((a.lang === p?.lang) * 2 + (a.category === p?.category))).slice(0, 3), [all, slug, p?.category]);
  const L = p?.lang === 'ar' ? 'ar' : 'fr';
  const c = COPY[L];
  const toc = useMemo(() => (p ? headings(p.content) : []), [p]);
  const img = p?.cover ? `/api/public/blog-cover/${p.cover}` : null;
  useSeo(p ? {
    title: p.metaTitle || p.title,
    description: p.metaDescription || p.excerpt || undefined,
    keywords: p.keywords || undefined,
    image: img,
    type: 'article',
  } : { title: 'Blog — Orgest' });

  return (
    <div className="site blog">
      <SiteHeader />
      <main className="b-main" style={{ minHeight: '60vh' }}>
        {loading && !p ? <div className="empty-louiz"><Louiz mood="thinking" size={110} /></div>
          : error ? (
            <div className="empty-louiz"><Louiz mood="worried" size={120} /><h2>404</h2><Link className="btn primary" to="/blog">← Blog</Link></div>
          ) : (
            <article className="b-article" lang={L} dir={L === 'ar' ? 'rtl' : 'ltr'} style={{ gridTemplateColumns: 'minmax(0, 1fr)', justifyItems: 'center' }}>
              <div className="body" style={{ width: '100%' }}>
                <nav aria-label="Breadcrumb" style={{ fontSize: 14 }}><Link to="/blog">{c.blog}</Link>{p.category ? ` › ${p.category}` : ''}</nav>
                <span className="b-tag">{p.category} · {p.readMinutes} {c.min}</span>
                <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, lineHeight: 1.25 }}>{p.title}</h1>
                <div className="by"><Louiz mood="happy" size={44} /><span><strong>{c.by}</strong><br /><span className="muted">{fmtDate(p.publishedAt || p.updatedAt)}</span></span></div>
                {img && <img className="cover" src={img} alt={p.coverAlt || p.title} />}
                {toc.length >= 3 && (
                  <nav className="toc" aria-label={c.toc}>
                    <strong>{c.toc}</strong>
                    <ol>{toc.map((h) => <li key={h.id}><a href={`#${h.id}`}>{h.text.replace(/^[0-9٠-٩]+[.)]\s*/, '')}</a></li>)}</ol>
                  </nav>
                )}
                <div className="stack" style={{ gap: 14 }}><Markdown source={p.content} /></div>
                <p className="disclaimer">{c.disclaimer}</p>
                <div className="post-cta">
                  <h2>{c.ctaH}</h2>
                  <p>{c.ctaP}</p>
                  <div className="row" style={{ gap: 10 }}>
                    <a className="btn primary" href={waLink(c.msg(p.title))} target="_blank" rel="noopener noreferrer">{c.demo}</a>
                    <a className="btn" href="/#pricing">{c.pricing}</a>
                  </div>
                </div>
                <aside className="author" aria-label="Auteur">
                  <Louiz mood="proud" size={64} />
                  <div><strong>{c.by}</strong><p>{c.about}</p></div>
                </aside>
                {related.length > 0 && (
                  <nav className="related" aria-label={c.related}>
                    <h2>{c.related}</h2>
                    <ul>{related.map((r) => <li key={r.slug}><Link to={`/blog/${r.slug}`} lang={r.lang === 'ar' ? 'ar' : 'fr'}>{r.title}</Link></li>)}</ul>
                  </nav>
                )}
                <div className="tip"><Louiz mood="wave" size={80} /><p>{c.ask} <a href={waLink(c.q(p.title))} target="_blank" rel="noopener noreferrer">{c.write}</a>.</p></div>
              </div>
            </article>
          )}
      </main>
      <SiteFooter />
    </div>
  );
}
