# External Integrations

**Analysis Date:** 2026-05-11

## APIs & External Services

**Supabase:**
- Purpose: Backend-as-a-Service for database, auth, and real-time API
- SDK: `@supabase/supabase-js` (client) + `@supabase/ssr` (SSR-aware client)
- Client initialization: `lib/supabase/client.ts`
- Auth: Anonymous key-based (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Tables used:
  - `submissions` - Stores completed/in-progress evaluation submissions (upsert on `user_name`)
  - `user_progress` - Stores per-question, per-model incremental progress (upsert on composite key)

**Google Fonts (via Next.js):**
- Purpose: Font loading
- Fonts: Geist Sans, Geist Mono (loaded via `next/font/google` in `app/layout.tsx`)

## Data Storage

**Databases:**
- Supabase PostgreSQL
  - Connection: Via Supabase client SDK (no direct connection string)
  - Client: `@supabase/supabase-js` / `@supabase/ssr`
  - ORM: None (raw Supabase client with PostgREST API)

**File Storage:**
- Local filesystem only (no cloud storage service)
- Images copied from `_answers/question-*/images/` to `public/vendor/question-*/images/` at build time via `scripts/sync-images.mjs`
- Static assets served from Next.js `public/` directory

**Caching:**
- None detected (no Redis, no service worker caching strategy)

## Authentication & Identity

**Auth Provider:**
- Custom / Anonymous
- No formal auth system (no login/password, no OAuth)
- Users identified by self-entered nickname stored in `localStorage` (`fineval_user_info`)
- Supabase RLS policies allow anonymous INSERT on `submissions` table
- Duplicate nickname detection via Supabase query (`app/page.tsx` lines 43-47)

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, LogRocket, etc.)

**Logs:**
- Console logging only (`console.error` for Supabase errors)

## CI/CD & Deployment

**Hosting:**
- Vercel (per README.md)

**CI Pipeline:**
- None detected (no GitHub Actions, no Vercel-specific CI config files)

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public API key
- `NEXT_PUBLIC_BASE_PATH` - Subpath prefix for deployment (e.g., `/fineval`; root path = empty string)

**Optional/Deprecated env vars:**
- `BASE_URL` - Legacy variable for domain name (not recommended per README)

**Secrets location:**
- `.env.local` - Local development (file exists, contents not read)
- `.env.example` - Template showing required variables (no actual secrets)
- Vercel Environment Variables for production

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Data Flow with External Services

### Supabase Write Flow (Evaluation Submission)
1. User completes evaluation in `EvaluationClient` (`app/components/EvaluationClient.tsx`)
2. Data structured as `{ user_name, user_profile, evaluation_data, duration_seconds, status }`
3. Upsert to `submissions` table with `onConflict: 'user_name'` (line 178, 214)
4. On final submit: delete from `user_progress`, clear `localStorage`, redirect to `/thank-you`

### Supabase Write Flow (Incremental Progress)
1. Each score/checkbox change triggers `handleUpdateEvaluation` (line 91)
2. Upsert to `user_progress` table: `{ user_id, question_id, model_id, evaluation_data, updated_at }`

### Supabase Read Flow (Resume Progress)
1. On `EvaluationClient` mount, query `user_progress` by `user_id` (user name)
2. Restore evaluation state and jump to last answered question

### Supabase Read Flow (Statistics)
1. `my-stats/page.tsx` queries `submissions` table by `user_name`
2. Aggregates evaluation_data client-side for Recharts visualization

---

*Integration audit: 2026-05-11*
