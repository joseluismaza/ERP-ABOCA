import Material from '../models/Material.js';
import Historial from '../models/Historial.js';
import Trabajador from '../models/Trabajador.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { generarActaMaterial } from '../services/materialesDocumentService.js';
import ExcelJS from 'exceljs';

export const getAllMateriales = catchAsync(async (req, res) => {
  const materiales = await Material.find()
    .populate('telefonoId', 'numeroTelefono') 
    .populate('TrabajadorId', 'nombre apellidos'); // Mapeo correcto con el nuevo esquema
  res.json(materiales);
});

export const getMaterialById = catchAsync(async (req, res) => {
  const material = await Material.findById(req.params.id);
  if (!material) {
    return res.status(404).json({ error: 'Activo material no encontrado.' });
  }
  res.json(material);
});

export const getMaterialBySnOrImei = catchAsync(async (req, res) => {
  const { code } = req.params;

  const material = await Material.findOne({
    $or: [
      { sn: code },
      { imei: code }
    ]
  }).populate('TrabajadorId', 'nombre apellidos');

  if (!material) {
    return res.status(404).json({ error: `No se encontró ningún material con S/N o IMEI: ${code}` });
  }

  res.json(material);
});

export const createMaterial = catchAsync(async (req, res) => {
  const nuevoMaterial = new Material(req.body);
  const material = await nuevoMaterial.save();

  await Historial.create({
    tipoOperacion: 'create',
    elementoTipo: 'Material',
    elementoId: material._id,
    observaciones: `Material corporativo [${material.marca} - ${material.modelo}] registrado en inventario. Estado inicial asignado: ${material.estado}.`
  });

  res.status(201).json(material);
});

export const updateMaterial = catchAsync(async (req, res) => {
  const materialOriginal = await Material.findById(req.params.id);
  if (!materialOriginal) {
    return res.status(404).json({ error: 'El material a modificar no existe.' });
  }

  // 🔄 GESTIÓN INTELIGENTE DE DEVOLUCIONES:
  // Si el material tenía un trabajador y ahora llega vacío (""), guardamos el rastro
  const datosModificados = { ...req.body };
  let notaAuditoria = `Propiedades del material [${materialOriginal.marca} - ${materialOriginal.modelo}] modificadas.`;

  if (materialOriginal.TrabajadorId && (!req.body.TrabajadorId || req.body.TrabajadorId === "")) {
    datosModificados.ultimoTrabajadorId = materialOriginal.TrabajadorId;
    datosModificados.TrabajadorId = null; // 🏢 ¡CRUCIAL! Rompemos el enlace en MongoDB Atlas de forma definitiva
    datosModificados.estado = req.body.estado === 'Asignado' ? 'Disponible' : req.body.estado;
    
    // Si el usuario no especificó una fecha manual en el formulario, le ponemos la de hoy
    if (!req.body.fechaDevolucionTrabajador) {
      datosModificados.fechaDevolucionTrabajador = new Date();
    }

    notaAuditoria = `🔄 LOGÍSTICA: El equipo [${materialOriginal.marca} ${materialOriginal.modelo}] ha sido devuelto a almacén. Historial de portador cerrado con éxito.`;
  } else if (req.body.TrabajadorId && req.body.TrabajadorId !== "") {
    // Si se asigna a alguien nuevo, limpiamos el último rastro temporal
    datosModificados.ultimoTrabajadorId = null;
    datosModificados.estado = 'Asignado';
    if (!req.body.fechaEntregaTrabajador) {
      datosModificados.fechaEntregaTrabajador = new Date();
    }
  }

  const material = await Material.findByIdAndUpdate(req.params.id, datosModificados, { new: true, runValidators: true });

  await Historial.create({
    tipoOperacion: 'update',
    elementoTipo: 'Material',
    elementoId: material._id,
    observaciones: notaAuditoria
  });

  res.json(material);
});

