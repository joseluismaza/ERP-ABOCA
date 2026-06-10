// backend/eslint.config.js
import js from '@eslint/js';
import globals from 'globals';

export default [
  // ─── Base recomendada de ESLint ───────────────────────────────────────────
  js.configs.recommended,

  {
    // Apunta a todo el código fuente del backend
    files: ['**/*.js'],

    languageOptions: {
      ecmaVersion: 2022,
      // "module" le dice a ESLint que cada archivo es ESM.
      // Esto activa la detección nativa de que require() no existe en este contexto.
      sourceType: 'module',
      globals: {
        // Entorno Node.js: expone process, __dirname (vía import.meta), Buffer, etc.
        ...globals.node,
      },
    },

    rules: {
      // ── REGLA PRINCIPAL DEL FIX ──────────────────────────────────────────
      // Bloquea require() como global restringido.
      // En ESM con "type":"module", require() no existe en runtime.
      // Esta regla lo convierte en un error de linting antes de llegar a producción.
      'no-restricted-globals': [
        'error',
        {
          name: 'require',
          message:
            'El proyecto usa "type":"module" (ESM). Usa import en su lugar. ' +
            'Ejemplo: import Helvetica from "pdfjs/font/Helvetica.js"',
        },
        {
          name: '__dirname',
          message:
            '__dirname no existe en ESM. Usa: ' +
            'import { fileURLToPath } from "url"; import path from "path"; ' +
            'const __dirname = path.dirname(fileURLToPath(import.meta.url))',
        },
        {
          name: '__filename',
          message:
            '__filename no existe en ESM. Usa: ' +
            'import { fileURLToPath } from "url"; ' +
            'const __filename = fileURLToPath(import.meta.url)',
        },
      ],

      // ── REGLAS DE CALIDAD GENERAL ─────────────────────────────────────────
      // Detecta variables declaradas pero nunca usadas (imports muertos, etc.)
      'no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          // Ignoramos variables que empiezan por _ (convención para "intencionalmente no usada")
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],

      // Prohíbe el uso de eval() — vector de inyección de código
      'no-eval': 'error',

      // Obliga a manejar errores en callbacks (evita errores silenciados)
      'handle-callback-err': 'error',

      // Alerta sobre console.log olvidados en producción
      // (usamos warn para no bloquear, ya que el proyecto usa console activamente en dev)
      'no-console': 'off',
    },
  },

  {
    // ── EXCLUSIONES ──────────────────────────────────────────────────────────
    // Ignoramos node_modules y el lockfile generado automáticamente
    ignores: ['node_modules/**', 'package-lock.json'],
  },
];