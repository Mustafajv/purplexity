import { ExternalLink, Globe } from "lucide-react";

interface Source {
  url: string;
  title: string;
}

interface SourcesListProps {
  sources: Source[];
}

export function SourcesList({ sources }: SourcesListProps) {
  if (sources.length === 0) return null;

  return (
    <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[var(--surface-glass)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
          <Globe className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
        </div>
        <h2 className="text-sm font-medium text-[var(--muted-foreground)] uppercase tracking-widest">
          Sources
        </h2>
        <span className="text-xs text-[var(--muted-foreground)] opacity-60">
          {sources.length}
        </span>
      </div>

      {/* Source chips */}
      <div className="flex flex-wrap gap-2">
        {sources.map((source, i) => {
          let domain = "";
          try {
            domain = new URL(source.url).hostname.replace("www.", "");
          } catch {
            domain = source.url;
          }

          return (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="
                group/source flex items-center gap-2 
                px-3 py-2 rounded-xl
                bg-[var(--surface-glass)] border border-[rgba(255,255,255,0.06)]
                hover:border-[rgba(255,255,255,0.12)] hover:bg-[var(--surface-glass-hover)]
                transition-all duration-200
                max-w-[280px]
              "
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                alt=""
                className="w-4 h-4 rounded-sm flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-xs text-[var(--muted-foreground)] truncate group-hover/source:text-[var(--foreground)] transition-colors">
                {source.title || domain}
              </span>
              <ExternalLink className="w-3 h-3 text-[var(--muted-foreground)] opacity-0 group-hover/source:opacity-60 transition-opacity flex-shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
