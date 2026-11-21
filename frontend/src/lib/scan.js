// Aide au scan : un lecteur USB « tape » le code puis Entrée ; on cherche la référence EXACTE.
export const normCode = (s) => String(s ?? '').trim().toUpperCase();

/** Retourne l'article dont la référence correspond exactement (insensible à la casse), sinon null. */
export function exactRef(list, code) {
  const c = normCode(code);
  if (!c) return null;
  return (list || []).find((it) => normCode(it.ref) === c) || null;
}

export const cameraScanSupported = () =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia;
