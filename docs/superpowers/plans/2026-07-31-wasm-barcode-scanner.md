# Single-Path WASM Barcode Scanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the nutrition page barcode scanner to use a single high-performance `zxing-wasm` engine with a 720p capability-checked camera feed and 70% × 35% cropped region decoding for fast, reliable scanning on Safari iOS without white background constraints.

**Architecture:** Replace `html5-qrcode` and native `BarcodeDetector` branching in `nutrition.html` with a single module-based scanner engine. The engine streams 720p video, safe-checks focus capabilities, crops the video frame to a centered rectangular ROI canvas matching the UI overlay, and passes `ImageData` to `zxing-wasm` with `tryHarder`/`tryRotate`/`tryInvert` enabled.

**Tech Stack:** HTML5, JavaScript (ES Modules / WebAssembly), ZXing WASM (`zxing-wasm`), WebRTC (`getUserMedia`), Canvas API.

## Global Constraints
- Target file: `nutrition.html`
- External library: `zxing-wasm@3.0.0` from jsDelivr CDN (`https://cdn.jsdelivr.net/npm/zxing-wasm@3.0.0/dist/reader/index.js`)
- Camera constraints: `ideal: 1280` width, `ideal: 720` height, `facingMode: { ideal: 'environment' }`
- Decoding ROI: x: 15% to 85% (70% width), y: 32.5% to 67.5% (35% height)
- Barcode formats: `EAN-13`, `EAN-8`, `UPC-A`, `UPC-E`
- Single scanner engine path across all browsers (no `BarcodeDetector` or `html5-qrcode` branching)

---

### Task 1: Update Dependencies and Refactor Scanner UI Overlay

**Files:**
- Modify: `nutrition.html:12` (replace `html5-qrcode` script tag)
- Modify: `nutrition.html:1105-1127` (CSS/HTML scanner viewport & overlay markup)

**Interfaces:**
- Consumes: Existing `#scannerRegion`, `#scannerViewport`, `#scannerOverlay`, `#scannerSpinner`, `#startScanner`, `#stopScanner`
- Produces: WASM module loader hook + updated `#scannerOverlay` matching 70% x 35% barcode ROI

- [ ] **Step 1: Replace html5-qrcode script tag with zxing-wasm module tag**

In `nutrition.html`, replace line 12:
```html
<script src="https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
```
With ES module support for `zxing-wasm`:
```html
<script type="module">
  import { readBarcodesFromImageData, purgeBarcodeReaderModule } from 'https://cdn.jsdelivr.net/npm/zxing-wasm@3.0.0/dist/reader/index.js';
  window.readBarcodesFromImageData = readBarcodesFromImageData;
  window.purgeBarcodeReaderModule = purgeBarcodeReaderModule;
</script>
```

- [ ] **Step 2: Update scanner overlay CSS for rectangular ROI**

In `nutrition.html`, update `#scannerOverlay` styles and interior markup to represent a 70% × 35% rectangular scan target instead of a full square overlay:
```html
<div id="scannerOverlay" style="display:none;position:absolute;top:0;left:0;right:0;margin:0 auto;max-width:400px;aspect-ratio:4/3;z-index:10;pointer-events:none;border-radius:14px;box-sizing:border-box;overflow:hidden;">
  <div style="position:absolute;top:32.5%;left:15%;width:70%;height:35%;border:2px dashed rgba(91,141,239,0.9);border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,0.35);box-sizing:border-box;">
    <div style="position:absolute;top:50%;left:5%;right:5%;height:2px;background:linear-gradient(90deg,transparent,rgba(91,141,239,0.95),transparent);animation:scanLine 1.5s ease-in-out infinite;"></div>
  </div>
</div>
```

- [ ] **Step 3: Verify DOM updates in browser/HTML preview**

Open `nutrition.html` in browser or run local server check to confirm tab/overlay renders cleanly without console syntax errors.

- [ ] **Step 4: Commit UI and dependency changes**

```bash
git add nutrition.html
git commit -m "refactor(nutrition): replace html5-qrcode script with zxing-wasm module and update scan ROI overlay"
```

---

### Task 2: Implement Single WASM Scanner Engine with Cropped Frame Decoding

**Files:**
- Modify: `nutrition.html:1425-1641` (replace scanner state variables and functions `startScanner`, `detectFrame`, `stopScanner`)

**Interfaces:**
- Consumes: `window.readBarcodesFromImageData` (loaded in Task 1)
- Produces: Single unified `startScanner()`, `detectFrame()`, and `stopScanner()` implementations servicing Safari and all modern browsers.

- [ ] **Step 1: Refactor scanner state variables**

Remove dual-path variables (`html5QrCode`, `nativeStream`, `nativeVideo`, `nativeScanning`, `barcodeDetector`) and replace with single-path state:
```javascript
/* ===== Barcode Scanner State (Single zxing-wasm Path) ===== */
let scannerStream = null;
let scannerVideo = null;
let scannerCanvas = null;
let scannerCtx = null;
let scannerRunning = false;
let scannerLoopId = null;
let scannedFoodData = null;
let lastDecodeTime = 0;
```

- [ ] **Step 2: Write clean, single-path `startScanner` function**

