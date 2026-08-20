import { webcrypto } from 'node:crypto';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const passphrase = 'LeadFlow verification passphrase';
const payload = JSON.stringify({ format: 'LeadFlow Workspace Backup', version: 1, workspaces: [{ id: 'verify' }] });
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));

async function keyFor(value) {
  const base = await webcrypto.subtle.importKey('raw', encoder.encode(value), 'PBKDF2', false, ['deriveKey']);
  return webcrypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 310000 }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

const encryptionKey = await keyFor(passphrase);
const ciphertext = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, encryptionKey, encoder.encode(payload));
const decryptionKey = await keyFor(passphrase);
const recovered = decoder.decode(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, decryptionKey, ciphertext));

let wrongPassphraseRejected = false;
try {
  await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, await keyFor('wrong verification passphrase'), ciphertext);
} catch {
  wrongPassphraseRejected = true;
}

if (recovered !== payload || !wrongPassphraseRejected) {
  throw new Error('Encrypted backup verification failed');
}

console.log('Encrypted backup verification passed: correct passphrase decrypts; wrong passphrase is rejected.');
