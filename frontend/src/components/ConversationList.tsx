import { MessageSquare, Trash2 } from "lucide-react";
import type { Conversation } from "@/hooks/useConversations";

function stripTags(text: string): string {
  return text
    .replace(/<\/?ANSWER>/g, "")
    .replace(/<\/?FOLLOW_UPS>/g, "")
    .replace(/<\/?question>/g, "")
    .trim();
}

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  onDelete: (id: string) => void;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationList({
  conversations,
  loading,
  onDelete,
  onSelect,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-[var(--surface-glass)] animate-shimmer"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-widest mb-3 px-1">
        Recent
      </h3>
      {conversations.map((conv, i) => {
        const lastMessage = conv.messages?.[0];
        const rawPreview = lastMessage?.content?.slice(0, 120) ?? "";
        const preview = stripTags(rawPreview).slice(0, 80);

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className="
              group/conv w-full text-left
              flex items-start gap-3 px-3.5 py-3 rounded-xl
              hover:bg-[var(--surface-glass-hover)]
              transition-all duration-200
              animate-fade-in
            "
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <MessageSquare className="w-4 h-4 text-[var(--muted-foreground)] mt-0.5 flex-shrink-0 opacity-50" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--foreground)] truncate font-medium">
                {conv.title || "Untitled"}
              </p>
              {preview && (
                <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5 opacity-60">
                  {preview}
                </p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              className="
                opacity-0 group-hover/conv:opacity-100
                p-1.5 rounded-lg
                hover:bg-[rgba(239,68,68,0.1)] 
                text-[var(--muted-foreground)] hover:text-red-400
                transition-all duration-200
              "
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </button>
        );
      })}
    </div>
  );
}
