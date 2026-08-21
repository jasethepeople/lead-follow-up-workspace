import { describe, expect, it } from "vitest";
import { decryptWorkspaceBackup, encryptWorkspaceBackup, isEncryptedWorkspaceBackup } from "./encryptedBackup";

const passphrase = "correct horse battery staple";
const workspaceBackup = {
  format: "LeadFlow Workspace Backup",
  version: 1,
  exportedAt: "2026-08-20T00:00:00.000Z",
  activeWorkspaceId: "cedar-001",
  workspaces: [{ id: "cedar-001", clientName: "Cedar & Stone Plumbing", projectName: "Follow-up tune-up" }],
};

describe("encrypted workspace backups", () => {
  it("creates a valid authenticated envelope without exposing the passphrase or plain client payload", async () => {
    const encrypted = await encryptWorkspaceBackup(workspaceBackup, passphrase);
    const serialised = JSON.stringify(encrypted);

    expect(isEncryptedWorkspaceBackup(encrypted)).toBe(true);
    expect(encrypted.kdf).toMatchObject({ name: "PBKDF2", hash: "SHA-256", iterations: 310_000 });
    expect(encrypted.cipher).toMatchObject({ name: "AES-GCM" });
    expect(serialised).not.toContain(passphrase);
    expect(serialised).not.toContain("Cedar & Stone Plumbing");
    expect(serialised).not.toContain("Follow-up tune-up");
  });

  it("decrypts the original collection with the correct passphrase", async () => {
    const encrypted = await encryptWorkspaceBackup(workspaceBackup, passphrase);
    await expect(decryptWorkspaceBackup(encrypted, passphrase)).resolves.toEqual(workspaceBackup);
  });

  it("rejects an incorrect passphrase without returning a payload", async () => {
    const encrypted = await encryptWorkspaceBackup(workspaceBackup, passphrase);
    await expect(decryptWorkspaceBackup(encrypted, "wrong passphrase value")).rejects.toThrow();
  });

  it("rejects a modified ciphertext through AES-GCM authentication", async () => {
    const encrypted = await encryptWorkspaceBackup(workspaceBackup, passphrase);
    const tampered = { ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -4)}AAAA` };
    await expect(decryptWorkspaceBackup(tampered, passphrase)).rejects.toThrow();
  });

  it("rejects malformed encrypted envelopes before decryption", () => {
    expect(isEncryptedWorkspaceBackup({ format: "LeadFlow Encrypted Workspace Backup", version: 1 })).toBe(false);
    expect(isEncryptedWorkspaceBackup({ format: "Other Backup", version: 1 })).toBe(false);
  });
});
