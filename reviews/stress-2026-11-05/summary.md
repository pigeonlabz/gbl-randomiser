# GBL Filter Generator stress review

Generated from deployed build revision `5cd914a62e92d57f0e5ccedb0d3870c012ee84a6` on 2026-11-05T00:28:56.376Z.

## Method

- 10,000 seeded source-driven generations; seed scheme and config roster are in run-metadata.json.
- 144 applicable configurations across Great, Ultra, Master, Open League and 22 bundled Cup presets; additional families both off and on.
- Every applicable configuration receives Chill, Spicy, and Chaos samples with per-profile counts balanced within one. Every sample requests two challenge rules; Cups use mutators enabled. Pain Cup is exercised at both bundled ranking windows.
- Exhaustive unordered pairs: 255 entries (186 rule-data IDs plus 69 parameter/generated exclusion variants), 32,385 pairs. Runtime multi-term negative-exclusion permutations are not individually expanded; each term family is represented by singleton variants to avoid a combinatorial matrix explosion.
- Static source simulation only. Search syntax and OR expansion are evaluated by the production generator-utils.js; app selection orchestration is modeled from deployed app.js. No live Pokémon GO client or user collection was queried.
- Unavailable by design: freeform user-authored custom Cups (no supplied settings), and Cup runs with mutators disabled because those produce no random rules.

## Results

- Recorded outputs: **10,000**; generation failures: 0; malformed searches: 0; CP preservation failures: 0.
- Static semantic checks tagged 16 generated samples as confirmed invalid (IV/appraisal contradictions) and 47 as suspected invalid; these are separate from search-syntax validation.
- Pain Cup compact output has 552 cases where the project's DNF parser does not place shared CP in every comma branch, while the existing Pain Cup tests assume grouped candidate alternatives. This remains a client-precedence check, not a confirmed failure.
- Rejected candidate attempts: 1; 481 repeated searches overall (247 within the same config) after same-as-previous retries.
- Unique selected rule pairs: 3661; pair occurrences/repeats are detailed in run-metadata.json.
- Warning-bearing samples by profile/league: chaos/great=1006, chaos/master=1081, chaos/ultra=1065, chill/great=917, chill/master=1042, chill/ultra=1019, spicy/great=958, spicy/master=1053, spicy/ultra=1036.
- Warning counts by profile/league (warning count is warning-code incidences; warning-bearing samples can have multiple warnings):

| Difficulty | League | Outputs | Outputs with warnings | Warning incidences |
|---|---|---:|---:|---:|
| chill | great | 1126 | 917 | 1466 |
| chill | ultra | 1126 | 1019 | 1855 |
| chill | master | 1124 | 1042 | 1765 |
| spicy | great | 1104 | 958 | 1833 |
| spicy | ultra | 1104 | 1036 | 2211 |
| spicy | master | 1104 | 1053 | 2157 |
| chaos | great | 1104 | 1006 | 2381 |
| chaos | ultra | 1104 | 1065 | 2773 |
| chaos | master | 1104 | 1081 | 2780 |

