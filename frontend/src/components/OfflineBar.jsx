import { useCallback, useEffect, useState } from 'react';
import { discardSale, flushQueue, OFFLINE_EVENT, pendingSales, prefetchStock } from '../lib/sync.js';
import { fmtMoney, useI18n } from '../i18n.jsx';

/** Bandeau : hors ligne / ventes en attente de synchronisation / ventes refusées à la synchronisation. */
export default function OfflineBar() {
  const { t } = useI18n();
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => pendingSales().then(setList).catch(() => {}), []);
  const sync = useCallback(async () => {
    setBusy(true);
    try { await flushQueue(); } catch { /* réessai plus tard */ }
    setBusy(false); load();
  }, [load]);

  useEffect(() => {
    load();
    if (navigator.onLine) { sync(); prefetchStock().catch(() => {}); }
    const on = () => { setOnline(true); sync(); };
    const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off); window.addEventListener(OFFLINE_EVENT, load);
    const timer = setInterval(() => { if (navigator.onLine) sync(); }, 60000);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); window.removeEventListener(OFFLINE_EVENT, load); clearInterval(timer); };
  }, [load, sync]);

  const waiting = list.filter((e) => !e.failed);
  const failed = list.filter((e) => e.failed);
  if (online && list.length === 0) return null;
  return (
    <div className="offbar no-print" role="status" aria-live="polite">
      {!online && <div className="off">{t('off.offline')}</div>}
      {waiting.length > 0 && (
        <div className="wait">
          {t('off.waiting', { n: waiting.length })}
          {online && <button type="button" className="btn sm" disabled={busy} onClick={sync}>{busy ? t('loading') : t('off.syncNow')}</button>}
        </div>
      )}
      {failed.map((e) => (
        <div className="bad" key={e.clientRef}>
          {t('off.failed', { c: e.summary?.customer || '—', a: fmtMoney(e.summary?.total || 0) })} — {t('err.' + e.code)}
          <button type="button" className="btn sm" onClick={() => discardSale(e.clientRef).then(load)}>{t('off.discard')}</button>
        </div>
      ))}
    </div>
  );
}
