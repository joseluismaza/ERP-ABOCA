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
    required: [true, 'La contraseña cifrada es obligatoria'] 
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