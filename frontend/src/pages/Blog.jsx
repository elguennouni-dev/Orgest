import { useMemo, useState } from 'react';
import { SiteFooter, SiteHeader } from '../components/Site.jsx';
import { Icon, P } from '../components/icons.jsx';
import Louiz from '../components/Louiz.jsx';
import { waLink } from '../config.js';

const I = {
  chart: P.chart, ingot: P.stock, cal: P.calendar, chat: 'M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20z', hammer: P.workshop,
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6', swap: P.exchange, sheet: 'M5 3h14v18H5zM5 9h14M5 15h14M11 3v18',
};
const T = { or: ['#FFF4D6', '#8A6209'], bleu: ['#E6EEF9', '#1E4F8F'], vert: ['#E7F4EC', '#1E5E3F'], violet: ['#F3E8F7', '#6B2F86'], rose: ['#FDECE3', '#9A3412'] };
const art = (cat, title, ex, min, look, mood, img) => ({ cat, title, ex, min, tint: T[look][0], ink: T[look][1], mood, img });

const ALL = [
  art('Cours de l’or', 'Pourquoi saisir le cours de l’or chaque matin ?', 'Trente secondes au réveil de la caisse évitent des erreurs toute la journée. Ce que le prix du jour calcule à votre place.', 4, 'or', 'thinking'),
  art('Cours de l’or', '18K, 21K, 24K : ce que chaque carat change pour votre prix', 'Titre, or pur, prix au gramme : comment passer d’un carat à l’autre sans calculatrice.', 6, 'bleu', null, 'carats'),
  art('Gestion de boutique', 'Inventaire au gramme : faire le point de stock en une heure', 'Une méthode vitrine par vitrine, et comment l’écart de poids vous signale un problème.', 7, 'vert', null, 'inventaire'),
  art('تقسيط et crédit', 'Vendre à tempérament sans risque : 6 règles simples', 'Acompte, durée, pièce d’identité, reçu signé : le minimum avant de laisser partir un bijou.', 6, 'rose', 'worried'),
  art('تقسيط et crédit', 'Rappeler une échéance sur WhatsApp sans gêner le client', 'Trois modèles de messages polis, le bon moment pour les envoyer et quoi faire après un retard.', 3, 'vert', null, 'whatsapp'),
  art('Atelier', 'Suivre l’or confié à l’artisan : poids remis, rendu, perte', 'Une fiche par commande pour savoir à tout moment combien de grammes sont dehors.', 5, 'violet', null, 'atelier'),
  art('Gestion de boutique', 'Bien lire son rapport mensuel Excel', 'Ventes, achats d’or, marge au gramme : les trois chiffres à regarder en premier.', 5, 'bleu', null, 'excel'),
  art('Caisse et ventes', 'Un reçu clair qui rassure le client', 'Ce qu’un bon reçu doit montrer : poids, carat, prix du jour, reprise et reste à payer.', 3, 'or', null, 'recu'),
  art('Caisse et ventes', 'Échange de bijoux : déduire l’ancien du nouveau sans erreur', 'Reprise et vente sur le même reçu : l’ordre des étapes qui évite les doubles comptes.', 5, 'bleu', null, 'echange'),
  art('Gestion de boutique', 'Préparer la haute saison des mariages', 'Stock, acomptes, commandes atelier : le calendrier à tenir six semaines avant.', 6, 'vert', 'celebrate'),
  art('Nouveautés Orgest', 'Nouveau : l’accueil guidé avec Louiz', 'Une visite d’une minute pour les nouveaux comptes, et des rappels quand le cours du jour manque.', 2, 'or', 'wave'),
  art('Nouveautés Orgest', 'Bientôt : Orgest entièrement en arabe', 'Interface de droite à gauche, reçus bilingues, et une langue gardée d’un écran à l’autre.', 2, 'violet', null, 'arabe'),
];
const CATS = ['Tous', 'Cours de l’or', 'Caisse et ventes', 'Gestion de boutique', 'تقسيط et crédit', 'Atelier', 'Nouveautés Orgest'];
const SERIES = [
  ['Ouvrir la caisse le matin', 'Cours du jour, fond de caisse, premier coup d’œil au tableau de bord.', 3],
  ['Mettre son stock dans Orgest', 'Carat, poids, catégorie : saisir vite sans rien oublier.', 6],
  ['Vente, échange, rachat', 'Les trois opérations du comptoir, pas à pas.', 5],
  ['Échéances et atelier', 'Suivre l’argent et l’or qui sont dehors.', 5],
  ['Clôturer le mois', 'Rapport Excel, écarts de stock, objectifs du mois suivant.', 4],
];
const FAQ = [
  ['Les articles sont-ils réservés aux clients Orgest ?', 'Non. Les guides sont libres pour tous les bijoutiers ; seules les rubriques « Nouveautés » parlent de l’application.'],
  ['Les prix cités dans les exemples sont-ils réels ?', 'Non. Les exemples utilisent des prix fictifs pour montrer le calcul. Utilisez toujours votre propre prix du jour.'],
  ['Puis-je imprimer un guide pour mon équipe ?', 'Oui : le bouton « Imprimer » de chaque article sort une version propre sur une ou deux pages.'],
  ['Les articles existent-ils en arabe ?', 'La version arabe arrive avec l’interface en arabe. Chaque guide aura sa traduction.'],
  ['Comment proposer un sujet ?', 'Envoyez-le sur WhatsApp : les meilleures questions du comptoir deviennent des guides.'],
];

