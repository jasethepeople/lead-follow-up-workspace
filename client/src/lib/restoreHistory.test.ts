import { describe, expect, it } from "vitest";
import { appendRestoreHistory, isRestoreHistoryEntry } from "./restoreHistory";

const entry = { id: "restore-1", at: "2026-08-21T00:00:00.000Z", mode: "merge" as const, source: "encrypted" as const, workspaceCount: 2 };

describe("restore history", () => {
  it("keeps only secret-free, structurally valid restore summaries", () => {
    expect(isRestoreHistoryEntry(entry)).toBe(true);
    expect(isRestoreHistoryEntry({ ...entry, source: "password" })).toBe(false);
    expect(isRestoreHistoryEntry({ ...entry, workspaceCount: 0 })).toBe(false);
  });

  it("adds the latest event first and caps the local ledger at twelve entries", () => {
    const existing = Array.from({ length: 12 }, (_, index) => ({ ...entry, id: `restore-${index}` }));
    const updated = appendRestoreHistory(existing, { ...entry, id: "latest" });
    expect(updated).toHaveLength(12);
    expect(updated[0].id).toBe("latest");
    expect(updated.some((item) => item.id === "restore-11")).toBe(false);
  });
});
