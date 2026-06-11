// backend/routes/auth.js
import express from 'express';
import { login } from '../controllers/authController.js';

const router = express.Router();

// Único endpoint de autenticación: el resto de la lógica de login vive en authController.js
router.post('/login', login);

export default router;