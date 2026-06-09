// backend/services/cronService.js
import cron from 'node-cron';
import Trabajador from '../models/Trabajador.js';
import Historial from '../models/Historial.js';

// Programamos la tarea para que se ejecute CADA DÍA a las 00:01 AM
cron.schedule('1 0 * * *', async () => {
  console.log('[CRON-JOB] Iniciando verificación diaria de altas automáticas...');
  
  try {
    const hoy = new Date();

    // 1. Buscamos trabajadores en estado 'Pendiente de alta' cuya fechaAlta sea igual o menor a HOY
    const trabajadoresParaActivar = await Trabajador.find({
      estado: 'Pendiente de alta',
      fechaAlta: { $lte: hoy }
    });

    if (trabajadoresParaActivar.length === 0) {
      console.log('[CRON-JOB] No hay altas pendientes para procesar hoy.');
      return;
    }

    // 2. Activamos a los trabajadores de forma masiva
    for (const trabajador of trabajadoresParaActivar) {
      await Trabajador.findByIdAndUpdate(trabajador._id, { estado: 'Activo' });
      
      // Dejamos constancia irreversible en el registro de auditoría del sistema
      await Historial.create({
        tipoOperacion: 'update',
        elementoTipo: 'Trabajador',
        elementoId: trabajador._id,
        observaciones: `🔄 ACTIVACIÓN AUTOMÁTICA DE SISTEMA: El empleado [${trabajador.nombre} ${trabajador.apellidos || ''}] ha cambiado automáticamente su estado a ACTIVO al cumplirse su fecha planificada de incorporación.`
      });
      
      console.log(`[CRON-JOB] Empleado ${trabajador.nombre} activado automáticamente.`);
    }

  } catch (error) {
    console.error('[CRON-JOB CRÍTICO] Error al procesar las altas automáticas:', error);
  }
});