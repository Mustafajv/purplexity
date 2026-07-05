import { useState, useCallback, useRef } from "react";
import { BACKEND_URL } from "@/lib/config";

interface Source {
  url: string;
  title: string;
  faviconUrl?: string;
}

interface ConversationMessage {
  id?: number;
  content: string;
  role: string;
  createdAt: string;
  sources?: Source[];
}

export interface SearchMessage {
  id: string;
  role: "User" | "Assistant";
  content: string;
  sources: Source[];
  createdAt?: string;
  isStreaming?: boolean;
}

export interface LoadedConversation {
  id: string;
  title: string | null;
  slug: string;
  messages: ConversationMessage[];
}

interface UseSearchResult {
  answer: string;
  sources: Source[];
  followUps: string[];
  messages: SearchMessage[];
  isStreaming: boolean;
  conversationId: string | null;
  error: string | null;
  ask: (query: string) => Promise<void>;
  followUp: (query: string, convId: string) => Promise<void>;
  loadConversation: (convId: string) => Promise<LoadedConversation | null>;
  reset: () => void;
}

function parseResponse(raw: string): {
  answer: string;
  followUps: string[];
} {
  // Extract follow-up questions first (before stripping tags)
  const followUps: string[] = [];
  const questionRegex = /<question>([\s\S]*?)<\/question>/g;
  let match;
  while ((match = questionRegex.exec(raw)) !== null) {
    followUps.push(match[1].trim());
  }

  // Extract answer — try matched tags first, then progressively strip
  let answer: string;
  const answerMatch = raw.match(/<ANSWER>([\s\S]*?)<\/ANSWER>/);
  if (answerMatch) {
    answer = answerMatch[1].trim();
  } else {
    // During streaming: strip all XML tags progressively so they never show
    answer = raw
      .replace(/<\/?ANSWER>/g, "")
      .replace(/<FOLLOW_UPS>[\s\S]*/g, "") // remove follow-ups section and everything after
      .replace(/<\/?question>/g, "")
      .trim();
  }

  return { answer, followUps };
}

function parseSources(raw: string): { textWithoutSources: string; sources: Source[] } {
  const parts = raw.split("\nSOURCES\n");
  if (parts.length >= 3) {
    try {
      const sources = normalizeSources(JSON.parse(parts[1]));
      return { textWithoutSources: parts[0], sources };
    } catch {
      return { textWithoutSources: raw, sources: [] };
    }
  }
  return { textWithoutSources: raw, sources: [] };
}

function getFaviconUrl(url: string) {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
  } catch {
    return "";
  }
}

function normalizeSources(value: unknown): Source[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((source): source is Partial<Source> & { url: string } =>
      typeof source?.url === "string" && source.url.length > 0,
    )
    .map((source) => ({
      url: source.url,
      title: typeof source.title === "string" && source.title.length > 0
        ? source.title
        : source.url,
      faviconUrl: typeof source.faviconUrl === "string" && source.faviconUrl.length > 0
        ? source.faviconUrl
        : getFaviconUrl(source.url),
    }));
}

function toSearchMessages(messages: ConversationMessage[]): SearchMessage[] {
  return messages.map((message, index) => {
    const parsed =
      message.role === "Assistant"
        ? parseResponse(message.content)
        : { answer: message.content };

    return {
      id: message.id?.toString() ?? `${message.role}-${index}`,
      role: message.role === "Assistant" ? "Assistant" : "User",
      content: parsed.answer,
      sources: normalizeSources(message.sources),
      createdAt: message.createdAt,
    };
  });
}

