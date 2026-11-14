# Testing Strategy — Web Scrolling Screenshot

## 1. Test Layers

| Layer               | Tool                       | Location         | What It Covers                                                                                                                                                                                                   |
| ------------------- | -------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit Tests**      | Vitest (`5.1.0`) + `jsdom` | `tests/unit/`    | Scroll step planning, fractional DPR pixel rounding, tile-to-chunk splitting (>16,384 px), region-to-tile intersection math, filename sanitization, message schema validation, `StickyManager` DOM restore logic |
| **Component Tests** | Vitest + `jsdom`           | `tests/unit/ui/` | Popup state transitions, Preview zoom/export controls, Arabic RTL (`dir="rtl"`) & English LTR (`dir="ltr"`) rendering                                                                                            |
| **Extension E2E**   | Playwright (`1.65.1`)      | `tests/e2e/`     | Real Chromium MV3 extension loaded from `.output/chrome-mv3` via `chromium.launchPersistentContext` against deterministic local HTML fixtures                                                                    |

## 2. Deterministic Test Fixtures (`tests/fixtures/`)

Playwright tests run against local HTTP fixtures served inside the test harness (never flaky live external websites):

1. `tall-page.html` — `6,000 px` vertical height with distinct colored horizontal calibration bands every `100 px` and a crisp `1 px` SVG grid to detect any vertical drift, overlap, or seam.
2. `sticky-header.html` — `4,500 px` page with `position: fixed` top navbar and `position: sticky` sidebar/sub-header to verify zero header duplication after tile 0 and complete restoration afterward.
3. `ultra-tall.html` — `20,000 px` page verifying automatic multi-part chunk splitting at `16,384 px` without canvas crash or missing pixels.
4. `region-scroll.html` — `3,500 px` page with numbered target blocks for dragging a region larger than the viewport (`edge auto-scroll`) and verifying exact pixel bounds.
5. `lazy-images.html` — `loading="lazy"` images and web fonts ensuring lazy-load settle captures rendered images instead of empty boxes.
6. `rtl-arabic.html` — Arabic RTL test page verifying extension capture & RTL UI rendering cleanly.

## 3. Must-Have Test Coverage

- **100% of pure math functions** (`scroll-planner`, `slice-splitter`, `region-crop`) tested across DPR values `1`, `1.25`, `1.5`, `2`, and `3`.
- **Every `CaptureError` path** tested: restricted `chrome://` URLs, `Esc` cancel mid-selection, tab closed mid-capture.
- **Regression test rule:** Any visual seam, off-by-one DPR bug, or sticky-element leak discovered manually must receive an automated unit or Playwright fixture regression test before closing the fix.

## 4. Performance & Quality Budgets

- **Pixel accuracy:** `0 px` seam error and `0` duplicated sticky headers on fixture pages.
- **Full-page capture speed:** `< 4 seconds` for a `5,000 px` fixture at `1x`/`2x` DPR in CI Chromium.
- **Production zip size:** `< 1.5 MB` (verified in build check).
- **Console cleanliness:** Zero uncaught errors or unhandled promise rejections in Popup, Service Worker, Offscreen, Content Script, or Preview Tab during E2E runs.

## 5. Commands & CI Pipeline Order

Local and GitHub Actions CI run checks in strict fast-fail order:

1. `pnpm lint` (ESLint)
2. `pnpm format:check` (Prettier)
3. `pnpm typecheck` (`tsc --noEmit`)
4. `pnpm test` (Vitest unit + component tests)
5. `pnpm build` (WXT MV3 production build)
6. `pnpm test:e2e` (Playwright Chromium MV3 extension suite in headless/xvfb Chromium)

Shortcut for local pre-commit/PR verification: `pnpm check` (steps 1–5) followed by `pnpm test:e2e`.

## 6. Flaky Test Policy

- Never use arbitrary `waitForTimeout` sleeps in Playwright tests when waiting for capture completion; wait explicitly for extension storage/preview tab events or deterministic DOM readiness signals.
- Failed Playwright runs capture trace + output PNG artifacts (`test-results/`) for pixel inspection.
