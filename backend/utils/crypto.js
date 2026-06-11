// utils/crypto.js — NUEVO ARCHIVO
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// 🔒 La clave se calcula y valida la PRIMERA VEZ que se llama a encrypt/decrypt,
// no al cargar este archivo. Esto es importante: en server.js, dotenv.config()
// se ejecuta DESPUÉS de que se hayan cargado todos los `import` (incluido este
// archivo, vía models/Trabajador.js). Si leyéramos process.env.ENCRYPTION_KEY
// aquí arriba, todavía valdría undefined aunque esté bien definido en el .env.
let SECRET_KEY = null;

const getSecretKey = () => {
  if (SECRET_KEY) return SECRET_KEY;

  if (!process.env.ENCRYPTION_KEY) {
    throw new Error(
      'La variable de entorno ENCRYPTION_KEY no está configurada. ' +
      'Añade en tu archivo .env una línea como: ENCRYPTION_KEY=<64 caracteres hexadecimales (32 bytes)>. ' +
      'Puedes generar una clave válida ejecutando: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY debe representar exactamente 32 bytes en hexadecimal (64 caracteres). ` +
      `El valor actual representa ${key.length} bytes.`
    );
  }

  SECRET_KEY = key;
  return SECRET_KEY;
};

export const encrypt = (text) => {
  if (!text) return null;
  const key = getSecretKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  const key = getSecretKey();
  const [ivHex, tagHex, dataHex] = encryptedText.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(dataHex, 'hex')) + decipher.final('utf8');
};

/**
 * Descifra los campos password/passwordApple de un trabajador.
 *
 * Si algún valor está vacío, no es descifrable, o ENCRYPTION_KEY no está
 * configurada, esa contraseña concreta queda como `null` (y se registra el
 * error en consola) en lugar de interrumpir toda la petición con una excepción.
 *
 * Se reutiliza desde el envío de credenciales en el alta (onboardingService),
 * el llavero PDF completo y el endpoint de revelar credenciales.
 *
 * @param {{ password?: string, passwordApple?: string }} trabajador - documento
 *   con password/passwordApple ya cargados (select('+password +passwordApple') si procede).
 * @returns {{ password: string|null, passwordApple: string|null }}
 */
export const descifrarCredencialesTrabajador = (trabajador) => {
  let password = null;
  let passwordApple = null;

  try {
    password = decrypt(trabajador.password);
  } catch (err) {
    console.error('⚠️ Error al descifrar password del trabajador:', err.message);
  }

  try {
    passwordApple = decrypt(trabajador.passwordApple);
  } catch (err) {
    console.error('⚠️ Error al descifrar passwordApple del trabajador:', err.message);
  }

  return { password, passwordApple };
};