export function useSearch(getAccessToken: () => Promise<string | null>): UseSearchResult {
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [messages, setMessages] = useState<SearchMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchConversation = useCallback(
    async (convId: string) => {
      const token = await getAccessToken();
      if (!token) {
        setError("Please sign in to load conversations");
        return null;
      }

      const response = await fetch(`${BACKEND_URL}/conversation/${convId}`, {
        headers: { Authorization: token },
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      const conversation = data.conversation as LoadedConversation | undefined;
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      return conversation;
    },
    [getAccessToken],
  );

  const hydrateConversation = useCallback((conversation: LoadedConversation) => {
    const latestAssistant = [...conversation.messages]
      .reverse()
      .find((message) => message.role === "Assistant");

    if (latestAssistant) {
      const parsed = parseResponse(latestAssistant.content);
      const latestSources = normalizeSources(latestAssistant.sources);
      setAnswer(parsed.answer);
      setFollowUps(parsed.followUps);
      setSources(latestSources);
    } else {
      setAnswer("");
      setFollowUps([]);
      setSources([]);
    }

    setMessages(toSearchMessages(conversation.messages));
    setConversationId(conversation.id);
  }, []);

  const streamResponse = useCallback(
    async (
      url: string,
      body: object,
      query: string,
      mode: "replace" | "append",
    ) => {
      setIsStreaming(true);
      setError(null);
      setAnswer("");
      setSources([]);
      setFollowUps([]);

      try {
        const token = await getAccessToken();
        if (!token) {
          setError("Please sign in to search");
          setIsStreaming(false);
          return;
        }

        abortRef.current = new AbortController();
        const timestamp = Date.now();
        const assistantMessageId = `local-assistant-${timestamp}`;
        const nextMessages: SearchMessage[] = [
          {
            id: `local-user-${timestamp}`,
            role: "User",
            content: query,
            sources: [],
            isStreaming: false,
          },
          {
            id: assistantMessageId,
            role: "Assistant",
            content: "",
            sources: [],
            isStreaming: true,
          },
        ];

        setMessages((prev) =>
          mode === "replace" ? nextMessages : [...prev, ...nextMessages],
        );

        const response = await fetch(`${BACKEND_URL}${url}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullText = "";
        let streamedConversationId: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          // Extract conversationId from first line if present
          if (fullText.startsWith("CONVERSATION_ID:")) {
            const newlineIdx = fullText.indexOf("\n");
            if (newlineIdx !== -1) {
              const id = fullText.slice("CONVERSATION_ID:".length, newlineIdx);
              streamedConversationId = id;
              setConversationId(id);
              fullText = fullText.slice(newlineIdx + 1);
            }
          }

          // Show streaming text (before SOURCES delimiter)
          const displayText = fullText.split("\nSOURCES\n")[0];
          const parsed = parseResponse(displayText);
          setAnswer(parsed.answer);
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: parsed.answer, isStreaming: true }
                : message,
            ),
          );
          if (parsed.followUps.length > 0) {
            setFollowUps(parsed.followUps);
          }
        }

        // Final parse with sources
        const { textWithoutSources, sources: parsedSources } = parseSources(fullText);
        const finalParsed = parseResponse(textWithoutSources);
        setAnswer(finalParsed.answer);
        setFollowUps(finalParsed.followUps);
        setSources(parsedSources);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: finalParsed.answer,
                  sources: parsedSources,
                  isStreaming: false,
                }
              : message,
          ),
        );

        const refreshConversationId =
          streamedConversationId ??
          (typeof (body as { conversationId?: unknown }).conversationId === "string"
            ? (body as { conversationId: string }).conversationId
            : null);

        if (refreshConversationId) {
          const conversation = await fetchConversation(refreshConversationId);
          if (conversation) {
            hydrateConversation(conversation);
          }
        }
      } catch (e: any) {
        if (e.name !== "AbortError") {
          setError(e.message || "Something went wrong");
        }
        setMessages((prev) =>
          prev.map((message) =>
            message.isStreaming ? { ...message, isStreaming: false } : message,
          ),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [fetchConversation, getAccessToken, hydrateConversation],
  );

  const ask = useCallback(
    async (query: string) => {
      await streamResponse("/purplexity_ask", { query }, query, "replace");
    },
    [streamResponse],
  );

  const followUp = useCallback(
    async (query: string, convId: string) => {
      await streamResponse(
        "/purplexity_ask/follow_up",
        {
          query,
          conversationId: convId,
        },
        query,
        "append",
      );
    },
    [streamResponse],
  );

  const loadConversation = useCallback(
    async (convId: string) => {
      abortRef.current?.abort();
      setIsStreaming(false);
      setError(null);
      setAnswer("");
      setSources([]);
      setFollowUps([]);
      setMessages([]);

      try {
        const conversation = await fetchConversation(convId);
        if (!conversation) {
          return null;
        }

        hydrateConversation(conversation);
        return conversation;
      } catch (e: any) {
        setError(e.message || "Failed to load conversation");
        return null;
      }
    },
    [fetchConversation, hydrateConversation],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setAnswer("");
    setSources([]);
    setFollowUps([]);
    setMessages([]);
    setIsStreaming(false);
    setConversationId(null);
    setError(null);
  }, []);

  return {
    answer,
    sources,
    followUps,
    messages,
    isStreaming,
    conversationId,
    error,
    ask,
    followUp,
    loadConversation,
    reset,
  };
}
