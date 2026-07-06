import { useState, useEffect, useCallback } from "react";
import { BACKEND_URL } from "@/lib/config";

export interface Conversation {
  id: string;
  title: string | null;
  slug: string;
  messages: { content: string; role: string; createdAt: string }[];
}

export function useConversations(
  getAccessToken: () => Promise<string | null>,
  enabled = true,
) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(enabled);

  const fetchConversations = useCallback(async () => {
    if (!enabled) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const res = await fetch(`${BACKEND_URL}/conversations`, {
        headers: { Authorization: token },
      });

      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch (e) {
      console.error("Failed to fetch conversations:", e);
    } finally {
      setLoading(false);
    }
  }, [enabled, getAccessToken]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const deleteConversation = useCallback(
    async (id: string) => {
      const token = await getAccessToken();
      if (!token) return;

      await fetch(`${BACKEND_URL}/conversation/${id}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });

      setConversations((prev) => prev.filter((c) => c.id !== id));
    },
    [getAccessToken],
  );

  return { conversations, loading, refetch: fetchConversations, deleteConversation };
}
