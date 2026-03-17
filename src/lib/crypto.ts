import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;  // GCM-Standard
const TAG_LENGTH = 16; // GCM-Standard

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY ist nicht gesetzt. Generiere einen mit: openssl rand -hex 32');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY muss 32 Byte (64 Hex-Zeichen) lang sein.');
  }
  return key;
}

/**
 * Verschluesselt einen Klartext-String mit AES-256-GCM.
 * Rueckgabe: Base64-String aus IV (12 Byte) + Auth-Tag (16 Byte) + Ciphertext.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Format: IV + Tag + Ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Entschluesselt einen Base64-String (IV + Tag + Ciphertext) zurueck zum Klartext.
 */
export function decrypt(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encryptedBase64, 'base64');

  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}
