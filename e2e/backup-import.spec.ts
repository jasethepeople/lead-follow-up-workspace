import { expect, test } from "@playwright/test";

test("imports a client backup, merges it, and requires confirmation before replacement", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Manage client workspaces" })).toBeVisible();

  const makeBackup = async (clientName: string, id: string) => page.evaluate(({ clientName, id }) => {
    const collection = JSON.parse(window.localStorage.getItem("leadflow-workspaces") ?? "[]");
    const template = collection[0];
    return JSON.stringify({
      format: "LeadFlow Workspace Backup",
      version: 1,
      exportedAt: "2026-08-21T00:00:00.000Z",
      activeWorkspaceId: id,
      workspaces: [{ ...template, id, clientName, projectName: "Browser test project", scopeFields: { ...template.scopeFields, business: clientName } }],
    });
  }, { clientName, id });

  await page.getByRole("button", { name: "Manage client workspaces" }).click();
  const fileInput = page.locator('input[type="file"]');
  const mergedBackup = await makeBackup("Imported E2E Client", "e2e-merged");
  await fileInput.setInputFiles({ name: "merged-backup.json", mimeType: "application/json", buffer: Buffer.from(mergedBackup) });
  await expect(page.getByText("Backup verified", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Merge into collection" }).click();
  await expect(page.getByText("Merged 1 imported workspaces into this browser collection.")).toBeVisible();

  await expect(page.getByText("Imported E2E Client")).toBeVisible();
  const replacementBackup = await makeBackup("Replacement E2E Client", "e2e-replaced");
  await fileInput.setInputFiles({ name: "replacement-backup.json", mimeType: "application/json", buffer: Buffer.from(replacementBackup) });
  await page.getByRole("button", { name: "Replace current collection" }).click();
  await expect(page.getByRole("heading", { name: "Replace this browser collection?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Replace all client files" })).toBeDisabled();
  await page.getByLabel("Type REPLACE to continue").fill("REPLACE");
  await page.getByRole("button", { name: "Replace all client files" }).click();
  await expect(page.getByText("Restored 1 workspaces and replaced this browser collection.")).toBeVisible();

  await expect(page.getByRole("heading", { name: "Replacement E2E Client" })).toBeVisible();
  await expect(page.getByText("Imported E2E Client")).toHaveCount(0);
});
