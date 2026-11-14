# Design System — Web Scrolling Screenshot

## 1. Design Principles
- **Precision Tool Aesthetic:** Calm, distraction-free studio UI that keeps the user's captured webpage as the hero.
- **Native Bilingual Mirroring:** Full support for **Arabic (RTL)** and **English (LTR)** using CSS logical properties (`margin-inline`, `padding-inline`, `inset-inline-start`, `border-inline-end`) — zero physical `left`/`right` layout properties in Popup or Preview UI.
- **Host-Page Isolation:** The `SelectionOverlay` injected on target pages uses its own Shadow DOM styles and never inherits or breaks the host site's typography or layout.

## 2. Color Tokens (CSS Custom Properties)
Light and dark surfaces follow `prefers-color-scheme` automatically in Popup and Preview:

| Token | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--wss-bg-canvas` | `#F8FAFC` | `#0B1120` | Preview viewport backdrop & Popup surface |
| `--wss-bg-surface` | `#FFFFFF` | `#111827` | Cards, toolbar, dropdown panels |
| `--wss-bg-elevated` | `#F1F5F9` | `#1E293B` | Hover states, segmented controls |
| `--wss-text-primary` | `#0F172A` | `#F8FAFC` | Primary headings & labels (≥ 12:1 contrast) |
| `--wss-text-secondary` | `#475569` | `#94A3B8` | Dimensions, metadata, keyboard hint labels (≥ 4.5:1 contrast) |
| `--wss-border` | `#E2E8F0` | `#334155` | Hairline dividers & inputs |
| `--wss-accent` | `#2563EB` | `#3B82F6` | Primary CTA buttons, selection border |
| `--wss-accent-hover` | `#1D4ED8` | `#60A5FA` | Primary CTA hover |
| `--wss-danger` | `#DC2626` | `#EF4444` | Cancel capture, error banner |
| `--wss-success` | `#16A34A` | `#22C55E` | Download complete / ready badge |
| `--wss-overlay-dim` | `rgba(15, 23, 42, 0.45)` | `rgba(15, 23, 42, 0.45)` | Unselected region dimming backdrop on host page |

## 3. Typography & Spacing
- **Fonts:** System UI stack (zero external webfont requests for privacy & offline speed):
  - Latin: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
  - Arabic: `"Segoe UI", Tahoma, "Noto Sans Arabic", system-ui, sans-serif`
  - Monospace (dimensions & pixel readout): `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` (always `dir="ltr"` for `1920 × 4800 px` readouts even in Arabic RTL so numbers never scramble).
- **Spacing scale:** `4px` base unit (`4, 8, 12, 16, 20, 24, 32`).
- **Border radius:** `8px` controls/buttons, `12px` cards/popup container, `9999px` pill badges.

## 4. Component Specifications
### 4.1 Popup (`340px` fixed width)
- **Header:** App icon + localized title (`Web Scrolling Screenshot` / `تصوير صفحات الويب`) + subtle version tag.
- **Primary Actions (2 large cards/buttons):**
  1. **Full Page Capture** (`Alt+Shift+F`) — icon + clear label + 1-line hint.
  2. **Select Region** (`Alt+Shift+R`) — icon + clear label + 1-line hint.
- **Quick Format Bar:** Segmented selector (`PNG`, `JPEG`, `WebP`) + quality slider (`60%–100%`) visible when `JPEG` or `WebP` is active.
- **Active Capture State:** Replaces action buttons cleanly with progress bar (`0%–100%`), current tile counter, and high-contrast **Cancel** button.

### 4.2 Region Selection Overlay (Shadow DOM on Host Page)
- Full-viewport dimmed backdrop (`pointer-events: auto`, `cursor: crosshair`) with a crisp clear cutout over the dragged rectangle (`2px solid #2563EB` + 8 resize/corner indicators).
- **Floating Dimension Pill:** Positioned near the bottom-inline-end corner of the selection box showing `W × H px` (`tabular-nums`, `dir="ltr"`) and localized `Esc to cancel` hint.
- **Auto-Scroll Edge Zones:** Top `48px` and bottom `48px` edge strips gently highlight when cursor drags inside them to indicate active page scrolling.

### 4.3 Preview Tab (`preview.html`)
- **Top Sticky Toolbar (`56px` height):**
  - Start group: Capture dimensions badge (`1920 × 6400 px · 2x DPR`), part indicator if chunked (`Part 1 of 2`).
  - Center group: Zoom controls (`Fit`, `100%`, `-`, `%` readout, `+`).
  - End group: Format selector (`PNG` / `JPEG` / `WebP` + quality), primary **Download** button (or **Download All Parts**).
- **Canvas Stage:** Subtle checkerboard transparency grid behind the screenshot (`16px` light/neutral squares) so transparent or narrow captures show crisp boundaries.

## 5. Accessibility & Motion
- All buttons and segmented controls have visible `:focus-visible` outlines (`2px solid var(--wss-accent)` with `2px` offset).
- Keyboard support: `Enter`/`Space` activates controls; `Esc` cancels region selection; `+`/`-`/`0` adjust zoom in Preview Tab.
- Respect `prefers-reduced-motion: reduce` (disable progress transitions; keep instant feedback).
