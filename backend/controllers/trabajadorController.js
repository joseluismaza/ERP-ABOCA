// backend/controllers/trabajadorController.js
import Trabajador from "../models/Trabajador.js";
import Historial from '../models/Historial.js';
import Admin from '../models/Admin.js';
import { catchAsync } from '../middleware/errorHandler.js';
import ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';
import { enviarCredencialesSeguras } from "../services/onboardingService.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { encrypt, descifrarCredencialesTrabajador } from "../utils/crypto.js";
import { activarTrabajadoresPendientes } from "../services/cronService.js";
import { enviarEmailConAdjunto } from "../services/emailService.js";
import { generarExcelVMF } from "../services/vmfExcelService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rutaLogo = path.join(__dirname, '../assets/logo.jpg');
let logoBuffer = null;
try {
  if (fs.existsSync(rutaLogo)) {
    logoBuffer = fs.readFileSync(rutaLogo); // ← Buffer síncrono al arrancar
  }
} catch (e) {
  console.error('⚠️ Logo no cargado:', e.message);
}

export const getAllTrabajadores = catchAsync(async (req, res) => {
  // Activa automáticamente a los trabajadores cuya fechaAlta ya ha llegado
  // y registra cada activación en el Historial (lógica compartida con el
  // cron diario, ver services/cronService.js)
  await activarTrabajadoresPendientes();

  const trabajadores = await Trabajador.find();
  res.json(trabajadores);
});

export const getTrabajadorById = catchAsync(async (req, res) => {
  const trabajador = await Trabajador.findById(req.params.id);
  if (!trabajador) {
    return res.status(404).json({ error: 'Ficha de trabajador no localizada en la compañía.' });
  }
  res.json(trabajador);
});

export const createTrabajador = catchAsync(async (req, res) => {
  const nuevoTrabajador = new Trabajador(req.body);

  const trabajador = await nuevoTrabajador.save();

  // Se declara sin valor inicial: tanto el bloque try como el catch la asignan
  // siempre antes de usarla en el Historial.create() de más abajo.
  let observacionesOnboarding;
  try {
    await enviarCredencialesSeguras(trabajador);
    observacionesOnboarding = `Alta operacional del trabajador: ${trabajador.nombre} ${trabajador.apellidos}. Kit digital de credenciales generado con éxito, cifrado con DNI y despachado por correo.`;
  } catch (error) {
    console.error("⚠️ Fallo en el envío de credenciales automatizado:", error);
    observacionesOnboarding = `Alta del trabajador: ${trabajador.nombre} ${trabajador.apellidos}. ⚠️ ALERTA DE SEGURIDAD: No se pudo enviar el PDF de credenciales debido a un error de red o SMTP: ${error.message}`;
  }

  await Historial.create({
    tipoOperacion: 'create',
    elementoTipo: 'Trabajador',
    elementoId: trabajador._id,
    observaciones: observacionesOnboarding
  });

  // Si el trabajador es VMF, regenerar el Excel automáticamente sin bloquear la respuesta
  if (trabajador.cargo?.trim().toUpperCase() === 'VMF') {
    console.log(`🔄 [VMF] Trigger CREATE activado para: ${trabajador.nombre} ${trabajador.apellidos}`);
    generarExcelVMF().catch(err =>
      console.error('⚠️ No se pudo actualizar el Excel VMF:', err.message, err.stack)
    );
  }

  res.status(201).json(trabajador);
});

