// backend/routes/sistemaRoutes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { descargarDocumentoHistorial, ejecutarCronAltas } from '../controllers/sistemaController.js';

const router = express.Router();

// Ruta pública protegida por CRON_SECRET (no JWT) — llamada por Vercel Cron Job
router.get('/cron/activar-altas', ejecutarCronAltas);

// El resto de rutas exigen token JWT válido
router.use(authenticateToken);

router.get('/historial/descargar/:historialId', descargarDocumentoHistorial);

export default router;