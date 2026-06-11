import mongoose from 'mongoose';
import { encrypt } from '../utils/crypto.js';

const trabajadorSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  apellidos: { type: String, required: true, trim: true },
  dni: { type: String, required: true, unique: true, trim: true },
  fechaNacimiento: Date,
  genero: String,
  calendario: String,
  matriculaSAP: { type: String, trim: true },
  fechaAlta: Date,
  activo: { type: Boolean, default: false },
  fechaBaja: Date,
  agente: String,
  cargo: String,
  codigoZona: String,
  zona: String,
  username: { type: String, trim: true },
  // 🔒 select:false -> Trabajador.find()/findById() ya no incluyen este campo
  // a no ser que se pida explícitamente con .select('+password')
  password: { type: String, select: false },
  emailAboca: { type: String, trim: true, lowercase: true },
  appleID: { type: String, trim: true },
  // 🔒 Mismo tratamiento que 'password'
  passwordApple: { type: String, select: false },
  poblacion: String,
  domicilio: String,
  estado: { 
    type: String, 
    // CORRECCIÓN: Soportamos tanto las versiones con mayúscula como con minúscula para no romper registros viejos
    enum: ['Activo', 'activo', 'Inactivo', 'inactivo', 'De Baja', 'de baja', 'Pendiente de alta', 'pendiente de alta'],
    default: 'Pendiente de alta'
  },
  agentComercial: String,
  agentMedico: String,
  codComercial: String,
  codMedico: String,
  nContable: Number
}, { 
  timestamps: true, 
  collection: 'trabajadores',
  // 🔒 Aunque un documento tenga password/passwordApple cargados en memoria
  // (por ejemplo justo después de un .save()), nunca se incluyen al convertir
  // el documento a JSON/objeto para enviarlo al frontend.
  toJSON: {
    transform: function (doc, ret) {
      delete ret.password;
      delete ret.passwordApple;
      return ret;
    }
  },
  toObject: {
    transform: function (doc, ret) {
      delete ret.password;
      delete ret.passwordApple;
      return ret;
    }
  }
});

/**
 * Middleware pre-save encargado de automatizar el cálculo del estado operativo del trabajador
 */
trabajadorSchema.pre('save', function (next) {
  const hoy = new Date();
  const { fechaAlta, fechaBaja } = this;

  // Realiza el cálculo computado del estado activo si no se ha forzado un booleano explícito en el request
  if (this.isModified('activo') === false) {
    if (fechaBaja && fechaBaja <= hoy) {
      this.activo = false;
      // Opcional: Auto-convertir el string a formato limpio si el sistema lo procesa aquí
      if (this.estado === 'Activo' || this.estado === 'activo') {
        this.estado = 'Inactivo';
      }
    } else if (fechaAlta && fechaAlta <= hoy) {
      this.activo = true;
    } else if (fechaAlta && fechaAlta > hoy) {
      this.activo = false;
    }
  }
  next();
});

trabajadorSchema.pre('save', function(next) {
  if (this.isModified('password') && this.password) {
    this.password = encrypt(this.password);
  }
  if (this.isModified('passwordApple') && this.passwordApple) {
    this.passwordApple = encrypt(this.passwordApple);
  }
  next();
});
export default mongoose.model('Trabajador', trabajadorSchema);