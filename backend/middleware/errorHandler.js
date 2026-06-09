/**
 * Middleware centralizado de Express para la captura y gestión de excepciones.
 * Evita la duplicación masiva de bloques try/catch en la capa de controladores.
 */
export const errorHandler = (err, req, res, next) => {
  console.error(`[Server Error] ${err.stack || err.message}`);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    error: message
  });
};

/**
 * Abstracción wrapper para interceptar errores en funciones asíncronas de Express
 * eliminando la necesidad de escribir bloques try/catch repetitivos.
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};