function Thumb({ a, size = 128 }) {
  return (
    <div className="b-thumb" style={{ background: a.tint, color: a.ink }}>
      {a.mood ? <Louiz mood={a.mood} size={size} /> : <img src={`/assets/blog/${a.img}.jpg`} alt="" loading="lazy" />}
    </div>
  );
}

export default function Blog() {
  const [cat, setCat] = useState('Tous');
  const [q, setQ] = useState('');
  const [faq, setFaq] = useState(0);
  const shown = useMemo(() => ALL.filter((a) => (cat === 'Tous' || a.cat === cat) && (!q.trim() || (a.title + ' ' + a.ex).toLowerCase().includes(q.trim().toLowerCase()))), [cat, q]);
  const wa = waLink('Bonjour, je voudrais proposer un sujet pour le blog Orgest.');
  const copy = () => { try { navigator.clipboard.writeText(window.location.origin + '/blog#reprise'); } catch { /* ignore */ } };

  return (
    <div className="site blog" lang="fr" dir="ltr">
      <SiteHeader />
      <section className="b-hero">
        <div className="in">
          <div className="stack" style={{ gap: 18 }}>
            <span className="eyebrow" style={{ color: 'var(--gold-700)' }}>Le Journal d'Orgest</span>
            <h1>Conseils et méthodes pour les bijoutiers qui comptent au gramme près.</h1>
            <p>Cours de l'or, reprise, تقسيط, atelier, inventaire : des guides courts et concrets, écrits pour le comptoir — et les nouveautés de l'application.</p>
            <label className="b-search">
              <Icon d={P.search} />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher : reprise, carat, inventaire…" aria-label="Rechercher un article" />
            </label>
            <div className="muted" style={{ fontSize: 14 }}>Populaires : <a href="#reprise">reprise d'or</a> · <button type="button" className="lk" onClick={() => setQ('carat')}>prix par carat</button> · <button type="button" className="lk" onClick={() => setQ('تقسيط')}>تقسيط</button></div>
          </div>
          <div className="b-hero-l"><Louiz mood="wave" size={240} /></div>
        </div>
      </section>

      <main className="b-main">
        <section className="b-feature" aria-label="À la une">
          <a href="#reprise" className="bf-main">
            <div className="vis"><Louiz mood="thinking" size={200} /><div className="calc">12,0 g × 0,97 = <strong>11,64 g</strong><br />11,64 g × prix du jour</div></div>
            <div className="txt">
              <div><span className="b-tag">À LA UNE · Caisse et ventes</span> · 8 min de lecture</div>
              <h2>Reprise d'or ancien : calculer un prix juste en 4 étapes</h2>
              <p>Peser, identifier le carat, déduire la perte, appliquer le prix du jour. La méthode complète, un exemple chiffré et les erreurs qui coûtent cher.</p>
            </div>
          </a>
          <div className="bf-side">
            {[ALL[0], ALL[3]].map((a) => (
              <div className="mini" key={a.title}>
                <div className="b-thumb sm" style={{ background: a.tint }}><Louiz mood={a.mood} size={96} /></div>
                <div className="txt"><span className="b-tag" style={{ color: a.ink }}>{a.cat}</span><strong>{a.title}</strong><span className="muted">{a.min} min de lecture</span></div>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Tous les articles">
          <div className="row spread"><h2 className="b-h2">Tous les articles</h2><span className="muted" aria-live="polite">{shown.length} article{shown.length > 1 ? 's' : ''}</span></div>
          <div className="chips" role="group" aria-label="Filtrer par rubrique" style={{ margin: '14px 0 20px' }}>
            {CATS.map((c) => (
              <button key={c} type="button" className={'chip' + (cat === c ? ' on' : '')} aria-pressed={cat === c} onClick={() => setCat(c)}>
                {c} <span style={{ opacity: .6 }}>{c === 'Tous' ? ALL.length : ALL.filter((a) => a.cat === c).length}</span>
              </button>
            ))}
          </div>
          <div className="b-grid">
            {shown.map((a) => (
              <article className="b-card" key={a.title}>
                <Thumb a={a} />
                <div className="txt"><span className="b-tag" style={{ color: a.ink }}>{a.cat}</span><strong>{a.title}</strong><p>{a.ex}</p><span className="muted">{a.min} min de lecture · Équipe Orgest</span></div>
              </article>
            ))}
          </div>
          {shown.length === 0 && <div className="empty-louiz"><Louiz mood="thinking" size={110} /><p>Aucun article pour cette recherche.</p></div>}
        </section>

        <section className="b-series" aria-label="Série Bien démarrer">
          <div className="l">
            <span className="eyebrow">Série · 5 chapitres</span>
            <h2>Bien démarrer avec Orgest</h2>
            <p>De la première connexion à la première clôture de mois. Une lecture par jour, cinq jours, et votre boutique tourne.</p>
            <Louiz mood="proud" size={120} />
          </div>
          <ol>
            {SERIES.map(([t, d, m], i) => (
              <li key={t}><span className="n">{i + 1}</span><span className="g"><strong>{t}</strong><span>{d}</span></span><span className="m">{m} min</span></li>
            ))}
          </ol>
        </section>

        <article id="reprise" className="b-article">
          <aside aria-label="Sommaire">
            <span className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2 }}>Sommaire</span>
            <nav>
              <a href="#r1">1. Peser</a><a href="#r2">2. Identifier le carat</a><a href="#r3">3. Déduire la perte</a><a href="#r4">4. Appliquer le prix du jour</a><a href="#r5">Les erreurs qui coûtent cher</a><a href="#r6">Dans Orgest</a>
            </nav>
            <div className="row no-print" style={{ gap: 8 }}>
              <a className="btn sm" href={waLink('Un guide utile : ' + (typeof window !== 'undefined' ? window.location.origin : '') + '/blog#reprise')} target="_blank" rel="noopener noreferrer" aria-label="Partager sur WhatsApp"><Icon d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20z" size={18} /></a>
              <button type="button" className="btn sm" onClick={copy} aria-label="Copier le lien"><Icon d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" size={18} /></button>
              <button type="button" className="btn sm" onClick={() => window.print()} aria-label="Imprimer l'article"><Icon d={P.print} size={18} /></button>
            </div>
          </aside>
          <div className="body">
            <span className="b-tag">Caisse et ventes · 8 min de lecture</span>
            <h2>Reprise d'or ancien : calculer un prix juste en 4 étapes</h2>
            <div className="by"><Louiz mood="happy" size={44} /><span><strong>Équipe Orgest</strong><br /><span className="muted">Guide pratique</span></span></div>
            <p>Un client pose une vieille gourmette sur le comptoir. Ce qu'il en tirera dépend de quatre gestes : bien les faire, c'est un prix que vous pouvez défendre — et un client qui revient.</p>
            <h3 id="r1">1. Peser le bijou : le poids brut</h3>
            <p>Pesez sur une balance de bijouterie au centième de gramme, devant le client. Notez le <strong>poids brut</strong> tel quel, fermoir et soudures compris. S'il y a des pierres que vous pouvez retirer, retirez-les avant de peser ; sinon, vous en tiendrez compte à l'étape 3.</p>
            <h3 id="r2">2. Identifier le carat</h3>
            <p>Cherchez le poinçon, puis confirmez par votre méthode habituelle de test. Le carat dit la part d'or pur dans le métal :</p>
            <div className="tablewrap"><table><thead><tr><th>Carat</th><th>Or pur</th><th>Titre</th></tr></thead><tbody>
              <tr><td>18K</td><td>18 / 24 = 75 %</td><td>750 ‰</td></tr><tr><td>21K</td><td>21 / 24 = 87,5 %</td><td>875 ‰</td></tr><tr><td>24K</td><td>24 / 24 ≈ 100 %</td><td>999 ‰</td></tr>
            </tbody></table></div>
            <p>Un doute sur le carat ? Rachetez au carat inférieur ou refusez : c'est la seule erreur qu'on ne rattrape pas après la fonte.</p>
            <h3 id="r3">3. Déduire la perte : le poids net</h3>
            <p>Le métal perd un peu à la fonte, et les pierres ou soudures ne sont pas de l'or. On applique donc une <strong>déduction</strong>, souvent entre 2 et 5 % selon l'état du bijou. Annoncez-la au client avant de calculer.</p>
            <div className="formula"><strong>Poids net</strong> = poids brut × (1 − déduction)</div>
            <h3 id="r4">4. Appliquer le prix d'achat du jour</h3>
            <p>Multipliez le poids net par votre <strong>prix d'achat du jour</strong> pour ce carat (en DH/g) — celui que vous avez saisi le matin, pas celui de la veille.</p>
            <div className="formula"><strong>Montant versé</strong> = poids net × prix d'achat du jour (DH/g)</div>
            <div className="example">
              <strong>Exemple chiffré <span className="muted" style={{ fontWeight: 400 }}>(prix fictif, pour le calcul)</span></strong>
              <dl>
                <dt>Bracelet 18K, poids brut</dt><dd>12,00 g</dd><dt>Déduction</dt><dd>3 %</dd><dt>Poids net : 12,00 × 0,97</dt><dd>11,64 g</dd>
                <dt>Prix d'achat 18K (exemple)</dt><dd>400 DH/g</dd><dt>À verser : 11,64 × 400</dt><dd><strong>4 656 DH</strong></dd>
              </dl>
            </div>
            <div className="tip"><Louiz mood="happy" size={88} /><p><strong>L'astuce de Louiz :</strong> tournez l'écran vers le client pendant le calcul. Quand il voit le poids et la déduction, il discute beaucoup moins le prix.</p></div>
            <h3 id="r5">Les erreurs qui coûtent cher</h3>
            <ul>
              <li>Utiliser le prix d'hier : sur un marché qui bouge, l'écart se paie à chaque gramme.</li>
              <li>Confondre prix de vente et prix d'achat du jour : ce n'est pas le même chiffre.</li>
              <li>Arrondir le poids avant la déduction au lieu d'après.</li>
              <li>Oublier de garder une trace : sans reçu, impossible de justifier le prix plus tard.</li>
            </ul>
            <h3 id="r6">Dans Orgest</h3>
            <p>L'écran <strong>Achat d'or</strong> fait ces quatre étapes pour vous : choisissez le carat, tapez le poids brut et la déduction, et le montant s'affiche avec le prix du jour. Dans une <strong>Vente</strong> ou un <strong>Échange</strong>, activez « Reprise d'or ancien » : le montant est déduit du total à payer et apparaît sur le reçu.</p>
          </div>
        </article>

        <section className="b-faq" aria-label="Questions fréquentes">
          <div><h2>Les questions qu'on nous pose</h2><p className="muted">Une autre question ? Écrivez-nous sur WhatsApp, on répond pendant les heures de boutique.</p></div>
          <div className="list">
            {FAQ.map(([qq, aa], i) => (
              <div className="it" key={qq}>
                <button type="button" aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)}><span>{qq}</span><span aria-hidden="true">{faq === i ? '−' : '+'}</span></button>
                {faq === i && <p>{aa}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="b-news" aria-label="Proposer un sujet">
          <Louiz mood="happy" size={120} />
          <div className="stack" style={{ gap: 10 }}>
            <h2>Un sujet à nous proposer ?</h2>
            <p className="muted" style={{ margin: 0 }}>Les meilleures questions du comptoir deviennent des guides. Écrivez-nous sur WhatsApp.</p>
            <a className="btn primary" style={{ alignSelf: 'flex-start' }} href={wa} target="_blank" rel="noopener noreferrer">Écrire sur WhatsApp</a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
