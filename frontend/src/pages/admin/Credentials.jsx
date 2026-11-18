import { useState } from 'react';
import { useI18n } from '../../i18n.jsx';
import { Modal } from '../../components/ui.jsx';
import { waPhone } from '../../hooks.js';

/** Affichage UNIQUE des identifiants générés (le mot de passe n'est jamais ré-affichable ensuite). */
export default function Credentials({ cred, phone, onClose }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const url = window.location.origin + '/login';
  const text = t('admin.credText', { url, u: cred.username, p: cred.password });
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* ignore */ }
  };
  const wa = waPhone(phone);
  return (
    <Modal title={t('admin.credTitle')} onClose={onClose}>
      <div className="stack">
        <div className="okbox">{t('admin.credWarn')}</div>
        <pre className="card" style={{ margin: 0, whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left', background: 'var(--gold-50)' }}>{text}</pre>
        <div className="row">
          <button className="btn primary" onClick={copy}>{copied ? '✓ ' + t('copied') : t('copy')}</button>
          {wa && <a className="btn wa" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`}>WhatsApp</a>}
          <button className="btn" onClick={onClose}>{t('close')}</button>
        </div>
      </div>
    </Modal>
  );
}
