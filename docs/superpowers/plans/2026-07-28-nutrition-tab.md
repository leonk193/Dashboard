# Nutrition Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a nutrition tracking tab in the dashboard that allows users to log meals with photos, track calories and macronutrients, view daily progress, and manage meal history with Supabase synchronization.

**Architecture:** Tabbed interface with three views (Log Meal, Daily Summary, Meal History) using reusable components for forms, progress rings, and meal lists. Data flows from user input through form validation to localStorage, then syncs with Supabase via existing sync.js infrastructure. Storage events enable real-time UI updates across tabs.

**Tech Stack:** HTML5, CSS3, JavaScript ES6, existing dashboard styling patterns, Supabase backend (via sync.js), localStorage for offline fallback.

## Global Constraints

- Follow existing dashboard UI patterns and styling conventions
- Use existing sync.js infrastructure for Supabase synchronization
- Maintain offline capability via localStorage fallback
- Responsive design for mobile and desktop
- No additional external libraries required
- Consistent with dashboard bento grid tile styling
- Accessible UI with ARIA labels and keyboard navigation

---

### Task 1: Create nutrition.html file structure

**Files:**
- Create: `nutrition.html`

**Interfaces:**
- Consumes: None
- Produces: Basic HTML5 structure with linked CSS/JS files

- [ ] **Step 1: Create basic HTML5 document structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#050506">
    <title>Nutrition - Leon Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="sync.js" defer></script>
    <script src="topbar.js" defer></script>
</head>
<body>
    <!-- Content will be added in subsequent steps -->
</body>
</html>
```

- [ ] **Step 2: Add shared design tokens and base styles** (matching dashboard patterns)
- [ ] **Step 3: Commit initial file structure**

```bash
git add nutrition.html
git commit -m "feat(nutrition): create basic HTML structure"
```

### Task 2: Add nutrition tile to dashboard bento grid

**Files:**
- Modify: `index.html:222-336`

**Interfaces:**
- Consumes: None
- Produces: Updated bento grid with nutrition tile

- [ ] **Step 1: Add nutrition tile to bento grid in index.html**

```html
<!-- Tile for Nutrition -->
<a class="tile" href="nutrition.html" style="--accent:#FBBF24">
  <div class="tile-top">
    <span class="tile-num">·08</span>
    <span class="tile-emoji">🥗</span>
  </div>
  <div class="tile-spacer"></div>
  <h2 class="tile-title">Nutrition</h2>
  <div class="tile-foot">
    <span class="tile-sub">Track meals & macros</span>
    <span class="tile-arrow">→</span>
  </div>
</a>
```

- [ ] **Step 2: Verify tile placement and styling**
- [ ] **Step 3: Commit the update**

```bash
git add index.html
git commit -m "feat(nutrition): add nutrition tile to dashboard bento grid"
```

### Task 3: Implement tabbed interface structure

**Files:**
- Modify: `nutrition.html:200-700` (within body)

**Interfaces:**
- Consumes: Basic HTML structure
- Produces: Tabbed interface with Log Meal, Daily Summary, and Meal History tabs

- [ ] **Step 1: Add tab container structure**

```html
<div class="page">
    <div class="hub-head">
        <h1 class="dash-title">Nutrition</h1>
        <button class="gear-btn" id="settingsOpen" type="button" aria-label="Settings">
            <!-- Settings icon -->
        </button>
    </div>

    <div class="tab-container">
        <!-- Tab Header -->
        <div class="tab-header">
            <button class="tab-button active" data-tab="log">Log Meal</button>
            <button class="tab-button" data-tab="summary">Daily Summary</button>
            <button class="tab-button" data-tab="history">Meal History</button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content active" id="log-tab">
            <!-- Log Meal content -->
        </div>
        
        <div class="tab-content" id="summary-tab">
            <!-- Daily Summary content -->
        </div>
        
        <div class="tab-content" id="history-tab">
            <!-- Meal History content -->
        </div>
    </div>
</div>
```

- [ ] **Step 2: Add CSS for tabbed interface** (already present in existing file)
- [ ] **Step 3: Add JavaScript for tab switching**
- [ ] **Step 4: Commit tab implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): implement tabbed interface structure"
```

### Task 4: Implement meal form component

**Files:**
- Modify: `nutrition.html:#log-tab section`

**Interfaces:**
- Consumes: Tab container structure
- Produces: Complete meal logging form with validation

