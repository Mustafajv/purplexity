import express from "express";
import { tavily } from "@tavily/core";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from "./prompt";
import { Output, streamText } from "ai";
import z, { url } from "zod";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { prisma } from "./db";
import { getPrismaClient } from "@prisma/client/runtime/client";

const client = tavily({ apiKey: process.env  .TAVILY_API_key });
const app = express();
app.use(express.json());



app.post("/signup", async (req, res) => {

})


app.post("/signin", async (req, res) => {
  
})


app.get("/conversations", async (req, res) => {
  
})

app.post("/converasation/:conversationId", async (req, res) => {
  
})






  app.post("/purplexity_ask", async (req, res) => {
  const query = req.body.query;

  const webSearchResponse = await client.search(query, {
    searchDepth: "advanced",
  });

  const webSearchResult = webSearchResponse.results;

  const prompt = PROMPT_TEMPLATE.replace(
    "{{WEB_SEARCH_RESULTS}}",
    JSON.stringify(webSearchResult),
  ).replace("{{USER_QUERY}}", query);

  const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

  const result = streamText({
    model: openrouter("meta-llama/llama-4-maverick"),
    system: SYSTEM_PROMPT,
    prompt: prompt,
  });

  res.header('cache-control', 'no-cache')
  res.header('content-type', 'text/event-stream')
  for await (const textPart of result.textStream) {
  res.write(textPart);
}

res.write("\nSOURCES\n")
res.write(JSON.stringify(webSearchResult.map (result=> ({url: result.url}))))
res.write("\nSOURCES\n")
res.end()
});

app.post("/purplexity_ask/follow_up", async (req, res) => {
  
})


app.listen(3000);

