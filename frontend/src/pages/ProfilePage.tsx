import { useState } from "react";
import axios from "axios";
import { LogOut } from "lucide-react";

import type { Auth } from "../hooks/useAuth";
import { useMyTrips } from "../hooks/useTripPlan";

interface ProfilePageProps {
  auth: Auth;
  /** Plans created in this browser session (guest fallback for the stats). */
  sessionPlansCount: number;
  activePlanning: boolean;
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-card border border-card bg-surface-card px-2 py-4 text-center">
      <b className="block font-serif text-h1 font-bold tracking-headline text-accent-primary">
        {value}
      </b>
      <span className="text-caption uppercase tracking-label text-content-muted">{label}</span>
    </div>
  );
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 409) return "Diese E-Mail-Adresse ist bereits registriert.";
    if (status === 401) return "E-Mail oder Passwort ist falsch.";
    if (status === 422)
      return "Bitte gib eine gültige E-Mail-Adresse und ein Passwort mit mindestens 8 Zeichen an.";
  }
  return "Das hat leider nicht geklappt. Bitte versuche es erneut.";
}

const INPUT_CLASSES =
  "w-full rounded-button border border-card bg-surface-card px-4 py-2.5 text-body text-content-body outline-none placeholder:text-content-muted focus:border-accent-secondary";

function AuthForm({ auth }: { auth: Auth }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const credentials = { email: email.trim(), password };
      await (mode === "login" ? auth.login(credentials) : auth.register(credentials));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6 max-w-md rounded-card border border-card bg-surface-card p-card shadow-soft">
      <h3 className="font-serif text-h2 font-bold text-content-heading">
        {mode === "login" ? "Anmelden" : "Konto erstellen"}
      </h3>
      <p className="mt-1 text-caption text-content-muted">
        {mode === "login"
          ? "Melde dich an, um deine Reisepläne dauerhaft zu speichern."
          : "Mit einem Konto bleiben deine Reisepläne über die Sitzung hinaus erhalten."}
      </p>

      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail-Adresse"
          aria-label="E-Mail-Adresse"
          autoComplete="email"
          className={INPUT_CLASSES}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "register" ? "Passwort (mind. 8 Zeichen)" : "Passwort"}
          aria-label="Passwort"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={INPUT_CLASSES}
        />

        {error && <p className="text-caption font-medium text-pm-orangeDeep">{error}</p>}

        <button
          type="submit"
          disabled={!email.trim() || !password || submitting}
          className="rounded-button bg-accent-primary px-6 py-3 text-body font-bold text-pm-cream transition-colors duration-quick ease-brand hover:bg-pm-orangeDeep disabled:opacity-40"
        >
          {submitting ? "Einen Moment …" : mode === "login" ? "Anmelden" : "Registrieren"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
        }}
        className="mt-4 text-caption font-bold text-content-muted transition-colors duration-quick ease-brand hover:text-accent-primary"
      >
        {mode === "login" ? "Noch kein Konto? Jetzt registrieren →" : "← Zurück zur Anmeldung"}
      </button>
    </div>
  );
}

export function ProfilePage({ auth, sessionPlansCount, activePlanning }: ProfilePageProps) {
  const { user } = auth;
  const myTrips = useMyTrips(user !== null);
  const plannedCount = user !== null ? myTrips.data?.length ?? sessionPlansCount : sessionPlansCount;

  const memberSince =
    user !== null
      ? new Date(user.created_at).toLocaleDateString("de-DE", { month: "long", year: "numeric" })
      : null;

  return (
    <section className="w-full max-w-[860px] px-7 py-7">
      <div className="pm-eyebrow">Dein Konto</div>
      <h1 className="mt-2 font-serif text-h1 font-bold tracking-headline text-content-heading">
        Profil
      </h1>

      {user === null ? (
        <>
          <AuthForm auth={auth} />
          <p className="mt-4 max-w-md text-caption text-content-muted">
            Ohne Konto kannst du PlanMigo weiter als Gast nutzen — deine Planungen gelten dann nur
            für diese Browser-Sitzung.
          </p>
        </>
      ) : (
        <>
          <div className="mt-6 rounded-card border border-card bg-surface-card p-card shadow-soft">
            <div className="flex items-center gap-5">
              <div className="grid h-[84px] w-[84px] shrink-0 place-items-center rounded-full bg-accent-secondary font-serif text-h1 font-bold uppercase text-pm-white">
                {user.email.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="truncate font-serif text-h2 font-bold text-content-heading">
                  {user.email}
                </div>
                {memberSince && (
                  <p className="mt-1 text-body text-content-muted">Mitglied seit {memberSince}</p>
                )}
              </div>
              <button
                type="button"
                onClick={auth.logout}
                className="ml-auto flex shrink-0 items-center gap-2 rounded-chip border border-hairline px-4 py-2 text-body font-medium text-content-body transition-colors duration-quick ease-brand hover:bg-pm-paper"
              >
                <LogOut size={16} strokeWidth={2} />
                Abmelden
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <Stat value={plannedCount} label="Reisen geplant" />
              <Stat value={activePlanning ? 1 : 0} label="Aktive Planung" />
              <Stat value={0} label="Reisen gebucht" />
            </div>
          </div>

          <div className="mt-5 rounded-card border border-card bg-surface-card p-card shadow-soft">
            <b className="text-body font-bold text-content-body">Deine Reise-Vorlieben</b>
            <p className="mt-2 text-body text-content-muted">
              Migo merkt sich hier künftig deinen Reisestil, dein Budget und deine liebste
              Reisedauer — auf Wunsch automatisch aus deinen Chats gelernt (siehe Einstellungen →
              KI-Personalisierung).
            </p>
          </div>
        </>
      )}
    </section>
  );
}
