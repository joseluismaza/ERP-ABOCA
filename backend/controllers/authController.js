// backend/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import { catchAsync } from '../middleware/errorHandler.js';

/**
 * Procesa la autenticación corporativa de administradores en la aplicación.
 * Valida credenciales, firma un token de sesión e inyecta los metadatos de usuario
 * obligatorios para la sincronización del estado dinámico del cliente (Sidebar/Roles).
 */
export const login = catchAsync(async (req, res) => {
  const { username, password } = req.body;

  // 1. Validación previa de presencia de parámetros mandatorios en la petición HTTP
  if (!username || !password) {
    return res.status(400).json({ error: 'Parámetros obligatorios: username y password.' });
  }

  // 2. Consulta en la base de datos (Colección: usuarios) mapeada por el modelo Admin
  // 🔒 .select('+password'): el campo está oculto por defecto (select: false en el
  // esquema), pero aquí lo necesitamos para poder verificarlo con bcrypt.
  const admin = await Admin.findOne({ username }).select('+password');

  // 🩺 LOG TEMPORAL DE DIAGNÓSTICO - lo quitaremos en cuanto identifiquemos el problema
  console.log('[DEBUG login] admin encontrado:', admin ? admin.toObject() : null);
  console.log('[DEBUG login] tipo de admin.password:', typeof admin?.password);
  
  // El uso de mensajes de error idénticos previene ataques de enumeración de cuentas por fuerza bruta
  if (!admin) {
    return res.status(401).json({ error: 'Credenciales de acceso incorrectas.' });
  }

  // 3. Verificación criptográfica de la contraseña utilizando bcrypt
  const validPassword = await bcrypt.compare(password, admin.password);
  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciales de acceso incorrectas.' });
  }

  // 4. Creación del token de sesión firmado con caducidad mandatoria de 24 horas
  // 🔒 JWT_SECRET es obligatorio (validado al arrancar en server.js), sin valor
  // de respaldo: usar 'secret' permitiría a cualquiera firmar tokens válidos.
  const token = jwt.sign(
    { id: admin._id, username: admin.username, rol: admin.rol },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  /**
   * ARQUITECTURA OPTIMIZADA: Sincronización transparente Frontend-Backend.
   * Respondemos al cliente inyectando tanto el token JWT como el subobjeto 'user' 
   * con las propiedades exactas requeridas por el Sidebar para evitar duplicación 
   * de peticiones asíncronas de red. Omitimos contraseñas por directiva de seguridad.
   */
  return res.status(200).json({ 
    success: true,
    token,
    user: {
      _id: admin._id,
      username: admin.username,
      rol: admin.rol || 'admin' // Fallback interno controlado basado en el enum del esquema
    }
  });
});