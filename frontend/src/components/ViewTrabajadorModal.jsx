// frontend/src/components/ViewTrabajadorModal.jsx
import React, { useState, useMemo } from 'react';
import { useGlobalData } from '../contexts/GlobalDataContext';
import { revelarCredenciales as revelarCredencialesApi, descargarLlaveroCredenciales } from '../services/trabajadorService';
import { descargarActaMaterial } from '../services/materialService';
import { formatFieldValue } from '../utils/formatDate';
import { FileText, Download, HardDrive, KeyRound } from 'lucide-react';

const LABELS = {
  nombre: 'Nombre', apellidos: 'Apellidos', dni: 'DNI / NIE', genero: 'Género',
  fechaNacimiento: 'Fecha de Nacimiento', estado: 'Estado', matriculaSAP: 'Matrícula SAP',
  cargo: 'Cargo', agente: 'Agente', codigoZona: 'Código de Zona', zona: 'Zona',
  calendario: 'Calendario', fechaAlta: 'Fecha de Alta', fechaBaja: 'Fecha de Baja',
  activo: 'Activo', nContable: 'Nº Contable', emailAboca: 'Email Corporativo',
  username: 'Usuario', appleID: 'Apple ID', telefono: 'Teléfono', poblacion: 'Población',
  domicilio: 'Domicilio', codComercial: 'Código Comercial', agentComercial: 'Agente Comercial',
  codMedico: 'Código Médico', agentMedico: 'Agente Médico',
  createdAt: 'Alta en Sistema', updatedAt: 'Última Modificación',
};

const IGNORAR = ['_id', 'id', '__v', 'salt', 'password', 'passwordApple'];

