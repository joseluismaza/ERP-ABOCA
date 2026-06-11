/**
 * Middleware centralizado de Express para la captura y gestión de excepciones.
 * Evita la duplicación masiva de bloques try/catch en la capa de controladores.
 *
 * 🔒 IMPORTANTE: el detalle completo del error (err.stack) SIEMPRE se registra
 * en la consola del servidor, pero lo que se envía al cliente se filtra según
 * el tipo de error, para no exponer detalles internos (nombres de modelos,
 * colecciones, índices de MongoDB, rutas de archivo, configuración del
 * servidor, etc.) a quien hace la petición.
 */
// Nota: Express identifica el middleware de manejo de errores por tener
// EXACTAMENTE 4 parámetros (err, req, res, next). El 4º parámetro debe seguir
// presente aunque no se use; se renombra a "_next" siguiendo la convención
// del proyecto para variables/argumentos intencionalmente no usados.
export const errorHandler = (err, req, res, _next) => {
  console.error(`[Server Error] ${err.stack || err.message}`);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  // Errores de validación de Mongoose (campos obligatorios, enums, etc.):
  // sus mensajes están pensados para el usuario final, así que se mantienen.
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((campo) => campo.message)
      .join(' ');
  }
  // ID con formato inválido (por ejemplo, /api/trabajadores/abc): el mensaje
  // original de Mongoose incluye el nombre interno del modelo de Mongoose.
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'El identificador proporcionado no tiene un formato válido.';
  }
  // Clave duplicada (índice único de MongoDB, ej. DNI o matrícula repetidos):
  // el mensaje original de MongoDB incluye el nombre de la base de datos,
  // la colección y el índice afectados.
  else if (err.code === 11000) {
    statusCode = 409;
    message = 'Ya existe un registro con esos datos (campo único duplicado).';
  }
  // Cualquier otro error con código 500: es un fallo inesperado/de programación.
  // No se envía err.message al cliente, solo queda registrado en el servidor.
  else if (statusCode === 500) {
    message = 'Error interno del servidor. Si el problema persiste, contacta con el administrador.';
  }

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