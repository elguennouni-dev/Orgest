// À personnaliser avant le build (ou via .env : VITE_WHATSAPP=2126XXXXXXXX)
export const WHATSAPP = import.meta.env.VITE_WHATSAPP || '212600000000';
export const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text || '')}`;

// Tarifs affichés sur la page d'accueil (DH). Format : "mois:prix,mois:prix" — ex. VITE_PRICES="1:200,3:550,6:1000,12:1800"
const DEFAULT_PRICES = '1:200,3:550,6:1000,12:1800';
export const PLAN_PRICES = Object.fromEntries(
  (import.meta.env.VITE_PRICES || DEFAULT_PRICES).split(',').map((p) => p.split(':').map((x) => Number(x.trim()))).filter(([m, v]) => m > 0 && v >= 0),
);
