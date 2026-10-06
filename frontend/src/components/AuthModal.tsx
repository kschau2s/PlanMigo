import { X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "../hooks/useAuth";

interface AuthModalProps {
  onClose: () => void;
}

type Mode = "login" | "register";

function extractErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const data = (error.response as { data?: unknown }).data;
    if (data && typeof data === "object" && "detail" in data) {
      const detail = (data as { detail?: unknown }).detail;
      if (typeof detail === "string") return detail;
    }
  }
  return fallback;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      onClose();
    } catch (err) {
      setError(
        extractErrorMessage(
          err,
          mode === "login" ? "Anmeldung fehlgeschlagen." : "Registrierung fehlgeschlagen.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-pm-espresso opacity-60" />
      <div
        className="relative w-full max-w-sm rounded-card bg-surface-card p-card shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-button border border-card bg-pm-sand p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-button px-4 py-1.5 text-caption font-semibold transition-colors duration-quick ease-brand ${
                mode === "login" ? "bg-accent-primary text-pm-white" : "text-content-muted"
              }`}
            >
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-button px-4 py-1.5 text-caption font-semibold transition-colors duration-quick ease-brand ${
                mode === "register" ? "bg-accent-primary text-pm-white" : "text-content-muted"
              }`}
            >
              Registrieren
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="text-content-muted transition-colors duration-quick ease-brand hover:text-accent-primary"
          >
            <X size={20} />
          </button>
        </div>

        <h2 className="mt-4 font-serif text-h2 text-content-heading">
          {mode === "login" ? "Willkommen zurück" : "Konto erstellen"}
        </h2>
        <p className="mt-1 text-caption text-content-muted">
          {mode === "login"
            ? "Melde dich an, um deine Reisen wiederzufinden."
            : "Erstelle ein Konto, um deine Reisen zu speichern."}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail-Adresse"
            className="rounded-button border border-card bg-surface-card px-4 py-2.5 text-body text-content-body outline-none placeholder:text-content-muted focus:border-accent-secondary"
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passwort (mind. 8 Zeichen)"
            className="rounded-button border border-card bg-surface-card px-4 py-2.5 text-body text-content-body outline-none placeholder:text-content-muted focus:border-accent-secondary"
          />

          {error && <p className="text-caption font-medium text-pm-terracotta">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 rounded-button bg-accent-primary px-6 py-3 text-body font-bold text-pm-white shadow-soft transition-opacity duration-quick ease-brand hover:opacity-90 disabled:opacity-40"
          >
            {isSubmitting ? "Einen Moment …" : mode === "login" ? "Anmelden" : "Konto erstellen"}
          </button>
        </form>
      </div>
    </div>
  );
}
