// backend/routes/auth.js
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs'; 
import Admin from '../models/Admin.js'; // 👈 Corregido el import para usar tu modelo real
import { catchAsync } from '../middleware/errorHandler.js';
import { login } from '../controllers/authController.js'; 

const router = express.Router();

/**
 * @route   POST /api/auth/confirmar-password
 * @desc    Bouncer de seguridad para confirmar identidad del administrador en caliente
 * @access  Private
 */
router.post('/confirmar-password', authenticateToken, catchAsync(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'La contraseña de verificación es obligatoria.' });
  }

  // 1. Extraemos el ID del administrador desde el token decodificado por tu middleware
  const adminId = req.user.id || req.user._id;
  
  // 2. Buscamos en el modelo Admin (Mongoose mapeará automáticamente a la colección 'usuarios')
  const administrador = await Admin.findById(adminId);

  if (!administrador) {
    // Si llegara aquí, es que el token pertenece a un ID que ya no existe en la colección 'usuarios'
    return res.status(404).json({ error: 'El administrador de la sesión actual no existe en el sistema.' });
  }

  // 3. Comparamos la contraseña en texto plano recibida con el hash 'password' del esquema
  const passwordValido = await bcrypt.compare(password, administrador.password);

  if (!passwordValido) {
    return res.status(401).json({ error: 'Contraseña de confirmación incorrecta. Acceso denegado.' });
  }

  // 4. Si el hash coincide, devolvemos un estado 200 limpio para que Axios continúe
  res.status(200).json({ 
    success: true, 
    message: 'Identidad confirmada. Llavero digital desbloqueado temporalmente.' 
  });
}));

// Mantenemos tu ruta ordinaria de login intacta
router.post('/login', login);

export default router;