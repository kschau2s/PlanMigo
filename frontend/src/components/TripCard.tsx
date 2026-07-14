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
    <li className="flex gap-3 rounded-xl bg-pm-sand/30 p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-pm-cream text-lg shadow-sm">
        {meta.icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          {title}
          <span className="ml-2 rounded-full bg-pm-sage/15 px-2 py-0.5 text-xs font-medium text-pm-sage">
            {meta.label}
          </span>
        </p>
        {description && <p className="mt-0.5 text-sm text-pm-greenDark/80">{description}</p>}
        {details.length > 0 && (
          <p className="mt-1 text-xs text-pm-greenDark/60">{details.join(" · ")}</p>
        )}
      </div>
    </li>
  );
}

export function TripCard({ plan }: TripCardProps) {
  const days = Array.from(new Set(plan.items.map((item) => item.day))).sort((a, b) => a - b);
  const startDate = formatDate(plan.start_date);
  const endDate = formatDate(plan.end_date);

  return (
    <section className="overflow-hidden rounded-2xl border border-pm-sand bg-pm-cream shadow-sm">
      <div className="bg-pm-sage px-5 py-4 text-pm-cream">
        <p className="text-xs font-medium uppercase tracking-wide text-pm-cream/80">
          ✓ Dein Reiseplan
        </p>
        <h2 className="mt-0.5 text-2xl font-extrabold">{plan.destination}</h2>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
          {startDate && endDate && (
            <span className="rounded-full bg-pm-cream/20 px-3 py-1">
              📅 {startDate} – {endDate}
            </span>
          )}
          {plan.budget !== null && (
            <span className="rounded-full bg-pm-cream/20 px-3 py-1">
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

      <div className="p-5">
        {plan.summary && <p className="text-sm leading-relaxed">{plan.summary}</p>}

        <div className="mt-5 flex flex-col gap-6">
          {days.map((day) => (
            <div key={day} className="relative border-l-2 border-pm-sand pl-5">
              <span className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-pm-cream bg-pm-orange" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-pm-orange">
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
