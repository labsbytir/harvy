# Harvy Marketing UI / Brutalist Tactical Design Specification

## 1. Components, Layout & Tactical Palette
Tokens: `#09090B` (canvas/black), `#121214` (surface/slate), `#27272A` (border/hairline), `#FAFAFA` (primary text), `#A1A1AA` (muted text), `#F59E0B` (tactical amber accent), `#00F0FF` (tactical cyan accent). All corners have `borderRadius: 0`.

### A. Ticker Strip (`Ticker.tsx`)
- **Layout**: Full-width single-line marquee directly beneath telemetry status ribbon.
- **Spacing & Scale**: `py: 0.85` (~32px height), font `0.8rem` IBM Plex Mono, letter-spacing `0.12em`, bold uppercase.
- **Color**: `#F59E0B` on `#000000`, 1px top/bottom borders in `#27272A`.
- **Motion & Responsive**: CSS keyframe `harvyTicker` (32s linear infinite); `@media (prefers-reduced-motion: reduce)` pauses animation; fluid horizontal overflow on all viewports.

### B. CLI Simulator (`CliSimulator.tsx`)
- **Layout**: `TacticalPanel` container with corner `+` crosshairs, terminal window top bar, and auto-scrolling terminal body.
- **Spacing & Scale**: Min-height 280px, font `0.75rem` (xs) to `0.85rem` (desktop) IBM Plex Mono, line-height 1.6.
- **Color**: `#000000` body, `#121214` title bar, `#F59E0B` prompt `$`, `#FAFAFA` commands, `#00F0FF` execution success, `#A1A1AA` tabular ASCII data.
- **States**: `[ PAUSE ]` / `[ RESUME ]` toggle button, `[ REPLAY ]` restart, blinking block cursor `█`.
- **Responsive**: Horizontal overflow scroll for table columns on narrow screens (xs: 360px+).

### C. Live API Playground (`ApiPlayground.tsx`)
- **Layout**: `TacticalPanel` container with cyan corner `+` markers (`#00F0FF`), query input row, preset chips, and output payload viewer.
- **Spacing & Scale**: Padded 20px–28px, font `0.75rem`–`0.85rem` IBM Plex Mono, payload box max-height 320px with custom scrollbar.
- **Color**: `#09090B` payload background, status chip `#10B981` (200 OK) / `#F59E0B` (401 Unauthorized) / `#EF4444` (network/500 error).
- **States**: `[ RUN QUERY ]` hover `#FBBF24`, active `#D97706`, loading state with circular spinner and disabled button.

### D. Raw Link Directory (`BrutalistLinks.tsx`)
- **Layout**: Single-column vertical list, large plain-text links with underlines and descriptions.
- **Spacing & Scale**: Section `py: 8–12`, link text `1.25rem`–`1.5rem` IBM Plex Mono, index numbers `0.8rem` `#52525B`.
- **Color & Interaction**: `#FAFAFA` links with 2px underline; hover color flips to `#F59E0B`; focus ring 2px `#00F0FF` with 4px offset.

---

## 2. ASCII Wireframes

### Ticker Strip
```
+---------------------------------------------------------------------------------------+
| HARVY // EVIDENCE-FIRST INTELLIGENCE // SOURCE-GROUNDED // TENANT-SCOPED //  >>> >>>  |
+---------------------------------------------------------------------------------------+
```

### CLI Terminal Simulator
```
+---------------------------------------------------------------------------------------+
| ● ● ●  harvy-cli — zsh — 80x24                             [ PAUSE ] [ REPLAY ]       |
+---------------------------------------------------------------------------------------+
| $ harvy auth login --org acme                                                         |
| ✓ authenticated as analyst@acme.io [tenant: acme-prod]                                |
| $ harvy events list --product tower --since 24h                                       |
| ▸ 12 events · 9 located · sources: gdacs, noaa                                        |
| $ harvy query "events where alertlevel != green" --format table                       |
| ┌──────────────┬─────────┬────────┬─────────────────────────────┬───────────┐         |
| │ EVENT ID     │ PRODUCT │ SEV    │ TITLE                       │ SOURCE    │         |
| ├──────────────┼─────────┼────────┼─────────────────────────────┼───────────┤         |
| │ evt-09418a2f │ TOWER   │ RED    │ Tropical Cyclone 04B Alert  │ gdacs.org │         |
| └──────────────┴─────────┴────────┴─────────────────────────────┴───────────┘         |
| $ █                                                                                   |
+---------------------------------------------------------------------------------------+
| SHELL: ZSH 5.9 // UTF-8                     SIMULATION MODE — NO LOCAL DAEMON REQUIRED|
+---------------------------------------------------------------------------------------+
```

