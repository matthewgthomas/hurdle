# Hurdle

A daily geography game told through Olympic history. One country, six hurdles, and a new story at midnight UTC.

Hurdle is a static React + TypeScript + Vite application with custom CSS and local SVG illustrations. Its sporting almanac spans **86 editions** of the Summer and Winter Olympics and Paralympics, including the 2026 Winter Games. The initial catalog contains **170 medal-winning answers** and 15 historical team identities.

## Run locally

Use Node.js 22 and Python 3.12 or later.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/hurdle/**. Python is needed for data validation; the browser game runs entirely on static assets. A normal build does not contact the sporting data providers.

```sh
npm run check        # Source reconciliation, engine/storage tests, TypeScript, production build
npm run preview      # Serve dist at http://127.0.0.1:4173/hurdle/
```

## Play

- Guess a country or historical geographic team in six attempts. Search accepts Olympic codes, common names and aliases.
- A wrong guess or skip uses one attempt and reveals the next clue. Invalid and duplicate guesses use none.
- Four different sporting clue families appear in a seeded order; the final two clues offer geographic and historical help.
- Expand a guess to compare the information already revealed. Higher/lower arrows describe the **mystery team relative to your guess**.
- Daily progress and statistics stay on the current browser. Practice is unlimited, excludes today’s answer, and does not change daily statistics.
- An unfinished daily round survives midnight. The new round is offered explicitly. Puzzle #1 is 8 September 2026.

## GitHub Pages

The production base is already `/hurdle/`. In the repository’s **Settings → Pages**, choose **GitHub Actions** as the source. Push the finished project to `main` to trigger `.github/workflows/deploy.yml`.

The workflow installs locked dependencies, reconciles the data, runs tests, builds `dist`, and deploys that artifact to Pages. Pull requests run the checks without deployment. The expected project URL is **https://matthewgthomas.github.io/hurdle/** once the owner publishes it. No publication is performed by local development.

This follows [Vite’s GitHub Pages instructions](https://vite.dev/guide/static-deploy.html#github-pages). If the repository is renamed, update `base` in `vite.config.ts` and the repository links in `src/App.tsx`.

## Data and catalog releases

Read [the data methodology](data/README.md) before refreshing. It documents sources, date-aware identities, exclusions, known archive discrepancies and exact release steps. Missing breakdowns are `null`; their clue families are suppressed. Complete edition medal tables remain the authority for totals.

Published catalogs are checksum-locked in `data/catalog-lock.json`. `scripts/freeze_catalog.py` generates the browser’s version registry. A new catalog requires a new file, version, and future UTC activation date. Older files remain available so past and unfinished puzzles retain their original answers and clues.

## Structure

| Path | Purpose |
| --- | --- |
| `src/game/` | Typed data, deterministic puzzles, comparisons, scoring, dates and safe persistence |
| `src/components/` | Clue cards, keyboard autocomplete and native dialogs |
| `src/App.tsx` | Daily/practice interaction, statistics, sharing and completion profile |
| `data/sources/` | Extracted source facts with URLs, query scopes and retrieval dates |
| `scripts/` | Reproducible source imports, catalog compilation and validation |
| `public/` | Local silhouettes, historical flags and font licenses |

## Verification

`npm run check` runs 22 engine and persistence tests plus the Python release checks. Coverage includes UTC rollover, shuffled answer cycles, catalog activation, clue eligibility for every answer, aliases, unknown comparisons, six-attempt outcomes, ties, team awards, historical mappings, corrupted storage and once-only statistics.

Browser QA includes complete win/loss flows, keyboard search, sharing fallback, practice isolation, reduced motion, accessible dialogs and responsive layouts at 320, 390, 768 and 1440 pixels. See [the QA record](docs/QA.md) for scope and practical limits.

## Credits

Sporting data: [Olympedia / OlyMADMen](https://www.olympedia.org/) and the [International Paralympic Committee](https://www.paralympic.org/), with the official Milano Cortina 2026 results books. Geography: Natural Earth via `world-atlas`, and [mledoze/countries](https://github.com/mledoze/countries). Fonts: Barlow Condensed and DM Sans, self-hosted under the SIL Open Font License.

The application code is MIT licensed. Source datasets, fonts and third-party flag artwork retain their own rights and attribution; see [data notes](data/README.md) and `public/licenses/`. Hurdle is an independent fan project, unaffiliated with the IOC or IPC.
