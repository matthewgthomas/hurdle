# The Hurdle almanac

Catalog **1.0.0**, effective **8 September 2026**, contains 229 delegation profiles, of which 170 are eligible medal-winning answers. Fifteen historical geographic teams are named separately. Non-medal-winning countries remain valid guesses.

## Coverage and sources

| Competition | Coverage | Editions | Primary source |
| --- | --- | ---: | --- |
| Summer Olympics | 1896–2024 | 30 | Olympedia country medal statistics |
| Winter Olympics | 1924–2026 | 25 | Olympedia country medal statistics |
| Summer Paralympics | 1960–2024 | 17 | IPC historical results archive |
| Winter Paralympics | 1976–2026 | 14 | IPC archive through 2022; official 2026 results books |

The 1956 Summer edition includes both Melbourne and Stockholm’s equestrian events. Tokyo 2020 retains its official edition year, although held in 2021. Cancelled Games are absent, not zero-medal editions.

- [Olympedia medal statistics](https://www.olympedia.org/statistics/medal/country): each snapshot table retains the exact filter query, provider, retrieval date and URL. The importer submits read-only statistics filters for editions, disciplines and event categories.
- [IPC historical archive](https://www.paralympic.org/results/historical): the importer follows each edition’s own medal-table link and collects sport tables and event podiums. Historical route structures differ by edition.
- Milano Cortina 2026: six official results books published at `https://wmr-static-assets.scd.dgplatform.net/wmr/static/_PDF/PWG2026/{code}/Results_Book_{code}.pdf`, for `ALP`, `BTH`, `CCS`, `SBD`, `IHO` and `CUR`. Every extracted event retains its source page. The [IPC closing report](https://www.paralympic.org/news/milano-cortina-2026-italy-closing-ceremony) independently confirms China’s 15/13/16 and the USA’s 13/5/6 medal totals.

Raw HTML and large PDFs are cached outside the release bundle in `.cache/`. Committed snapshots contain extracted facts; `validation-report.json` records their SHA-256 hashes and all unresolved discrepancies. `source-manifest.json` records additional provenance. Gameplay makes no requests to these providers.

## What is a medal?

One country/team medal award in an official sporting medal event. A relay, football squad or ice hockey team counts once per podium award, regardless of roster size. A country may receive more than one medal in the same event. Tied awards are preserved; the importer does not force every podium to have exactly three medals.

Women’s, men’s, mixed and open refer to **event categories**, not the gender of each athlete. Mixed and open are stored separately. Medal rankings use total awards across all colours; a tie in leading sports is respected in comparison feedback. First and strongest editions are calculated from the entire supported history of the selected competition.

Demonstrations, Youth Games, the 1906 Intercalated Games, art competitions, aeronautics and alpinism awards are excluded. No athlete-count dataset is used to infer country medal totals.

## Corrections and identity rules

The source snapshots stay unchanged. The compiler applies explicit, reviewable corrections:

1. **Art awards:** Olympedia’s aggregate art-checkbox behaviour is inconsistent. Explicit art-group tables are subtracted from country, edition and event-category totals. Non-art discipline totals independently reconcile with the corrected totals for every source delegation.
2. **Stockholm 1956:** Olympedia edition 48 is added to Melbourne edition 14 before aggregation. Both venues form one Summer edition.
3. **United Team of Germany:** Olympedia’s `GER` rows for 1956, 1960 and 1964 are assigned to `EUA`. These combined East–West teams remain separate from Germany, East Germany and West Germany. Olympic 1952 retains Olympedia’s `GER` attribution. See [Olympedia’s Germany history](https://www.olympedia.org/countries/GER).
4. **West Germany at the early Paralympics:** IPC `GER` in 1960 and 1964 maps to `FRG`; the [IPC’s Rome account](https://www.paralympic.org/rome-1960) explicitly identifies the West German delegation. Reunified Germany starts a separate record in 1992.
5. **Imperial Russia:** pre-1917 Olympic `RUS` rows map to game identity `RUE` (alias `RU1`), separate from modern Russia and the USSR. See [Olympedia’s Russia history](https://www.olympedia.org/countries/RUS).
6. **Later Yugoslavia:** IPC `YUG` from 1996 onwards maps to `SCG`, matching the later Federal Republic of Yugoslavia / Serbia and Montenegro identity used by Olympedia. Earlier Yugoslavia remains separate.
7. **Burma/Myanmar:** `BIR` maps to `MYA`, a name change of the continuing delegation. “Burma” remains a search alias.
8. **2026 ice hockey:** the C93 font lacks a usable text mapping. The three podium awards on PDF page 6 were visually transcribed: USA gold, Canada silver, China bronze. C92 team roster pages are not counted again.
9. **IPC event URL collisions:** the archive sometimes gives plus- and minus-weight events the same URL. Events are distinguished by sport, URL **and event name**; their awards are not accidentally deduplicated.

Other historical identities retain their source delegation codes. USSR medals are never added to Russia; East Germany medals are never added to Germany; Australasia medals are never added to Australia or New Zealand. Renaming aliases do not transfer medals between distinct historical teams.

Neutral, refugee and mixed-nationality delegations remain in the extracted data but cannot be answers or guesses. `UNK` retains unattributed event awards. Some IPC tables remove a delegation’s name and flag; these rows are preserved as edition-scoped `XNA`, `XNB` placeholders. They are not silently attributed to a nation or successor. Their comparisons are suppressed where reconciliation is unavailable.

## Completeness and known limits

All four competition histories have complete **edition medal-table coverage**. Every displayed all-time medal total is derived from those complete tables.

The IPC archive contains event lists that disagree with its edition tables, including missing sports, missing flags, and historical allocation inconsistencies. The initial validation report records **221 team/edition/breakdown discrepancies**. All-time sport breakdowns are suppressed for 30 source identities and event-category breakdowns for 40. These counts include excluded, unattributed identities. Sport tables are preferred when available; event awards supply a sport total only when no sport table is available. Both sport and category totals must reconcile, medal colour by medal colour, **at every edition** before the all-time breakdown is displayed. Errors cannot cancel across editions to pass validation.

Germany/United Team of Germany and Russia/Russian Empire can be split exactly by edition. Their combined source all-time sport/category tables cannot be split exactly from these snapshots, so the affected Olympic breakdowns are `null`. Their supported cabinet, season, timeline and breakthrough clues remain available.

`null` means unknown, never zero. Zero means a verified absence from a complete medal table. Unsupported families never enter the clue pool. The compiler and release checks fail if a required edition is missing, a total does not reconcile, an identity is unmapped, a frozen catalog changes, or a displayed breakdown is incomplete. Historical reallocation decisions may change after this snapshot; later catalogs must not rewrite earlier daily puzzles.

## Refresh and release

Normal development uses the committed catalog. Live imports require Python dependencies:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
```

For a new catalog:

1. Preserve the current source snapshots and validation report in a dated archival directory or a tagged Git revision. Keep every published `catalog-*.json` and lock entry. Commit the source hashes with the release.
2. Change `data/build-config.json` to a **new version**, a **future UTC effective date**, and new catalog/report file paths. For example: `1.1.0`, `2026-10-01`, `data/catalog-v2.json`, `data/validation-v2.json`.
3. For a live refresh, move the existing `.cache/` directory to a dated backup. A rerun without this step deliberately reuses cached source pages. Source rate limits are respected with backoff; never replace failed retrievals with empty data.
4. Fetch and normalize:

```sh
python3 scripts/fetch_data.py --olympics
python3 scripts/fetch_data.py --ipc
python3 scripts/fetch_2026.py
node scripts/build_shapes.mjs
npm run data:build
npm run data:validate
```

5. Review the new validation report, source hashes and historical mappings. Confirm the four coverage ranges. If extending beyond 2026, update the edition manifests and release coverage assertions deliberately. The current fixtures protect the requested historical scope.
6. Run `python3 scripts/freeze_catalog.py`. This checksum-locks the new file and regenerates `src/game/catalog-manifest.ts`, retaining older versions. Later activations must be after the current UTC date and all existing activations. A locked version cannot be regenerated with changed content.
7. Run `npm run check`, inspect future-date and saved-round behaviour locally, and commit the new data, lock, generated registry and report together. Publication is controlled by the repository owner.

The game chooses a catalog by UTC date. Within a catalog, a seeded Fisher–Yates shuffle visits every eligible answer once per cycle and prevents a repeat at cycle boundaries. Practice has independent seeds and excludes the current daily answer. Saved rounds carry their catalog version and exact date; invalid or corrupted saved puzzles are discarded safely.

## Geography, flags and licenses

Country names, aliases, regions and capitals were retrieved on 8 September 2026 from [mledoze/countries](https://github.com/mledoze/countries), under the [Open Database License](LICENSE.countries.txt). Derived geography fields retain this attribution. Natural Earth boundaries, supplied by [`world-atlas`](https://github.com/topojson/world-atlas), are public domain; the SVG generation code is local. At the 110m scale, some small islands have no usable polygon and receive a capital hint instead. Historical teams receive period-appropriate text clues rather than modern outlines.

Historical flag artwork is locally hosted from Olympedia’s flag collection and credited to its contributors. Its original SVG metadata is preserved. The United Team of Germany’s 1960–1964 flag and the Russian Empire tricolour are local SVG renditions; flags are illustrative of the delegation, not a claim that one design was used at every edition. Current flags use Unicode regional indicators. Fonts and their SIL Open Font Licenses are self-hosted. Sporting source data and third-party assets are not relicensed by the application’s MIT code license.
