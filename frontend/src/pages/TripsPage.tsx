import { useState } from "react";
import { MapPin } from "lucide-react";

import { TripCard } from "../components/TripCard";
import { useMyTrips } from "../hooks/useTripPlan";
import type { TripPlan } from "../types/trip";

interface TripsPageProps {
  /** Plans created in this browser session (also covers guests). */
  sessionPlans: TripPlan[];
  planPending: boolean;
  loggedIn: boolean;
  onStartChat: () => void;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function TripsPage({ sessionPlans, planPending, loggedIn, onStartChat }: TripsPageProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const myTrips = useMyTrips(loggedIn);

  // Server list first (persisted), then session-only plans not yet in it (guest chats).
  const serverPlans = loggedIn ? myTrips.data ?? [] : [];
  const serverIds = new Set(serverPlans.map((plan) => plan.id));
  const plans = [...serverPlans, ...sessionPlans.filter((plan) => !serverIds.has(plan.id))];

  return (
    <section className="w-full max-w-[860px] px-7 py-7">
      <div className="pm-eyebrow">Deine Reisen</div>
      <h1 className="mt-2 font-serif text-h1 font-bold tracking-headline text-content-heading">
        Gebuchte Reisen
      </h1>
      <p className="mt-3 max-w-lg text-body text-content-muted">
        {loggedIn
          ? "Deine Reisepläne sind in deinem Konto gespeichert. Die Buchung folgt in einer späteren Version."
          : "Als Gast gelten deine Reisepläne nur für diese Browser-Sitzung — melde dich im Profil an, um sie dauerhaft zu speichern."}
      </p>

      {planPending && (
        <div className="mt-6 flex items-center gap-3 rounded-card border border-card bg-surface-card px-5 py-4 shadow-soft">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-secondary border-t-surface-card" />
          <p className="text-body font-medium text-content-body">
            Migo stellt gerade einen neuen Reiseplan zusammen …
          </p>
        </div>
      )}

      {loggedIn && myTrips.isLoading && (
        <div className="mt-6 rounded-card border border-card bg-surface-card p-card shadow-soft">
          <p className="text-body text-content-muted">Deine Reisen werden geladen …</p>
        </div>
      )}

      {plans.length === 0 && !planPending && !myTrips.isLoading ? (
        <div className="mt-6 rounded-card border border-card bg-surface-card p-card text-center shadow-soft">
          <p className="font-serif text-cardTitle font-bold text-content-heading">
            Noch keine Reisen geplant
          </p>
          <p className="mx-auto mt-2 max-w-sm text-body text-content-muted">
            Starte einen Chat mit Migo — dein fertiger Reiseplan erscheint danach hier.
          </p>
          <button
            type="button"
            onClick={onStartChat}
            className="mt-5 rounded-button bg-accent-primary px-7 py-3 text-body font-bold text-pm-cream transition-colors duration-quick ease-brand hover:bg-pm-orangeDeep"
          >
            Chat starten
          </button>
        </div>
      ) : (
        plans.map((plan) => {
          const start = formatDate(plan.start_date);
          const end = formatDate(plan.end_date);
          const isOpen = openId === plan.id;
          return (
            <article
              key={plan.id}
              className="mt-6 overflow-hidden rounded-card border border-card bg-surface-card shadow-card"
            >
              <div className="flex flex-col gap-4 p-card sm:flex-row sm:items-center">
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-image bg-pm-sandLight">
                  <MapPin size={32} strokeWidth={1.8} className="text-pm-terracotta" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="pm-eyebrow">
                    {start && end ? `${start} – ${end}` : "Entwurf aus deinem Chat"}
                  </div>
                  <h3 className="mt-1 font-serif text-h2 font-bold text-content-heading">
                    {plan.destination}
                  </h3>
                  <div className="mt-1 text-caption text-content-muted">
                    {plan.items.length} Programmpunkte
                    {plan.budget !== null &&
                      ` · ca. ${new Intl.NumberFormat("de-DE", {
                        style: "currency",
                        currency: "EUR",
                        maximumFractionDigits: 0,
                      }).format(plan.budget)}`}
                  </div>
                  <span className="mt-3 inline-flex rounded-chip bg-pm-sand px-3.5 py-1 text-caption font-medium text-content-body">
                    Entwurf
                  </span>
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : plan.id)}
                    className="rounded-button bg-accent-secondary px-5 py-2.5 text-body font-bold text-pm-white transition-colors duration-quick ease-brand hover:bg-pm-greenDark"
                  >
                    {isOpen ? "Reiseplan schließen" : "Reiseplan öffnen"}
                  </button>
                </div>
              </div>
              {isOpen && (
                <div className="border-t border-card bg-surface-page p-4">
                  <TripCard plan={plan} />
                </div>
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
