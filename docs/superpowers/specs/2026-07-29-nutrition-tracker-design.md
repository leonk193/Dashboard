---
name: nutrition-tracker-design
description: Design specification for the nutrition tracker page with meal logging, auto-calculated macros, and Supabase persistence
metadata:
  type: project
---

# Nutrition Tracker — Design Specification

**Date:** 2026-07-29
**Status:** Approved for implementation
**Page:** `nutrition.html`

## Overview

A complete nutrition tracker built into the existing dashboard. Users set up a profile (age, weight, height, activity, goal), get auto-calculated macro targets (calories, protein, carbs, fat), log meals throughout the day, and see progress visualized in animated SVG rings.

## Architecture

### Data Flow

```
User Input (profile form)
       ↓
TDEE Calculation → BMR (Mifflin-St Jeor) → activity multiplier → deficit/surplus
       ↓
Macro Split → Protein: 1.6-2.2 g/kg, Fat: 20-35% of calories, Carbs: remainder
       ↓
localStorage ← → Supabase (via initCloudSync)
       ↑
UI renders from localStorage (date-keyed meals + profile)
```

### Data Model

**`nutrition:profile`** — one object, updated on Setup save:
```json
{
  "age": 25,
  "sex": "male",
  "weightKg": 80,
  "heightCm": 180,
  "activity": "moderate",
  "goal": "maintain"
}
```

**`nutrition:targets`** — computed from profile, read by summary:
```json
{
  "calories": 2500,
  "protein": 180,
  "carbs": 280,
  "fat": 65
}
```

**`nutrition:meals`** — array of meals per date, keyed by date string:
```json
{
  "2026-07-29": [
    { "id": "m_abc123", "name": "Chicken Salad", "calories": 450, "protein": 35, "carbs": 12, "fat": 28, "time": "12:30" },
    ...
  ]
}
```

### Persistence

- `initCloudSync({ appKey: 'nutrition', syncedKeys: ['nutrition:profile', 'nutrition:targets', 'nutrition:meals'] })`
- Every change to meals or profile auto-syncs via the existing Supabase pipeline
- Other devices see changes in real-time via the Postgres changefeed

## UI / Components

### Layout

Single column, max-width ~720px, centered. Dark theme consistent with the dashboard (`--bg: #050506`, card backgrounds at `rgba(255,255,255,0.04)`, etc.).

Shared header row: back button (`fin-back-btn` in `fin-back-btn` style) + page title "Nutrition" + optional gear icon (opens profile/settings).

### Tab Bar

Three horizontal pill-style tabs: **Setup** | **Log Meal** | **Today**

- First visit auto-opens Setup. After profile exists, auto-opens Today.
- Tabs use the existing `.tab-button` pattern with active underline gradient.

### Setup Tab

A card containing:
- **Profile form:** Age (number), Sex (dropdown: Male/Female), Weight (number + unit kg), Height (number + cm), Activity Level (dropdown: Sedentary / Light / Moderate / Heavy / Athlete), Goal (dropdown: Lose / Maintain / Gain)
- **"Calculate" button** → computes TDEE and shows results below
- **Results display:** Calorie target in large text, then 3 macro pills (Protein Xg, Carbs Xg, Fat Xg) with explanation text
- **"Save Profile" button** → writes to localStorage + Supabase
- Once saved, user can switch to other tabs

TDEE Calculation (Mifflin-St Jeor):
- Male: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
- Female: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161
- Activity multipliers: sedentary ×1.2, light ×1.375, moderate ×1.55, heavy ×1.725, athlete ×1.9
- Goal adjustment: lose -20%, maintain ±0%, gain +15%

Macro split:
- Protein: 1.6 - 2.2 g per kg bodyweight (2.0 for simplicity; 2.2 if goal is gain)
- Fat: 25% of TDEE calories ÷ 9
- Carbs: remaining calories ÷ 4

### Log Meal Tab

A card with:
- **Meal name** text input (text field, autocomplete from a local list of ~20 common foods)
- **4 number inputs:** Calories, Protein (g), Carbs (g), Fat (g)
- **"Log Meal" button** → adds to `nutrition:meals[dateString]`, clears form, shows brief success status
- Input validation: all fields required, non-negative numbers

### Today Tab (Daily Summary)

Top row: 4 **SVG progress rings** (calories, protein, carbs, fat) showing current vs target percentage with animated stroke.

Each ring:
- 120×120px SVG circle, stroke-width 8, rounded caps
- Track: `rgba(255,255,255,0.06)`
- Fill: colored per macro (calories = warm, protein = blue, carbs = amber, fat = pink)
- Center: percentage number + label + "X / Y g" subtext
- When goal met: fill turns green/success
- When exceeded: fill turns amber/warning

Below rings: **Today's meals list**
- Each meal shown as a row: name, time, macro badges (P/C/F in small pills), calorie count
- Edit (pencil) and delete (trash) icon buttons per meal
- Edit: populates the Log Meal tab and switches to it
- Delete: removes with brief undo option or confirmation

Bottom: **Daily totals card**
- Total calories in large text
- Protein / Carbs / Fat totals in a 3-column row

### History / Date Navigation

- Small date navigator above the Today view: ← Today → with date formatted nicely
- Can go back to see previous days' meals
- Future dates not editable

## Design Tokens (matching existing dashboard)

- Background: `#050506` with subtle radial gradient + noise overlay
- Card: `rgba(255,255,255,0.04)` with `backdrop-filter: blur(24px)`
- Text: `#FAFAFA` (primary), `#B8B6B0` (secondary), `#76746E` (tertiary)
- Border: `rgba(255,255,255,0.06)`
- Ring colors:
  - Calories: `#FF8A4D` (orange-warm)
  - Protein: `#6B8AFF` (blue)
  - Carbs: `#F2C063` (amber)
  - Fat: `#FF6B9D` (pink)
- Success: `#6BE3A4`, Warning: `#F2C063`, Danger: `#FF6B6B`
- Font: `-apple-system, "Inter", sans-serif`; Monospace for labels

## Edge Cases & Constraints

- **No profile saved →** Setup tab is highlighted/prompted; other tabs show a "Set up your profile first" message
- **No meals today →** Summary shows "No meals logged yet" with empty-state styling
- **Invalid inputs →** Form validation with inline error messages; non-negative checks
- **Large numbers →** Rings cap at 100% + show "exceeded" state; totals still accurate
- **Date boundary →** Meals are date-keyed; midnight resets the daily view
- **Real-time sync →** If another device adds a meal, the list updates live (Supabase changefeed)

## Out of Scope

- Food database / barcode scanning
- Recipe builder / meal planning
- Micronutrient tracking
- Charts / trends over time (future iteration)
- Mobile app — responsive web only

## Future Iterations (post-MVP)

- Custom macro target overrides per meal type
- Weekly trend charts
- Meal templates / favorites
- Export / share
