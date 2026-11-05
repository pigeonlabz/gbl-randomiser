# GBL Filter Generator stress review

Generated from the deployed source tree based on revision `5cd914a62e92d57f0e5ccedb0d3870c012ee84a6` (source SHA-256 `fb65094f12df002519b69efe259a62765d649054d24a4aeb141d0f0c6e676e06`) on 2026-11-05T17:23:50.904Z.

## Method

- 10,000 seeded source-driven generations; seed scheme and config roster are in run-metadata.json.
- 144 applicable configurations across Great, Ultra, Master, Open League and 22 bundled Cup presets; additional families both off and on.
- Every applicable configuration receives Chill, Spicy, and Chaos samples with per-profile counts balanced within one. Every sample requests two challenge rules; Cups use mutators enabled. Pain Cup is exercised at both bundled ranking windows.
- Exhaustive unordered pairs: 255 entries (186 rule-data IDs plus 69 parameter/generated exclusion variants), 32,385 pairs. Runtime multi-term negative-exclusion permutations are not individually expanded; each term family is represented by singleton variants to avoid a combinatorial matrix explosion.
- Static source simulation only. Search syntax and AND-across-groups / OR-within-groups semantics are evaluated by the production generator-utils.js; app selection orchestration is modeled from deployed app.js. No live Pokémon GO client or user collection was queried.
- Unavailable by design: freeform user-authored custom Cups (no supplied settings), and Cup runs with mutators disabled because those produce no random rules.

## Results

- Recorded outputs: **10,000**; generation failures: 0; malformed searches: 0; CP preservation failures: 0.
- Static semantic checks tagged 44 generated samples as confirmed invalid (IV/appraisal contradictions) and 47 as suspected invalid; these are separate from search-syntax validation.
- Compact Pain Cup output has 0 shared-CP semantic failures under the updated parser; its comma-separated candidate list is treated as one OR group joined to CP and exclusions.
- Rejected candidate attempts: 1; 481 repeated searches overall (247 within the same config) after same-as-previous retries.
- Unique selected rule pairs: 3661; pair occurrences/repeats are detailed in run-metadata.json.
- Warning-bearing samples by profile/league: chaos/great=884, chaos/master=1019, chaos/ultra=997, chill/great=504, chill/master=852, chill/ultra=795, spicy/great=693, spicy/master=936, spicy/ultra=885.
- Warning counts by profile/league (warning count is warning-code incidences; warning-bearing samples can have multiple warnings):

| Difficulty | League | Outputs | Outputs with warnings | Warning incidences |
|---|---|---:|---:|---:|
| chill | great | 1126 | 504 | 795 |
| chill | ultra | 1126 | 795 | 1175 |
| chill | master | 1124 | 852 | 1256 |
| spicy | great | 1104 | 693 | 1175 |
| spicy | ultra | 1104 | 885 | 1544 |
| spicy | master | 1104 | 936 | 1630 |
| chaos | great | 1104 | 884 | 1742 |
| chaos | ultra | 1104 | 997 | 2138 |
| chaos | master | 1104 | 1019 | 2230 |

