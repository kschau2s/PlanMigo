import { useRef, useState } from "react";
import { ArrowDown, Plane, Send, Star } from "lucide-react";

import logo from "../assets/planmigo-logo.svg";
import { useInView } from "../hooks/useInView";
import { usePhoto } from "../hooks/usePhoto";

interface StartPageProps {
  /** Starts a new chat with the given text as first user message. */
  onStart: (message: string) => void;
}

const PROMPT_SUGGESTIONS = [
  "Erstelle eine neue Reise",
  "Inspiriere mich, wohin ich gehen soll",
  "Plane einen Roadtrip",
  "Plane einen Last-Minute-Ausflug",
];

// Curated inspiration list (no rating system yet — editorial values, see CLAUDE.md).
const INSPIRATIONS = [
  { name: "Bali, Indonesien", tags: "Strand · Kultur · Tempel", query: "bali rice terraces", rating: 4.8 },
  { name: "Amalfiküste, Italien", tags: "Küste · Dolce Vita · Kulinarik", query: "amalfi coast", rating: 4.7 },
  { name: "Kyoto, Japan", tags: "Tempel · Gärten · Tradition", query: "kyoto temple autumn", rating: 4.9 },
  { name: "Lissabon, Portugal", tags: "Städtetrip · Fado · Pastéis", query: "lisbon tram alfama", rating: 4.6 },
  { name: "Santorini, Griechenland", tags: "Inseln · Sonnenuntergänge", query: "santorini caldera", rating: 4.7 },
  { name: "Marrakesch, Marokko", tags: "Souks · Wüste · Orient", query: "marrakech medina", rating: 4.5 },
  { name: "Kapstadt, Südafrika", tags: "Berge · Meer · Safari", query: "cape town table mountain", rating: 4.8 },
  { name: "Norwegische Fjorde", tags: "Natur · Wandern · Panorama", query: "norway fjord", rating: 4.9 },
  { name: "Bangkok, Thailand", tags: "Streetfood · Tempel · Nachtleben", query: "bangkok temple", rating: 4.6 },
];

const REVEAL_DELAYS = ["delay-0", "delay-100", "delay-200"];

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-chip bg-pm-sand px-2.5 py-1 text-caption font-bold text-content-heading">
      <Star size={13} strokeWidth={0} className="fill-pm-orange" />
      {value.toLocaleString("de-DE", { minimumFractionDigits: 1 })}
    </span>
  );
}

function InspirationCard({
  name,
  tags,
  query,
  rating,
  delayClass,
  onStart,
}: (typeof INSPIRATIONS)[number] & { delayClass: string; onStart: (message: string) => void }) {
  const photo = usePhoto(query);
  const { ref, inView } = useInView<HTMLButtonElement>();

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onStart(`Plane mir eine Reise nach ${name}`)}
      className={`group overflow-hidden rounded-card border border-card bg-surface-card text-left shadow-card transition-all duration-base ease-brand hover:-translate-y-1 ${delayClass} ${
        inView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
    >
      <div className="relative h-44 overflow-hidden bg-pm-sandLight">
        {photo.data && (
          <>
            <img
              src={photo.data.url}
              alt={photo.data.alt}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-base ease-brand group-hover:scale-105"
            />
            <span className="absolute bottom-1 right-2 text-caption text-pm-white opacity-80">
              Foto: {photo.data.author} / Unsplash
            </span>
          </>
        )}
        <span className="absolute left-3 top-3">
          <Rating value={rating} />
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-serif text-cardTitle font-bold text-content-heading">{name}</h3>
        <p className="mt-1 text-caption text-content-muted">{tags}</p>
        <p className="mt-3 text-caption font-bold text-accent-secondary">Mit Migo planen →</p>
      </div>
    </button>
  );
}

export function StartPage({ onStart }: StartPageProps) {
  const [draft, setDraft] = useState("");
  const inspirationRef = useRef<HTMLDivElement>(null);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onStart(text);
    setDraft("");
  };

  return (
    <section className="flex-1">
      {/* Hero — füllt den ersten Viewport */}
      <div className="flex min-h-screen items-center bg-gradient-to-b from-pm-creamWarm to-pm-cream">
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
              onClick={() => inspirationRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="mt-7 inline-flex items-center gap-2 text-body font-bold text-content-heading transition-colors duration-quick ease-brand hover:text-accent-primary"
            >
              Lass dich inspirieren
              <ArrowDown size={16} strokeWidth={2.4} className="text-accent-primary" />
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
      </div>

      {/* Inspiration — erscheint dynamisch beim Scrollen */}
      <div ref={inspirationRef} className="mx-auto w-full max-w-[1180px] px-8 pb-8 pt-7">
        <div className="pm-eyebrow">Inspiration</div>
        <h2 className="mt-2 font-serif text-h1 font-bold tracking-headline text-content-heading">
          Beliebte Reiseziele
        </h2>
        <p className="mt-2 max-w-lg text-body text-content-muted">
          Ein Klick, und Migo plant das Ziel mit dir — kuratierte Auswahl der Redaktion.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INSPIRATIONS.map((inspiration, index) => (
            <InspirationCard
              key={inspiration.name}
              {...inspiration}
              delayClass={REVEAL_DELAYS[index % REVEAL_DELAYS.length]}
              onStart={onStart}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
