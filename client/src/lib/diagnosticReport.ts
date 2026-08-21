/** Brass & Ledger support helper: create a portable local report without passphrases or client content. */
import type { RestoreHistoryEntry } from "./restoreHistory";

export type DiagnosticWorkspaceSummary = {
  id: string;
  hasProjectName: boolean;
  prospectCount: number;
  completedDeliverySteps: number;
  completedKickoffSteps: number;
  completedTests: number;
  projectComplete: boolean;
};

export function createDiagnosticReport(input: {
  generatedAt: string;
  activeWorkspaceId: string;
  localStorageAvailable: boolean;
  webCryptoAvailable: boolean;
  workspaceCount: number;
  workspaces: DiagnosticWorkspaceSummary[];
  restoreHistory: RestoreHistoryEntry[];
}) {
  return {
    format: "LeadFlow Local Diagnostic Report",
    version: 1,
    generatedAt: input.generatedAt,
    privacy: "This report excludes passphrases, client names, prospect observations, message bodies, and scope text.",
    browserCapabilities: { localStorageAvailable: input.localStorageAvailable, webCryptoAvailable: input.webCryptoAvailable },
    collection: { workspaceCount: input.workspaceCount, activeWorkspaceId: input.activeWorkspaceId, workspaces: input.workspaces },
    restoreHistory: input.restoreHistory,
  };
}
