import { useState, useCallback, useRef } from "react";
import { BACKEND_URL } from "@/lib/config";

interface Source {
  url: string;
  title: string;
}

interface UseSearchResult {
  answer: string;
  sources: Source[];
  followUps: string[];
  isStreaming: boolean;
  conversationId: string | null;
  error: string | null;
  ask: (query: string) => Promise<void>;
  followUp: (query: string, convId: string) => Promise<void>;
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
      const sources = JSON.parse(parts[1]);
      return { textWithoutSources: parts[0], sources };
    } catch {
      return { textWithoutSources: raw, sources: [] };
    }
  }
  return { textWithoutSources: raw, sources: [] };
}

export function useSearch(getAccessToken: () => Promise<string | null>): UseSearchResult {
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const streamResponse = useCallback(
    async (url: string, body: object) => {
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
              setConversationId(id);
              fullText = fullText.slice(newlineIdx + 1);
            }
          }

          // Show streaming text (before SOURCES delimiter)
          const displayText = fullText.split("\nSOURCES\n")[0];
          const parsed = parseResponse(displayText);
          setAnswer(parsed.answer);
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
      } catch (e: any) {
        if (e.name !== "AbortError") {
          setError(e.message || "Something went wrong");
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [getAccessToken],
  );

  const ask = useCallback(
    async (query: string) => {
      await streamResponse("/purplexity_ask", { query });
    },
    [streamResponse],
  );

  const followUp = useCallback(
    async (query: string, convId: string) => {
      await streamResponse("/purplexity_ask/follow_up", {
        query,
        conversationId: convId,
      });
    },
    [streamResponse],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setAnswer("");
    setSources([]);
    setFollowUps([]);
    setIsStreaming(false);
    setConversationId(null);
    setError(null);
  }, []);

  return {
    answer,
    sources,
    followUps,
    isStreaming,
    conversationId,
    error,
    ask,
    followUp,
    reset,
  };
}
