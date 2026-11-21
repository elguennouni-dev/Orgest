// Photos libres de droits (Unsplash License) utilisées quand un article n'a pas de couverture téléversée.
const BASE = '/assets/blog/photos/';
export const PHOTOS = {
  chaines:    { alt: 'Chaînes et bracelets en or sur fond blanc', by: 'Syed F Hashemi', url: 'https://unsplash.com/photos/aldDZePniqg' },
  bagues:     { alt: 'Bagues en or posées sur un galet', by: 'Luisana Galicia', url: 'https://unsplash.com/photos/rGz2Z6tVaeg' },
  manchette:  { alt: 'Manchette en or et pendentif sur un plateau en bois', by: 'LUM3N', url: 'https://unsplash.com/photos/esAis38NHT8' },
  solitaire:  { alt: 'Bague en or ornée de diamants', by: 'Sama Hosseini', url: 'https://unsplash.com/photos/CtZZAif-WfQ' },
  plateau:    { alt: 'Bijoux en or sur un plateau en bois', by: 'LUM3N', url: 'https://unsplash.com/photos/nPUJAJOk0mc' },
  alliances:  { alt: 'Alliances sur un écrin en velours rouge', by: 'Fallon Michael', url: 'https://unsplash.com/photos/orVNEDAylaU' },
  vitrine:    { alt: 'Vitrine de bagues dans une bijouterie', by: 'Yasamine June', url: 'https://unsplash.com/photos/JaT8kpTQWpI' },
};
const POOLS = {
  "Cours de l'or": ['chaines', 'manchette'], 'Caisse et ventes': ['alliances', 'bagues'], 'Gestion de boutique': ['vitrine', 'plateau'],
  'Atelier': ['plateau', 'manchette'], 'Nouveautés Orgest': ['vitrine', 'bagues'],
  'شراء وبيع الذهب': ['chaines', 'alliances'], 'التقسيط': ['alliances', 'solitaire'], 'تدبير المحل': ['vitrine', 'plateau'],
};
const ALL = Object.keys(PHOTOS);
const hash = (s) => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

const poolOf = (post) => POOLS[post?.category] || (/تقسيط|crédit/i.test(post?.category || '') ? ['alliances', 'solitaire'] : ALL);

/** Attribue une photo à chaque article, sans doublon tant qu'il reste des photos (ordre stable, indépendant du filtre). */
export function assignPhotos(posts) {
  const out = {};
  const used = new Set();
  [...(posts || [])].sort((a, b) => String(a.slug).localeCompare(String(b.slug))).forEach((p) => {
    const pool = poolOf(p);
    const start = hash(p.slug);
    const order = [...pool.map((_, i) => pool[(start + i) % pool.length]), ...ALL.map((_, i) => ALL[(start + i) % ALL.length])];
    const key = order.find((k) => !used.has(k)) || order[0];
    out[p.slug] = key;
    used.add(key);
    if (used.size >= ALL.length) used.clear();
  });
  return out;
}

/** Photo d'un article : couverture téléversée en priorité, sinon la photo attribuée par assignPhotos. */
export function photoFor(post, small = false, map = null) {
  if (post?.cover) return { src: `/api/public/blog-cover/${post.cover}`, alt: post.coverAlt || post.title, credit: null };
  const key = (map && map[post?.slug]) || poolOf(post)[hash(post?.slug) % poolOf(post).length];
  const p = PHOTOS[key];
  return { src: `${BASE}${key}${small ? '-sm' : ''}.webp`, alt: p.alt, credit: p };
}
export const heroPhotos = () => ['chaines', 'alliances', 'solitaire'].map((k) => ({ src: `${BASE}${k}.webp`, alt: PHOTOS[k].alt }));
