# Single-Path WASM Barcode Scanner — Design Spec

**Date:** 2026-07-31  
**Target:** [nutrition.html](../../../nutrition.html)  

## Goal
Replace the unreliable two-path scanner (Native `BarcodeDetector` + `html5-qrcode` fallback) with a single `zxing-wasm` path that reliably recognizes EAN-13, EAN-8, UPC-A, and UPC-E barcodes in under 2 seconds on Safari (and all modern browsers), even on cluttered backgrounds or non-ideal lighting.

## Key Refinements (User Approved)
1. **720p Baseline + Capability Check:** Request `ideal: 1280x720` resolution first. Inspect `track.getCapabilities()` before calling `track.applyConstraints()` for settings like focus mode to avoid throwing exceptions on devices/browsers (e.g. Safari iOS) that reject unsupported constraints.
2. **Decode Region (Cropped Reading):** Define a focused rectangular scanning ROI (e.g. 70% width, 35% height centered) matching the visual scanning overlay box. Draw only this cropped bounding rectangle to the offscreen canvas for `zxing-wasm`. This dramatically reduces frame pixel count, keeping CPU/WASM decode times fast.
3. **Visual Alignment:** Update `#scannerOverlay` styles to clearly show the exact rectangular target zone so users naturally frame the barcode inside the ROI.

## Technical Architecture

### 1. Library Loading
- Remove `<script src="https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>`.
- Load `zxing-wasm/reader` via ES module script or CDN module import (`https://cdn.jsdelivr.net/npm/zxing-wasm@3.0.0/dist/reader/index.js` or standard bundle). Pre-trigger WASM binary load when switching to the Scan tab so clicking "Start Camera" has zero delay.

### 2. Single Unified Camera Engine
- Remove `if ('BarcodeDetector' in window)` branch entirely.
- Stream request:
  ```js
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  });
  ```
- Capability-checked constraints:
  ```js
  const track = stream.getVideoTracks()[0];
  if (track && typeof track.getCapabilities === 'function') {
    const caps = track.getCapabilities();
    const advanced = [];
    if (caps.focusMode && caps.focusMode.includes('continuous')) {
      advanced.push({ focusMode: 'continuous' });
    }
    if (advanced.length > 0) {
      await track.applyConstraints({ advanced }).catch(() => {});
    }
  }
  ```

### 3. Cropped Frame Decoding Loop
- Video frame target resolution is scaled to offscreen canvas using the ROI ratios:
  - ROI X: 15% to 85% width (70% width)
  - ROI Y: 32.5% to 67.5% height (35% height rectangle)
- `ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight)`
- Get `ImageData` from the cropped canvas and send to `readBarcodesFromImageData`:
  - `formats: ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E']`
  - `tryHarder: true`
  - `tryRotate: true`
  - `tryInvert: true`
  - `maxNumberOfSymbols: 1`
- Run decode loop at ~10 FPS (100ms throttle).

### 4. Integration & UI Constraints
- Mount `<video>` directly inside `#scannerViewport`.
- Update `#scannerOverlay` to render a clean rectangular framing guide aligned with the 70% x 35% ROI.
- On success: `navigator.vibrate(100)`, stop scanner, invoke `lookupBarcodeOFF(decodedText)` & `displayScannedProduct(product)`.
- On error/permission denied: render camera error placeholder + rely on manual input.

## Verification & Criteria
- **Pass:** Barcodes inside the rectangular ROI scan within ~1–2 seconds on Safari iOS without white background requirements.
- **Pass:** `track.getCapabilities()` safely handles devices without continuous focus support.
- **Pass:** Offscreen canvas decodes only the cropped ROI region.
- **Pass:** Clean fallback to manual entry if camera fails.
