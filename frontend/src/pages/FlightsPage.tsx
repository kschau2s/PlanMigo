import { ArrowRight, Clock, PlaneTakeoff, TrendingDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { PlaceImage } from "../components/PlaceImage";

interface Deal {
  airline: string;
  destination: string;
  country: string;
  price: number;
  duration: string;
  imageQuery: string;
}

interface Airport {
  code: string;
  city: string;
  deals: Deal[];
}

// Beispielangebote — bis ein Flugpreis-Endpunkt pro Abflughafen im Backend existiert.
const AIRPORTS: Airport[] = [
  {
    code: "MUC",
    city: "München",
    deals: [
      { airline: "easyJet", destination: "Palma", country: "Spanien", price: 49, duration: "1h 40m", imageQuery: "Palma de Mallorca" },
      { airline: "Ryanair", destination: "Barcelona", country: "Spanien", price: 59, duration: "2h 10m", imageQuery: "Barcelona Park Güell" },
      { airline: "Austrian", destination: "Wien", country: "Österreich", price: 89, duration: "1h 10m", imageQuery: "Wien Belvedere" },
      { airline: "Eurowings", destination: "Neapel", country: "Italien", price: 64, duration: "1h 50m", imageQuery: "Neapel Vesuv" },
      { airline: "Condor", destination: "Heraklion", country: "Griechenland", price: 119, duration: "2h 45m", imageQuery: "Kreta Strand Bucht" },
      { airline: "Lufthansa", destination: "Lissabon", country: "Portugal", price: 99, duration: "3h 05m", imageQuery: "Lisbon tram" },
    ],
  },
  {
    code: "FRA",
    city: "Frankfurt",
    deals: [
      { airline: "Lufthansa", destination: "Rom", country: "Italien", price: 69, duration: "1h 55m", imageQuery: "Rome Colosseum" },
      { airline: "Ryanair", destination: "Porto", country: "Portugal", price: 54, duration: "2h 35m", imageQuery: "Porto Panorama" },
      { airline: "easyJet", destination: "Berlin", country: "Deutschland", price: 42, duration: "1h 05m", imageQuery: "Berlin Brandenburger Tor" },
      { airline: "Condor", destination: "Málaga", country: "Spanien", price: 79, duration: "2h 50m", imageQuery: "Malaga Panorama" },
      { airline: "Eurowings", destination: "Split", country: "Kroatien", price: 72, duration: "1h 55m", imageQuery: "Split Croatia Riva" },
    ],
  },
  {
    code: "BER",
    city: "Berlin",
    deals: [
      { airline: "easyJet", destination: "Mailand", country: "Italien", price: 58, duration: "1h 50m", imageQuery: "Milano Duomo" },
      { airline: "Ryanair", destination: "Madrid", country: "Spanien", price: 63, duration: "3h 00m", imageQuery: "Madrid Gran Vía" },
      { airline: "Eurowings", destination: "Palma", country: "Spanien", price: 76, duration: "2h 15m", imageQuery: "Palma de Mallorca" },
      { airline: "Norwegian", destination: "Kopenhagen", country: "Dänemark", price: 39, duration: "1h 05m", imageQuery: "Nyhavn Copenhagen" },
      { airline: "Wizz Air", destination: "Budapest", country: "Ungarn", price: 45, duration: "1h 25m", imageQuery: "Budapest Parlament Donau" },
    ],
  },
  {
    code: "HAM",
    city: "Hamburg",
    deals: [
      { airline: "Ryanair", destination: "Dublin", country: "Irland", price: 51, duration: "2h 00m", imageQuery: "Dublin Temple Bar" },
      { airline: "easyJet", destination: "Nizza", country: "Frankreich", price: 68, duration: "2h 05m", imageQuery: "Nice Promenade des Anglais" },
      { airline: "Eurowings", destination: "Stockholm", country: "Schweden", price: 57, duration: "1h 25m", imageQuery: "Stockholm Gamla stan" },
      { airline: "Condor", destination: "Faro", country: "Portugal", price: 89, duration: "3h 20m", imageQuery: "Algarve Ponta da Piedade" },
    ],
  },
];

export function FlightsPage() {
  const [airportCode, setAirportCode] = useState(AIRPORTS[0].code);
  const airport = AIRPORTS.find((a) => a.code === airportCode) ?? AIRPORTS[0];
  const deals = [...airport.deals].sort((a, b) => a.price - b.price);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-card shadow-card">
        <PlaceImage
          query="Flugzeug Fenster Wolken"
          width={1920}
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-pm-espresso to-transparent opacity-90" />
        <div className="relative p-5 md:p-6">
          <p className="flex items-center gap-2 text-eyebrow font-semibold uppercase tracking-eyebrow text-pm-sandLight">
            <PlaneTakeoff size={14} /> Flugangebote
          </p>
          <h1 className="mt-2 max-w-lg font-serif text-display font-bold leading-none tracking-display text-pm-cream">
            Günstig abheben.
          </h1>
          <p className="mt-3 max-w-md text-body text-pm-creamWarm">
            Die aktuell billigsten Flüge ab deinem Heimatflughafen — sortiert nach Preis.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {AIRPORTS.map((a) => (
              <button
                key={a.code}
                type="button"
                onClick={() => setAirportCode(a.code)}
                className={`flex items-center gap-2 rounded-button px-4 py-2 text-caption font-semibold transition-colors duration-quick ease-brand ${
                  a.code === airport.code
                    ? "bg-accent-primary text-pm-white shadow-soft"
                    : "bg-pm-cream text-content-body hover:text-accent-primary"
                }`}
              >
                <span className="font-mono text-[11px] opacity-80">{a.code}</span>
                {a.city}
              </button>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mt-6 font-serif text-h1 font-bold text-pm-cream">
        Ab {airport.city}
      </h2>

      <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {deals.map((deal, i) => (
          <Link
            key={`${airport.code}-${deal.destination}`}
            to={`/?keywords=${encodeURIComponent(deal.destination)}`}
            className="group flex flex-col overflow-hidden rounded-card bg-surface-card shadow-card transition-transform duration-base ease-brand hover:-translate-y-1"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <PlaceImage
                query={deal.imageQuery}
                alt={deal.destination}
                className="absolute inset-0 h-full w-full transition-transform duration-base ease-brand group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-pm-espresso via-transparent to-transparent opacity-80" />
              {i === 0 && (
                <span className="absolute left-3 top-3 flex items-center gap-1 rounded-chip bg-accent-secondary px-2.5 py-1 text-[11px] font-bold text-pm-white shadow-soft">
                  <TrendingDown size={12} /> Günstigster Flug
                </span>
              )}
              <span className="absolute right-3 top-3 rounded-button bg-pm-cream px-3 py-1.5 font-serif text-cardTitle font-bold leading-none text-accent-primary shadow-soft">
                {deal.price} €
              </span>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="font-serif text-cardTitle font-bold text-pm-cream">{deal.destination}</h3>
                <p className="text-caption text-pm-creamWarm">{deal.country}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-caption font-semibold text-content-heading">
                  {airport.code} → {deal.destination}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-content-muted">
                  {deal.airline} · <Clock size={11} /> {deal.duration} · Direkt
                </p>
              </div>
              <span className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-full bg-pm-sand text-accent-primary transition-colors duration-quick ease-brand group-hover:bg-accent-primary group-hover:text-pm-white">
                <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-center text-[11px] text-pm-sand">
        Beispielpreise pro Person, einfache Strecke. Live-Preise folgen.
      </p>
    </div>
  );
}
