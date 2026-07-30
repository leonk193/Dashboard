# Barcode Scanner & Open Food Facts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace USDA FoodData Central with Open Food Facts (API ~ unchanged in `nutrition.html`), add camera-based barcode scanning to the Scan tab.

**Architecture:** Single-page JS app (`nutrition.html` ~2223 lines). One JS lib (html5-qrcode via CDN) added. The data layer (search + barcode lookup), the Scan tab UI, and the serving/macro controls all live in the same inline script. Tasks update specific sections without restructuring.

**Tech Stack:** Vanilla JS, html5-qrcode CDN, Open Food Facts v2 REST API

## Global Constraints

- All changes in `nutrition.html` only — no new files
- CDN: `https://cdn.jsdelivr.net/npm/html5-qrcode` (MIT license, ~50 KB)
- Open Food Facts API: `world.openfoodfacts.org` (no key needed)
- Serving controls, macro display, logging flow keep their current UI pattern
- Meal data model, Today tab, settings, Supabase sync, Nova coach unchanged

---

### Task 1: Replace USDA with Open Food Facts food search

**Files:**
- Modify: `nutrition.html` lines ~1368-1422 (constants + search functions), ~1740-1796 (result rendering + selectFood)

**Interfaces:**
- Consumes: existing search input field `#foodSearch`, existing search results container `#searchResults`
- Produces: `searchFoodsOFF(query)` → array of OFF product objects; `parseOFFProduct(product)` → `{ per100: {calories,protein,carbs,fat}, name, brand, servingSize, barcode }`

- [ ] **Step 1: Replace constants**

Replace:
```js
const USDA_API_KEY = 'DEMO_KEY';
const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const NUTRIENTS = { energy: 1008, protein: 1003, fat: 1004, carbs: 1005 };
```

With:
```js
const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
```

- [ ] **Step 2: Replace `searchFoods()` with `searchFoodsOFF()`**

Replace the entire `async function searchFoods(query)` block (lines ~1381-1407):

```js
async function searchFoodsOFF(query) {
  if (!query || query.length < 2) return [];
  const cacheKey = query.toLowerCase().trim();
  if (SEARCH_CACHE[cacheKey] && Date.now() - SEARCH_CACHE[cacheKey].time < 120000) {
    return SEARCH_CACHE[cacheKey].data;
  }
  const url = `${OFF_SEARCH_URL}?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=12&fields=product_name,brands,nutriments,serving_size,code`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('OFF API error');
    const data = await res.json();
    const products = data.products || [];
    SEARCH_CACHE[cacheKey] = { data: products, time: Date.now() };
    return products;
  } catch (e) {
    console.warn('OFF search failed:', e);
    return [];
  }
}
```

- [ ] **Step 3: Replace `extractNutrientsPer100g()` with `parseOFFProduct()`**

Replace the block (lines ~1409-1422):

```js
function parseOFFProduct(product) {
  const nut = product.nutriments || {};
  return {
    per100: {
      calories: nut['energy-kcal'] || 0,
      protein: nut.proteins || 0,
      carbs: nut.carbohydrates || 0,
      fat: nut.fat || 0,
    },
    name: product.product_name || 'Unknown',
    brand: product.brands || 'Open Food Facts',
    servingSize: nut.serving_quantity || 100,
    barcode: product.code || '',
  };
}
```

- [ ] **Step 4: Update search result rendering**

In the food search input handler (around line ~1746), change the result rendering loop.

Old pattern (inside `results.innerHTML = foods.map(...)`):
```js
const per100 = extractNutrientsPer100g(f);
const sv = f.servingSize || 100;
const svText = f.servingSize ? `${sv}g` : 'per 100g';
return `<div class="search-result-item" data-idx="${foods.indexOf(f)}">
  <div class="sr-info">
    <div class="sr-name">${escHtml(f.description || 'Unknown')}</div>
    <div class="sr-brand">${escHtml(f.brandOwner || 'USDA')} · ${svText}</div>
  </div>
  <div class="sr-macros">
    <span>${Math.round(per100.calories || 0)}cal</span>
    <span>P${formatMacro(per100.protein || 0)}</span>
    <span>C${formatMacro(per100.carbs || 0)}</span>
    <span>F${formatMacro(per100.fat || 0)}</span>
  </div>
  <div class="sr-arrow">→</div>
</div>`;
```

