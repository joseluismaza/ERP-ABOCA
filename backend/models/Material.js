import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema({
  // Eliminamos el campo 'id' manual ya que usamos el '_id' nativo autogenerado por MongoDB
  tipo: { 
    type: String, 
    required: true,
    trim: true 
  },
  marca: { 
    type: String, 
    required: [true, 'La marca es obligatoria'], 
    trim: true 
  },
  modelo: { 
    type: String, 
    required: [true, 'El modelo es obligatorio'], 
    trim: true 
  },
  fechaEntregaOficina: { 
    type: Date 
  },
  fechaEntregaTrabajador: { 
    type: Date 
  },
  fechaDevolucionTrabajador: { 
    type: Date 
  },
  sn: { 
    type: String, 
    trim: true 
  },
  imei: { 
    type: String, 
    trim: true 
  },
  pn: { 
    type: String, 
    trim: true 
  },
  // Cambio de asignadoA -> TrabajadorId
  TrabajadorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Trabajador', 
    default: null 
  },
  ultimoTrabajadorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Trabajador', 
    default: null 
  },
  // Mantenemos telefonoId (eliminamos numeroTelefono duplicado de la base de datos)
  telefonoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Telefono', 
    default: null 
  },
  devueltoRenting: { 
    type: Boolean, 
    default: false 
  },
  esRenting: { 
    type: Boolean, 
    default: false 
  },
  duracionRenting: { 
    type: Number, 
    enum: [24, 36, 48] 
  },
  estado: { 
    type: String, 
    enum: ['Asignado', 'Disponible', 'Robado', 'Comprado', 'Almacén'], 
    default: 'Disponible' 
  },
  comentarios: { 
    type: String, 
    default: '' 
  },
  // Este campo se calculará automáticamente mediante el Middleware de abajo
  fechaDevolucionRenting: { 
    type: Date 
  },
  fechaRobo: { 
    type: Date 
  },
  nDenuncia: { 
    type: String, 
    trim: true 
  },
  // Nuevo campo para almacenar la ruta, URL o Binary string del PDF de la denuncia
  docDenuncia: { 
    type: String, 
    default: null 
  },
  nContrato: { 
    type: String, 
    trim: true 
  }
}, { 
  timestamps: true, 
  collection: 'materiales',
  toJSON: { virtuals: true }, // Permite que los virtuals se envíen al frontend
  toObject: { virtuals: true }
});

// ==========================================
// MIDDLEWARE (HOOK) PARA CÁLCULO AUTOMÁTICO
// ==========================================
materialSchema.pre('save', function(next) {
  // Si es renting y tenemos fecha de entrega en oficina y duración, calculamos el vencimiento
  if (this.esRenting && this.fechaEntregaOficina && this.duracionRenting) {
    const fechaFin = new Date(this.fechaEntregaOficina);
    fechaFin.setMonth(fechaFin.getMonth() + this.duracionRenting);
    this.fechaDevolucionRenting = fechaFin;
  }
  next();
});

// También lo aplicamos para cuando se use un .update() o .findByIdAndUpdate()
materialSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.esRenting && update.fechaEntregaOficina && update.duracionRenting) {
    const fechaFin = new Date(update.fechaEntregaOficina);
    fechaFin.setMonth(fechaFin.getMonth() + parseInt(update.duracionRenting, 10));
    update.fechaDevolucionRenting = fechaFin;
  }
  next();
});

export default mongoose.model('Material', materialSchema);