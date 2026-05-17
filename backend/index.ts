import "./types";
import express from "express";
import { tavily } from "@tavily/core";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT, FOLLOW_UP_PROMPT_TEMPLATE, FOLLOW_UP_SYSTEM_PROMPT } from "./prompt";
import { streamText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { prisma } from "./db";
import { middleware } from "./middleware";
import cors from "cors";
import crypto from "crypto";

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });
const app = express();
app.use(express.json());
app.use(cors());

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// ──────────────────────────────────────────────
// GET /conversations — list all conversations for the authenticated user
// ──────────────────────────────────────────────
app.get("/conversations", middleware, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.userId },
      orderBy: { messages: { _count: "desc" } },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    res.json({ conversations });
  } catch (e) {
    console.error("Error fetching conversations:", e);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// ──────────────────────────────────────────────
// GET /conversation/:conversationId — get a single conversation with all messages
// ──────────────────────────────────────────────
app.get("/conversation/:conversationId", middleware, async (req, res) => {
  const conversationId = req.params.conversationId as string;
  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: req.userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    res.json({ conversation });
  } catch (e) {
    console.error("Error fetching conversation:", e);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// ──────────────────────────────────────────────
// DELETE /conversation/:conversationId — delete a conversation and its messages
// ──────────────────────────────────────────────
app.delete("/conversation/:conversationId", middleware, async (req, res) => {
  const conversationId = req.params.conversationId as string;
  try {
    // Verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: req.userId,
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Delete messages first (cascade), then the conversation
    await prisma.message.deleteMany({
      where: { conversationId },
    });

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    res.json({ success: true });
  } catch (e) {
    console.error("Error deleting conversation:", e);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// ──────────────────────────────────────────────
// POST /purplexity_ask — new question: creates a conversation, searches the web,
// streams an AI response, and saves everything to DB
// ──────────────────────────────────────────────
app.post("/purplexity_ask", middleware, async (req, res) => {
  const query = req.body.query;

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query is required" });
    return;
  }

  try {
    // 1. Create conversation
    const slug = query
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80)
      + "-" + crypto.randomBytes(4).toString("hex");

    const conversation = await prisma.conversation.create({
      data: {
        title: query.slice(0, 200),
        slug,
        userId: req.userId!,
      },
    });

    // 2. Save the user's message
    await prisma.message.create({
      data: {
        content: query,
        role: "User",
        conversationId: conversation.id,
      },
    });

    // 3. Web search via Tavily
    const webSearchResponse = await client.search(query, {
      searchDepth: "advanced",
    });

    const webSearchResult = webSearchResponse.results;

    // 4. Build prompt and stream LLM response
    const prompt = PROMPT_TEMPLATE.replace(
      "{{WEB_SEARCH_RESULTS}}",
      JSON.stringify(webSearchResult),
    ).replace("{{USER_QUERY}}", query);

    const result = streamText({
      model: openrouter("meta-llama/llama-4-maverick"),
      system: SYSTEM_PROMPT,
      prompt: prompt,
    });

    // 5. Stream response to client
    res.header("Cache-Control", "no-cache");
    res.header("Content-Type", "text/event-stream");
    res.header("Connection", "keep-alive");

    // Send conversationId as first line so the frontend knows where to navigate
    res.write(`CONVERSATION_ID:${conversation.id}\n`);

    let fullResponse = "";
    for await (const textPart of result.textStream) {
      fullResponse += textPart;
      res.write(textPart);
    }

    // 6. Send sources
    res.write("\nSOURCES\n");
    res.write(
      JSON.stringify(
        webSearchResult.map((r) => ({ url: r.url, title: r.title })),
      ),
    );
    res.write("\nSOURCES\n");

    // 7. Save assistant message to DB
    await prisma.message.create({
      data: {
        content: fullResponse,
        role: "Assistant",
        conversationId: conversation.id,
      },
    });

    res.end();
  } catch (e) {
    console.error("Error in /purplexity_ask:", e);
    if (!res.headersSent) {
      res.status(500).json({ error: "Something went wrong" });
    } else {
      res.end();
    }
  }
});

// ──────────────────────────────────────────────
// POST /purplexity_ask/follow_up — follow-up question within an existing conversation
// ──────────────────────────────────────────────
app.post("/purplexity_ask/follow_up", middleware, async (req, res) => {
  const { query, conversationId } = req.body;

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "query is required" });
    return;
  }

  if (!conversationId || typeof conversationId !== "string") {
    res.status(400).json({ error: "conversationId is required" });
    return;
  }

  try {
    // 1. Verify conversation belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: req.userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // 2. Save user's follow-up message
    await prisma.message.create({
      data: {
        content: query,
        role: "User",
        conversationId: conversation.id,
      },
    });

    // 3. Web search
    const webSearchResponse = await client.search(query, {
      searchDepth: "advanced",
    });

    const webSearchResult = webSearchResponse.results;

    // 4. Build conversation history for context
    const conversationHistory = conversation.messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n\n");

    const prompt = FOLLOW_UP_PROMPT_TEMPLATE
      .replace("{{WEB_SEARCH_RESULTS}}", JSON.stringify(webSearchResult))
      .replace("{{USER_QUERY}}", query)
      .replace("{{CONVERSATION_HISTORY}}", conversationHistory);

    // 5. Stream response
    const result = streamText({
      model: openrouter("meta-llama/llama-4-maverick"),
      system: FOLLOW_UP_SYSTEM_PROMPT,
      prompt: prompt,
    });

    res.header("Cache-Control", "no-cache");
    res.header("Content-Type", "text/event-stream");
    res.header("Connection", "keep-alive");

    let fullResponse = "";
    for await (const textPart of result.textStream) {
      fullResponse += textPart;
      res.write(textPart);
    }

    // 6. Send sources
    res.write("\nSOURCES\n");
    res.write(
      JSON.stringify(
        webSearchResult.map((r) => ({ url: r.url, title: r.title })),
      ),
    );
    res.write("\nSOURCES\n");

    // 7. Save assistant response
    await prisma.message.create({
      data: {
        content: fullResponse,
        role: "Assistant",
        conversationId: conversation.id,
      },
    });

    res.end();
  } catch (e) {
    console.error("Error in /purplexity_ask/follow_up:", e);
    if (!res.headersSent) {
      res.status(500).json({ error: "Something went wrong" });
    } else {
      res.end();
    }
  }
});

// ──────────────────────────────────────────────
// PATCH /conversation/:conversationId — update conversation title
// ──────────────────────────────────────────────
app.patch("/conversation/:conversationId", middleware, async (req, res) => {
  const conversationId = req.params.conversationId as string;
  const { title } = req.body;

  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }

  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: req.userId,
      },
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });

    res.json({ conversation: updated });
  } catch (e) {
    console.error("Error updating conversation:", e);
    res.status(500).json({ error: "Failed to update conversation" });
  }
});

const server = app.listen(3001, () => {
  console.log("🟣 Purplexity backend running on http://localhost:3001");
});

void server;

// Bun's Node HTTP compatibility can let this Express process exit after listen().
// Keep one timer referenced so the API stays available during local development.
setInterval(() => {}, 60_000);
