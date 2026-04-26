import { nl, enUS, es } from "date-fns/locale";
import type { Language } from "./translations";

export function dateLocale(lang: Language) {
  if (lang === "en") return enUS;
  if (lang === "es") return es;
  return nl;
}

export function intlLocale(lang: Language): string {
  if (lang === "en") return "en-US";
  if (lang === "es") return "es-ES";
  return "nl-NL";
}
