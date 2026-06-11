import jwt from 'jsonwebtoken';

/**
 * Intercepta y valida la existencia y firma del token JWT en las peticiones.
 * Protege los endpoints del negocio frente a accesos no autenticados.
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Formato esperado estricto: 'Bearer <TOKEN>'
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token de autenticación no suministrado.' });
  }

  // 🔒 JWT_SECRET es obligatorio (validado al arrancar en server.js), sin valor
  // de respaldo: usar 'secret' permitiría a cualquiera firmar tokens válidos.
  jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido, expirado o alterado.' });
    }
    
    // Asigna el payload decodificado al objeto request para su posterior auditoría
    req.user = decodedUser;
    next();
  });
};