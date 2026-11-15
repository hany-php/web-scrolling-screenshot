# Web Scrolling Screenshot

A high-precision, 100% client-side Chromium Manifest V3 browser extension for capturing **full-page scrolling screenshots** and **drag-to-select region screenshots** (including tall scrollable areas) at native **High-DPI (`devicePixelRatio`)** resolution — with an interactive preview tab and lossless PNG / adjustable JPEG & WebP export.

## Core Principles

- **High-DPI Fidelity:** Captures at native `window.devicePixelRatio` with integer pixel math and zero blurry rescaling.
- **Zero Friction, Zero Telemetry:** Works completely offline/locally with minimal permissions (`activeTab`, `scripting`, `offscreen`, `downloads`, `storage`), no accounts, no watermarks, and no capture limits.
- **Bilingual UI:** Full support for **Arabic (RTL)** and **English (LTR)** via Chrome `_locales`.

## Download & Install (Ready-to-Use Release)

Want to use the extension right away without building from source? Download the pre-built package from [**GitHub Releases (`v1.0.0`)**](https://github.com/hany-php/web-scrolling-screenshot/releases/latest):

1. Download `web-scrolling-screenshot-1.0.0-chrome.zip` from the latest release and **extract (unzip)** it to a permanent folder on your computer.
2. Open `chrome://extensions` (Chrome), `edge://extensions` (Edge), or `brave://extensions` (Brave).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the extracted folder (containing `manifest.json`).

> Zero telemetry, zero watermarks, zero network calls — works 100% locally in Arabic (RTL) and English (LTR) with instant language switching.

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
  - [Privacy Policy (`PRIVACY.md`)](PRIVACY.md)
  - [Design System (`docs/DESIGN-SYSTEM.md`)](docs/DESIGN-SYSTEM.md)
  - [Deployment & Store Release (`docs/DEPLOYMENT.md`)](docs/DEPLOYMENT.md)
  - [Architecture Decision Records (`docs/adr/`)](docs/adr/0001-wxt-and-react-stack.md)

## Quick Start (Build from Source)

```bash
# Requires Node 24.22.1 and pnpm 10.30.0
pnpm install
pnpm dev       # Launches Chromium with the extension loaded in watch mode
pnpm check     # Runs lint, format check, typecheck, unit tests, and build
pnpm test:e2e  # Runs Playwright Chromium extension E2E tests
pnpm zip       # Packages .output/web-scrolling-screenshot-1.0.0-chrome.zip
```
