import { PlannerPage } from "./pages/PlannerPage";

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-pm-sand bg-pm-cream/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pm-orange text-xl shadow-sm">
            🧭
          </span>
          <div>
            <p className="text-xl font-extrabold leading-tight tracking-tight">
              <span className="text-pm-orange">Plan</span>
              <span className="text-pm-sage">Migo</span>
            </p>
            <p className="text-xs text-pm-greenDark/80">
              Vom Schlagwort zum perfekten Urlaub — in Minuten.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        <PlannerPage />
      </main>

      <footer className="border-t border-pm-sand">
        <p className="mx-auto max-w-3xl px-6 py-4 text-center text-xs text-pm-greenDark/70">
          © 2026 PlanMigo — Kevin Schaulis · Marco Martins · Patrick Lenzen
        </p>
      </footer>
    </div>
  );
}

export default App;
