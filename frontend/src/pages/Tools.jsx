import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi, useSeo } from '../hooks.js';
import { useI18n } from '../i18n.jsx';
import { SiteFooter, SiteHeader } from '../components/Site.jsx';
import Louiz from '../components/Louiz.jsx';
import { waLink } from '../config.js';
import { buildSchedule, installmentError, round2, tradeInValue, netWeight } from '../lib/money.js';
import { CARATS, convertCarats } from '../lib/tools.js';

const fmt = (v, d = 2) => Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtD = (d) => d.toLocaleDateString('fr-FR');

const UI = {
  fr: {
    g: 'g', crumb: 'Fil d’Ariane', hubEyebrow: 'Orgest · Outils', hubTitle: 'Outils gratuits pour bijoutiers', hubLead: 'Calculateurs simples, sans inscription : reprise d’or ancien, carats, échéancier à tempérament.', seoTitle: 'Outils gratuits pour bijoutiers — reprise d’or, carats, échéancier', seoDesc: 'Calculateurs gratuits pour bijoutiers au Maroc : reprise d’or ancien, conversion des carats, échéancier à tempérament au centime.', switchLabel: 'Outils en arabe', switchTo: 'العربية', empty: 'Aucun outil pour le moment.',
    tools: 'Outils', all: 'Tous les outils', dh: 'DH', formula: 'La formule', faq: 'Questions fréquentes', free: 'Gratuit · sans inscription · vos chiffres restent sur votre appareil',
    gross: 'Poids brut (g)', ded: 'Déduction (%)', buy: 'Prix d’achat du jour (DH/g)', net: 'Poids net', amount: 'Montant à verser',
    refPrice: 'Prix du gramme (DH)', refCarat: 'Carat de référence', carat: 'Carat', purity: 'Or pur', perGram: 'Valeur du gramme',
    price: 'Prix du bijou (DH)', down: 'Acompte (DH)', months: 'Nombre de mois', rem: 'Reste à payer', due: 'Échéance', total: 'Total', month: 'Mensualité',
    errNo: 'Le prix doit être supérieur à 0.', errMonths: 'Entre 1 et 36 mois.', errDown: 'L’acompte doit être inférieur au prix.',
    ctaH: 'Marre de refaire ces calculs à la main ?', ctaP: 'Orgest les fait pour vous : stock au gramme, prix du jour, reprise d’or, ventes à tempérament et reçus.',
    demo: 'Demander une démo sur WhatsApp', msg: (t) => `Bonjour, j’ai utilisé l’outil « ${t} » et je voudrais une démonstration d’Orgest.`, other: 'Autres outils', soon: 'Avertissement',
  },
  ar: {
    g: 'غ', crumb: 'مسار التصفح', hubEyebrow: 'Orgest · الأدوات', hubTitle: 'أدوات مجانية لأصحاب محلات الذهب', hubLead: 'حاسبات بسيطة، بلا تسجيل: ثمن الذهب القديم، العيارات، جدول التقسيط.', seoTitle: 'أدوات مجانية لأصحاب محلات الذهب — الذهب القديم، العيارات، التقسيط', seoDesc: 'حاسبات مجانية لأصحاب محلات المجوهرات بالمغرب: ثمن الذهب القديم، تحويل العيارات وجدول التقسيط بالسنتيم.', switchLabel: 'الأدوات بالفرنسية', switchTo: 'Français', empty: 'ما كاين حتى أداة دابا.',
    tools: 'الأدوات', all: 'كل الأدوات', dh: 'درهم', formula: 'المعادلة', faq: 'أسئلة متكررة', free: 'مجاني · بلا تسجيل · أرقامك تبقى على جهازك',
    gross: 'الوزن الخام (غ)', ded: 'نسبة الخصم (%)', buy: 'ثمن الشراء لليوم (درهم/غ)', net: 'الوزن الصافي', amount: 'المبلغ الواجب دفعه',
    refPrice: 'ثمن الغرام (درهم)', refCarat: 'العيار المرجعي', carat: 'العيار', purity: 'الذهب الخالص', perGram: 'قيمة الغرام',
    price: 'ثمن القطعة (درهم)', down: 'التسبيق (درهم)', months: 'عدد الأشهر', rem: 'الباقي للأداء', due: 'تاريخ الاستحقاق', total: 'المجموع', month: 'القسط',
    errNo: 'يجب أن يكون الثمن أكبر من 0.', errMonths: 'من 1 إلى 36 شهراً.', errDown: 'يجب أن يكون التسبيق أقل من الثمن.',
    ctaH: 'تعبت من هاد الحسابات اليدوية؟', ctaP: 'Orgest كيدير ليك الحساب: الستوك بالغرام، ثمن اليوم، استرجاع الذهب القديم، التقسيط والوصولات.',
    demo: 'اطلب عرضاً تجريبياً عبر واتساب', msg: (t) => `السلام عليكم، استعملت أداة «${t}» وبغيت عرض تجريبي ديال Orgest.`, other: 'أدوات أخرى', soon: 'تنبيه',
  },
};

