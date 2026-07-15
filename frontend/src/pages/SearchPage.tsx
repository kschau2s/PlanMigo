import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Chip } from "../components/Chat";
import { usePhoto } from "../hooks/usePhoto";

interface SearchPageProps {
  /** Starts a new chat seeded with these keywords (Migo asks the first question). */
  onPlan: (keywords: string[]) => void;
}

const SEARCH_CHIPS = [
  "Strand",
  "Kultur",
  "Entspannung",
  "Kulinarik",
  "Abenteuer",
  "Berge",
  "Städtetrip",
  "Familie",
];

export function SearchPage({ onPlan }: SearchPageProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  // Debounced so typing doesn't fire an Unsplash request per keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => clearTimeout(timer);
  }, [query]);

  const keywords = [...(query.trim() ? [query.trim()] : []), ...selected];
  const photo = usePhoto(debouncedQuery || selected[0] || null);

  const toggle = (chip: string) =>
    setSelected((s) => (s.includes(chip) ? s.filter((c) => c !== chip) : [...s, chip]));

  const submit = () => {
    if (keywords.length > 0) onPlan(keywords);
  };

  return (
    <section className="w-full max-w-[860px] px-7 py-7">
      <div className="pm-eyebrow">Suche</div>
      <h1 className="mt-2 font-serif text-h1 font-bold tracking-headline text-content-heading">
        Wohin soll es gehen?
      </h1>

      <div className="mt-6 flex items-center gap-3 rounded-chip border border-card bg-surface-card px-5 py-3.5 shadow-card">
        <Search size={20} strokeWidth={2} className="shrink-0 text-content-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Reiseziel, Region oder Schlagwort — z. B. Bali, Strand, Kultur…"
          aria-label="Suche"
          className="flex-1 bg-transparent text-body text-content-body outline-none placeholder:text-content-muted"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SEARCH_CHIPS.map((chip) => (
          <Chip key={chip} label={chip} active={selected.includes(chip)} onClick={() => toggle(chip)} />
        ))}
      </div>

      <div className="mt-6 rounded-card border border-card bg-surface-card p-card shadow-soft">
        {keywords.length > 0 ? (
          <>
            <div className="pm-eyebrow">Deine Auswahl</div>
            {photo.data && (
              <div className="relative mt-3 overflow-hidden rounded-image">
                <img
                  src={photo.data.url}
                  alt={photo.data.alt}
                  className="h-44 w-full object-cover"
                />
                <a
                  href={photo.data.author_url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-1 right-2 text-caption text-pm-white opacity-80 hover:opacity-100"
                >
                  Foto: {photo.data.author} / Unsplash
                </a>
              </div>
            )}
            <p className="mt-3 text-cardTitle font-bold text-content-heading">
              {keywords.join(" · ")}
            </p>
            <p className="mt-1 text-caption text-content-muted">
              Migo stellt dir dazu ein paar Rückfragen und baut daraus deinen Reiseplan.
            </p>
            <button
              type="button"
              onClick={submit}
              className="mt-5 rounded-button bg-accent-secondary px-7 py-3 text-body font-bold text-pm-white transition-colors duration-quick ease-brand hover:bg-pm-greenDark"
            >
              Mit PlanMigo planen →
            </button>
          </>
        ) : (
          <p className="text-body text-content-muted">
            Gib ein Reiseziel ein oder wähle Schlagwörter — dann startet Migo die Planung mit dir.
          </p>
        )}
      </div>
    </section>
  );
}
