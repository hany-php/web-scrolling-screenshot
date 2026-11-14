# Architecture — Web Scrolling Screenshot

## 1. System Overview
Web Scrolling Screenshot runs **100% locally inside Chromium Manifest V3**. It coordinates four isolated browser execution contexts using typed `chrome.runtime` messages:

```mermaid
flowchart LR
    User["User (Popup / Shortcut)"] -->|1. Start Capture| SW["Background Service Worker"]
    SW -->|2. Inject on demand (activeTab)| CS["Content Script (Target Page)"]
    CS -->|3a. Optional Region Overlay (Shadow DOM)| User
    CS -->|3b. Scroll Plan & Tile Step| SW
    SW -->|4. captureVisibleTab (PNG)| Chrome["Chromium Tab API"]
    Chrome -->|5. Data URL Frame| SW
    SW -->|6. Forward Frame + Tile Rect| Offscreen["Offscreen Document (OffscreenCanvas)"]
    Offscreen -->|7. Stitch & Chunk Output Blobs| IDB["Extension IndexedDB (Temp Store)"]
    SW -->|8. Open Preview Tab| Preview["Preview Tab (preview.html)"]
    Preview -->|9. Read Blobs & Encode/Export| Downloads["chrome.downloads"]
```

## 2. Execution Contexts & Responsibilities
| Context | Entrypoint (`src/entrypoints/`) | Responsibilities | Forbidden |
|---|---|---|---|
| **Popup UI** | `popup/` | Mode selection (`Full Page`, `Region`), quick format selector, live capture progress & cancel button, restricted-page error notices | Never runs canvas stitching or holds large image buffers |
| **Background Service Worker** | `background.ts` | State machine for active capture job, rate-limited `captureVisibleTab` scheduler, `offscreen` lifecycle, opening `preview.html` | Never touches host page DOM directly; never performs `Canvas` pixel work (MV3 SW has no DOM Canvas) |
| **Content Script** | `content.ts` (injected via `scripting.executeScript`) | Measures page metrics & DPR, renders isolated Shadow DOM `SelectionOverlay`, handles edge auto-scroll, suppresses `fixed/sticky` after tile 0, triggers lazy-load settle, restores page state in `finally` | Never imports React or large UI libs; never leaks CSS into host page |
| **Offscreen Document** | `offscreen/` | Initializes `OffscreenCanvas` chunks (capped at 16,384 px height), decodes frames via `createImageBitmap`, draws exact DPR pixel rects, closes bitmaps immediately, writes stitched PNG/raw chunk blobs to IndexedDB | Never makes network requests or manipulates tabs |
| **Preview Tab** | `preview/` | Reads stitched capture job from IndexedDB, displays zoomable preview (`Fit`, `1:1`, up to `400%`), encodes `PNG` / `JPEG` / `WebP` on export, triggers `chrome.downloads`, cleans up IndexedDB entry on tab unload | Never retains captures after user closes the preview tab |

## 3. Capture Sequence (Full Page & Region)

```mermaid
sequenceDiagram
    autonumber
    participant P as Popup / Command
    participant B as Background SW
    participant C as Content Script
    participant O as Offscreen Stitcher
    participant V as Preview Tab

    P->>B: START_CAPTURE { mode: "full" | "region" }
    B->>C: Inject orchestrator via activeTab + scripting
    alt mode == "region"
        C-->>P: User drags selection box (with edge auto-scroll)
        Note over C: Esc cancels & removes Shadow DOM cleanly
    end
    C->>C: Compute CapturePlan (viewport, DPR, target rect, tile grid)
    C->>B: INIT_STITCH_JOB { jobId, totalWidthPx, totalHeightPx, dpr, chunks }
    B->>O: Ensure Offscreen Document + forward INIT_STITCH_JOB
    loop For each tile in CapturePlan
        C->>C: Scroll to tile (x, y); if tile > 0 hide fixed/sticky; wait lazy-load settle
        C->>B: CAPTURE_TILE_READY { tileIndex, srcRectPx, destRectPx, chunkIndex }
        B->>B: Rate-limited chrome.tabs.captureVisibleTab({ format: "png" })
        B->>O: STITCH_TILE { jobId, tileDataUrl, srcRectPx, destRectPx, chunkIndex }
        O->>O: createImageBitmap -> drawImage -> bitmap.close()
        B-->>P: CAPTURE_PROGRESS { completed, total }
    end
    C->>C: Restore scroll position, scroll-behavior, and fixed/sticky elements (finally)
    B->>O: FINALIZE_STITCH_JOB { jobId }
    O->>O: convertToBlob({ type: "image/png" }) -> save to IndexedDB
    O-->>B: STITCH_JOB_READY { jobId, parts }
    B->>V: chrome.tabs.create("preview.html?job=" + jobId)
```

