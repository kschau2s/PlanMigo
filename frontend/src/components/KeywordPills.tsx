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
            className="group flex items-center gap-1.5 rounded-full bg-pm-sand px-3.5 py-1.5 text-sm font-medium text-pm-greenDark shadow-sm transition hover:bg-pm-sand/70"
          >
            {keyword}
            <span className="text-pm-greenDark/60 group-hover:text-pm-orange">×</span>
          </button>
        ) : (
          <span
            key={keyword}
            className="rounded-full bg-pm-sand px-3.5 py-1.5 text-sm font-medium text-pm-greenDark"
          >
            {keyword}
          </span>
        ),
      )}
    </div>
  );
}
