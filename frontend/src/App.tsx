import { useState } from "react";

import { Sidebar } from "./components/Sidebar";
import { useAuth } from "./hooks/useAuth";
import { usePlannerSession, type StartOptions } from "./hooks/usePlannerSession";
import { useSettings } from "./hooks/useSettings";
import { ChatPage } from "./pages/ChatPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StartPage } from "./pages/StartPage";
import { TripsPage } from "./pages/TripsPage";
import type { Screen } from "./types/navigation";
import type { TripPlan } from "./types/trip";

const SCREEN_STORAGE_KEY = "pm_web_screen";
const SCREENS: Screen[] = ["start", "chat", "suche", "reisen", "profil", "einstellungen"];

function loadScreen(): Screen {
  try {
    const stored = localStorage.getItem(SCREEN_STORAGE_KEY);
    return SCREENS.includes(stored as Screen) ? (stored as Screen) : "start";
  } catch {
    return "start";
  }
}

function App() {
  const [screen, setScreen] = useState<Screen>(loadScreen);
  const [plans, setPlans] = useState<TripPlan[]>([]);
  // Upsert: plan creation appends, a revision replaces the entry with the same id.
  const planner = usePlannerSession((plan) =>
    setPlans((existing) =>
      existing.some((p) => p.id === plan.id)
        ? existing.map((p) => (p.id === plan.id ? plan : p))
        : [...existing, plan],
    ),
  );
  const { settings, update, resetLocalData } = useSettings();
  const auth = useAuth();

  const go = (next: Screen) => {
    setScreen(next);
    try {
      localStorage.setItem(SCREEN_STORAGE_KEY, next);
    } catch {
      // Storage unavailable — navigation still works in-memory.
    }
  };

  const startChat = (options: StartOptions) => {
    planner.startNew(options);
    go("chat");
  };

  const handleResetLocal = () => {
    resetLocalData();
    auth.logout();
    planner.reset();
    setPlans([]);
    setScreen("start");
  };

  return (
    <div className="flex min-h-screen bg-surface-page">
      <Sidebar active={screen} onNavigate={go} />
      <main className="flex min-w-0 flex-1 flex-col">
        {screen === "start" && (
          <StartPage onStart={(message) => startChat({ message })} onExplore={() => go("suche")} />
        )}
        {screen === "chat" && <ChatPage planner={planner} onOpenTrips={() => go("reisen")} />}
        {screen === "suche" && <SearchPage onPlan={(keywords) => startChat({ keywords })} />}
        {screen === "reisen" && (
          <TripsPage
            sessionPlans={plans}
            planPending={planner.planPending}
            loggedIn={auth.user !== null}
            onStartChat={() => go("chat")}
          />
        )}
        {screen === "profil" && (
          <ProfilePage
            auth={auth}
            sessionPlansCount={plans.length}
            activePlanning={planner.session !== null}
          />
        )}
        {screen === "einstellungen" && (
          <SettingsPage settings={settings} onUpdate={update} onResetLocal={handleResetLocal} />
        )}
      </main>
    </div>
  );
}

export default App;
