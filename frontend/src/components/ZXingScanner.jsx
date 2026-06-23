// frontend/src/components/ZXingScanner.jsx
// Motor: ZBar compilado a WASM (mismo engine que Python pyzbar).
// WASM inlined en base64 → sin fichero externo, funciona en Chrome, Edge, Brave, Firefox y PWA.
import React, { useRef, useEffect, useState } from 'react';

const ZXingScanner = ({ onDetected }) => {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const cbRef     = useRef(onDetected);
  useEffect(() => { cbRef.current = onDetected; }, [onDetected]);

  const [status, setStatus] = useState('scanning'); // 'scanning' | 'error'
  const [scanKey, setScanKey] = useState(0);

  useEffect(() => {
    let active = true;
    const canvas = document.createElement('canvas');
    let ctx = null;

    const stop = () => {
      if (rafRef.current)    { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };

    const init = async () => {
      if (!videoRef.current) return;
      try {
        // Lazy-load: WASM en base64, sin fichero externo ni plugin de Vite
        const { scanImageData } = await import('@undecaf/zbar-wasm');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const scan = async () => {
          if (!active || !videoRef.current) return;
          const video = videoRef.current;

          if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
            rafRef.current = requestAnimationFrame(scan);
            return;
          }

          const { videoWidth: w, videoHeight: h } = video;
          if (!w || !h) { rafRef.current = requestAnimationFrame(scan); return; }

          // Reinicializar contexto solo cuando cambia la resolución del vídeo
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width  = w;
            canvas.height = h;
            ctx = canvas.getContext('2d', { willReadFrequently: true });
          }

          ctx.drawImage(video, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);

          try {
            const symbols = await scanImageData(imageData);
            if (symbols.length > 0) {
              stop();
              cbRef.current?.(symbols[0].decode());
            } else {
              rafRef.current = requestAnimationFrame(scan);
            }
          } catch {
            if (active) rafRef.current = requestAnimationFrame(scan);
          }
        };

        rafRef.current = requestAnimationFrame(scan);

      } catch (err) {
        console.error('Error de cámara o escáner:', err);
        if (active) setStatus('error');
      }
    };

    init();
    return () => { active = false; stop(); };
  }, [scanKey]);

  const handleRetry = () => { setStatus('scanning'); setScanKey(k => k + 1); };

  return (
    <div className="relative w-full h-full min-h-[160px] bg-black flex items-center justify-center overflow-hidden rounded-lg">
      <video
        ref={videoRef}
        className={status === 'scanning' ? 'w-full h-full object-cover' : 'hidden'}
        muted
        playsInline
      />

      {status === 'scanning' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div className="w-64 h-24 border-2 border-indigo-500 rounded-lg relative flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <div className="w-full h-0.5 bg-red-500 animate-pulse absolute top-1/2 left-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          </div>
          <p className="text-white text-xs font-medium tracking-wider mt-4 bg-gray-900/80 px-3 py-1.5 rounded-full backdrop-blur-sm animate-pulse">
            Centra el código en el recuadro
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center p-6 bg-white w-full h-full flex flex-col justify-center items-center z-10">
          <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mb-3">
            <span className="text-rose-600 text-2xl font-bold">✕</span>
          </div>
          <p className="text-rose-600 font-bold text-sm">Error de acceso a la cámara</p>
          <p className="text-xs text-slate-500 mt-2 px-6 leading-relaxed max-w-sm">
            Comprueba los permisos de cámara o que otra app no la esté usando.
          </p>
          <button
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
};

export default ZXingScanner;
