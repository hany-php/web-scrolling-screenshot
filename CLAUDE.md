@AGENTS.md

# Claude Code / Agent Notes

Everything in [`AGENTS.md`](AGENTS.md) applies. Additions for every coding session:

## Session start
1. Read [`docs/ROADMAP.md`](docs/ROADMAP.md) and locate the current phase (the first phase not marked `✅`).
2. Read every document listed under that phase's **Read before starting** section.
3. Check [`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md); if an open question blocks the current task, ask the owner before inventing an answer.

## Talking to the owner
- The owner is a **Software Developer** who prefers **Arabic** in conversation (clear, concise, technical-friendly Arabic wrapped cleanly in RTL blocks per user rules; code, file paths, and commands in English).
- Explain trade-offs concisely and report real test counts and command outputs.
- At each phase gate, report:
  1. What was built and verified.
  2. Exact test results (unit + Playwright E2E counts, pass/fail).
  3. Remaining items or known limitations.
  4. What approval or decision is needed next.

## Working style
- Enter plan mode before multi-file edits, new entrypoints, or new dependencies.
- Keep each change focused on the smallest vertical slice that moves the current phase forward; avoid unrelated refactors.
- Run the narrowest relevant check first (e.g., `pnpm test tests/unit/scroll-planner.test.ts`), then run `pnpm check` before marking a task complete.
- Never claim tests or builds passed without running them after your final edit; paste the real summary output.
- If a command or test fails twice for the same root cause, stop, summarize the diagnostics, and ask before proceeding.

## Visual & browser verification
- For any change to Popup, Selection Overlay, or Preview Tab UI, verify both **Arabic (`ar`, RTL)** and **English (`en`, LTR)** locales in Chromium.
- Check Playwright screenshot/fixture outputs for alignment seams (zero 1px gaps or duplicated sticky headers).

## Decisions
- Record every lasting architectural or library decision as an ADR in `docs/adr/` by copying [`docs/adr/0000-template.md`](docs/adr/0000-template.md).