export const deleteMaterial = catchAsync(async (req, res) => {
  const material = await Material.findById(req.params.id);
  if (!material) {
    return res.status(404).json({ error: 'El material solicitado para eliminación no existe.' });
  }

  await Material.findByIdAndDelete(req.params.id);

  await Historial.create({
    tipoOperacion: 'delete',
    elementoTipo: 'Material',
    elementoId: materialId, 
    observaciones: `🚨 ELIMINACIÓN DE ACTIVO IRREVERSIBLE: El hardware [${material.marca} ${material.modelo}] con S/N: [${material.sn || 'N/A'}] fue purgado permanentemente del inventario operativo.`
  });

  res.json({ message: 'Activo purgado con éxito del inventario histórico.' });
});

export const exportToExcel = catchAsync(async (req, res) => {
  const materiales = await Material.find().populate('TrabajadorId', 'nombre apellidos');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Inventario Hardware ERP');

  worksheet.columns = [
    { header: 'Tipo',            key: 'tipo',            width: 15 },
    { header: 'Marca',           key: 'marca',           width: 18 },
    { header: 'Modelo',          key: 'modelo',          width: 22 },
    { header: 'Nº Serie (S/N)',  key: 'sn',              width: 22 },
    { header: 'IMEI',            key: 'imei',            width: 20 },
    { header: 'Estado',          key: 'estado',          width: 18 },
    { header: 'Renting',         key: 'esRenting',       width: 10 },
    { header: 'Asignado A',      key: 'asignadoA',       width: 28 },
    { header: 'Fecha Entrega',   key: 'fechaEntrega',    width: 15 },
    { header: 'Fecha Devolución',key: 'fechaDevolucion', width: 15 },
    { header: 'Observaciones',   key: 'observaciones',   width: 35 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 26;

  materiales.forEach(m => {
    const trabajador = m.TrabajadorId;
    const nombreAsignado = trabajador
      ? `${trabajador.nombre} ${trabajador.apellidos || ''}`.trim()
      : 'Disponible en Almacén';

    worksheet.addRow({
      tipo:            m.tipo || '',
      marca:           m.marca || '',
      modelo:          m.modelo || '',
      sn:              m.sn || '',
      imei:            m.imei || '',
      estado:          m.estado || '',
      esRenting:       m.esRenting ? 'Sí' : 'No',
      asignadoA:       nombreAsignado,
      fechaEntrega:    m.fechaEntregaTrabajador ? new Date(m.fechaEntregaTrabajador).toLocaleDateString('es-ES') : '',
      fechaDevolucion: m.fechaDevolucionTrabajador ? new Date(m.fechaDevolucionTrabajador).toLocaleDateString('es-ES') : '',
      observaciones:   m.observaciones || '',
    });
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.font = { name: 'Segoe UI', size: 10 };
      row.alignment = { vertical: 'middle' };
    }
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Inventario_Hardware_ERP.xlsx');

  await workbook.xlsx.write(res);
  res.end();
});

// 🛠️ ENDPOINT DOCUMENTAL CORREGIDO (Compatible con ViewMaterialModal y esquema TrabajadorId)
export const documentarMateriales = catchAsync(async (req, res) => {
  const { id } = req.params; // ID del material desde donde se pulsa el botón
  const { tipo, seleccionados } = req.query; // 'seleccionados' será una cadena de IDs separados por coma
  
  // 1. Buscamos el material base para saber quién es el trabajador
  const materialBase = await Material.findById(id).populate('TrabajadorId');
  if (!materialBase || !materialBase.TrabajadorId) {
    return res.status(404).json({ error: 'No se puede generar acta sin un trabajador asignado.' });
  }

  const trabajador = materialBase.TrabajadorId;
  
  // 2. FILTRADO DINÁMICO: Si el usuario seleccionó materiales específicos
  let idsArray = seleccionados ? seleccionados.split(',') : [id];
  
  const materialesParaActa = await Material.find({
    _id: { $in: idsArray }
  });

  const materialesPayload = materialesParaActa.map(m => ({
    nombre: `${m.marca} ${m.modelo} (${m.tipo})`,
    numeroSerie: m.sn || m.numeroSerie || 'S/N'
  }));

  // 3. Generamos el PDF con los materiales filtrados
  const pdfBuffer = await generarActaMaterial(trabajador, materialesPayload, tipo);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=ACTA_${tipo}.pdf`,
    'Content-Length': pdfBuffer.length
  });

  res.send(pdfBuffer);
});