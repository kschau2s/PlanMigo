import type { TripPlan } from "../types/trip";

interface TripCardProps {
  plan: TripPlan;
}

export function TripCard({ plan }: TripCardProps) {
  const days = Array.from(new Set(plan.items.map((item) => item.day))).sort((a, b) => a - b);

  return (
    <div className="rounded-lg border border-pm-sand bg-pm-cream p-4">
      <h2 className="text-xl font-semibold text-pm-orange">{plan.destination}</h2>
      {plan.summary && <p className="mt-1 text-pm-greenDark">{plan.summary}</p>}
      <div className="mt-4 flex flex-col gap-4">
        {days.map((day) => (
          <div key={day}>
            <h3 className="font-medium text-pm-sage">Tag {day}</h3>
            <ul className="mt-2 flex flex-col gap-1">
              {plan.items
                .filter((item) => item.day === day)
                .sort((a, b) => a.order - b.order)
                .map((item) => (
                  <li key={item.id} className="rounded-md bg-pm-sand/40 px-3 py-2 text-sm">
                    <span className="font-semibold uppercase text-pm-greenDark">{item.type}</span>{" "}
                    {JSON.stringify(item.payload)}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