### Live API Playground
```
+---------------------------------------------------------------------------------------+
| // TARGET_ENDPOINT [READ-ONLY SPECIFICATION]                                          |
| +-----------------------------------------------------------+ +---------------------+ |
| | GET  /api/v1/events?product=tower&limit=5                 | | [ RUN QUERY ]       | |
| +-----------------------------------------------------------+ +---------------------+ |
| PRESETS: [/api/v1/events?product=tower&limit=5]  [/health]                            |
| +-----------------------------------------------------------------------------------+ |
| | ● HTTP 401 Unauthorized                                   LATENCY: 18ms  [401...] | |
| +-----------------------------------------------------------------------------------+ |
| | {                                                                                 | |
| |   "error": {                                                                      | |
| |     "code": "unauthorized",                                                       | |
| |     "message": "Sign in and select an organization."                              | |
| |   }                                                                               | |
| | }                                                                                 | |
| +-----------------------------------------------------------------------------------+ |
| [ HONEST AUTHENTICATION GATE ]: 401 — sign in required. Verified tenant boundary.    |
+---------------------------------------------------------------------------------------+
```

### Raw Brutalist Link Directory
```
+---------------------------------------------------------------------------------------+
| // 05 // SYSTEM INDEX & DIRECTORY                                                     |
| RAW HARVY INDEX. NO DECORATION.                                                       |
|                                                                                       |
| 01 //  /ontology                  Shared canonical ontology & provenance schema       |
| 02 //  /security                  Multi-tenant isolation & cryptographic boundary     |
| 03 //  /docs                      Repository specifications & architectural decisions |
| 04 //  /api playground            Live HTTP client dispatch & response inspector      |
| 05 //  /cli (in development)      Unix terminal emulator & pipeline control preview   |
| 06 //  /sign-in                   Better Auth credentials & organization session      |
| 07 //  /app                       Harvy operational intelligence workspace            |
+---------------------------------------------------------------------------------------+
```

---

## 3. Interaction Flow & CTA Hierarchy
```
[ Telemetry Ribbon ] (Live system state indicator)
         │
         ▼
[ Marquee Ticker ] (High-velocity brand and capability statements)
         │
         ▼
[ Hero & Schematic ] ──► [ EXPLORE PRODUCTS ] / [ INSPECT PIPELINE ]
         │
         ▼
[ 01 // Products Grid ] ──► [ ENTER {PRODUCT} DESK ] (Deep-link to /product/{name})
         │
         ▼
[ 02 // Pipeline Steps ] (Architecture progression 01 -> 04)
         │
         ▼
[ 03 // CLI Simulator ] ──► [ PAUSE ] / [ REPLAY ] (Interact with UNIX workflow)
         │
         ▼
[ 04 // API Playground ] ──► [ RUN QUERY ] (Real live fetch against API backend)
         │
         ▼
[ 05 // Raw Directory ] ──► Underlined direct navigation routes
         │
         ▼
[ Deployment Status ] ──► [ LAUNCH HARVY ] (/app) | [ SIGN IN WITH CREDENTIALS ] (/sign-in)
         │
         ▼
[ Terminal Footer ] (Specs, Security, Contact)
```

---

## 4. Accessibility & Contrast Standards
- **Contrast Ratios**:
  - Tactical Amber (`#F59E0B`) on Black (`#000000` / `#09090B`): `8.6:1` (exceeds WCAG AAA standard of 7:1 for text).
  - Tactical Cyan (`#00F0FF`) on Black (`#000000` / `#09090B`): `13.8:1` (exceeds WCAG AAA).
  - Primary White (`#FAFAFA`) on Black: `19.3:1`.
  - Muted Zinc (`#A1A1AA`) on Black: `5.6:1` (exceeds WCAG AA 4.5:1).
- **Keyboard Navigation & Focus**:
  - Playground `[ RUN QUERY ]` button and preset chips are native `<button>` elements with clear focus outlines (`outline: 2px solid #00F0FF`).
  - Response payload viewer has `tabIndex={0}` and `role="region"` for keyboard scrolling.
- **Screen Reader Support**:
  - CLI output container includes `role="region"` and `aria-live="polite"` so newly typed lines are announced progressively.
  - Ticker track includes duplicate element with `aria-hidden="true"` to prevent redundant speech synthesizer reads.
- **Reduced Motion**:
  - Ticker uses `@media (prefers-reduced-motion: reduce)` to disable animation and display static text.

---

## 5. Intentional Brutalist Exclusions
1. **No Image Assets or Photography**: Prevents marketing fluff; reinforces system authenticity and deterministic engineering.
2. **No Border Radii (`borderRadius: 0`)**: Strict military/industrial hardware aesthetic with razor-sharp 90° box boundaries.
3. **No Decorative Gradients or Drop Shadows**: Flat opaque layers (`#000000`, `#09090B`, `#121214`) divided solely by 1px `#27272A` borders.
4. **No Synthetic Mock Results in Playground**: Authenticity over illusion. Unauthenticated queries proudly show actual 401 JSON envelopes with cryptographic trace IDs.
