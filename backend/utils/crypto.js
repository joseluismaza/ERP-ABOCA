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