import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, 'El nombre de usuario es obligatorio'], 
    unique: true,
    trim: true 
  },
  password: { 
    type: String, 
    required: [true, 'La contraseña cifrada es obligatoria'],
    // 🔒 Mismo tratamiento que en Trabajador: Admin.find()/findOne() no traen
    // este campo salvo que se pida explícitamente con .select('+password').
    select: false
  },
  rol: { 
    type: String, 
    default: 'admin',
    enum: ['admin', 'superadmin']
  }
}, { 
  timestamps: true, 
  collection: 'usuarios' 
});

export default mongoose.model('Admin', adminSchema);