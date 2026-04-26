import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const PHONE = "31652887988";
const PRESET_MESSAGE =
  "Hoi Pablo, ik kom via je website en heb een vraag over personal training.";

const FloatingWhatsApp = () => {
  const { t } = useLanguage();
  const href = `https://api.whatsapp.com/send?phone=${PHONE}&text=${encodeURIComponent(
    PRESET_MESSAGE,
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("wa.label")}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-110 transition-transform animate-[pulse_3s_ease-in-out_infinite]"
    >
      <MessageCircle size={26} />
    </a>
  );
};

export default FloatingWhatsApp;
