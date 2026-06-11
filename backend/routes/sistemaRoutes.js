
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { checkSMTPStatus, descargarDocumentoHistorial } from '../controllers/sistemaController.js';

const router = express.Router();

// Exige un token JWT válido (igual que el resto de módulos del ERP) antes de
// acceder a cualquiera de las rutas de este archivo.
router.use(authenticateToken);

// Tus dos endpoints del módulo del sistema
router.get('/smtp-status', checkSMTPStatus);
router.get('/historial/descargar/:historialId', descargarDocumentoHistorial);

export default router;