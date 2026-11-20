import { describe, expect, it } from 'vitest';
import { headings } from '../src/components/Markdown.jsx';

describe('markdown headings (ancres identiques au rendu serveur)', () => {
  it('numérote les H2 s1, s2… et ignore les H3', () => {
    const h = headings('## Un\ntexte\n### Sous\n## **Deux** [lien](/x)');
    expect(h).toEqual([{ id: 's1', text: 'Un' }, { id: 's2', text: 'Deux lien' }]);
  });
  it('ne confond pas les lignes de tableau avec des titres', () => {
    expect(headings('| a |\n| - |\n| ## x |\n\n## Vrai')).toEqual([{ id: 's1', text: 'Vrai' }]);
  });
  it('supporte l’arabe', () => {
    expect(headings('## الخطوة الأولى\nنص')[0]).toEqual({ id: 's1', text: 'الخطوة الأولى' });
  });
});
