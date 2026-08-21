/** Brass & Ledger reliability helper: retain a short, local, secret-free restore ledger. */
export type RestoreSource = "plain" | "encrypted";
export type RestoreHistoryEntry = {
  id: string;
  at: string;
  mode: "merge" | "replace";
  source: RestoreSource;
  workspaceCount: number;
};

const MAX_RESTORE_HISTORY = 12;

export function isRestoreHistoryEntry(value: unknown): value is RestoreHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<RestoreHistoryEntry>;
  return typeof entry.id === "string" && typeof entry.at === "string" && (entry.mode === "merge" || entry.mode === "replace") && (entry.source === "plain" || entry.source === "encrypted") && Number.isInteger(entry.workspaceCount) && (entry.workspaceCount ?? 0) > 0;
}

export function appendRestoreHistory(entries: RestoreHistoryEntry[], entry: RestoreHistoryEntry) {
  return [entry, ...entries].slice(0, MAX_RESTORE_HISTORY);
}
