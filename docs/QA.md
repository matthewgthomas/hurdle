# Hurdle verification record

Verified locally on 8–9 September 2026, using the frozen 1.0.0 catalog.

## Automated release checks

- `npm run check` passes: Python data reconciliation, **22 Vitest tests**, TypeScript compilation and the production Vite build.
- The source compiler verifies **229 profiles and 86 editions** across all four competitions. Olympic edition, discipline and category totals independently reconcile after the documented exclusions. Supported Paralympic breakdowns reconcile by edition and medal colour.
- Regression checks cover the 1956 Stockholm sub-edition, historical identity separation, team awards counted once, a 2026 bronze tie, colliding IPC event URLs, unknown breakdowns, complete edition coverage and immutable catalog hashes.
- Engine tests cover deterministic puzzles, answer rotation over eight cycles, cycle boundaries, UTC/leap-day calculations, future catalog activation, every answer’s clue eligibility, aliases, tied leading sports, skips, duplicates, invalid guesses and six-attempt outcomes.
- Persistence tests cover reload recovery, corrupted/unavailable storage, once-only statistics, streak gaps/losses, practice isolation and preserving an unfinished round across midnight.

## Browser checks

Chrome was driven with Playwright against both the development app and the actual `dist` build at `/hurdle/`.

- Complete daily win, reload of the completed result, and once-only statistics.
- Complete six-skip loss and a separate historical-team loss, with answer, flag and sporting profile revealed.
- Practice round isolation and return to the saved daily round.
- Keyboard autocomplete with an alias, ArrowDown/Enter selection, Enter submission, and duplicate rejection without consuming an attempt.
- Immediate comparisons after a miss, previous clue navigation, source labels and local silhouette loading.
- Historical badge present before the first guess; historical text hints and locally hosted flag verified on completion.
- Clipboard-unavailable fallback displays spoiler-free, selectable share text.
- Help dialog Tab cycling and Escape dismissal; keyboard focus remains inside the dialog.
- Reduced-motion preference removes clue animations.
- Responsive screenshots inspected at **320, 390, 768 and 1440 CSS pixels**, with no horizontal document overflow.
- Production asset loading under `/hurdle/`, with no failed requests or JavaScript page errors during the release check.
- Axe-core scans against WCAG 2 A/AA and 2.1 AA tags passed in the checked game/completion states. Text contrast and control sizing were adjusted during QA.

Local screenshots are in `output/playwright/` and are intentionally excluded from Git. They include both fresh games and completed test rounds; completed screenshots contain spoilers.

## Scope and remaining manual checks

Browser QA used Chrome on macOS with desktop and mobile viewport sizes. Real iOS/Android virtual keyboards, Safari/Firefox, and spoken VoiceOver/NVDA output were not physically exercised. Screen-reader semantics were checked through browser accessibility snapshots, labelled controls/charts, live announcements, keyboard navigation and axe-core. These automated checks do not establish universal accessibility conformance.

The Pages workflow and production base path are delivered and locally verified. The repository owner controls publication; the live GitHub Pages deployment has not been run here.

The historical archive’s unresolved breakdown discrepancies are documented in `data/README.md` and the validation report. They are deliberately suppressed in gameplay rather than presented as invented or zero-valued statistics.
