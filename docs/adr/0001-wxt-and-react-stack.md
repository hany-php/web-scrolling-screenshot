# ADR-0001: Use WXT, TypeScript (6.0.x), React, and Tailwind CSS for Chromium MV3

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** Project Owner & Lead Agent

## Context

We are building **Web Scrolling Screenshot**, a multi-context Chromium Manifest V3 extension (Popup UI, on-demand Content Script, Background Service Worker, Offscreen Document, and Preview Tab) with strict type safety, bilingual `_locales` support (Arabic RTL + English LTR), and automated Chromium E2E testing. We need a build tool that handles MV3 entrypoints, HMR during local development, clean `.zip` packaging for Chrome Web Store, and full compatibility with current ESLint/TypeScript tooling.

## Decision

Use **WXT (`0.21.5`)** with **`@wxt-dev/module-react` (`1.2.2`)**, **React (`19.3.1`)**, **Tailwind CSS (`4.3.5`)**, and **TypeScript (`6.0.3` strict)**, managed with **pnpm (`10.30.0`)** on **Node (`24.22.1`)**.

TypeScript is intentionally pinned to `6.0.3` rather than `7.0.2` because `typescript-eslint@8.72.2` declares a peer range of `>=4.8.4 <6.1.0`.

## Alternatives considered

- **CRXJS (`@crxjs/vite-plugin@3.0.0`):** Works with Vite, but lacks built-in MV3 Offscreen/multi-entrypoint conventions, store `.zip` packaging, and typed extension utilities that WXT provides out of the box.
- **Vanilla TypeScript without React:** Slightly smaller bundle for the Popup, but makes the interactive Preview Tab (zoom, quality slider, chunked part downloads, RTL/LTR state) slower to build and test cleanly. Content scripts still remain zero-React pure TypeScript/Shadow DOM so host pages incur zero React overhead.

## Consequences

- **Positive:** Fast HMR dev loop, automatic MV3 manifest generation, built-in `wxt zip` for Chrome Web Store, clean separation between React extension pages and pure-TS content/stitcher modules.
- **Negative / risks:** WXT updates frequently; mitigated by exact version pinning in `package.json` and `docs/STACK.md`.
- **Follow-ups:** Scaffold WXT project in Phase 0 and lock `pnpm-lock.yaml`.
