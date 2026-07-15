import { usePhoto } from "../hooks/usePhoto";
import type { TripItem, TripItemType, TripPlan } from "../types/trip";

interface TripCardProps {
  plan: TripPlan;
}

const ITEM_META: Record<TripItemType, { icon: string; label: string }> = {
  flight: { icon: "✈️", label: "Anreise" },
  stay: { icon: "🏨", label: "Unterkunft" },
  activity: { icon: "🥾", label: "Aktivität" },
  restaurant: { icon: "🍽️", label: "Restaurant" },
};

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

function TripItemRow({ item }: { item: TripItem }) {
  const meta = ITEM_META[item.type];
  const title = asText(item.payload.title) ?? meta.label;
  const description = asText(item.payload.description);
  const details = [
    asText(item.payload.time),
    asText(item.payload.location),
    asText(item.payload.price),
  ].filter((detail): detail is string => detail !== null);

  return (
    <li className="flex gap-3 rounded-card bg-pm-sand px-3 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-surface-card text-lg shadow-soft">
        {meta.icon}
      </span>
      <div className="min-w-0">
        <p className="text-body font-semibold text-content-heading">
          {title}
          <span className="ml-2 rounded-chip bg-surface-card px-2 py-0.5 text-caption font-medium text-accent-secondary">
            {meta.label}
          </span>
        </p>
        {description && <p className="mt-0.5 text-body text-content-body">{description}</p>}
        {details.length > 0 && (
          <p className="mt-1 text-caption text-content-muted">{details.join(" · ")}</p>
        )}
      </div>
    </li>
  );
}

export function TripCard({ plan }: TripCardProps) {
  const days = Array.from(new Set(plan.items.map((item) => item.day))).sort((a, b) => a - b);
  const startDate = formatDate(plan.start_date);
  const endDate = formatDate(plan.end_date);
  const photo = usePhoto(plan.destination);

  return (
    <section className="overflow-hidden rounded-card border border-card bg-surface-card shadow-card">
      {photo.data && (
        <div className="relative">
          <img
            src={photo.data.url}
            alt={photo.data.alt}
            loading="lazy"
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
      <div className="bg-surface-inverse px-5 py-4 text-content-onInverse">
        <p className="pm-eyebrow text-content-onInverseMuted">✓ Dein Reiseplan</p>
        <h2 className="mt-0.5 font-serif text-h2 text-content-onInverse">{plan.destination}</h2>
        <div className="mt-2 flex flex-wrap gap-2 text-caption font-medium">
          {startDate && endDate && (
            <span className="rounded-chip bg-pm-cream px-3 py-1 text-content-heading">
              📅 {startDate} – {endDate}
            </span>
          )}
          {plan.budget !== null && (
            <span className="rounded-chip bg-pm-cream px-3 py-1 text-content-heading">
              💶 ca.{" "}
              {new Intl.NumberFormat("de-DE", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              }).format(plan.budget)}
            </span>
          )}
        </div>
      </div>

      <div className="p-card">
        {plan.summary && <p className="text-body leading-relaxed text-content-body">{plan.summary}</p>}

        <div className="mt-5 flex flex-col gap-6">
          {days.map((day) => (
            <div key={day} className="relative border-l-2 border-hairline pl-5">
              <span className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-surface-card bg-accent-primary" />
              <h3 className="text-caption font-bold uppercase tracking-label text-accent-primary">
                Tag {day}
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {plan.items
                  .filter((item) => item.day === day)
                  .sort((a, b) => a.order - b.order)
                  .map((item) => (
                    <TripItemRow key={item.id} item={item} />
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
