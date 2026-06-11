// backend/services/onboardingService.js
import pdf from 'pdfjs';
import nodemailer from 'nodemailer';
import Helvetica from 'pdfjs/font/Helvetica.js'
import { decrypt } from '../utils/crypto.js';

/**
 * Genera un PDF cifrado con las credenciales y lo envía por correo electrónico al trabajador.
 * @param {Object} trabajador - Objeto con los datos del modelo Trabajador de Mongoose
 */
export const enviarCredencialesSeguras = async (trabajador) => {
  // 1. Configurar el transportador de correo (SMTP)
  // Reemplaza estos valores con los datos reales de tu servidor de correo corporativo o Gmail corporativo
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com', 
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true para puerto 465, false para otros puertos
    auth: {
      user: process.env.SMTP_USER || 'tu-correo-corporativo@aboca.es',
      pass: process.env.SMTP_PASS || 'tu-contrasena-de-aplicacion'
    }
  });

  // 2. Crear el documento PDF en memoria utilizando pdfjs
  const doc = new pdf.Document({
    font: Helvetica,
    padding: 20,
    // --- CIFRADO DE SEGURIDAD ---
    // Usamos el DNI/NIE en mayúsculas y sin espacios como contraseña de apertura (userPassword)
    encryption: {
      userPassword: trabajador.dni.trim().toUpperCase(),
      // 🔒 PDF_OWNER_KEY es obligatoria (validada al arrancar en server.js),
      // sin valor de respaldo hardcodeado.
      ownerPassword: process.env.PDF_OWNER_KEY,
      permissions: {
        print: true,
        modify: false,
        copy: false
      }
    }
  });

  // 🔒 Descifrado de las contraseñas reales. trabajador.password/passwordApple
  // están cifrados en BBDD (AES-256-GCM); si se incluyeran tal cual en el PDF,
  // el empleado recibiría texto cifrado ilegible en vez de su contraseña real.
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

  // 3. Diseñar el contenido estético del PDF corporativo
  // Encabezado
  doc.cell({ paddingBottom: 10 }).text('🔑 HOJA DE CREDENCIALES CORPORATIVAS', { fontSize: 16, bold: true });
  doc.cell({ paddingBottom: 20 }).text('ERP ABOCA - SISTEMAS E INFRAESTRUCTURA INMÓVIL', { fontSize: 10, color: 0x666666 });
  
  doc.text(`Estimado/a ${trabajador.nombre} ${trabajador.apellidos},`, { fontSize: 11 });
  doc.cell({ paddingBottom: 15 }).text('A continuación se detallan las credenciales provisionales asignadas para tus herramientas informáticas de trabajo. Por motivos de seguridad, se recomienda modificar estas contraseñas tras el primer acceso.', { fontSize: 11 });

  // Bloque de Cuenta Corporativa Aboca
  doc.cell({ paddingBottom: 5 }).text('💻 COMPUTACIÓN Y CUENTA CORPORATIVA ABOCA', { fontSize: 12, bold: true, color: 0x4f46e5 });
  doc.text(`• Correo Electrónico: ${trabajador.emailAboca || 'No asignado'}`, { fontSource: 'monospace' });
  doc.text(`• Nombre de Usuario: ${trabajador.username || 'No asignado'}`, { fontSource: 'monospace' });
  doc.cell({ paddingBottom: 15 }).text(`• Contraseña Inicial: ${passwordDescifrada || 'Inalterada / Protegida'}`, { fontSource: 'monospace' });

  // Bloque de Cuenta Apple (Si dispone de ella)
  if (trabajador.appleID) {
    doc.cell({ paddingBottom: 5 }).text('🍏 ENTORNO MÓVIL (ID DE APPLE CORPORATIVO)', { fontSize: 12, bold: true, color: 0xd97706 });
    doc.text(`• Apple ID: ${trabajador.appleID}`, { fontSource: 'monospace' });
    doc.cell({ paddingBottom: 15 }).text(`• Contraseña Apple: ${passwordAppleDescifrada || 'Establecida'}`, { fontSource: 'monospace' });
  }

  // Pie de página de confidencialidad
  doc.cell({ paddingTop: 30 }).text('🔒 DOCUMENTO CONFIDENCIAL DE ALTA SEGURIDAD', { fontSize: 9, bold: true, color: 0x94a3b8, alignment: 'center' });
  doc.text('Este documento PDF está encriptado bajo algoritmos de seguridad simétrica. La clave de apertura es su DNI/NIE oficial.', { fontSize: 8, color: 0x94a3b8, alignment: 'center' });

  // 4. Renderizar el PDF a un buffer binario
  const pdfBuffer = await doc.asBuffer();

  // 5. Configurar y lanzar el correo electrónico con el archivo adjunto
  const destinatario = trabajador.emailAboca || process.env.EMAIL_FALLBACK_RRHH;
  
  if (!destinatario) {
    throw new Error('El colaborador no dispone de un correo corporativo o bandeja de contingencia asignada.');
  }

  const mailOptions = {
    from: '"Sistemas ERP Aboca" <no-reply@aboca.es>',
    to: destinatario,
    subject: `🚀 ¡Bienvenido/a a la compañía, ${trabajador.nombre}! - Credenciales de acceso`,
    html: `
      <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; rounded: 12px;">
        <h2 style="color: #4f46e5;">¡Hola, ${trabajador.nombre}! 👋</h2>
        <p>Te damos una cálida bienvenida al equipo corporativo. Tus cuentas operacionales ya han sido desplegadas con éxito en la plataforma.</p>
        <p>Adjunto a este correo electrónico encontrarás un <strong>documento PDF protegido</strong> que contiene todas tus contraseñas y nombres de usuario para comenzar.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px; margin: 20px 0; font-size: 13px;">
          <strong>🔒 Instrucciones de apertura de seguridad:</strong><br>
          El documento adjunto está cifrado. Para abrirlo e inspeccionar tus claves, introduce tu <strong>DNI o NIE (en letras mayúsculas y sin espacios)</strong> como contraseña de desbloqueo.
        </div>
        
        <p style="font-size: 12px; color: #64748b;">Este es un mensaje automático generado por el portal de Recursos Humanos de la organización.</p>
      </div>
    `,
    attachments: [
      {
        filename: `Credenciales_${trabajador.nombre}_${trabajador.apellidos}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  // Enviar el email real
  return await transporter.sendMail(mailOptions);
};