import { Map, MessageCircle, Search, Settings, User } from "lucide-react";

import logo from "../assets/planmigo-logo.svg";
import type { Screen } from "../types/navigation";

interface SidebarProps {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}

const NAV_ITEMS: { screen: Screen; label: string; Icon: typeof Search }[] = [
  { screen: "suche", label: "Suche", Icon: Search },
  { screen: "reisen", label: "Gebuchte Reisen", Icon: Map },
  { screen: "profil", label: "Profil", Icon: User },
  { screen: "einstellungen", label: "Einstellungen", Icon: Settings },
];

/** Fixed left navigation rail: logo (→ start), sections, "Chat starten" CTA. */
export function Sidebar({ active, onNavigate }: SidebarProps) {
  return (
    <aside className="sticky top-0 flex h-screen w-[76px] shrink-0 flex-col border-r border-card bg-surface-card px-3 py-5 lg:w-[240px] lg:px-4">
      <button
        type="button"
        onClick={() => onNavigate("start")}
        aria-label="Zur Startseite"
        className="flex items-center justify-center gap-2.5 rounded-card px-2 py-2 transition-colors duration-quick ease-brand hover:bg-surface-page lg:justify-start lg:px-3"
      >
        <img src={logo} alt="" className="h-8 w-8 shrink-0" />
        <span className="hidden font-serif text-cardTitle font-bold tracking-headline lg:inline">
          <span className="text-pm-terracotta">Plan</span>
          <span className="text-pm-sage">Migo</span>
        </span>
      </button>

      <nav className="mt-6 flex flex-col gap-1" aria-label="Hauptnavigation">
        {NAV_ITEMS.map(({ screen, label, Icon }) => {
          const isActive = active === screen;
          return (
            <button
              key={screen}
              type="button"
              onClick={() => onNavigate(screen)}
              aria-current={isActive ? "page" : undefined}
              title={label}
              className={`flex items-center justify-center gap-3 rounded-chip px-3 py-3 text-body transition-colors duration-quick ease-brand lg:justify-start lg:px-3.5 ${
                isActive
                  ? "bg-accent-secondary font-bold text-pm-white"
                  : "text-content-body hover:bg-surface-page"
              }`}
            >
              <Icon
                size={20}
                strokeWidth={2}
                className={isActive ? "shrink-0 text-pm-white" : "shrink-0 text-content-muted"}
              />
              <span className="hidden lg:inline">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => onNavigate("chat")}
        title="Chat starten"
        aria-current={active === "chat" ? "page" : undefined}
        className="flex items-center justify-center gap-2 rounded-button bg-accent-primary py-3 text-body font-bold text-pm-cream transition-colors duration-quick ease-brand hover:bg-pm-orangeDeep"
      >
        <MessageCircle size={18} strokeWidth={2.2} className="shrink-0" />
        <span className="hidden lg:inline">Chat starten</span>
      </button>
    </aside>
  );
}
