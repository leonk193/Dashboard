---
title: "Barcode Scanner + Open Food Facts API Integration"
date: 2026-07-30
status: draft
---

# Barcode Scanner & Open Food Facts API Integration

## Overview

Replace the USDA FoodData Central API with **Open Food Facts** as the single food database across the nutrition tracker. Add a **camera-based barcode scanner** to the Scan tab and use OFF for both text search and barcode lookup.

## Motivation

- Open Food Facts has excellent **German/EU coverage** (EAN-13, prefix 400–440)
- One API handles **both text search and barcode lookup** — eliminates dual-integration complexity
- No API key required, no rate-limit hassle
- Every searchable product is also barcode-scannable, giving consistent results

## Changes

### 1. Database Migration: USDA → Open Food Facts

**Remove:**
- `USDA_API_KEY`, `USDA_SEARCH_URL`, `NUTRIENTS` constants
- `searchFoods()` — USDA API call
- `extractNutrientsPer100g()` — USDA nutrient extraction
- All USDA references in UI copy (labels, hints, source badges)

**Add:**
- `OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'` — text search
- `OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product'` — barcode lookup
- `searchFoodsOFF(query)` — text search via Open Food Facts
- `lookupBarcodeOFF(barcode)` — barcode lookup via Open Food Facts
- `parseOFFProduct(product)` — normalize OFF product → `{ name, brand, per100g: {cal, protein, carbs, fat} }`

### 2. Barcode Scanner (Scan Tab)

**Dependency:** `html5-qrcode` library (CDN: `https://cdn.jsdelivr.net/npm/html5-qrcode`)

**UI States:**

| State | What user sees |
|-------|---------------|
| **Initial** | Camera viewport area + "Start Camera" button + barcode icon |
| **Idle** | Camera preview with scan overlay (bracket guides), scanning indicator |
| **Detected** | Flash/haptic feedback, camera stops, product card + macros appear |
| **Not found** | "Product not found" message with option to try manual barcode input |
| **Error** | Camera permission denied → shows manual barcode input as fallback |

**Flow:**
1. User opens Scan tab → clicks "Start Camera"
2. Camera activates with a centered scan guide overlay
3. `Html5Qrcode` continuously scans frames for EAN-13 / EAN-8 / UPC
4. On detection → device vibrates (if supported), camera stops, product card renders
5. User adjusts serving grams (same presets: 25g, 50g, 100g, 150g, 200g, 300g)
6. Macro display auto-updates (same component as search tab)
7. User clicks "Log Meal" — `addMeal()` with source tag "Open Food Facts"
8. "Scan Another" button restarts camera

**Manual Barcode Fallback:**
- Text input for typing/pasting barcode number
- "Look Up" button → calls the same OFF barcode endpoint
- Shown when camera is unavailable or user clicks "Type barcode instead"

### 3. Open Food Facts Search (Log Meal → Search)

**Text Search Endpoint:**
```
GET https://world.openfoodfacts.org/cgi/search.pl
  ?search_terms={query}
  &search_simple=1
  &action=process
  &json=1
  &page_size=12
  &fields=product_name,brands,nutriments,serving_size,code
```

**Product Parse:**
```js
// OFF nutriments are per 100g by default
{
  name: product.product_name,
  brand: product.brands || 'Open Food Facts',
  per100g: {
    calories: nutriments['energy-kcal'] || 0,
    protein: nutriments.proteins || 0,
    carbs: nutriments.carbohydrates || 0,
    fat: nutriments.fat || 0,
  },
  servingSize: nutriments.serving_quantity || 100, // grams
  barcode: product.code,
}
```

**Serving flow:** Same as current — portion controls, gram presets, macro display, Log Meal button. Source badge shows "Open Food Facts" instead of "USDA".

### 4. UI Copy Updates

- Search hint: `"Type a food name to search the Open Food Facts database"`
- Selected food source: `"{brand} · Open Food Facts · {servingSize}g per serving"`
- Scan tab description: `"Scan packaged food barcodes to pull macros from Open Food Facts — a global, open database with great European coverage"`
- Scan badge: Change from "Coming Soon" to a functional button

### 5. Files Modified

- `nutrition.html` — main changes (scripts, UI, styles for camera viewport, scan overlay)

### 6. Dependencies

- `html5-qrcode` (CDN) — ~50 KB gzipped, MIT license

### 7. Edge Cases & Error States

| Case | Behavior |
|------|----------|
| Camera permission denied | Show manual barcode input, "Camera unavailable — type barcode instead" |
| Barcode not in OFF | Show "Product not found in Open Food Facts — try searching by name or Quick Add" |
| Multiple barcodes in frame | Pick first detected; user can scan again |
| Barcode detected but no nutrition data | Log with name + 0 macros; user can edit |
| Slow camera load | Spinner overlay on viewport |
| No camera on device | Hide camera section, show manual input by default |

### 8. No Changes To

- Meal data model (`nutrition:meals`, `nutrition:profile`, `nutrition:targets`)
- Today tab (rings, meal list, date nav, totals)
- Settings modal
- Supabase sync
- Topbar / bottom bar
- Existing meal add/edit/delete/undo flow
