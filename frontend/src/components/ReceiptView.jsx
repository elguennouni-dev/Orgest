import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { fmtDate, fmtMoney, fmtWeight, useI18n } from '../i18n.jsx';

const time = (v) => new Date(v).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Enveloppe d'impression : choix du format (A5 / ticket 80 mm) + bouton Imprimer. */
export function ReceiptFrame({ children }) {
  const { t } = useI18n();
  const [fmt, setFmt] = useState('a5');
  const page = fmt === 'a5' ? '@page { size: A5 portrait; margin: 8mm; }' : '@page { size: 80mm auto; margin: 3mm; }';
  return (
    <>
      <style>{page}</style>
      <div className="row no-print" style={{ marginBottom: 14 }}>
        <select style={{ width: 220 }} value={fmt} onChange={(e) => setFmt(e.target.value)}>
          <option value="a5">{t('receipt.a5')}</option>
          <option value="t80">{t('receipt.t80')}</option>
        </select>
        <button className="btn primary" onClick={() => window.print()}>🖨 {t('print')}</button>
      </div>
      <div className={'receipt ' + fmt}>{children}</div>
    </>
  );
}

function ShopHeader({ title, number, date }) {
  const { me } = useAuth();
  const { t } = useI18n();
  return (
    <>
      <h2>{me.shopName}</h2>
      <div className="center">
        {me.address && <div dir="auto">{me.address}{me.city ? ` — ${me.city}` : ''}</div>}
        {!me.address && me.city && <div dir="auto">{me.city}</div>}
        {me.phone && <div>{t('tel')}: <span className="num">{me.phone}</span></div>}
        {me.ice && <div>ICE: <span className="num">{me.ice}</span></div>}
      </div>
      <hr />
      <div className="center"><b>{title}</b></div>
      <div className="tot"><span>N° <b className="num">{number}</b></span><span className="num">{fmtDate(date)} {time(date)}</span></div>
    </>
  );
}

function Footer({ signatures }) {
  const { me } = useAuth();
  const { t } = useI18n();
  return (
    <>
      {signatures && <div className="sign"><div>{t('receipt.signShop')}</div><div>{t('receipt.signCustomer')}</div></div>}
      <hr />
      <div className="center">{me.receiptFooter || t('receipt.thanks')}</div>
    </>
  );
}

export function SaleReceipt({ sale }) {
  const { t } = useI18n();
  const isEx = sale.type === 'EXCHANGE';
  const paid = Number(sale.downPayment);
  return (
    <>
      <ShopHeader title={isEx ? t('receipt.exchangeTitle') : t('receipt.saleTitle')} number={sale.number} date={sale.createdAt} />
      {(sale.customerName || sale.customerPhone) && (
        <div>{t('customer')}: <b>{sale.customerName || ''}</b> {sale.customerPhone && <span className="num">({sale.customerPhone})</span>}</div>
      )}
      <hr />
      <table className="lines">
        <thead><tr><th>{t('receipt.item')}</th><th>{t('karat')}</th><th>{t('weightG')}</th><th>{t('receipt.pricePerG')}</th><th>{t('receipt.making')}</th><th>{t('total')}</th></tr></thead>
        <tbody>
          {sale.lines.map((l, i) => (
            <tr key={i}>
              <td className="desc">{l.description}</td>
              <td className="k" data-label={t('karat')}>{l.karat}K</td>
              <td className="num w" data-label={t('weightG')}>{l.quantity > 1 ? `${l.quantity} × ` : ''}{fmtWeight(l.weightG)} g</td>
              <td className="num p" data-label={t('receipt.pricePerG')}>{fmtMoney(l.pricePerGram)}</td>
              <td className="num m" data-label={t('receipt.making')}>{fmtMoney(l.makingPerGram)}</td>
              <td className="num tt">{fmtMoney(l.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="tot"><span>{t('receipt.subtotal')}</span><b className="num">{fmtMoney(sale.subtotal)} {t('dh')}</b></div>
      {sale.buyback && (
        <div className="tot">
          <span>− {t('receipt.tradeIn')} ({sale.buyback.karat}K · <span className="num">{fmtWeight(sale.buyback.netWeightG)} g × {fmtMoney(sale.buyback.pricePerGram)}</span>)</span>
          <b className="num">{fmtMoney(sale.tradeInAmount)} {t('dh')}</b>
        </div>
      )}
      <div className="tot big">
        <span>{Number(sale.balance) < 0 ? t('receipt.refund') : t('receipt.toPay')}</span>
        <span className="num">{fmtMoney(Math.abs(sale.balance))} {t('dh')}</span>
      </div>
      {sale.payMethod && <div className="tot"><span>{t('paym.label')}</span><b>{t('paym.' + sale.payMethod)}</b></div>}
      {sale.paymentMode === 'INSTALLMENT' ? (
        <>
          <div className="tot"><span>{t('receipt.paidNow')}</span><b className="num">{fmtMoney(paid)} {t('dh')}</b></div>
          <hr />
          <div><b>{t('receipt.schedule', { n: sale.months })}</b></div>
          <table><tbody>
            {sale.installments.map((i) => (
              <tr key={i.id}><td className="num">{i.seq}</td><td className="num">{fmtDate(i.dueDate)}</td><td className="num">{fmtMoney(i.amount)} {t('dh')}</td></tr>
            ))}
          </tbody></table>
          <p>{t('receipt.lockedPrice')}</p>
        </>
      ) : (
        Number(sale.balance) < 0
          ? <div className="tot"><span>{t('receipt.refunded')}</span><b className="num">{fmtMoney(Math.abs(sale.balance))} {t('dh')}</b></div>
          : <div className="tot"><span>{t('receipt.paidCash')}</span><b className="num">{fmtMoney(paid)} {t('dh')}</b></div>
      )}
      <Footer signatures />
    </>
  );
}

export function BuybackReceipt({ b }) {
  const { t } = useI18n();
  return (
    <>
      <ShopHeader title={t('receipt.buybackTitle')} number={b.number} date={b.createdAt} />
      <div>{t('customer')}: <b>{b.customerName || '—'}</b></div>
      {b.customerPhone && <div>{t('phone')}: <span className="num">{b.customerPhone}</span></div>}
      {b.customerCin && <div>CIN: <span className="num">{b.customerCin}</span></div>}
      <hr />
      {b.description && <div>{b.description}</div>}
      <div className="tot"><span>{t('karat')}</span><b>{b.karat}K</b></div>
      <div className="tot"><span>{t('buyback.gross')}</span><b className="num">{fmtWeight(b.grossWeightG)} g</b></div>
      <div className="tot"><span>{t('buyback.deduction')}</span><b className="num">{fmtMoney(b.deductionPct)} %</b></div>
      <div className="tot"><span>{t('buyback.net')}</span><b className="num">{fmtWeight(b.netWeightG)} g</b></div>
      <div className="tot"><span>{t('receipt.pricePerG')}</span><b className="num">{fmtMoney(b.pricePerGram)} {t('dh')}</b></div>
      <div className="tot big"><span>{t('receipt.amountPaid')}</span><span className="num">{fmtMoney(b.total)} {t('dh')}</span></div>
      <p className="center">{t('receipt.buybackDecl')}</p>
      <Footer signatures />
    </>
  );
}
