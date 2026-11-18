import { useId } from 'react';

const DOWN = { armL: 'M24 64 Q14 72 13 82', armR: 'M96 64 Q106 72 107 82' };
const ARC_L = 'M43 56 Q48 49 53 56';
const ARC_R = 'M67 56 Q72 49 77 56';
const BASE = {
  eL: 1, eR: 1, cL: 0, cR: 0, closedL: ARC_L, closedR: ARC_R, eyeT: 'translate(0 0)',
  mouth: 'M49 70 Q60 80 71 70', mFill: 'none', armL: DOWN.armL, armR: DOWN.armR,
  wave: '0 96 64;0 96 64', waveDur: '1s', bob: '0 0;0 -4;0 0', dur: '1.8s',
  brow: 0, browD: 'M43 44 L53 44 M67 44 L77 44', sweat: 0, zz: 0, q: 0, spark: 0, conf: 0,
};
const MOODS = {
  happy: {},
  wave: { armR: 'M96 62 Q108 52 110 38', wave: '-14 96 62;24 96 62;-14 96 62', waveDur: '0.9s', bob: '0 0;0 -5;0 0', dur: '1.2s' },
  thinking: { eyeT: 'translate(2 -3)', mouth: 'M54 73 Q60 71 66 73', armR: 'M96 66 Q98 86 76 84', brow: 1, browD: 'M43 43 L53 41 M67 40 L77 44', q: 1, bob: '0 0;0 -2;0 0', dur: '2.6s' },
  worried: { brow: 1, browD: 'M43 44 L53 48 M67 48 L77 44', mouth: 'M54 76 Q60 70 66 76', sweat: 1, bob: '0 0;-2.5 0;2.5 0;-2.5 0;0 0;0 0;0 0', dur: '1.4s' },
  proud: { eR: 0, cR: 1, mouth: 'M50 71 Q62 79 72 67', armL: 'M24 62 Q12 66 22 78', spark: 1, bob: '0 0;0 -3;0 0', dur: '2s' },
  celebrate: { eL: 0, eR: 0, cL: 1, cR: 1, mouth: 'M47 67 Q60 88 73 67 Z', mFill: '#7A3412', armL: 'M24 60 Q12 48 12 34', armR: 'M96 60 Q108 48 108 34', bob: '0 0;0 -12;0 0', dur: '0.6s', conf: 1 },
  sleepy: { eL: 0, eR: 0, cL: 1, cR: 1, closedL: 'M43 55 Q48 59 53 55', closedR: 'M67 55 Q72 59 77 55', mouth: 'M56 73 Q60 76 64 73', zz: 1, bob: '0 0;0 2;0 0', dur: '3.2s' },
};
const LABELS = { happy: 'Louiz', wave: 'Louiz', thinking: 'Louiz', worried: 'Louiz', proud: 'Louiz', celebrate: 'Louiz', sleepy: 'Louiz' };

