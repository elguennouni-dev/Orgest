import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi, useSeo } from '../hooks.js';
import { SiteFooter, SiteHeader } from '../components/Site.jsx';
import { Icon, P } from '../components/icons.jsx';
import Louiz from '../components/Louiz.jsx';
import { waLink } from '../config.js';

function Thumb({ a, size = 128 }) {
  return (
    <div className="b-thumb" style={{ background: '#FFF4D6', color: '#8A6209' }}>
      {a.cover ? <img src={`/api/public/blog-cover/${a.cover}`} alt={a.coverAlt || a.title} loading="lazy" /> : <Louiz mood="happy" size={size} />}
    </div>
  );
}

export default function Blog() {
  useSeo({ title: 'Blog Orgest — Conseils pour bijoutiers : or, stock, à tempérament', description: 'Guides courts et concrets pour les bijoutiers : cours de l’or, reprise d’or ancien, ventes à tempérament, inventaire et gestion de boutique.' });
  const { data, loading } = useApi('/public/posts');
  const posts = data || [];
  const byLang = useMemo(() => posts.filter((p) => lang === 'all' || p.lang === lang), [posts, lang]);
  const cats = useMemo(() => ['Tous', ...new Set(byLang.map((p) => p.category).filter(Boolean))], [byLang]);
  const [cat, setCat] = useState('Tous');
  const [lang, setLang] = useState('all');
  const [q, setQ] = useState('');
  const shown = useMemo(() => byLang.filter((a) => (cat === 'Tous' || a.category === cat) && (!q.trim() || ((a.title || '') + ' ' + (a.excerpt || '')).toLowerCase().includes(q.trim().toLowerCase()))), [byLang, cat, q]);
  const [lead, ...rest] = shown;
  const wa = waLink('Bonjour, je voudrais proposer un sujet pour le blog Orgest.');

  return (
    <div className="site blog" lang="fr" dir="ltr">
      <SiteHeader />
      <section className="b-hero">
        <div className="in">
          <div className="stack" style={{ gap: 18 }}>
            <span className="eyebrow" style={{ color: 'var(--gold-700)' }}>Le blog d'Orgest</span>
            <h1>Conseils et méthodes pour les bijoutiers qui comptent au gramme près.</h1>
            <p>Cours de l'or, reprise d'or ancien, ventes à tempérament, atelier, inventaire : des guides courts et concrets, écrits pour le comptoir.</p>
            <label className="b-search">
              <Icon d={P.search} />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher : reprise, carat, inventaire…" aria-label="Rechercher un article" />
            </label>
          </div>
          <div className="b-hero-l"><Louiz mood="wave" size={240} /></div>
        </div>
      </section>

      <main className="b-main">
        {posts.some((p) => p.lang === 'ar') && (
          <div className="chips" role="group" aria-label="Langue">
            {[['all', 'Tous · الكل'], ['fr', 'Français'], ['ar', 'العربية']].map(([k, label]) => (
              <button key={k} type="button" className={'chip' + (lang === k ? ' on' : '')} aria-pressed={lang === k} onClick={() => { setLang(k); setCat('Tous'); }}>{label}</button>
            ))}
          </div>
        )}
        {cats.length > 2 && (
          <div className="chips" role="group" aria-label="Filtrer par rubrique">
            {cats.map((c) => (
              <button key={c} type="button" className={'chip' + (cat === c ? ' on' : '')} aria-pressed={cat === c} onClick={() => setCat(c)}>
                {c} <span style={{ opacity: .6 }}>{c === 'Tous' ? byLang.length : byLang.filter((a) => a.category === c).length}</span>
              </button>
            ))}
          </div>
        )}

        {lead && (
          <section className="b-feature" aria-label="À la une">
            <Link to={`/blog/${lead.slug}`} className="bf-main">
              <div className="vis"><Thumb a={lead} size={200} /></div>
              <div className="txt">
                <div><span className="b-tag">À LA UNE{lead.category ? ` · ${lead.category}` : ''}</span> · {lead.readMinutes} min de lecture</div>
                <h2 dir="auto" lang={lead.lang}>{lead.title}</h2>
                <p dir="auto">{lead.excerpt}</p>
              </div>
            </Link>
          </section>
        )}

        <section aria-label="Tous les articles">
          {rest.length > 0 && <div className="row spread"><h2 className="b-h2">Tous les articles</h2><span className="muted" aria-live="polite">{shown.length} article{shown.length > 1 ? 's' : ''}</span></div>}
          <div className="b-grid" style={{ marginTop: 16 }}>
            {rest.map((a) => (
              <article className="b-card" key={a.slug}>
                <Link to={`/blog/${a.slug}`} aria-label={a.title}><Thumb a={a} /></Link>
                <div className="txt"><span className="b-tag">{a.category}</span><strong dir="auto"><Link to={`/blog/${a.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{a.title}</Link></strong><p dir="auto">{a.excerpt}</p><span className="muted">{a.readMinutes} min de lecture · Équipe Orgest</span></div>
              </article>
            ))}
          </div>
          {!loading && shown.length === 0 && <div className="empty-louiz"><Louiz mood="thinking" size={110} /><p>{posts.length === 0 ? 'Les premiers articles arrivent bientôt.' : 'Aucun article pour cette recherche.'}</p></div>}
        </section>

        <section className="post-cta" aria-label="Essayer Orgest">
          <h2>Moins de calculs, plus de ventes</h2>
          <p>Orgest gère le stock au gramme, la reprise d'or, les ventes à tempérament et les reçus. Demandez une démonstration avec vos propres articles.</p>
          <div className="row" style={{ gap: 10 }}>
            <a className="btn primary" href={waLink('Bonjour, je voudrais une démonstration d’Orgest.')} target="_blank" rel="noopener noreferrer">Demander une démo sur WhatsApp</a>
            <a className="btn" href="/#pricing">Voir les tarifs</a>
          </div>
        </section>

        <section className="b-news" aria-label="Proposer un sujet">
          <Louiz mood="happy" size={120} />
          <div className="stack" style={{ gap: 10 }}>
            <h2>Un sujet à nous proposer ?</h2>
            <p className="muted" style={{ margin: 0 }}>Les meilleures questions du comptoir deviennent des guides. Écrivez-nous sur WhatsApp.</p>
            <a className="btn" style={{ alignSelf: 'flex-start' }} href={wa} target="_blank" rel="noopener noreferrer">Proposer un sujet</a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
