/** Brass & Ledger UI helper: provide guidance without persisting or logging the passphrase. */
export type PassphraseStrength = {
  label: "Too short" | "Basic" | "Solid" | "Strong";
  hint: string;
  percentage: number;
  isReady: boolean;
  tone: "muted" | "warm" | "ink" | "green";
};

export function evaluatePassphrase(passphrase: string): PassphraseStrength {
  const length = passphrase.length;
  if (length < 12) {
    return { label: "Too short", hint: `Add ${12 - length} more character${12 - length === 1 ? "" : "s"} to reach the minimum.`, percentage: Math.min(30, Math.round((length / 12) * 30)), isReady: false, tone: "muted" };
  }
  const variety = [/[a-z]/.test(passphrase), /[A-Z]/.test(passphrase), /\d/.test(passphrase), /[^A-Za-z0-9]/.test(passphrase)].filter(Boolean).length;
  if (length < 16 || variety < 3) {
    return { label: "Basic", hint: "Use a longer phrase or combine more character types for stronger protection.", percentage: 50, isReady: true, tone: "warm" };
  }
  if (length < 24 || variety < 4) {
    return { label: "Solid", hint: "This meets the requirement. A longer memorable phrase is even better.", percentage: 75, isReady: true, tone: "ink" };
  }
  return { label: "Strong", hint: "Long, varied passphrases are harder to guess. Store it in a trusted password manager.", percentage: 100, isReady: true, tone: "green" };
}
