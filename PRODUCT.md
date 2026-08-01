# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person: the owner (leone). This is a private, personal life-tracking dashboard — not a product with an audience. The README's fork-and-deploy instructions are incidental; the owner confirmed the dashboard is "just me." Design decisions never need to serve a hypothetical second user.

Primary usage scene: **on a phone, throughout the day**, in dozens of short visits — logging water, meals, supplements, caffeine, workouts as they happen. Glanceability, thumb-reachable touch targets, and fast log-one-thing-and-leave flows outrank desktop density.

## Product Purpose

A set of small self-contained HTML apps sharing a top bar (`topbar.js`), each tracking one dimension of daily life:

- `index.html` — goals for the day (Day Ring, Goal Ticker, To Do list); the home page
- `nutrition.html` — meal logging with auto-calculated macros and barcode scanning (zxing-wasm)
- `po-water.html` — water intake
- `health.html` — supplement / daily stack
- `gym.html` — progressive-overload gym tracker
- `finance.html` — finances, including receipt scanning (NIM vision proxy)
- `caffeine.html` — caffeine intake
- `main.html`, `nova-lite.html`, `avatar-lab.html` — supporting/experimental surfaces

Success is consistent daily logging with minimal friction: the owner actually keeps the habit because each log takes seconds.

## Positioning

Personal tool, not a market product. Its value over off-the-shelf trackers: every tracker lives in one place, under one visual identity, with exactly the fields the owner cares about and nothing else — and the owner can reshape any page at will.

## Operating Context

- Deployed as a static site on **Vercel** (free tier), with serverless functions in `api/` (WHOOP OAuth, NVIDIA NIM proxies, config).
- **Supabase** (free tier) provides cross-device sync: `app_state` (anon) and `user_app_state` (authenticated, RLS per-user). Pages store state in `localStorage` and sync via `sync.js` / `auth-sync.js`.
- A password lock screen gates the deployed site.
- Optional integrations: WHOOP (health data), NVIDIA NIM vision (receipt scanning), OpenFoodFacts-style barcode lookup for nutrition.
- Tests exist under `tests/` (node, e.g. `water-sync.test.mjs`).

## Capabilities and Constraints

- **Binding constraint: free-tier only.** All services (Vercel, Supabase, NIM, etc.) must stay on free tiers; no paid dependencies.
- Explicitly **not** binding (owner's call, 2026-08-01): the single-file/no-build page architecture and the localStorage-first/offline model may change if a future feature warrants it. Current pages are self-contained HTML with inline CSS/JS and no build step — treat that as the incumbent convention, not a law.
- Node ≥ 18; sole npm dependency is `@supabase/supabase-js`.
- Pages communicate via `localStorage` keys and custom window events (e.g. `goals-changed`).

## Evidence on Hand

- Real usage data lives in the owner's `localStorage`/Supabase — no demo data needed and none should be fabricated.
- Design/implementation specs and plans under `docs/superpowers/` document past feature decisions (nutrition tracker, barcode scanner, authenticated sync, receipt scanner).
- `BUILD_DASHBOARD.md` records the original visual recipe for `index.html` (dark theme, glass cards, orange/grey radial washes, mono numerals) — evidence of the incumbent visual world, not a binding spec.

## Product Principles

1. **Logging must take seconds.** Every tracker optimizes for the fastest possible capture on a phone; review and analysis come second.
2. **One owner, zero ceremony.** No accounts UX, no onboarding for strangers, no generic settings — build exactly for how the owner actually uses it.
3. **Free forever.** A feature that needs a paid tier is the wrong design for this product.
4. **Each page owns one job.** Trackers stay small and separable; shared chrome lives in `topbar.js`, shared sync in `sync.js`.
5. **Data is real and private.** Never fabricate metrics or seed fake history; respect that everything shown is the owner's actual life data.
