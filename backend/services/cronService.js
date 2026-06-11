// backend/services/cronService.js
import cron from 'node-cron';
import Trabajador from '../models/Trabajador.js';
import Historial from '../models/Historial.js';

/**
 * Busca trabajadores en estado 'Pendiente de alta' cuya fechaAlta ya ha
 * llegado, los activa ('Activo') y deja constancia de cada activación en el
 * Historial de auditoría.
 *
 * Se reutiliza desde dos sitios:
 *  - La tarea programada de abajo, que se ejecuta una vez al día.
 *  - getAllTrabajadores, para que el cambio de estado se vea reflejado al
 *    instante la primera vez que alguien consulta el listado, sin esperar
 *    a la medianoche.
 *
 * Gracias a tener un único punto de activación, cada trabajador queda
 * registrado en el Historial exactamente una vez (en cuanto su estado pasa
 * de 'Pendiente de alta' a 'Activo'), se dispare desde donde se dispare.
 *
 * @returns {Promise<number>} número de trabajadores activados en esta llamada
 */
export const activarTrabajadoresPendientes = async () => {
  const hoy = new Date();

  const trabajadoresParaActivar = await Trabajador.find({
    estado: 'Pendiente de alta',
    fechaAlta: { $lte: hoy }
  });

  for (const trabajador of trabajadoresParaActivar) {
    await Trabajador.findByIdAndUpdate(trabajador._id, { estado: 'Activo' });

    // Dejamos constancia irreversible en el registro de auditoría del sistema
    await Historial.create({
      tipoOperacion: 'update',
      elementoTipo: 'Trabajador',
      elementoId: trabajador._id,
      observaciones: `🔄 ACTIVACIÓN AUTOMÁTICA DE SISTEMA: El empleado [${trabajador.nombre} ${trabajador.apellidos || ''}] ha cambiado automáticamente su estado a ACTIVO al cumplirse su fecha planificada de incorporación.`
    });
  }

  return trabajadoresParaActivar.length;
};

// Programamos la tarea para que se ejecute CADA DÍA a las 00:01 AM
// (red de seguridad por si el servidor estuvo apagado o nadie consultó el
// listado de trabajadores ese día)
cron.schedule('1 0 * * *', async () => {
  console.log('[CRON-JOB] Iniciando verificación diaria de altas automáticas...');

  try {
    const numActivados = await activarTrabajadoresPendientes();

    if (numActivados === 0) {
      console.log('[CRON-JOB] No hay altas pendientes para procesar hoy.');
    } else {
      console.log(`[CRON-JOB] ${numActivados} empleado(s) activado(s) automáticamente.`);
    }
  } catch (error) {
    console.error('[CRON-JOB CRÍTICO] Error al procesar las altas automáticas:', error);
  }
});