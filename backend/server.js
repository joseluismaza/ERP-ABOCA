import dotenv from 'dotenv';
dotenv.config();

// 🔒 Variables de entorno obligatorias para la seguridad del ERP.
// Si falta alguna, detenemos el arranque con un mensaje claro en lugar de
// dejar que el código siga funcionando con valores por defecto inseguros
// (como ocurría antes con JWT_SECRET = 'secret').
const variablesObligatorias = ['JWT_SECRET', 'PDF_OWNER_KEY'];
const variablesFaltantes = variablesObligatorias.filter((nombre) => !process.env[nombre]);

if (variablesFaltantes.length > 0) {
  console.error(
    `[Critical Error] Faltan variables de entorno obligatorias en .env: ${variablesFaltantes.join(', ')}.`
  );
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import './services/cronService.js';

// Inicialización de la infraestructura de persistencia
connectDB();

// 🟢 COHESIÓN DE MODELOS: Importamos los modelos core para que Mongoose los registre en memoria 
// antes de procesar cualquier populate dinámico (refPath)
import './models/Trabajador.js';
import './models/Material.js';
import './models/Telefono.js';
import './models/Historial.js';

// Enrutadores de Capas de Negocio
import authRoutes from './routes/auth.js';
import trabajadorRoutes from './routes/trabajadores.js';
import materialRoutes from './routes/materiales.js';
import telefonoRoutes from './routes/telefonos.js';
import historialRoutes from './routes/historial.js';
import sistemaRoutes from './routes/sistemaRoutes.js';

// 🔒 FRONTEND_URL puede contener varias URLs separadas por comas, por ejemplo:
// FRONTEND_URL=https://erp-aboca.vercel.app,http://localhost:3000
// Esto permite tener a la vez el frontend de producción y el de desarrollo local.
// Se normaliza quitando barras finales ("/"), porque el navegador nunca envía
// esa barra en la cabecera Origin (https://ejemplo.com/ !== https://ejemplo.com).
const origenesPermitidos = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Peticiones sin cabecera Origin (ej. Postman, curl, llamadas servidor a servidor)
    if (!origin) {
      return callback(null, true);
    }

    const origenNormalizado = origin.replace(/\/+$/, '');
    if (origenesPermitidos.includes(origenNormalizado)) {
      return callback(null, true);
    }

    console.warn(
      `[CORS] Origen bloqueado: "${origin}". Orígenes permitidos: ${origenesPermitidos.join(', ')}`
    );
    callback(new Error('No permitido por la política CORS de este servidor.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

const app = express();

// Configuración requerida si el servidor opera detrás de proxies inversos (ej. Heroku, Nginx, AWS ALB)
app.set('trust proxy', 1);

// Capas de seguridad HTTP corporativa y análisis de carga útil
app.use(helmet());
app.use(cors(corsOptions)); 

app.use(express.json());

// Limitador genérico para operaciones ordinarias en las colecciones del ERP
const globalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // Bloques operativos de 5 minutos
  max: 500,
  message: { error: 'Límite de peticiones excedido para la carga de datos del ERP.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development' || req.ip === '127.0.0.1' || req.ip === '::1'
});

// Limitador severo contra ataques de fuerza bruta en los endpoints de login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventanas de exclusión de 15 minutos
  max: 20,
  message: { error: 'Demasiados intentos de inicio de sesión desde esta dirección. Por seguridad, intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (_req) => process.env.NODE_ENV === 'development'
});

app.use('/api', globalLimiter);

// Aplicación inteligente de las políticas de Rate Limit por segmento
app.use('/api/auth/login', authLimiter);

// Registro de enrutamientos del ecosistema API REST
app.use('/api/auth', authRoutes);
app.use('/api/trabajadores', trabajadorRoutes);
app.use('/api/trabajador', trabajadorRoutes);
app.use('/api/materiales', materialRoutes);
app.use('/api/telefonos', telefonoRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/sistema', sistemaRoutes);

// Interceptor global final para capturar y normalizar todas las excepciones de la aplicación
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Server] Servidor corriendo de forma íntegra en el puerto ${PORT} en entorno corporativo.`);
});