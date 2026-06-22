// backend/services/emailService.js
import nodemailer from 'nodemailer';

// Transporter dedicado para Office 365 (STARTTLS port 587).
// Usa las mismas variables SMTP_USER / SMTP_PASS que el resto del proyecto.
const crearTransporter = () => nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,       // STARTTLS (no SSL directo)
  requireTLS: true,    // Obliga a negociar TLS antes de autenticar
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: { ciphers: 'SSLv3', rejectUnauthorized: false }
});

/**
 * Envía un email con un PDF adjunto desde la cuenta corporativa de Office 365.
 * @param {string[]} destinatarios  - Array de direcciones de correo destino
 * @param {string}   asunto         - Asunto del correo
 * @param {string}   cuerpo         - Cuerpo en texto plano (se envuelve en HTML automáticamente)
 * @param {Buffer}   pdfBuffer      - Buffer binario del PDF generado
 * @param {string}   nombreArchivo  - Nombre del archivo adjunto (ej: ACTA_ENTREGA_JUAN.pdf)
 */
export const enviarEmailConAdjunto = async ({ destinatarios, asunto, cuerpo, pdfBuffer, nombreArchivo }) => {
  const transporter = crearTransporter();

  // Convertimos el texto plano del cuerpo en HTML legible preservando los saltos de línea
  const cuerpoHtml = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; max-width: 620px; line-height: 1.7;">
      ${cuerpo.replace(/\n/g, '<br>')}
      <br><br>
      <hr style="border:none; border-top:1px solid #e2e8f0; margin: 20px 0;">
      <p style="font-size: 11px; color: #94a3b8;">
        Este mensaje ha sido generado automáticamente por el ERP de Aboca España S.A.U.<br>
        Por favor, no responda a este correo directamente.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"ERP Aboca — Sistemas" <${process.env.SMTP_USER}>`,
    to: destinatarios.join(', '),
    subject: asunto,
    html: cuerpoHtml,
    attachments: [{
      filename: nombreArchivo,
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]
  });
};
