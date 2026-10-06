import { PlaneTakeoff } from "lucide-react";
import { useState } from "react";

const flightDeals: Record<string, { airline: string; route: string; price: number; duration: string }[]> = {
  MUC: [
    { airline: "easyJet", route: "München → Palma", price: 49, duration: "1h 40m" },
    { airline: "Ryanair", route: "München → Barcelona", price: 59, duration: "2h 10m" },
    { airline: "Austrian", route: "München → Wien", price: 89, duration: "1h 10m" },
  ],
  FRA: [
    { airline: "Lufthansa", route: "Frankfurt → Rom", price: 69, duration: "1h 55m" },
    { airline: "Ryanair", route: "Frankfurt → Porto", price: 54, duration: "2h 35m" },
    { airline: "easyJet", route: "Frankfurt → Berlin", price: 42, duration: "1h 25m" },
  ],
  BER: [
    { airline: "easyJet", route: "Berlin → Mailand", price: 58, duration: "1h 50m" },
    { airline: "Ryanair", route: "Berlin → Madrid", price: 63, duration: "3h 00m" },
    { airline: "Eurowings", route: "Berlin → Palma", price: 76, duration: "2h 15m" },
  ],
};

export function FlightsPage() {
  const [airport, setAirport] = useState("MUC");
  const deals = flightDeals[airport.toUpperCase()] ?? flightDeals.MUC;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-card border-2 border-card bg-surface-card p-6 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-button bg-pm-sand">
            <PlaneTakeoff className="text-accent-primary" size={18} />
          </div>
          <div>
            <p className="pm-eyebrow">Flüge</p>
            <h1 className="font-serif text-h2 text-content-heading">Billigste Flugangebote</h1>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <input
            value={airport}
            onChange={(e) => setAirport(e.target.value.toUpperCase())}
            placeholder="Flughafen"
            className="flex-1 rounded-button border border-card bg-surface-page px-3 py-2.5 text-caption text-content-body outline-none placeholder:text-content-muted focus:border-accent-secondary"
          />
          <button
            type="button"
            onClick={() => setAirport((prev) => prev || "MUC")}
            className="rounded-button bg-accent-primary px-4 py-2.5 text-caption font-semibold text-pm-white"
          >
            Suchen
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {deals.map((deal) => (
            <div key={`${deal.airline}-${deal.route}`} className="flex items-center justify-between gap-3 rounded-card border border-card bg-surface-page p-3 shadow-soft">
              <div className="min-w-0">
                <p className="truncate font-serif text-body font-bold text-content-heading">{deal.route}</p>
                <p className="mt-1 text-caption text-content-muted">{deal.airline} · {deal.duration}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-caption font-semibold text-accent-primary">ab {deal.price} €</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