- [ ] **Step 1: Add meal form HTML structure**
- [ ] **Step 2: Implement form validation logic**
- [ ] **Step 3: Add photo upload component with preview**
- [ ] **Step 4: Add form submission handler**
- [ ] **Step 5: Commit meal form implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): implement meal form component with validation and photo upload"
```

### Task 5: Implement progress ring component

**Files:**
- Modify: `nutrition.html:#summary-tab section`

**Interfaces:**
- Consumes: Tab container structure
- Produces: Four progress rings for calories, protein, carbs, and fat

- [ ] **Step 1: Add progress ring HTML structure**
- [ ] **Step 2: Implement progress ring SVG/CSS**
- [ ] **Step 3: Add JavaScript for progress calculation and animation**
- [ ] **Step 4: Add daily totals display**
- [ ] **Step 5: Commit progress ring implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): implement progress ring component with daily totals"
```

### Task 6: Implement meal list component

**Files:**
- Modify: `nutrition.html:#history-tab section`

**Interfaces:**
- Consumes: Tab container structure
- Produces: Meal history list with edit/delete functionality

- [ ] **Step 1: Add meal list HTML structure**
- [ ] **Step 2: Implement meal item template with photo, details, and actions**
- [ ] **Step 3: Add empty state handling**
- [ ] **Step 4: Implement edit and delete functionality**
- [ ] **Step 5: Commit meal list implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): implement meal list component with edit/delete"
```

### Task 7: Implement data storage and synchronization

**Files:**
- Modify: `nutrition.html:#script section`

**Interfaces:**
- Consumes: Form, progress ring, and meal list components
- Produces: Data persistence with localStorage and Supabase sync

- [ ] **Step 1: Implement localStorage save/load functions**
- [ ] **Step 2: Add storage event listener for cross-tab updates**
- [ ] **Step 3: Implement Supabase synchronization using existing sync.js patterns**
- [ ] **Step 4: Add photo upload to Supabase storage**
- [ ] **Step 5: Implement optimistic UI updates**
- [ ] **Step 6: Commit data storage implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): implement localStorage storage and Supabase synchronization"
```

### Task 8: Implement responsive design

**Files:**
- Modify: `nutrition.html:#style section`

**Interfaces:**
- Consumes: All UI components
- Produces: Responsive layout for mobile, tablet, and desktop

- [ ] **Step 1: Add responsive breakpoints for tab layout**
- [ ] **Step 2: Adjust form layout for small screens**
- [ ] **Step 3: Modify progress ring grid for different widths**
- [ ] **Step 4: Adjust meal list layout for mobile**
- [ ] **Step 5: Commit responsive design implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): implement responsive design for all screen sizes"
```

### Task 9: Add validation and error handling

**Files:**
- Modify: `nutrition.html:#script section`

**Interfaces:**
- Consumes: Form submission and data handling
- Produces: Robust validation and user feedback

- [ ] **Step 1: Implement form validation (required fields, data types)**
- [ ] **Step 2: Add photo upload validation (size, type)**
- [ ] **Step 3: Implement error status display**
- [ ] **Step 4: Add loading states for async operations**
- [ ] **Step 5: Commit validation and error handling**

```bash
git add nutrition.html
git commit -m "feat(nutrition): add form validation and error handling"
```

### Task 10: Initialize default values and load data

**Files:**
- Modify: `nutrition.html:#script section`

**Interfaces:**
- Consumes: DOMContentLoaded event
- Produces: Initialized form and loaded data on page load

- [ ] **Step 1: Set default meal time to current time**
- [ ] **Step 2: Load existing meals from localStorage on init**
- [ ] **Step 3: Update daily summary on initial load**
- [ ] **Step 4: Load meal history on initial load**
- [ ] **Step 5: Commit initialization logic**

```bash
git add nutrition.html
git commit -m "feat(nutrition): add initialization and data loading"
```

### Task 11: Settings modal integration

**Files:**
- Modify: `nutrition.html:#bottom of body`

**Interfaces:**
- Consumes: Settings button in header
- Produces: Functional settings modal (shared with other pages)

- [ ] **Step 1: Add settings modal markup (copied from other pages)**
- [ ] **Step 2: Add settings modal JavaScript (copied from other pages)**
- [ ] **Step 3: Commit settings modal integration**

```bash
git add nutrition.html
git commit -m "feat(nutrition): integrate settings modal"
```

### Task 12: Final testing and verification

**Files:**
- Modify: `nutrition.html` (final adjustments)

**Interfaces:**
- Consumes: All implemented features
- Produces: Fully tested and verified nutrition tab