/** Louiz, la mascotte d'Orgest : une pièce d'or. 7 humeurs. */
export default function Louiz({ mood = 'wave', size = 120, className, style }) {
  const gid = 'lz' + useId().replace(/:/g, '');
  const v = { ...BASE, ...(MOODS[mood] || MOODS.wave) };
  const A = (n, vals, dur, extra = {}) => <animate attributeName={n} values={vals} dur={dur} repeatCount="indefinite" {...extra} />;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={LABELS[mood] || 'Louiz'} className={className} style={{ display: 'block', flex: 'none', ...style }}>
      <defs>
        <radialGradient id={gid} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#FFF1B8" /><stop offset="45%" stopColor="#F5C443" /><stop offset="100%" stopColor="#C98A12" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="112" rx="24" ry="4" fill="#000" opacity="0.12" />
      <g>
        <animateTransform attributeName="transform" type="translate" values={v.bob} dur={v.dur} repeatCount="indefinite" />
        <path d="M51 96 L48 107 M69 96 L72 107" stroke="#A86F0C" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d={v.armL} stroke="#A86F0C" strokeWidth="6" strokeLinecap="round" fill="none" />
        <g>
          <animateTransform attributeName="transform" type="rotate" values={v.wave} dur={v.waveDur} repeatCount="indefinite" />
          <path d={v.armR} stroke="#A86F0C" strokeWidth="6" strokeLinecap="round" fill="none" />
        </g>
        <circle cx="60" cy="58" r="40" fill={`url(#${gid})`} stroke="#A86F0C" strokeWidth="4" />
        <circle cx="60" cy="58" r="32" fill="none" stroke="#FFE08A" strokeWidth="2" opacity="0.8" />
        <path d="M80 28 L81.8 32.2 L86 34 L81.8 35.8 L80 40 L78.2 35.8 L74 34 L78.2 32.2 Z" fill="#fff">{A('opacity', '0.2;1;0.2', '2.6s')}</path>
        <circle cx="41" cy="67" r="5" fill="#F08A5D" opacity="0.45" />
        <circle cx="79" cy="67" r="5" fill="#F08A5D" opacity="0.45" />
        <path d={v.browD} stroke="#3B2A10" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity={v.brow} />
        <g transform={v.eyeT}>
          <ellipse cx="48" cy="55" rx="4.5" ry="6" fill="#3B2A10" opacity={v.eL}>{A('ry', '6;6;0.6;6;6', '4s', { keyTimes: '0;0.9;0.94;0.98;1' })}</ellipse>
          <ellipse cx="72" cy="55" rx="4.5" ry="6" fill="#3B2A10" opacity={v.eR}>{A('ry', '6;6;0.6;6;6', '4s', { keyTimes: '0;0.9;0.94;0.98;1' })}</ellipse>
          <circle cx="49.5" cy="52.5" r="1.4" fill="#fff" opacity={v.eL} />
          <circle cx="73.5" cy="52.5" r="1.4" fill="#fff" opacity={v.eR} />
        </g>
        <path d={v.closedL} stroke="#3B2A10" strokeWidth="3" strokeLinecap="round" fill="none" opacity={v.cL} />
        <path d={v.closedR} stroke="#3B2A10" strokeWidth="3" strokeLinecap="round" fill="none" opacity={v.cR} />
        <path d={v.mouth} stroke="#3B2A10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill={v.mFill} />
      </g>
      {v.sweat ? <path d="M90 34 Q95 42 90 46 Q85 42 90 34 Z" fill="#7CC4F0">{A('opacity', '0;1;0', '1.4s')}</path> : null}
      {v.zz ? (
        <g fill="#8A6209" fontWeight="700">
          <text x="92" y="32" fontSize="10">z{A('opacity', '0;1;0', '2.4s')}</text>
          <text x="100" y="20" fontSize="14">z{A('opacity', '0;1;0', '2.4s', { begin: '0.8s' })}</text>
        </g>
      ) : null}
      {v.q ? <text x="98" y="30" fontSize="22" fontWeight="700" fill="#8A6209">?{A('opacity', '1;0.3;1', '1.6s')}</text> : null}
      {v.spark ? (
        <g fill="#F2B630">
          <path d="M18 25 L19.5 28.5 L23 30 L19.5 31.5 L18 35 L16.5 31.5 L13 30 L16.5 28.5 Z">{A('opacity', '1;0.2;1', '1.2s')}</path>
          <path d="M104 14 L105.2 16.8 L108 18 L105.2 19.2 L104 22 L102.8 19.2 L100 18 L102.8 16.8 Z">{A('opacity', '0.2;1;0.2', '1.2s')}</path>
        </g>
      ) : null}
      {v.conf ? (
        <g>
          <rect x="14" y="14" width="6" height="3" fill="#F2B630" transform="rotate(25 17 15)">{A('y', '6;24;6', '1.2s')}</rect>
          <rect x="100" y="10" width="6" height="3" fill="#2E7D5B" transform="rotate(-20 103 11)">{A('y', '4;22;4', '1s')}</rect>
          <rect x="30" y="4" width="5" height="3" fill="#C2410C">{A('y', '0;14;0', '0.9s')}</rect>
          <rect x="86" y="4" width="5" height="3" fill="#F2B630">{A('y', '0;16;0', '1.1s')}</rect>
          <circle cx="8" cy="40" r="2.5" fill="#2E7D5B">{A('cy', '30;48;30', '1.3s')}</circle>
          <circle cx="112" cy="44" r="2.5" fill="#C2410C">{A('cy', '34;52;34', '1.05s')}</circle>
        </g>
      ) : null}
    </svg>
  );
}
