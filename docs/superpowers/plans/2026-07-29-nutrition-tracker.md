# Nutrition Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete nutrition tracker page with meal logging, auto-calculated macros from a user profile, and Supabase-persisted data.

**Architecture:** Single self-contained HTML page (`nutrition.html`) using localStorage for state with Supabase sync via the existing `initCloudSync` helper. Three tabs: Setup (profile → TDEE → macro targets), Log Meal (meal entry form), Today (SVG progress rings + meal list + daily totals).

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase (via shared sync.js), SVG for progress rings, no build tools.

## Global Constraints

- Must match the existing dashboard dark theme (bg `#050506`, card `rgba(255,255,255,0.04)`, font `-apple-system, "Inter", sans-serif`)
- Uses `initCloudSync` from `sync.js` for Supabase persistence with appKey `'nutrition'`
- Uses `topbar.js` for the shared navigation bar
- Single-file — no external CSS/JS dependencies beyond what the dashboard already loads
- No food database API — meals entered manually with all macros provided

---

### Task 1: HTML Skeleton, CSS Theme & Tab Navigation

**Files:**
- Create: `nutrition.html` (full file)

**Interfaces:**
- Consumes: `sync.js` `initCloudSync`, `topbar.js`, `lock.js` via `<script>` tags
- Produces: The tab-switching framework that Tasks 2-4 fill in

- [ ] **Step 1: Write the HTML structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<script src="lock.js"></script>
<script src="/api/config"></script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#050506">
<meta name="color-scheme" content="dark">
<title>Nutrition — Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="sync.js" defer></script>
<script src="topbar.js" defer></script>
<style>
/* All CSS here */
</style>
</head>
<body>
<!-- Header: back button + title + gear button -->
<!-- Tab bar: Setup | Log Meal | Today -->
<!-- Tab content containers -->
<script>
// All JS here
</script>
</body>
</html>
```

- [ ] **Step 2: Write the CSS design tokens + base styles**

Copy the dashboard's design tokens (--bg, --bg-card, --text-primary etc.), body background with gradient + noise overlay, page layout max-width 720px centered, typography scale.

- [ ] **Step 3: Write tab bar CSS + JS**

Three tab buttons (`data-tab="setup|log|today"`), active state with underline gradient, tab content show/hide with fade animation. Default: show Setup if no profile saved, else show Today.

- [ ] **Step 4: Commit**

```bash
git add nutrition.html
git commit -m "feat(nutrition): add page skeleton, theme, and tab navigation"
```

---

### Task 2: Setup Tab — Profile Form & TDEE Calculation

**Files:**
- Modify: `nutrition.html` (add Setup tab content + TDEE JS logic)

**Interfaces:**
- Consumes: user form input (age, sex, weight, height, activity, goal)
- Produces: `nutrition:profile` + `nutrition:targets` in localStorage

- [ ] **Step 1: Write the Setup tab HTML**

Card with profile form:
- Age (number input, min 10, max 120)
- Sex (select: Male / Female)
- Weight with kg label (number input, step 0.1)
- Height with cm label (number input, step 0.1)
- Activity level (select: Sedentary / Light / Moderate / Heavy / Athlete)
- Goal (select: Lose Weight / Maintain / Gain Weight)
- "Calculate Macros" button
- Results area below (hidden until calculated)

- [ ] **Step 2: Write the TDEE calculation JS**

```js
function calculateTDEE(profile) {
  // Mifflin-St Jeor
  let bmr;
  if (profile.sex === 'male') {
    bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5;
  } else {
    bmr = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age - 161;
  }
  const activityMultipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, heavy: 1.725, athlete: 1.9 };
  const tdee = bmr * activityMultipliers[profile.activity];
  const goalAdjustments = { lose: 0.8, maintain: 1.0, gain: 1.15 };
  const adjustedCalories = Math.round(tdee * goalAdjustments[profile.goal]);
  // Macro split
  const proteinPerKg = profile.goal === 'gain' ? 2.2 : 2.0;
  const protein = Math.round(profile.weightKg * proteinPerKg);
  const fat = Math.round((adjustedCalories * 0.25) / 9);
  const carbs = Math.round((adjustedCalories - (protein * 4) - (fat * 9)) / 4);
  return { calories: adjustedCalories, protein, carbs, fat };
}
```

- [ ] **Step 3: Write results display + save logic**

When "Calculate Macros" is clicked, show results: large calorie number, three macro pills (P/C/F with gram amounts and explanation). A "Save Profile" button writes to localStorage keys `nutrition:profile` and `nutrition:targets`, then switches to the Today tab.

- [ ] **Step 4: Write validation**

All fields required. Age must be 10-120. Weight must be > 0. Height must be > 0. Show inline error messages styled in the warning color.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(nutrition): add profile setup with auto-calculated TDEE and macro targets"
```

