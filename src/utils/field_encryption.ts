import crypto from 'crypto';
import { env } from '../db/config/env.config';

const ENCRYPTION_VERSION = 'v1';
const IV_LENGTH = 12;

function deriveKey(material: string): Buffer {
  return crypto.createHash('sha256').update(material, 'utf8').digest();
}

function resolveEncryptionKey(): Buffer {
  if (env.DATA_ENCRYPTION_KEY) {
    return deriveKey(env.DATA_ENCRYPTION_KEY);
  }

  // Fallback de compatibilité pour éviter un blocage au démarrage.
  // En production, définir DATA_ENCRYPTION_KEY explicitement.
  return deriveKey(`${env.JWT_SECRET}:${env.SESSION_SECRET}`);
}

function resolveHashKey(): Buffer {
  if (env.DATA_HASH_KEY) {
    return deriveKey(env.DATA_HASH_KEY);
  }

  // Fallback de compatibilité pour éviter un blocage au démarrage.
  // En production, définir DATA_HASH_KEY explicitement.
  return deriveKey(`${env.JWT_REFRESH_SECRET}:${env.SESSION_SECRET}`);
}

const encryptionKey = resolveEncryptionKey();
const hashKey = resolveHashKey();

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function hashEmailForLookup(email: string): string {
  const normalized = normalizeEmail(email);
  return crypto
    .createHmac('sha256', hashKey)
    .update(normalized, 'utf8')
    .digest('hex');
}

export function encryptField(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

export function decryptField(value: string): string {
  if (!value) return value;

  // Valeur legacy non chiffrée
  if (!value.startsWith(`${ENCRYPTION_VERSION}:`)) {
    return value;
  }

  const [, ivB64, tagB64, ciphertextB64] = value.split(':');
  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error('Encrypted field format is invalid');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export function encryptNullableField(
  value: string | null | undefined
): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return encryptField(value);
}

export function decryptNullableField(
  value: string | null | undefined
): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return decryptField(value);
}