export const updateTrabajador = catchAsync(async (req, res) => {
  const trabajadorOriginal = await Trabajador.findById(req.params.id);
  if (!trabajadorOriginal) {
    return res.status(404).json({ error: 'El trabajador solicitado no existe.' });
  }

  // 🔒 findByIdAndUpdate NO ejecuta el hook pre('save') que cifra password/passwordApple,
  // así que si el formulario envía una contraseña nueva en texto plano la ciframos aquí
  // antes de guardarla. Si el campo llega vacío o no llega, no se toca (no se sobrescribe
  // la contraseña ya guardada).
  const datosActualizados = { ...req.body };
  if (datosActualizados.password) {
    datosActualizados.password = encrypt(datosActualizados.password);
  }
  if (datosActualizados.passwordApple) {
    datosActualizados.passwordApple = encrypt(datosActualizados.passwordApple);
  }

  const trabajador = await Trabajador.findByIdAndUpdate(
    req.params.id, 
    datosActualizados, 
    { new: true, runValidators: true }
  );

  const nombreCompleto = `${trabajador.nombre} ${trabajador.apellidos || ''}`.trim();
  await Historial.create({
    tipoOperacion: 'update',
    elementoTipo: 'Trabajador',
    elementoId: trabajador._id,
    observaciones: `Datos del empleado ${nombreCompleto} actualizados. Estado actual del registro: ${trabajador.estado}.`
  });

  // Regenerar Excel VMF si el cargo era o es VMF (cubre cambios hacia/desde VMF)
  const eraVMF = trabajadorOriginal.cargo?.trim().toUpperCase() === 'VMF';
  const esVMF  = trabajador.cargo?.trim().toUpperCase() === 'VMF';
  console.log(`🔍 [VMF] Trigger UPDATE — cargo antes: "${trabajadorOriginal.cargo}" | cargo ahora: "${trabajador.cargo}" | activa: ${eraVMF || esVMF}`);
  if (eraVMF || esVMF) {
    generarExcelVMF().catch(err =>
      console.error('⚠️ No se pudo actualizar el Excel VMF:', err.message, err.stack)
    );
  }

  res.json(trabajador);
});

export const deleteTrabajador = catchAsync(async (req, res) => {
  const trabajador = await Trabajador.findByIdAndDelete(req.params.id);
  if (!trabajador) {
    return res.status(404).json({ error: 'El registro del trabajador solicitado para remoción no existe.' });
  }

  await Historial.create({
    tipoOperacion: 'delete',
    elementoTipo: 'Trabajador',
    elementoId: trabajador._id,
    observaciones: `Eliminación del trabajador ${trabajador.nombre} ${trabajador.apellidos} del sistema.`
  });

  res.json({ message: 'Expediente del trabajador purgado correctamente.' });
});

