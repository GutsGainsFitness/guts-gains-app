import type { Language } from "./translations";

/**
 * Pick the localized field from a DB row that has `field`, `field_en`, `field_es`.
 * Falls back to NL (base column) when the localized value is missing.
 */
export function pickLocalized<T extends Record<string, unknown>>(
  row: T | null | undefined,
  field: string,
  language: Language,
): string {
  if (!row) return "";
  const base = (row[field] as string | null | undefined) ?? "";
  if (language === "nl") return base;
  const localized = row[`${field}_${language}`] as string | null | undefined;
  return (localized && localized.trim().length > 0) ? localized : base;
}
