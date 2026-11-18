import { Fragment } from 'react';

const SAFE_URL = /^(https?:\/\/|\/(?!\/)|#|mailto:)/i;

/** Rendu Markdown minimal et SÛR : aucun HTML brut, liens limités à http(s)/relatifs/mailto (anti-XSS, OWASP A03). */
function inline(text, key = '') {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${key}${i++}`;
    if (tok.startsWith('**')) out.push(<strong key={k}>{inline(tok.slice(2, -2), k)}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={k}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('[')) {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok);
      if (lm && SAFE_URL.test(lm[2])) out.push(<a key={k} href={lm[2]} {...(/^https?:/i.test(lm[2]) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{lm[1]}</a>);
      else out.push(tok);
    } else out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export default function Markdown({ source }) {
  const blocks = [];
  const lines = String(source || '').replace(/\r/g, '').split('\n');
  let buf = [], list = null;
  const flush = () => { if (buf.length) { blocks.push({ t: 'p', v: buf.join(' ') }); buf = []; } };
  const flushList = () => { if (list) { blocks.push(list); list = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    let m;
    if (!l.trim()) { flush(); flushList(); continue; }
    if ((m = /^(#{2,3})\s+(.+)$/.exec(l))) { flush(); flushList(); blocks.push({ t: 'h' + m[1].length, v: m[2] }); continue; }
    if ((m = /^[-*]\s+(.+)$/.exec(l))) { flush(); if (!list || list.t !== 'ul') { flushList(); list = { t: 'ul', v: [] }; } list.v.push(m[1]); continue; }
    if ((m = /^\d+[.)]\s+(.+)$/.exec(l))) { flush(); if (!list || list.t !== 'ol') { flushList(); list = { t: 'ol', v: [] }; } list.v.push(m[1]); continue; }
    if ((m = /^>\s?(.*)$/.exec(l))) { flush(); flushList(); blocks.push({ t: 'q', v: m[1] }); continue; }
    flushList(); buf.push(l.trim());
  }
  flush(); flushList();
  return (
    <>
      {blocks.map((b, i) => {
        if (b.t === 'h2') return <h2 key={i} className="md-h2">{inline(b.v, i + 'a')}</h2>;
        if (b.t === 'h3') return <h3 key={i}>{inline(b.v, i + 'a')}</h3>;
        if (b.t === 'ul') return <ul key={i}>{b.v.map((x, j) => <li key={j}>{inline(x, `${i}-${j}`)}</li>)}</ul>;
        if (b.t === 'ol') return <ol key={i}>{b.v.map((x, j) => <li key={j}>{inline(x, `${i}-${j}`)}</li>)}</ol>;
        if (b.t === 'q') return <blockquote key={i} className="formula">{inline(b.v, i + 'a')}</blockquote>;
        return <p key={i}>{inline(b.v, i + 'a')}</p>;
      })}
    </>
  );
}
export { Fragment };
