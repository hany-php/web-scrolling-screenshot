# Changelog

All notable changes to **Web Scrolling Screenshot** are documented in this file.

## [1.0.0] — 2026-11-15

### Added

- **Full-Page High-DPI Capture:** Auto-scrolling capture engine with `sticky`/`fixed` header suppression after tile 1, smooth-scroll override and restoration, lazy-load viewport settling, rate-limited `captureVisibleTab`, and automatic chunk splitting at `16,384 px` / `200 MP`.
- **Drag-to-Select Region Capture:** Closed Shadow DOM `SelectionOverlay` with live `W × H px` dimensions pill, `48 px` top/bottom Edge Auto-Scroll zones for tall regions, `Esc`/button cancellation, and cropped High-DPI stitching.
- **Interactive Preview & Multi-Format Export:** Dedicated Preview Tab backed by ephemeral `IndexedDB` blob cache (auto-cleaned on tab close), checkerboard canvas stage, `Fit` / `100%` / `+` / `-` / slider zoom controls (`10%–400%`) with `+`/`-`/`0` keyboard shortcuts, lossless PNG + JPEG/WebP (`60%–100%`) quality encoding, and sequential multi-part downloads.
- **Bilingual Arabic (RTL) & English (LTR) UI:** Full `_locales/{ar,en}` catalogs plus an instant live `العربية / EN` language toggle persisted in `chrome.storage.local`.
- **Hardening & Release Polish:** Built-in PDF/store/internal browser URL protection, fixed-shell SPA inner scroll-container detection, High-DPI browser zoom support (`1.5x+`), crisp vector PNG icons (`16/32/48/128 px`), `PRIVACY.md`, and Chrome Web Store `.zip` packaging.
