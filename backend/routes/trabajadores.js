// backend/routes/trabajadores.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAllTrabajadores,
  getTrabajadorById,
  createTrabajador,
  updateTrabajador,
  deleteTrabajador,
  exportToExcel,
  generarLlaveroCredencialesCifrado,
  revelarCredenciales
} from '../controllers/trabajadorController.js';
import { checkSMTPStatus } from '../controllers/sistemaController.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/exportar', exportToExcel);
router.get('/smtp-status', checkSMTPStatus);

router.post('/:id/credenciales-lote', generarLlaveroCredencialesCifrado);
// 🔒 Revela password/passwordApple en texto claro, previa reconfirmación de la
// contraseña del administrador autenticado.
router.post('/:id/revelar-credenciales', revelarCredenciales);

router.get('/', getAllTrabajadores);
router.get('/:id', getTrabajadorById);
router.post('/', createTrabajador);
router.put('/:id', updateTrabajador);
router.delete('/:id', deleteTrabajador);

export default router;