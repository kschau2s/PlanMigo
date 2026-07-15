import { useState } from "react";

import { Footer } from "./components/Footer";
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

function App() {
  // Every page load starts on the start screen (no persisted screen state).
  const [screen, setScreen] = useState<Screen>("start");
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

  const go = (next: Screen) => setScreen(next);

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
      <Sidebar active={screen} user={auth.user} onNavigate={go} />
      <main className="flex min-w-0 flex-1 flex-col">
        {screen === "start" && (
          <StartPage onStart={(message) => startChat({ message })} />
        )}
        {screen === "chat" && (
          <ChatPage
            planner={planner}
            onOpenTrips={() => go("reisen")}
            userInitial={auth.user ? auth.user.email.charAt(0) : null}
          />
        )}
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
        {/* Footer auf allen Inhaltsseiten; der Chat füllt als Fenster den Viewport. */}
        {screen !== "chat" && <Footer />}
      </main>
    </div>
  );
}

export default App;
