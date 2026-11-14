## What & why

<!-- One or two sentences explaining the change. Link the ROADMAP phase/task. -->

Phase:

## How to test

<!-- Steps a reviewer can follow locally in Chromium or via tests. -->

## Checklist

- [ ] `pnpm check` passes locally (lint, format:check, typecheck, unit tests, build)
- [ ] `pnpm test:e2e` passes for affected capture/UI flows (or explained if N/A)
- [ ] Tests added/updated at the right layer (pure math in Vitest, browser flows in Playwright)
- [ ] UI verified in both Arabic (RTL) and English (LTR) if UI changed
- [ ] No secrets, telemetry, raw colors, or hard-coded UI strings
- [ ] Manifest permissions unchanged (or justified with ADR + `SECURITY.md` update)
- [ ] New dependency justified, exact-pinned, and `docs/STACK.md` updated
- [ ] Docs and `docs/ROADMAP.md` checkboxes updated

## Screenshots / test results
