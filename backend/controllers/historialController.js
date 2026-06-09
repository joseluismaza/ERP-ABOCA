// backend/controllers/historialController.js
import Historial from '../models/Historial.js';
import Trabajador from '../models/Trabajador.js';
import Material from '../models/Material.js';
import Telefono from '../models/Telefono.js';
import { catchAsync } from '../middleware/errorHandler.js';

/**
 * Obtiene toda la colección de logs mapeando las claves nativas de la DB 
 * a la estructura requerida por las columnas del Frontend (usuario, accion, detalles).
 */
export const getAllHistorial = catchAsync(async (req, res) => {
  // 1. Obtenemos los registros ordenados por fecha descrucijando binarios pesados
  const logs = await Historial.find()
    .select('-archivoAdjunto')
    .sort({ createdAt: -1 })
    .populate({ 
      path: 'detallesAsignacion.trabajadorId', 
      select: 'nombre apellidos', 
      options: { strictPopulate: false } 
    });

  // 2. Cargamos colecciones maestras en paralelo (Búsqueda veloz en memoria con .lean())
  const [trabajadores, materiales, telefonos] = await Promise.all([
    Trabajador.find().select('nombre apellidos').lean(),
    Material.find().select('marca modelo sn imei tipo').lean(),
    Telefono.find().select('numeroTelefono numeroInterno').lean()
  ]);

  // Indexamos en Mapas de JavaScript para cruces eficientes de tiempo O(1)
  const mapTrabajadores = new Map(trabajadores.map(t => [String(t._id), t]));
  const mapMateriales = new Map(materiales.map(m => [String(m._id), m]));
  const mapTelefonos = new Map(telefonos.map(t => [String(t._id), t]));

  // 3. Formateamos los datos transformándolos al contrato que espera el componente React
  const historialFormateado = logs.map(log => {
    const obj = log.toObject();
    const idBuscado = String(obj.elementoId || '');
    const tipo = String(obj.elementoTipo || '').toLowerCase().trim();

    // Resolver el elemento físico asociado
    let elementoPoblado = null;
    if (tipo === 'material') elementoPoblado = mapMateriales.get(idBuscado) || null;
    else if (tipo === 'trabajador') elementoPoblado = mapTrabajadores.get(idBuscado) || null;
    else if (tipo === 'telefono' || tipo === 'teléfono') elementoPoblado = mapTelefonos.get(idBuscado) || null;

    // --- CONSTRUCCIÓN DEL STRING DE DETALLES ---
    let cadenaDetalles = obj.observaciones || '';
    if (elementoPoblado) {
      if (tipo === 'material') {
        cadenaDetalles += ` [${elementoPoblado.marca} ${elementoPoblado.modelo} - S/N: ${elementoPoblado.sn || 'N/A'}]`;
      } else if (tipo === 'trabajador') {
        cadenaDetalles += ` [Trabajador: ${elementoPoblado.nombre} ${elementoPoblado.apellidos}]`;
      } else if (tipo === 'telefono') {
        cadenaDetalles += ` [Línea: ${elementoPoblado.numeroTelefono} (Int. ${elementoPoblado.numeroInterno || 'N/A'})]`;
      }
    }

    // --- NORMALIZACIÓN DE LA ACCIÓN PARA LOS BADGES DEL FRONTEND ---
    // Mapeamos los valores de tu DB ('Asignacion', 'Devolucion') a textos compatibles con tus estilos CSS
    let accionFrontend = String(obj.tipoOperacion || '').toUpperCase();
    if (accionFrontend === 'ASSIGN' || accionFrontend === 'ASIGNACION') accionFrontend = 'ASIGNAR HARDWARE';
    if (accionFrontend === 'UNASSIGN' || accionFrontend === 'DEVOLUCION') accionFrontend = 'DEVOLUCIÓN / BAJA';
    if (accionFrontend === 'CREATE') accionFrontend = 'CREAR REGISTRO';
    if (accionFrontend === 'UPDATE') accionFrontend = 'MODIFICAR / ACTUALIZAR';
    if (accionFrontend === 'DELETE') accionFrontend = 'ELIMINAR REGISTRO';

    return {
      _id: obj._id,
      createdAt: obj.createdAt,
      // 🟢 MAPEADO DIRECTO AL FRONTEND:
      accion: accionFrontend,       // Entra directo en la columna 'accion' de tu JSX
      detalles: cadenaDetalles,     // Entra directo en la columna 'detalles' de tu JSX
      // Mantenemos campos originales por si los necesitas en modales de detalle
      elementoTipo: obj.elementoTipo,
      elementoId: elementoPoblado,
      detallesAsignacion: obj.detallesAsignacion
    };
  });

  res.json(historialFormateado);
});

/**
 * Recupera un único registro por su ID con hidratación atómica
 */
export const getHistorialById = catchAsync(async (req, res) => {
  const registro = await Historial.findById(req.params.id)
    .populate({ path: 'detallesAsignacion.trabajadorId', options: { strictPopulate: false } });
    
  if (!registro) {
    return res.status(404).json({ error: 'Registro de auditoría no localizado en la base de datos.' });
  }
  
  const obj = registro.toObject();
  const idBuscado = String(obj.elementoId || '');
  const tipo = String(obj.elementoTipo || '').toLowerCase().trim();
  
  if (tipo === 'material') obj.elementoId = await Material.findById(idBuscado).lean();
  else if (tipo === 'trabajador') obj.elementoId = await Trabajador.findById(idBuscado).lean();
  else if (tipo === 'telefono' || tipo === 'teléfono') obj.elementoId = await Telefono.findById(idBuscado).lean();

  // Inyectamos alias para la vista singular
  obj.accion = String(obj.tipoOperacion).toUpperCase();
  obj.detalles = obj.observaciones;

  res.json(obj);
});

/**
 * Creación manual de registros normalizando la entrada
 */
export const createHistorial = catchAsync(async (req, res) => {
  const datosCuerpo = { ...req.body };
  if (datosCuerpo.elementoTipo) {
    const tipo = datosCuerpo.elementoTipo.toLowerCase().trim();
    if (tipo === 'material') datosCuerpo.elementoTipo = 'Material';
    else if (tipo === 'trabajador') datosCuerpo.elementoTipo = 'Trabajador';
    else if (tipo === 'telefono' || tipo === 'teléfono') datosCuerpo.elementoTipo = 'Telefono';
  }
  const nuevoRegistro = new Historial(datosCuerpo);
  const registro = await nuevoRegistro.save();
  res.status(201).json(registro);
});