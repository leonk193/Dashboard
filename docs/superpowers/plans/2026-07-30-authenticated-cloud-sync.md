# Authenticated Cloud Backup & Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace anonymous Supabase sync with an email/password-authenticated, RLS-protected sync across all dashboard pages. Secrets stay local. First login uploads current local data.

**Architecture:** A new `auth-sync.js` module provides shared auth + sync infrastructure. `topbar.js` picks up the auth state to show login UI. Each page replaces its `initCloudSync` call with `initAuthenticatedSync`. `gym.html` replaces its inline sync clone. A new `user_app_state` table keyed by `(user_id, key)` replaces the anonymous `app_state` table.

**Tech Stack:** Supabase Auth (email/password, confirmation disabled), existing Supabase instance, same CDN `@supabase/supabase-js@2`.

## Global Constraints

- Secrets (`whoop_tokens_v1`, `whoop_last_sync`, `nova_lite_api_key`) must NEVER be uploaded
- Supabase anon key is used (not service_role) — RLS enforces user isolation
- Existing anonymous `app_state` rows are never read or migrated
- All pages remain usable when logged out (local-only mode)
- The new module must use the same Supabase project URL and anon key already served via `/api/config`

---

## File Structure

| File | Responsibility |
|------|---------------|
| **Create** `auth-sync.js` | Shared auth + authenticated sync module. Exports `window.auth` with `initSync(), signIn(), signOut(), user, ready`. |
| **Modify** `topbar.js` | Add auth UI (login button, status indicator) to the topbar. Wire to `window.auth`. |
| **Modify** `index.html` | Wire `po_water_v1` to authenticated sync. Add initial-upload confirmation. |
| **Modify** `health.html` | Replace `initCloudSync` with `initAuthenticatedSync`. |
| **Modify** `main.html` | Replace `initCloudSync` with `initAuthenticatedSync`. |
| **Modify** `nutrition.html` | Replace `initCloudSync` with `initAuthenticatedSync`. |
| **Modify** `caffeine.html` | Replace `initCloudSync` with `initAuthenticatedSync`. |
| **Modify** `po-water.html` | Replace `initCloudSync` with `initAuthenticatedSync`. |
| **Modify** `finance.html` | Replace `initCloudSync` with `initAuthenticatedSync`. |
| **Modify** `gym.html` | Replace inline sync (`pcInitCloudSync`) with shared `initAuthenticatedSync`. |
| **Modify** `template.html` | Update example to use `initAuthenticatedSync`. |
| **Modify** `SETUP.md` | Add `user_app_state` SQL, auth setup steps. |

---

### Task 1: Supabase Setup (manual step)

**Files:** `SETUP.md` (documentation only — no code changes to live files)

**Interfaces:**
- Produces: SQL to run in Supabase Dashboard; config toggle for confirmation emails.

**Description:** The user runs two things in their Supabase Dashboard:
1. **Toggle off email confirmation** under Authentication → Settings → Confirm email.
2. **Run this SQL** in SQL Editor:

```sql
-- Authenticated, per-user sync table (replaces anonymous app_state)
create table if not exists public.user_app_state (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_app_state enable row level security;

create policy "Users manage own state"
  on public.user_app_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Realtime for cross-device sync (scoped by RLS)
alter publication supabase_realtime add table public.user_app_state;
```

- [ ] **Step 1: Update SETUP.md** — Add the SQL block and auth-config instruction as a **new section 2a "Authenticated Sync (optional but recommended)"**, placed after the existing anonymous `app_state` section.

```bash
git add SETUP.md && git commit -m "docs: add authenticated sync setup instructions"
```

---

### Task 2: Create `auth-sync.js` module

**Files:**
- Create: `auth-sync.js`

