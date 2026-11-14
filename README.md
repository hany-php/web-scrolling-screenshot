# Web Scrolling Screenshot

A high-precision, 100% client-side Chromium Manifest V3 browser extension for capturing **full-page scrolling screenshots** and **drag-to-select region screenshots** (including tall scrollable areas) at native **High-DPI (`devicePixelRatio`)** resolution — with an interactive preview tab and lossless PNG / adjustable JPEG & WebP export.

## Core Principles

- **High-DPI Fidelity:** Captures at native `window.devicePixelRatio` with integer pixel math and zero blurry rescaling.
- **Zero Friction, Zero Telemetry:** Works completely offline/locally with minimal permissions (`activeTab`, `scripting`, `offscreen`, `downloads`, `storage`), no accounts, no watermarks, and no capture limits.
- **Bilingual UI:** Full support for **Arabic (RTL)** and **English (LTR)** via Chrome `_locales`.

## Documentation

- **Owner Docs (Arabic):**
  - [Docs Index (`docs/README.md`)](docs/README.md)
  - [Product Requirements (`docs/PRD.md`)](docs/PRD.md)
  - [Phased Roadmap & Test Gates (`docs/ROADMAP.md`)](docs/ROADMAP.md)
  - [Open Questions (`docs/OPEN-QUESTIONS.md`)](docs/OPEN-QUESTIONS.md)
- **Engineering Docs (English):**
  - [Agent & Developer Rules (`AGENTS.md`)](AGENTS.md)
  - [Tech Stack (`docs/STACK.md`)](docs/STACK.md)
  - [Architecture (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md)
  - [Coding Standards (`docs/CODING-STANDARDS.md`)](docs/CODING-STANDARDS.md)
  - [Testing Strategy (`docs/TESTING.md`)](docs/TESTING.md)
  - [Security & Privacy (`docs/SECURITY.md`)](docs/SECURITY.md)
  - [Design System (`docs/DESIGN-SYSTEM.md`)](docs/DESIGN-SYSTEM.md)
  - [Deployment & Store Release (`docs/DEPLOYMENT.md`)](docs/DEPLOYMENT.md)
  - [Architecture Decision Records (`docs/adr/`)](docs/adr/0001-wxt-and-react-stack.md)

## Quick Start

> Extension source scaffolding starts in **Phase 0** of [`docs/ROADMAP.md`](docs/ROADMAP.md).

```bash
# Requires Node 24.22.1 and pnpm 10.30.0
pnpm install
pnpm dev       # Launches Chromium with the extension loaded in watch mode
pnpm check     # Runs lint, format check, typecheck, unit tests, and build
pnpm test:e2e  # Runs Playwright Chromium extension E2E tests
```
