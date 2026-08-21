import { describe, expect, it } from "vitest";
import { canConfirmReplacement } from "./restoreConfirmation";

describe("replacement restore confirmation", () => {
  it("requires the explicit confirmation word but tolerates harmless casing and surrounding spaces", () => {
    expect(canConfirmReplacement("")).toBe(false);
    expect(canConfirmReplacement("replacee")).toBe(false);
    expect(canConfirmReplacement(" Replace ")).toBe(true);
  });
});
