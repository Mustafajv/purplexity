# Purplexity Project Guide

Purplexity is a Perplexity-style AI search application. Users sign in with Supabase OAuth, ask a question, receive a streamed AI answer grounded in Tavily web search results, see cited sources, and can ask follow-up questions inside the same conversation.

The repository is split into two Bun/TypeScript apps:

- `backend/`: Express API, Supabase token validation, Prisma/Postgres persistence, Tavily search, and OpenRouter AI streaming.
- `frontend/`: React app with Supabase auth, streamed search UI, conversation sidebar, Markdown answers, sources, and follow-up suggestions.

## Project Structure

```text
purplexity/
+-- backend/
|   +-- index.ts                 # Express API and streaming search routes
|   +-- middleware.ts            # Supabase auth middleware and user upsert
|   +-- client.ts                # Supabase server client factory
|   +-- db.ts                    # Prisma client with Postgres adapter
|   +-- prompt.ts                # System prompts and prompt templates
|   +-- types.ts                 # Express Request type augmentation
|   +-- package.json             # Backend dependencies
|   +-- tsconfig.json
|   +-- prisma/
|       +-- schema.prisma        # User, Conversation, Message schema
|       +-- migrations/          # Existing database migrations
+-- frontend/
|   +-- src/
|   |   +-- App.tsx              # Routes for auth and dashboard
|   |   +-- index.ts             # Bun dev server
|   |   +-- frontend.tsx         # React DOM entry point
|   |   +-- index.html
|   |   +-- index.css            # App styles and Markdown prose styles
|   |   +-- pages/
|   |   |   +-- Auth.tsx         # Google/GitHub login screen
|   |   |   +-- Dashboard.tsx    # Main search, results, and sidebar UI
|   |   +-- hooks/
|   |   |   +-- useAuth.ts       # Supabase session and OAuth helpers
|   |   |   +-- useSearch.ts     # Streaming API client and response parsing
|   |   |   +-- useConversations.ts
|   |   +-- components/
|   |   |   +-- SearchBar.tsx
|   |   |   +-- AnswerDisplay.tsx
|   |   |   +-- SourcesList.tsx
|   |   |   +-- FollowUpSuggestions.tsx
|   |   |   +-- ConversationList.tsx
|   |   |   +-- ui/              # shadcn-style primitives
|   |   +-- lib/
|   |       +-- config.ts        # Backend URL
|   |       +-- supabase/
|   +-- build.ts                 # Bun browser build script
|   +-- package.json             # Frontend dependencies and scripts
|   +-- tsconfig.json
+-- PROJECT.md                   # This guide
```

## Tech Stack

Backend:

- Bun runtime
- Express 5
- Prisma 7 with Postgres adapter
- Supabase Auth
- Tavily web search
- OpenRouter AI SDK provider
- Vercel AI SDK `streamText`

Frontend:

- Bun dev server and build tooling
- React 19
- React Router 7
- Tailwind CSS 4
- Supabase SSR/browser client
- react-markdown with GitHub-flavored Markdown
- lucide-react icons
- shadcn-style UI primitives

## Runtime Flow

1. The user visits the React app.
2. `useAuth` loads the Supabase session.
3. If there is no authenticated user, Dashboard redirects to `/auth`.
4. The user signs in with Google or GitHub through Supabase OAuth.
5. On search, `useSearch.ask()` sends `POST /purplexity_ask` with the user's Supabase access token.
6. Backend middleware validates the token with Supabase and upserts the user into Postgres.
7. The backend creates a new conversation and saves the user's message.
8. Tavily runs an advanced web search for the query.
9. OpenRouter streams a model response using the search results and prompt template.
10. The backend streams the response to the frontend, then appends a `SOURCES` block.
11. The frontend parses `<ANSWER>`, `<FOLLOW_UPS>`, `<question>`, and `SOURCES`.
12. The backend saves the assistant response after streaming completes.
13. Follow-up questions use the same flow through `POST /purplexity_ask/follow_up`, with prior conversation messages included in the prompt.

## Backend API

All conversation and search routes require an `Authorization` header containing either a raw Supabase access token or `Bearer <token>`.

### `GET /conversations`

Returns conversations belonging to the authenticated user.

Response shape:

```json
{
  "conversations": [
    {
      "id": "string",
      "title": "string",
      "slug": "string",
      "userId": "string",
      "messages": []
    }
  ]
}
```

### `GET /conversation/:conversationId`

Returns one authenticated user's conversation with messages ordered oldest to newest.

### `DELETE /conversation/:conversationId`

Deletes one authenticated user's conversation and its messages.

### `PATCH /conversation/:conversationId`

Updates a conversation title.

Request body:

```json
{
  "title": "New title"
}
```

### `POST /purplexity_ask`

Creates a new conversation, performs web search, streams an AI answer, sends sources, and persists the assistant message.

Request body:

```json
{
  "query": "What is new in React 19?"
}
```

Streaming response format:

```text
CONVERSATION_ID:<conversation-id>
<ANSWER>
...
</ANSWER>

<FOLLOW_UPS>
<question>...</question>
</FOLLOW_UPS>
SOURCES
[{"url":"https://example.com","title":"Example"}]
SOURCES
```

### `POST /purplexity_ask/follow_up`

Asks a follow-up question in an existing conversation.

Request body:

```json
{
  "query": "Can you compare it with React 18?",
  "conversationId": "conversation-id"
}
```

