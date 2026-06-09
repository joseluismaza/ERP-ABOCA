import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAllTelefonos,
  getTelefonoById,
  createTelefono,
  updateTelefono,
  deleteTelefono,
  exportToExcel
} from '../controllers/telefonoController.js';

const router = express.Router();

router.use(authenticateToken);

// Ruta fija antes de /:id para evitar colisiones en Express
router.get('/exportar', exportToExcel);

router.get('/', getAllTelefonos);
router.get('/:id', getTelefonoById);
router.post('/', createTelefono);
router.put('/:id', updateTelefono);
router.delete('/:id', deleteTelefono);

export default router;