import type { ChatSession } from "../types/chat";

interface SidebarProps {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ sessions, activeId, onSelect, onNewChat, open, onClose }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-pm-greenDark/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col bg-pm-cream shadow-xl transition-transform duration-300 md:static md:translate-x-0 md:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-pm-sand px-4 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pm-orange text-xl shadow-sm">
            🧭
          </span>
          <div>
            <p className="text-lg font-extrabold leading-tight tracking-tight">
              <span className="text-pm-orange">Plan</span>
              <span className="text-pm-sage">Migo</span>
            </p>
            <p className="text-[11px] text-pm-greenDark/70">Dein KI-Reisebegleiter</p>
          </div>
        </div>

        <div className="px-3 pt-3">
          <button
            onClick={onNewChat}
            className="w-full rounded-xl bg-pm-orange px-4 py-2.5 text-sm font-bold text-pm-cream shadow-sm transition hover:bg-pm-orange/90"
          >
            ＋ Neue Reise planen
          </button>
        </div>

        <p className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-pm-greenDark/60">
          Deine Chats
        </p>
        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {sessions.length === 0 ? (
            <p className="px-2 py-3 text-sm text-pm-greenDark/60">
              Noch keine Chats — starte deine erste Reiseplanung! 🗺️
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {sessions.map((session) => {
                const isActive = session.id === activeId;
                return (
                  <li key={session.id}>
                    <button
                      onClick={() => onSelect(session.id)}
                      className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                        isActive
                          ? "bg-pm-sand/70 shadow-sm"
                          : "hover:bg-pm-sand/40"
                      }`}
                    >
                      <p className="truncate text-sm font-semibold">
                        {session.keywords.join(" · ") || "Neue Reise"}
                      </p>
                      <p className="truncate text-xs text-pm-greenDark/60">
                        {session.plan
                          ? `✓ ${session.plan.destination}`
                          : session.history.length > 0
                            ? "In Planung …"
                            : "Neu"}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <div className="border-t border-pm-sand px-3 py-3">
          {[
            { icon: "⚙️", label: "Einstellungen" },
            { icon: "👤", label: "Profil" },
          ].map((item) => (
            <button
              key={item.label}
              title="Bald verfügbar"
              className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-pm-greenDark/70 transition hover:bg-pm-sand/30"
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              <span className="rounded-full bg-pm-sand px-2 py-0.5 text-[10px] font-semibold uppercase text-pm-greenDark/70">
                bald
              </span>
            </button>
          ))}
          <p className="px-3 pt-3 text-[10px] text-pm-greenDark/50">
            © 2026 PlanMigo — Schaulis · Martins · Lenzen
          </p>
        </div>
      </aside>
    </>
  );
}
