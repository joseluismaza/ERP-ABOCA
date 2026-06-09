// backend/routes/sistemaRoutes.js
import express from 'express';
import { checkSMTPStatus, descargarDocumentoHistorial } from '../controllers/sistemaController.js';

const router = express.Router();

// Tus dos endpoints del módulo del sistema
router.get('/smtp-status', checkSMTPStatus);
router.get('/historial/descargar/:historialId', descargarDocumentoHistorial);

export default router;