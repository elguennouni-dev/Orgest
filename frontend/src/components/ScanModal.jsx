import { useEffect, useRef, useState } from 'react';
import { Modal } from './ui.jsx';
import { useI18n } from '../i18n.jsx';

/** Scan caméra (BarcodeDetector). Appelle onCode(code) à chaque lecture distincte ; reste ouvert pour enchaîner. */
export default function ScanModal({ onCode, onClose }) {
  const { t } = useI18n();
  const video = useRef(null);
  const [err, setErr] = useState(null);
  const [last, setLast] = useState('');

  useEffect(() => {
    let stop = false; let stream; let timer; let prev = ''; let prevAt = 0;
    (async () => {
      try {
        const det = new window.BarcodeDetector({ formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'code_39', 'upc_a'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stop) { stream.getTracks().forEach((x) => x.stop()); return; }
        video.current.srcObject = stream; await video.current.play();
        const tick = async () => {
          if (stop) return;
          try {
            const r = await det.detect(video.current);
            const v = r[0]?.rawValue;
            if (v && (v !== prev || Date.now() - prevAt > 2500)) { prev = v; prevAt = Date.now(); setLast(v); onCode(v); }
          } catch { /* image non prête */ }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch { setErr(true); }
    })();
    return () => { stop = true; clearTimeout(timer); stream?.getTracks().forEach((x) => x.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal title={t('scan.title')} onClose={onClose}>
      {err ? <p role="alert">{t('scan.denied')}</p> : (
        <>
          <video ref={video} playsInline muted style={{ width: '100%', borderRadius: 12, background: '#000' }} />
          <p className="muted" style={{ textAlign: 'center' }} aria-live="polite">{last ? `✓ ${last}` : t('scan.hint')}</p>
        </>
      )}
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
        <button type="button" className="btn primary" onClick={onClose}>{t('scan.done')}</button>
      </div>
    </Modal>
  );
}
