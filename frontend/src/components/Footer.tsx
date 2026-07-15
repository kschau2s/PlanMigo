import { useState } from "react";
import { X } from "lucide-react";

type LegalPage = "impressum" | "datenschutz";

const LEGAL_CONTENT: Record<LegalPage, { title: string; paragraphs: string[] }> = {
  impressum: {
    title: "Impressum",
    paragraphs: [
      "PlanMigo befindet sich in der Entwicklung und ist noch nicht öffentlich in Betrieb.",
      "Die vollständige Anbieterkennzeichnung (Name, Anschrift, Vertretungsberechtigte, Kontakt) wird vor dem öffentlichen Launch an dieser Stelle ergänzt.",
    ],
  },
  datenschutz: {
    title: "Datenschutz",
    paragraphs: [
      "Kurz und transparent, solange PlanMigo in Entwicklung ist:",
      "Deine Chat-Nachrichten werden zur Reiseplanung an unser Backend und von dort an den LLM-Dienst (OpenRouter) übertragen. Reisepläne und Konversationen werden in unserer Datenbank gespeichert.",
      "Bei Registrierung speichern wir deine E-Mail-Adresse und einen Passwort-Hash (bcrypt) — nie das Passwort selbst. Einstellungen liegen nur lokal in deinem Browser.",
      "Ziel-Fotos werden über Unsplash geladen, Kartendaten über OpenStreetMap.",
      "Die vollständige Datenschutzerklärung wird vor dem öffentlichen Betrieb ergänzt.",
    ],
  },
};

/** Site footer: legal links (honest placeholder modals) + contact. */
export function Footer() {
  const [open, setOpen] = useState<LegalPage | null>(null);
  const content = open ? LEGAL_CONTENT[open] : null;

  return (
    <footer className="border-t border-card bg-surface-card">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-3 px-8 py-4">
        <span className="text-caption text-content-muted">
          © 2026 PlanMigo — Dein KI-Reiseplaner
        </span>
        <nav className="flex flex-wrap items-center gap-5 text-caption" aria-label="Rechtliches">
          <button
            type="button"
            onClick={() => setOpen("impressum")}
            className="font-medium text-content-muted transition-colors duration-quick ease-brand hover:text-accent-primary"
          >
            Impressum
          </button>
          <button
            type="button"
            onClick={() => setOpen("datenschutz")}
            className="font-medium text-content-muted transition-colors duration-quick ease-brand hover:text-accent-primary"
          >
            Datenschutz
          </button>
          <a
            href="mailto:kontakt@planmigo.app"
            className="font-medium text-content-muted transition-colors duration-quick ease-brand hover:text-accent-primary"
          >
            Kontakt
          </a>
        </nav>
      </div>

      {content && (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={content.title}
        >
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => setOpen(null)}
            className="absolute inset-0 bg-pm-espresso opacity-40"
          />
          <div className="relative w-full max-w-md rounded-card border border-card bg-surface-card p-card shadow-card">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-h2 font-bold text-content-heading">
                {content.title}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Schließen"
                className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-full text-content-muted transition-colors duration-quick ease-brand hover:bg-surface-page"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {content.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-body text-content-body">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
