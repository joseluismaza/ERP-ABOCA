import mongoose from 'mongoose';

const telefonoSchema = new mongoose.Schema({
  numeroTelefono: { 
    type: String, 
    required: [true, 'El número telefónico de la línea es obligatorio'], 
    unique: true,
    trim: true
  },
  numeroInterno: { 
    type: String, 
    trim: true
  },
  icc: { type: String, trim: true },
  pin1: { type: String, trim: true },
  puk1: { type: String, trim: true },
  pin2: { type: String, trim: true },
  puk2: { type: String, trim: true },
  tipoSIM: { 
    type: String, 
    enum: ['SIM Física', 'eSIM', 'sim física', 'esim'], // Soportamos variaciones de escritura
    required: true
  },
  // 📱 NUEVO CAMPO: Tipo de dispositivo asociado a la línea móvil
  tipoDispositivo: {
    type: String,
    enum: ['iPhone', 'iPad', 'iphone', 'ipad'], 
    default: 'iPhone'
  },
  // 👤 CONSISTENCIA: Renombrado a TrabajadorId para unificar el comportamiento con el Inventario/Materiales
  TrabajadorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Trabajador', 
    default: null 
  },
  estado: { 
    type: String, 
    enum: ['Disponible', 'Asignado', 'disponible', 'asignado'], 
    default: 'disponible' 
  }
}, { 
  timestamps: true, 
  collection: 'telefonos',
  toJSON: { virtuals: true },
  toObject: { virtuals: true } 
});

// Virtual para mantener compatibilidad si algún controlador viejo aún consulta "asignadoA"
telefonoSchema.virtual('asignadoA').get(function() {
  return this.TrabajadorId;
});

export default mongoose.model('Telefono', telefonoSchema);