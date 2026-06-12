// frontend/src/pages/Dashboard.jsx
import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useGlobalData } from '../contexts/GlobalDataContext';

// Carga asíncrona del escáner óptico de hardware para optimizar el peso del bundle inicial
const ZXingScanner = lazy(() => import('../components/ZXingScanner'));

const Dashboard = () => {
  // Consumo de la fuente unificada de datos del ERP desde el estado global en caché
  const { trabajadores, materiales, telefonos, loading, error } = useGlobalData();

  // Estados locales para el control del buscador y filtrado interactivo
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('todos'); // Control visual: 'todos', 'trabajadores', 'materiales', 'telefonos'

  /**
   * MÉTRICAS OPERACIONALES SEGREGADAS (Calculadas en tiempo real)
   * Extraen los balances de estados basándose en las flags estándar del modelo.
   */
  const metrics = useMemo(() => {
    // 1. Métricas de Personal (Asumimos trabajadores activos si tienen la flag o están validados)
    const totalTrabajadores = trabajadores.length;
    const activosTrabajadores = trabajadores.filter(t => t.activo !== false).length;

    // 2. Métricas de Hardware e Inventario
    const totalMateriales = materiales.length;
    const asignadosMateriales = materiales.filter(m => m.estado === 'Asignado').length;
    const disponiblesMateriales = materiales.filter(m => m.estado === 'Disponible').length;

    // 3. Métricas de Conectividad SIM
    const totalTelefonos = telefonos.length;
    const asignadosTelefonos = telefonos.filter(p => p.estado === 'Asignado').length;
    const disponiblesTelefonos = telefonos.filter(p => p.estado === 'Disponible' || p.estado === 'Libre').length;

    return {
      trabajadores: { activos: activosTrabajadores, total: totalTrabajadores },
      materiales: { asignados: asignadosMateriales, disponibles: disponiblesMateriales, total: totalMateriales },
      telefonos: { asignados: asignadosTelefonos, disponibles: disponiblesTelefonos, total: totalTelefonos }
    };
  }, [trabajadores, materiales, telefonos]);

  /**
   * MOTOR DE BÚSQUEDA HOLÍSTICO E INDEXACIÓN CRUZADA
   * Vincula relacionalmente expedientes de personal, hardware y SIMs activas.
   */
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return { trabajadores: [], materiales: [], telefonos: [] };

    // Filtrado Atómico Base
    const matchedTrabajadores = trabajadores.filter(t => 
      t.nombre?.toLowerCase().includes(query) ||
      t.apellidos?.toLowerCase().includes(query) ||
      t.dni?.toLowerCase().includes(query) ||
      t.matriculaSAP?.toLowerCase().includes(query)
    );

    const matchedMateriales = materiales.filter(m => 
      m.sn?.toLowerCase().includes(query) ||
      m.marca?.toLowerCase().includes(query) ||
      m.modelo?.toLowerCase().includes(query) ||
      m.imei?.toLowerCase().includes(query) ||
      m.tipo?.toLowerCase().includes(query)
    );

    const matchedTelefonos = telefonos.filter(p => 
      p.numeroTelefono?.toLowerCase().includes(query) ||
      p.numeroInterno?.toLowerCase().includes(query) ||
      p.icc?.toLowerCase().includes(query)
    );

    const expandedTrabajadorIds = new Set(matchedTrabajadores.map(t => t._id));
    const expandedMaterialIds = new Set(matchedMateriales.map(m => m._id));
    const expandedTelefonoIds = new Set(matchedTelefonos.map(p => p._id));

    // Cruzado desde Trabajadores
    matchedTrabajadores.forEach(t => {
      materiales.forEach(m => {
        const idTrabajadorMaterial = m.TrabajadorId?._id || m.TrabajadorId;
        if (idTrabajadorMaterial && String(idTrabajadorMaterial) === String(t._id)) expandedMaterialIds.add(m._id);
      });
      telefonos.forEach(p => {
        const idTrabajadorTelefono = p.TrabajadorId?._id || p.TrabajadorId;
        if (idTrabajadorTelefono && String(idTrabajadorTelefono) === String(t._id)) expandedTelefonoIds.add(p._id);
      });
    });

    // Cruzado desde Materiales
    matchedMateriales.forEach(m => {
      const targetEmpId = m.TrabajadorId?._id || m.TrabajadorId;
      if (targetEmpId) expandedTrabajadorIds.add(targetEmpId);

      // m.telefonoId es una referencia al _id del Telefono vinculado (no un número de teléfono)
      const idTelefonoMaterial = m.telefonoId?._id || m.telefonoId;
      if (idTelefonoMaterial) expandedTelefonoIds.add(idTelefonoMaterial);
    });

    // Cruzado desde Teléfonos
    matchedTelefonos.forEach(p => {
      const targetEmpId = p.TrabajadorId?._id || p.TrabajadorId;
      if (targetEmpId) expandedTrabajadorIds.add(targetEmpId);

      // Buscamos el material (si existe) cuyo telefonoId apunte a esta línea
      const matMatch = materiales.find(m => {
        const idTelefonoMaterial = m.telefonoId?._id || m.telefonoId;
        return idTelefonoMaterial && String(idTelefonoMaterial) === String(p._id);
      });
      if (matMatch) expandedMaterialIds.add(matMatch._id);
    });

    return {
      trabajadores: trabajadores.filter(t => expandedTrabajadorIds.has(t._id)),
      materiales: materiales.filter(m => expandedMaterialIds.has(m._id)),
      telefonos: telefonos.filter(p => expandedTelefonoIds.has(p._id))
    };
  }, [searchQuery, trabajadores, materiales, telefonos]);

  const handleScanSuccess = (decodedText) => {
    setSearchQuery(decodedText);
    setScannerOpen(false);
  };

  const emitAction = (actionType, entityType, id) => {
    const event = new CustomEvent('openModal', {
      detail: { action: actionType, type: entityType, id: id }
    });
    window.dispatchEvent(event);
  };

  const countTotalResults = results => results.trabajadores.length + results.materiales.length + results.telefonos.length;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium mt-4">Procesando base de conocimiento del ERP...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
        <h4 className="font-bold mb-1">Error de sincronización con la API</h4>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* SECCIÓN SUPERIOR: Buscador Global e Integración de Cámara */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Buscador Operacional Global</h1>
          <p className="text-sm text-gray-500">
            Introduce datos de un empleado, número de serie de hardware, IMEI o línea telefónica para cruzar la base de datos completa del ERP.
          </p>
          
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <span className="absolute left-4 top-3.5 text-xl text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="Buscar por DNI, Nombre, Serial Hardware, Teléfono, ICC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 font-medium placeholder-gray-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 font-bold">✕</button>
              )}
            </div>
            
            <button
              onClick={() => setScannerOpen(prev => !prev)}
              className={`px-4 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                scannerOpen ? 'bg-red-500 text-white shadow-md' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100'
              }`}
            >
              <span>📷</span>
              <span className="hidden sm:inline">{scannerOpen ? 'Cerrar' : 'Escanear'}</span>
            </button>
          </div>
        </div>

        {scannerOpen && (
          <div className="mt-6 max-w-xl mx-auto border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden p-4 bg-gray-50">
            <Suspense fallback={<div className="text-center py-6 text-sm text-gray-500 animate-pulse">Inicializando cámara...</div>}>
              <ZXingScanner onDetected={handleScanSuccess} onClose={() => setScannerOpen(false)} />
            </Suspense>
          </div>
        )}
      </div>

      {/* RENDERIZADO DINÁMICO DE PANELES */}
      {searchQuery.trim() !== '' ? (
        <div className="space-y-6">
          {/* Pestañas de resultados filtrados */}
          <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-px">
            {[
              { id: 'todos', label: 'Todo lo relacionado', count: countTotalResults(searchResults) },
              { id: 'trabajadores', label: 'Personal', count: searchResults.trabajadores.length },
              { id: 'materiales', label: 'Materiales/Hardware', count: searchResults.materiales.length },
              { id: 'telefonos', label: 'Líneas Teléfono', count: searchResults.telefonos.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-all flex items-center gap-2 focus:outline-none ${
                  activeTab === tab.id ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Bloques de Entidades Relacionadas (Personal, Materiales, Teléfonos) */}
          {(activeTab === 'todos' || activeTab === 'trabajadores') && searchResults.trabajadores.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span className="text-lg">👥</span>
                <h3 className="font-bold text-gray-800">Expedientes de Personal Relacionados</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {searchResults.trabajadores.map(t => (
                  <div key={t._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-gray-800">{t.nombre} {t.apellidos}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-gray-500">
                        <span>💳 DNI: <strong className="text-gray-700">{t.dni}</strong></span>
                        <span>💼 Rol: <strong className="text-gray-700">{t.agente || t.cargo || 'N/D'}</strong></span>
                        <span>🖥️ SAP: <strong className="text-gray-700">{t.matriculaSAP || 'N/D'}</strong></span>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center">
                      <button onClick={() => emitAction('view', 'trabajadores', t._id)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-xs">Ficha</button>
                      <button onClick={() => emitAction('edit', 'trabajadores', t._id)} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium rounded-lg text-xs">Editar</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'todos' || activeTab === 'materiales') && searchResults.materiales.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span className="text-lg">📦</span>
                <h3 className="font-bold text-gray-800">Inventario de Materiales Vinculados</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {searchResults.materiales.map(m => {
                  const portador = trabajadores.find(t => t._id === (m.TrabajadorId?._id || m.TrabajadorId));
                  return (
                    <div key={m._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{m.tipo}</span>
                          <h4 className="font-semibold text-gray-800">{m.marca} {m.modelo}</h4>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-gray-500">
                          <span>🔢 S/N: <strong className="text-gray-700">{m.sn}</strong></span>
                          <span>👤 Custodio: <strong className="text-indigo-600">{portador ? `${portador.nombre} ${portador.apellidos}` : 'Stock Disponible'}</strong></span>
                        </div>
                      </div>
                      <div className="flex gap-2 self-end sm:self-center">
                        <button onClick={() => emitAction('view', 'materiales', m._id)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-xs">Detalles</button>
                        <button onClick={() => emitAction('edit', 'materiales', m._id)} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium rounded-lg text-xs">Asignar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(activeTab === 'todos' || activeTab === 'telefonos') && searchResults.telefonos.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span className="text-lg">📱</span>
                <h3 className="font-bold text-gray-800">Líneas de Teléfono Vinculadas</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {searchResults.telefonos.map(p => {
                  const titular = trabajadores.find(t => t._id === (p.TrabajadorId?._id || p.TrabajadorId));
                  return (
                    <div key={p._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50">
                      <div className="space-y-1">
                        <h4 className="font-semibold text-indigo-600 font-mono">{p.numeroTelefono}</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-gray-500">
                          <span>💳 ICC: <strong className="text-gray-700">{p.icc}</strong></span>
                          <span>👤 Titular: <strong className="text-gray-700">{titular ? `${titular.nombre} ${titular.apellidos}` : 'Línea Libre'}</strong></span>
                        </div>
                      </div>
                      <div className="flex gap-2 self-end sm:self-center">
                        <button onClick={() => emitAction('view', 'telefonos', p._id)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-xs">Detalles</button>
                        <button onClick={() => emitAction('edit', 'telefonos', p._id)} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-medium rounded-lg text-xs">Editar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {countTotalResults(searchResults) === 0 && (
            <div className="text-center bg-white p-12 rounded-2xl border border-gray-100 shadow-sm space-y-2">
              <span className="text-4xl block">📂</span>
              <p className="text-gray-800 font-semibold">Ningún registro localizado</p>
              <p className="text-gray-400 text-sm max-w-md mx-auto">No hay coincidencias relacionales para "<strong className="text-gray-600">{searchQuery}</strong>".</p>
            </div>
          )}
        </div>
      ) : (
        
        /* DISEÑO DE ESTADÍSTICAS REHECHO: Cuadrícula Analítica de Balances Segregados */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Tarjeta 1: Personal Corporativo */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 text-xl flex items-center justify-center">👥</div>
                <h3 className="font-bold text-gray-800 text-base">Trabajadores</h3>
              </div>
              <span className="text-s text-indigo-700 px-2 py-0.5 rounded-full font-bold">Total: {metrics.trabajadores.total}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
              <div className="bg-gray-50 p-3 rounded-xl text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Activos</p>
                <p className="text-xl font-bold text-green-600 mt-0.5">{metrics.trabajadores.activos}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Bajas/Inactivos</p>
                <p className="text-xl font-bold text-gray-500 mt-0.5">{metrics.trabajadores.total - metrics.trabajadores.activos}</p>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Activos de Hardware / Materiales */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 text-xl flex items-center justify-center">📦</div>
                <h3 className="font-bold text-gray-800 text-base">Materiales</h3>
              </div>
              <span className="text-s text-green-700 px-2 py-0.5 rounded-full font-bold">Total: {metrics.materiales.total}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
              <div className="bg-gray-50 p-3 rounded-xl text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Asignados</p>
                <p className="text-xl font-bold text-indigo-600 mt-0.5">{metrics.materiales.asignados}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Disponibles</p>
                <p className="text-xl font-bold text-green-600 mt-0.5">{metrics.materiales.disponibles}</p>
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Líneas de Telecomunicaciones */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 text-xl flex items-center justify-center">📱</div>
                <h3 className="font-bold text-gray-800 text-base">Teléfonos</h3>
              </div>
              <span className="text-s text-blue-700 px-2 py-0.5 rounded-full font-bold">Total: {metrics.telefonos.total}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
              <div className="bg-gray-50 p-3 rounded-xl text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Asignadas</p>
                <p className="text-xl font-bold text-indigo-600 mt-0.5">{metrics.telefonos.asignados}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl text-center">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Disponibles</p>
                <p className="text-xl font-bold text-blue-600 mt-0.5">{metrics.telefonos.disponibles}</p>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Dashboard;