New:
```js
const parsed = parseOFFProduct(f);
const svText = `${parsed.servingSize}g per serving`;
return `<div class="search-result-item" data-idx="${foods.indexOf(f)}">
  <div class="sr-info">
    <div class="sr-name">${escHtml(parsed.name)}</div>
    <div class="sr-brand">${escHtml(parsed.brand)} · ${svText}</div>
  </div>
  <div class="sr-macros">
    <span>${Math.round(parsed.per100.calories || 0)}cal</span>
    <span>P${formatMacro(parsed.per100.protein || 0)}</span>
    <span>C${formatMacro(parsed.per100.carbs || 0)}</span>
    <span>F${formatMacro(parsed.per100.fat || 0)}</span>
  </div>
  <div class="sr-arrow">→</div>
</div>`;
```

- [ ] **Step 5: Update search result click handler**

Change the data store on each result row:
```js
// Old:
el._foodData = { food: foods[i], per100: extractNutrientsPer100g(foods[i]) };
// New:
el._foodData = { product: foods[i], parsed: parseOFFProduct(foods[i]) };
```

- [ ] **Step 6: Update `selectFood()` to use `parsed` fields**

Inside `function selectFood(foodData)` (line ~1776), replace:
```js
const f = foodData.food;
const name = f.description || 'Unknown';
const brand = f.brandOwner || 'USDA';
document.getElementById('selFoodName').textContent = name;
document.getElementById('selFoodSource').textContent = `${brand} · ${f.servingSize || 100}g per serving`;
```
With:
```js
const p = foodData.parsed;
const name = p.name;
const brand = p.brand;
document.getElementById('selFoodName').textContent = name;
document.getElementById('selFoodSource').textContent = `${brand} · Open Food Facts · ${p.servingSize}g per serving`;
```

And replace the portion grams line:
```js
// Old:
const portionGrams = f.servingSize || 100;
selectedFoodData.portionSizeGrams = portionGrams;
// New:
const portionGrams = p.servingSize;
selectedFoodData.portionSizeGrams = portionGrams;
```

- [ ] **Step 7: Update search function call in the input handler**

In the `setTimeout` async callback (around line ~1725), replace:
```js
foods = await searchFoods(q);
```
With:
```js
foods = await searchFoodsOFF(q);
```

- [ ] **Step 8: Update UI copy**

Replace search hint text (line ~1151):
```
"Type a food name to search the USDA database"
→ "Type a food name to search Open Food Facts"
```

Replace default hint (line ~1882 in clearSelection):
```
"Type a food name to search the USDA database"
→ "Type a food name to search Open Food Facts"
```

Replace not-found message (around line ~1740):
```
"No results found. Try a different search or use Quick Add."
→ same (keep as-is, fine)
```

- [ ] **Step 9: Test search still works**

Open the page → switch to Log Meal tab → type "chicken" → verify results appear with OFF product data → select one → verify macros show correct per-100g values → adjust serving → verify logging works → check Today tab.

- [ ] **Step 10: Commit**

```bash
git add nutrition.html
git commit -m "refactor: replace USDA API with Open Food Facts for food search"
```

---

### Task 2: Build barcode scanner UI

**Files:**
- Modify: `nutrition.html` lines ~1097-1133 (Scan tab HTML), plus new CSS

**Produces:** Scan tab with camera viewport, scan overlay, scan result section, manual barcode fallback, Log Meal / Scan Another buttons

- [ ] **Step 1: Replace Scan tab HTML**

Replace the placeholder HTML (lines ~1097-1133) with:

