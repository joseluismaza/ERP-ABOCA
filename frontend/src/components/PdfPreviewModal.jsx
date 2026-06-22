// frontend/src/components/PdfPreviewModal.jsx
import React, { useState, useEffect } from 'react';
import { Download, Send, X } from 'lucide-react';

/**
 * Modal de previsualización de PDF con formulario de envío por correo.
 *
 * Props:
 *   isOpen            {boolean}   - Controla la visibilidad del modal
 *   onClose           {function}  - Callback al cerrar
 *   pdfBlob           {Blob}      - PDF generado para mostrar en el iframe
 *   fileName          {string}    - Nombre del archivo para la descarga
 *   defaultAsunto     {string}    - Asunto pre-rellenado
 *   defaultDestinatarios {string} - Destinatarios pre-rellenados (separados por coma)
 *   defaultCuerpo     {string}    - Cuerpo del mensaje pre-rellenado
 *   onEnviar          {function}  - Callback({ destinatarios[], asunto, cuerpo }) al enviar
 */
const PdfPreviewModal = ({
  isOpen,
  onClose,
  pdfBlob,
  fileName,
  defaultAsunto = '',
  defaultDestinatarios = '',
  defaultCuerpo = '',
  onEnviar
}) => {
  const [blobUrl, setBlobUrl]           = useState(null);
  const [asunto, setAsunto]             = useState(defaultAsunto);
  const [destinatarios, setDestinatarios] = useState(defaultDestinatarios);
  const [cuerpo, setCuerpo]             = useState(defaultCuerpo);
  const [enviando, setEnviando]         = useState(false);

  // Crear y limpiar la URL del blob cada vez que el PDF o la visibilidad cambia
  useEffect(() => {
    if (!pdfBlob || !isOpen) return;
    const url = URL.createObjectURL(pdfBlob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdfBlob, isOpen]);

  // Sincronizar los campos por defecto cuando el modal se abre con un nuevo PDF
  useEffect(() => {
    if (isOpen) {
      setAsunto(defaultAsunto);
      setDestinatarios(defaultDestinatarios);
      setCuerpo(defaultCuerpo);
      setEnviando(false);
    }
  }, [isOpen, defaultAsunto, defaultDestinatarios, defaultCuerpo]);

  if (!isOpen) return null;

  const handleDescargar = () => {
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEnviar = async () => {
    const listaDestinatarios = destinatarios
      .split(',')
      .map(d => d.trim())
      .filter(Boolean);

    if (!listaDestinatarios.length) {
      alert('Añade al menos un destinatario antes de enviar.');
      return;
    }
    if (!asunto.trim()) {
      alert('El asunto no puede estar vacío.');
      return;
    }

    setEnviando(true);
    try {
      await onEnviar({ destinatarios: listaDestinatarios, asunto, cuerpo });
      alert(`✅ Correo enviado correctamente a: ${listaDestinatarios.join(', ')}`);
      onClose();
    } catch (err) {
      alert(`❌ Error al enviar el correo: ${err.message || 'Inténtalo de nuevo.'}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-100">

        {/* Cabecera */}
        <div className="bg-slate-800 px-5 py-3.5 flex justify-between items-center text-white shrink-0">
          <div>
            <h3 className="font-bold text-sm tracking-wide">Previsualización del documento</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">{fileName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo: iframe + formulario */}
        <div className="flex flex-1 overflow-hidden">

          {/* Panel izquierdo: Preview PDF */}
          <div className="flex-1 bg-slate-100 border-r border-slate-200">
            {blobUrl
              ? <iframe src={blobUrl} title="Vista previa PDF" className="w-full h-full" />
              : <div className="flex items-center justify-center h-full text-slate-400 text-sm">Cargando vista previa...</div>
            }
          </div>

          {/* Panel derecho: Formulario de correo */}
          <div className="w-96 flex flex-col p-5 gap-4 overflow-y-auto bg-white shrink-0">

            <div>
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide mb-3">
                Enviar por correo
              </h4>

              {/* Destinatarios */}
              <div className="flex flex-col gap-1 mb-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  Destinatarios <span className="text-slate-400 font-normal normal-case">(separados por coma)</span>
                </label>
                <input
                  type="text"
                  value={destinatarios}
                  onChange={e => setDestinatarios(e.target.value)}
                  placeholder="correo@aboca.es, otro@aboca.es"
                  className="border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:outline-indigo-500 bg-slate-50"
                />
              </div>

              {/* Asunto */}
              <div className="flex flex-col gap-1 mb-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Asunto</label>
                <input
                  type="text"
                  value={asunto}
                  onChange={e => setAsunto(e.target.value)}
                  className="border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:outline-indigo-500 bg-slate-50"
                />
              </div>

              {/* Cuerpo */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">Cuerpo del mensaje</label>
                <textarea
                  rows={12}
                  value={cuerpo}
                  onChange={e => setCuerpo(e.target.value)}
                  className="border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:outline-indigo-500 bg-slate-50 resize-none leading-relaxed"
                />
              </div>

              {/* Nota PDF adjunto */}
              <p className="text-[10px] text-slate-400 font-medium mt-2.5 bg-slate-50 rounded-lg p-2 border border-slate-100">
                📎 El PDF se adjuntará automáticamente al correo.
              </p>
            </div>

          </div>
        </div>

        {/* Footer de acciones */}
        <div className="bg-white px-5 py-3.5 border-t border-slate-100 flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={handleDescargar}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Download size={13} /> Descargar PDF
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleEnviar}
              disabled={enviando}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-xl transition-colors shadow-sm"
            >
              <Send size={13} /> {enviando ? 'Enviando...' : 'Enviar por correo'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PdfPreviewModal;
