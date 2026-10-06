import { Compass, MapPin } from "lucide-react";

const inspiration = [
  { title: "Alpine Ruhe", destination: "Zermatt · Schweiz", tag: "Bergidylle", blurb: "Stilles Hotel, Bergbahnen und Panorama mit wenig Trubel." },
  { title: "Mediterrane Tage", destination: "Kreta · Griechenland", tag: "Meer & Küche", blurb: "Baden, Tavernen und kleine Dörfer mit viel Sonne." },
  { title: "Künstlerische Städte", destination: "Lissabon · Portugal", tag: "Stadtleben", blurb: "Farbige Straßen, Musik und gute Cafés in der Altstadt." },
  { title: "Wald & Wellness", destination: "Tirol · Österreich", tag: "Entspannung", blurb: "Waldwege, Sauna und ein ruhiges Wochenend-Feeling." },
  { title: "Strand & Meer", destination: "Mallorca · Spanien", tag: "Sommer", blurb: "Kleine Buchten, Café-Sonnenuntergänge und entspannte Tage." },
  { title: "Kulturtage", destination: "Prag · Tschechien", tag: "Historisch", blurb: "Altstadt, Abendessen und viele schöne Ecken zum Entdecken." },
];

export function InspirationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl rounded-card border-2 border-card bg-surface-card p-6 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-button bg-pm-sand">
            <Compass className="text-accent-primary" size={18} />
          </div>
          <div>
            <p className="pm-eyebrow">Inspiration</p>
            <h1 className="font-serif text-h2 text-content-heading">Reiseideen für deinen nächsten Trip</h1>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {inspiration.map((item) => (
            <article key={item.title} className="rounded-card border border-card bg-surface-page p-4 shadow-soft">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-chip bg-pm-terracotta/10 px-2 py-1 text-[10px] font-semibold text-pm-terracotta">
                  {item.tag}
                </span>
              </div>
              <h2 className="mt-3 font-serif text-cardTitle text-content-heading">{item.title}</h2>
              <p className="mt-2 flex items-center gap-1 text-caption text-content-muted">
                <MapPin size={12} />
                {item.destination}
              </p>
              <p className="mt-3 text-body text-content-body">{item.blurb}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
