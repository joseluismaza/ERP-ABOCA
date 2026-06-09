// backend/models/Historial.js
import mongoose from 'mongoose';

const historialSchema = new mongoose.Schema({
  tipoOperacion: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'assign', 'unassign']
  },
  elementoTipo: {
    type: String,
    required: true,
    enum: ['Trabajador', 'Material', 'Telefono'] // Define los modelos válidos para el refPath dinámico
  },
  elementoId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'elementoTipo' // Vinculación dinámica nativa de Mongoose basada en el string de elementoTipo
  },
  detallesAsignacion: {
    trabajadorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trabajador' },
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
    fechaAsignacion: Date,
    fechaDevolucion: Date
  },
  archivoAdjunto: {
    type: Buffer, // Guarda el PDF binario directamente
  },
  documentoTipo: {
    type: String,
    enum: ['ENTREGA', 'DEVOLUCION', 'CREDENCIALES'],
  },
  observaciones: { 
    type: String, 
    required: true 
  },
  
  // 📥 NUEVOS CAMPOS ADJUNTOS PARA EL BLOQUE B Y C
  archivoAdjunto: {
    type: Buffer // Guarda el archivo binario PDF bruto directamente en la base de datos MongoDB
  },
  documentoTipo: {
    type: String,
    enum: ['ENTREGA', 'DEVOLUCION', 'CREDENCIALES'] // Clasifica el documento para estructurar las descargas
  }

}, { 
  timestamps: true, 
  collection: 'historial' 
});

export default mongoose.model('Historial', historialSchema);