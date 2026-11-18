import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

/** Charge une ressource GET ; retourne { data, error, loading, reload }. */
export function useApi(path, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api(path));
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}

export function waPhone(phone) {
  if (!phone) return null;
  let d = phone.replace(/[^0-9+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '212' + d.slice(1);
  return d.length >= 9 ? d : null;
}

/** SEO côté client : titre, description, mots-clés, canonical, Open Graph et JSON-LD (réinitialisés au démontage). */
export function useSeo({ title, description, keywords, image, type = 'website', jsonLd } = {}) {
  useEffect(() => {
    const prevTitle = document.title;
    const made = [];
    const set = (attr, key, value) => {
      if (!value) return;
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); made.push(el); }
      el.setAttribute('content', value);
    };
    if (title) document.title = title;
    set('name', 'description', description);
    set('name', 'keywords', keywords);
    set('property', 'og:title', title);
    set('property', 'og:description', description);
    set('property', 'og:type', type);
    set('property', 'og:url', window.location.href.split('#')[0]);
    set('property', 'og:image', image ? new URL(image, window.location.origin).href : null);
    set('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    let link = document.head.querySelector('link[rel="canonical"]');
    const hadLink = !!link;
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    const prevHref = link.href;
    link.href = window.location.origin + window.location.pathname;
    let ld = null;
    if (jsonLd) { ld = document.createElement('script'); ld.type = 'application/ld+json'; ld.textContent = JSON.stringify(jsonLd); document.head.appendChild(ld); }
    return () => {
      document.title = prevTitle;
      made.forEach((el) => el.remove());
      if (!hadLink) link.remove(); else link.href = prevHref;
      if (ld) ld.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, keywords, image, type, JSON.stringify(jsonLd)]);
}
