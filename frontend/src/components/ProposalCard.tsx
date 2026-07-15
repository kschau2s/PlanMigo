import { usePhoto } from "../hooks/usePhoto";
import type { TripProposal } from "../types/trip";

interface ProposalCardProps {
  proposal: TripProposal;
  index: number;
  disabled?: boolean;
  onChoose: (index: number) => void;
}

/** One of Migo's 2–3 destination ideas, shown before the full plan is composed. */
export function ProposalCard({ proposal, index, disabled = false, onChoose }: ProposalCardProps) {
  const photo = usePhoto(proposal.image_query ?? proposal.destination);

  return (
    <article className="pm-book-open overflow-hidden rounded-card border border-card bg-surface-card shadow-card">
      {photo.data && (
        <div className="relative">
          <img src={photo.data.url} alt={photo.data.alt} className="h-40 w-full object-cover" />
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
      <div className="p-4">
        <div className="pm-eyebrow">Vorschlag {index + 1}</div>
        <h3 className="mt-1 font-serif text-cardTitle font-bold text-content-heading">
          {proposal.destination}
        </h3>
        <div className="mt-1 text-caption text-content-muted">
          {[
            proposal.timeframe,
            proposal.estimated_budget !== null
              ? `ca. ${new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR",
                  maximumFractionDigits: 0,
                }).format(proposal.estimated_budget)} p.P.`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {proposal.highlights.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1">
            {proposal.highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-2 text-body text-content-body">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-secondary" />
                {highlight}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChoose(index)}
          className="mt-4 rounded-button bg-accent-secondary px-5 py-2.5 text-body font-bold text-pm-white transition-colors duration-quick ease-brand hover:bg-pm-greenDark disabled:opacity-40"
        >
          Diesen Plan ausarbeiten →
        </button>
      </div>
    </article>
  );
}
