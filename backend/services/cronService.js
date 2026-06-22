// backend/services/cronService.js
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

// La tarea programada se ejecuta ahora mediante un Vercel Cron Job que llama a
// POST /api/sistema/cron/activar-altas cada día a las 00:01 UTC.
// Ver backend/vercel.json → "crons".