- [ ] **Step 1: Test meal logging with various input combinations**
- [ ] **Step 2: Verify progress rings update correctly**
- [ ] **Step 3: Test photo upload and display**
- [ ] **Step 4: Verify edit/delete functionality**
- [ ] **Step 5: Test responsive breakpoints**
- [ ] **Step 6: Verify localStorage persistence**
- [ ] **Step 7: Test Supabase synchronization (if configured)**
- [ ] **Step 8: Check accessibility (ARIA labels, keyboard nav)**
- [ ] **Step 9: Commit final verified implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): final testing and verification"
```

**Plan complete and saved to `docs/superpowers/plans/2026-07-28-nutrition-tab.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

### Task 1: Create nutrition.html file structure

**Files:**
- Create: `nutrition.html`

**Interfaces:**
- Consumes: None
- Produces: Basic HTML5 structure with linked CSS/JS files

- [ ] **Step 1: Create basic HTML5 document structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#050506">
    <title>Nutrition - Leon Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="sync.js" defer></script>
    <script src="topbar.js" defer></script>
</head>
<body>
    <!-- Content will be added in subsequent steps -->
</body>
</html>
```

- [ ] **Step 2: Add shared design tokens and base styles** (matching dashboard patterns)
- [ ] **Step 3: Commit initial file structure**

```bash
git add nutrition.html
git commit -m "feat(nutrition): create basic HTML structure"
```

### Task 2: Add nutrition tile to dashboard bento grid

**Files:**
- Modify: `index.html:222-336`

**Interfaces:**
- Consumes: None
- Produces: Updated bento grid with nutrition tile

- [ ] **Step 1: Add nutrition tile to bento grid in index.html**

```html
<!-- Tile for Nutrition -->
<a class="tile" href="nutrition.html" style="--accent:#FBBF24">
  <div class="tile-top">
    <span class="tile-num">·08</span>
    <span class="tile-emoji">🥗</span>
  </div>
  <div class="tile-spacer"></div>
  <h2 class="tile-title">Nutrition</h2>
  <div class="tile-foot">
    <span class="tile-sub">Track meals & macros</span>
    <span class="tile-arrow">→</span>
  </div>
</a>
```

- [ ] **Step 2: Verify tile placement and styling**
- [ ] **Step 3: Commit the update**

```bash
git add index.html
git commit -m "feat(nutrition): add nutrition tile to dashboard bento grid"
```

### Task 3: Implement tabbed interface structure

**Files:**
- Modify: `nutrition.html:200-700` (within body)

**Interfaces:**
- Consumes: Basic HTML structure
- Produces: Tabbed interface with Log Meal, Daily Summary, and Meal History tabs

- [ ] **Step 1: Add tab container structure**

```html
<div class="page">
    <div class="hub-head">
        <h1 class="dash-title">Nutrition</h1>
        <button class="gear-btn" id="settingsOpen" type="button" aria-label="Settings">
            <!-- Settings icon -->
        </button>
    </div>

    <div class="tab-container">
        <!-- Tab Header -->
        <div class="tab-header">
            <button class="tab-button active" data-tab="log">Log Meal</button>
            <button class="tab-button" data-tab="summary">Daily Summary</button>
            <button class="tab-button" data-tab="history">Meal History</button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content active" id="log-tab">
            <!-- Log Meal content -->
        </div>
        
        <div class="tab-content" id="summary-tab">
            <!-- Daily Summary content -->
        </div>
        
        <div class="tab-content" id="history-tab">
            <!-- Meal History content -->
        </div>
    </div>
</div>
```

- [ ] **Step 2: Add CSS for tabbed interface** (already present in existing file)
- [ ] **Step 3: Add JavaScript for tab switching**
- [ ] **Step 4: Commit tab implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): implement tabbed interface structure"
```

### Task 4: Implement meal form component

**Files:**
- Modify: `nutrition.html:#log-tab section`

**Interfaces:**
- Consumes: Tab container structure
- Produces: Complete meal logging form with validation

- [ ] **Step 1: Add meal form HTML structure**
- [ ] **Step 2: Implement form validation logic**
- [ ] **Step 3: Add photo upload component with preview**
- [ ] **Step 4: Add form submission handler**
- [ ] **Step 5: Commit meal form implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): implement meal form component with validation and photo upload"
```

### Task 5: Implement progress ring component

**Files:**
- Modify: `nutrition.html:#summary-tab section`

**Interfaces:**
- Consumes: Tab container structure
- Produces: Four progress rings for calories, protein, carbs, and fat

