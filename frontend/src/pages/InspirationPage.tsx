import { ArrowRight, Compass, MapPin } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { PlaceImage } from "../components/PlaceImage";

type Category = "Alle" | "Meer" | "Berge" | "Stadt" | "Entspannung";

interface Idea {
  title: string;
  destination: string;
  category: Exclude<Category, "Alle">;
  tag: string;
  blurb: string;
  imageQuery: string;
  keywords: string[];
}

const CATEGORIES: Category[] = ["Alle", "Meer", "Berge", "Stadt", "Entspannung"];

const IDEAS: Idea[] = [
  {
    title: "Alpine Ruhe",
    destination: "Zermatt · Schweiz",
    category: "Berge",
    tag: "Bergidylle",
    blurb: "Stilles Hotel, Bergbahnen und Panorama auf das Matterhorn.",
    imageQuery: "Zermatt Matterhorn",
    keywords: ["Berge", "ruhig", "Zermatt"],
  },
  {
    title: "Mediterrane Tage",
    destination: "Kreta · Griechenland",
    category: "Meer",
    tag: "Meer & Küche",
    blurb: "Baden, Tavernen und kleine Dörfer mit viel Sonne.",
    imageQuery: "Kreta Strand Bucht",
    keywords: ["Strand", "Kulinarik", "Kreta"],
  },
  {
    title: "Bunte Gassen",
    destination: "Lissabon · Portugal",
    category: "Stadt",
    tag: "Stadtleben",
    blurb: "Gelbe Trams, Fado-Musik und Pastéis de Nata in der Altstadt.",
    imageQuery: "Lisbon tram",
    keywords: ["Städtetrip", "Kulinarik", "Lissabon"],
  },
  {
    title: "Wald & Wellness",
    destination: "Tirol · Österreich",
    category: "Entspannung",
    tag: "Entspannung",
    blurb: "Waldwege, Sauna und ein ruhiges Wochenend-Feeling.",
    imageQuery: "Achensee",
    keywords: ["ruhig", "Wellness", "Tirol"],
  },
  {
    title: "Versteckte Buchten",
    destination: "Mallorca · Spanien",
    category: "Meer",
    tag: "Sommer",
    blurb: "Türkisfarbene Calas, Sonnenuntergänge und entspannte Tage.",
    imageQuery: "Mallorca Cala de Sa Calobra",
    keywords: ["Strand", "Sommer", "Mallorca"],
  },
  {
    title: "Goldene Stadt",
    destination: "Prag · Tschechien",
    category: "Stadt",
    tag: "Historisch",
    blurb: "Karlsbrücke im Morgenlicht, Burgviertel und gemütliche Kneipen.",
    imageQuery: "Prag Karlsbrücke",
    keywords: ["Städtetrip", "Kultur", "Prag"],
  },
  {
    title: "Dolomiten-Gipfel",
    destination: "Südtirol · Italien",
    category: "Berge",
    tag: "Abenteuer",
    blurb: "Hüttenwanderungen zwischen bleichen Felstürmen und Almwiesen.",
    imageQuery: "Dolomiten Tre Cime",
    keywords: ["Berge", "Abenteuer", "Südtirol"],
  },
  {
    title: "Amalfi-Träume",
    destination: "Amalfiküste · Italien",
    category: "Meer",
    tag: "Dolce Vita",
    blurb: "Pastellfarbene Dörfer an steilen Klippen über dem Meer.",
    imageQuery: "Positano Amalfi",
    keywords: ["Meer", "Kulinarik", "Amalfiküste"],
  },
  {
    title: "Fjordstille",
    destination: "Norwegen",
    category: "Entspannung",
    tag: "Natur pur",
    blurb: "Spiegelglatte Fjorde, rote Holzhäuser und lange helle Abende.",
    imageQuery: "Geirangerfjord",
    keywords: ["Natur", "ruhig", "Norwegen"],
  },
];

function plannerLink(keywords: string[]): string {
  return `/?keywords=${encodeURIComponent(keywords.join(","))}`;
}

export function InspirationPage() {
  const [category, setCategory] = useState<Category>("Alle");
  const [featured, ...rest] = IDEAS;
  const visible = category === "Alle" ? rest : IDEAS.filter((idea) => idea.category === category);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      {/* Hero */}
      <Link
        to={plannerLink(featured.keywords)}
        className="group relative block h-[340px] overflow-hidden rounded-card shadow-card"
      >
        <PlaceImage
          query={featured.imageQuery}
          width={1920}
          alt={featured.destination}
          className="absolute inset-0 h-full w-full transition-transform duration-base ease-brand group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-pm-espresso to-transparent opacity-90" />
        <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
          <p className="flex items-center gap-2 text-eyebrow font-semibold uppercase tracking-eyebrow text-pm-sandLight">
            <Compass size={14} /> Reiseidee der Woche
          </p>
          <h1 className="mt-2 font-serif text-display font-bold leading-none tracking-display text-pm-cream">
            {featured.title}
          </h1>
          <p className="mt-2 flex items-center gap-1 text-body text-pm-creamWarm">
            <MapPin size={14} /> {featured.destination}
          </p>
          <p className="mt-3 max-w-xl text-body text-pm-cream">{featured.blurb}</p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-button bg-accent-primary px-5 py-2.5 text-caption font-bold text-pm-white shadow-soft transition-opacity duration-quick ease-brand group-hover:opacity-90">
            Diese Reise planen <ArrowRight size={14} />
          </span>
        </div>
      </Link>

      {/* Filter */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-h1 font-bold text-pm-cream">Wohin als Nächstes?</h2>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-chip px-4 py-1.5 text-caption font-semibold transition-colors duration-quick ease-brand ${
                category === c
                  ? "bg-accent-primary text-pm-white shadow-soft"
                  : "bg-surface-card text-content-body hover:text-accent-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((idea) => (
          <Link
            key={idea.title}
            to={plannerLink(idea.keywords)}
            className="group flex flex-col overflow-hidden rounded-card bg-surface-card shadow-card transition-transform duration-base ease-brand hover:-translate-y-1"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <PlaceImage
                query={idea.imageQuery}
                alt={idea.destination}
                className="absolute inset-0 h-full w-full transition-transform duration-base ease-brand group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-pm-espresso via-transparent to-transparent opacity-80" />
              <span className="absolute left-3 top-3 rounded-chip bg-pm-cream px-2.5 py-1 text-[11px] font-bold text-accent-primary shadow-soft">
                {idea.tag}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="font-serif text-cardTitle font-bold text-pm-cream">{idea.title}</h3>
                <p className="mt-0.5 flex items-center gap-1 text-caption text-pm-creamWarm">
                  <MapPin size={12} /> {idea.destination}
                </p>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="flex-1 text-caption leading-relaxed text-content-body">{idea.blurb}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-caption font-bold text-accent-primary">
                Reise planen <ArrowRight size={13} className="transition-transform duration-quick ease-brand group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
