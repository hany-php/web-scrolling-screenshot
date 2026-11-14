# AGENTS.md — Web Scrolling Screenshot

Instructions for any AI coding agent and human developer working in this repository. Read fully before changing anything.

## 1. What we are building
**Web Scrolling Screenshot** is a 100% client-side Chromium Manifest V3 browser extension (Chrome, Edge, Brave) for capturing **full-page scrolling screenshots** and **freeform drag-to-select region screenshots** (including tall scrollable regions) at native **High-DPI (`devicePixelRatio`)** fidelity, with an interactive preview tab and lossless PNG / adjustable JPEG & WebP export — zero watermarks, zero capture limits, and zero telemetry.

- Product requirements (Arabic): [`docs/PRD.md`](docs/PRD.md)
- Build order and phase gates (Arabic): [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Docs index (Arabic): [`docs/README.md`](docs/README.md)

## 2. Read before you code
| When you are… | Read |
|---|---|
| Starting any task | This file, then the current phase in [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| Touching structure, messaging, or capture flow | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/adr/`](docs/adr/0001-wxt-and-react-stack.md) |
| Adding or upgrading a dependency | [`docs/STACK.md`](docs/STACK.md) |
| Writing code or refactoring modules | [`docs/CODING-STANDARDS.md`](docs/CODING-STANDARDS.md) |
| Building UI (Popup, Overlay, Preview, i18n/RTL) | [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) |
| Writing tests or finishing a task | [`docs/TESTING.md`](docs/TESTING.md) |
| Changing permissions, CSP, or file export | [`docs/SECURITY.md`](docs/SECURITY.md) |
| Packaging or publishing the extension | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) |

If a doc and the code disagree, stop and ask the owner before guessing.

## 3. Stack (pinned, change only via ADR)
Node 24.22.1 · pnpm 10.30.0 · TypeScript 6.0.3 (strict) · WXT 0.21.5 (MV3) · Vite 8.3.8 · React 19.3.1 · Tailwind CSS 4.3.5 · Vitest 5.1.0 · Playwright 1.65.1. Exact pinned versions and compatibility notes: [`docs/STACK.md`](docs/STACK.md).

## 4. Repository layout (target starting Phase 0)
```text
.
├── AGENTS.md                        # Core rules for all agents and developers
├── CLAUDE.md                        # Session ritual and owner communication rules
├── README.md                        # Quick start and overview
├── .github/
│   ├── pull_request_template.md     # PR checklist
│   └── workflows/ci.yml             # CI pipeline (added in Phase 0)
├── docs/                            # Foundation docs and ADRs
├── public/_locales/{ar,en}/         # Chrome MV3 i18n message catalogs (added in Phase 0)
├── src/
│   ├── entrypoints/                 # WXT MV3 entrypoints (popup, background, content, offscreen, preview)
│   ├── capture/                     # Pure capture math, scroll orchestrator, sticky/lazy handlers
│   ├── stitcher/                    # OffscreenCanvas pixel-accurate tile stitching and encoding
│   ├── messaging/                   # Typed chrome.runtime message contracts & schema validation
│   ├── i18n/                        # Locale helpers and RTL/LTR direction utilities
│   └── shared/                      # Constants, types, error classes (no DOM or chrome.* side effects)
└── tests/
    ├── unit/                        # Vitest unit tests (math, stitcher plan, validators)
    ├── e2e/                         # Playwright Chromium MV3 extension E2E tests
    └── fixtures/                    # Deterministic HTML test pages (tall, sticky, lazy, RTL)
```

**Dependency direction rules:**
- `entrypoints/*` → may import `capture/*`, `stitcher/*`, `messaging/*`, `i18n/*`, `shared/*`.
- `capture/*`, `stitcher/*`, `i18n/*` → may import `messaging/*` and `shared/*` only; never import `entrypoints/*`.
- `shared/*` and `messaging/*` → zero imports from DOM-specific UI or `entrypoints/*`.
- Pure math and planning modules (scroll step planner, tile coordinate math, slice splitting) must have **zero `chrome.*` or `window` dependencies** so Vitest can test them deterministically.

## 5. Commands
> Available after **Phase 0** scaffolds `package.json`.

```bash
pnpm install              # Install exact pinned dependencies
pnpm dev                  # Start WXT Chromium MV3 dev server with HMR
pnpm lint                 # Run ESLint across src/ and tests/
pnpm format:check         # Check Prettier formatting
pnpm typecheck            # Run TypeScript strict type checking (tsc --noEmit)
pnpm test                 # Run Vitest unit & integration tests
pnpm test:e2e             # Build extension and run Playwright Chromium MV3 suite
pnpm build                # Production MV3 build
pnpm zip                  # Package clean Chrome Web Store .zip via WXT
pnpm check                # Full local gate: lint + format:check + typecheck + test + build
```

## 6. How to work
1. **One phase at a time:** follow the current phase in [`docs/ROADMAP.md`](docs/ROADMAP.md). Do not start the next phase until its Test Gate passes and the owner approves.
2. **Plan first** before changing more than 2 files or adding a new entrypoint/message type.
3. **Small vertical slices:** tests are part of the task, not an afterthought.
4. **Update docs and tick ROADMAP boxes** in the same change when completing tasks or making decisions.
5. **Ask the owner before:** adding a new dependency, requesting a new browser permission in `manifest`, changing the stack, deleting files/data, or publishing to Chrome Web Store.

## 7. Definition of done
- [ ] `pnpm check` passes (lint, format check, typecheck, unit tests, production build)
- [ ] New capture/stitching/UI logic has unit tests; any bug fix includes a regression test first
- [ ] E2E checks pass on affected flows in Chromium (including Arabic RTL + English LTR where UI changes)
- [ ] No hard-coded UI strings (all user-facing copy uses `_locales` / i18n) or raw magic colors
- [ ] Manifest permissions remain minimal (`activeTab`, `scripting`, `offscreen`, `downloads`, `storage` — zero `<all_urls>` host permissions)
- [ ] Docs and `docs/ROADMAP.md` checkboxes updated

## 8. Non-negotiable rules
- **Security & Privacy:** 100% client-side execution. Never add telemetry, analytics, external network calls, or broad host permissions. Validate every `chrome.runtime` message payload at the boundary. See [`docs/SECURITY.md`](docs/SECURITY.md).
- **Code quality:** TypeScript `strict: true`, `noUncheckedIndexedAccess: true`, zero `any`, zero `@ts-ignore`, small single-purpose functions. Business/pixel math lives in pure tested modules.
- **UI & i18n:** Use CSS design tokens from [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) and logical CSS properties (`margin-inline`, `padding-inline`, `inset-inline`) so Arabic RTL and English LTR mirror cleanly.
- **Language policy:** Code, identifiers, commits, PRs, and technical docs (`AGENTS.md`, `CLAUDE.md`, `STACK.md`, `ARCHITECTURE.md`, `CODING-STANDARDS.md`, `TESTING.md`, `SECURITY.md`, `DESIGN-SYSTEM.md`, `DEPLOYMENT.md`, `docs/adr/*`) are in **English**. Owner-facing docs (`docs/README.md`, `docs/PRD.md`, `docs/ROADMAP.md`, `docs/OPEN-QUESTIONS.md`) are in **Arabic**. Extension UI supports both **Arabic and English** via `_locales`.

## 9. Git
- Branches: `phase-<n>/<short-topic>` (e.g., `phase-0/scaffold-wxt`, `phase-1/scroll-planner`)
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`)
- PRs: use [`.github/pull_request_template.md`](.github/pull_request_template.md); CI must be green before merge; never commit directly to `main`.

## 10. Never do
- Never commit secrets, store API keys, `.env` files, or built `.output/` / `.wxt/` artifacts
- Never disable ESLint rules, skip tests, or relax `tsconfig` strict flags to make checks pass
- Never add `<all_urls>` or `tabs` / `debugger` permissions without owner approval and an ADR
- Never inject unisolated global CSS into host web pages from content scripts (always use Shadow DOM or tightly scoped container styles)
- Never edit generated files under `.wxt/` or `.output/` manually