export const exportToExcel = catchAsync(async (req, res) => {
  const trabajadores = await Trabajador.find();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Plantilla ERP Trabajadores');

  worksheet.columns = [
    { header: 'Nombre', key: 'nombre', width: 18 },
    { header: 'Apellidos', key: 'apellidos', width: 25 },
    { header: 'DNI / NIE', key: 'dni', width: 15 },
    { header: 'Fecha Nacimiento', key: 'fechaNacimiento', width: 15},
    { header: 'Género', key: 'genero', width: 18},
    { header: 'Estado', key: 'estado', width: 18},
    { header: 'Matrícula SAP', key: 'matriculaSAP', width: 15 },
    { header: 'Cargo / Puesto', key: 'cargo', width: 25 },
    { header: 'Agente', key: 'agente', width: 10},
    { header: 'Código Zona', key: 'codigoZona', width: 10},
    { header: 'Zona / Delegación', key: 'zona', width: 18 },
    { header: 'Calendario', key: 'calendario', width: 18},
    { header: 'Email Corporativo', key: 'emailAboca', width: 28 },
    { header: 'Username', key: 'username', width: 18},
    { header: 'Apple Id', key: 'appleID', width: 28},
    { header: 'Fecha Alta', key: 'fechaAlta', width: 15 },
    { header: 'Fecha Baja', key: 'fechaBaja', width: 15 },
    { header: 'Nº Contable', key: 'nContable', width: 15},
    { header: 'Cod Comercial', key: 'codComercial', width: 10},
    { header: 'Agente Comercial', key: 'agentComercial', width: 10},
    { header: 'Cod Medico', key: 'codMedico', width: 10},
    { header: 'Agente Medico', key: 'agentMedico', width: 10},
    { header: 'Población', key: 'poblacion', width: 18 },
    { header: 'Domicilio', key: 'domicilio', width: 30 }
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E293B' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 26;

  trabajadores.forEach(t => {
    worksheet.addRow({
      nombre: t.nombre || '',
      apellidos: t.apellidos || '',
      dni: t.dni || '',
      fechaNacimiento: t.fechaNacimiento ? new Date(t.fechaNacimiento).toLocaleDateString('es-ES') : '',
      genero: t.genero || '',
      estado: t.estado || '',
      matriculaSAP: t.matriculaSAP || '',
      cargo: t.cargo || '',
      zona: t.zona || '',
      emailAboca: t.emailAboca || '',
      fechaAlta: t.fechaAlta ? new Date(t.fechaAlta).toLocaleDateString('es-ES') : '',
      fechaBaja: t.fechaBaja ? new Date(t.fechaBaja).toLocaleDateString('es-ES') : '',
      poblacion: t.poblacion || '',
      domicilio: t.domicilio || '',
      agente: t.agente || '',
      codigoZona: t.codigoZona || '',
      calendario: t.calendario || '',
      username: t.username || '',
      appleID: t.appleID || '',
      nContable: t.nContable || '',
      codComercial: t.codComercial || '',
      agentComercial: t.agentComercial || '',
      codMedico: t.codMedico || '',
      agentMedico: t.agentMedico || '',
    });
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.font = { name: 'Segoe UI', size: 10 };
      row.alignment = { vertical: 'middle' };
    }
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=Listado_Trabajadores_ERP.xlsx'
  );

  await workbook.xlsx.write(res);
  res.end();
});

/**
 * 🔒 RUTA REESTRUCTURADA Y CORREGIDA: POST /api/trabajador/:id/credenciales-lote
 * @desc   Captura el buffer completo en memoria antes de servirlo para asegurar cifrado + logo visible.
 */
// Helper interno: genera el buffer del llavero en memoria sin enviar respuesta HTTP.
// Compartido por generarLlaveroCredencialesCifrado y enviarLlaveroPdfMail.
const _buildLlaveroPdfBuffer = (trabajador) => new Promise((resolve, reject) => {
  let codComercialLimpio = trabajador.codComercial || 'N/A';
  if (typeof codComercialLimpio === 'string' && codComercialLimpio.startsWith('31')) {
    codComercialLimpio = codComercialLimpio.slice(2);
  } else if (typeof codComercialLimpio === 'number' && String(codComercialLimpio).startsWith('31')) {
    codComercialLimpio = String(codComercialLimpio).slice(2);
  }

  const passwordCifradoPDF = trabajador.dni.trim().toUpperCase().replace(/[- ]/g, '');

  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    userPassword: passwordCifradoPDF,
    ownerPassword: process.env.PDF_OWNER_KEY,
    permissions: { printing: 'highResolution', modifying: false, copying: false }
  });

  const buffers = [];
  doc.on('data', chunk => buffers.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(buffers)));
  doc.on('error', reject);

  // Cabecera
  doc.rect(0, 0, 595.28, 75).fillColor('#0f172a').fill();
  let inicioTextoX = 40;
  if (logoBuffer) {
    try { doc.image(logoBuffer, 40, 15, { width: 45, height: 45 }); inicioTextoX = 105; }
    catch (e) { console.error('⚠️ Logo:', e.message); }
  }
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff').text('ABOCA ESPAÑA S.A.U', inicioTextoX, 24);
  doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8')
     .text('C/Jaume Comas i Jo, 2-Entlo.2ª, 08304 Mataró (Barcelona) España | Tel: 93.741.03.20 Fax: 93.790.18.20\nwww.aboca.es / e-mail: info@aboca.es', inicioTextoX, 36, { width: 450, lineGap: 2 });

  doc.moveDown(3.5);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#059669').text('CREDENCIALES ABOCA', 40, 100);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b').text('Empleado: ', { continued: true }).font('Helvetica').text(`${trabajador.nombre} ${trabajador.apellidos || ''}`);
  doc.font('Helvetica-Bold').text('DNI / NIE: ', { continued: true }).font('Helvetica').text(`${trabajador.dni}`);
  doc.font('Helvetica-Bold').text('Fecha de Expedición: ', { continued: true }).font('Helvetica').text(`${new Date().toLocaleDateString('es-ES')}`);
  doc.moveDown(1.5);

  const appendSystem = (titulo, usuario, password, extra = '') => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#4f46e5').text(titulo);
    doc.font('Helvetica').fontSize(9).fillColor('#334155').text(`   Usuario: ${usuario || 'N/A'}`);
    doc.text(`   Contraseña: ${password || 'N/A'}`);
    if (extra) doc.font('Helvetica-Oblique').fillColor('#64748b').text(`   ${extra}`);
    doc.moveDown(0.8);
  };

  const { password: passwordDescifrada, passwordApple: passwordAppleDescifrada } =
    descifrarCredencialesTrabajador(trabajador);

  appendSystem('1. Office365 & Mail', trabajador.emailAboca, passwordDescifrada);
  appendSystem('2. CYTRIC – Reserva de Billetes / Hoteles', trabajador.emailAboca, 'Aboca02+', 'URL: https://amadeus.cytric.net/env-b/ibe/?system=ama-nautalia-grupoaboca');
  appendSystem('3. Incidencias ServiceTonic (Por confirmar)', codComercialLimpio, '12345678', 'URL: https://aboca.myservicetonic.com/ServiceTonic/login.jsf');
  appendSystem('4. ORDINI (Por confirmar)', String(trabajador.username || '').toUpperCase(), String(passwordDescifrada || '').toUpperCase(), 'HostName:');
  appendSystem('5. WEBREPORT', String(trabajador.username || '').toUpperCase(), String(passwordDescifrada || '').toUpperCase(), 'URL: http://webreport.aboca.dom');
  appendSystem('6. ABOCA MANAGER', String(trabajador.username || '').toUpperCase(), String(passwordDescifrada || '').toUpperCase());
  appendSystem('7. Aboca Reporting', trabajador.emailAboca, passwordDescifrada, 'URL: https://reporting.aboca.dom/');
  appendSystem('8. Apple ID & Terminales Movilidad', trabajador.appleID, passwordAppleDescifrada,
    `PIN iPhone: ${trabajador.pinIphone || 'N/A'}   |   PIN iPad: ${trabajador.pinIpad || 'N/A'}   |   PIN Desbloqueo General: 110303`);

  doc.moveDown(0.5);
  doc.rect(40, doc.y, 515.28, 1).fillColor('#e2e8f0').fill();
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#94a3b8').text('AVISO DE SEGURIDAD INTERNO:', { align: 'justify' });
  doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8').text('Este documento contiene claves de acceso de alta confidencialidad y propiedad de Gruppo Aboca. Queda prohibida su distribución desprotegida.', { align: 'justify' });

  doc.end();
});