## 4. Repository Structure & Module Boundaries
```text
src/
├── entrypoints/
│   ├── popup/                 # React Popup app
│   ├── preview/               # React Preview & Export tab
│   ├── offscreen/             # Offscreen HTML + stitching worker listener
│   ├── content.ts             # On-demand injected script (no static content_scripts match)
│   └── background.ts          # MV3 Service Worker state machine
├── capture/
│   ├── scroll-planner.ts      # Pure math: scroll offsets, overlap/tile grid, region clipping
│   ├── slice-splitter.ts      # Pure math: splits >16,384px captures into safe canvas chunks
│   ├── sticky-manager.ts      # Detects & temporarily hides fixed/sticky elements safely
│   ├── lazy-loader.ts         # Triggers scroll-into-view / image decode settle
│   └── selection-overlay.ts   # Shadow DOM drag-to-select & edge auto-scroll controller
├── stitcher/
│   ├── canvas-stitcher.ts     # OffscreenCanvas chunk manager & bitmap lifecycle
│   ├── image-encoder.ts       # PNG / JPEG / WebP encoding & filename formatter
│   └── capture-store.ts       # Ephemeral IndexedDB store for stitched Blobs
├── messaging/
│   ├── protocol.ts            # Discriminated union message types & sender/payload guards
│   └── capture-engine.ts      # Abstract CaptureEngine interface (ADR-0002)
├── i18n/
│   └── messages.ts            # Typed wrapper over chrome.i18n.getMessage + RTL helpers
└── shared/
    ├── constants.ts           # Safe canvas limits, capture rate-limit intervals, defaults
    └── errors.ts              # Typed CaptureError codes (RESTRICTED_PAGE, CANCELLED, etc.)
```

**Dependency rules:**
- `capture/scroll-planner.ts` and `capture/slice-splitter.ts` are **100% pure TypeScript** (no `window`, no `document`, no `chrome.*`) so they can be exhaustively unit-tested in Vitest.
- `entrypoints/*` never duplicate math; they call `capture/*` and `stitcher/*`.
- All cross-context messages flow through `messaging/protocol.ts` and are validated at runtime before execution.

## 5. High-DPI & Edge-Case Design Rules
1. **Integer Pixel Alignment:** All tile dimensions and destination offsets are multiplied by `devicePixelRatio` and rounded with consistent edge clamping (`Math.round`) so adjacent tiles never leave 1 px transparent seams on fractional DPRs (e.g., `1.25x`, `1.5x`).
2. **Capture Rate Limiting:** Chromium enforces `MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND` (historically ~2 calls/sec in strict builds). The Background Service Worker spaces `captureVisibleTab` calls through a monotonic queue with exponential backoff retry if Chromium returns a quota warning.
3. **Guaranteed Page Restoration:** Any DOM mutation on the host page (`scroll-behavior: auto`, hiding `fixed/sticky` nodes, Shadow DOM overlay, initial `scrollX/scrollY`) must be tracked in a restoration stack and reverted inside a `try { ... } finally { ... }` block — even on cancel or error.
4. **Canvas Dimension Guard:** Chromium `OffscreenCanvas` crashes or returns blank output past GPU texture limits (commonly 16,384 px or 32,767 px). `slice-splitter.ts` caps each chunk at `MAX_CHUNK_HEIGHT_PX = 16384` (and max area safety bound), producing numbered seamless slices.

## 6. i18n & RTL Support
- Translations live in `public/_locales/en/messages.json` and `public/_locales/ar/messages.json`.
- UI components read `chrome.i18n.getUILanguage()` (mapped to `dir="rtl"` for `ar*` locales and `dir="ltr"` otherwise) and set `document.documentElement.dir` and `lang` on Popup and Preview mount.
- Content script `SelectionOverlay` uses Shadow DOM with logical CSS properties and localized badge text via `chrome.i18n.getMessage`.
