import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAllMateriales,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  documentarMateriales,
  exportToExcel,
  getMaterialBySnOrImei
} from '../controllers/materialController.js';

const router = express.Router();

router.use(authenticateToken);

// Rutas fijas antes de /:id para evitar colisiones en Express
router.get('/exportar', exportToExcel);
router.get('/', getAllMateriales);

// 🛠️ 2. REGISTRAR AQUÍ: Cambia el router.post antiguo por esta ruta por GET.
// Debe ir antes de router.get('/:id') para evitar colisiones de rutas en Express.
router.get('/:id/documentar', documentarMateriales); 
router.get('/buscar/:code', getMaterialBySnOrImei);
router.get('/:id', getMaterialById);
router.post('/', createMaterial);
router.put('/:id', updateMaterial);
router.delete('/:id', deleteMaterial);

export default router;