const ViewTrabajadorModal = ({ item, onClose }) => {
  const [activeTab, setActiveTab] = useState('datos');

  const [procesandoPdf, setProcesandoPdf] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);

  const [confirmarPass, setConfirmarPass] = useState('');
  const [autorizadoCredenciales, setAutorizadoCredenciales] = useState(false);
  const [verificandoPass, setVerificandoPass] = useState(false);
  const [credenciales, setCredenciales] = useState({ password: null, passwordApple: null });

  const { materiales = [] } = useGlobalData() || {};

  const equipamientoAsignado = useMemo(() => {
    if (!item) return [];
    const id = String(item._id || item.id);
    return materiales.filter(m => {
      const idAsig = String(m.TrabajadorId?._id || m.TrabajadorId || m.asignadoA?._id || m.asignadoA || '');
      return idAsig && idAsig === id;
    });
  }, [item, materiales]);

  const handleCambiarTab = (tab) => {
    if (tab === 'documentacion' && seleccionados.length === 0 && equipamientoAsignado.length > 0) {
      setSeleccionados(equipamientoAsignado.map(m => m._id));
    }
    if (tab !== 'documentacion') {
      setAutorizadoCredenciales(false);
      setCredenciales({ password: null, passwordApple: null });
      setConfirmarPass('');
    }
    setActiveTab(tab);
  };

  const toggleMaterial = (id) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAccionDocumento = async (tipoActa) => {
    if (seleccionados.length === 0) {
      alert('Selecciona al menos un material para generar el acta.');
      return;
    }
    setProcesandoPdf(true);
    try {
      const idMaterialBase = seleccionados[0];
      const pdfBlob = await descargarActaMaterial(idMaterialBase, tipoActa, seleccionados);
      const blob = new Blob([pdfBlob], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      const nombre = `${item.nombre}_${item.apellidos}`.toUpperCase().replace(/[- ]/g, '_');
      link.download = `ACTA_${tipoActa}_${nombre}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert(`Acta de ${tipoActa} generada para ${seleccionados.length} material(es).`);
    } catch (err) {
      alert(err.status === 401 ? 'Sesión expirada. Vuelve a iniciar sesión.' : 'Error al generar el acta.');
    } finally {
      setProcesandoPdf(false);
    }
  };

  const handleVerificarPassword = async (e) => {
    e.preventDefault();
    setVerificandoPass(true);
    try {
      const id = item._id || item.id;
      const datos = await revelarCredencialesApi(id, confirmarPass);
      setCredenciales({ password: datos.password, passwordApple: datos.passwordApple });
      setAutorizadoCredenciales(true);
    } catch (err) {
      alert(`❌ ${err.message || 'Contraseña incorrecta. Acceso denegado.'}`);
      setConfirmarPass('');
    } finally {
      setVerificandoPass(false);
    }
  };

  const handleExportarLlaveroPdf = async () => {
    setProcesandoPdf(true);
    try {
      const id = item._id || item.id;
      const pdfBlob = await descargarLlaveroCredenciales(id);
      const blob = new Blob([pdfBlob], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Credenciales_Aboca_${item.nombre.toUpperCase()}_${item.apellidos.toUpperCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert(`Llavero exportado. La contraseña del PDF es el DNI/NIE de ${item.nombre} en mayúsculas sin guiones.`);
    } catch (err) {
      alert(err.status === 404 ? 'Error 404: endpoint de credenciales no encontrado.' : 'Error al generar el llavero.');
    } finally {
      setProcesandoPdf(false);
    }
  };

  if (!item) return null;

  const camposVisibles = Object.entries(item).filter(([k]) => !IGNORAR.includes(k));

  const TABS = [
    { id: 'datos', label: '👤 Datos Personales' },
    { id: 'materiales', label: `📦 Materiales (${equipamientoAsignado.length})` },
    { id: 'documentacion', label: '📄 Documentación' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl flex flex-col max-h-[88vh]">

        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
          <div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
              Ficha de Personal
            </span>
            <h3 className="text-base font-black text-slate-800 mt-1">{item.nombre} {item.apellidos}</h3>
            {item.cargo && <p className="text-[11px] text-slate-500 mt-0.5">{item.cargo}</p>}
          </div>
          <button onClick={onClose} className="text-xs font-bold text-slate-400 hover:text-slate-600">✕ Cerrar</button>
        </div>

        <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-bold">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleCambiarTab(tab.id)}
              className={`flex-1 py-3 text-center border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/30">

          {activeTab === 'datos' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {camposVisibles.map(([clave, valor]) => (
                <div key={clave} className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                  <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider mb-0.5">
                    {LABELS[clave] || clave}
                  </span>
                  <span className="text-xs font-bold text-slate-700">{formatFieldValue(valor)}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'materiales' && (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-600 uppercase flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                Equipamiento corporativo custodiado ({equipamientoAsignado.length})
              </h4>
              {equipamientoAsignado.length > 0 ? (
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-xs">
                  {equipamientoAsignado.map(mat => (
                    <div key={mat._id} className="p-3 flex justify-between items-center bg-white hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800">{mat.marca} {mat.modelo}</p>
                          <p className="text-[10px] text-slate-400 font-mono">S/N: {mat.sn || 'No reg.'}</p>
                          {mat.imei && (
                            <p className="text-[10px] text-slate-400 font-mono">IMEI: {mat.imei}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200 uppercase">
                        {mat.tipo}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs font-medium bg-white rounded-xl border border-dashed border-slate-200">
                  Este trabajador no tiene ningún activo asignado actualmente.
                </div>
              )}
            </div>
          )}

          {activeTab === 'documentacion' && (
            <div className="space-y-5">

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> Actas de Entrega y Devolución
                </h4>

                {equipamientoAsignado.length > 0 ? (
                  <>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Selecciona los materiales que deseas incluir en el acta:
                    </p>
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {equipamientoAsignado.map((mat) => (
                        <div
                          key={mat._id}
                          onClick={() => toggleMaterial(mat._id)}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            seleccionados.includes(mat._id)
                              ? 'border-blue-500 bg-blue-50 shadow-sm'
                              : 'border-slate-100 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              seleccionados.includes(mat._id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                            }`}>
                              {seleccionados.includes(mat._id) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800">{mat.marca} {mat.modelo}</p>
                              <p className="text-[10px] text-slate-400 font-mono">S/N: {mat.sn || 'No reg.'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 bg-white text-slate-500 rounded-full border border-slate-200 uppercase">
                            {mat.tipo}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        disabled={procesandoPdf || seleccionados.length === 0}
                        onClick={() => handleAccionDocumento('ENTREGA')}
                        className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors shadow-sm"
                      >
                        <Download size={14} /> Acta Entrega ({seleccionados.length})
                      </button>
                      <button
                        disabled={procesandoPdf || seleccionados.length === 0}
                        onClick={() => handleAccionDocumento('DEVOLUCION')}
                        className="flex items-center justify-center gap-2 p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors shadow-sm"
                      >
                        <Download size={14} /> Acta Devolución ({seleccionados.length})
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-5 text-center text-slate-400 text-xs font-medium bg-white rounded-xl border border-dashed border-slate-200">
                    Este trabajador no tiene materiales asignados. Las actas no están disponibles.
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100" />

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" /> Credenciales Corporativas
                </h4>

                {!autorizadoCredenciales ? (
                  <form
                    onSubmit={handleVerificarPassword}
                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 text-center"
                  >
                    <div className="w-9 h-9 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                      <KeyRound size={18} />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Re-introduce tu contraseña de administrador para ver y exportar las credenciales de {item.nombre}:
                    </p>
                    <input
                      type="password"
                      required
                      placeholder="Contraseña del Administrador"
                      value={confirmarPass}
                      onChange={(e) => setConfirmarPass(e.target.value)}
                      className="w-full p-2.5 text-xs font-bold border border-slate-200 bg-white rounded-xl text-center focus:outline-indigo-600 shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={verificandoPass}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-xs font-black rounded-xl transition-colors shadow-sm"
                    >
                      {verificandoPass ? 'Verificando...' : 'Validar Identidad'}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-800 font-bold flex items-center justify-between">
                      <span>🛡️ Acceso autorizado — {item.nombre} {item.apellidos}</span>
                      <button
                        onClick={handleExportarLlaveroPdf}
                        disabled={procesandoPdf}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
                      >
                        <Download size={12} /> Exportar PDF
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <CredCard titulo="Office365 & Mail" icono="✉️">
                        <CredRow label="Usuario" value={item.emailAboca} />
                        <CredRow label="Contraseña" value={credenciales.password} mono />
                      </CredCard>

                      <CredCard titulo="CYTRIC – Hoteles/Billetes" icono="🌐">
                        <CredRow label="Usuario" value={item.emailAboca} />
                        <CredRow label="Contraseña" value="Aboca02+" mono />
                      </CredCard>

                      <CredCard titulo="ServiceTonic Incidencias" icono="🔧">
                        <CredRow
                          label="Usuario"
                          value={
                            item.codComercial && String(item.codComercial).startsWith('31')
                              ? String(item.codComercial).slice(2)
                              : item.codComercial
                          }
                        />
                        <CredRow label="Contraseña" value="12345678" mono />
                      </CredCard>

                      <CredCard titulo="ORDINI" icono="🏛️">
                        <CredRow label="Usuario" value={String(item.username || '').toUpperCase()} mono />
                        <CredRow label="Contraseña" value={String(credenciales.password || '').toUpperCase()} mono />
                      </CredCard>

                      <CredCard titulo="WEBREPORT" icono="📊">
                        <CredRow label="Usuario" value={String(item.username || '').toUpperCase()} mono />
                        <CredRow label="Contraseña" value={String(credenciales.password || '').toUpperCase()} mono />
                      </CredCard>

                      <CredCard titulo="ABOCA MANAGER" icono="🔑">
                        <CredRow label="Usuario" value={String(item.username || '').toUpperCase()} mono />
                        <CredRow label="Contraseña" value={String(credenciales.password || '').toUpperCase()} mono />
                      </CredCard>

                      <CredCard titulo="Aboca Reporting" icono="📈">
                        <CredRow label="Usuario" value={item.emailAboca} />
                        <CredRow label="Contraseña" value={credenciales.password} mono />
                      </CredCard>

                      <CredCard titulo="Apple ID & Terminales" icono="🍏">
                        <CredRow label="Apple ID" value={item.appleID} />
                        <CredRow label="Contraseña" value={credenciales.passwordApple} mono />
                        {item.pinIphone && <CredRow label="PIN iPhone" value={item.pinIphone} mono />}
                        {item.pinIpad && <CredRow label="PIN iPad" value={item.pinIpad} mono />}
                        <CredRow label="Nº Desbloqueo" value="110303" mono />
                      </CredCard>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-md">
            Cerrar Expediente
          </button>
        </div>

      </div>
    </div>
  );
};

const CredCard = ({ titulo, icono, children }) => (
  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
    <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
      <span>{icono}</span> {titulo}
    </h5>
    <div className="text-[11px] space-y-0.5">{children}</div>
  </div>
);

const CredRow = ({ label, value, mono }) => (
  <p className="text-slate-500 font-medium">
    {label}:{' '}
    <span className={`font-bold text-slate-700 ${mono ? 'font-mono' : ''}`}>
      {value || 'N/A'}
    </span>
  </p>
);

export default ViewTrabajadorModal;