interface KeywordPillsProps {
  keywords: string[];
  onRemove?: (keyword: string) => void;
}

export function KeywordPills({ keywords, onRemove }: KeywordPillsProps) {
  if (keywords.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((keyword) =>
        onRemove ? (
          <button
            key={keyword}
            onClick={() => onRemove(keyword)}
            title={`„${keyword}" entfernen`}
            className="group flex items-center gap-1.5 rounded-chip border border-card bg-pm-sand px-3.5 py-1.5 text-caption font-medium text-content-body shadow-soft transition-colors duration-quick ease-brand hover:bg-pm-paper"
          >
            {keyword}
            <span className="text-content-muted group-hover:text-accent-primary">×</span>
          </button>
        ) : (
          <span
            key={keyword}
            className="rounded-chip border border-card bg-pm-sand px-3.5 py-1.5 text-caption font-medium text-content-body"
          >
            {keyword}
          </span>
        ),
      )}
    </div>
  );
}
