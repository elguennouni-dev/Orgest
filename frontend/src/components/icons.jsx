export const P = {
  dash: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  sale: 'M3 4h3l2.4 11h10.2L21 7H7.2M10 20h.01M17 20h.01',
  exchange: 'M4 8h14l-4-4M20 16H6l4 4',
  buyback: 'M12 3v12m0 0l-5-5m5 5l5-5M4 21h16',
  stock: 'M3 18l3-8h12l3 8H3zM8 10l1.5-4h5L16 10',
  workshop: 'M14 4l6 6-3 3-6-6 3-3zM11 7l-7 7 3 3 7-7',
  calendar: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  back: 'M15 6l-6 6 6 6',
  warn: 'M12 3l10 18H2L12 3zM12 10v5M12 18h.01',
  check: 'M5 12l5 5L20 7',
  out: 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9',
  tag: 'M3 12V4h8l10 10-8 8L3 12zM7.5 8.5h.01',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  menu: 'M4 6h16M4 12h16M4 18h16',
};
export function Icon({ d, size = 20, sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  );
}