---

### Task 3: Log Meal Tab — Meal Entry Form

**Files:**
- Modify: `nutrition.html` (add Log Meal tab content + meal save JS)

**Interfaces:**
- Consumes: user meal input
- Produces: meals stored in `nutrition:meals` localStorage object (date-keyed)

- [ ] **Step 1: Write the Log Meal tab HTML**

Card with:
- Meal name text input with datalist autocomplete of ~20 common foods
- 4 macro inputs in a grid: Calories, Protein (g), Carbs (g), Fat (g) — all number inputs, min 0
- "Log Meal" button
- Status message area below button

Common foods list: Chicken Breast, Salmon, Eggs, Rice, Pasta, Sweet Potato, Broccoli, Spinach, Avocado, Banana, Oats, Greek Yogurt, Almonds, Peanut Butter, Whey Protein, Olive Oil, Whole Wheat Bread, Apple, Mixed Greens, Quinoa, Steak, Milk, Cottage Cheese, Black Beans, Blueberries

- [ ] **Step 2: Write the meal save JS**

On form submit:
1. Validate: name non-empty, all macros >= 0
2. Build meal object: `{ id: 'm_' + Date.now().toString(36), name, calories: +cals, protein: +p, carbs: +c, fat: +f, time: HH:MM string }`
3. Get today's date key (YYYY-MM-DD)
4. Read `nutrition:meals` from localStorage (or `{}`)
5. Append meal to today's array
6. Write back to localStorage
7. Clear form, show success status for 2 seconds

- [ ] **Step 3: Write form validation**

Inline validation: meal name required, all macros ≥ 0. Show red border on invalid fields. Show status message in danger color on failure, success color on success.

- [ ] **Step 4: Edit mode support**

Add a flag `editingMealId`. When set, populate the form from the existing meal, change button text to "Update Meal", and on submit replace the meal in the array rather than appending.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(nutrition): add meal logging form with autocomplete and edit mode"
```

---

### Task 4: Today Tab — Macro Rings & Daily Meal List

**Files:**
- Modify: `nutrition.html` (add Today tab content + SVG ring rendering + daily totals)

**Interfaces:**
- Consumes: `nutrition:meals` (date-keyed), `nutrition:targets` (macro goals)
- Produces: rendered SVG rings, meal list, daily totals

- [ ] **Step 1: Write Today tab HTML**

Layout:
- Date navigator row: ◀ Previous | "Today, Jul 29" | Next ▶ (next disabled if today)
- 4 progress ring cards in a 2×2 grid (or 4-column on wider screens)
- "Meals Today" section heading
- Meal list container (populated by JS)
- Daily totals card at bottom

- [ ] **Step 2: Write SVG progress ring renderer**

```js
function renderRing(svgEl, percent, color) {
  const circle = svgEl.querySelector('.ring-fill');
  const r = 52; // radius
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  circle.style.strokeDasharray = circ;
  circle.style.strokeDashoffset = offset;
  circle.style.stroke = color;
}
```

Each ring:
- 120x120 SVG with a track circle (gray) and fill circle (colored)
- Center overlay: percentage number, macro label, "X / Y g" subtext
- Colors: Calories #FF8A4D, Protein #6B8AFF, Carbs #F2C063, Fat #FF6B9D
- When >= 100%: fill turns #6BE3A4 (or #F2C063 if >120%)

- [ ] **Step 3: Write meal list renderer**

```js
function renderMealList(meals, dateKey) { ... }
```

Each meal row:
- Left: name (bold) + time (subdued)
- Center: macro badges (P: Xg · C: Xg · F: Xg) in small pills
- Right: calorie count + edit/delete icon buttons
- Delete shows a 3-second undo toast before actually removing
- Edit sets the editingMealId flag and switches to Log Meal tab

- [ ] **Step 4: Write daily totals card**

Sum all macros for the selected date, display:
- Big calorie total with "calories" label
- Row below: Protein Xg · Carbs Xg · Fat Xg in smaller text

- [ ] **Step 5: Write date navigator JS**

Previous day button subtracts 1 day, next day adds 1 (capped at today). Update date display, re-render rings + meal list + totals for the new date. Show "No meals logged" empty state when the day has no meals.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(nutrition): add daily summary with SVG macro rings, meal list, and date navigation"
```