**Interfaces:**
- Produces: `window.auth` object with the following properties:
  - `user` — `{ id: string, email: string }` or `null`
  - `ready` — boolean, true after initial session check
  - `supa` — shared Supabase client instance (all modules use the same one)
  - `signIn(email, password)` → `Promise<{ error? }>`
  - `signUp(email, password)` → `Promise<{ error? }>`
  - `signOut()` → `Promise<void>`
  - `initSync(config)` — same interface as `initCloudSync`: `{ appKey, syncedKeys, syncedPrefixes, onApplied }`
  - `onAuthChange(fn)` — register callback `fn(user)` for auth state changes

**Notes for the implementer:**

The module must:
1. Import Supabase config from `window.DASH_SUPABASE_URL/KEY` (set by `/api/config`).
2. Create ONE shared `supabase.createClient()` instance (so auth session is shared across all modules).
3. Call `supa.auth.getSession()` on load to restore any prior session.
4. Subscribe to `supa.auth.onAuthStateChange` to react to sign-in/sign-out.
5. **Secrets denylist**: never include `whoop_tokens_v1`, `whoop_last_sync`, `nova_lite_api_key` in any sync payload.
6. `initSync()` works like `initCloudSync()` but:
   - Uses `user_app_state` table instead of `app_state`.
   - Only operates if `auth.user` is non-null; if called before auth ready, **queues** the config and applies it once auth resolves.
   - On first load with data, checks if any remote rows exist for this user. If none, uploads local data as initial backup (only non-secret keys). If remote data exists, downloads it.
   - If `auth.user` becomes null (sign-out), stops pushing.
   - Realtime subscription on `user_app_state` filtered by `user_id = eq.<auth.uid()>`.
7. The `localStorage.setItem/removeItem` monkey-patch must use the secrets denylist check.
8. `applyRemote()` should **not** delete local keys absent from remote (the old `initCloudSync` did this, which is too aggressive). Instead, only update keys present in remote.

**Key implementation details:**

```js
// Secrets that must never be synced
const SYNC_DENY = new Set([
  'whoop_tokens_v1',
  'whoop_last_sync',
  'nova_lite_api_key'
]);

function isAllowedKey(k) {
  return !SYNC_DENY.has(k);
}
```

For the initial upload flow:
```js
async function checkAndUploadInitial(config) {
  if (!auth.user) return;
  const { data } = await supa
    .from('user_app_state')
    .select('key')
    .eq('user_id', auth.user.id)
    .limit(1);
  // No rows yet → offer initial upload
  if (!data || data.length === 0) {
    // Show a small persistent banner: "Back up your data to the cloud?"
    // If user confirms, push all non-secret local keys
    await doInitialUpload();
  }
}
```

- [ ] **Step 1: Write `auth-sync.js`** — Auth + sync module. Include:
  - Shared Supabase client creation
  - Auth session restore on load
  - `signIn`, `signUp`, `signOut` wrappers
  - Secrets denylist
  - `initSync(config)` with queue-until-auth-ready logic
  - Realtime subscription per appKey scoped to `user_id`
  - Debounced push to `user_app_state`
  - Initial-upload detection + banner UI + confirmation dialog
  - `pushNow()` uses `supa.from('user_app_state').upsert()` (no onConflict needed — PK is `(user_id, key)`)
  - `flushOnUnload` keepalive fetch to `rest/v1/user_app_state?on_conflict=user_id,key` with auth Bearer token from session

- [ ] **Step 2: Commit**

```bash
git add auth-sync.js && git commit -m "feat: add authenticated cloud sync module (auth-sync.js)"
```

---

### Task 3: Update `topbar.js` — Add auth UI

**Files:**
- Modify: `topbar.js` — append auth button + status to the topbar HTML

**Interfaces:**
- Consumes: `window.auth` from `auth-sync.js`
- Produces: Auth button in topbar, login modal, sign-out action

**Description:**

Add to the existing `topbarHtml` string a **login button** on the right side of the topbar:

```html
<button class="topbar-auth-btn" id="topbarAuthBtn" type="button" title="Account">
  <span class="topbar-auth-icon" id="topbarAuthIcon">🔐</span>
</button>
```

Add the corresponding CSS for the auth button (same style as `topbar-finance-btn`).

