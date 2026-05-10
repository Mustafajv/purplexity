import { Sparkles } from "lucide-react";

interface FollowUpSuggestionsProps {
  followUps: string[];
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function FollowUpSuggestions({
  followUps,
  onSelect,
  disabled = false,
}: FollowUpSuggestionsProps) {
  if (followUps.length === 0) return null;

  return (
    <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[var(--surface-glass)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
        </div>
        <h2 className="text-sm font-medium text-[var(--muted-foreground)] uppercase tracking-widest">
          Follow Up
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {followUps.map((q, i) => (
          <button
            key={i}
            onClick={() => onSelect(q)}
            disabled={disabled}
            className="
              group/fu text-left px-4 py-3 rounded-xl
              bg-[var(--surface-glass)] border border-[rgba(255,255,255,0.06)]
              hover:border-[var(--primary)] hover:bg-[rgba(167,139,250,0.05)]
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              text-sm text-[var(--muted-foreground)]
              hover:text-[var(--foreground)]
            "
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <span className="flex items-center gap-2.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                className="flex-shrink-0 opacity-40 group-hover/fu:opacity-80 transition-opacity text-[var(--primary)]"
              >
                <path
                  d="M8 2L14 8L8 14M14 8H2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {q}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
