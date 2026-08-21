import { describe, expect, it } from "vitest";
import { prepareWorkspaceRestore } from "./workspaceRestore";

type Workspace = { id: string; clientName: string; nested: { stage: string } };
const clone = (workspace: Workspace): Workspace => ({ ...workspace, nested: { ...workspace.nested } });
const existing: Workspace[] = [{ id: "cedar", clientName: "Cedar & Stone", nested: { stage: "active" } }];
const incoming: Workspace[] = [
  { id: "cedar", clientName: "Imported Cedar", nested: { stage: "ready" } },
  { id: "marlow", clientName: "Marlow Dental", nested: { stage: "draft" } },
];

describe("workspace restore preparation", () => {
  it("merges imported files without mutating existing records and remaps duplicate IDs deterministically", () => {
    const result = prepareWorkspaceRestore(existing, incoming, "marlow", "merge", clone);
    expect(result.collection.map((workspace) => workspace.id)).toEqual(["cedar", "cedar-import-1", "marlow"]);
    expect(result.selected.id).toBe("marlow");
    expect(result.collection[0]).toBe(existing[0]);
    expect(result.restored[0]).not.toBe(incoming[0]);
    expect(result.restored[0].nested).not.toBe(incoming[0].nested);
  });

  it("replaces the collection and selects the imported active workspace", () => {
    const result = prepareWorkspaceRestore(existing, incoming, "marlow", "replace", clone);
    expect(result.collection).toEqual(result.restored);
    expect(result.collection).toHaveLength(2);
    expect(result.selected).toMatchObject({ id: "marlow", clientName: "Marlow Dental" });
  });

  it("remaps repeated imported IDs and falls back to the first restored workspace for an unknown active ID", () => {
    const duplicateIncoming: Workspace[] = [
      { id: "cedar", clientName: "Imported One", nested: { stage: "one" } },
      { id: "cedar", clientName: "Imported Two", nested: { stage: "two" } },
    ];
    const result = prepareWorkspaceRestore(existing, duplicateIncoming, "missing", "merge", clone);
    expect(result.restored.map((workspace) => workspace.id)).toEqual(["cedar-import-1", "cedar-import-2"]);
    expect(result.selected.id).toBe("cedar-import-1");
  });
});
