/** Brass & Ledger security helper: browser-local passphrase encryption only; never persist passphrases. */
export type EncryptedWorkspaceBackup = {
  format: "LeadFlow Encrypted Workspace Backup";
  version: 1;
  exportedAt: string;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: number; salt: string };
  cipher: { name: "AES-GCM"; iv: string };
  ciphertext: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 310_000;

const bytesToBase64 = (bytes: Uint8Array) => {
  let text = "";
  bytes.forEach((byte) => { text += String.fromCharCode(byte); });
  return globalThis.btoa(text);
};

const base64ToBytes = (value: string) => Uint8Array.from(globalThis.atob(value), (character) => character.charCodeAt(0));

const cryptoApi = () => {
  if (!globalThis.crypto?.subtle) throw new Error("Secure browser crypto is unavailable.");
  return globalThis.crypto;
};

const deriveKey = async (passphrase: string, salt: Uint8Array, usages: KeyUsage[]) => {
  const crypto = cryptoApi();
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, baseKey, { name: "AES-GCM", length: 256 }, false, usages);
};

export const isEncryptedWorkspaceBackup = (value: unknown): value is EncryptedWorkspaceBackup => {
  if (!value || typeof value !== "object") return false;
  const backup = value as Partial<EncryptedWorkspaceBackup>;
  return backup.format === "LeadFlow Encrypted Workspace Backup" && backup.version === 1 && typeof backup.exportedAt === "string" && backup.kdf?.name === "PBKDF2" && backup.kdf.hash === "SHA-256" && typeof backup.kdf.iterations === "number" && backup.kdf.iterations >= 100_000 && typeof backup.kdf.salt === "string" && backup.cipher?.name === "AES-GCM" && typeof backup.cipher.iv === "string" && typeof backup.ciphertext === "string";
};

export async function encryptWorkspaceBackup(payload: unknown, passphrase: string): Promise<EncryptedWorkspaceBackup> {
  const crypto = cryptoApi();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(payload)));
  return {
    format: "LeadFlow Encrypted Workspace Backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS, salt: bytesToBase64(salt) },
    cipher: { name: "AES-GCM", iv: bytesToBase64(iv) },
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptWorkspaceBackup(backup: EncryptedWorkspaceBackup, passphrase: string): Promise<unknown> {
  if (!isEncryptedWorkspaceBackup(backup)) throw new Error("Invalid encrypted backup envelope.");
  const crypto = cryptoApi();
  const salt = base64ToBytes(backup.kdf.salt);
  const iv = base64ToBytes(backup.cipher.iv);
  const key = await deriveKey(passphrase, salt, ["decrypt"]);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, base64ToBytes(backup.ciphertext));
  return JSON.parse(decoder.decode(plaintext)) as unknown;
}
