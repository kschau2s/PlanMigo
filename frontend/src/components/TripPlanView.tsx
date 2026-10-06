import {
  BedDouble,
  Calendar,
  Check,
  Compass,
  Info,
  MapPinned,
  Plane,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

import { PlaceImage } from "./PlaceImage";
import { destinationQuery } from "../lib/images";
import type { TripItem, TripItemType, TripPlan } from "../types/trip";

const ITEM_META: Record<TripItemType, { icon: typeof Plane; label: string }> = {
  flight: { icon: Plane, label: "Anreise" },
  stay: { icon: BedDouble, label: "Unterkunft" },
  activity: { icon: Compass, label: "Aktivität" },
  restaurant: { icon: UtensilsCrossed, label: "Restaurant" },
};

const TABS = [
  { key: "plan", label: "Plan", icon: Calendar },
  { key: "stay", label: "Unterkunft", icon: BedDouble },
  { key: "experience", label: "Erlebnisse", icon: Compass },
  { key: "info", label: "Infos", icon: Info },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}

function tripLength(plan: TripPlan): string | null {
  if (plan.start_date && plan.end_date) {
    const start = new Date(plan.start_date);
    const end = new Date(plan.end_date);
    const ms = end.getTime() - start.getTime();
    if (!Number.isNaN(ms) && ms >= 0) {
      const days = Math.round(ms / 86_400_000) + 1;
      const nights = Math.max(days - 1, 0);
      return `${days} Tage · ${nights} Nächte`;
    }
  }
  const dayCount = new Set(plan.items.map((item) => item.day)).size;
  return dayCount > 0 ? `${dayCount} Tage` : null;
}

// Suchbegriff je Eintragstyp — Aktivitätstitel allein finden auf Commons selten passende Fotos.
const ITEM_IMAGE_TERM: Record<TripItemType, string> = {
  flight: "Flughafen",
  stay: "Hotel",
  activity: "Sehenswürdigkeit",
  restaurant: "Restaurant",
};

function TripItemRow({ item, imageQuery, imageIndex }: { item: TripItem; imageQuery: string; imageIndex: number }) {
  const meta = ITEM_META[item.type];
  const Icon = meta.icon;
  const title = asText(item.payload.title) ?? meta.label;
  const description = asText(item.payload.description);
  const details = [
    asText(item.payload.time),
    asText(item.payload.location),
    asText(item.payload.price),
  ].filter((detail): detail is string => detail !== null);

  return (
    <li className="flex gap-3 overflow-hidden rounded-card bg-pm-sand shadow-soft">
      <PlaceImage query={imageQuery} index={imageIndex} width={330} className="h-[80px] w-[80px] shrink-0" />
      <div className="min-w-0 flex-1 py-2 pr-3">
        <p className="flex flex-wrap items-center gap-1.5 text-caption font-semibold text-content-heading">
          {title}
          <span className="flex items-center gap-1 rounded-chip bg-surface-card px-1.5 py-0.5 text-[11px] font-medium text-accent-secondary">
            <Icon size={11} strokeWidth={2.25} />
            {meta.label}
          </span>
        </p>
        {description && (
          <p className="mt-0.5 text-caption text-content-body">{description}</p>
        )}
        {details.length > 0 && (
          <p className="mt-1 text-[11px] text-content-muted">{details.join(" · ")}</p>
        )}
      </div>
    </li>
  );
}

function DayTimeline({ plan, items }: { plan: TripPlan; items: TripItem[] }) {
  const days = Array.from(new Set(items.map((item) => item.day))).sort((a, b) => a - b);

  if (days.length === 0) {
    return <p className="text-caption text-content-muted">Für diese Kategorie ist nichts geplant.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {days.map((day) => (
        <div key={day} className="relative border-l-2 border-hairline pl-4">
          <span className="absolute -left-[7px] top-0 h-3.5 w-3.5 rounded-full border-2 border-surface-card bg-accent-primary" />
          <h3 className="text-[11px] font-bold uppercase tracking-label text-accent-primary">
            Tag {day}
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {items
              .filter((item) => item.day === day)
              .sort((a, b) => a.order - b.order)
              .map((item) => (
                <TripItemRow
                  key={item.id}
                  item={item}
                  imageQuery={`${plan.destination} ${ITEM_IMAGE_TERM[item.type]}`}
                  imageIndex={(item.day + item.order) % 4}
                />
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function InfoTab({ plan }: { plan: TripPlan }) {
  const stats = [
    { icon: Plane, label: "Anreise", value: plan.items.filter((i) => i.type === "flight").length },
    { icon: BedDouble, label: "Nächte", value: plan.items.filter((i) => i.type === "stay").length },
    { icon: Compass, label: "Aktivitäten", value: plan.items.filter((i) => i.type === "activity").length },
    { icon: UtensilsCrossed, label: "Restaurants", value: plan.items.filter((i) => i.type === "restaurant").length },
  ];
  const startDate = formatDate(plan.start_date);
  const endDate = formatDate(plan.end_date);

  return (
    <div className="flex flex-col gap-4">
      {plan.summary && (
        <p className="text-caption leading-relaxed text-content-body">{plan.summary}</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {stats.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-card border border-card bg-surface-card p-3 text-center shadow-soft"
          >
            <Icon size={16} strokeWidth={2} className="text-accent-secondary" />
            <span className="font-serif text-cardTitle font-bold text-content-heading">{value}</span>
            <span className="text-[11px] text-content-muted">{label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-card bg-surface-card p-3 shadow-soft">
        <dl className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 border-b border-hairline pb-2.5">
            <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-content-muted">
              <MapPinned size={14} /> Ziel
            </dt>
            <dd className="text-caption font-medium text-content-heading">{plan.destination}</dd>
          </div>
          {startDate && endDate && (
            <div className="flex items-center justify-between gap-2 border-b border-hairline pb-2.5">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-content-muted">
                <Calendar size={14} /> Zeitraum
              </dt>
              <dd className="text-caption font-medium text-content-heading">
                {startDate} – {endDate}
              </dd>
            </div>
          )}
          {plan.budget !== null && (
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-[11px] font-semibold text-content-muted">
                <Wallet size={14} /> Budget
              </dt>
              <dd className="text-caption font-medium text-content-heading">
                ca.{" "}
                {new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR",
                  maximumFractionDigits: 0,
                }).format(plan.budget)}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

export function TripPlanView({ plan }: { plan: TripPlan }) {
  const [activeTab, setActiveTab] = useState<TabKey>("plan");

  const filteredItems = useMemo(() => {
    if (activeTab === "stay") return plan.items.filter((item) => item.type === "stay");
    if (activeTab === "experience") {
      return plan.items.filter((item) => item.type === "activity" || item.type === "restaurant");
    }
    return plan.items;
  }, [plan, activeTab]);

  const length = tripLength(plan);
  const galleryIndexes = [1, 2];

  return (
    <div>
      <div className="relative h-44 w-full overflow-hidden">
        <PlaceImage
          query={destinationQuery(plan.destination)}
          alt={plan.destination}
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-pm-espresso to-transparent opacity-90" />
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-chip bg-pm-cream px-2 py-1 text-[11px] font-bold text-accent-secondary shadow-soft">
          <Check size={12} strokeWidth={3} /> Geplant
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3">
          <p className="pm-eyebrow text-content-onInverseMuted">✓ Dein Reiseplan</p>
          <h2 className="font-serif text-cardTitle font-bold text-content-onInverse">
            {plan.destination}
          </h2>
          {length && <p className="text-caption font-medium text-content-onInverseMuted">{length}</p>}
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-2">
          {galleryIndexes.map((index) => (
            <PlaceImage
              key={index}
              query={destinationQuery(plan.destination)}
              index={index}
              width={330}
              className="h-[80px] w-full rounded-card shadow-soft"
            />
          ))}
        </div>

        <nav className="mt-4 flex gap-1 overflow-x-auto rounded-button border border-card bg-surface-card p-1 shadow-soft">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-button px-2 py-2 text-[11px] font-semibold transition-colors duration-quick ease-brand ${
                activeTab === key
                  ? "bg-accent-primary text-pm-white"
                  : "text-content-muted hover:text-accent-primary"
              }`}
            >
              <Icon size={13} strokeWidth={2.25} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-4">
          {activeTab === "info" ? (
            <InfoTab plan={plan} />
          ) : (
            <DayTimeline plan={plan} items={filteredItems} />
          )}
        </div>
      </div>
    </div>
  );
}