## Database Schema

The Prisma schema defines three core models:

### `User`

- `id`: UUID primary key. Currently set to the Supabase user id when users are created by middleware.
- `email`: unique email address.
- `provider`: `Google` or `Github`.
- `name`: display name or fallback email.
- `supabaseId`: Supabase user id.
- `conversations`: user's conversations.

### `Conversation`

- `id`: UUID primary key.
- `title`: optional title, currently based on the initial query.
- `slug`: URL-friendly query slug plus random suffix.
- `userId`: owner id.
- `messages`: conversation messages.

### `Message`

- `id`: autoincrement integer primary key.
- `content`: message text.
- `role`: `User` or `Assistant`.
- `conversationId`: parent conversation id.
- `createdAt`: timestamp.
- `sources`: citations attached to assistant messages.

### `Source`

- `id`: autoincrement integer primary key.
- `url`: source URL.
- `title`: source title or URL fallback.
- `faviconUrl`: persisted favicon URL.
- `messageId`: parent assistant message id.

## Environment Variables

The backend expects:

```bash
DATABASE_URL=
BUN_PUBLIC_SUPABASE_URL=
BUN_PUBLIC_SUPABASE_KEY=
TAVILY_API_KEY=
OPENROUTER_API_KEY=
```

The frontend expects:

```bash
BUN_PUBLIC_SUPABASE_URL=
BUN_PUBLIC_SUPABASE_KEY=
BUN_PUBLIC_BACKEND_URL=
```

`frontend/src/lib/config.ts` reads `BUN_PUBLIC_BACKEND_URL` and falls back to local development:

```ts
export const BACKEND_URL =
  process.env.BUN_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
```

## Local Development

Install dependencies separately in each app:

```bash
cd backend
bun install

cd ../frontend
bun install
```

Run the backend:

```bash
cd backend
bun run index.ts
```

The backend listens on:

```text
http://localhost:3001
```

Run the frontend:

```bash
cd frontend
bun dev
```

The Bun server prints its URL at startup.

## Production Build

From the frontend directory:

```bash
bun run build
```

This runs `frontend/build.ts`, finds HTML entry points under `frontend/src`, bundles for the browser, minifies output, and writes to `dist` by default.

## Authentication

Authentication is handled by Supabase:

- `frontend/src/hooks/useAuth.ts` loads the current session and exposes OAuth helpers.
- The Auth page supports Google and GitHub sign-in.
- Backend middleware validates each request token using `client.auth.getUser(token)`.
- After validation, middleware upserts a local Prisma `User` record and attaches `req.userId`.

The backend accepts either:

```text
Authorization: <token>
```

or:

```text
Authorization: Bearer <token>
```

## AI and Search Behavior

Tavily search:

- Used through `@tavily/core`.
- Search depth is set to `advanced`.
- Result objects are passed into the prompt as JSON.
- Source metadata is sent to the frontend after the streamed answer.
- Source metadata is persisted against assistant messages for conversation reloads.

OpenRouter model:

```ts
openrouter("meta-llama/llama-4-maverick")
```

Prompt contract:

- The model is instructed to answer as `purplexity`.
- The model must produce an `<ANSWER>` section.
- The model should produce `<FOLLOW_UPS>` containing `<question>` entries.
- The frontend parses these tags and displays clean Markdown answer text plus follow-up buttons.

## Frontend Screens

### `/auth`

The authentication screen includes:

- Purplexity brand mark
- Google OAuth button
- GitHub OAuth button
- Loading spinner while session state resolves
- Redirect back to `/` once authenticated

### `/`

The dashboard includes:

- Collapsible conversation sidebar
- New search action
- User footer and sign-out
- Centered search screen
- Results view with streamed answer
- Source chips with favicon support
- Follow-up question buttons
- Follow-up search input

## Important Components and Hooks

### `useSearch`

Handles:

- Starting streamed requests
- Reading `ReadableStream` chunks
- Extracting `CONVERSATION_ID`
- Parsing answer XML-like tags
- Parsing final source JSON
- Loading previous conversations into the current search state
- Managing streaming, error, answer, sources, follow-ups, and conversation id state

### `useConversations`

Handles:

- Fetching conversation list
- Deleting conversations
- Local list update after deletion

### `Dashboard`

Coordinates:

- Auth redirect
- Search submission
- Follow-up submission
- Previous conversation selection
- Search reset
- Sidebar visibility
- Result rendering

### `AnswerDisplay`

Renders streamed Markdown using:

- `react-markdown`
- `remark-gfm`
- Custom `.prose-purplexity` styles

### `SourcesList`

Displays source links as chips, including domain favicons through Google's favicon endpoint.

## Current Limitations and Notes

- Backend response streaming uses a custom text protocol instead of standard Server-Sent Events framing.
- Assistant messages are saved only after streaming completes.
- There are no test scripts currently defined in either `package.json`.
- The Prisma relation from `Conversation` to `Message` does not currently specify cascading deletes, so the backend deletes messages manually before deleting a conversation.

## Suggested Next Improvements

- Add a full multi-turn transcript view for loaded conversations.
- Add route-level request validation.
- Add integration tests for auth middleware and search streaming format.
- Add frontend tests for `parseResponse`, `parseSources`, and conversation interactions.
- Consider standard SSE events or NDJSON for a more explicit streaming protocol.
