import { useState } from "react";
import { ArrowRight, Plane, Send } from "lucide-react";

import logo from "../assets/planmigo-logo.svg";

interface StartPageProps {
  /** Starts a new chat with the given text as first user message. */
  onStart: (message: string) => void;
  onExplore: () => void;
}

const PROMPT_SUGGESTIONS = [
  "Erstelle eine neue Reise",
  "Inspiriere mich, wohin ich gehen soll",
  "Plane einen Roadtrip",
  "Plane einen Last-Minute-Ausflug",
];

export function StartPage({ onStart, onExplore }: StartPageProps) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onStart(text);
    setDraft("");
  };

  return (
    <section className="flex flex-1 items-center bg-gradient-to-b from-pm-creamWarm to-pm-cream">
      <div className="mx-auto grid w-full max-w-[1180px] items-center gap-8 px-8 py-8 xl:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-11 w-11" />
            <span className="font-serif text-[30px] font-bold tracking-headline">
              <span className="text-pm-terracotta">Plan</span>
              <span className="text-pm-sage">Migo</span>
            </span>
          </div>

          <h1 className="mt-6 font-serif text-display font-bold leading-[1.08] tracking-display text-content-heading">
            Dein Urlaub.
            <br />
            In Minuten geplant.
          </h1>
          <p className="mt-4 max-w-[480px] text-[17px] leading-body text-content-muted">
            Sag PlanMigo, worauf du Lust hast — und erhalte einen fertigen, buchbaren Reiseplan.
          </p>

          <div className="mt-6 rounded-[24px] border border-card bg-surface-card p-4 pb-3 shadow-card">
            <textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Erstelle einen 7-tägigen Bali-Reiseplan…"
              aria-label="Reisewunsch"
              className="w-full resize-none bg-transparent text-body text-content-body outline-none placeholder:text-content-muted"
            />
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={submit}
                disabled={!draft.trim()}
                aria-label="Senden"
                className="grid h-11 w-11 place-items-center rounded-button bg-accent-secondary text-pm-white transition-colors duration-quick ease-brand hover:bg-pm-greenDark disabled:opacity-40"
              >
                <Send size={19} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {PROMPT_SUGGESTIONS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onStart(prompt)}
                className="rounded-chip border border-hairline bg-surface-card px-4 py-2 text-body text-content-body transition-colors duration-quick ease-brand hover:border-accent-secondary"
              >
                {prompt}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onExplore}
            className="mt-7 inline-flex items-center gap-2 text-body font-bold text-content-heading transition-colors duration-quick ease-brand hover:text-accent-primary"
          >
            Schau, wie ich dir helfen kann
            <ArrowRight size={16} strokeWidth={2.4} className="text-accent-primary" />
          </button>
        </div>

        <div className="relative hidden h-[520px] xl:block" aria-hidden="true">
          <div className="absolute right-5 top-0 grid h-[340px] w-[340px] place-items-center rounded-full bg-pm-sandLight shadow-card">
            <img src={logo} alt="" className="h-40 w-40" />
          </div>
          <div className="absolute bottom-0 left-0 grid h-[300px] w-[300px] place-items-center rounded-full bg-pm-sage shadow-card">
            <Plane size={96} strokeWidth={1.5} className="text-pm-cream" />
          </div>
        </div>
      </div>
    </section>
  );
}
