import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "@/hooks/useSearch";
import { useConversations } from "@/hooks/useConversations";
import { SearchBar } from "@/components/SearchBar";
import { AnswerDisplay } from "@/components/AnswerDisplay";
import { SourcesList } from "@/components/SourcesList";
import { FollowUpSuggestions } from "@/components/FollowUpSuggestions";
import { ConversationList } from "@/components/ConversationList";
import {
  LogOut,
  Plus,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";

type View = "home" | "results";

export default function Dashboard() {
  const { user, loading: authLoading, signOut, getAccessToken } = useAuth();
  const navigate = useNavigate();
  const search = useSearch(getAccessToken);
  const { conversations, loading: convLoading, refetch, deleteConversation } =
    useConversations(getAccessToken);

  const [view, setView] = useState<View>("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentQuery, setCurrentQuery] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Scroll to top when new results come in
  useEffect(() => {
    if (search.answer && resultsRef.current) {
      resultsRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [search.answer]);

  const handleSearch = async (query: string) => {
    setCurrentQuery(query);
    setView("results");
    await search.ask(query);
    refetch();
  };

  const handleFollowUp = async (query: string) => {
    if (!search.conversationId) return;
    setCurrentQuery(query);
    await search.followUp(query, search.conversationId);
  };

  const handleNewSearch = () => {
    search.reset();
    setView("home");
    setCurrentQuery("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ── Sidebar ──────────────────────────────── */}
      <aside
        className={`
          ${sidebarOpen ? "w-72" : "w-0"}
          flex-shrink-0 overflow-hidden
          transition-all duration-300 ease-out
          border-r border-[rgba(255,255,255,0.04)]
          bg-[var(--sidebar)]
        `}
      >
        <div className="w-72 h-screen flex flex-col p-4">
          {/* Logo + New */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleNewSearch}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center transition-transform group-hover:scale-105">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="var(--primary-foreground)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 17L12 22L22 17"
                    stroke="var(--primary-foreground)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="font-display text-lg italic text-[var(--foreground)]">
                purplexity
              </span>
            </button>

            <button
              onClick={handleNewSearch}
              className="
                p-2 rounded-lg
                hover:bg-[var(--surface-glass-hover)]
                text-[var(--muted-foreground)] hover:text-[var(--foreground)]
                transition-all duration-200
              "
              title="New Search"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            <ConversationList
              conversations={conversations}
              loading={convLoading}
              onDelete={deleteConversation}
              onSelect={() => {}}
            />
          </div>

          {/* User footer */}
          <div className="pt-4 mt-4 border-t border-[rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--surface-glass)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-xs font-medium text-[var(--muted-foreground)]">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--foreground)] truncate">
                  {user.user_metadata?.full_name || user.email}
                </p>
                {user.user_metadata?.full_name && (
                  <p className="text-xs text-[var(--muted-foreground)] truncate opacity-60">
                    {user.email}
                  </p>
                )}
              </div>
              <button
                onClick={signOut}
                className="
                  p-2 rounded-lg
                  hover:bg-[rgba(239,68,68,0.1)]
                  text-[var(--muted-foreground)] hover:text-red-400
                  transition-all duration-200
                "
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────── */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="
              p-2 rounded-lg
              hover:bg-[var(--surface-glass-hover)]
              text-[var(--muted-foreground)] hover:text-[var(--foreground)]
              transition-all duration-200
            "
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeft className="w-4 h-4" />
            )}
          </button>

          {view === "results" && currentQuery && (
            <span className="text-sm text-[var(--muted-foreground)] truncate ml-2">
              {currentQuery}
            </span>
          )}
        </div>

        {/* Content area */}
        {view === "home" ? (
          /* ── Home / Search View ── */
          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
            {/* Ambient glow */}
            <div
              className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(167,139,250,0.06) 0%, rgba(167,139,250,0.01) 50%, transparent 70%)",
              }}
            />

            <div className="w-full max-w-3xl animate-fade-in relative z-10">
              {/* Hero text */}
              <div className="text-center mb-10">
                <h1 className="font-display text-5xl md:text-6xl italic text-[var(--foreground)] mb-4">
                  What do you want
                  <br />
                  <span className="text-[var(--primary)]">to know?</span>
                </h1>
                <p className="text-[var(--muted-foreground)] text-base max-w-md mx-auto">
                  Search with AI that reads the web and gives you
                  comprehensive, sourced answers.
                </p>
              </div>

              <SearchBar
                onSearch={handleSearch}
                isStreaming={search.isStreaming}
                autoFocus
              />

              {/* Suggestion chips */}
              <div
                className="flex flex-wrap justify-center gap-2 mt-8 animate-fade-in"
                style={{ animationDelay: "0.15s" }}
              >
                {[
                  "What's new in React 19?",
                  "Explain quantum computing",
                  "Best TypeScript practices",
                  "How does RAG work?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSearch(suggestion)}
                    className="
                      px-4 py-2 rounded-full text-xs
                      bg-[var(--surface-glass)] border border-[rgba(255,255,255,0.06)]
                      text-[var(--muted-foreground)]
                      hover:border-[rgba(255,255,255,0.12)] hover:text-[var(--foreground)]
                      hover:bg-[var(--surface-glass-hover)]
                      transition-all duration-200
                    "
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Results View ── */
          <div
            ref={resultsRef}
            className="flex-1 overflow-y-auto"
          >
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
              {/* User query */}
              <div className="animate-fade-in">
                <h1 className="font-display text-2xl md:text-3xl italic text-[var(--foreground)]">
                  {currentQuery}
                </h1>
              </div>

              {/* Error */}
              {search.error && (
                <div className="px-4 py-3 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-red-400 text-sm animate-fade-in">
                  {search.error}
                </div>
              )}

              {/* Loading shimmer */}
              {search.isStreaming && !search.answer && (
                <div className="space-y-4">
                  <div className="h-4 w-3/4 rounded bg-[var(--surface-glass)] animate-shimmer" />
                  <div className="h-4 w-full rounded bg-[var(--surface-glass)] animate-shimmer" style={{ animationDelay: "0.1s" }} />
                  <div className="h-4 w-5/6 rounded bg-[var(--surface-glass)] animate-shimmer" style={{ animationDelay: "0.2s" }} />
                  <div className="h-4 w-2/3 rounded bg-[var(--surface-glass)] animate-shimmer" style={{ animationDelay: "0.3s" }} />
                </div>
              )}

              {/* Answer */}
              <AnswerDisplay
                answer={search.answer}
                isStreaming={search.isStreaming}
              />

              {/* Sources */}
              <SourcesList sources={search.sources} />

              {/* Follow-ups */}
              <FollowUpSuggestions
                followUps={search.followUps}
                onSelect={handleFollowUp}
                disabled={search.isStreaming}
              />

              {/* Follow-up search bar */}
              {!search.isStreaming && search.answer && (
                <div
                  className="pt-4 border-t border-[rgba(255,255,255,0.04)] animate-fade-in"
                  style={{ animationDelay: "0.3s" }}
                >
                  <SearchBar
                    onSearch={handleFollowUp}
                    isStreaming={search.isStreaming}
                    placeholder="Ask a follow-up..."
                    compact
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
