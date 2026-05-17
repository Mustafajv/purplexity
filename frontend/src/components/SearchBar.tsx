import { Search } from "lucide-react";
import { useState, useRef, useEffect, type FormEvent } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  isStreaming?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
}

export function SearchBar({
  onSearch,
  isStreaming = false,
  placeholder = "Ask anything...",
  autoFocus = false,
  compact = false,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || isStreaming) return;
    onSearch(query.trim());
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`
        group relative w-full
        ${compact ? "max-w-2xl" : "max-w-3xl"}
      `}
    >
      <div
        className={`
          relative flex items-center gap-3
          bg-[var(--surface-glass)] backdrop-blur-sm
          border border-[var(--border)]
          rounded-lg
          transition-all duration-300 ease-out
          hover:border-[var(--edge-strong)]
          focus-within:border-[var(--primary)] focus-within:shadow-[0_0_0_1px_var(--primary),0_18px_60px_-36px_var(--glow-strong)]
          ${compact ? "px-4 py-3" : "px-6 py-4"}
        `}
      >
        <Search
          className={`
            text-[var(--muted-foreground)] flex-shrink-0
            transition-colors duration-200
            group-focus-within:text-[var(--primary)]
            ${compact ? "w-4 h-4" : "w-5 h-5"}
          `}
        />
        <textarea
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          rows={1}
          disabled={isStreaming}
          className={`
            flex-1 bg-transparent resize-none
            !border-none !outline-none !ring-0 !shadow-none
            focus:!outline-none focus-visible:!outline-none focus:!ring-0
            text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]
            disabled:opacity-50
            ${compact ? "text-sm" : "text-base"}
          `}
          style={{ maxHeight: "120px", minHeight: compact ? "20px" : "24px" }}
        />

        <button
          type="submit"
          aria-label={compact ? "Submit follow-up" : "Submit search"}
          disabled={!query.trim() || isStreaming}
          className={`
            flex-shrink-0 flex items-center justify-center
            rounded-md
            bg-[var(--primary)] text-[var(--primary-foreground)]
            transition-all duration-200
            cursor-pointer
            hover:opacity-90 hover:scale-105
            disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed
            active:scale-95
            ${compact ? "w-8 h-8" : "w-10 h-10"}
          `}
        >
          {isStreaming ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              width={compact ? 14 : 16}
              height={compact ? 14 : 16}
              viewBox="0 0 16 16"
              fill="none"
              className="rotate-[-90deg]"
            >
              <path
                d="M8 2L14 8L8 14M14 8H2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Subtle glow underneath */}
      {!compact && (
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-px opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, var(--glow) 35%, var(--accent-warm) 55%, transparent 100%)",
          }}
        />
      )}
    </form>
  );
}
