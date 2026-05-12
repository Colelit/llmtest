# Technology Stack

**Analysis Date:** 2026-05-11

## Languages

**Primary:**
- TypeScript 5.x - All application source code (`app/**/*.tsx`, `lib/**/*.ts`)
- JavaScript (ESM) - Build scripts (`scripts/sync-images.mjs`)

**Secondary:**
- CSS - Global styles with Tailwind directives (`app/globals.css`)
- Markdown - Content source for questions and model answers (`_answers/**/*.md`)
- Python - Data export utility (referenced in README: `scripts/export_supabase.py`)

## Runtime

**Environment:**
- Node.js (implied by Next.js 16.x requirements)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)

## Frameworks

**Core:**
- Next.js 16.1.0 - React framework with App Router
  - Uses App Router pattern (`app/` directory)
  - Server Components by default (async pages)
  - Client Components marked with `"use client"`
  - Output mode: `standalone` (`next.config.js`)

**UI:**
- React 19.2.3 - UI library
- React DOM 19.2.3

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
- @tailwindcss/postcss 4.x - PostCSS plugin
- @tailwindcss/typography 0.5.16 - Prose styling plugin

**Data Visualization:**
- Recharts 3.5.1 - React charting library for statistics page

**Markdown Processing:**
- remark 15.0.1 - Markdown processor
- remark-gfm 4.0.1 - GitHub Flavored Markdown support
- remark-html 16.0.1 - Convert remark to HTML
- gray-matter 4.0.3 - Frontmatter parser for Markdown files

**State Management:**
- immer 11.1.0 - Immutable state updates (declared in dependencies)

## Key Dependencies

**Critical:**
- `@supabase/ssr` 0.6.1 - Server-side rendering Supabase client
- `@supabase/supabase-js` 2.50.2 - Supabase JavaScript client

**Infrastructure:**
- `next` 16.1.0 - Core framework
- `react` / `react-dom` 19.2.3 - UI runtime
- `recharts` 3.5.1 - Charts for `/my-stats` page

**Dev Tools:**
- `typescript` 5.x - Type checking
- `eslint` 9.x - Linting
- `eslint-config-next` 16.0.8 - Next.js ESLint rules
- `@types/react` 19.x, `@types/react-dom` 19.x, `@types/node` 20.x - Type definitions

## Configuration

**TypeScript:**
- Config: `tsconfig.json`
- Target: ES2017
- Module: ESNext with bundler resolution
- JSX: react-jsx
- Path alias: `@/*` maps to `./*`
- Strict mode enabled

**Next.js:**
- Config: `next.config.js` (JS) and `next.config.ts` (TS - likely redundant)
- `basePath`: from `NEXT_PUBLIC_BASE_PATH` env var
- `output: 'standalone'` for containerized deployment
- Port: 10005 (dev and start scripts)

**Tailwind CSS:**
- Config: `tailwind.config.ts`
- Content paths: `./pages/**/*`, `./components/**/*`, `./app/**/*`
- Plugin: `@tailwindcss/typography`

**PostCSS:**
- Config: `postcss.config.mjs`
- Plugin: `@tailwindcss/postcss`

**Environment:**
- `.env.example` - Template for required env vars
- `.env.local` - Local environment overrides (present, do not read contents)
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BASE_PATH`

**Scripts:**
- `npm run dev` - Development server on port 10005
- `npm run build` - Production build (runs `sync-images` pre-build)
- `npm run start` - Production server on port 10005
- `npm run lint` - ESLint check
- `npm run sync-images` - Copy images from `_answers` to `public/vendor`

## Platform Requirements

**Development:**
- Node.js with npm
- Supabase project with `submissions` and `user_progress` tables

**Production:**
- Target: Vercel (per README)
- Standalone output mode supports containerized deployment
- Subpath deployment supported via `NEXT_PUBLIC_BASE_PATH`

---

*Stack analysis: 2026-05-11*
