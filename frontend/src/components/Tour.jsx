import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n.jsx';
import Louiz from './Louiz.jsx';

const MOODS = ['wave', 'thinking', 'happy', 'proud', 'celebrate'];

/** Visite guidée en 5 étapes avec Louiz. Jamais bloquante : on peut passer à tout moment. */
export default function Tour({ onClose }) {
  const { t } = useI18n();
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const last = i === MOODS.length - 1;
  const k = (s) => t(`tour.${i}.${s}`);
  return (
    <div className="tour-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tour" role="dialog" aria-modal="true" aria-label="Louiz">
        <div className="mascot">
          <Louiz mood={MOODS[i]} size={150} />
          <div className="sp">{k('bubble')}</div>
        </div>
        <div className="body">
          <span className="kick">{k('kicker')}</span>
          <h2>{k('title')}</h2>
          <p>{k('body')}</p>
          {i === 1 && <div className="carats">{[18, 21, 24].map((c) => <div key={c} className="carat empty"><b>{c}K</b></div>)}</div>}
          {i === 3 && <div className="steps">{[1, 2, 3].map((n) => <div key={n}><b>{n}</b>{t(`tour.g${n}`)}</div>)}</div>}
          <div className="dots" role="group">
            {MOODS.map((_, n) => <button key={n} type="button" aria-label={String(n + 1)} className={n === i ? 'on' : n < i ? 'past' : ''} onClick={() => setI(n)} />)}
            <span className="muted" dir="ltr" style={{ marginInlineStart: 8, fontSize: 13 }}>{i + 1} / {MOODS.length}</span>
          </div>
          <div className="acts">
            {!last ? <button type="button" className="btn" onClick={onClose}>{t('tour.skip')}</button> : <button type="button" className="btn" onClick={onClose}>{t('tour.toDash')}</button>}
            <div className="row">
              {i > 0 && <button type="button" className="btn" onClick={() => setI(i - 1)}>{t('tour.back')}</button>}
              {!last
                ? <button type="button" className="btn primary" onClick={() => setI(i + 1)}>{k('next')}</button>
                : <button type="button" className="btn primary" onClick={() => { onClose(); nav('/app'); document.getElementById('prices-card')?.scrollIntoView({ behavior: 'smooth' }); }}>{t('tour.setPrices')}</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
