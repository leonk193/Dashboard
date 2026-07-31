# Single-Path WASM Barcode Scanner — Design Spec

**Date:** 2026-07-31  
**Target:** [nutrition.html](../../../nutrition.html)  

## Goal
Replace the unreliable two-path scanner (Native `BarcodeDetector` + `html5-qrcode` fallback) with a single `zxing-wasm` path that reliably recognizes EAN-13, EAN-8, UPC-A, and UPC-E barcodes in under 2 seconds on Safari (and all modern browsers), even on cluttered backgrounds, low-contrast packaging, or curved surfaces.

## Key Changes

### 1. Library Swap
- **Remove:** `<script src="https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>`
- **Add:** Dynamic ES module import or script tag loading `zxing-wasm/reader` from a CDN (`https://cdn.jsdelivr.net/npm/zxing-wasm@3.0.0/dist/reader/index.js` or via a module loader snippet). Preload the WASM binary on initial page load / tab switch so clicking "Start Camera" has zero WASM load lag.

### 2. Single Unified Camera Engine
- Remove `if ('BarcodeDetector' in window)` branch entirely. Safari, Chrome, and Firefox share one exact engine.
- Request camera via `navigator.mediaDevices.getUserMedia` with:
  ```js
  {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920, max: 3840 },
      height: { ideal: 1080, max: 2160 }
    }
  }
  ```
- Apply advanced video track constraints when supported:
  - `focusMode: 'continuous'` (prevents blurry close-ups on mobile Safari/Chrome).

### 3. High-Performance Frame Decoder
- Create an offscreen canvas matching the video's actual dimensions.
- Sample frames at ~10 FPS using `requestAnimationFrame` with a time-delta throttle (every 100ms).
- Call `readBarcodesFromImageFile` / `readBarcodesFromImageData` with:
  - `formats: ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E']`
  - `tryHarder: true` (enables multi-scale scanning for small / distant barcodes)
  - `tryRotate: true` (handles angled products)
  - `tryInvert: true` (handles light-on-dark barcodes)
  - `maxNumberOfSymbols: 1`

### 4. Integration & UI Constraints
- Render `<video>` directly inside `#scannerViewport`.
- Keep existing `#scannerOverlay`, `#scannerSpinner`, `#scanStatus`, and manual barcode input completely intact.
- On success: trigger `navigator.vibrate(100)`, stop video stream, call existing `lookupBarcodeOFF(decodedText)` and `displayScannedProduct(product)`.
- On error/unsupported: fallback cleanly to error message + manual barcode input field.

## Verification & Criteria
- **Pass:** Barcodes scan within ~1–2 seconds on Safari iOS against realistic cluttered backgrounds (kitchen counters, non-white labels, curved cans).
- **Pass:** Zero duplicate scanning code paths.
- **Pass:** Manual barcode lookup remains fully functional.
