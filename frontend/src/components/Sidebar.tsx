import { Map, MessageCircle, Search, Settings, User, UserRound } from "lucide-react";

import logo from "../assets/planmigo-logo.svg";
import type { AuthUser } from "../types/auth";
import type { Screen } from "../types/navigation";

interface SidebarProps {
  active: Screen;
  user: AuthUser | null;
  onNavigate: (screen: Screen) => void;
}

const NAV_ITEMS: { screen: Screen; label: string; Icon: typeof Search }[] = [
  { screen: "suche", label: "Suche", Icon: Search },
  { screen: "reisen", label: "Gebuchte Reisen", Icon: Map },
  { screen: "profil", label: "Profil", Icon: User },
  { screen: "einstellungen", label: "Einstellungen", Icon: Settings },
];

/** Fixed left navigation rail: logo (→ start), sections, account status, "Chat starten" CTA. */
export function Sidebar({ active, user, onNavigate }: SidebarProps) {
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

      {/* Konto-Status: immer sichtbar, Klick führt zum Profil (Login/Logout). */}
      <button
        type="button"
        onClick={() => onNavigate("profil")}
        title={user ? `Angemeldet als ${user.email}` : "Nicht angemeldet — zum Anmelden klicken"}
        className="mb-3 flex items-center justify-center gap-3 rounded-card px-2 py-2 transition-colors duration-quick ease-brand hover:bg-surface-page lg:justify-start lg:px-3"
      >
        <span className="relative shrink-0">
          <span
            className={`grid h-9 w-9 place-items-center rounded-full text-body font-bold uppercase ${
              user ? "bg-accent-secondary text-pm-white" : "bg-pm-sand text-content-muted"
            }`}
          >
            {user ? user.email.charAt(0) : <UserRound size={18} strokeWidth={2.2} />}
          </span>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-card ${
              user ? "bg-pm-greenDark" : "bg-pm-taupe"
            }`}
            aria-hidden="true"
          />
        </span>
        <span className="hidden min-w-0 text-left lg:block">
          <span className="block truncate text-caption font-bold text-content-body">
            {user ? user.email : "Gast"}
          </span>
          <span className="block text-caption text-content-muted">
            {user ? "Angemeldet" : "Nicht angemeldet"}
          </span>
        </span>
      </button>

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
