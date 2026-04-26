import { useLanguage } from "@/i18n/LanguageContext";
import type { Language } from "@/i18n/translations";

const flags: { lang: Language; emoji: string; label: string }[] = [
  { lang: "nl", emoji: "🇳🇱", label: "Nederlands" },
  { lang: "en", emoji: "🇬🇧", label: "English" },
  { lang: "es", emoji: "🇪🇸", label: "Español" },
];

const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1.5">
      {flags.map((f) => (
        <button
          key={f.lang}
          onClick={() => setLanguage(f.lang)}
          title={f.label}
          className={`text-lg leading-none px-1 py-0.5 rounded-sm transition-all ${
            language === f.lang
              ? "bg-primary/20 scale-110"
              : "opacity-60 hover:opacity-100 hover:bg-foreground/5"
          }`}
        >
          {f.emoji}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
