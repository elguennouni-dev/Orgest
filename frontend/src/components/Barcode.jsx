import { code128Bars } from '../lib/code128.js';

/** Code-barres Code 128 en SVG (net à toute taille, sans dépendance). */
export default function Barcode({ value, height = 36, showText = true, className }) {
  let enc;
  try { enc = code128Bars(value); } catch { return null; }
  const quiet = 10;
  const w = enc.width + quiet * 2;
  return (
    <svg className={className} viewBox={`0 0 ${w} ${height + (showText ? 10 : 0)}`} preserveAspectRatio="none" role="img" aria-label={String(value)} shapeRendering="crispEdges" style={{ width: '100%', display: 'block' }}>
      {enc.bars.map((b) => <rect key={b.x} x={b.x + quiet} y="0" width={b.w} height={height} fill="#000" />)}
      {showText && <text x={w / 2} y={height + 8} textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#000">{String(value)}</text>}
    </svg>
  );
}
