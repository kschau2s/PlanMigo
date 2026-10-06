import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Map, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthModal } from "../components/AuthModal";
import { useAuth } from "../hooks/useAuth";
import { useMyTrips } from "../hooks/useTripPlan";

function formatDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "–";
  return parsed.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}

export function AccountPage() {
  const { user, isLoading, logout } = useAuth();
  const { data: trips } = useMyTrips(Boolean(user));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    queryClient.removeQueries({ queryKey: ["my-trips"] });
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-card border-2 border-card bg-surface-card p-6 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-button bg-pm-sand">
            <UserRound className="text-accent-primary" size={18} />
          </div>
          <div>
            <p className="pm-eyebrow">Konto</p>
            <h1 className="font-serif text-h2 text-content-heading">Kontoverwaltung</h1>
          </div>
        </div>

        {!isLoading && !user && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-card border border-card bg-surface-page p-5 text-center">
            <p className="text-caption text-content-muted">
              Du bist nicht angemeldet. Melde dich an oder erstelle ein Konto, um Reisen zu speichern.
            </p>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="rounded-button bg-accent-primary px-5 py-2 text-caption font-semibold text-pm-white transition-opacity duration-quick ease-brand hover:opacity-90"
            >
              Anmelden / Registrieren
            </button>
          </div>
        )}

        {user && (
          <>
            <dl className="mt-6 rounded-card border border-card bg-surface-page">
              <div className="flex items-center justify-between gap-4 p-4">
                <dt className="text-caption text-content-muted">E-Mail</dt>
                <dd className="truncate text-body font-semibold text-content-heading">{user.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-card p-4">
                <dt className="text-caption text-content-muted">Mitglied seit</dt>
                <dd className="text-body text-content-body">{formatDate(user.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-card p-4">
                <dt className="text-caption text-content-muted">Geplante Reisen</dt>
                <dd className="text-body text-content-body">{trips?.length ?? "–"}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/trips"
                className="flex items-center gap-2 rounded-button border border-card bg-surface-page px-4 py-2.5 text-caption font-semibold text-content-body transition-colors duration-quick ease-brand hover:border-accent-secondary hover:text-accent-secondary"
              >
                <Map size={14} />
                Meine Reisen
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-button border border-card bg-surface-page px-4 py-2.5 text-caption font-semibold text-pm-terracotta transition-colors duration-quick ease-brand hover:border-pm-terracotta"
              >
                <LogOut size={14} />
                Abmelden
              </button>
            </div>
          </>
        )}
      </div>

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </div>
  );
}
