// =============================================================
// Persistent dashboard top bar.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// It self-injects HTML + CSS, reads progress from the same
// localStorage keys the dashboard's tabs already use, and a
// water "+1" button writes to localStorage and (if configured)
// pushes a merged update to the Supabase health row so the
// new bottle appears on every device within ~1 second.
// =============================================================
// Phase 2 redesign (restrained native):
//   - 5-slot bottom nav: Home · Quick Log · Health · Fitness · More
//     (truthful active state via per-page data-page, replaces the
//     lying 3-tab bar and the default-to-main fallback).
//   - Inline SVG icons replace emoji + the grayscale-filter trick.
//   - Flat accent active state; 44px targets; safe-area aware.
//   - lockGestures() (iOS zoom lockdown) removed.
// All data keys, Supabase writes, sync, and the 6 AM active-date
// logic are unchanged.
// =============================================================
(function () {
  'use strict';

  // -------- Supabase config (same project as the rest of the dashboard) --------
  // For your audience's standalone, replace these with placeholders
  // and have them paste their own values, just like the other pages.
  // Prefer Vercel env vars (served via /api/config → window.DASH_*),
  // otherwise fall back to these defaults.
  const TOPBAR_SUPABASE_URL = (window.DASH_SUPABASE_URL) || 'https://srajryooffirbroltjmg.supabase.co';
  const TOPBAR_SUPABASE_KEY = (window.DASH_SUPABASE_KEY) || 'sb_publishable_5142ZwTLF_DkSVRzciNuRA_bHwRAu4c';

  // -------- SVG icon set (24px stroke icons, 1.8 stroke) --------
  const ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/></svg>',
    water: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c3.5 4.2 6 7.6 6 11a6 6 0 1 1-12 0c0-3.4 2.5-6.8 6-11z"/><path d="M9.5 14a2.6 2.6 0 0 0 2.5 2.6"/></svg>',
    health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.8h3.4a1 1 0 0 1 1 1V8l3.5 3.5a1 1 0 0 1 0 1.4L14.7 16.4v3.2a1 1 0 0 1-1 1h-3.4a1 1 0 0 1-1-1v-3.2l-3.5-3.5a1 1 0 0 1 0-1.4L9.3 8V4.8a1 1 0 0 1 1-1z"/><path d="M12 8l-2 4h3l-2 4"/></svg>',
    fitness: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 6.5 17.5 17.5"/><path d="M4 8 2.5 9.5 6.5 13.5 8 12"/><path d="M20 8l1.5 1.5-4 4L16 12"/><path d="M6.5 4 8 5.5"/><path d="M17.5 16 19 17.5"/></svg>',
    finance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V10"/><path d="M9.5 19V5"/><path d="M15 19v-7"/><path d="M20 19V8"/><rect x="2.5" y="19.5" width="19" height="2.5"/></svg>',
    caffeine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"/><path d="M16 9h1.5a2 2 0 0 1 2 2v.5a2 2 0 0 1-2 2H16"/><path d="M8 4.5 7 6.5"/><path d="M12 4.5 11 6.5"/><path d="M16 4.5 15 6.5"/></svg>',
    nutrition: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3c0 3-1.5 5-1.5 8 0 4 3 8 7 8s7-4 7-8c0-3-1.5-5-1.5-8"/><path d="M12 3v16"/><path d="M8.5 3c0 3-1 5-1 7"/><path d="M15.5 3c0 3 1 5 1 7"/></svg>',
    nova: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c1 3.5 2 4.5 4.5 5-2.5.5-3.5 1.5-4.5 5-1-3.5-2-4.5-4.5-5C10 7.5 11 6.5 12 3z"/><path d="M18.5 14c.6 2 1.2 2.6 2.5 3-1.3.4-1.9 1-2.5 3-.6-2-1.2-2.6-2.5-3 1.3-.4 1.9-1 2.5-3z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.2-3.4 3.7-5 7-5s5.8 1.6 7 5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
  };
  function icon(name) { return ICONS[name] || ''; }

  // -------- CSS --------
  const css = `
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; justify-content: flex-end; align-items: center;
  gap: 8px;
  padding: max(10px, env(safe-area-inset-top)) 14px 8px;
  background: #0a0a0b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.topbar svg { display: block; }
.topbar-water-wrap { display: flex; align-items: stretch; }
.topbar-water-pill {
  display: inline-flex; align-items: center; gap: 8px;
  min-height: 44px;
  padding: 0 14px;
  background: rgba(125, 211, 252, 0.08);
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-right: none;
  border-radius: 14px 0 0 14px;
  text-decoration: none;
  color: #FAFAFA;
  -webkit-tap-highlight-color: transparent;
}
.topbar-water-pill .topbar-pill-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #7DD3FC; flex-shrink: 0;
}
.topbar-water-pill.warn .topbar-pill-dot { background: #fbbf24; }
.topbar-water-pill.miss .topbar-pill-dot {
  background: #ff8a8a;
  animation: topbar-miss-pulse 1.6s ease-in-out infinite;
}
@keyframes topbar-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--danger, #ff6b6b) 45%, transparent); }
  50%      { box-shadow: 0 0 0 5px color-mix(in srgb, var(--danger, #ff6b6b) 0%, transparent); }
}
.topbar-pill-count {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px; font-weight: 700;
  color: #FAFAFA;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.topbar-water-add {
  width: 48px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  background: rgba(125, 211, 252, 0.16);
  color: #7DD3FC;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  border-radius: 0 14px 14px 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.10s;
}
.topbar-water-add:active { transform: scale(0.94); }
.topbar-water-add.flash {
  background: rgba(125, 211, 252, 0.45);
  color: #0a0a0b;
}
.topbar-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 48px; height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  color: var(--text-secondary, #B8B6B0);
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, color 0.15s;
}
.topbar-icon-btn svg { width: 22px; height: 22px; }
.topbar-icon-btn:hover { background: rgba(255, 255, 255, 0.08); color: #FAFAFA; }
.topbar-auth-btn.logged-in {
  background: rgba(125, 211, 252, 0.12);
  border-color: rgba(125, 211, 252, 0.3);
  color: #7DD3FC;
}

/* Auth modal overlay (reuses modal-bg/modal classes from pages that define them) */
#authModalBg {
  position: fixed; inset: 0; z-index: 120; display: none;
  align-items: center; justify-content: center; padding: 20px;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
#authModalBg.show { display: flex; }
#authModalBg .modal {
  width: 100%; max-width: 380px; max-height: 88vh; overflow-y: auto;
  background: #0e0e10; border: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px; padding: 22px; box-shadow: 0 24px 70px rgba(0,0,0,0.6);
}
#authModalBg .modal .modal-header {
  display: flex; align-items: center; justify-content: space-between;
}

/* Bottom tab bar — 5-slot, SVG icons, truthful active state */
.bottombar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
  display: flex; justify-content: space-around; align-items: stretch;
  padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
  background: #0a0a0b;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.bottombar-tab {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px;
  padding: 7px 0 5px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.45);
  font-size: 10px; font-weight: 600;
  letter-spacing: 0.02em;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s;
  position: relative;
}
.bottombar-tab-icon { display: flex; align-items: center; justify-content: center; }
.bottombar-tab-icon svg { width: 24px; height: 24px; }
.bottombar-tab.active { color: #FAFAFA; }
.bottombar-tab.active .bottombar-tab-icon {
  color: var(--accent, #6BE3A4);
}
/* accent underline instead of glow/brightness trick */
.bottombar-tab.active::after {
  content: ''; position: absolute; top: -1px; left: 24%; right: 24%; height: 2px;
  background: var(--accent, #6BE3A4); border-radius: 0 0 2px 2px;
}
.bottombar-tab:active .bottombar-tab-icon { transform: scale(0.92); }

/* Quick Log hub bottom sheet */
#qlBackdrop {
  position: fixed; inset: 0; z-index: 110; display: none;
  background: rgba(0,0,0,0.5);
}
#qlBackdrop.show { display: block; }
.ql-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 111;
  background: #0E0E10;
  border-top: 1px solid rgba(255,255,255,0.08);
  border-radius: 18px 18px 0 0;
  padding: 10px 14px calc(18px + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  max-height: 74vh; overflow-y: auto;
}
.ql-sheet.open { transform: translateY(0); }
.ql-grabber {
  width: 40px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.14); margin: 2px auto 12px;
}
.ql-title {
  font-size: 16px; font-weight: 700; color: #FAFAFA;
  margin-bottom: 4px;
}
.ql-sub { font-size: 12px; color: #76746E; margin-bottom: 14px; }
.ql-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.ql-item {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  color: #FAFAFA; font-size: 12px; font-weight: 600;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.10s;
}
.ql-item:active { transform: scale(0.96); }
.ql-item svg { width: 22px; height: 22px; }
.ql-item.water   { color: #7DD3FC; }
.ql-item.health  { color: #1D9E75; }
.ql-item.fitness { color: #7C5CFF; }
.ql-item.caffeine{ color: #C9A36B; }
.ql-item.nutrition{ color: #FBBF24; }
.ql-item.nova    { color: #A78BFA; }
@media (max-width: 380px) {
  .ql-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Push page content above the fixed bottom bar */
body.has-bottombar {
  padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important;
}

@media (max-width: 480px) {
  .topbar { padding-left: 10px; padding-right: 10px; gap: 6px; }
  .topbar-water-pill { padding: 0 11px; gap: 6px; }
  .topbar-pill-count { font-size: 12px; }
  .topbar-water-add { width: 44px; }
  .topbar-icon-btn { width: 44px; height: 40px; }
  .bottombar-tab { font-size: 10px; }
  .bottombar-tab-icon svg { width: 22px; height: 22px; }
}
`;

  // -------- HTML --------
  const topbarHtml = `
<header class="topbar" id="topbar" role="navigation" aria-label="Quick actions">
  <div class="topbar-water-wrap">
    <a href="po-water.html" class="topbar-water-pill" id="topbarWater" aria-label="Water progress">
      <span class="topbar-pill-dot"></span>
      <span class="topbar-pill-count" id="topbarWaterCount">0/0</span>
    </a>
    <button class="topbar-water-add" id="topbarWaterAdd" aria-label="Log one drink" type="button">${icon('plus')}</button>
  </div>
  <a href="finance.html" class="topbar-icon-btn topbar-finance-btn" id="topbarFinance" aria-label="Finance">${icon('finance')}</a>
  <button class="topbar-icon-btn topbar-auth-btn" id="topbarAuthBtn" type="button" title="Account" aria-label="Account">${icon('user')}</button>
</header>
`;

  const bottombarHtml = `
<nav class="bottombar" id="bottombar" role="navigation" aria-label="Main tabs">
  <a href="index.html" class="bottombar-tab" data-page="main">
    <span class="bottombar-tab-icon">${icon('home')}</span>
    <span>Home</span>
  </a>
  <button class="bottombar-tab" data-page="quick" id="quickLogTab" type="button" aria-haspopup="dialog" aria-expanded="false">
    <span class="bottombar-tab-icon">${icon('bolt')}</span>
    <span>Quick Log</span>
  </button>
  <a href="health.html" class="bottombar-tab" data-page="health">
    <span class="bottombar-tab-icon">${icon('health')}</span>
    <span>Health</span>
  </a>
  <a href="gym.html" class="bottombar-tab" data-page="fitness">
    <span class="bottombar-tab-icon">${icon('fitness')}</span>
    <span>Fitness</span>
  </a>
  <a href="nova-lite.html" class="bottombar-tab" data-page="more">
    <span class="bottombar-tab-icon">${icon('more')}</span>
    <span>More</span>
  </a>
</nav>
`;

  // -------- Quick Log hub sheet --------
  const quickLogHtml = `
<div id="qlBackdrop"></div>
<div class="ql-sheet" id="qlSheet" role="dialog" aria-modal="true" aria-label="Quick log">
  <div class="ql-grabber"></div>
  <div class="ql-title">Quick log</div>
  <div class="ql-sub">Log something in seconds</div>
  <div class="ql-grid">
    <a class="ql-item water" href="po-water.html">${icon('water')}<span>Water</span></a>
    <a class="ql-item health" href="health.html">${icon('health')}<span>Stack</span></a>
    <a class="ql-item fitness" href="gym.html">${icon('fitness')}<span>Gym</span></a>
    <a class="ql-item caffeine" href="caffeine.html">${icon('caffeine')}<span>Caffeine</span></a>
    <a class="ql-item nutrition" href="nutrition.html">${icon('nutrition')}<span>Meal</span></a>
    <a class="ql-item nova" href="nova-lite.html">${icon('nova')}<span>Nova</span></a>
  </div>
</div>
`;

  // Pages where we suppress the app chrome: finance has its own internal
  // 5-tab bottom nav and self-contained back button.
  function isFinancePage() {
    const p = (window.location.pathname || '').toLowerCase();
    return p.endsWith('/finance.html') || p.endsWith('finance.html');
  }
  // When the water tracker is iframed inside health.html, the embedded
  // page shouldn't render its own chrome again.
  function isEmbedded() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }
  function shouldShowChrome() {
    return !isFinancePage() && !isEmbedded();
  }
  // Truthful active state: every page declares its own slot.
  // Declared via <body data-nav="home|health|fitness|more"> (Home = index,
  // More = nova/avatar/main/settings catch-all). Falls back to the
  // legacy currentPageKey() so existing pages stay truthful while migrating.
  function currentPageKey() {
    const b = document.body;
    if (b && b.getAttribute && b.getAttribute('data-nav')) return b.getAttribute('data-nav');
    const p = (window.location.pathname || '').toLowerCase();
    if (p.endsWith('index.html') || p.endsWith('/')) return 'main';
    if (p.endsWith('health.html')) return 'health';
    if (p.endsWith('gym.html')) return 'fitness';
    return 'more'; // caffeine, nutrition, nova, avatar, water, anything else
  }

  function injectStyleAndHTML() {
    if (document.getElementById('topbar') || document.getElementById('bottombar')) return;
    if (!shouldShowChrome()) return;

    const style = document.createElement('style');
    style.id = 'topbar-style';
    style.textContent = css;
    document.head.appendChild(style);

    const topWrap = document.createElement('div');
    topWrap.innerHTML = topbarHtml.trim();
    document.body.insertBefore(topWrap.firstChild, document.body.firstChild);

    const bottomWrap = document.createElement('div');
    bottomWrap.innerHTML = bottombarHtml.trim();
    document.body.appendChild(bottomWrap.firstChild);

    // Quick Log hub (sheet + backdrop), appended after the bottom bar.
    const qlWrap = document.createElement('div');
    qlWrap.innerHTML = quickLogHtml.trim();
    document.body.appendChild(qlWrap.firstChild);
    wireQuickLog();

    // Highlight the active bottom tab.
    const active = currentPageKey();
    document.querySelectorAll('.bottombar-tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-page') === active);
    });

    // Inject auth modal
    const authWrap = document.createElement('div');
    authWrap.innerHTML = authModalHtml.trim();
    document.body.appendChild(authWrap.firstChild);

    // Reserve room above the fixed bottom bar so page content can scroll
    // past it without being hidden.
    document.body.classList.add('has-bottombar');
  }

  // -------- Quick Log hub behavior --------
  function wireQuickLog() {
    const trigger = document.getElementById('quickLogTab');
    const sheet = document.getElementById('qlSheet');
    const backdrop = document.getElementById('qlBackdrop');
    if (!trigger || !sheet || !backdrop) return;

    function open() {
      backdrop.classList.add('show');
      sheet.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
    function close() {
      backdrop.classList.remove('show');
      sheet.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
    trigger.addEventListener('click', () => (sheet.classList.contains('open') ? close() : open()));
    backdrop.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sheet.classList.contains('open')) close();
    });
    // Close on navigation (any quick-log link navigates away anyway).
  }

  // -------- Active-date helpers (match the goals page 6 AM rollover) --------
  function activeDateKey() {
    const now = new Date();
    const d = new Date(now);
    if (now.getHours() < 6) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function calendarDateKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // -------- Auth modal HTML --------
  const authModalHtml = `
<div class="modal-bg" id="authModalBg" style="display:none">
  <div class="modal" style="max-width:380px">
    <div class="modal-header">
      <span id="authModalTitle">Sign in</span>
      <button class="modal-close" id="authModalClose" type="button">&#x2715;</button>
    </div>
    <div class="auth-form" style="padding:16px;display:flex;flex-direction:column;gap:12px">
      <input type="email" id="authEmail" placeholder="Email" autocomplete="email" style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:8px;color:#FAFAFA;font-size:15px;outline:none;box-sizing:border-box">
      <input type="password" id="authPassword" placeholder="Password" autocomplete="current-password" style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);border-radius:8px;color:#FAFAFA;font-size:15px;outline:none;box-sizing:border-box">
      <div class="auth-actions" style="display:flex;gap:8px">
        <button id="authSubmitBtn" type="button" style="flex:1;padding:10px;border:none;border-radius:8px;background:#7DD3FC;color:#0a0a0b;font-size:14px;font-weight:600;cursor:pointer">Sign in</button>
        <button id="authToggleBtn" type="button" style="flex:1;padding:10px;border:1px solid rgba(255,255,255,0.10);border-radius:8px;background:transparent;color:#FAFAFA;font-size:14px;cursor:pointer">Create account</button>
      </div>
      <div id="authStatus" style="font-size:13px;color:rgba(255,255,255,0.6);text-align:center"></div>
      <div id="authUserInfo" style="display:none;font-size:13px;color:rgba(255,255,255,0.8);text-align:center;padding:8px">
        <div id="authUserEmail" style="margin-bottom:8px"></div>
        <button id="authSignOutBtn" type="button" style="padding:8px 16px;border:1px solid rgba(239,68,68,0.4);border-radius:8px;background:transparent;color:#ef4444;font-size:13px;cursor:pointer">Sign out</button>
      </div>
    </div>
  </div>
</div>
`;

  // -------- Read progress from localStorage --------
  function getGoalsProgress() {
    const key = 'goals:' + activeDateKey();
    let goals = [];
    try { goals = JSON.parse(localStorage.getItem(key)) || []; } catch (e) {}
    const total = Array.isArray(goals) ? goals.length : 0;
    const done = total ? goals.filter(g => g && g.done).length : 0;
    return { done, total };
  }

  function getStackProgress() {
    let items = [];
    try { items = JSON.parse(localStorage.getItem('stack:items')) || []; } catch (e) {}
    let taken = {};
    try { taken = JSON.parse(localStorage.getItem('stack:taken:' + activeDateKey())) || {}; } catch (e) {}
    const total = Array.isArray(items) ? items.length : 0;
    const done = total ? items.filter(i => i && taken[i.id]).length : 0;
    return { done, total };
  }

  function getWaterProgress() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state) return { done: 0, total: 0 };
    const todayKey = calendarDateKey();
    const done = (state.logs || {})[todayKey] || 0;
    const p = state.profile || { weightKg: 75 };
    const wKg = state.weightUnit === 'lb' ? (p.weightKg || 0) / 2.20462 : (p.weightKg || 0);
    const base = wKg * 35;
    const exercise = (p.activityHrsPerWeek || 0) / 7 * 500;
    const caffeine = Math.max(0, (state.caffeineMgPerDay || 0) - 200) * 1.5;
    const subs = (state.substances || []).reduce((s, x) => {
      const dose = (x && x.dose != null ? x.dose : (x && x.defaultDose)) || 0;
      return s + Math.max(0, dose * ((x && x.mlPerUnit) || 0));
    }, 0);
    let adjust = 0;
    if (p.sex === 'm') adjust += 200;
    if ((p.age || 0) >= 50) adjust += 100;
    const totalMl = base + exercise + caffeine + subs + adjust;
    let unitVol;
    if (state.unit === 'glass') unitVol = state.glassMl || 250;
    else if (state.unit === 'oz') unitVol = 30;
    else if (state.unit === 'ml') unitVol = 1;
    else unitVol = state.bottleMl || 500;
    const total = Math.max(1, Math.ceil(totalMl / unitVol));
    return { done, total };
  }

  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    if (done >= total * 0.5) return 'warn';
    // Past 6pm and still under half → flag as missed
    const h = new Date().getHours();
    if (h >= 18 && done < total * 0.5) return 'miss';
    return 'warn';
  }

  function setPillStatus(pillEl, status) {
    pillEl.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') pillEl.classList.add(status);
  }

  function render() {
    const waterEl = document.getElementById('topbarWater');
    if (!waterEl) return; // not injected yet

    const w = getWaterProgress();
    const countEl = document.getElementById('topbarWaterCount');
    if (countEl) countEl.textContent = w.total ? w.done + '/' + w.total : '0/0';
    setPillStatus(waterEl, classifyStatus(w.done, w.total));
  }

  // -------- Water +1 (works from any page) --------
  function defaultWaterState() {
    return {
      unit: 'bottle', bottleMl: 500, glassMl: 250, weightUnit: 'kg',
      profile: { weightKg: 75, age: 25, sex: 'm', activityHrsPerWeek: 5 },
      caffeineMgPerDay: 200, substances: [], logs: {}
    };
  }

  async function pushWaterMergedToSupabase(localWater) {
    // When authenticated, use auth-sync's supa to push directly to user_app_state.
    // The monkey-patch won't catch this key on pages that don't register po_water_v1.
    if (window.auth && window.auth.supa && window.auth.user) {
      try {
        await window.auth.supa.from('user_app_state').upsert(
          { user_id: window.auth.user.id, key: 'health', data: { po_water_v1: localWater }, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,key' }
        );
      } catch (e) {}
      return;
    }

    // Only do this when we're NOT on the health page — health page
    // has its own sync that already detects the localStorage change.
    if (window.location.pathname.endsWith('/health.html') ||
        window.location.pathname.endsWith('health.html')) return;

    if (!window.supabase || !TOPBAR_SUPABASE_URL || !TOPBAR_SUPABASE_KEY) return;
    if (TOPBAR_SUPABASE_URL.indexOf('PASTE-') === 0) return;

    try {
      const supa = window.supabase.createClient(TOPBAR_SUPABASE_URL, TOPBAR_SUPABASE_KEY);
      const { data } = await supa
        .from('app_state').select('data').eq('key', 'health').maybeSingle();
      const current = (data && data.data) || {};
      const merged = Object.assign({}, current, { po_water_v1: localWater });
      await supa.from('app_state').upsert(
        { key: 'health', data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch (e) { /* offline — local change will sync next time user visits health */ }
  }

  function addWater() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state || typeof state !== 'object') state = defaultWaterState();
    state.logs = state.logs || {};
    const k = calendarDateKey();
    state.logs[k] = (state.logs[k] || 0) + 1;
    try { localStorage.setItem('po_water_v1', JSON.stringify(state)); } catch (e) {}
    render();

    const btn = document.getElementById('topbarWaterAdd');
    if (btn) {
      btn.classList.add('flash');
      setTimeout(() => btn.classList.remove('flash'), 220);
    }

    pushWaterMergedToSupabase(state);
  }

  // -------- Modal scroll lock --------
  // Watch every known modal-bg / overlay class — when any one of them
  // gets `.show` or `.is-open`, lock the body scroll. When the last
  // one closes, unlock.
  function startModalLock() {
    const MODAL_SELECTORS = [
      '.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam'
    ];
    function anyOpen() {
      for (const sel of MODAL_SELECTORS) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) {
            return true;
          }
        }
      }
      return false;
    }
    function sync() {
      document.body.classList.toggle('topbar-modal-open', anyOpen());
    }
    const observer = new MutationObserver(sync);
    // Observe class changes anywhere in body — modal toggles are rare so
    // a global subtree observer is cheap.
    observer.observe(document.body, {
      attributes: true, attributeFilter: ['class'], subtree: true
    });
    sync();
  }

  // -------- Auth UI --------
  function wireAuthUI() {
    var authBtn = document.getElementById('topbarAuthBtn');
    if (!authBtn) return;

    var bg = document.getElementById('authModalBg');
    var closeBtn = document.getElementById('authModalClose');
    var title = document.getElementById('authModalTitle');
    var emailInput = document.getElementById('authEmail');
    var passInput = document.getElementById('authPassword');
    var submitBtn = document.getElementById('authSubmitBtn');
    var toggleBtn = document.getElementById('authToggleBtn');
    var statusEl = document.getElementById('authStatus');
    var userInfo = document.getElementById('authUserInfo');
    var userEmail = document.getElementById('authUserEmail');
    var signOutBtn = document.getElementById('authSignOutBtn');

    var isSignUp = false; // true = create-account, false = sign-in

    function showStatus(msg, isError) {
      if (statusEl) {
        statusEl.textContent = msg;
        statusEl.style.color = isError ? '#ef4444' : 'rgba(255,255,255,0.6)';
      }
    }

    function updateAuthUI(user) {
      if (!authBtn || !bg) return;
      if (user) {
        authBtn.classList.add('logged-in');
        if (userEmail) userEmail.textContent = user.email || 'Signed in';
        if (userInfo) userInfo.style.display = 'block';
        if (bg) bg.style.display = 'none';
        showStatus('', false);
      } else {
        authBtn.classList.remove('logged-in');
        if (userInfo) userInfo.style.display = 'none';
      }
    }

    // Initial state
    if (window.auth && window.auth.user) {
      updateAuthUI(window.auth.user);
    }

    // Listen for auth changes
    if (window.auth && window.auth.onAuthChange) {
      window.auth.onAuthChange(function (user) {
        updateAuthUI(user);
      });
    }

    // Open modal
    authBtn.addEventListener('click', function () {
      if (bg) {
        bg.style.display = 'flex';
        if (window.auth && window.auth.user && userInfo) {
          userInfo.style.display = 'block';
          if (userEmail) userEmail.textContent = window.auth.user.email || 'Signed in';
        }
      }
    });

    // Close modal helpers
    function closeModal() {
      if (bg) bg.style.display = 'none';
      if (passInput) passInput.value = '';
      showStatus('', false);
    }
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (bg) bg.addEventListener('click', function (e) {
      if (e.target === bg) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && bg && bg.style.display !== 'none') closeModal();
    });

    // Toggle sign-in / create-account
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        isSignUp = !isSignUp;
        if (title) title.textContent = isSignUp ? 'Create account' : 'Sign in';
        if (submitBtn) submitBtn.textContent = isSignUp ? 'Create account' : 'Sign in';
        if (toggleBtn) toggleBtn.textContent = isSignUp ? 'Sign in instead' : 'Create account';
        showStatus('', false);
      });
    }

    // Submit
    if (submitBtn) {
      submitBtn.addEventListener('click', async function () {
        var email = emailInput ? emailInput.value.trim() : '';
        var pass = passInput ? passInput.value : '';
        if (!email || !pass) {
          showStatus('Please enter email and password', true);
          return;
        }
        showStatus('Working...', false);
        if (!window.auth) {
          showStatus('Auth not available', true);
          return;
        }
        try {
          var result;
          if (isSignUp) {
            result = await window.auth.signUp(email, pass);
          } else {
            result = await window.auth.signIn(email, pass);
          }
          if (result && result.error) {
            showStatus(result.error.message || 'Error', true);
          } else {
            showStatus(isSignUp ? 'Account created! You can now sign in.' : 'Signed in!', false);
            if (passInput) passInput.value = '';
            if (!isSignUp) {
              // Sign-in succeeded — close modal after brief delay
              setTimeout(closeModal, 800);
            }
          }
        } catch (e) {
          showStatus('Connection error', true);
        }
      });
    }

    // Sign out
    if (signOutBtn) {
      signOutBtn.addEventListener('click', function () {
        var a = window.auth;
        if (a && a.signOut) {
          a.signOut();
          closeModal();
        }
      });
    }
  }

  // -------- Boot --------
  function boot() {
    injectStyleAndHTML();
    const btn = document.getElementById('topbarWaterAdd');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); addWater(); });
    render();
    startModalLock();
    wireAuthUI();

    // Re-render when localStorage changes from another tab/window OR when
    // the page becomes visible (sync may have pulled in the background).
    window.addEventListener('storage', render);
    window.addEventListener('focus', render);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

    // Periodic refresh so counts stay current after midnight rollover etc.
    setInterval(render, 30 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
