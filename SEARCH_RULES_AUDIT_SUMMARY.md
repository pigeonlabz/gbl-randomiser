# GBL Filter Generator search audit: executive summary

**5 November 2026 · Source-level only.** The deployed implementation is `docs/`; the available project guidance files are `GBL_FILTER_AGENTS.md` and `GBL_FILTER_FILTER_REFERENCE.md`. No live Pokémon GO search or trainer collection was tested. The complete inventory, evidence labels, real examples, and verification plan are in [SEARCH_RULES_AUDIT.md](SEARCH_RULES_AUDIT.md).

## Highest-risk findings

| Priority | Finding | Evidence and practical consequence |
|---|---|---|
| P1 | **Mixed AND/OR precedence is inconsistent.** The production parser splits comma OR before `&`, effectively making `&` bind tighter. [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Box_(GO)) and [GO Hub](https://db.pokemongohub.net/tools/search-strings) describe comma OR binding before `&`. | `combineSearch(["fire,water","shiny"])` emits `fire&shiny,water&shiny`. Under the external reading, a Shiny Water-only Pokémon is excluded. G01503 and G07404 are real six-branch examples. The official Help Center describes operators individually but does not settle their mixed precedence; no in-game confirmation is recorded. |
| P1 | **Impossible IV/appraisal combinations are generated.** `canAddRule` does not compare IV totals with star bands. | G00170 combines `1hp,2hp` and `4*`; 4* requires HP 15. The stress review found 16 confirmed-invalid generated outputs under its documented IV model. The review test recognizes the pair, but the production chooser still accepts it. |
| P1 | **Pain Cup uses a different precedence assumption from the local parser.** Its comma-separated Dex group is followed by `&cp…&!legendary…`, without OR expansion. | G00103 and 551 other review cases are marked precedence ambiguous. Under local DNF parsing, most Dex branches lack CP and other constraints; under the external reading, constraints apply globally. This is **not a reproduced CP bug**. |
| P2 | **Some cup eligibility remains manual or approximate.** | Pain Cup projects exact forms to Dex numbers; Element, Love, Bug Bite, and Meta Madness have conditions the search does not fully express. G01503 and G07404 also show official-cup/selected-league mismatches. |

## What is established

The code centralizes structural league CP, intersects it with a selected CP rule, strips CP from cup expressions, and adds one normalized CP expression before ordinary composition. The 10,000-generation static review found no CP-preservation failure under its local parser. Its 32,385 rule-pair rows distinguish proven arithmetic/term contradictions from suspected acquisition overlaps, scarce collections, and conditional battle eligibility. These are static findings, not client observations.

The finite rule catalog and generated variants cover typing, regions, move typing and slots, age, origin, size, status, appraisal/IVs, rarity, CP/HP, candy and inventory counts, Mega/Max, backgrounds, distance, and exclusions. The project reference is broader than the default random pool; custom text validation checks delimiters but does not prove game vocabulary. Reference labels such as “Official” are not treated as independent evidence without a specific supporting official page.

## Recommended next steps

1. Run the audit's **known-witness precedence test** in the live English client: compare `fire,water&shiny` and `fire&shiny,water&shiny` using a non-Shiny Fire and a Shiny Water-only Pokémon. Record result counts and screenshots. This decides which serializer model to implement.
2. Compare the exact G01503 and G00103 searches against known CP/type/size witnesses. Record full pasted string, client version, counts, and specimen details. Resolve Pain Cup separately from the ordinary expanded serializer; avoid declaring a CP defect until a witness leaks.
3. After precedence is settled, update parser, serializer, and tests together; add IV/star feasibility at selection time; review manual cup conditions and long-search usability. **No fixes were applied in this audit.**

**Evidence limits:** No literal root `AGENTS.md`/`FILTER_REFERENCE.md`, project in-game verification log, or live collection counts were available. External current references support the competing precedence interpretation but do not replace the requested in-game check.
