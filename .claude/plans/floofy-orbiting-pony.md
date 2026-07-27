# Plan: Add Back Buttons to Dashboard Sections (except Finance)

## Context
The dashboard consists of several standalone HTML pages (gym, health, main, nova-lite, caffeine, avatar-lab, po-water, etc.) accessed via the bottom tab bar in index.html. Users want a consistent way to return to the main dashboard from each section, except the finance section which should not have a back button.

## Requirements
- Add a back button to the header of each section page (excluding finance.html).
- The button should navigate to index.html.
- Match the visual style of existing buttons (e.g., gear button) using the site’s CSS variables.
- Provide an accessible label (aria-label) and keyboard support.
- Do not alter existing layout or break responsive behavior.

## Design
### Placement
Place the button to the left of the page title inside the existing header container (usually a div with class hub-head or similar). If a page lacks such a container, wrap the title in a compatible header.

### Styling
Reuse the gear button styling: create a button with class back-btn that inherits from .gear-btn but uses a left‑arrow SVG icon. Use the same colors (--text-secondary, --bg) and hover/active states.

### Behavior
On click (or Enter key), set window.location.href = 'index.html'.

## Implementation Steps
1. Identify the header element in each target file (gym.html, health.html, main.html, nova-lite.html, caffeine.html, avatar-lab.html, po-water.html).
2. Insert a button element before the title:
   ```html
   <button class="back-btn" id="backBtn" type="button" aria-label="Go back to dashboard">
     <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
       <path d="M15 18l-6-6 6-6"/>
     </svg>
   </button>
   ```
3. Add a small script at the bottom of the file (or reuse an existing script file) to attach a click listener:
   ```html
   <script>
     document.getElementById('backBtn')?.addEventListener('click', () => {
       window.location.href = 'index.html';
     });
   </script>
   ```
4. Skip finance.html entirely.
5. Verify the button does not duplicate if the script runs multiple times (check for existing element).

## Test Plan
- Open each modified page and confirm the button appears left of the title.
- Hover/focus should produce a visual change similar to the gear button.
- Clicking navigates to index.html without console errors.
- Test on narrow viewports to ensure the button remains usable.
- Confirm finance.html lacks the back button.
- Ensure no regression in existing functionality (e.g., other buttons, scripts).

## Files to Modify
- gym.html
- health.html
- main.html
- nova-lite.html
- caffeine.html
- avatar-lab.html
- po-water.html

(Do not modify finance.html, index.html, or any shared JS/CSS files unless necessary.)

## Estimated Effort
Approximately 10‑15 minutes per file for placement, styling, and testing, totaling 1.5‑2 hours.

## Risks & Mitigation
- Layout differences: inspect each header before inserting; fallback to placing after the first child of body if needed.
- Visibility issues: reuse existing button styling which is known to work across breakpoints.
- Duplicate IDs: guard insertion with a check for existing #backBtn.