import { describe, expect, it } from "vitest";
import { createDiagnosticReport } from "./diagnosticReport";

describe("diagnostic report", () => {
  it("reports local capability and restore metadata without accepting client-content fields", () => {
    const report = createDiagnosticReport({
      generatedAt: "2026-08-21T00:00:00.000Z",
      activeWorkspaceId: "active-workspace",
      localStorageAvailable: true,
      webCryptoAvailable: true,
      workspaceCount: 1,
      workspaces: [{ id: "active-workspace", hasProjectName: false, prospectCount: 3, completedDeliverySteps: 2, completedKickoffSteps: 2, completedTests: 1, projectComplete: false }],
      restoreHistory: [],
    });
    const serialized = JSON.stringify(report);
    expect(serialized).toContain("LeadFlow Local Diagnostic Report");
    expect(serialized).not.toContain("Browser test vault phrase 2026!");
    expect(serialized).not.toContain("Cedar & Stone");
  });
});
