interface KeywordPillsProps {
  keywords: string[];
  onRemove: (keyword: string) => void;
}

export function KeywordPills({ keywords, onRemove }: KeywordPillsProps) {
  if (keywords.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((keyword) => (
        <button
          key={keyword}
          onClick={() => onRemove(keyword)}
          className="rounded-full bg-pm-sand px-3 py-1 text-sm text-pm-greenDark hover:opacity-80"
        >
          {keyword} ×
        </button>
      ))}
    </div>
  );
}
