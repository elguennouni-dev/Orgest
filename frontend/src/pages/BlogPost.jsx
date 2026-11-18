import { Link, useParams } from 'react-router-dom';
import { useApi, useSeo } from '../hooks.js';
import { fmtDate } from '../i18n.jsx';
import { SiteFooter, SiteHeader } from '../components/Site.jsx';
import Louiz from '../components/Louiz.jsx';
import Markdown from '../components/Markdown.jsx';
import { waLink } from '../config.js';

export default function BlogPost() {
  const { slug } = useParams();
  const { data: p, error, loading } = useApi(`/public/posts/${encodeURIComponent(slug)}`);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const img = p?.cover ? `/api/public/blog-cover/${p.cover}` : null;
  useSeo(p ? {
    title: p.metaTitle || p.title,
    description: p.metaDescription || p.excerpt || undefined,
    keywords: p.keywords || undefined,
    image: img,
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'Article', headline: p.title, description: p.metaDescription || p.excerpt || undefined,
      image: img ? origin + img : undefined, datePublished: p.publishedAt, dateModified: p.updatedAt,
      author: { '@type': 'Organization', name: 'Équipe Orgest' }, publisher: { '@type': 'Organization', name: 'Orgest' },
      mainEntityOfPage: `${origin}/blog/${p.slug}`,
    },
  } : { title: 'Blog — Orgest' });

  return (
    <div className="site blog">
      <SiteHeader />
      <main className="b-main" style={{ minHeight: '60vh' }}>
        {loading && !p ? <div className="empty-louiz"><Louiz mood="thinking" size={110} /></div>
          : error ? (
            <div className="empty-louiz"><Louiz mood="worried" size={120} /><h2>404</h2><Link className="btn primary" to="/blog">← Blog</Link></div>
          ) : (
            <article className="b-article" style={{ gridTemplateColumns: 'minmax(0, 1fr)', justifyItems: 'center' }}>
              <div className="body" style={{ width: '100%' }}>
                <nav aria-label="Fil d’Ariane" style={{ fontSize: 14 }}><Link to="/blog">Blog</Link>{p.category ? ` › ${p.category}` : ''}</nav>
                <span className="b-tag">{p.category} · {p.readMinutes} min</span>
                <h1 dir="auto" style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, lineHeight: 1.15 }}>{p.title}</h1>
                <div className="by"><Louiz mood="happy" size={44} /><span><strong>Équipe Orgest</strong><br /><span className="muted">{fmtDate(p.publishedAt || p.updatedAt)}</span></span></div>
                {img && <img className="cover" src={img} alt={p.coverAlt || p.title} />}
                <div dir="auto" className="stack" style={{ gap: 14 }}><Markdown source={p.content} /></div>
                <div className="tip"><Louiz mood="wave" size={80} /><p>Une question ? <a href={waLink(`Bonjour, une question sur « ${p.title} »`)} target="_blank" rel="noopener noreferrer">Écrivez-nous sur WhatsApp</a>.</p></div>
              </div>
            </article>
          )}
      </main>
      <SiteFooter />
    </div>
  );
}