Add the **auth modal HTML** (hidden by default):
```html
<div class="modal-bg" id="authModalBg" style="display:none">
  <div class="modal" style="max-width:380px">
    <div class="modal-header">
      <span id="authModalTitle">Sign in</span>
      <button class="modal-close" id="authModalClose" type="button">&#x2715;</button>
    </div>
    <div class="auth-form">
      <input type="email" id="authEmail" placeholder="Email" autocomplete="email">
      <input type="password" id="authPassword" placeholder="Password" autocomplete="current-password">
      <div class="auth-actions">
        <button id="authSubmitBtn" type="button">Sign in</button>
        <button id="authToggleBtn" type="button">Create account</button>
      </div>
      <div id="authStatus" class="auth-status"></div>
      <div id="authUserInfo" style="display:none" class="auth-user-info">
        <span id="authUserEmail"></span>
        <button id="authSignOutBtn" type="button">Sign out</button>
      </div>
    </div>
  </div>
</div>
```

Add minimal CSS for the form.

In `boot()`, add:
```js
function boot() {
  injectStyleAndHTML();
  // ... existing code ...
  
  wireAuthUI();
}
```

`wireAuthUI` function:
- Watches `window.auth.ready` (poll or interval; simplest: check after boot until ready, then one-time init).
- When `auth.ready`, if user is logged in shows user email in topbar, if not shows login button.
- Clicking the login button opens the auth modal.
- Modal handles sign in / sign up toggle.
- `authSubmitBtn` calls `window.auth.signIn` or `window.auth.signUp`.
- `authSignOutBtn` calls `window.auth.signOut()`.
- `authToggleBtn` switches between sign-in and sign-up modes.
- `window.auth.onAuthChange(user)` updates the topbar icon and modal state.
- On sign-in success, close modal. If `authSync` offers initial upload, the sync module handles that independently.

- [ ] **Step 1: Edit `topbar.js`** — Append auth button HTML to `topbarHtml`, append modal HTML, append auth CSS, add `wireAuthUI()` and call it from `boot()`.

- [ ] **Step 2: Commit**

```bash
git add topbar.js && git commit -m "feat(topbar): add login/account UI for authenticated sync"
```

---

### Task 4: Update `index.html` — Wire body-profile sync

**Files:**
- Modify: `index.html` (the home page)

**Description:**

`index.html` already loads `sync.js` but never calls `initCloudSync`. The body profile (`po_water_v1`) is saved via `saveJSON(WATER_KEY, ...)` on line ~489 but only reaches Supabase if the topbar water +1 button is pressed.

Changes needed:
1. Add `<script src="auth-sync.js" defer></script>` after the existing `sync.js` include.
2. At the bottom of the page's existing `DOMContentLoaded` script (around line 570), add:

```js
/* ---------- Cloud sync for body profile ---------- */
(function () {
  if (typeof window.auth === 'undefined' || !window.auth) return;
  
  function syncWater() {
    // Only needed for the home page; health.html has its own sync.
    // But we wire it here so home-page profile edits reach the cloud.
    if (!window.auth) return;
    // auth-sync handles the actual push — we just need to make
    // sure localStorage changes to po_water_v1 get picked up.
  }
  
  // Wait for auth to be ready, then init sync
  var waitForAuth = setInterval(function () {
    if (window.auth && window.auth.ready) {
      clearInterval(waitForAuth);
      window.auth.initSync({
        appKey: 'home',
        syncedKeys: ['po_water_v1'],
        onApplied: function () {
          window.dispatchEvent(new Event('storage'));
        }
      });
    }
  }, 100);
})();
```

3. Additionally, add a `<script>` block to show the **initial-upload prompt** — but `auth-sync.js` handles this internally (it shows its own banner when it detects an empty cloud account with local data). So `index.html` just activates `auth-sync`.

- [ ] **Step 1: Edit `index.html`** — Add `auth-sync.js` script tag and the sync-wire script block at the bottom.

- [ ] **Step 2: Commit**

```bash
git add index.html && git commit -m "feat(home): sync body profile to authenticated cloud sync"
```

---

