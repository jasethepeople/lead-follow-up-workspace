/** Brass & Ledger safeguard: explicit local confirmation before a restore replaces client files. */
export const REPLACE_CONFIRMATION_PHRASE = "REPLACE";

export function canConfirmReplacement(value: string) {
  return value.trim().toUpperCase() === REPLACE_CONFIRMATION_PHRASE;
}
