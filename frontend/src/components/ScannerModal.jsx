// frontend/src/components/ScannerModal.jsx
import React from 'react';
import ZXingScanner from './ZXingScanner';

const ScannerModal = ({ isOpen, onClose, onDetected }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100">
        <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shadow-md">
          <h3 className="font-bold text-base tracking-wide">Escáner Óptico de Dispositivos</h3>
          <button onClick={onClose} className="text-white hover:text-indigo-200 transition-colors text-lg p-1">✕</button>
        </div>
        <div className="p-4 bg-slate-50">
          <div className="w-full h-[280px] rounded-xl overflow-hidden border-2 border-slate-200 shadow-inner bg-black">
            <ZXingScanner onDetected={onDetected} onClose={onClose} />
          </div>
        </div>
        <div className="p-3.5 bg-slate-100 text-center text-xs text-slate-500 font-semibold border-t border-slate-200/60">
          Enfoque el código de barras, IMEI o código QR con la cámara trasera.
        </div>
      </div>
    </div>
  );
};

export default ScannerModal;