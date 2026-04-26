import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Dumbbell, Timer, Trophy, User as UserIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * App-first bottom tab bar — only rendered on mobile (`md:hidden`).
 * Picks the 5 most-used app destinations; everything else stays in
 * the existing slide-in sidebar (which still works as the secondary
 * "more" menu).
 *
 * Sits above the iOS home indicator via `safe-pb`.
 */
const BottomNav = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const tabs = [
    { href: "/app", icon: LayoutDashboard, label: t("app.nav.dashboard") },
    { href: "/app/workouts", icon: Dumbbell, label: t("app.nav.workouts") },
    { href: "/app/interval", icon: Timer, label: t("app.nav.interval") },
    { href: "/app/rank", icon: Trophy, label: t("app.nav.rank") },
    { href: "/app/profiel", icon: UserIcon, label: t("app.nav.profile") },
  ];

  // Active when exact match; for /app dashboard, only when path is exactly /app.
  const isActive = (href: string) => {
    if (href === "/app") return location.pathname === "/app";
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-md safe-pb"
      aria-label="App navigatie"
    >
      <ul className="flex items-stretch justify-around">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex-1">
              <Link
                to={href}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-heading tracking-wider uppercase transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className="truncate max-w-full px-1">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;