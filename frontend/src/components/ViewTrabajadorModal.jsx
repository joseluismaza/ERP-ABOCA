// frontend/src/components/ViewTrabajadorModal.jsx
import React, { useState, useMemo } from 'react';
import { useGlobalData } from '../contexts/GlobalDataContext';
import { revelarCredenciales as revelarCredencialesApi, descargarLlaveroCredenciales } from '../services/trabajadorService';
import { FileText, Download, HardDrive, KeyRound, Globe, Mail, Landmark, Sliders } from 'lucide-react';

const ViewTrabajadorModal = ({ item, onClose }) => {
  if (!item) return null;

  const [activeTab, setActiveTab] = useState('expediente'); // 'expediente' o 'credenciales'
  const [procesandoPdf, setProcesandoPdf] = useState(false);
  const [confirmarPass, setConfirmarPass] = useState('');
  const [autorizadoCredenciales, setAutorizadoCredenciales] = useState(false);
  const [verificandoPass, setVerificandoPass] = useState(false);

  // 🔒 Contraseñas reales (descifradas) del trabajador, obtenidas SOLO tras
  // reconfirmar la contraseña del administrador. Mientras no se confirma,
  // permanecen vacías: el backend nunca envía password/passwordApple por defecto.
  const [credenciales, setCredenciales] = useState({ password: null, passwordApple: null });

  const { materiales = [] } = useGlobalData() || {};

  // 🛠️ RELACIÓN CRUZADA INVERSA BLINDADA CONTRA NULOS
  const equipamientoAsignado = useMemo(() => {
    const idTrabajador = item._id || item.id;
    return materiales.filter(m => {
      const idAsig = m.TrabajadorId?._id || m.TrabajadorId || m.asignadoA?._id || m.asignadoA;
      return idAsig && idAsig.toString() === idTrabajador.toString();
    });
  }, [item._id, item.id, materiales]);

  // Filtrado de propiedades del esquema. password/passwordApple ya no llegan desde
  // el backend (se ocultan siempre), pero se excluyen también aquí por si acaso.
  const camposLimpiosBBDD = useMemo(() => {
    const ignorarCampos = ['_id', 'id', 'createdAt', 'updatedAt', '__v', 'salt', 'password', 'passwordApple'];
    return Object.entries(item).filter(([key]) => !ignorarCampos.includes(key));
  }, [item]);

  // Cambia de pestaña y, si se sale de "credenciales", olvida las contraseñas
  // descifradas que hubiera en memoria (hay que reconfirmar para volver a verlas).
  const handleCambiarTab = (tab) => {
    if (tab !== 'credenciales') {
      setAutorizadoCredenciales(false);
      setCredenciales({ password: null, passwordApple: null });
      setConfirmarPass('');
    }
    setActiveTab(tab);
  };


  // Desafío de seguridad: Re-autenticación de la sesión en caliente.
  // En una sola petición: el backend valida la contraseña del administrador y,
  // si es correcta, descifra y devuelve las contraseñas reales del trabajador.
  const handleVerificarPassword = async (e) => {
    e.preventDefault();
    setVerificandoPass(true);
    try {
      const idTrabajador = item._id || item.id;
      const datos = await revelarCredencialesApi(idTrabajador, confirmarPass);

      setCredenciales({
        password: datos.password,
        passwordApple: datos.passwordApple
      });
      setAutorizadoCredenciales(true);
    } catch (err) {
      console.error(err);
      const mensajeError = err.message || 'Contraseña incorrecta o error de comunicación. Acceso denegado.';
      alert(`❌ ${mensajeError}`);
      setConfirmarPass('');
    } finally {
      setVerificandoPass(false);
    }
  };

  // Guardado y exportación de credenciales dinámicas en PDF
  const handleExportarLlaveroPdf = async () => {
    setProcesandoPdf(true);
    try {
      const idTrabajador = item._id || item.id;

      const pdfBlob = await descargarLlaveroCredenciales(idTrabajador);

      const blob = new Blob([pdfBlob], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Credenciales_Aboca_${item.nombre.toUpperCase()}_${item.apellidos.toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`🔒 Llavero Corporativo Exportado. El PDF se ha descargado cifrado. La contraseña de apertura es el DNI/NIE de ${item.nombre} en mayúsculas y sin guiones.`);
    } catch (err) {
      console.error("Error detallado de la descarga:", err);
      // Muestra una ayuda más técnica si sigue fallando la ruta
      if (err.status === 404) {
        alert('Error 404: El endpoint de descarga no se encuentra en el backend. Revisa que el enrutador tenga definido /api/trabajadores/:id/credenciales-lote o la ruta equivalente.');
      } else {
        alert('Error crítico al procesar y cifrar el lote de credenciales.');
      }
    } finally {
      setProcesandoPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl flex flex-col max-h-[88vh]">
        
        {/* Cabecera */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
          <div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md uppercase tracking-wider">Ficha de Personal</span>
            <h3 className="text-base font-black text-slate-800 mt-1">{item.nombre} {item.apellidos}</h3>
          </div>
          <button onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-slate-600">✕ Cerrar</button>
        </div>

        {/* Sistema de Pestañas Nav */}
        <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-bold">
          <button onClick={() => handleCambiarTab('expediente')} className={`flex-1 py-3 text-center border-b-2 transition-all ${activeTab === 'expediente' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>📋 Expediente Laboral</button>
          <button onClick={() => handleCambiarTab('credenciales')} className={`flex-1 py-3 text-center border-b-2 transition-all ${activeTab === 'credenciales' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>🔑 Credenciales del Ecosistema</button>
        </div>

        {/* Contenido Dinámico */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[60vh] space-y-4 bg-slate-50/30">
          
          {activeTab === 'expediente' ? (
            <div className="space-y-4">
              {/* Grid de Datos del Expediente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {camposLimpiosBBDD.map(([clave, valor]) => {
                  return (
                    <div key={clave} className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                      <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-0.5">{clave}</span>
                      <span className="text-xs font-bold text-slate-700">{valor === true ? 'Sí' : valor === false ? 'No' : String(valor || 'N/A')}</span>
                    </div>
                  );
                })}
              </div>

              {/* Inventario de hardware asignado en tiempo real */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-slate-600 uppercase flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-slate-400" /> Equipamiento Corporativo Custodiado ({equipamientoAsignado.length})</h4>
                {equipamientoAsignado.length > 0 ? (
                  <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-xs">
                    {equipamientoAsignado.map(mat => (
                      <div key={mat._id} className="p-3 flex justify-between items-center hover:bg-slate-50/50 bg-white transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600"><FileText className="w-3.5 h-3.5" /></div>
                          <div>
                            <p className="text-xs font-black text-slate-800">{mat.marca} {mat.modelo}</p>
                            <p className="text-[10px] text-slate-400 font-mono">S/N: {mat.sn || 'No reg.'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200 uppercase">{mat.tipo}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs font-medium bg-white rounded-xl border border-dashed border-slate-200">
                    Este trabajador no posee ningún activo asignado actualmente.
                  </div>
                )}
              </div>
            </div>
          ) : (
          /* 🔑 PESTAÑA 2: CREDENCIALES COMPLETA DEL ECOSISTEMA GRUPPO ABOCA */
            <div className="space-y-4">
            {!autorizadoCredenciales ? (
                <form onSubmit={handleVerificarPassword} className="p-6 bg-white rounded-2xl border border-slate-200/60 shadow-md space-y-3 max-w-sm mx-auto text-center mt-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600 mb-1">
                    <KeyRound size={20} />
                </div>
                <h4 className="text-xs font-black text-slate-700 uppercase">Confirmación de Seguridad</h4>
                <p className="text-[11px] text-slate-500 font-medium">Está accediendo a información de identidad confidencial. Por favor, re-introduzca su clave de acceso ERP:</p>
                <input 
                    type="password" 
                    required
                    placeholder="Contraseña del Administrador" 
                    value={confirmarPass}
                    onChange={(e) => setConfirmarPass(e.target.value)}
                    className="w-full p-2.5 text-xs font-bold border border-slate-200 bg-white rounded-xl text-center focus:outline-indigo-600 shadow-inner"
                />
                <button type="submit" disabled={verificandoPass} className="w-full py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-xs font-black rounded-xl transition-colors shadow-sm">
                  {verificandoPass ? 'Verificando...' : 'Validar Identidad'}
                </button>
                </form>
            ) : (
                <div className="space-y-3">
                {/* Banner de Autorización y Botón de Exportación */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-800 font-bold flex items-center justify-between shadow-xs">
                    <span>🛡️ Acceso Autorizado. Llavero de Sistemas para {item.nombre} {item.apellidos}.</span>
                    <button onClick={handleExportarLlaveroPdf} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-lg flex items-center gap-1 transition-colors">
                    <Download size={12} /> Exportar Llavero Seguro
                    </button>
                </div>

                {/* Grid del Ecosistema de Aplicaciones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* 1. Office365 & Mail */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                    <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-500" /> Office365 & Mail</h5>
                    <div className="text-[11px] space-y-0.5">
                        <p className="text-slate-500 font-medium">Usuario: <span className="font-bold text-slate-700">{item.emailAboca || 'N/A'}</span></p>
                        <p className="text-slate-500 font-medium">Contraseña: <span className="font-mono font-bold text-slate-700">{credenciales.password || 'N/A'}</span></p>
                    </div>
                    </div>

                    {/* 2. CYTRIC */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                    <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-indigo-500" /> CYTRIC – Hoteles/Billetes</h5>
                    <div className="text-[11px] space-y-0.5">
                        <p className="text-[9px] text-indigo-600 font-bold truncate block">amadeus.cytric.net/env-a/ibe/...</p>
                        <p className="text-slate-500 font-medium">Usuario: <span className="font-bold text-slate-700">{item.emailAboca || 'N/A'}</span></p>
                        <p className="text-slate-500 font-medium">Contraseña: <span className="font-mono font-bold text-slate-700">Aboca02+</span></p>
                    </div>
                    </div>

                    {/* 3. ServiceTonic */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                    <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5"><Sliders className="w-3.5 h-3.5 text-amber-500" /> Incidencias ServiceTonic <span className="text-[9px] text-slate-400 lowercase font-medium">(Por confirmar)</span></h5>
                    <div className="text-[11px] space-y-0.5">
                        <p className="text-[9px] text-amber-600 font-bold truncate block">aboca.myservicetonic.com/...</p>
                        {/* ✂️ Limpieza visual en el cliente del prefijo "31" */}
                        <p className="text-slate-500 font-medium">Usuario: <span className="font-bold text-slate-700">
                        {item.codComercial && String(item.codComercial).startsWith('31') 
                            ? String(item.codComercial).slice(2) 
                            : item.codComercial || 'N/A'}
                        </span></p>
                        <p className="text-slate-500 font-medium">Contraseña: <span className="font-mono font-bold text-slate-700">12345678</span></p>
                    </div>
                    </div>

                    {/* 4. ORDINI */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                    <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5 text-emerald-500" /> ORDINI <span className="text-[9px] text-slate-400 lowercase font-medium">(Por confirmar)</span></h5>
                    <div className="text-[11px] space-y-0.5">
                        <p className="text-[9px] text-slate-400 font-mono">HostName: Interno ERP</p>
                        <p className="text-slate-500 font-medium">Usuario: <span className="font-mono font-bold text-slate-800 uppercase">{String(item.username || '').toUpperCase() || 'N/A'}</span></p>
                        <p className="text-slate-500 font-medium">Contraseña: <span className="font-mono font-bold text-slate-800 uppercase">{String(credenciales.password || '').toUpperCase() || 'N/A'}</span></p>
                    </div>
                    </div>

                    {/* 5. WEBREPORT */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                    <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-teal-500" /> WEBREPORT</h5>
                    <div className="text-[11px] space-y-0.5">
                        <p className="text-[9px] text-teal-600 font-bold truncate block">webreport.aboca.dom</p>
                        <p className="text-slate-500 font-medium">Usuario: <span className="font-mono font-bold text-slate-800 uppercase">{String(item.username || '').toUpperCase() || 'N/A'}</span></p>
                        <p className="text-slate-500 font-medium">Contraseña: <span className="font-mono font-bold text-slate-800 uppercase">{String(credenciales.password || '').toUpperCase() || 'N/A'}</span></p>
                    </div>
                    </div>

                    {/* 6. ABOCA MANAGER */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                    <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5 text-purple-500" /> ABOCA MANAGER</h5>
                    <div className="text-[11px] space-y-0.5">
                        <p className="text-slate-500 font-medium">Usuario: <span className="font-mono font-bold text-slate-800 uppercase">{String(item.username || '').toUpperCase() || 'N/A'}</span></p>
                        <p className="text-slate-500 font-medium">Contraseña: <span className="font-mono font-bold text-slate-800 uppercase">{String(credenciales.password || '').toUpperCase() || 'N/A'}</span></p>
                    </div>
                    </div>

                    {/* 7. Aboca Reporting */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                    <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-cyan-500" /> Aboca Reporting</h5>
                    <div className="text-[11px] space-y-0.5">
                        <p className="text-[9px] text-cyan-600 font-bold truncate block">reporting.aboca.dom</p>
                        <p className="text-slate-500 font-medium">Usuario: <span className="font-bold text-slate-700">{item.emailAboca || 'N/A'}</span></p>
                        <p className="text-slate-500 font-medium">Contraseña: <span className="font-mono font-bold text-slate-700">{credenciales.password || 'N/A'}</span></p>
                    </div>
                    </div>

                    {/* 8. Apple ID & Dispositivos Movilidad */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
                    <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">🍏 Apple ID & Terminales</h5>
                    <div className="text-[11px] space-y-0.5">
                        <p className="text-slate-500 font-medium">Apple ID: <span className="font-bold text-slate-700">{item.appleID || 'N/A'}</span></p>
                        <p className="text-slate-500 font-medium">Contraseña: <span className="font-mono font-bold text-slate-700">{credenciales.passwordApple || 'N/A'}</span></p>
                        <div className="mt-1 pt-1 border-t border-slate-100 grid grid-cols-2 gap-1 text-[11px] text-slate-400 font-mono">
                        <p>PIN iPhone: <span className="text-slate-700 font-bold">{item.pinIphone || 'N/A'}</span></p>
                        <p>PIN iPad: <span className="text-slate-700 font-bold">{item.pinIpad || 'N/A'}</span></p>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">Número de Desbloqueo: <span className="text-indigo-600 font-black">110303</span></p>
                    </div>
                    </div>

                </div>
                </div>
            )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-md">Cerrar Expediente</button>
        </div>

      </div>
    </div>
  );
};

export default ViewTrabajadorModal;