```html
<!-- ===== Scan Pane ===== -->
<div class="tab-pane" id="scan-pane" role="tabpanel">
  <div class="card">
    <!-- Camera Region -->
    <div id="scannerRegion">
      <div id="scannerViewport" style="position:relative;width:100%;max-width:400px;margin:0 auto 16px;border-radius:14px;overflow:hidden;background:var(--bg-secondary);aspect-ratio:4/3;">
        <div id="scannerPlaceholder" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;color:var(--text-tertiary);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
            <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
            <path d="M7 12h10"/><path d="M12 7v10"/>
          </svg>
          <span style="font-size:14px;font-weight:600;">Camera ready to scan</span>
        </div>
        <div id="scannerOverlay" style="display:none;position:absolute;inset:0;z-index:2;pointer-events:none;">
          <!-- Scan guide brackets -->
          <svg viewBox="0 0 100 100" style="width:70%;height:auto;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">
            <path d="M20 8H8v12" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M80 8h12v12" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M20 92H8V80" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M80 92h12V80" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          <!-- Scan line -->
          <div style="position:absolute;top:40%;left:15%;right:15%;height:2px;background:linear-gradient(90deg,transparent,rgba(91,141,239,0.9),transparent);animation:scanLine 2s ease-in-out infinite;box-shadow:0 0 8px rgba(91,141,239,0.5);"></div>
        </div>
        <div id="scannerSpinner" style="display:none;position:absolute;inset:0;z-index:3;background:rgba(0,0,0,0.5);align-items:center;justify-content:center;">
          <div style="width:28px;height:28px;border:3px solid rgba(255,255,255,0.15);border-top-color:var(--text-primary);border-radius:50%;animation:spin 0.6s linear infinite;"></div>
        </div>
      </div>
      <div id="scanControls" style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;">
        <button class="submit-btn" id="startScanner" type="button" style="width:auto;padding:12px 24px;">Start Camera</button>
        <button class="submit-btn secondary" id="stopScanner" type="button" style="display:none;width:auto;padding:12px 24px;">Stop Camera</button>
      </div>
    </div>

    <!-- Manual barcode input -->
    <div id="manualBarcodeRegion" style="margin-bottom:16px;">
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" id="manualBarcode" placeholder="Type barcode number (EAN-13)" style="flex:1;min-width:0;font-family:var(--font-mono);" autocomplete="off">
        <button class="submit-btn secondary" id="lookupBarcodeBtn" type="button" style="width:auto;padding:12px 20px;white-space:nowrap;">Look Up</button>
      </div>
      <div style="text-align:center;margin-top:6px;">
        <button id="toggleManualBarcode" type="button" style="background:none;border:none;color:var(--text-tertiary);font-size:12px;cursor:pointer;padding:4px;">⌨️ Type barcode instead</button>
      </div>
    </div>

    <!-- Scan status -->
    <div id="scanStatus" class="form-status" style="margin-bottom:12px;min-height:20px;"></div>

    <!-- Scan result (barcode found) -->
    <div id="scanResultSection" style="display:none">
      <!-- Camera preview showing what was scanned? -->
      <div style="display:none" id="scanDetectedFlash"></div>

      <!-- Selected food card -->
      <div class="selected-food">
        <div class="selected-food-info">
          <div class="selected-food-name" id="scanResultName">Product</div>
          <div class="selected-food-source" id="scanResultSource">Open Food Facts</div>
        </div>
        <button class="selected-food-clear" id="scanResultClear" aria-label="Clear scan result">✕</button>
      </div>

      <!-- Serving adjust — same pattern as search tab -->
      <div class="serving-adjust">
        <label class="field-label">How many grams?</label>
        <div class="serving-row" style="margin-bottom:10px;">
          <input class="num" type="number" id="scanServingGrams" min="1" value="100" step="5">
          <span class="serving-preset" data-grams="25">25g</span>
          <span class="serving-preset" data-grams="50">50g</span>
          <span class="serving-preset" data-grams="100">100g</span>
          <span class="serving-preset" data-grams="150">150g</span>
          <span class="serving-preset" data-grams="200">200g</span>
          <span class="serving-preset" data-grams="300">300g</span>
        </div>
      </div>

      <!-- Macro display -->
      <div class="macro-display-auto" id="scanMacroDisplay">
        <div class="macro-auto macro-auto-cal"><span class="macro-auto-val" id="scanMacCal">0</span> cal</div>
        <div class="macro-auto macro-auto-protein"><span class="macro-auto-val" id="scanMacProtein">0</span>g protein</div>
        <div class="macro-auto macro-auto-carbs"><span class="macro-auto-val" id="scanMacCarbs">0</span>g carbs</div>
        <div class="macro-auto macro-auto-fat"><span class="macro-auto-val" id="scanMacFat">0</span>g fat</div>
      </div>

      <!-- Scan-another + log buttons -->
      <button class="submit-btn" id="logScannedBtn">Log Meal</button>
      <button class="submit-btn secondary" id="scanAnotherBtn" type="button" style="margin-top:8px;">Scan Another</button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Add scan-line animation CSS**

Add after the existing `@keyframes spin` (around line ~346):
```css
@keyframes scanLine {
  0%, 100% { transform: translateY(0); opacity: 0.3; }
  50% { transform: translateY(60px); opacity: 1; }
}
```

- [ ] **Step 3: Verify UI renders**

Open the page → click "Scan" tab → verify camera viewport, Start Camera button, manual barcode input, and toggle link show correctly.

- [ ] **Step 4: Commit**

```bash
git add nutrition.html
git commit -m "feat: add barcode scanner UI to Scan tab"
```

---

### Task 3: Wire barcode scanner logic

**Files:**
- Modify: `nutrition.html` (add html5-qrcode CDN in head, add scanner JS in the main script block)

**Interfaces:**
- Consumes: `parseOFFProduct()`, `addMeal()`, `currentDateKey`, `OFF_PRODUCT_URL`
- Produces: camera init/stop, barcode → OFF lookup, manual barcode lookup, scan result → serving controls → log

- [ ] **Step 1: Add html5-qrcode CDN**

In the `<head>` (line ~11-14), add:
```html
<script src="https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/dist/html5-qrcode.min.js"></script>
```

- [ ] **Step 2: Add scanner state variables**

After the existing constants and before the search functions, add:
```js
/* ===== Barcode Scanner State ===== */
let html5QrCode = null;
let scannerRunning = false;
let scannedFoodData = null;
let isScanningMode = true; // true = camera, false = manual input
```

- [ ] **Step 3: Add OFF barcode lookup function**

After `searchFoodsOFF()`:
```js
async function lookupBarcodeOFF(barcode) {
  const cacheKey = 'barcode:' + barcode.trim();
  if (SEARCH_CACHE[cacheKey] && Date.now() - SEARCH_CACHE[cacheKey].time < 120000) {
    return SEARCH_CACHE[cacheKey].data;
  }
  try {
    const res = await fetch(`${OFF_PRODUCT_URL}/${encodeURIComponent(barcode.trim())}.json`);
    if (!res.ok) throw new Error('Not found');
    const data = await res.json();
    if (data.status !== 1) throw new Error('Not found');
    SEARCH_CACHE[cacheKey] = { data: data.product, time: Date.now() };
    return data.product;
  } catch (e) {
    return null;
  }
}
```

- [ ] **Step 4: Add scanner start/stop functions**

```js
async function startScanner() {
  if (scannerRunning) return;
  const viewport = document.getElementById('scannerViewport');
  const placeholder = document.getElementById('scannerPlaceholder');
  const overlay = document.getElementById('scannerOverlay');
  const spinner = document.getElementById('scannerSpinner');
  const startBtn = document.getElementById('startScanner');
  const stopBtn = document.getElementById('stopScanner');
  const status = document.getElementById('scanStatus');

  status.textContent = 'Starting camera...';
  status.className = 'form-status';
  spinner.style.display = 'flex';

  try {
    html5QrCode = new Html5Qrcode('scannerViewport');
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 280, height: 140 }, formatsToSupport: [ Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E, Html5QrcodeSupportedFormats.CODE_39, Html5QrcodeSupportedFormats.CODE_128 ] },
      onScanSuccess,
      onScanFailure
    );
    scannerRunning = true;
    placeholder.style.display = 'none';
    overlay.style.display = 'block';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-flex';
    status.textContent = 'Point camera at a barcode';
    status.className = '';
  } catch (err) {
    console.warn('Camera start failed:', err);
    placeholder.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span style="font-size:14px;font-weight:600;">Camera unavailable</span>
      <span style="font-size:12px;color:var(--text-quaternary);">Permission denied or no camera found</span>
    `;
    status.textContent = 'Camera unavailable — type a barcode below';
    status.className = 'form-status error';
  } finally {
    spinner.style.display = 'none';
  }
}

function stopScanner() {
  if (!scannerRunning || !html5QrCode) return;
  try {
    html5QrCode.stop();
    html5QrCode.clear();
  } catch (e) {}
  html5QrCode = null;
  scannerRunning = false;
  document.getElementById('scannerOverlay').style.display = 'none';
  document.getElementById('startScanner').style.display = 'inline-flex';
  document.getElementById('stopScanner').style.display = 'none';
}
```

- [ ] **Step 5: Add scan success/failure callbacks and result handler**

```js
async function onScanSuccess(decodedText, decodedResult) {
  // Debounce: ignore if we're already showing a result
  if (document.getElementById('scanResultSection').style.display !== 'none') return;
  stopScanner();

  const status = document.getElementById('scanStatus');
  status.textContent = `Barcode detected: ${decodedText}`;
  status.className = '';

  // Vibrate if supported
  if (navigator.vibrate) navigator.vibrate(100);

  const product = await lookupBarcodeOFF(decodedText);
  if (product) {
    displayScannedProduct(product);
    status.textContent = '';
    status.className = '';
  } else {
    status.textContent = 'Product not found in Open Food Facts — try searching by name or Quick Add';
    status.className = 'form-status error';
    document.getElementById('startScanner').style.display = 'inline-flex';
  }
}

function onScanFailure(err) {
  // Ignore — these fire on every non-detection frame
}

function displayScannedProduct(product) {
  const parsed = parseOFFProduct(product);
  scannedFoodData = { product, parsed };

  document.getElementById('scanResultName').textContent = parsed.name;
  document.getElementById('scanResultSource').textContent = `${parsed.brand} · Open Food Facts · ${parsed.servingSize}g per serving`;
  document.getElementById('scanServingGrams').value = parsed.servingSize;
  document.getElementById('scanResultSection').style.display = 'block';

  updateScanMacros(parsed.servingSize);
}
```

- [ ] **Step 6: Add scan macro update function**

```js
function updateScanMacros(grams) {
  if (!scannedFoodData) return;
  const p = scannedFoodData.parsed;
  const factor = grams / 100;
  document.getElementById('scanMacCal').textContent = Math.round((p.per100.calories || 0) * factor);
  document.getElementById('scanMacProtein').textContent = Math.round((p.per100.protein || 0) * factor * 10) / 10;
  document.getElementById('scanMacCarbs').textContent = Math.round((p.per100.carbs || 0) * factor * 10) / 10;
  document.getElementById('scanMacFat').textContent = Math.round((p.per100.fat || 0) * factor * 10) / 10;
}
```

- [ ] **Step 7: Wire scan-serving inputs**

```js
// Scan serving grams
document.getElementById('scanServingGrams').addEventListener('input', function() {
  const g = parseFloat(this.value) || 0;
  updateScanMacros(g);
  document.querySelectorAll('#scanResultSection .serving-preset').forEach(p => {
    p.classList.toggle('active', parseInt(p.dataset.grams) === Math.round(g));
  });
});

// Scan serving presets
document.querySelectorAll('#scanResultSection .serving-preset').forEach(p => {
  p.addEventListener('click', function() {
    const g = parseInt(this.dataset.grams);
    document.getElementById('scanServingGrams').value = g;
    updateScanMacros(g);
    document.querySelectorAll('#scanResultSection .serving-preset').forEach(sp => sp.classList.remove('active'));
    this.classList.add('active');
  });
});
```

- [ ] **Step 8: Wire scan-barcode buttons**

```js
// Manual barcode input
document.getElementById('lookupBarcodeBtn').addEventListener('click', async function() {
  const input = document.getElementById('manualBarcode');
  const barcode = input.value.trim();
  if (!barcode) return;
  const status = document.getElementById('scanStatus');
  status.textContent = 'Looking up barcode...';
  status.className = 'form-status';

  // Stop camera if running
  if (scannerRunning) stopScanner();

  const product = await lookupBarcodeOFF(barcode);
  if (product) {
    displayScannedProduct(product);
    status.textContent = '';
    status.className = '';
  } else {
    status.textContent = 'Product not found in Open Food Facts';
    status.className = 'form-status error';
  }
});

// Toggle manual barcode visibility
document.getElementById('toggleManualBarcode').addEventListener('click', function() {
  const region = document.getElementById('manualBarcodeRegion');
  const input = document.getElementById('manualBarcode');
  if (input.style.display === 'none') {
    input.style.display = 'block';
    document.getElementById('lookupBarcodeBtn').style.display = 'inline-flex';
    this.textContent = '📷 Scan with camera instead';
  } else {
    input.style.display = 'none';
    document.getElementById('lookupBarcodeBtn').style.display = 'none';
    this.textContent = '⌨️ Type barcode instead';
  }
});

// Start scanner button
document.getElementById('startScanner').addEventListener('click', startScanner);

// Stop scanner button
document.getElementById('stopScanner').addEventListener('click', function() {
  stopScanner();
});

// Scan another
document.getElementById('scanAnotherBtn').addEventListener('click', function() {
  scannedFoodData = null;
  document.getElementById('scanResultSection').style.display = 'none';
  document.getElementById('scanStatus').textContent = '';
  document.getElementById('scanStatus').className = 'form-status';
  startScanner();
});

// Clear scan result
document.getElementById('scanResultClear').addEventListener('click', function() {
  scannedFoodData = null;
  document.getElementById('scanResultSection').style.display = 'none';
  document.getElementById('scanStatus').textContent = '';
});

// Log scanned meal
document.getElementById('logScannedBtn').addEventListener('click', function() {
  if (!scannedFoodData) return;
  const status = document.getElementById('scanStatus');
  const name = document.getElementById('scanResultName').textContent;
  const grams = parseFloat(document.getElementById('scanServingGrams').value) || 100;
  const p = scannedFoodData.parsed;
  const factor = grams / 100;
  const cal = Math.round((p.per100.calories || 0) * factor);
  const protein = Math.round((p.per100.protein || 0) * factor * 10) / 10;
  const carbs = Math.round((p.per100.carbs || 0) * factor * 10) / 10;
  const fat = Math.round((p.per100.fat || 0) * factor * 10) / 10;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const displayName = grams !== 100 ? `${name} (${grams}g)` : name;
  const meal = { id: 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6), name: displayName, calories: cal, protein, carbs, fat, time: timeStr };
  addMeal(meal, currentDateKey);
  status.textContent = 'Meal logged ✓';
  status.className = 'form-status success';

  // Clear
  scannedFoodData = null;
  document.getElementById('scanResultSection').style.display = 'none';

  setTimeout(() => { status.textContent = ''; status.className = 'form-status'; }, 2500);
  if (document.querySelector('[data-tab="today"]')) refreshUI();
});
```

- [ ] **Step 9: Clean up scanner when leaving Scan tab**

Add a cleanup call in the tab-switching logic (around line ~1638-1648). After the tab switch, if the active tab is not "scan", stop the camera:
```js
// In the tab click handler, before the existing toggle code, add:
if (tab !== 'scan' && scannerRunning) stopScanner();
```

- [ ] **Step 10: Remove "Coming Soon" badge**

Delete the badge HTML from the scan tab (or it's already replaced by the new Task 2 HTML).

- [ ] **Step 11: Update scan tab description copy**

In the scan tab description (now inside the old placeholder, but we've replaced it entirely — verify no stale "Coming Soon" in the new HTML from Task 2).

- [ ] **Step 12: Test end-to-end**

Open page → Scan tab → click "Start Camera" → point at a barcode → verify product appears with macros → adjust serving → log → check Today tab. Also test manual barcode input with a known EAN (e.g., 4000532765031 for a test).

- [ ] **Step 13: Commit**

```bash
git add nutrition.html
git commit -m "feat: wire barcode scanner with Open Food Facts lookup"
```

---

### Task 4: Cleanup — remove USDA remnants

**Files:**
- Modify: `nutrition.html` (remove stale USDA comments, verify no references remain)

- [ ] **Step 1: Remove `formatMacro` duplication if any**

The helper `formatMacro` (line ~1424) is still used in search results — keep it, verify it's only called from OFF rendering.

- [ ] **Step 2: Grep for any remaining USDA references**

Search for "USDA", "DEMO_KEY", "nal.usda.gov", "FDC" in the file. Remove any comments or stale references.

- [ ] **Step 3: Final verification walkthrough**

1. Open page → Log Meal tab → text search → verify results come from OFF
2. Select a food → adjust serving → verify macros update → log
3. Switch to Scan tab → verify camera UI renders
4. Start camera → scan or type barcode → verify result with macros
5. Log scanned meal → Today tab shows it
6. Edit/delete a meal → undo still works
7. Settings, date nav, rings — no regressions

- [ ] **Step 4: Commit**

```bash
git add nutrition.html
git commit -m "chore: remove USDA API remnants, final cleanup"
```

---

## Self-Review

- ✅ **Spec coverage:** Spec sections 1-4 all covered by Tasks 1-4. Every requirement has a corresponding step. Camera permissions, barcode-not-found, manual fallback, serving controls, logging flow all mapped.
- ✅ **No placeholders:** Every code block contains real, copyable code. No TODOs, TBDs, or "implement later".
- ✅ **Type consistency:** `parseOFFProduct()` returns `{ per100: {calories,protein,carbs,fat}, name, brand, servingSize, barcode }` — used consistently in search rendering, selectFood, scan display, and logging. `selectedFoodData` shape changes minimally (`food` → `product`, `per100` → `parsed.per100` at usage points).
- ✅ **No side-effects on unchanged features:** Today tab, settings, Nova coach, Supabase sync — zero changes.