const num = (v) => (v === '' || v == null ? NaN : Number(String(v).replace(',', '.')));

function Num({ label, value, onChange, step = 'any', min = 0, hint }) {
  return (
    <label className="field"><span className="lbl">{label}</span>
      <input className="input" type="number" inputMode="decimal" min={min} step={step} value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

function Reprise({ u }) {
  const [gross, setGross] = useState('12');
  const [ded, setDed] = useState('3');
  const [price, setPrice] = useState('400');
  const g = num(gross), d = num(ded), p = num(price);
  const ok = g > 0 && d >= 0 && d < 100 && p > 0;
  return (
    <div className="tool-grid">
      <div className="stack">
        <Num label={u.gross} value={gross} onChange={setGross} />
        <Num label={u.ded} value={ded} onChange={setDed} />
        <Num label={u.buy} value={price} onChange={setPrice} />
      </div>
      <div className="tool-res">
        <div><span>{u.net}</span><b className="num">{ok ? fmt(netWeight(g, d), 3) : '—'} {u.g}</b></div>
        <div className="big"><span>{u.amount}</span><b className="num">{ok ? fmt(tradeInValue(g, d, p)) : '—'} {u.dh}</b></div>
      </div>
    </div>
  );
}

function Carats({ u }) {
  const [price, setPrice] = useState('700');
  const [from, setFrom] = useState('24');
  const rows = useMemo(() => convertCarats(num(price), Number(from)), [price, from]);
  return (
    <div className="stack">
      <div className="grid g2">
        <Num label={u.refPrice} value={price} onChange={setPrice} />
        <label className="field"><span className="lbl">{u.refCarat}</span>
          <select value={from} onChange={(e) => setFrom(e.target.value)}>{CARATS.map((c) => <option key={c} value={c}>{c}K</option>)}</select>
        </label>
      </div>
      <div className="tablewrap"><table>
        <thead><tr><th>{u.carat}</th><th>{u.purity}</th><th>{u.perGram}</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.carat} className={String(r.carat) === from ? 'on' : ''}><td>{r.carat}K</td><td className="num">{fmt(r.purity, r.purity % 1 ? 1 : 0)} %</td><td className="num">{fmt(r.price)} {u.dh}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

function Echeancier({ u }) {
  const [price, setPrice] = useState('5000');
  const [down, setDown] = useState('1000');
  const [months, setMonths] = useState('3');
  const p = num(price), dw = Number.isNaN(num(down)) ? 0 : num(down), m = Number(months);
  const err = !(p > 0) ? u.errNo : !(Number.isInteger(m) && m >= 1 && m <= 36) ? u.errMonths : installmentError({ balance: p, down: dw, months: m, customerName: 'x' }) ? u.errDown : null;
  const rows = err ? [] : buildSchedule(p, dw, m, new Date());
  return (
    <div className="tool-grid">
      <div className="stack">
        <Num label={u.price} value={price} onChange={setPrice} />
        <Num label={u.down} value={down} onChange={setDown} />
        <Num label={u.months} value={months} onChange={setMonths} step="1" min={1} />
      </div>
      <div className="stack">
        {err ? <p className="errbox" role="alert">{err}</p> : (
          <>
            <div className="tool-res"><div><span>{u.rem}</span><b className="num">{fmt(round2(p - dw))} {u.dh}</b></div></div>
            <div className="tablewrap"><table>
              <thead><tr><th>#</th><th>{u.due}</th><th>{u.month}</th></tr></thead>
              <tbody>{rows.map((r) => <tr key={r.seq}><td className="num">{r.seq}</td><td className="num">{fmtD(r.dueDate)}</td><td className="num">{fmt(r.amount)} {u.dh}</td></tr>)}</tbody>
              <tfoot><tr><th colSpan={2}>{u.total}</th><th className="num">{fmt(rows.reduce((s, r) => s + Math.round(r.amount * 100), 0) / 100)} {u.dh}</th></tr></tfoot>
            </table></div>
          </>
        )}
      </div>
    </div>
  );
}

const KIND = { reprise: Reprise, carats: Carats, echeancier: Echeancier };

export function ToolsHub() {
  const { lang, setLang } = useI18n();
  const L = lang === 'ar' ? 'ar' : 'fr';
  const u = UI[L];
  useSeo({ title: u.seoTitle, description: u.seoDesc });
  const { data } = useApi('/public/tools');
  const list = (data || []).filter((x) => x.lang === L);
  return (
    <div className="site blog" lang={L} dir={L === 'ar' ? 'rtl' : 'ltr'}>
      <SiteHeader />
      <section className="b-hero"><div className="in"><div className="stack" style={{ gap: 16 }}>
        <span className="eyebrow" style={{ color: 'var(--gold-300)' }}>{u.hubEyebrow}</span>
        <h1>{u.hubTitle}</h1>
        <p>{u.hubLead}</p>
        <button type="button" className="b-other" style={{ background: 'none', border: 0, borderBottom: '1px solid rgba(245,196,67,.4)', cursor: 'pointer', font: 'inherit' }} onClick={() => setLang(L === 'ar' ? 'fr' : 'ar')} aria-label={u.switchLabel} lang={L === 'ar' ? 'fr' : 'ar'}>{u.switchTo} →</button>
      </div><div className="b-hero-l" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Louiz mood="happy" size={220} /></div></div></section>
      <main className="b-main">
        <div className="b-grid">
          {list.map((t) => (
            <article className="b-card" key={t.slug}>
              <div className="txt">
                <strong><Link to={`/outils/${t.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>{t.title}</Link></strong><p>{t.description}</p></div>
            </article>
          ))}
        </div>
        {data && list.length === 0 && <p className="muted">{u.empty}</p>}
      </main>
      <SiteFooter />
    </div>
  );
}

export function ToolPage() {
  const { slug } = useParams();
  const { data, loading } = useApi('/public/tools');
  const tool = (data || []).find((x) => x.slug === slug);
  const { lang: siteLang, setLang } = useI18n();
  const L = tool?.lang === 'ar' ? 'ar' : (tool ? 'fr' : (siteLang === 'ar' ? 'ar' : 'fr'));
  const u = UI[L];
  useEffect(() => { if (tool && siteLang !== L) setLang(L); }, [tool?.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  useSeo(tool ? { title: tool.metaTitle, description: tool.description } : { title: 'Outils — Orgest' });
  const Body = tool ? KIND[tool.kind] : null;
  const others = (data || []).filter((x) => x.lang === tool?.lang && x.slug !== slug);
  return (
    <div className="site blog">
      <SiteHeader />
      <main className="b-main" style={{ minHeight: '60vh' }}>
        {!tool ? (
          <div className="empty-louiz"><Louiz mood={loading ? 'thinking' : 'worried'} size={110} />{!loading && <><h2>404</h2><Link className="btn primary" to="/outils">{L === 'ar' ? '→' : '←'} {u.tools}</Link></>}</div>
        ) : (
          <article className="b-article" lang={L} dir={L === 'ar' ? 'rtl' : 'ltr'} style={{ gridTemplateColumns: 'minmax(0, 1fr)', justifyItems: 'center' }}>
            <div className="body" style={{ width: '100%' }}>
              <nav aria-label={u.crumb} style={{ fontSize: 14 }}><Link to="/outils">{u.tools}</Link></nav>
              <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 600, lineHeight: 1.3 }}>{tool.title}</h1>
              <p>{tool.intro}</p>
              <div className="tool-card"><Body u={u} /><p className="hint" style={{ marginTop: 12 }}>{u.free}</p></div>
              <h2>{u.formula}</h2>
              <div className="formula">{tool.formula}</div>
              <p>{tool.example}</p>
              <h2 className="faq-h">{u.faq}</h2>
              <div className="faq-list">{tool.faq.map((f, i) => <details className="faq-it" key={f.q} open={i === 0}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
              <div className="post-cta">
                <h2>{u.ctaH}</h2><p>{u.ctaP}</p>
                <div className="row" style={{ gap: 10 }}><a className="btn primary" href={waLink(u.msg(tool.title))} target="_blank" rel="noopener noreferrer">{u.demo}</a></div>
              </div>
              {others.length > 0 && <nav className="related" aria-label={u.other}><h2>{u.other}</h2><ul>{others.map((o) => <li key={o.slug}><Link to={`/outils/${o.slug}`}>{o.title}</Link></li>)}</ul></nav>}
            </div>
          </article>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
