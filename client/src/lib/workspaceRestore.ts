/** Brass & Ledger data helper: prepare restore results without mutating existing client records. */
export type RestoreMode = "merge" | "replace";

type IdentifiedWorkspace = { id: string };

export type RestorePreparation<T extends IdentifiedWorkspace> = {
  collection: T[];
  restored: T[];
  selected: T;
};

export function prepareWorkspaceRestore<T extends IdentifiedWorkspace>(
  existing: T[],
  incoming: T[],
  incomingActiveId: string,
  mode: RestoreMode,
  clone: (workspace: T) => T,
): RestorePreparation<T> {
  const usedIds = new Set(mode === "merge" ? existing.map((workspace) => workspace.id) : []);
  const idMap = new Map<string, string>();
  const restored = incoming.map((workspace, index) => {
    const cloned = clone(workspace);
    const originalId = workspace.id.trim() || "imported";
    let id = originalId;
    if (usedIds.has(id)) {
      const root = `${originalId}-import-${index + 1}`;
      id = root;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${root}-${suffix}`;
        suffix += 1;
      }
    }
    usedIds.add(id);
    if (!idMap.has(originalId)) idMap.set(originalId, id);
    return { ...cloned, id };
  });
  const selectedId = idMap.get(incomingActiveId) ?? incomingActiveId;
  const selected = restored.find((workspace) => workspace.id === selectedId) ?? restored[0];
  return { collection: mode === "replace" ? restored : [...existing, ...restored], restored, selected };
}
