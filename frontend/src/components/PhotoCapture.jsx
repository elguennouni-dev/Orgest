import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n.jsx';

const OUT = 1024;

/**
 * Capture / import d'une photo, TOUJOURS recadrée en carré (aperçu carré, glisser + zoom).
 * Sortie : Blob JPEG 1024x1024 transmis à onChange. Le serveur ré-encode et valide de toute façon.
 */
export default function PhotoCapture({ onChange, existingUrl }) {
  const { t } = useI18n();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const imgRef = useRef(null);
  const drag = useRef(null);
  const [live, setLive] = useState(false);
  const [hasImg, setHasImg] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');

  const stopStream = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setLive(false);
  }, []);
  useEffect(() => stopStream, [stopStream]);

  const draw = useCallback((size) => {
    const img = imgRef.current;
    const cv = canvasRef.current;
    if (!img || !cv) return;
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    const base = Math.min(img.width, img.height) / zoom;
    const maxX = (img.width - base) / 2, maxY = (img.height - base) / 2;
    const sx = img.width / 2 - base / 2 + Math.max(-maxX, Math.min(maxX, off.x * base));
    const sy = img.height / 2 - base / 2 + Math.max(-maxY, Math.min(maxY, off.y * base));
    ctx.drawImage(img, sx, sy, base, base, 0, 0, size, size);
  }, [zoom, off]);

  const emit = useCallback(() => {
    const prev = canvasRef.current;
    if (!imgRef.current || !prev) return;
    const previewSize = prev.width;
    draw(OUT); // rendu final haute résolution (toBlob capture l'image immédiatement)
    prev.toBlob((b) => onChange(b), 'image/jpeg', 0.88);
    draw(previewSize);
  }, [draw, onChange]);

  useEffect(() => { if (hasImg) { draw(360); } }, [hasImg, draw]);
  useEffect(() => {
    if (!hasImg) return undefined;
    const id = setTimeout(emit, 250);
    return () => clearTimeout(id);
  }, [hasImg, zoom, off, emit]);

  const loadFromSource = (src, revoke) => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; setZoom(1); setOff({ x: 0, y: 0 }); setHasImg(true); if (revoke) URL.revokeObjectURL(src); };
    img.onerror = () => setError(t('photo.error'));
    img.src = src;
  };

  const onFile = (e) => {
    setError('');
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(f.type) && !f.type.startsWith('image/')) { setError(t('photo.error')); return; }
    stopStream();
    loadFromSource(URL.createObjectURL(f), true);
  };

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1600 }, height: { ideal: 1600 } }, audio: false });
      streamRef.current = stream;
      setLive(true);
      setHasImg(false);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); } }, 0);
    } catch {
      setError(t('photo.cameraDenied'));
    }
  };

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const cv = document.createElement('canvas');
    cv.width = v.videoWidth; cv.height = v.videoHeight;
    cv.getContext('2d').drawImage(v, 0, 0);
    stopStream();
    loadFromSource(cv.toDataURL('image/jpeg', 0.92), false);
  };

  const onDown = (e) => { if (!hasImg) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y }; };
  const onMove = (e) => {
    if (!drag.current) return;
    const w = e.currentTarget.clientWidth;
    setOff({ x: drag.current.ox - (e.clientX - drag.current.x) / w / zoom, y: drag.current.oy - (e.clientY - drag.current.y) / w / zoom });
  };
  const onUp = () => { drag.current = null; };

  return (
    <div className="capture">
      <div className="square" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {live && <video ref={videoRef} playsInline muted />}
        {!live && hasImg && <canvas ref={canvasRef} />}
        {!live && !hasImg && (
          existingUrl
            ? <img src={existingUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div className="empty">{t('photo.empty')}</div>
        )}
      </div>
      {hasImg && !live && (
        <label className="row" style={{ width: 'min(100%,360px)' }}>
          <span className="hint">{t('photo.zoom')}</span>
          <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="grow" />
        </label>
      )}
      <div className="row">
        {!live && <button type="button" className="btn dark" onClick={startCamera}>📷 {t('photo.camera')}</button>}
        {live && <button type="button" className="btn primary" onClick={snap}>● {t('photo.snap')}</button>}
        {live && <button type="button" className="btn" onClick={stopStream}>{t('cancel')}</button>}
        <label className="btn">
          🖼 {t('photo.choose')}
          <input type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />
        </label>
      </div>
      {error && <div className="err">{error}</div>}
    </div>
  );
}
