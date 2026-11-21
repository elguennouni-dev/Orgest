import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n.jsx';

const SHOTS = ['dashboard', 'sale', 'stock', 'installments', 'customers'];
const STEP_MS = 4800;

/** Vrai quand l'élément est (au moins en partie) à l'écran. */
function useInView(ref, margin = '0px') {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setOn(true); return undefined; }
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: margin, threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return on;
}

export default function Showcase() {
  const { t, lang } = useI18n();
  const root = useRef(null);
  const seen = useRef(false);
  const inView = useInView(root);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (inView) seen.current = true;
  const playing = inView && !paused && !reduce;

  useEffect(() => {
    if (!playing) return undefined;
    const id = setTimeout(() => setIdx((i) => (i + 1) % SHOTS.length), STEP_MS);
    return () => clearTimeout(id);
  }, [playing, idx]);

  const src = (name, kind) => `/assets/shots/${name}-${kind}-${lang === 'ar' ? 'ar' : 'fr'}.webp`;

  return (
    <section className={`site-sec showcase${seen.current ? ' in' : ''}`} id="apercu" ref={root}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <h2>{t('showcase.title')}</h2>
      <p className="muted showcase-sub">{t('showcase.sub')}</p>

      <div className="sc-tabs" role="tablist" aria-label={t('showcase.title')}>
        {SHOTS.map((s, i) => (
          <button key={s} type="button" role="tab" aria-selected={i === idx} className={i === idx ? 'on' : ''} onClick={() => setIdx(i)}>
            <span>{t('showcase.tab.' + s)}</span>
            {i === idx && <i className="bar" key={idx + String(playing)} style={{ animationDuration: STEP_MS + 'ms', animationPlayState: playing ? 'running' : 'paused' }} />}
          </button>
        ))}
      </div>

      <div className="sc-stage">
        <div className="sc-glow" aria-hidden="true" />
        <div className="sc-browser">
          <div className="sc-bar" aria-hidden="true"><i /><i /><i /><span>orgest.tech/app</span></div>
          <div className="sc-view">
            {SHOTS.map((s, i) => (
              <img key={s} className={i === idx ? 'on' : ''} src={src(s, 'd')} width="1100" height="688"
                alt={i === idx ? t('showcase.tab.' + s) + ' — Orgest' : ''} aria-hidden={i !== idx} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
            ))}
          </div>
        </div>
        <div className="sc-phone">
          <div className="sc-notch" aria-hidden="true" />
          <div className="sc-view">
            {SHOTS.map((s, i) => (
              <img key={s} className={i === idx ? 'on' : ''} src={src(s, 'm')} width="390" height="800" alt="" aria-hidden="true" loading="lazy" decoding="async" />
            ))}
          </div>
        </div>
      </div>

      <p className="sc-cap" aria-live="polite" key={idx}>{t('showcase.cap.' + SHOTS[idx])}</p>
    </section>
  );
}
