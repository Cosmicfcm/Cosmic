# Cosmic

Cosmic is a minimalist productivity system built around a fast day view, AI-assisted scheduling, tasks, notes, goals, and browser push reminders.

## Stack

- Next.js App Router with TypeScript and Tailwind CSS
- Zustand for client state
- Supabase Auth + Postgres for multi-user persistence
- OpenAI structured assistant actions through `/api/assistant`
- Netlify Functions for scheduled reminder delivery

## Features

- Day-first calendar with drag, resize, recurring events, quick add, and color-coded categories
- AI assistant drawer for natural-language create, move, delete, and schedule-optimization flows
- Tasks with due dates, reminders, and optional links to events
- "To remember" notes with tags and search
- Goals with horizon, progress, and linked tasks
- Browser push notifications plus scheduled reminder jobs
- JSON export/import and authenticated ICS export
- Demo mode when Supabase is not configured

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

3. Apply the SQL in [supabase/migrations/202604050001_cosmic.sql](/C:/Users/fredc/Documents/Playground%204/cosmic/supabase/migrations/202604050001_cosmic.sql) to your Supabase project.

4. Run the app:

```bash
npm run dev
```

5. Verify quality:

```bash
npm run lint
npm run test
npm run build
```

## Supabase notes

- Auth uses email magic links with `/auth/callback`.
- Row Level Security scopes all core tables to the authenticated user.
- The `profiles` row is created automatically from `auth.users`.
- The app seeds default categories on first authenticated load.

## Netlify deployment

1. Push the project to a Git repository.
2. Create a new Netlify site from that repo.
3. Keep the default build command `npm run build`.
4. Ensure `netlify.toml` is committed so Netlify finds `netlify/functions`.
5. Add the same environment variables from `.env.example` in the Netlify dashboard.
6. Set `NEXT_PUBLIC_SITE_URL` to your Netlify production URL.
7. After deploy, verify:
   - Magic-link redirect returns to `/auth/callback`
   - `/api/assistant` responds with OpenAI configured
   - Browser notifications can subscribe successfully
   - Scheduled functions `send-reminders` and `materialize-reminders` are registered

## Reminder flow

- The client requests notification permission and registers `public/sw.js`.
- Push subscriptions are stored in `push_subscriptions`.
- `netlify/functions/send-reminders.ts` runs every minute and dispatches due reminders.
- `netlify/functions/materialize-reminders.ts` runs daily and rebuilds future reminder jobs.

## Tests included

- Recurrence expansion with overrides
- Assistant action application and reminder materialization
- Notes panel search behavior

## Project layout

- `src/app`: routes, API handlers, auth callback
- `src/components`: UI shell, day view, panels, editors, assistant drawer
- `src/lib`: env, recurrence, reminders, client/server helpers
- `src/store`: Zustand store
- `netlify/functions`: scheduled reminder jobs
- `supabase/migrations`: schema and RLS setup