---

### Task 5: Persistence Layer & Supabase Sync

**Files:**
- Modify: `nutrition.html` (add `initCloudSync` call + load/refresh lifecycle)

**Interfaces:**
- Consumes: `initCloudSync` from `sync.js`
- Produces: data synced to Supabase `app_state` table

- [ ] **Step 1: Wire up initCloudSync**

```js
if (typeof initCloudSync === 'function') {
  initCloudSync({
    appKey: 'nutrition',
    syncedKeys: ['nutrition:profile', 'nutrition:targets', 'nutrition:meals'],
    onApplied: function() { refreshUI(); }
  });
}
```

The `refreshUI()` function re-reads all data from localStorage and re-renders the current tab.

- [ ] **Step 2: Write data layer helper functions**

```js
// Generic helpers
function getData(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function setData(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

// Specific accessors
function getProfile() { return getData('nutrition:profile', null); }
function getTargets() { return getData('nutrition:targets', null); }
function getMeals(dateKey) { const all = getData('nutrition:meals', {}); return all[dateKey] || []; }
function saveMeal(meal, dateKey) {
  const all = getData('nutrition:meals', {});
  if (!all[dateKey]) all[dateKey] = [];
  all[dateKey].push(meal);
  setData('nutrition:meals', all);
}
function deleteMeal(mealId, dateKey) {
  const all = getData('nutrition:meals', {});
  if (all[dateKey]) {
    all[dateKey] = all[dateKey].filter(m => m.id !== mealId);
    if (all[dateKey].length === 0) delete all[dateKey];
    setData('nutrition:meals', all);
  }
}
function updateMeal(mealId, updates, dateKey) {
  const all = getData('nutrition:meals', {});
  if (all[dateKey]) {
    const idx = all[dateKey].findIndex(m => m.id === mealId);
    if (idx !== -1) { all[dateKey][idx] = { ...all[dateKey][idx], ...updates }; setData('nutrition:meals', all); }
  }
}
```

- [ ] **Step 3: Load data on page init**

On DOMContentLoaded:
1. Load profile + targets from localStorage
2. If profile exists, render Today tab (with today's date) and switch to it
3. If no profile, switch to Setup tab
4. If `onApplied` fires (remote data arrived), re-render current view

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(nutrition): add Supabase sync and data persistence layer"
```

---

### Task 6: Polish — Empty States, Responsive, Animations, Edge Cases

**Files:**
- Modify: `nutrition.html` (add missing states and responsive refinements)

- [ ] **Step 1: Empty states**

Setup tab when no profile: show explanatory text "Set up your profile to calculate your daily macro targets."
Today tab when no meals: centered empty state "No meals logged yet" with a food icon.
Log Meal tab when no profile: message "Please complete setup first" with a link to Setup tab.

- [ ] **Step 2: Responsive styles**

- ≤768px: stack rings into 2 columns, reduce padding, smaller rings
- ≤480px: 1 column rings, full-width inputs, smaller text

- [ ] **Step 3: Ring animation**

Animate SVG rings on render using requestAnimationFrame or CSS transition on stroke-dashoffset. Use a `transition: stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)`.

- [ ] **Step 4: Edge case handling**

- Handle localStorage quota errors (try/catch on setItem)
- Handle corrupt JSON (try/catch on parse)
- Handle negative/zero inputs with clear validation messages
- When editing a meal, preserve the original date key so it works across date navigation

- [ ] **Step 5: Final commit**

```bash
git commit -m "feat(nutrition): add empty states, responsive layout, animations, and edge case handling"
```