Implement `startScanner()` requesting 720p video, applying safe capabilities check, creating `<video>`, and mounting into `#scannerViewport`:
```javascript
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
  if (spinner) spinner.style.display = 'flex';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    scannerStream = stream;
    const track = stream.getVideoTracks()[0];

    if (track && typeof track.getCapabilities === 'function') {
      const caps = track.getCapabilities();
      if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
      }
    }

    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    viewport.appendChild(video);
    scannerVideo = video;

    video.srcObject = stream;
    await video.play();

    scannerCanvas = document.createElement('canvas');
    scannerCtx = scannerCanvas.getContext('2d', { willReadFrequently: true });

    scannerRunning = true;
    placeholder.style.display = 'none';
    overlay.style.display = 'block';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-flex';
    status.textContent = 'Align barcode inside rectangle';
    status.className = '';

    lastDecodeTime = 0;
    scannerLoopId = requestAnimationFrame(detectFrame);
  } catch (err) {
    console.warn('Camera start failed:', err);
    placeholder.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="9" x2="12.01" y2="17"/>
      </svg>
      <span style="font-size:14px;font-weight:600;">Camera unavailable</span>
      <span style="font-size:12px;color:var(--text-quaternary);">Permission denied or no camera found</span>
    `;
    status.textContent = 'Camera unavailable — type a barcode below';
    status.className = 'form-status error';
  } finally {
    if (spinner) spinner.style.display = 'none';
  }
}
```

- [ ] **Step 3: Implement cropped ROI `detectFrame` loop**

Implement `detectFrame()` sampling the 70% x 35% ROI onto the offscreen canvas and calling `readBarcodesFromImageData`:
```javascript
async function detectFrame(timestamp) {
  if (!scannerRunning || !scannerVideo || !window.readBarcodesFromImageData) return;

  if (timestamp - lastDecodeTime >= 100) { // ~10 FPS throttle
    lastDecodeTime = timestamp;

    const vw = scannerVideo.videoWidth;
    const vh = scannerVideo.videoHeight;

    if (vw && vh) {
      // Crop 70% width, 35% height centered
      const sx = Math.floor(vw * 0.15);
      const sy = Math.floor(vh * 0.325);
      const sw = Math.floor(vw * 0.70);
      const sh = Math.floor(vh * 0.35);

      if (scannerCanvas.width !== sw || scannerCanvas.height !== sh) {
        scannerCanvas.width = sw;
        scannerCanvas.height = sh;
      }

      scannerCtx.drawImage(scannerVideo, sx, sy, sw, sh, 0, 0, sw, sh);
      const imageData = scannerCtx.getImageData(0, 0, sw, sh);

      try {
        const results = await window.readBarcodesFromImageData(imageData, {
          formats: ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E'],
          tryHarder: true,
          tryRotate: true,
          tryInvert: true,
          maxNumberOfSymbols: 1
        });

        if (results && results.length > 0 && results[0].text) {
          const barcodeText = results[0].text;
          stopScanner();
          onScanSuccess(barcodeText, results[0]);
          return;
        }
      } catch (e) {
        // Suppress frame decode errors
      }
    }
  }

  if (scannerRunning) {
    scannerLoopId = requestAnimationFrame(detectFrame);
  }
}
```

- [ ] **Step 4: Implement clean `stopScanner` tear-down**

```javascript
function stopScanner() {
  if (!scannerRunning && !scannerStream) return;

  scannerRunning = false;
  if (scannerLoopId) {
    cancelAnimationFrame(scannerLoopId);
    scannerLoopId = null;
  }

  if (scannerStream) {
    scannerStream.getTracks().forEach(t => t.stop());
    scannerStream = null;
  }

  if (scannerVideo) {
    scannerVideo.srcObject = null;
    scannerVideo.remove();
    scannerVideo = null;
  }

  scannerCanvas = null;
  scannerCtx = null;

  const overlay = document.getElementById('scannerOverlay');
  if (overlay) overlay.style.display = 'none';
  const startBtn = document.getElementById('startScanner');
  if (startBtn) startBtn.style.display = 'inline-flex';
  const stopBtn = document.getElementById('stopScanner');
  if (stopBtn) stopBtn.style.display = 'none';
}
```

- [ ] **Step 5: Commit single WASM scanner engine**

```bash
git add nutrition.html
git commit -m "feat(nutrition): implement single zxing-wasm barcode scanner with cropped ROI decoding"
```

---

### Task 3: End-to-End Verification & Manual Fallback Confirmation

**Files:**
- Test/Verify: `nutrition.html`

**Interfaces:**
- Consumes: Complete barcode scanner flow (Start Camera -> ROI Decode -> OFF API Lookup -> Log Meal / Scan Another)
- Produces: Verified working barcode scanner on Safari/Chrome with manual typing backup.

- [ ] **Step 1: Test scanner tab switching & manual lookup**

Verify that switching tabs stops camera, typing manual barcode works, and clicking "📷 Scan with camera instead" re-opens single WASM path cleanly.

- [ ] **Step 2: Perform real-device / Safari scan test**

Verify scanning real products on Safari iOS:
1. Product on dark/busy background.
2. Product on curved surface.
3. Rapid scan success (< 2 seconds).

- [ ] **Step 3: Final clean commit**

```bash
git add nutrition.html
git commit -m "fix(nutrition): finalize single WASM scanner flow and manual barcode fallback"
```
