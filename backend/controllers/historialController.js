// backend/controllers/historialController.js
import Historial from '../models/Historial.js';
import Trabajador from '../models/Trabajador.js';
import Material from '../models/Material.js';
import Telefono from '../models/Telefono.js';
import { catchAsync } from '../middleware/errorHandler.js';

const normalizarElementoTipo = (valor) => {
  const tipo = String(valor || '').toLowerCase().trim();
  if (tipo === 'material') return 'Material';
  if (tipo === 'trabajador') return 'Trabajador';
  if (tipo === 'telefono' || tipo === 'teléfono') return 'Telefono';
  return null;
};

export const getAllHistorial = catchAsync(async (req, res) => {
  const filtro = {};
  if (req.query.elementoId) {
    filtro.elementoId = req.query.elementoId;
  }

  const logs = await Historial.find(filtro)
    .select('-archivoAdjunto')
    .sort({ createdAt: -1 })
    .populate({ 
      path: 'detallesAsignacion.trabajadorId', 
      select: 'nombre apellidos', 
      options: { strictPopulate: false } 
    });

  const [trabajadores, materiales, telefonos] = await Promise.all([
    Trabajador.find().select('nombre apellidos').lean(),
    Material.find().select('marca modelo sn imei tipo').lean(),
    Telefono.find().select('numeroTelefono numeroInterno').lean()
  ]);

  const mapTrabajadores = new Map(trabajadores.map(t => [String(t._id), t]));
  const mapMateriales = new Map(materiales.map(m => [String(m._id), m]));
  const mapTelefonos = new Map(telefonos.map(t => [String(t._id), t]));

  const historialFormateado = logs.map(log => {
    const obj = log.toObject();
    const idBuscado = String(obj.elementoId || '');
    const tipo = normalizarElementoTipo(obj.elementoTipo);

    let elementoPoblado = null;
    if (tipo === 'Material') elementoPoblado = mapMateriales.get(idBuscado) || null;
    else if (tipo === 'Trabajador') elementoPoblado = mapTrabajadores.get(idBuscado) || null;
    else if (tipo === 'Telefono') elementoPoblado = mapTelefonos.get(idBuscado) || null;

    let cadenaDetalles = obj.observaciones || '';
    if (elementoPoblado) {
      if (tipo === 'Material') {
        cadenaDetalles += ` [${elementoPoblado.marca} ${elementoPoblado.modelo} - S/N: ${elementoPoblado.sn || 'N/A'}]`;
      } else if (tipo === 'Trabajador') {
        cadenaDetalles += ` [Trabajador: ${elementoPoblado.nombre} ${elementoPoblado.apellidos}]`;
      } else if (tipo === 'Telefono') {
        cadenaDetalles += ` [Línea: ${elementoPoblado.numeroTelefono} (Int. ${elementoPoblado.numeroInterno || 'N/A'})]`;
      }
    }

    let accionFrontend = String(obj.tipoOperacion || '').toUpperCase();
    if (accionFrontend === 'ASSIGN' || accionFrontend === 'ASIGNACION') accionFrontend = 'ASIGNAR HARDWARE';
    if (accionFrontend === 'UNASSIGN' || accionFrontend === 'DEVOLUCION') accionFrontend = 'DEVOLUCIÓN / BAJA';
    if (accionFrontend === 'CREATE') accionFrontend = 'CREAR REGISTRO';
    if (accionFrontend === 'UPDATE') accionFrontend = 'MODIFICAR / ACTUALIZAR';
    if (accionFrontend === 'DELETE') accionFrontend = 'ELIMINAR REGISTRO';

    return {
      _id: obj._id,
      createdAt: obj.createdAt,
      accion: accionFrontend,
      detalles: cadenaDetalles,
      elementoTipo: obj.elementoTipo,
      elementoId: elementoPoblado,
      detallesAsignacion: obj.detallesAsignacion
    };
  });

  res.json(historialFormateado);
});

export const getHistorialById = catchAsync(async (req, res) => {
  const registro = await Historial.findById(req.params.id)
    .populate({ path: 'detallesAsignacion.trabajadorId', options: { strictPopulate: false } });
    
  if (!registro) {
    return res.status(404).json({ error: 'Registro de auditoría no localizado en la base de datos.' });
  }
  
  const obj = registro.toObject();
  const idBuscado = String(obj.elementoId || '');
  const tipo = normalizarElementoTipo(obj.elementoTipo);
  
  if (tipo === 'Material') obj.elementoId = await Material.findById(idBuscado).lean();
  else if (tipo === 'Trabajador') obj.elementoId = await Trabajador.findById(idBuscado).lean();
  else if (tipo === 'Telefono') obj.elementoId = await Telefono.findById(idBuscado).lean();

  obj.accion = String(obj.tipoOperacion).toUpperCase();
  obj.detalles = obj.observaciones;

  res.json(obj);
});

export const createHistorial = catchAsync(async (req, res) => {
  const datosCuerpo = { ...req.body };
  if (datosCuerpo.elementoTipo) {
    const tipoNormalizado = normalizarElementoTipo(datosCuerpo.elementoTipo);
    if (tipoNormalizado) {
      datosCuerpo.elementoTipo = tipoNormalizado;
    }
  }
  const nuevoRegistro = new Historial(datosCuerpo);
  const registro = await nuevoRegistro.save();
  res.status(201).json(registro);
});