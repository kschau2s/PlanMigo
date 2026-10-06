import { useState } from "react";
import { Link } from "react-router-dom";

import { AuthModal } from "../components/AuthModal";
import { Nav } from "../components/Chat";
import { PhoneFrame } from "../components/PhoneFrame";
import { useAuth } from "../hooks/useAuth";
import { useMyTrips } from "../hooks/useTripPlan";
import { PlaceImage } from "../components/PlaceImage";
import { destinationQuery } from "../lib/images";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

export function MyTripsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: trips, isLoading: tripsLoading } = useMyTrips(Boolean(user));
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <PhoneFrame header={<Nav />}>
        <div className="p-4">
          <h1 className="font-serif text-h2 font-bold text-content-heading">Meine Reisen</h1>

          {!authLoading && !user && (
            <div className="mt-5 flex flex-col items-center gap-3 rounded-card border border-card bg-surface-card p-4 text-center shadow-card">
              <p className="text-caption text-content-muted">
                Melde dich an, um deine geplanten Reisen hier wiederzufinden.
              </p>
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="rounded-button bg-accent-primary px-5 py-2 text-caption font-semibold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
              >
                Anmelden
              </button>
            </div>
          )}

          {user && tripsLoading && (
            <div className="mt-6 flex justify-center">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-accent-secondary border-t-surface-card" />
            </div>
          )}

          {user && !tripsLoading && trips && trips.length === 0 && (
            <div className="mt-5 rounded-card border border-card bg-surface-card p-4 text-center shadow-card">
              <p className="text-caption text-content-muted">
                Noch keine Reise geplant.{" "}
                <Link to="/" className="font-semibold text-accent-primary hover:underline">
                  Jetzt starten →
                </Link>
              </p>
            </div>
          )}

          {user && !tripsLoading && trips && trips.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              {trips.map((trip) => {
                const startDate = formatDate(trip.start_date);
                const endDate = formatDate(trip.end_date);
                return (
                  <Link
                    key={trip.id}
                    to={`/trip/${trip.id}`}
                    className="group flex gap-3 overflow-hidden rounded-card border border-card bg-surface-card shadow-card transition-opacity duration-quick ease-brand hover:opacity-90"
                  >
                    <PlaceImage
                      query={destinationQuery(trip.destination)}
                      width={330}
                      alt={trip.destination}
                      className="h-[80px] w-[80px] shrink-0"
                    />
                    <div className="min-w-0 py-2 pr-3">
                      <h2 className="truncate font-serif text-body font-bold text-content-heading">
                        {trip.destination}
                      </h2>
                      {startDate && endDate && (
                        <p className="mt-0.5 text-[11px] text-content-muted">
                          {startDate} – {endDate}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </PhoneFrame>

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </div>
  );
}
