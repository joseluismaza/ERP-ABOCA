import Telefono from '../models/Telefono.js';
import Historial from '../models/Historial.js';
import { catchAsync } from '../middleware/errorHandler.js';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

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

export const exportToPDF = catchAsync(async (req, res) => {
  // INPUTS: petición autenticada sin parámetros adicionales
  // PROCESO: filtra iPhones con estado asignado, agrupa por codigoZona del trabajador,
  //          ordena alfabéticamente dentro de cada zona y genera un PDF con PDFKit
  // OUTPUTS: archivo PDF descargable con una sección por zona (encabezado verde) y tres columnas: numeroTelefono, numeroInterno y nombre del trabajador

  const telefonos = await Telefono.find({
    tipoDispositivo: { $regex: /^iphone$/i },
    estado: { $regex: /^asignado$/i }
  }).populate('TrabajadorId', 'nombre apellidos cargo zona codigoZona');

  // Ordenar primero por codigoZona y después por nombre completo del trabajador
  telefonos.sort((a, b) => {
    const zonaA = (a.TrabajadorId?.codigoZona || '').toUpperCase();
    const zonaB = (b.TrabajadorId?.codigoZona || '').toUpperCase();
    if (zonaA !== zonaB) return zonaA.localeCompare(zonaB, 'es');
    const nombreA = `${a.TrabajadorId?.nombre || ''} ${a.TrabajadorId?.apellidos || ''}`.trim();
    const nombreB = `${b.TrabajadorId?.nombre || ''} ${b.TrabajadorId?.apellidos || ''}`.trim();
    return nombreA.localeCompare(nombreB, 'es');
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=Telefonos_iPhone_Zonas.pdf');

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  doc.pipe(res);

  const MARGEN       = 40;
  const ANCHO_PAGINA = doc.page.width;
  const ALTO_PAGINA  = doc.page.height;
  const ANCHO_UTIL   = ANCHO_PAGINA - MARGEN * 2;
  const ALTO_HEADER = 28;
  const ALTO_FILA   = 40;

  const COLOR_VERDE      = '#16a34a';
  const COLOR_VERDE_TEXT = '#ffffff';
  const COLOR_FILA_A     = '#ffffff';
  const COLOR_FILA_B     = '#f1f5f9';
  const COLOR_TEXTO      = '#1e293b';

  const SEPARACION_ZONA = 10;
  const PAD_COL         = 18; // padding mínimo por columna al medir texto

  // Helpers de clasificación
  const ZONAS_CON_CARGO = ['apoteca natura', 'servicios generales'];
  const zonaTieneCargo  = (z) => ZONAS_CON_CARGO.includes((z || '').toLowerCase().trim());
  const esAreaManager   = (cargo) => (cargo || '').toLowerCase().trim() === 'area manager';

  // Determina el layout de cada teléfono:
  // 'area_manager' → Nombre | Cargo | Teléfono | Interno
  // 'con_cargo'    → Nombre | Cargo | Zona | Teléfono | Interno
  // 'sin_cargo'    → Nombre | Zona | Teléfono | Interno
  const getLayout = (tel) => {
    if (esAreaManager(tel.TrabajadorId?.cargo)) return 'area_manager';
    if (zonaTieneCargo(tel.TrabajadorId?.codigoZona)) return 'con_cargo';
    return 'sin_cargo';
  };

  // Medir teléfono e interno sobre TODOS los registros para que su ancho
  // sea fijo y nunca se parta en dos líneas independientemente del layout
  doc.font('Helvetica').fontSize(11);
  const medir = (str) => doc.widthOfString(str || '');

  const ANCHO_TELEFONO = Math.max(...telefonos.map(t => medir(t.numeroTelefono || '')), 0) + PAD_COL;
  const ANCHO_INTERNO  = Math.max(...telefonos.map(t => medir(t.numeroInterno  || '')), 0) + PAD_COL;
  const RESTO_UTIL     = ANCHO_UTIL - ANCHO_TELEFONO - ANCHO_INTERNO;

  // Calcula anchos de las columnas variables (todo excepto teléfono e interno)
  // escalados para ocupar exactamente RESTO_UTIL
  const calcularAnchos = (items, layout) => {
    if (items.length === 0) return [];
    doc.font('Helvetica').fontSize(11);

    const maxNombre = Math.max(...items.map(t =>
      medir(`${t.TrabajadorId?.nombre || ''} ${t.TrabajadorId?.apellidos || ''}`.trim())
    ), 0);

    let brutos;
    if (layout === 'area_manager') {
      const maxCargo = Math.max(...items.map(t => medir(t.TrabajadorId?.cargo || '')), 0);
      brutos = [maxNombre + PAD_COL, maxCargo + PAD_COL];
    } else if (layout === 'con_cargo') {
      const maxCargo = Math.max(...items.map(t => medir(t.TrabajadorId?.cargo || '')), 0);
      const maxZona  = Math.max(...items.map(t => medir(t.TrabajadorId?.zona  || '')), 0);
      brutos = [maxNombre + PAD_COL, maxCargo + PAD_COL, maxZona + PAD_COL];
    } else {
      const maxZona = Math.max(...items.map(t => medir(t.TrabajadorId?.zona || '')), 0);
      brutos = [maxNombre + PAD_COL, maxZona + PAD_COL];
    }

    const total  = brutos.reduce((a, b) => a + b, 0);
    const factor = RESTO_UTIL / total;
    const anchos = brutos.map(v => Math.floor(v * factor));
    anchos[anchos.length - 1] += RESTO_UTIL - anchos.reduce((a, b) => a + b, 0);
    return [...anchos, ANCHO_TELEFONO, ANCHO_INTERNO];
  };

  // Pre-calcular anchos por layout usando todos los registros de cada grupo
  const grupos = { area_manager: [], con_cargo: [], sin_cargo: [] };
  for (const tel of telefonos) grupos[getLayout(tel)].push(tel);

  const anchosPorLayout = {
    area_manager: calcularAnchos(grupos.area_manager, 'area_manager'),
    con_cargo:    calcularAnchos(grupos.con_cargo,    'con_cargo'),
    sin_cargo:    calcularAnchos(grupos.sin_cargo,    'sin_cargo'),
  };

  let currentY    = MARGEN;
  let filaIndex   = 0;
  let primeraZona = true;

  const dibujarEncabezadoZona = (zona) => {
    doc.rect(MARGEN, currentY, ANCHO_UTIL, ALTO_HEADER).fill(COLOR_VERDE);
    doc.fillColor(COLOR_VERDE_TEXT)
       .font('Helvetica-Bold')
       .fontSize(14)
       .text(zona || 'SIN ZONA', MARGEN + 10, currentY + 6, { lineBreak: false });
    currentY += ALTO_HEADER;
    filaIndex = 0;
  };

  // columnas: array de { texto, ancho }
  const dibujarFila = (columnas) => {
    if (currentY + ALTO_FILA > ALTO_PAGINA - MARGEN) {
      doc.addPage();
      currentY = MARGEN;
      filaIndex = 0;
    }
    const bg  = filaIndex % 2 === 0 ? COLOR_FILA_A : COLOR_FILA_B;
    const yTx = currentY + (ALTO_FILA - 11) / 2;
    doc.rect(MARGEN, currentY, ANCHO_UTIL, ALTO_FILA).fill(bg);
    doc.fillColor(COLOR_TEXTO).font('Helvetica').fontSize(11);
    let x = MARGEN + 6;
    for (const col of columnas) {
      doc.text(col.texto || '', x, yTx, { width: col.ancho - 10, lineBreak: false });
      x += col.ancho;
    }
    currentY += ALTO_FILA;
    filaIndex++;
  };

  // Agrupar teléfonos por codigoZona manteniendo el orden ya aplicado
  const zonas = [];
  for (const tel of telefonos) {
    const zona   = tel.TrabajadorId?.codigoZona || 'SIN ZONA';
    const ultimo = zonas[zonas.length - 1];
    if (ultimo && ultimo.zona === zona) {
      ultimo.items.push(tel);
    } else {
      zonas.push({ zona, items: [tel] });
    }
  }

  for (const bloque of zonas) {
    const altoBloque        = ALTO_HEADER + bloque.items.length * ALTO_FILA;
    const espacioDisponible = ALTO_PAGINA - MARGEN - currentY;
    const separacion        = primeraZona ? 0 : SEPARACION_ZONA;

    // Cada zona empieza siempre en página nueva (salvo la primera)
    if (!primeraZona) {
      doc.addPage();
      currentY = MARGEN;
    }

    primeraZona = false;
    dibujarEncabezadoZona(bloque.zona);

    for (const tel of bloque.items) {
      const nombre  = `${tel.TrabajadorId?.nombre || ''} ${tel.TrabajadorId?.apellidos || ''}`.trim();
      const cargo   = tel.TrabajadorId?.cargo || '';
      const layout  = getLayout(tel);
      const anchos  = anchosPorLayout[layout];

      let columnas;
      if (layout === 'area_manager') {
        columnas = [
          { texto: nombre,             ancho: anchos[0] },
          { texto: cargo,              ancho: anchos[1] },
          { texto: tel.numeroTelefono, ancho: anchos[2] },
          { texto: tel.numeroInterno,  ancho: anchos[3] },
        ];
      } else if (layout === 'con_cargo') {
        columnas = [
          { texto: nombre,                       ancho: anchos[0] },
          { texto: cargo,                        ancho: anchos[1] },
          { texto: tel.TrabajadorId?.zona || '', ancho: anchos[2] },
          { texto: tel.numeroTelefono,           ancho: anchos[3] },
          { texto: tel.numeroInterno,            ancho: anchos[4] },
        ];
      } else {
        columnas = [
          { texto: nombre,                       ancho: anchos[0] },
          { texto: tel.TrabajadorId?.zona || '', ancho: anchos[1] },
          { texto: tel.numeroTelefono,           ancho: anchos[2] },
          { texto: tel.numeroInterno,            ancho: anchos[3] },
        ];
      }

      dibujarFila(columnas);
    }
  }

  doc.end();
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