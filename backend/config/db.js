import mongoose from 'mongoose';

/**
 * Establece la conexión centralizada con la instancia de MongoDB.
 * Controla errores críticos de inicialización del entorno del servidor.
 */
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("La variable de entorno MONGODB_URI no está configurada.");
    }

    const conn = await mongoose.connect(uri);
    console.log(`[Database] MongoDB Conectado con éxito en el host: ${conn.connection.host}`);
  } catch (error) {
    console.error("[Critical Error] Error fatal al conectar a MongoDB:", error.message);
    // Finaliza el proceso de la aplicación inmediatamente si la infraestructura falla
    process.exit(1);
  }
};

export default connectDB;