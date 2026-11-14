# Technology Stack — Web Scrolling Screenshot

- **Verified on:** 2026-11-14
- **Verification sources:** npm registry (`npm view <pkg> version time.modified engines peerDependencies --json`), `nodejs.org/dist/index.json`, and local toolchain inspection (`node -v`, `pnpm -v`).
- **Pinning policy:** Exact versions only (no `^` or `~` in `package.json`), committed `pnpm-lock.yaml`, runtime pinned in `.nvmrc` and `packageManager`.

## 1. Runtime & Package Manager

| Component | Exact Version | Why / Where Used                                         | Compatibility Notes                                                                                                                                                           |
| --------- | ------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js   | `24.22.1`     | Local dev, WXT build, Vitest, Playwright                 | Matches local environment; satisfies WXT (`>=22`), Vite (`>=22.12.0`), Vitest (`^24.0.0`), ESLint (`>=24`), jsdom (`^24.15.0`). Also compatible with Node 26 LTS (`26.13.1`). |
| pnpm      | `10.30.0`     | Fast deterministic installs, strict dependency isolation | Pinned via `"packageManager": "pnpm@10.30.0"` in `package.json`.                                                                                                              |

## 2. Extension Framework, Language & UI

| Package                 | Exact Version | Why / Where Used                                                                                 | Compatibility Notes                                                                                                            |
| ----------------------- | ------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `wxt`                   | `0.21.5`      | Chromium MV3 framework, auto manifest generation, HMR dev, `wxt zip` packaging                   | Peer deps: `vite ^6.3.4 \|\| ^7 \|\| ^8`, `eslint ^8.57 \|\| ^9 \|\| ^10`, `typescript >=5.4`.                                 |
| `@wxt-dev/module-react` | `1.2.2`       | React integration for WXT entrypoints (`popup`, `preview`)                                       | Peer deps: `wxt >=0.19.16`, `vite ^5.4.19 \|\| ^6.3.4 \|\| ^7 \|\| ^8`.                                                        |
| `vite`                  | `8.3.8`       | Underlying bundler used by WXT and Vitest                                                        | Satisfies `wxt` and `vitest` (`^8.0.0`) and `@tailwindcss/vite` (`^8`).                                                        |
| `typescript`            | `6.0.3`       | Strict type checking across all extension contexts                                               | **Intentionally pinned below 7.0.x** (`7.0.2` exists) because `typescript-eslint@8.72.2` requires `typescript >=4.8.4 <6.1.0`. |
| `@types/chrome`         | `0.3.7`       | Type definitions for MV3 APIs (`tabs`, `scripting`, `offscreen`, `downloads`, `storage`, `i18n`) | Zero peer deps.                                                                                                                |
| `react`                 | `19.3.1`      | Popup and Preview Tab interactive UI                                                             | Used in extension UI pages only (never injected into host web pages).                                                          |
| `react-dom`             | `19.3.1`      | React DOM renderer for Popup and Preview Tab                                                     | Peer dep: `react ^19.3.1`.                                                                                                     |
| `@types/react`          | `19.3.0`      | TypeScript types for React 19                                                                    | Matches React 19.3.x.                                                                                                          |
| `@types/react-dom`      | `19.3.0`      | TypeScript types for React DOM 19                                                                | Matches React 19.3.x.                                                                                                          |
| `tailwindcss`           | `4.3.5`       | Utility styling and CSS design token integration                                                 | Paired with `@tailwindcss/vite` for Popup and Preview pages.                                                                   |
| `@tailwindcss/vite`     | `4.3.5`       | Vite plugin for Tailwind CSS v4                                                                  | Peer dep: `vite ^5.2.0 \|\| ^6 \|\| ^7 \|\| ^8`.                                                                               |
| `lucide-react`          | `1.73.0`      | Crisp SVG icons for Popup and Preview toolbar                                                    | Peer dep: `react ^16.5.1 \|\| ^17 \|\| ^18 \|\| ^19`.                                                                          |

## 3. Code Quality & Testing

| Package                     | Exact Version | Why / Where Used                                                                       | Compatibility Notes                                                      |
| --------------------------- | ------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `eslint`                    | `10.15.0`     | Static analysis across `src/` and `tests/`                                             | Flat config (`eslint.config.mjs`).                                       |
| `@eslint/js`                | `10.0.1`      | Core recommended JS/TS base rules                                                      | Matches ESLint 10.                                                       |
| `typescript-eslint`         | `8.72.2`      | Strict TypeScript lint rules                                                           | Peer deps: `eslint ^8.57 \|\| ^9 \|\| ^10`, `typescript >=4.8.4 <6.1.0`. |
| `eslint-plugin-react-hooks` | `7.1.1`       | React hooks correctness rules                                                          | Peer dep: `eslint ^3..\^10`.                                             |
| `prettier`                  | `3.10.1`      | Deterministic formatting across TS/CSS/JSON/MD                                         | Integrated cleanly alongside ESLint.                                     |
| `vitest`                    | `5.1.0`       | Unit tests for scroll planning, DPR math, tile stitching plans, and message validation | Peer dep: `vite ^6.4 \|\| ^7 \|\| ^8`.                                   |
| `@vitest/coverage-v8`       | `5.1.0`       | Coverage reporting for pure modules                                                    | Exact match with `vitest@5.1.0`.                                         |
| `jsdom`                     | `31.0.1`      | DOM environment for overlay/i18n/React component unit tests                            | Engines: `node ^22.22.2 \|\| ^24.15.0 \|\| >=26`.                        |
| `@playwright/test`          | `1.65.1`      | Real Chromium MV3 extension E2E testing                                                | Loads unpacked `.output/chrome-mv3` via persistent browser context.      |

## 4. Platform & Browser APIs (Zero Runtime External Deps)

- `chrome.tabs.captureVisibleTab` — native High-DPI viewport capture (`PNG` lossless frames).
- `chrome.scripting.executeScript` — on-demand content script injection via `activeTab` (no persistent host scripts).
- `chrome.offscreen` — MV3 Offscreen Document hosting `OffscreenCanvas` for stitching and `PNG`/`JPEG`/`WebP` encoding without blocking the Service Worker.
- `chrome.downloads` & `chrome.storage.local` — local saving and user export preferences.
- `chrome.i18n` — `_locales/ar` and `_locales/en` translations.

## 5. Upgrade Policy

- **Automated PRs:** Dependabot weekly check for npm packages and GitHub Actions (configured in Phase 0).
- **Patch & minor updates:** Merge when `pnpm check` and `pnpm test:e2e` pass in CI.
- **Security advisories:** Patch within 48 hours.
- **Major versions or new runtime dependencies:** Require verifying peer ranges, updating this file, and recording an ADR if architecture or tooling changes.
