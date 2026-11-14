# ADR-0002: Default Capture Engine via captureVisibleTab + OffscreenCanvas Stitching

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** Project Owner & Lead Agent

## Context
The extension must capture full web pages and drag-selected tall regions at **very high resolution (native High-DPI / `devicePixelRatio`)**, while remaining lightweight, fast to review on the Chrome Web Store, and free of intrusive browser warning banners. The owner asked us to select the most suitable engine and document the trade-off.

## Decision
Adopt **`chrome.tabs.captureVisibleTab` (lossless PNG frames) + Smart Scroll Orchestration + `OffscreenCanvas` pixel stitching** as the default v1.0 capture engine, wrapped behind a clean `CaptureEngine` interface (`src/messaging/capture-engine.ts`) with chunk splitting at `16,384 px` height.

## Alternatives considered
- **`chrome.debugger` / Chrome DevTools Protocol (`Page.captureScreenshot` with `captureBeyondViewport: true`):** Captures full page without scrolling and supports custom forced `deviceScaleFactor`, but requires the sensitive `debugger` permission (triggers Chrome Web Store manual scrutiny) and displays a persistent yellow `"started debugging this browser"` infobar to the user during capture.
- **DOM-to-SVG/Canvas Cloning (`html2canvas`-style):** Breaks on cross-origin images/iframes, complex CSS (`backdrop-filter`, web fonts, Shadow DOM), and never matches true Chromium pixel rendering.

## Consequences
- **Positive:** True browser-rendered High-DPI pixels, minimal `activeTab` + `offscreen` permissions, zero debug infobar, smooth Chrome Web Store review path.
- **Negative / risks:** Must explicitly handle `position: fixed/sticky` suppression, `scroll-behavior: smooth` override, `lazy-load` image settle, and Chromium `captureVisibleTab` rate limits; pages with custom nested scroll containers (`overflow: auto` divs) need dedicated handling in Phase 4.
- **Follow-ups:** Keep `CaptureEngine` abstracted so an optional opt-in `CDP Ultra-HD` engine can be evaluated in `v1.1+` (tracked in `docs/OPEN-QUESTIONS.md` #4).
