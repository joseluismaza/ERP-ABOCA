import Telefono from '../models/Telefono.js';
import Historial from '../models/Historial.js';
import { catchAsync } from '../middleware/errorHandler.js';
import ExcelJS from 'exceljs';

// 🟢 OBTENER TODOS LOS TELÉFONOS (Corregido el Populate al nuevo campo unificado)
export const getAllTelefonos = catchAsync(async (req, res) => {
  // Cambiamos el populate de 'asignadoA' al campo real 'TrabajadorId'
  const telefonos = await Telefono.find().populate('TrabajadorId', 'nombre apellidos dni');
  res.json(telefonos);
});

// 🟢 OBTENER TELÉFONO POR ID
export const getTelefonoById = catchAsync(async (req, res) => {
  const telefono = await Telefono.findById(req.params.id).populate('TrabajadorId', 'nombre apellidos dni');
  if (!telefono) {
    return res.status(404).json({ error: 'La línea telefónica solicitada no fue localizada.' });
  }
  res.json(telefono);
});

// 🟢 CREAR UN NUEVO REGISTRO DE TELÉFONO
export const createTelefono = catchAsync(async (req, res) => {
  const nuevoTelefono = new Telefono(req.body);
  const telefono = await nuevoTelefono.save();

  // Registro automático en la auditoría del ERP
  await Historial.create({
    tipoOperacion: 'create',
    elementoTipo: 'Telefono',
    elementoId: telefono._id,
    observaciones: `Línea telefónica nueva ${telefono.numeroTelefono} (Interno: ${telefono.numeroInterno}) añadida al almacén corporativo.`
  });

  res.status(201).json(telefono);
});

// 🟢 MODIFICAR / ACTUALIZAR DATOS DE LA LÍNEA SÍM o ASIGNACIÓN
export const updateTelefono = catchAsync(async (req, res) => {
  // Aseguramos validadores activos al actualizar los parámetros e ID vinculados
  const telefono = await Telefono.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    { new: true, runValidators: true }
  ).populate('TrabajadorId', 'nombre apellidos dni');

  if (!telefono) {
    return res.status(404).json({ error: 'La línea telefónica solicitada para actualización no existe.' });
  }

  // Captura automática de cambios en el Log de Historial
  await Historial.create({
    tipoOperacion: 'update',
    elementoTipo: 'Telefono',
    elementoId: telefono._id,
    observaciones: `Línea ${telefono.numeroTelefono} modificada. Estado operativo actual: ${String(telefono.estado || '').toUpperCase()}.`
  });

  res.json(telefono);
});

// 🟢 PURGAR / ELIMINAR LÍNEA DEL ERP
export const deleteTelefono = catchAsync(async (req, res) => {
  const telefono = await Telefono.findByIdAndDelete(req.params.id);
  if (!telefono) {
    return res.status(404).json({ error: 'La línea de telefonía que intenta eliminar no existe.' });
  }

  await Historial.create({
    tipoOperacion: 'delete',
    elementoTipo: 'Telefono',
    elementoId: telefono._id,
    observaciones: `Línea telefónica ${telefono.numeroTelefono} purgada del ecosistema del ERP de forma definitiva.`
  });

  res.json({ message: 'Línea de comunicación eliminada correctamente.' });
});

export const exportToExcel = catchAsync(async (req, res) => {
  const telefonos = await Telefono.find().populate('TrabajadorId', 'nombre apellidos');

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Telefonía ERP');

  worksheet.columns = [
    { header: 'Número Teléfono',  key: 'numeroTelefono',  width: 18 },
    { header: 'Extensión Interna',key: 'numeroInterno',   width: 16 },
    { header: 'Estado',           key: 'estado',          width: 14 },
    { header: 'Asignado A',       key: 'asignadoA',       width: 28 },
    { header: 'Tipo Dispositivo', key: 'tipoDispositivo', width: 16 },
    { header: 'Formato SIM',      key: 'tipoSIM',         width: 12 },
    { header: 'ICC Tarjeta SIM',  key: 'icc',             width: 24 },
    { header: 'PIN 1',            key: 'pin1',            width: 10 },
    { header: 'PUK 1',            key: 'puk1',            width: 12 },
    { header: 'PIN 2',            key: 'pin2',            width: 10 },
    { header: 'PUK 2',            key: 'puk2',            width: 12 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 26;

  telefonos.forEach(t => {
    const trabajador = t.TrabajadorId;
    const nombreAsignado = trabajador
      ? `${trabajador.nombre} ${trabajador.apellidos || ''}`.trim()
      : 'Disponible en Almacén';

    worksheet.addRow({
      numeroTelefono:  t.numeroTelefono || '',
      numeroInterno:   t.numeroInterno || '',
      estado:          t.estado || '',
      asignadoA:       nombreAsignado,
      tipoDispositivo: t.tipoDispositivo || '',
      tipoSIM:         t.tipoSIM || '',
      icc:             t.icc || '',
      pin1:            t.pin1 || '',
      puk1:            t.puk1 || '',
      pin2:            t.pin2 || '',
      puk2:            t.puk2 || '',
    });
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.font = { name: 'Segoe UI', size: 10 };
      row.alignment = { vertical: 'middle' };
    }
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Listado_Telefonia_ERP.xlsx');

  await workbook.xlsx.write(res);
  res.end();
});