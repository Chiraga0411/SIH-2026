import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { root } from '../db/store.js';

/* AES-256-GCM encryption at rest for uploaded files.
   Key lives in a local keystore file on this server (or FILE_ENCRYPTION_KEY
   in the environment) — it never leaves the premises. File layout:
   "SAE1" | iv (12 bytes) | auth tag (16 bytes) | ciphertext */

const MAGIC = Buffer.from('SAE1', 'ascii');
const KEY_FILE = () => path.join(root, process.env.KEYSTORE_FILE || 'secret.key');

let keyCache = null;

export async function getKey() {
  if (keyCache) return keyCache;
  const envKey = process.env.FILE_ENCRYPTION_KEY;
  if (envKey && /^[0-9a-f]{64}$/i.test(envKey)) return (keyCache = Buffer.from(envKey, 'hex'));
  try {
    const hex = (await fs.readFile(KEY_FILE(), 'utf8')).trim();
    if (/^[0-9a-f]{64}$/i.test(hex)) return (keyCache = Buffer.from(hex, 'hex'));
  } catch { /* create below */ }
  const key = crypto.randomBytes(32);
  await fs.writeFile(KEY_FILE(), key.toString('hex'), { mode: 0o600 });
  keyCache = key;
  return key;
}

export async function encryptBuffer(buf) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', await getKey(), iv);
  const data = Buffer.concat([cipher.update(buf), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), data]);
}

export async function decryptBuffer(buf) {
  if (buf.length < 32 || !buf.subarray(0, 4).equals(MAGIC)) throw new Error('not an encrypted artifact');
  const iv = buf.subarray(4, 16);
  const tag = buf.subarray(16, 32);
  const data = buf.subarray(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', await getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export async function isEncrypted(filePath) {
  try {
    const fh = await fs.open(filePath, 'r');
    const { buffer } = await fh.read(Buffer.alloc(4), 0, 4, 0);
    await fh.close();
    return buffer.equals(MAGIC);
  } catch { return false; }
}

/* Run `fn(plainPath)` with a plaintext temp copy when the stored file is
   encrypted; the temp copy is always removed afterwards. */
export async function withPlainFile(filePath, fn) {
  if (!(await isEncrypted(filePath))) return fn(filePath);
  const tmp = path.join(os.tmpdir(), `sovereign_${crypto.randomUUID()}`);
  await fs.writeFile(tmp, await decryptBuffer(await fs.readFile(filePath)));
  try { return await fn(tmp); } finally { fs.unlink(tmp).catch(() => {}); }
}
