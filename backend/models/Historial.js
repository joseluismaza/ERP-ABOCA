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
  observaciones: { 
    type: String, 
    required: true 
  },
  archivoAdjunto: {
    type: Buffer // Guarda el PDF binario directamente
  },
  documentoTipo: {
    type: String,
    enum: ['ENTREGA', 'DEVOLUCION', 'CREDENCIALES'],
  },
}, { 
  timestamps: true, 
  collection: 'historial' 
});

export default mongoose.model('Historial', historialSchema);