import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AnswerDisplayProps {
  answer: string;
  isStreaming: boolean;
}

export function AnswerDisplay({ answer, isStreaming }: AnswerDisplayProps) {
  if (!answer) return null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-7 h-7 rounded-md bg-[var(--primary)] flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="var(--primary-foreground)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="var(--primary-foreground)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="var(--primary-foreground)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="text-sm font-medium text-[var(--muted-foreground)] uppercase tracking-widest">
          Answer
        </h2>
        {isStreaming && (
          <div className="flex items-center gap-1 ml-2">
            <span className="w-1 h-1 rounded-full bg-[var(--primary)] animate-pulse" />
            <span
              className="w-1 h-1 rounded-full bg-[var(--primary)] animate-pulse"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="w-1 h-1 rounded-full bg-[var(--primary)] animate-pulse"
              style={{ animationDelay: "0.3s" }}
            />
          </div>
        )}
      </div>

      {/* Markdown content */}
      <div className="prose-purplexity">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
      </div>

      {/* Streaming cursor */}
      {isStreaming && (
        <span className="inline-block w-0.5 h-5 bg-[var(--primary)] ml-0.5 animate-pulse rounded-full" />
      )}
    </div>
  );
}