### Task 5: Migrate remaining pages to authenticated sync

**Files (batch):**
- Modify: `health.html`
- Modify: `main.html`
- Modify: `nutrition.html`
- Modify: `caffeine.html`
- Modify: `po-water.html`
- Modify: `finance.html`
- Modify: `template.html`

**Description:**

Each page currently calls `initCloudSync({ appKey, syncedKeys, syncedPrefixes, onApplied })`. We need to:

1. Add `<script src="auth-sync.js" defer></script>` **after** `sync.js` (or replace the sync.js include entirely — but keep `sync.js` loaded for now as a fallback).
2. Replace `initCloudSync(...)` with:

```js
(function () {
  if (typeof window.auth === 'undefined' || !window.auth) return;
  var waitForAuth = setInterval(function () {
    if (window.auth && window.auth.ready) {
      clearInterval(waitForAuth);
      window.auth.initSync({
        appKey: '<same-app-key>',
        syncedKeys: <same-array>,
        syncedPrefixes: <same-array>,
        onApplied: <same-callback>
      });
    }
  }, 100);
})();
```

The key difference: `auth.initSync` uses the authenticated `user_app_state` table instead of the anonymous `app_state`. The old `initCloudSync` call can remain (it will still push to the anonymous table) or be removed — removing it is cleaner.

**For each page, the specific changes:**

| Page | appKey | syncedKeys | syncedPrefixes | onApplied |
|------|--------|------------|----------------|-----------|
| `health.html` | `'health'` | `['stack:items','stack:version','stack:low','po_water_v1']` | `['stack:taken:']` | `window.dispatchEvent(new Event('storage'))` |
| `main.html` | `'goals'` | `[]` | `['goals:']` | `window.dispatchEvent(new CustomEvent('goals-changed')); window.dispatchEvent(new Event('storage'))` |
| `nutrition.html` | `'nutrition'` | `[KEYS.profile, KEYS.targets, KEYS.meals]` | `[]` | `refreshUI()` |
| `caffeine.html` | `'caffeine'` | `[LOGS_KEY, CUSTOM_KEY]` | `[]` | function that re-loads logs/custom + re-renders |
| `po-water.html` | `'health'` | `['po_water_v1']` | `[]` | `window.dispatchEvent(new Event('storage'))` |
| `finance.html` | `'finance'` | <same as current> | <same> | <same> |
| `template.html` | `'template'` | <same as current> | <same> | <same> |

- [ ] **Step 1: Edit `health.html`** — Add auth-sync.js script tag + replace `initCloudSync` with `auth.initSync` wrapper.

- [ ] **Step 2: Edit `main.html`** — Same pattern.

- [ ] **Step 3: Edit `nutrition.html`** — Same pattern.

- [ ] **Step 4: Edit `caffeine.html`** — Same pattern.

- [ ] **Step 5: Edit `po-water.html`** — Same pattern.

- [ ] **Step 6: Edit `finance.html`** — Same pattern.

- [ ] **Step 7: Edit `template.html`** — Same pattern.

- [ ] **Step 8: Commit**

```bash
git add health.html main.html nutrition.html caffeine.html po-water.html finance.html template.html && git commit -m "feat: migrate all pages to authenticated cloud sync"
```

---

### Task 6: Migrate `gym.html` — Replace inline sync clone

**Files:**
- Modify: `gym.html`

**Description:**

`gym.html` has its own inline copy of the sync logic (~240 lines, `pcInitCloudSync` function, `pcPushNow`, `pcCollectState`, etc.). Replace it with the shared `auth.initSync`.

The gym's sync is special in two ways:
1. Photos have `dataUrl` (base64) that should NOT be included in push payloads (photo JPEGs go to Supabase Storage separately).
2. Photos `dataUrl` should not be stripped from local storage.

