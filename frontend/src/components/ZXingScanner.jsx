// frontend/src/components/ZXingScanner.jsx
import React, { useRef, useEffect, useState } from 'react';

const ZXingScanner = ({ onDetected, onClose }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('scanning'); // 'scanning', 'found', 'error'
  const [result, setResult] = useState('');
  
  // Referencias mutables para evitar ciclos de renderizado y cierres asíncronos limpios
  const readerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const initScanner = async () => {
      if (!videoRef.current) return;

      try {
        if (isMounted) setStatus('scanning');

        // 1. Carga dinámica de la librería para optimizar el bundle inicial del ERP
        const { BrowserMultiFormatReader } = await import('@zxing/library');
        
        if (!isMounted) return; // Cancelar si el usuario ya cerró el modal durante la descarga
        
        readerRef.current = new BrowserMultiFormatReader();

        // 2. Solicitar acceso exclusivo a la cámara trasera (environment)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        if (!isMounted) {
          // Si se desmontó justo mientras el usuario aceptaba el permiso de la cámara,
          // cerramos el stream inmediatamente de forma segura.
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;

        // Esperar a que los metadatos del vídeo estén listos para reproducir
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => resolve();
          } else {
            resolve();
          }
        });

        if (!isMounted) return;
        await videoRef.current.play();

        // 3. Iniciar el descodificador continuo sobre el elemento de vídeo
        readerRef.current.decodeFromVideoElement(videoRef.current, (decodeResult, error) => {
          if (!isMounted) return;

          if (decodeResult) {
            const detectedText = decodeResult.getText();
            setResult(detectedText);
            setStatus('found');
            
            // Notificar al componente padre de forma segura
            if (typeof onDetected === 'function') {
              onDetected(detectedText);
            }
          }
          // Ignoramos los errores continuos de escaneo (cuando no lee ningún código en un frame)
        });

      } catch (err) {
        console.error('Error crítico al inicializar el hardware del escáner:', err);
        if (isMounted) setStatus('error');
      }
    };

    initScanner();

    // Función de limpieza atómica (Cleanup function del useEffect)
    return () => {
      isMounted = false;
      
      // Detener de forma inmediata todos los tracks de vídeo abiertos
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Detener y resetear los hilos del lector de ZXing
      if (readerRef.current) {
        readerRef.current.reset();
        readerRef.current = null;
      }
    };
  }, [onDetected]);

  // Manejador para reintentar el acceso en caso de error de permisos
  const handleRetry = () => {
    setStatus('scanning');
    window.location.reload(); // Opción segura para refrescar el estado del hardware del navegador
  };

  return (
    <div className="relative w-full h-full min-h-[250px] bg-black flex items-center justify-center overflow-hidden rounded-lg">
      {/* Elemento de vídeo nativo donde se inyecta el stream WebRTC */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover ${status === 'scanning' ? 'block' : 'hidden'}`}
        muted
        playsInline
      />

      {/* Capa de UI sobrepuesta: Estado Escaneando */}
      {status === 'scanning' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          {/* Animación del marco del escáner */}
          <div className="w-64 h-40 border-2 border-indigo-500 rounded-lg relative flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <div className="w-full h-0.5 bg-red-500 animate-pulse absolute top-1/2 left-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          </div>
          <p className="text-white text-xs font-medium tracking-wider mt-4 bg-gray-900/80 px-3 py-1.5 rounded-full backdrop-blur-sm animate-pulse">
            Apunta a un código QR o código de barras
          </p>
        </div>
      )}

      {/* Capa de UI: Código Detectado con Éxito */}
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

      {/* Capa de UI: Error de Acceso al Hardware */}
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