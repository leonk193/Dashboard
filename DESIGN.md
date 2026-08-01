---
name: Leon Dashboard
description: An obsidian personal control deck — dark glass panels over ambient dark space, one signature accent per tracker
colors:
  obsidian-bg: "#050506"
  chrome: "#0A0A0B"
  surface-glass: "rgba(255, 255, 255, 0.04)"
  surface-glass-strong: "#111113"
  border-faint: "rgba(255, 255, 255, 0.06)"
  border-strong: "rgba(255, 255, 255, 0.14)"
  text-primary: "#FAFAFA"
  text-secondary: "#B8B6B0"
  text-tertiary: "#76746E"
  accent-main: "#6BE3A4"
  accent-water: "#7DD3FC"
  accent-fitness: "#7C5CFF"
  accent-nutrition: "#FBBF24"
  accent-health: "#1D9E75"
  accent-finance: "#E07658"
  accent-caffeine: "#C9A36B"
  accent-nova: "#A78BFA"
  success: "#5BD89A"
  warning: "#E8B84D"
  danger: "#E85B5B"
  ink-invert: "#0A0A0B"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    fontSize: "10px"
    fontWeight: 700
    letterSpacing: "0.08em"
  number:
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.04em"
rounded:
  tile: "18px"
  card: "18px"
  control: "12px"
  input: "11px"
  pill: "999px"
spacing:
  gutter: "20px"
  card-pad: "18px"
  gap: "14px"
  section: "18px"
components:
  glass-card:
    backgroundColor: "{colors.surface-glass}"
    rounded: "{rounded.card}"
    padding: "18px 20px"
  tile:
    backgroundColor: "{colors.surface-glass}"
    rounded: "{rounded.tile}"
    padding: "20px"
    height: "168px"
  primary-btn:
    backgroundColor: "linear-gradient(180deg,#FFFFFF,#E8E5DD)"
    textColor: "{colors.ink-invert}"
    rounded: "{rounded.control}"
    padding: "13px 16px"
  ghost-btn:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.control}"
    padding: "11px 14px"
  input:
    backgroundColor: "rgba(0, 0, 0, 0.3)"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.input}"
    padding: "11px 13px"
  segmented-control:
    backgroundColor: "transparent"
    textColor: "{colors.text-tertiary}"
    rounded: "{rounded.input}"
    padding: "11px 14px"
  bottom-tab:
    textColor: "rgba(255, 255, 255, 0.45)"
    rounded: "0px"
    padding: "6px 0 4px"
  modal:
    backgroundColor: "#0E0E10"
    rounded: "18px"
    padding: "22px"
---

# Design System: Leon Dashboard

## Overview

**Creative North Star: "The Obsidian Control Deck"**

This is a private, phone-first command surface for the owner's daily life — a dark obsidian deck where each tracker is a distinct instrument with its own glowing accent. The system is built from three layers that never blur together: a near-black ambient void (`#050506`) that carries two slow-drifting radial washes (a warm ember-orange at the upper right, a faint cool grey at the lower left), a film-grain dot texture over the void so the dark never reads as plastic, and floating panels of dark glass that catch a soft blur and subtle glow.

Every tracker is a separate instrument. The bento grid is the master console: glass tiles, each tuned with its own accent hue, that read as one family while announcing their domain by color — Main is mint `#6BE3A4`, Water is ice-blue `#7DD3FC`, Fitness is violet `#7C5CFF`, Nutrition is amber `#FBBF24`, Health is deep teal `#1D9E75`, Finance is ember `#E07658`, Caffeine is brass `#C9A36B`, Nova is lavender `#A78BFA`. Chrome — top bar, bottom tab bar, cards, text — stays neutral so the accents are the only voice that speaks.

The interface is made for the thumb and the glance: big glass targets, bottom-anchored tab bar, modals that blow up to full-screen on phones, and monospace tabular numerals so every number reads instantly. Motion is quiet and purposeful — a drifting background wash over 36s, ring fills easing at `cubic-bezier(0.22, 1, 0.36, 1)`, hover lifting tiles 3px. Nothing flashes; everything confirms.

The incumbent look was treated as evidence and is being recorded faithfully — this document describes the system as it exists, the "Obsidian Control Deck" being the language that names what was already built. The single deliberately named rejection: no light mode. This deck is dark by design.

