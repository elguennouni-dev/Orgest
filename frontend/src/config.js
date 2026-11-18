// À personnaliser avant le build (ou via .env : VITE_WHATSAPP=2126XXXXXXXX)
export const WHATSAPP = import.meta.env.VITE_WHATSAPP || '212600000000';
export const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text || '')}`;