- Most frequent warning codes: COMPLEXITY_WARNING=5753, CUP_LEAGUE_MISMATCH=3766, MANUAL_CUP_ELIGIBILITY=2490, SCARCITY_WARNING=2343, BATTLE_ELIGIBILITY_CONDITIONAL=1540, STATE_DEPENDENT=1031, APPROXIMATE_DEX_CANDIDATES=828, OR_PRECEDENCE_AMBIGUOUS=828.
- Most frequent causes: weather-move: current-weather dependent (1031); cup pain-cup: manual eligibility condition is not fully encoded in the search (Use the union of the bottom 250 (or 100) Great, Ultra, and Master over… (828); pain-cup: comma-separated Pokédex candidates are conjoined with CP and other terms; utility DNF parsing and compact group assumption differ, so valid… (828); cup element: manual eligibility condition is not fully encoded in the search (Only Pokémon that can evolve and have never evolved are eligible.) (420); cup bug-bite: manual eligibility condition is not fully encoded in the search (Pokémon must be Bug-type and know at least one Bug-, Poison-, or Rock-… (414).
- Detailed warning-code counts by profile/league are in run-metadata.json; complexity thresholds (over 120 characters or 24 OR branches) are heuristic.
- Repeated exclusion clauses inside one AND branch: 0; most frequent negations are listed in run-metadata.json.
- Pair classifications: COMPATIBLE=19976, SCARCITY_WARNING=8277, GENERATOR_EXCLUDED=2410, FALSE_POSITIVE_CANDIDATE=1390, COMPLEXITY_WARNING=211, CONFIRMED_INVALID=78, SUSPECTED_INVALID=43.
- Search lengths: min 6, median 142, p95 1288, max 10459 characters.
- Longest search samples: G08612=10459 chars, G03720=10315 chars, G01290=8331 chars; full strings are in generations.csv and flagged.csv.
- Generation time: 1533.11 ms total; pairwise evaluation: 137.58 ms.

## Highest-priority findings

1. **P1 — IV appraisal totals conflict in generated output.** Evidence: pairwise.csv P023101, appraisal-perfect + iv-mid-hp; flagged.csv G00170 (seed 21599416, config cup-fantasy-great-additional-on). IV band totals cannot satisfy the requested overall appraisal star band(s).
2. **P1 — Hatched and Shadow/Purified overlap is unresolved.** Evidence: pairwise.csv P020767, hatched + shadow; flagged.csv G00478 (seed 24038468, config cup-willpower-ultra-additional-on). Hatched and Shadow/Purified acquisition-status overlap appears unavailable, but the current client semantics were not verified.
3. **P1 — Pain Cup OR/AND precedence requires client verification.** Evidence: flagged.csv G00103 (seed 21068843, config cup-pain-cup-great-additional-off-bottom-100, rules size-xl-selection + research, 648 chars; COMPLEXITY_WARNING, MANUAL_CUP_ELIGIBILITY, APPROXIMATE_DEX_CANDIDATES, OR_PRECEDENCE_AMBIGUOUS). search has 648 characters and 153 OR branches cup pain-cup: manual eligibility condition is not fully encoded in the search (Use the union of the bottom 250 (or 100) Great, Ultra, and Master overall ranking rows. Dedupl…
4. **P2 — Manual Cup conditions and cross-league combinations need review.** Evidence: flagged.csv G01162 (seed 29455064, config cup-halloween-ultra-additional-on, rules iv-low-attack + appraisal-high, 511 chars; COMPLEXITY_WARNING, CONFIRMED_INVALID, CUP_LEAGUE_MISMATCH). search has 511 characters and 20 OR branches all composed AND/OR branches are contradictory under the static DNF and IV-band checks cup halloween: official eligibility restrictions used with Ultra League; UI describes t…
5. **P2 — Scarcity and long expanded searches need usability review.** Evidence: flagged.csv G08612 (seed 88451614, config cup-explorer-cup-great-additional-on, rules appraisal-low + meta-moves-banned, 10459 chars; COMPLEXITY_WARNING). search has 10459 characters and 18 OR branches

## Regression checks

- `hatched&shadow` and `hatched&purified` are retained as SUSPECTED_INVALID, not confirmed; no live mechanics check was performed.
- `0attack&3defense&3hp` combined with `3*` or `4*` is CONFIRMED_INVALID under the documented IV bands and appraisal total model.
- Negative `!locationbackground` is never treated as a positive scarcity requirement; pairwise rows explicitly mark that polarity as a false-positive warning candidate.
- OR expansions are generated with the production utility; every generated branch is checked for the appropriate league CP ceiling. See `pairwise.csv` and generation row validation columns.
- Collection-dependent pool size, uncertain acquisition semantics, and battle-format eligibility remain heuristic/manual review items.

## Artifacts

- `generations.csv`: complete raw generation log.
- `flagged.csv`: suspicious, conditional, scarce, or complex generation rows with sample IDs, seeds, config and reasons.
- `pairwise.csv`: complete catalog-pair matrix and static classification reasoning.
- `run-metadata.json`: exact seed scheme, revision, configuration roster, counts, timing, and limitations.