- [ ] **Step 1: Add progress ring HTML structure**
- [ ] **Step 2: Implement progress ring SVG/CSS**
- [ ] **Step 3: Add JavaScript for progress calculation and animation**
- [ ] **Step 4: Add daily totals display**
- [ ] **Step 5: Commit progress ring implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): implement progress ring component with daily totals"
```

### Task 6: Implement meal list component

**Files:**
- Modify: `nutrition.html:#history-tab section`

**Interfaces:**
- Consumes: Tab container structure
- Produces: Meal history list with edit/delete functionality

- [ ] **Step 1: Add meal list HTML structure**
- [ ] **Step 2: Implement meal item template with photo, details, and actions**
- [ ] **Step 3: Add empty state handling**
- [ ] **Step 4: Implement edit and delete functionality**
- [ ] **Step 5: Commit meal list implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): implement meal list component with edit/delete"
```

### Task 7: Implement data storage and synchronization

**Files:**
- Modify: `nutrition.html:#script section`

**Interfaces:**
- Consumes: Form, progress ring, and meal list components
- Produces: Data persistence with localStorage and Supabase sync

- [ ] **Step 1: Implement localStorage save/load functions**
- [ ] **Step 2: Add storage event listener for cross-tab updates**
- [ ] **Step 3: Implement Supabase synchronization using existing sync.js patterns**
- [ ] **Step 4: Add photo upload to Supabase storage**
- [ ] **Step 5: Implement optimistic UI updates**
- [ ] **Step 6: Commit data storage implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): implement localStorage storage and Supabase synchronization"
```

### Task 8: Implement responsive design

**Files:**
- Modify: `nutrition.html:#style section`

**Interfaces:**
- Consumes: All UI components
- Produces: Responsive layout for mobile, tablet, and desktop

- [ ] **Step 1: Add responsive breakpoints for tab layout**
- [ ] **Step 2: Adjust form layout for small screens**
- [ ] **Step 3: Modify progress ring grid for different widths**
- [ ] **Step 4: Adjust meal list layout for mobile**
- [ ] **Step 5: Commit responsive design implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): implement responsive design for all screen sizes"
```

### Task 9: Add validation and error handling

**Files:**
- Modify: `nutrition.html:#script section`

**Interfaces:**
- Consumes: Form submission and data handling
- Produces: Robust validation and user feedback

- [ ] **Step 1: Implement form validation (required fields, data types)**
- [ ] **Step 2: Add photo upload validation (size, type)**
- [ ] **Step 3: Implement error status display**
- [ ] **Step 4: Add loading states for async operations**
- [ ] **Step 5: Commit validation and error handling**

```bash
git add nutrition.html
git commit -m "feat(nutrition): add form validation and error handling"
```

### Task 10: Initialize default values and load data

**Files:**
- Modify: `nutrition.html:#script section`

**Interfaces:**
- Consumes: DOMContentLoaded event
- Produces: Initialized form and loaded data on page load

- [ ] **Step 1: Set default meal time to current time**
- [ ] **Step 2: Load existing meals from localStorage on init**
- [ ] **Step 3: Update daily summary on initial load**
- [ ] **Step 4: Load meal history on initial load**
- [ ] **Step 5: Commit initialization logic**

```bash
git add nutrition.html
git commit -m "feat(nutrition): add initialization and data loading"
```

### Task 11: Settings modal integration

**Files:**
- Modify: `nutrition.html:#bottom of body`

**Interfaces:**
- Consumes: Settings button in header
- Produces: Functional settings modal (shared with other pages)

- [ ] **Step 1: Add settings modal markup (copied from other pages)**
- [ ] **Step 2: Add settings modal JavaScript (copied from other pages)**
- [ ] **Step 3: Commit settings modal integration**

```bash
git add nutrition.html
git commit -m "feat(nutrition): integrate settings modal"
```

### Task 12: Final testing and verification

**Files:**
- Modify: `nutrition.html` (final adjustments)

**Interfaces:**
- Consumes: All implemented features
- Produces: Fully tested and verified nutrition tab

- [ ] **Step 1: Test meal logging with various input combinations**
- [ ] **Step 2: Verify progress rings update correctly**
- [ ] **Step 3: Test photo upload and display**
- [ ] **Step 4: Verify edit/delete functionality**
- [ ] **Step 5: Test responsive breakpoints**
- [ ] **Step 6: Verify localStorage persistence**
- [ ] **Step 7: Test Supabase synchronization (if configured)**
- [ ] **Step 8: Check accessibility (ARIA labels, keyboard nav)**
- [ ] **Step 9: Commit final verified implementation**

```bash
git add nutrition.html
git commit -m "feat(nutrition): final testing and verification"
```

---