**Key Characteristics:**
- Obsidian void + drifting ember/grey radial washes + film-grain texture
- Floating dark-glass panels (near-invisible borders, soft shadows, backdrop blur)
- One signature accent hue per tracker, all chrome neutral
- Monospace tabular numerals for every metric; sans for everything else
- Bottom-anchored mobile chrome; full-screen modals on phones
- Small, monospaced, letter-spaced uppercase labels everywhere

## Colors

A single voice: warm neutrals riding on near-black glass, with per-domain accents kept scarce and specific. Colors live in CSS variables duplicated per page (see [Layout](#layout) for the drift note); the values below are canonical.

### Primary
- **Mint** (`#6BE3A4`): the home/instrument accent — success states, LED dot, day-ring fill on Main. Slightly brighter than the panel-success `#5BD89A`.
- **Ice Blue** (`#7DD3FC`): Water domain + active/connected auth states, per-page info.
- **Violet** (`#7C5CFF`): Fitness domain — strength, tension, effort.
- **Amber** (`#FBBF24`): Nutrition domain + the profile-warning tone.
- **Deep Teal** (`#1D9E75`): Health domain (also appears as the emerald accent at 35% glow in health cards).
- **Ember** (`#E07658`): Finance domain.
- **Brass** (`#C9A36B`): Caffeine domain.
- **Lavender** (`#A78BFA`): Nova domain.

### Neutral
- **Obsidian** (`#050506`): page background.
- **Chrome** (`#0A0A0B`): top bar / bottom tab bar background; also the ink for inverted buttons.
- **Glass** (`rgba(255,255,255,0.04)`): default card surface. Slightly stronger `#111113` for surfaces that need body (`po-water`).
- **Text Primary** (`#FAFAFA`): headings, key values.
- **Text Secondary** (`#B8B6B0`): body copy, sub-values.
- **Text Tertiary** (`#76746E`): captions, meta, inactive labels.
- **Border Faint** (`rgba(255,255,255,0.06)`): card edges, dividers.
- **Border Strong** (`rgba(255,255,255,0.14)`): inputs' resting and emphasis edges.
- **Ink Invert** (`#0A0A0B`): text color on the white primary button.

### Named Rules
**The One Accent Rule.** A page uses exactly one domain accent plus status colors. The accent marks the tracker's active instruments; neutral chrome never competes with it. On the master bento grid, the tile's own accent glow is allowed — the tiles *are* the navigation.

**The Status-Color Rule.** Status colors are reserved for meaning: success `#5BD89A`, warning `#E8B84D` (or per-page `#F2C063`), danger `#E85B5B` (or per-page `#FF6B6B`/`#FF8A8A`). They appear only where the owner must register a state change — never as decoration.

## Typography

**Display Font:** Apple system stack — `-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
**Body Font:** same system stack
**Label/Mono Font:** `ui-monospace, "SF Mono", Menlo, Consolas, monospace`

**Character:** The system font carries the calm; the mono font carries the numbers. Sans weights are 600–800 at small sizes with tight tracking so headings feel engineered; every metric, time, count, and percentage is set in tabular-nums mono so digits sit rock-steady as they tick. The pairing reads like a flight instrument: neutral, precise, quietly high-tech.

### Hierarchy
- **Display** (700, 28px, 1.2, `-0.025em`): page titles (`dash-title`), gradient-white text with `background-clip: text`. Drops to 22px ≤480px.
- **Title** (700, 22px, 1.2, `-0.02em`): card/tile titles; 28px for the big bento tile.
- **Body** (400, 14px, 1.45): page copy, card descriptions.
- **Label** (700, 10px mono, `0.08em` tracking, uppercase): field labels, tile numbers, status captions, stat labels. Everywhere.
- **Number** (800, 40px mono, 1, `-0.04em`, tabular): ring/stat hero values. Large numbers across pages scale down responsively.

### Named Rules
**The Tabular Rule.** Every changing metric uses `font-variant-numeric: tabular-nums` — clocks, ring percentages, `done/total` counts, weights. Numbers must never shimmer.

## Layout

Single-column mobile-first documents (phone-first per PRODUCT.md) constrained to a `max-width: 1100px` page wrapper with `20px` gutters (14px ≤440px), safe-area-aware top padding, and extra bottom padding to clear the fixed bottom tab bar. Desktop is just the phone composition centered in more space — no side rail, no chrome redistribution.

The master surface is the **bento grid**: `repeat(4, 1fr)` with `168px` rows and a `14px` gap, collapsing to 2 columns ≤720px and 1 column ≤440px. Tiles are `span 2` (wide) or `span 2 × 2` (big), dense flow. Per-tracker pages instead use a vertical stack of glass cards with `18px` section rhythm.

Spacing rhythm is a coarse 14px cadence: `14px` grid gaps, `18–20px` card padding, `18px` vertical section rhythm. Cards carry a "big glass target" intent — touch-friendly 44px+ controls, bottom-anchored tabs, modals that stretch full-screen on phones (the topbar injects this lockdown globally).

Two accepted realities: tokens are duplicated as CSS variables per page with occasional drift (e.g. `--bg` is `#050506` on most pages but `#0a0a0b` on `po-water`), and the day-rollover uses a 6 AM active date boundary across pages.

## Elevation & Depth

A hybrid: **tonal layering on glass, one soft shadow, then nothing else.** Depth comes first from translucent surfaces — `rgba(255,255,255,0.04)` glass over the obsidian void — so panels feel floaty and atmospheric, not stacked. A `backdrop-filter: blur(24px) saturate(1.2)` (with `-webkit-` prefix) lets the drifting background wash bleed through the cards, which is the whole trick.

Shadows are used sparingly and structurally: a single ambient `0 12px 40px rgba(0,0,0,0.45)` on cards/tiles lifts them off the void; hover deepens it to `0 16px 48px rgba(0,0,0,0.55)` and adds a 3px translateY. Modals sit higher with `0 24px 70px rgba(0,0,0,0.6)`. The primary button uses an inset top highlight (`inset 0 1px 0 rgba(255,255,255,0.9)`) so it reads as a physical key.

### Shadow Vocabulary
- **Ambient** (`0 12px 40px rgba(0,0,0,0.45)`): resting cards, tiles.
- **Hover** (`0 16px 48px rgba(0,0,0,0.55)`): elevated tiles on hover.
- **Modal** (`0 24px 70px rgba(0,0,0,0.6)`): full-screen-adjacent modals.
- **Key highlight** (`inset 0 1px 0 rgba(255,255,255,0.9)`): primary buttons.

### Named Rules
**The Glass-Not-Sheet Rule.** Surfaces are translucent glass, not solid sheets. If a panel needs to be more opaque, use tint (`#111113`) — never a fully opaque grey that reads as a material slab.

## Shapes

The form language is **softly rounded glass with precise geometry inside**. Rounded rectangles everywhere: tiles/cards `18px`, controls/buttons `12px`, inputs `11px`, pills fully rounded. Radii stay consistent within a role — a control is never sharper than its container. The one geometry that breaks the rounded rule on purpose: the bottom tab bar and top bar are flat bars with only a hairline border.

Signature details:
- Tiles cast a faint radial **accent glow** in their corner (`color-mix(in srgb, var(--accent) 22%, transparent)`), which brightens on hover — the tile's identity light.
- Segmented controls are a single bordered capsule (`1px rgba(255,255,255,0.10)`, `11px` radius, hidden overflow) with the active segment filled `rgba(255,255,255,0.12)`.
- Status dots are perfect 8px circles that **glow** with the accent when on (`box-shadow: 0 0 8px`).
- The topbar water pill splits into a count pill + a square `+` button joined as one rounded unit (`12px 0 0 12px` / `0 12px 12px 0`).

### Named Rules
**The Hairline Rule.** Edges are hairlines, not borders: `rgba(255,255,255,0.06)` on cards, `0.10` on controls, `0.14` on inputs. If you can see the edge clearly, it's too heavy.

## Components

### Buttons
- **Shape:** rounded rectangles (12px), no border radius on the pill `+`.
- **Primary:** white-to-warm-grey gradient (`linear-gradient(180deg,#FFFFFF,#E8E5DD)`) with `#0A0A0B` text, 13px 16px padding, inset top highlight, `0 8px 22px rgba(0,0,0,0.25)` ambient shadow. Hover brightens 5%; active presses down 1px.
- **Ghost / Secondary:** transparent background, `1px rgba(255,255,255,0.12)` border, secondary text, 11px 14px padding, uppercase 0.06em tracking (e.g. `.whoop-btn`). Hover fills `rgba(255,255,255,0.05)`, text → primary.
- **Icon buttons** (gear, finance, auth): 42–44px square glass chips, `rgba(255,255,255,0.04)` on `0.10` border; active press scales to 0.94.
- **Tap targets:** ≥40px on mobile, `-webkit-tap-highlight-color: transparent`, active scale feedback instead of :hover.

### Segmented Controls
- **Style:** one bordered capsule (`11px` radius, `rgba(255,255,255,0.10)`), inline-flex, hidden overflow.
- **State:** active segment fills `rgba(255,255,255,0.12)` with primary text; inactive is tertiary text on transparent. `0.15s` background/color transitions.

### Cards / Tiles / Containers
- **Corner Style:** 18px, consistent across tiles and cards.
- **Background:** `rgba(255,255,255,0.04)` glass (or `#111113` where body needed); `backdrop-filter: blur(24px) saturate(1.2)`.
- **Shadow Strategy:** one ambient shadow at rest (see Elevation); no inner borders.
- **Border:** hairline `rgba(255,255,255,0.06)`.
- **Internal Padding:** 18–20px; tiles 20px.
- **Tiles additionally:** `overflow: hidden`, `--accent` per-tile, corner accent-glow `::before`, `border-color` shifts toward the accent on hover.

### Inputs / Fields
- **Style:** `rgba(0,0,0,0.3)` fill, `rgba(255,255,255,0.08)` border, 11px radius, 11px 13px padding, inherit font at 14px.
- **Focus:** border steps to `rgba(255,255,255,0.28)` over 0.2s — no glow, just a firmer line.
- **Labels:** mono, 700, 10–11px, `0.10em` tracking, uppercase, above the field in tertiary.
- **Disabled / Error:** danger text (e.g. `#ef4444` status messages) where applicable.

### Navigation
- **Top bar** (`topbar.js`): sticky `chrome #0a0a0b`, hairline bottom border, right-anchored quick actions — water pill (count + `+`), finance chip, auth chip.
- **Bottom tab bar** (phone-first): fixed bar, `chrome` background, hairline top border, emoji icons (28px→22px ≤480px) over 10px labels, `rgba(255,255,255,0.45)` resting / `#FAFAFA` active, grayscale-filtered icons that go `brightness(1.6)` when active.
- **Finance** suppresses the global chrome and runs its own 4-tab internal bar + self-contained back button.
- **States:** active tab brightens; icons scale 0.92 on press.

### Signature Component — The Bent Tile
The home grid tile is the deck's defining object: an `18px` glass panel with a numbered index (`·01`, mono, tertiary), a domain emoji, a gradient title, a footer with a sub-label and an accent arrow (`→`) that slides 4px on hover. Each tile carries `--accent`; the tile's `::before` paints a faint radial accent glow at 78%/18% that intensifies on hover while the border tints toward the accent. On phones the grid collapses to a full-width column of these tiles — the instrument list becomes the navigation.

### Signature Component — The Day Ring
A 168px (144px ≤480px) SVG progress ring: an 8px track (`rgba(255,255,255,0.06)`) with a rounded-cap fill whose color and dash-offset ease over 0.7s at `cubic-bezier(0.22, 1, 0.36, 1)`, plus a soft `feGaussianBlur` glow filter. Inside, stacked mono: 40px percent (800 weight, tabular, `-0.04em`), a 10px uppercase phase label (0.16em), and a live clock. A status line, remaining-time mono, and static hours range sit beside it.

## Do's and Don'ts

### Do:
- **Do** start every page from the obsidian void (`#050506`) with the two drifting radial washes and the film-grain overlay — they are the ambient identity.
- **Do** give each tracker page exactly one domain accent and carry it through its buttons, rings, dots, and glows.
- **Do** set every metric in tabular-nums mono with tight letter-spacing so values read steady.
- **Do** keep card edges hairlines (`0.06`), radii ≥11px, and any panel translucent glass.
- **Do** make controls ≥40px and bottom-anchored on phones, and blow modals up to full-screen ≤480px.
- **Do** use the status trio (success/warning/danger) only for actual state, and only where the owner must notice.

### Don't:
- **Don't** introduce a light mode, a solid-opaque panel, or a visible heavy border — the dark glass is the point.
- **Don't** add a second accent to a tracker page; status colors and the one domain accent are all a page may carry.
- **Don't** render changing numbers without `tabular-nums`.
- **Don't** use emoji as decoration on cards that aren't navigation tiles; on tiles they are the domain mark, keep them grayscale-treated in chrome.
- **Don't** let the top/bottom bars compete with page accents — chrome stays `#0A0A0B` and neutral.
- **Don't** duplicate token values with a different hex in a new page; reuse the canonical palette and correct drift when editing an old one.
