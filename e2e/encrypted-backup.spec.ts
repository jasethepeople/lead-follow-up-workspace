import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("creates an encrypted backup, rejects a wrong passphrase, and safely merges after unlock", async ({ page }) => {
  const passphrase = "Browser test vault phrase 2026!";
  await page.goto("/");
  await page.getByRole("button", { name: "Create encrypted backup" }).click();
  await page.getByRole("textbox", { name: "Passphrase", exact: true }).fill(passphrase);
  await page.getByLabel("Confirm passphrase").fill(passphrase);
  await expect(page.getByText("Passphrase strength")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByText("Create encrypted backup", { exact: true }).click();
  const download = await downloadPromise;
  const filePath = await download.path();
  expect(filePath).not.toBeNull();
  const encryptedFile = await readFile(filePath!);

  await page.getByRole("button", { name: "Manage client workspaces" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "encrypted-backup.json", mimeType: "application/json", buffer: encryptedFile });
  await expect(page.getByRole("heading", { name: "Unlock this client collection." })).toBeVisible();
  await page.getByLabel("Backup passphrase").fill("wrong passphrase");
  await page.getByRole("button", { name: "Unlock backup" }).click();
  await expect(page.getByText("This passphrase did not unlock the backup. Check it and try again.")).toBeVisible();
  await page.getByLabel("Backup passphrase").fill(passphrase);
  await page.getByRole("button", { name: "Unlock backup" }).click();
  await expect(page.getByText("Encrypted backup unlocked")).toBeVisible();
  await page.getByRole("button", { name: "Merge into collection" }).click();
  await expect(page.getByText("Merged 1 imported workspaces into this browser collection.")).toBeVisible();
  await expect(page.getByText("Encrypted · merge")).toBeVisible();
});
