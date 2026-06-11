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
import { encrypt, decrypt } from "../utils/crypto.js";

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
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  await Trabajador.updateMany(
    {
      estado: 'Pendiente de alta',
      fechaAlta: { $lte: hoy }
    },
    {
      $set: { estado: 'Activo' }
    }
  );

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

  if (!nuevoTrabajador.id) {
    nuevoTrabajador.id = nuevoTrabajador._id.toString();
  }

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
    { header: 'Código Zona', key: 'codZona', width: 10},
    { header: 'Zona / Delegación', key: 'zona', width: 18 },
    { header: 'Calendario', key: 'calendario', width: 18},
    { header: 'Estado', key: 'estado', width: 18 },
    { header: 'Email Corporativo', key: 'emailAboca', width: 28 },
    { header: 'Password Aboca', key: 'password', width: 10},
    { header: 'Username', key: 'username', width: 18},
    { header: 'Apple Id', key: 'appleID', width: 28},
    { header: 'Password Apple', key: 'passwordApple', width: 10},
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
      matriculaSAP: t.matriculaSAP || '',
      cargo: t.cargo || '',
      zona: t.zona || '',
      estado: t.estado || '',
      emailAboca: t.emailAboca || '',
      fechaAlta: t.fechaAlta ? new Date(t.fechaAlta).toLocaleDateString('es-ES') : '',
      fechaBaja: t.fechaBaja ? new Date(t.fechaBaja).toLocaleDateString('es-ES') : 'Activo',
      poblacion: t.poblacion || '',
      domicilio: t.domicilio || '',
      agente: t.agente || '',
      codZona: t.codZona || '',
      calendario: t.calendario || '',
      username: t.username || '',
      appleID: t.appleID || '',
      passwordApple: t.passwordApple || '',
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
export const generarLlaveroCredencialesCifrado = catchAsync(async (req, res) => {
  const { id } = req.params;

  // 1. Obtener datos del trabajador (incluyendo password/passwordApple, ocultos por defecto)
  const trabajador = await Trabajador.findById(id).select('+password +passwordApple');
  if (!trabajador) {
    return res.status(404).json({ error: 'El trabajador seleccionado no existe en la compañía.' });
  }

  if (!trabajador.dni) {
    return res.status(400).json({ error: 'Imposible cifrar documentación: El trabajador no tiene un DNI/NIE registrado.' });
  }

  // Sanitizamos el DNI para la clave de apertura (Mayúsculas, sin espacios ni guiones)
  const passwordCifradoPDF = trabajador.dni.trim().toUpperCase().replace(/[- ]/g, '');

  // ✂️ LIMPIEZA DEL CÓDIGO COMERCIAL: Si empieza por "31", lo removemos para las credenciales
  let codComercialLimpio = trabajador.codComercial || 'N/A';
  if (typeof codComercialLimpio === 'string' && codComercialLimpio.startsWith('31')) {
    codComercialLimpio = codComercialLimpio.slice(2);
  } else if (typeof codComercialLimpio === 'number' && String(codComercialLimpio).startsWith('31')) {
    codComercialLimpio = String(codComercialLimpio).slice(2);
  }

  // 2. CONFIGURAR CABECERAS DE RESPUESTA HTTP ANTICIPADAS
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=LLAVERO_COMPLETO_${trabajador.nombre.toUpperCase()}.pdf`);

  // 3. INICIALIZAR PDFKIT CON CIFRADO MAESTRO NATIVO ACTIVADO
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    userPassword: passwordCifradoPDF, // 🔒 Forzar ingreso de DNI obligatoriamente
    // 🔒 Contraseña de propietario del PDF: variable dedicada PDF_OWNER_KEY
    // (obligatoria, validada al arrancar en server.js). Antes reutilizaba
    // JWT_SECRET con un valor de respaldo hardcodeado ('MasterERPKeyAboca').
    ownerPassword: process.env.PDF_OWNER_KEY,
    permissions: {
      printing: 'highResolution',
      modifying: false,
      copying: false
    }
  });

  // 🔄 ESTRATEGIA DE BUFFER SEGURO: Recolectamos los fragmentos de datos en memoria
  const buffers = [];
  doc.on('data', chunk => buffers.push(chunk));
  doc.on('end', async () => {
    const pdfData = Buffer.concat(buffers);
    
    // Guardamos constancia en la base de datos dentro del Historial antes del envío final
    await Historial.create({
      tipoOperacion: 'update',
      elementoTipo: 'Trabajador',
      elementoId: trabajador._id,
      observaciones: `🔒 Credenciales expedidas del trabajador ${trabajador.nombre} ${trabajador.apellidos}.`
    });

    // Despachamos el binario sellado de un solo golpe. 
    res.send(pdfData);
  });

  // 4. DISEÑO Y MAQUETACIÓN DEL LLAVERO CORPORATIVO
  // Cabecera Slate Dark (Alto 75)
  doc.rect(0, 0, 595.28, 75).fillColor('#0f172a').fill();
  
  // Inyección del Logo Seguro
  let inicioTextoX = 40;

  if (logoBuffer) {
    try {
      doc.image(logoBuffer, 40, 15, { width: 45, height: 45 }); // Buffer, no ruta
      inicioTextoX = 105;
    } catch (imgError) {
      console.error('⚠️ Error incrustando logo en PDF:', imgError.message);
    }
  }

  // Textos corporativos de Cabecera
  doc.font('Helvetica-Bold')
     .fontSize(11)
     .fillColor('#ffffff')
     .text('ABOCA ESPAÑA S.A.U', inicioTextoX, 24);
  
  doc.font('Helvetica')
     .fontSize(7.5)
     .fillColor('#94a3b8')
     .text(
       'C/Jaume Comas i Jo, 2-Entlo.2ª, 08304 Mataró (Barcelona) España | Tel: 93.741.03.20 Fax: 93.790.18.20\nwww.aboca.es / e-mail: info@aboca.es', 
       inicioTextoX, 
       36, 
       { width: 450, lineGap: 2 }
     );

  // Cuerpo del PDF
  doc.moveDown(3.5);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#059669').text('CREDENCIALES ABOCA', 40, 100);
  doc.moveDown(0.5);

  // Información del Empleado
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e293b').text('Empleado: ', { continued: true }).font('Helvetica').text(`${trabajador.nombre} ${trabajador.apellidos || ''}`);
  doc.font('Helvetica-Bold').text('DNI / NIE: ', { continued: true }).font('Helvetica').text(`${trabajador.dni}`);
  doc.font('Helvetica-Bold').text('Fecha de Expedición: ', { continued: true }).font('Helvetica').text(`${new Date().toLocaleDateString('es-ES')}`);
  doc.moveDown(1.5);

  // Helper dinámico para renderizar los bloques del ecosistema
  const appendSystem = (titulo, usuario, password, extra = '') => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#4f46e5').text(titulo);
    doc.font('Helvetica').fontSize(9).fillColor('#334155').text(`   Usuario: ${usuario || 'N/A'}`);
    doc.text(`   Contraseña: ${password || 'N/A'}`);
    if (extra) {
      doc.font('Helvetica-Oblique').fillColor('#64748b').text(`   ${extra}`);
    }
    doc.moveDown(0.8);
  };

  // 🔒 Descifrado de las contraseñas reales. Se hace UNA sola vez aquí y se
  // reutiliza en todos los sistemas, en vez de mostrar trabajador.password
  // (que en BBDD está cifrado) directamente en algunas tarjetas como pasaba antes.
  let passwordDescifrada = null;
  let passwordAppleDescifrada = null;

  try {
    passwordDescifrada = decrypt(trabajador.password);
  } catch (err) {
    console.error('⚠️ Error al descifrar password del trabajador:', err.message);
  }

  try {
    passwordAppleDescifrada = decrypt(trabajador.passwordApple);
  } catch (err) {
    console.error('⚠️ Error al descifrar passwordApple del trabajador:', err.message);
  }

  // Renderizado de los 8 sistemas
  appendSystem('1. Office365 & Mail', trabajador.emailAboca, passwordDescifrada);
  appendSystem('2. CYTRIC – Reserva de Billetes / Hoteles', trabajador.emailAboca, 'Aboca02+', 'URL: https://amadeus.cytric.net/env-b/ibe/?system=ama-nautalia-grupoaboca');
  appendSystem('3. Incidencias ServiceTonic (Por confirmar)', codComercialLimpio, '12345678', 'URL: https://aboca.myservicetonic.com/ServiceTonic/login.jsf');
  appendSystem('4. ORDINI (Por confirmar)', String(trabajador.username || '').toUpperCase(), String(passwordDescifrada || '').toUpperCase(), 'HostName:');
  appendSystem('5. WEBREPORT', String(trabajador.username || '').toUpperCase(), String(passwordDescifrada || '').toUpperCase(), 'URL: http://webreport.aboca.dom');
  appendSystem('6. ABOCA MANAGER', String(trabajador.username || '').toUpperCase(), String(passwordDescifrada || '').toUpperCase());
  appendSystem('7. Aboca Reporting', trabajador.emailAboca, passwordDescifrada, 'URL: https://reporting.aboca.dom/');
  
  const pinIphone = trabajador.pinIphone || 'N/A';
  const pinIpad = trabajador.pinIpad || 'N/A';
  appendSystem('8. Apple ID & Terminales Movilidad', trabajador.appleID, passwordAppleDescifrada, `PIN iPhone: ${pinIphone}   |   PIN iPad: ${pinIpad}   |   PIN Desbloqueo General: 110303`);

  // Footer de seguridad
  doc.moveDown(0.5);
  doc.rect(40, doc.y, 515.28, 1).fillColor('#e2e8f0').fill();
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#94a3b8').text('AVISO DE SEGURIDAD INTERNO:', { align: 'justify' });
  doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8').text('Este documento contiene claves de acceso de alta confidencialidad y propiedad de Gruppo Aboca. Queda prohibida su distribución desprotegida.', { align: 'justify' });

  // Concluimos la escritura en el documento. Esto disparará automáticamente el evento 'end' configurado arriba.
  doc.end();
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
  const administrador = await Admin.findById(adminId);

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
  let passwordDescifrada = null;
  let passwordAppleDescifrada = null;

  try {
    passwordDescifrada = decrypt(trabajador.password);
  } catch (err) {
    console.error('⚠️ Error al descifrar password del trabajador:', err.message);
  }

  try {
    passwordAppleDescifrada = decrypt(trabajador.passwordApple);
  } catch (err) {
    console.error('⚠️ Error al descifrar passwordApple del trabajador:', err.message);
  }

  res.status(200).json({
    success: true,
    password: passwordDescifrada,
    passwordApple: passwordAppleDescifrada
  });
});