- Most frequent warning codes: CUP_LEAGUE_MISMATCH=3766, MANUAL_CUP_ELIGIBILITY=2490, SCARCITY_WARNING=2343, BATTLE_ELIGIBILITY_CONDITIONAL=1540, STATE_DEPENDENT=1031, COMPLEXITY_WARNING=1017, APPROXIMATE_DEX_CANDIDATES=828, COLLECTION_DEPENDENT=579.
- Most frequent causes: weather-move: current-weather dependent (1031); cup pain-cup: manual eligibility condition is not fully encoded in the search (Use the union of the bottom 250 (or 100) Great, Ultra, and Master over… (828); pain-cup: comma-separated Pokédex candidates share AND constraints; Dex numbers can match other forms (828); cup element: manual eligibility condition is not fully encoded in the search (Only Pokémon that can evolve and have never evolved are eligible.) (420); cup bug-bite: manual eligibility condition is not fully encoded in the search (Pokémon must be Bug-type and know at least one Bug-, Poison-, or Rock-… (414).
- Detailed warning-code counts by profile/league are in run-metadata.json; complexity thresholds (over 120 characters or 24 OR branches) are heuristic.
- Repeated exclusion clauses inside one AND branch: 0; most frequent negations are listed in run-metadata.json.
- Pair classifications: COMPATIBLE=19976, SCARCITY_WARNING=8275, GENERATOR_EXCLUDED=2410, FALSE_POSITIVE_CANDIDATE=1390, COMPLEXITY_WARNING=211, CONFIRMED_INVALID=80, SUSPECTED_INVALID=43.
- Search lengths: min 6, median 58, p95 658, max 1872 characters.
- Longest search samples: G02986=1872 chars, G05010=1854 chars, G09902=1854 chars; full strings are in generations.csv and flagged.csv.
- Generation time: 2320.91 ms total; pairwise evaluation: 169.42 ms.

## Highest-priority findings

1. **P1 — IV appraisal totals conflict in generated output.** Evidence: pairwise.csv P023101, appraisal-perfect + iv-mid-hp; flagged.csv G00170 (seed 21599416, config cup-fantasy-great-additional-on). IV band totals cannot satisfy the requested overall appraisal star band(s).
2. **P1 — Hatched and Shadow/Purified overlap is unresolved.** Evidence: pairwise.csv P020767, hatched + shadow; flagged.csv G00478 (seed 24038468, config cup-willpower-ultra-additional-on). Hatched and Shadow/Purified acquisition-status overlap appears unavailable, but the current client semantics were not verified.
3. **P2 — Manual Cup conditions and cross-league combinations need review.** Evidence: flagged.csv G01162 (seed 29455064, config cup-halloween-ultra-additional-on, rules iv-low-attack + appraisal-high, 58 chars; CONFIRMED_INVALID, CUP_LEAGUE_MISMATCH). all composed AND/OR branches are contradictory under the static DNF and IV-band checks cup halloween: official eligibility restrictions used with Ultra League; UI describes this as a custom league/Cup combination
4. **P2 — Scarcity and long generated searches need usability review.** Evidence: flagged.csv G02986 (seed 43899320, config cup-pain-cup-great-additional-on-bottom-250, rules maxguard-invested + meta-moves-banned, 1872 chars; BATTLE_ELIGIBILITY_CONDITIONAL, COMPLEXITY_WARNING, MANUAL_CUP_ELIGIBILITY, APPROXIMATE_DEX_CANDIDATES). maxguard-invested: battle-format/current-state check may be needed exclude-hypertraining: battle-format/current-state check may be needed search has 1872 characters and 320 comma-separated alternatives cup pain-cup: man…

## Regression checks

- `hatched&shadow` and `hatched&purified` are retained as SUSPECTED_INVALID, not confirmed; no live mechanics check was performed.
- `0attack&3defense&3hp` combined with `3*` or `4*` is CONFIRMED_INVALID under the documented IV bands and appraisal total model.
- Negative `!locationbackground` is never treated as a positive scarcity requirement; pairwise rows explicitly mark that polarity as a false-positive warning candidate.
- Compact comma groups and AND constraints are parsed using the confirmed game precedence; semantic branches are checked for the appropriate league CP ceiling. See `pairwise.csv` and generation row validation columns.
- Collection-dependent pool size, uncertain acquisition semantics, and battle-format eligibility remain heuristic/manual review items.

## Artifacts

- `generations.csv`: complete raw generation log.
- `flagged.csv`: suspicious, conditional, scarce, or complex generation rows with sample IDs, seeds, config and reasons.
- `pairwise.csv`: complete catalog-pair matrix and static classification reasoning.
- `run-metadata.json`: exact seed scheme, base revision, source fingerprint and files, configuration roster, counts, timing, and limitations.
