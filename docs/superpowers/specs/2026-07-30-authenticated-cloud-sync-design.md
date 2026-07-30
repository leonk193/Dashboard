# Authenticated Cloud Backup and Synchronization Design

- **Date**: 2026-07-30
- **Status**: Approved
- **Topic**: Dashboard cloud backup, Supabase Auth integration, and personal data synchronization

## 1. Goal & Context

The dashboard previously used an unauthenticated public `app_state` table in Supabase. Some pages (finance, caffeine, nutrition, supplements/health, goals, gym) attempted synchronization, but personal profile updates (height, weight, age, sex) on the home page (`index.html`) were not wired to `sync.js`, and data access was unauthenticated.

This design introduces a personal, authenticated account layer using Supabase Auth (email + password, email confirmation disabled) to turn the dashboard into a secure cloud backup and multi-device workspace for all non-secret dashboard data.

## 2. In-Scope Data Categories

The following non-secret items must be backed up to the authenticated account:

- **Personal Profile & Body Metrics**: `po_water_v1` (height, weight, age, sex, activity, water preferences/logs).
- **Nutrition**: `nutrition:profile`, `nutrition:targets`, `nutrition:meals`.
- **Caffeine**: `caf:logs`, `caf:custom`.
- **Supplements & Daily Stack**: `stack:items`, `stack:version`, `stack:low`, `stack:taken:*`.
- **Finance**: `subs`, `wishlist`, `incoming_orders`, `nw_currency`, `nw:*` line items, `nw:activity`, `nw:history`, `finance_active_tab`.
- **Goals**: `goals:*`.
- **Gym**: `po_coach_v1`, `po_coach_workout_done`, `po_coach_weights`, `po_coach_photos`.
- **Templates / Other**: `tpl:*`.

## 3. Explicit Secrets Denylist

The cloud backup layer MUST NEVER upload the following local items:

- `whoop_tokens_v1`
- `whoop_last_sync`
- `nova_lite_api_key`
- Any future secret tokens, OAuth access tokens, refresh tokens, or API credentials.

## 4. Database Schema & Security

### New Table: `public.user_app_state`

```sql
create table if not exists public.user_app_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_app_state enable row level security;

create policy "Users manage own state"
  on public.user_app_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Legacy anonymous `public.app_state` rows will be ignored and left untouched.

## 5. Auth & Sync Workflow

### A. Auth UI & Session Handling
- Shared modal injected by `topbar.js` offering:
  - Sign in / Sign up (Email + Password).
  - Current status indicator (Logged in as `user@domain.com` | Offline/Local-only).
  - Sign out button.
- Supabase auth session is restored automatically on page load (`supabase.auth.getSession()`).

### B. First-Login Data Upload
1. Upon first successful login on a device, the client queries `user_app_state` for `user_id = auth.uid()`.
2. **If no rows exist (empty account)**:
   - The UI prompts the user to confirm initial backup of their local non-secret data.
   - Upon confirmation, local non-secret keys are uploaded into `user_app_state`.
3. **If rows exist**:
   - The client downloads the cloud state and updates local storage.
   - Local non-secret keys not present in the cloud state are preserved locally unless explicitly cleared.

### C. Continuous Syncing
- Local mutations to tracked non-secret keys invoke debounced upserts to `user_app_state`.
- Realtime subscriptions (`postgres_changes` on `user_app_state` for `user_id = auth.uid()`) pull cross-device changes.
- `index.html` is updated to include `sync.js` and sync `po_water_v1` so home-page body metrics updates sync immediately.

## 6. Safety & Verification Plan

- **Privacy**: Unauthenticated callers cannot read or write `user_app_state`.
- **Data Integrity**: Local secrets remain on disk and are never uploaded.
- **Graceful Degrade**: If logged out or offline, the dashboard continues to read and write locally without throwing unhandled errors or clearing stored data.
