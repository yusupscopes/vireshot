# Vireshot

Build websites by chatting with AI. Describe what you want, and a coding agent writes a Next.js app inside an isolated cloud sandbox. You get a live preview and the source code back in the browser.

## How it works

```
Browser ──tRPC──▶ projects.create / messages.create ──▶ Postgres (Prisma)
   ▲                         │ inngest.send("app/message.created")
   │ polls every 5s          ▼
   │               Inngest function: process-message
   │                 1. Start an E2B sandbox from the Next.js template
   │                 2. Run a GPT-4.1 agent (Inngest Agent Kit) with tools:
   │                    terminal · createOrUpdateFiles · readFiles
   │                 3. Save the assistant message and a Fragment
   │                    (sandbox URL + generated files)
   └── Demo tab: the sandbox URL in an iframe · Code tab: the saved files
```

1. On the home page, a signed-in user submits a prompt. This creates a **Project** with a random two-word name and its first **Message**.
2. The server sends an `app/message.created` event to Inngest.
3. The `process-message` function starts an E2B sandbox that already runs a Next.js dev server on port 3000 with every shadcn/ui component installed. The agent edits files and installs packages there until it replies with a `<task_summary>`, or until it runs out of iterations (10).
4. The result is stored as an `ASSISTANT` message with a **Fragment** that holds the sandbox URL and the files the agent wrote. If the agent finishes without a summary or without writing any files, an `ERROR` message is stored instead.
5. The project page polls for new messages. It shows the newest fragment in the **Demo** tab (live preview) and the **Code** tab (file tree and syntax-highlighted source).

## Tech stack

| Area | Tools |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, `src/proxy.ts`), React 19, TypeScript |
| UI | Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com), lucide-react, next-themes, Prism |
| API | [tRPC 11](https://trpc.io) with TanStack Query and superjson |
| Auth | [Clerk](https://clerk.com) |
| Database | PostgreSQL via [Prisma 7](https://www.prisma.io) and the Neon driver adapter |
| Background jobs | [Inngest](https://www.inngest.com) and [Inngest Agent Kit](https://agentkit.inngest.com) |
| AI model | OpenAI `gpt-4.1` |
| Code sandbox | [E2B](https://e2b.dev) with a custom template |
| Tests | Vitest |

## Project structure

```
prisma/
  schema.prisma              Project, Message, Fragment models
  migrations/
sandbox-templates/nextjs/    E2B template: Next.js 16 + shadcn/ui, dev server on :3000
src/
  app/
    (home)/                  Landing page, project list, sign-in / sign-up
    projects/[projectId]/    Chat + preview workspace
    api/trpc/[trpc]/         tRPC HTTP handler
    api/inngest/             Inngest serve endpoint
  inngest/
    functions.ts             process-message: sandbox → agent → save result
    tools.ts                 Agent tools (terminal, createOrUpdateFiles, readFiles)
    prompt.ts                Agent system prompt
    utils.ts                 Sandbox connect, path validation, size limits
  modules/
    home/                    Landing page UI and prompt templates
    projects/                Project procedures and workspace UI
    messages/                Message procedures
  trpc/                      tRPC init (protectedProcedure), routers, client/server helpers
  components/                File explorer, tree view, code view, shadcn/ui primitives
  lib/database.ts            Prisma client singleton
  proxy.ts                   Clerk route protection
  generated/prisma/          Generated Prisma client (git-ignored)
```

## Data model

- **Project**: `id`, `name`, `userId` (Clerk user ID). It has many messages.
- **Message**: `content`, `role` (`USER` | `ASSISTANT`), `type` (`PROMPT` | `RESULT` | `ERROR`). It belongs to a project and has at most one fragment.
- **Fragment**: `sandboxUrl`, `title`, `files` (JSON map of path → content). It belongs to one message.

Every tRPC procedure is a `protectedProcedure` and filters by the signed-in user's ID, so users only ever see their own projects. Deleting a project cascades to its messages and fragments.

## Getting started

### Prerequisites

- Node.js 20 or later, and npm
- A PostgreSQL database. `src/lib/database.ts` uses `@prisma/adapter-neon`, so a [Neon](https://neon.tech) database is the simplest choice.
- Accounts and API keys for [Clerk](https://dashboard.clerk.com), [OpenAI](https://platform.openai.com) and [E2B](https://e2b.dev)
- [Docker](https://www.docker.com), needed to build the E2B sandbox template

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Use `.env`, not `.env.local`: the Prisma CLI loads only `.env` (see `prisma.config.ts`).

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app, such as `http://localhost:3000`. Server-side tRPC calls use it. |
| `INNGEST_DEV` | Set to `1` to use the local Inngest Dev Server. Remove it in production. |
| `OPENAI_API_KEY` | OpenAI key for the coding agent |
| `E2B_API_KEY` | E2B key for creating sandboxes |
| `E2B_TEMPLATE_NAME` | Name of the E2B template to start. Defaults to `vire-nextjs-example`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-in` and `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Where to go after auth. Defaults to `/`. |

In production you also need `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` from your Inngest app.

### 3. Set up the database

```bash
npm run prisma:migrate    # apply migrations
npm run prisma:generate   # generate the client into src/generated/prisma
```

### 4. Build the E2B sandbox template

The agent runs inside a custom E2B template that already has a Next.js dev server running and every shadcn/ui component installed.

```bash
npm install -g @e2b/cli
e2b auth login
cd sandbox-templates/nextjs
e2b template build
```

This uses `e2b.toml` to build `e2b.Dockerfile` as `vire-nextjs-example` with `/compile_page.sh` as the start command. If you use a different template name, set `E2B_TEMPLATE_NAME` to match.

### 5. Run the app

You need two processes:

```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Inngest Dev Server, which runs the background agent
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

- App: http://localhost:3000
- Inngest dashboard (runs, steps, agent traces): http://localhost:8288

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm start` | Make a production build and serve it |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest tests |
| `npm run prisma:migrate` | Create or apply migrations (`prisma migrate dev`) |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run prisma:reset` | Drop the database and re-apply every migration |

## Authentication

`src/proxy.ts` runs Clerk on every request. Requests to `/`, `/sign-in`, `/sign-up`, `/api/inngest` and `/api/trpc` go through without a redirect. Every other route, such as `/projects/*`, requires a session. The tRPC routes check auth themselves through `protectedProcedure`, so a signed-out request gets an `UNAUTHORIZED` error instead of a redirect.

## Deployment notes

- Set every variable from `.env.example`, remove `INNGEST_DEV`, and add `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY`.
- After deploying, register `https://<your-domain>/api/inngest` with Inngest Cloud (or use the Vercel integration).
- Run `npx prisma migrate deploy` against the production database.
- The E2B template must exist in the E2B team that owns `E2B_API_KEY`.

## Current limitations

This is a work in progress:

- **Follow-up messages start from scratch.** Each message gets a fresh sandbox, and the agent sees only the newest prompt, not the conversation or the earlier files.
- **Previews expire.** Sandboxes use E2B's default 5-minute timeout, so the saved preview URL stops working after that. The code in the Code tab stays available.
- **No usage limits.** Billing and the `/pricing` page linked from the workspace aren't built yet.
- **Polling, not live updates.** The workspace polls for new messages every 5 seconds.
