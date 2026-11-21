import { waPhone } from '../hooks.js';

/** Lien wa.me pré-rempli avec le résumé du devis (null si le client n'a pas de numéro valide). */
export function whatsappUrl(q, shopName, t) {
  const n = waPhone(q.customerPhone);
  if (!n || n.length < 9) return null;
  const total = Number(q.subtotal).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const text = t('quote.waText', { shop: shopName || '', number: q.number, total, date: q.validUntil });
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
