import { useId } from 'react';

/** Symbole Orgest : le « O » est une bague en or, le diamant serti au sommet en fait un bijou.
 *  `gap` = couleur du fond (le diamant « découpe » la bague avec un liseré de cette couleur). */
export default function OrgestMark({ size = 40, gap = '#14120E', className, style, title = 'Orgest' }) {
  const id = 'og' + useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={title} className={className} style={{ display: 'block', flex: 'none', ...style }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE08A" /><stop offset="50%" stopColor="#F2B630" /><stop offset="100%" stopColor="#B7790F" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="38" r="19" fill="none" stroke={`url(#${id})`} strokeWidth="8" />
      <path d="M21 14 L26 7 L38 7 L43 14 L32 27 Z" fill={gap} stroke={gap} strokeWidth="5" strokeLinejoin="round" />
      <path d="M21 14 L26 7 L38 7 L43 14 L32 27 Z" fill="#FFF1B8" stroke="#B7790F" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M21 14 L43 14 M26 7 L29 14 L32 27 M38 7 L35 14 L32 27 M29 14 L32 7 L35 14" fill="none" stroke="#B7790F" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}
