// backend/routes/sistemaRoutes.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { descargarDocumentoHistorial } from '../controllers/sistemaController.js';

const router = express.Router();

// Exige un token JWT válido (igual que el resto de módulos del ERP) antes de
// acceder a cualquiera de las rutas de este archivo.
router.use(authenticateToken);

router.get('/historial/descargar/:historialId', descargarDocumentoHistorial);

export default router;