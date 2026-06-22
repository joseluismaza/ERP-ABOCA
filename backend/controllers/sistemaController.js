// backend/controllers/sistemaController.js
import Historial from '../models/Historial.js';
import { catchAsync } from '../middleware/errorHandler.js';
import { activarTrabajadoresPendientes } from '../services/cronService.js';

// 🟢 CONTROL DE CALENDARIO Y CADUCIDAD DE CONTRASEÑA (60 DÍAS)
export const checkSMTPStatus = catchAsync(async (req, res) => {
  const ultimaActualizacion = process.env.SMTP_LAST_UPDATE;
  
  if (!ultimaActualizacion) {
    return res.json({ alerta: false, mensaje: "Mantenimiento SMTP no configurado en .env" });
  }

  const fechaClave = new Date(ultimaActualizacion);
  const hoy = new Date();
  
  // Calcular diferencia en días exactos
  const diferenciaTiempo = hoy.getTime() - fechaClave.getTime();
  const diasTranscurridos = Math.floor(diferenciaTiempo / (1000 * 60 * 60 * 24));
  const diasRestantes = 60 - diasTranscurridos;

  // Si faltan menos de 7 días pero la clave sigue activa
  if (diasRestantes <= 7 && diasRestantes > 0) {
    return res.json({
      alerta: true,
      tipo: 'warning',
      mensaje: `⚠️ ATENCIÓN: La contraseña SMTP corporativa caduca en ${diasRestantes} días. Renuévela en Microsoft 365 para evitar cortes de servicio.`
    });
  }

  // Si ya ha vencido el plazo de 60 días
  if (diasRestantes <= 0) {
    return res.json({
      alerta: true,
      tipo: 'critical',
      mensaje: `🚨 ERROR CRÍTICO: La contraseña SMTP corporativa ha CADUCADO (Expiró hace ${Math.abs(diasRestantes)} días). Actualice la clave en el servidor de inmediato.`
    });
  }

  // Si todo está correcto (quedan más de 7 días)
  res.json({ alerta: false, diasRestantes });
});

// 🕐 VERCEL CRON JOB — GET /api/sistema/cron/activar-altas
// Llamado automáticamente por Vercel cada día a las 00:01 UTC.
// Protegido por CRON_SECRET en lugar de JWT (Vercel no envía token de usuario).
export const ejecutarCronAltas = catchAsync(async (req, res) => {
  const authHeader = req.headers.authorization || '';
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  const numActivados = await activarTrabajadoresPendientes();
  console.log(`[VERCEL-CRON] ${numActivados} empleado(s) activado(s) automáticamente.`);
  res.json({ ok: true, activados: numActivados });
});

// 📥 ENDPOINT DE DESCARGA BINARIA DE ACTAS
export const descargarDocumentoHistorial = catchAsync(async (req, res) => {
  const { historialId } = req.params;

  const registro = await Historial.findById(historialId).populate('elementoId');
  
  if (!registro || !registro.archivoAdjunto) {
    return res.status(404).json({ message: 'El documento PDF solicitado no existe o no ha sido generado.' });
  }

  const nombreTrabajador = registro.elementoId 
    ? `${registro.elementoId.nombre}_${registro.elementoId.apellidos}`.replace(/\s+/g, '_')
    : 'Documento';
  
  const tipoDoc = registro.documentoTipo || 'Acta';
  const fileName = `${tipoDoc}_${nombreTrabajador}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  res.send(registro.archivoAdjunto);
});