We handle this by:
1. Adding the `po_coach_*` keys to `syncedKeys`.
2. The `auth-sync.js` secrets denylist is too narrow (it prevents WHOOP/NIM keys). For photos, we need a **transform** mechanism. The simplest approach: the gym page passes a `transformPush` callback that strips `dataUrl` fields from photos before the upsert.
3. **BUT** `auth-sync.js` doesn't have a `transformPush` callback (yet). Instead, we can modify the gym page to:
   - Strip `dataUrl` from `po_coach_photos` in localStorage before the sync picks it up (preserving it in a separate temp key first).
   
   Actually that's hacky. Better approach: add an optional `transformPush(state) => state` callback to `initSync`. This is a small, clean addition.

**Changes to `auth-sync.js`:** Add optional `config.transformPush(state)` callback that runs the collected state through a user-provided transform before pushing. This is invoked after the denylist filter.

```js
// In pushNow():
const state = collect();
const transformed = config.transformPush ? config.transformPush(state) : state;
const json = JSON.stringify(transformed);
```

**Changes to `gym.html`:**
1. Remove all `pc*` sync functions (lines ~3327–3560).
2. Add auth-sync script tag.
3. Call `window.auth.initSync()` with the photo-specific transform:

```js
window.auth.initSync({
  appKey: 'po-coach',
  syncedKeys: ['po_coach_v1', 'po_coach_workout_done', 'po_coach_weights', 'po_coach_photos'],
  transformPush: function(state) {
    // Strip dataUrl from photo entries before pushing (they're too large for the sync payload)
    if (state.po_coach_photos && Array.isArray(state.po_coach_photos)) {
      state = Object.assign({}, state, {
        po_coach_photos: state.po_coach_photos.map(function(p) {
          var copy = Object.assign({}, p);
          delete copy.dataUrl;
          return copy;
        })
      });
    }
    return state;
  },
  onApplied: function() {
    pcMaybeApplyRemote(window.auth.supa); // existing function handles remote state
  }
});
```

Wait, but the existing `pcMaybeApplyRemote` logic is part of the old inline sync. The new `auth.initSync.applyRemote` will handle applying remote data. We need to make sure the gym still works with the new apply logic.

Actually, let me simplify: just use `onApplied` to re-render the gym UI, same as other pages. The default `applyRemote` in `auth-sync.js` (which only updates keys present in remote, doesn't delete local-only keys) will do the right thing. The `dataUrl` stripping only happens on push — local data retains the base64.

- [ ] **Step 1: Edit `auth-sync.js`** — Add optional `config.transformPush(state)` callback support.

- [ ] **Step 2: Edit `gym.html`** — Remove all `pc*` sync functions (lines ~3327–3560 inclusive). Add auth-sync script tag. Add `window.auth.initSync()` call with `transformPush` for photos.

- [ ] **Step 3: Commit**

```bash
git add auth-sync.js gym.html && git commit -m "feat(gym): replace inline sync with shared authenticated sync"
```

---

### Task 7: Cleanup and verify

**Files:**
- Review: all modified files

**Description:**

1. Verify no page still calls `initCloudSync` (old anonymous sync). The old `sync.js` remains as a fallback for any pages that aren't fully migrated, but all active pages should use `auth.initSync`.

2. Verify the secrets denylist in `auth-sync.js` covers all secret keys:
   - `whoop_tokens_v1`
   - `whoop_last_sync`
   - `nova_lite_api_key`

3. Test the flow:
   - Open page without being signed in → topbar shows login icon, no sync happens, local data works
   - Sign up with email/password → modal confirms, topbar shows email
   - First login → initial-upload banner appears, confirms, data uploaded
   - Open on second device → sign in → existing cloud data downloads
   - Change data on device A → appears on device B within ~1s (realtime)
   - Sign out → topbar shows login icon, local data preserved, no cloud writes

4. Verify that `whoop_tokens_v1` is NOT in any `user_app_state` row (check via Supabase table browser).

- [ ] **Step 1: Final review** — Grep for remaining `initCloudSync` calls (they should be replaced by `auth.initSync`). If any remain, migrate them.

- [ ] **Step 2: Commit any remaining changes**

```bash
git add -A && git commit -m "chore: cleanup old sync references, finalize auth sync migration"
```
