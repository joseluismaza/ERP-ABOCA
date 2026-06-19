// frontend/src/components/ZXingScanner.jsx
import React, { useRef, useEffect, useState } from 'react';

const ZXingScanner = ({ onDetected, onClose }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('scanning'); // 'scanning', 'found', 'error'
  const [result, setResult] = useState('');

  // Referencia mutable al lector de ZXing para poder resetearlo en el cleanup
  const readerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const initScanner = async () => {
      if (!videoRef.current) return;

      try {
        // Carga dinámica de la librería para optimizar el bundle inicial
        const { BrowserMultiFormatReader } = await import('@zxing/library');

        if (!isMounted) return;

        readerRef.current = new BrowserMultiFormatReader();

        // decodeFromConstraints gestiona el stream de cámara internamente (API correcta en v0.20+).
        // No hay que llamar a getUserMedia, srcObject ni play() manualmente.
        await readerRef.current.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (decodeResult, error) => {
            if (!isMounted) return;

            if (decodeResult) {
              const detectedText = decodeResult.getText();
              setResult(detectedText);
              setStatus('found');

              if (typeof onDetected === 'function') {
                onDetected(detectedText);
              }
            }
            // Los errores de frame sin código (NotFoundException) son normales, se ignoran.
          }
        );

      } catch (err) {
        console.error('Error crítico al inicializar el hardware del escáner:', err);
        if (isMounted) setStatus('error');
      }
    };

    initScanner();

    // Cleanup: reset() detiene el stream y libera la cámara
    return () => {
      isMounted = false;
      if (readerRef.current) {
        readerRef.current.reset();
        readerRef.current = null;
      }
    };
  }, []); // Sin dependencias: el escáner se monta una sola vez

  const handleRetry = () => {
    setStatus('scanning');
    window.location.reload();
  };

  return (
    <div className="relative w-full h-full min-h-[250px] bg-black flex items-center justify-center overflow-hidden rounded-lg">
      {/* Elemento de vídeo donde ZXing inyecta el stream */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${status === 'scanning' ? 'block' : 'hidden'}`}
        muted
        playsInline
      />

      {/* Estado: Escaneando */}
      {status === 'scanning' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div className="w-64 h-40 border-2 border-indigo-500 rounded-lg relative flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <div className="w-full h-0.5 bg-red-500 animate-pulse absolute top-1/2 left-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          </div>
          <p className="text-white text-xs font-medium tracking-wider mt-4 bg-gray-900/80 px-3 py-1.5 rounded-full backdrop-blur-sm animate-pulse">
            Apunta a un código QR o código de barras
          </p>
        </div>
      )}

      {/* Estado: Código detectado con éxito */}
      {status === 'found' && (
        <div className="text-center p-6 bg-white w-full h-full flex flex-col justify-center items-center z-10 animate-fadeIn">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
            <span className="text-emerald-600 text-3xl font-bold">✓</span>
          </div>
          <p className="text-slate-800 font-bold text-lg">¡Código Detectado!</p>
          <p className="text-slate-500 font-mono text-xs bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg mt-2 max-w-xs break-all select-all">
            {result}
          </p>
        </div>
      )}

      {/* Estado: Error de acceso al hardware */}
      {status === 'error' && (
        <div className="text-center p-6 bg-white w-full h-full flex flex-col justify-center items-center z-10 animate-fadeIn">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-3">
            <span className="text-rose-600 text-3xl font-bold">✕</span>
          </div>
          <p className="text-rose-600 font-bold">Error de acceso a la cámara</p>
          <p className="text-xs text-slate-500 mt-2 px-6 leading-relaxed max-w-sm">
            Asegúrate de dar permisos de cámara al navegador o verifica que otra pestaña o aplicación no la esté bloqueando.
          </p>
          <button
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
          >
            Reintentar inicialización
          </button>
        </div>
      )}
    </div>
  );
};

export default ZXingScanner;
