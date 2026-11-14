# Coding Standards — Web Scrolling Screenshot

## 1. TypeScript Configuration
`tsconfig.json` must enable strict safety flags and never be relaxed:
- `"strict": true`
- `"noUncheckedIndexedAccess": true`
- `"exactOptionalPropertyTypes": true`
- `"noImplicitOverride": true`
- `"noFallthroughCasesInSwitch": true`
- `"isolatedModules": true`

Rules:
- **Zero `any`:** Use `unknown` plus explicit type guards at boundaries (`messaging/protocol.ts`, IndexedDB reads, DOM queries).
- **Zero `@ts-ignore` / `@ts-expect-error`:** Fix the underlying type instead of silencing the compiler.
- **Explicit return types** on exported functions and public module APIs.

## 2. File & Function Size Limits
- Target **≤ 250 lines per source file**; split cohesive helpers when a file grows beyond ~300 lines.
- Target **≤ 40 lines per function** with shallow nesting (use early returns).
- Keep pure math (`scroll-planner.ts`, `slice-splitter.ts`) free of side effects, DOM APIs, and `chrome.*` globals.

## 3. Naming Conventions
| Item | Convention | Example |
|---|---|---|
| Files & folders | `kebab-case.ts` / `kebab-case.tsx` | `scroll-planner.ts`, `selection-overlay.ts` |
| React components | `PascalCase` named export (file `PascalCase.tsx` or `kebab-case.tsx`) | `PreviewToolbar.tsx` |
| Functions & variables | `camelCase` | `computeTileGrid`, `devicePixelRatio` |
| Types & interfaces | `PascalCase` | `CapturePlan`, `TileRectPx` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_CHUNK_HEIGHT_PX`, `CAPTURE_MIN_INTERVAL_MS` |
| Chrome i18n keys | `snake_case` | `popup_capture_full_page` |
| Message action names | `UPPER_SNAKE_CASE` | `START_CAPTURE`, `STITCH_TILE` |

## 4. Extension-Specific Rules
- **DOM Safety in Content Scripts:**
  - Never mutate host page `document.head` or global classes; mount overlays exclusively inside a closed/open **Shadow DOM** host element with a unique `data-wss-overlay` attribute.
  - Every temporary style change on host elements (such as `visibility: hidden` on `fixed` headers or `scroll-behavior: auto`) must save the exact previous inline property & priority and restore it in a `finally` block.
- **Memory & Canvas Discipline:**
  - Always call `bitmap.close()` immediately after `ctx.drawImage(bitmap, ...)` inside `canvas-stitcher.ts`.
  - Always revoke `URL.createObjectURL(...)` handles when unmounting preview images or deleting a job.
- **Error Handling:**
  - Throw typed `CaptureError` instances with machine-readable `code` (`RESTRICTED_PAGE`, `USER_CANCELLED`, `TAB_CLOSED`, `CANVAS_LIMIT`, `CAPTURE_RATE_LIMIT`, `UNKNOWN`).
  - Surface localized user-friendly messages in Popup/Preview; log structured debug context (without page URLs or page content) only in dev mode.

## 5. Formatting, Linting & Dependencies
- Prettier handles formatting (`2` spaces, single quotes, trailing commas, `LF` line endings per `.editorconfig`).
- ESLint 10 enforces `typescript-eslint` recommended + strict type-checked rules, `react-hooks`, and `no-console` (allow `console.warn`/`console.error` only via logger utility).
- **Dependency policy:** Never add a runtime npm dependency when a built-in Web or Chrome API solves it cleanly (e.g., use native `OffscreenCanvas.convertToBlob`, `IndexedDB`, and `chrome.i18n` directly). Every new dependency requires justification, exact version pinning, and updating `docs/STACK.md`.

## 6. Code Review Checklist
- [ ] Pure math isolated from `chrome.*` and DOM?
- [ ] All DOM mutations reverted inside `finally`?
- [ ] `ImageBitmap` and `ObjectURL` instances explicitly released?
- [ ] All user-facing strings loaded from `_locales`?
- [ ] Unit tests added for new math/logic and Playwright E2E updated for browser behavior?
