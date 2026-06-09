import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAllHistorial,
  getHistorialById,
  createHistorial
} from '../controllers/historialController.js';

const router = express.Router();

// Aplica blindaje de autenticación JWT mandatorio para todos los sub-enlaces de auditoría
router.use(authenticateToken);

router.get('/', getAllHistorial);
router.get('/:id', getHistorialById);
router.post('/', createHistorial);

export default router;