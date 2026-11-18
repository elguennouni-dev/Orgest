import { useState } from 'react';
import { api } from '../../api.js';
import { useApi, waPhone } from '../../hooks.js';
import { fmtDate, Money, useI18n } from '../../i18n.jsx';
import { ErrorBox, Loading, PageHead } from '../../components/ui.jsx';

export default function Installments() {
  const { t } = useI18n();
  const { data, error, loading, reload } = useApi('/shop/installments');
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState(null);
  const pay = async (id) => {
    if (!window.confirm(t('inst.confirmPay'))) return;
    try { await api(`/shop/installments/${id}/pay`, { method: 'POST' }); reload(); } catch (e) { setErr(e); }
  };
  if (loading && !data) return <Loading />;
  return (
    <>
      <PageHead title={t('nav.installments')} />
      <p className="hint">{t('inst.help')}</p>
      <ErrorBox error={err || error} />
      <div className="stack">
        {data?.length === 0 && <div className="card"><p className="muted">{t('inst.none')}</p></div>}
        {data?.map((p) => {
          const wa = waPhone(p.customerPhone);
          const next = p.installments.find((i) => !i.paid);
          return (
            <div className="card" key={p.saleId}>
              <div className="row spread">
                <div>
                  <b>{p.customerName || t('inst.noName')}</b> <span className="muted">· {p.saleNumber}</span>
                  <div className="hint">{t('inst.next')}: <span className="num">{fmtDate(p.nextDue)}</span> {p.overdueCount > 0 && <span className="badge bad">{t('inst.overdue', { n: p.overdueCount })}</span>}</div>
                </div>
                <div className="row">
                  <div><div className="hint">{t('inst.remaining')}</div><b><Money v={p.remaining} /></b></div>
                  <button className="btn sm" onClick={() => setOpen(open === p.saleId ? null : p.saleId)}>{t('inst.details')}</button>
                  {wa && next && <a className="btn sm wa" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(t('inst.waReminder', { a: Math.round(next.amount), d: fmtDate(next.dueDate) }))}`}>WhatsApp</a>}
                </div>
              </div>
              {open === p.saleId && (
                <div className="tablewrap" style={{ marginTop: 10 }}>
                  <table><tbody>
                    {p.installments.map((i) => (
                      <tr key={i.id}>
                        <td className="num">{i.seq}</td><td className="num">{fmtDate(i.dueDate)}</td><td><Money v={i.amount} /></td>
                        <td>{i.paid ? <span className="badge ok">{t('inst.paid')}</span> : i.overdue ? <span className="badge bad">{t('inst.late')}</span> : <span className="badge warn">{t('inst.pending')}</span>}</td>
                        <td>{!i.paid && <button className="btn sm primary" onClick={() => pay(i.id)}>{t('inst.markPaid')}</button>}</td>
                      </tr>
                    ))}
                  </tbody></table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