export const generarLlaveroCredencialesCifrado = catchAsync(async (req, res) => {
  const { id } = req.params;
  const trabajador = await Trabajador.findById(id).select('+password +passwordApple');
  if (!trabajador) return res.status(404).json({ error: 'El trabajador seleccionado no existe en la compañía.' });
  if (!trabajador.dni) return res.status(400).json({ error: 'Imposible cifrar documentación: El trabajador no tiene un DNI/NIE registrado.' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=LLAVERO_COMPLETO_${trabajador.nombre.toUpperCase()}.pdf`);

  const pdfData = await _buildLlaveroPdfBuffer(trabajador);

  await Historial.create({
    tipoOperacion: 'update',
    elementoTipo: 'Trabajador',
    elementoId: trabajador._id,
    observaciones: `🔒 Credenciales expedidas del trabajador ${trabajador.nombre} ${trabajador.apellidos}.`
  });

  res.send(pdfData);
});

// POST /trabajadores/:id/enviar-llavero
// Genera el llavero cifrado y lo envía por correo desde la cuenta corporativa.
export const enviarLlaveroPdfMail = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { destinatarios, asunto, cuerpo } = req.body;

  if (!destinatarios?.length) {
    return res.status(400).json({ error: 'Indica al menos un destinatario para el envío.' });
  }

  const trabajador = await Trabajador.findById(id).select('+password +passwordApple');
  if (!trabajador) return res.status(404).json({ error: 'El trabajador seleccionado no existe en la compañía.' });
  if (!trabajador.dni) return res.status(400).json({ error: 'El trabajador no tiene DNI/NIE registrado.' });

  const pdfData = await _buildLlaveroPdfBuffer(trabajador);
  const nombreArchivo = `Llavero_Corporativo_${trabajador.nombre}_${trabajador.apellidos || ''}.pdf`.replace(/\s+/g, '_');

  await enviarEmailConAdjunto({ destinatarios, asunto, cuerpo, pdfBuffer: pdfData, nombreArchivo });

  await Historial.create({
    tipoOperacion: 'update',
    elementoTipo: 'Trabajador',
    elementoId: trabajador._id,
    observaciones: `📧 Llavero de credenciales de ${trabajador.nombre} ${trabajador.apellidos} enviado por correo a: ${destinatarios.join(', ')}.`
  });

  res.json({ ok: true, mensaje: `Llavero enviado correctamente a: ${destinatarios.join(', ')}` });
});

/**
 * 🔒 POST /api/trabajadores/:id/revelar-credenciales
 * @desc   Revela en texto claro las contraseñas (password / passwordApple) de un trabajador,
 *         que en la base de datos permanecen siempre cifradas (AES-256-GCM).
 *         Para ello, el administrador que hace la petición debe reenviar SU PROPIA
 *         contraseña de acceso al ERP en el cuerpo de la petición. El servidor:
 *           1. Verifica esa contraseña contra el hash del administrador autenticado.
 *           2. Si es correcta, descifra y devuelve password/passwordApple del trabajador.
 *         Si la contraseña del administrador es incorrecta, no se descifra ni se
 *         devuelve nada.
 * @access Private (token JWT obligatorio, aplicado por el router)
 */
export const revelarCredenciales = catchAsync(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Debes reintroducir tu contraseña de administrador para revelar las credenciales.' });
  }

  // 1. Identificamos al administrador autenticado a partir del token JWT
  const adminId = req.user.id || req.user._id;
  const administrador = await Admin.findById(adminId).select('+password');

  if (!administrador) {
    return res.status(404).json({ error: 'El administrador de la sesión actual no existe en el sistema.' });
  }

  // 2. Verificamos que la contraseña reenviada coincide con la del administrador
  const passwordValido = await bcrypt.compare(password, administrador.password);
  if (!passwordValido) {
    return res.status(401).json({ error: 'Contraseña de confirmación incorrecta. Acceso denegado.' });
  }

  // 3. Recuperamos el trabajador, pidiendo explícitamente los campos cifrados (ocultos por defecto)
  const trabajador = await Trabajador.findById(req.params.id).select('+password +passwordApple');
  if (!trabajador) {
    return res.status(404).json({ error: 'El trabajador solicitado no existe.' });
  }

  // 4. Descifrado seguro: si algún valor está vacío o no es descifrable, devolvemos null
  // en lugar de romper toda la petición.
  const { password: passwordDescifrada, passwordApple: passwordAppleDescifrada } =
    descifrarCredencialesTrabajador(trabajador);

  res.status(200).json({
    success: true,
    password: passwordDescifrada,
    passwordApple: passwordAppleDescifrada
  });
});