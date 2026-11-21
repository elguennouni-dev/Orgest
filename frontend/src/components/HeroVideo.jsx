import { useRef, useState } from 'react';
import { useI18n } from '../i18n.jsx';

/** Film de présentation : affiche + bouton lecture, le fichier n'est chargé qu'au clic. */
export default function HeroVideo() {
  const { t } = useI18n();
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  const play = () => {
    setOn(true);
    const v = ref.current;
    if (v) { v.load(); v.play().catch(() => {}); }
  };
  return (
    <div className="hero-video">
      <video ref={ref} controls={on} playsInline preload="none" poster="/assets/video/orgest-film-poster.webp"
        aria-label={t('hero.videoLabel')} width="1280" height="720" onEnded={() => setOn(false)}>
        <source src="/assets/video/orgest-film.mp4" type="video/mp4" />
      </video>
      {!on && (
        <button type="button" className="hv-play" onClick={play} aria-label={t('hero.videoPlay')}>
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
        </button>
      )}
    </div>
  );
}
