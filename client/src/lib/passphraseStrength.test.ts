import { describe, expect, it } from "vitest";
import { evaluatePassphrase } from "./passphraseStrength";

describe("passphrase strength guidance", () => {
  it("requires at least twelve characters", () => {
    expect(evaluatePassphrase("")).toMatchObject({ label: "Too short", isReady: false });
    expect(evaluatePassphrase("twelvechars!")).toMatchObject({ label: "Basic", isReady: true });
  });

  it("distinguishes basic, solid, and strong phrases without retaining the source value", () => {
    expect(evaluatePassphrase("abcdefghijkl")).toMatchObject({ label: "Basic", isReady: true });
    expect(evaluatePassphrase("Longer phrase 123")).toMatchObject({ label: "Solid", isReady: true });
    expect(evaluatePassphrase("A much longer phrase: 2026! Keep this private")).toMatchObject({ label: "Strong", isReady: true });
  });
});
