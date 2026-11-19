import { useApi } from '../hooks.js';

/** FAQ unique (source : /api/public/faq, la même que le JSON‑LD FAQPage de la page d'accueil). Toutes les réponses restent dans le DOM. */
export default function Faq({ title = 'Questions fréquentes' }) {
  const { data } = useApi('/public/faq');
  if (!data || data.length === 0) return null;
  return (
    <section className="site-sec" id="faq" lang="fr" dir="ltr" aria-label={title}>
      <h2>{title}</h2>
      <div className="faq-list">
        {data.map((f, i) => (
          <details className="faq-it" key={f.q} open={i === 0}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
