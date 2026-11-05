# GBL Filter Generator: search rules and compatibility audit

**Scope and date:** Source-level audit, 5 November 2026. The implementation examined is the GitHub Pages build in `docs/`, identified as deployed by `README.md` and loaded by `docs/index.html`. The 10,000-generation artifacts identify revision `5cd914a62e92d57f0e5ccedb0d3870c012ee84a6`; this audit reads the files currently present in the workspace. No Pokémon GO client, trainer collection, or live battle was tested. Root `app.js`, `rule-data.js`, and `index.html` differ from the deployed `docs/` build and were treated as historical/alternate entry points. There is no literal `AGENTS.md` or `FILTER_REFERENCE.md` at repository root: the available project instructions are `GBL_FILTER_AGENTS.md` and `GBL_FILTER_FILTER_REFERENCE.md`. The supplied chat instruction adds only the end-of-message edited-file inventory.

## Evidence key and source boundary

| Label | Meaning in this audit |
|---|---|
| `OFFICIAL_DOCUMENTATION` | A specific term or operator is actually stated by [Pokémon GO Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/) or linked official game news. Official descriptions of *individual* operators do not establish mixed-operator precedence. |
| `VERIFIED_EXTERNAL_REFERENCE` | An independent current reference documents the particular term/meaning. [Bulbapedia Pokémon Box](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Box_(GO)) and [GO Hub search strings](https://db.pokemongohub.net/tools/search-strings) are named where used. This is external documentation, not a recorded in-game test by this project. |
| `USER_VERIFIED_IN_GAME` | A preserved user report with a search and observed result. **None was found** in the inspected repository or review artifacts. |
| `IMPLEMENTATION_ASSUMPTION` | What `docs/static/js/` code, reference text, or a test assumes without independent proof of the exact behavior. |
| `UNVERIFIED` | Mechanics or syntax for which the reviewed material does not establish a reliable outcome. |

The two project markdown files express **intended behavior**; `docs/static/js/{rule-data,generator-utils,app,cup-data,pvpoke-data}.js` express **implemented behavior**. Official and external references express **documented game behavior**. Bulbapedia and GO Hub agree that `!` binds before comma OR and comma OR before `&`, while the local parser assumes the opposite precedence between `,` and `&`. The official Help Center does not give a mixed-operator example that settles this question. This is a documented discrepancy, with live-client confirmation still outstanding. The project reference's “Official” and “Verified-current” labels were checked against the external pages where possible; a project label alone is not independent evidence. `GBL_FILTER_FILTER_REFERENCE.md` supplies no exact URLs for most entries, so individual client rollout and date claims cannot be reconstructed from it.

## Complete vocabulary and production rule inventory

`GBL_FILTER_FILTER_REFERENCE.md` is the broad vocabulary. `docs/static/js/rule-data.js` holds the finite rule IDs, searches, `pool` (`core`, `spicy`, `chaos`, `reference`), `family`, and `scarcity`; `docs/static/js/app.js` adds generated parameter and exclusion variants. The table below lists every finite production rule ID and its exact stored search. “Evidence” rates the **term/syntax**, not whether a particular trainer has a matching Pokémon. For OR groups and multi-term rules, the combination additionally depends on the disputed precedence. “Reference” is known vocabulary but normally excluded from random selection. `scarcity` is the project's integer weight hint, not a measured prevalence.

| Rule ID | Meaning | Generated search | Family | Pool / scarcity | Term evidence | Definition |
|---|---|---|---|---|---|---|
| `type-normal` | Normal type | `normal` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-fire` | Fire type | `fire` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-water` | Water type | `water` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-grass` | Grass type | `grass` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-electric` | Electric type | `electric` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-ice` | Ice type | `ice` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-fighting` | Fighting type | `fighting` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-poison` | Poison type | `poison` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-ground` | Ground type | `ground` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-flying` | Flying type | `flying` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-psychic` | Psychic type | `psychic` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-bug` | Bug type | `bug` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-rock` | Rock type | `rock` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-ghost` | Ghost type | `ghost` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-dragon` | Dragon type | `dragon` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-dark` | Dark type | `dark` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-steel` | Steel type | `steel` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `type-fairy` | Fairy type | `fairy` | `pokemon-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:98` |
| `region-kanto` | Kanto region | `kanto` | `region` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:107` |
| `region-johto` | Johto region | `johto` | `region` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:107` |
| `region-hoenn` | Hoenn region | `hoenn` | `region` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:107` |
| `region-sinnoh` | Sinnoh region | `sinnoh` | `region` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:107` |
| `region-unova` | Unova region | `unova` | `region` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:107` |
| `region-kalos` | Kalos region | `kalos` | `region` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:107` |
| `region-alola` | Alola region | `alola` | `region` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:107` |
| `region-galar` | Galar region | `galar` | `region` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:107` |
| `region-hisui` | Hisui region | `hisui` | `region` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:107` |
| `region-paldea` | Paldea region | `paldea` | `region` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:107` |
| `move-any-normal` | Normal move | `@normal` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-fire` | Fire move | `@fire` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-water` | Water move | `@water` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-grass` | Grass move | `@grass` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-electric` | Electric move | `@electric` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-ice` | Ice move | `@ice` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-fighting` | Fighting move | `@fighting` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-poison` | Poison move | `@poison` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-ground` | Ground move | `@ground` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-flying` | Flying move | `@flying` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-psychic` | Psychic move | `@psychic` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-bug` | Bug move | `@bug` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-rock` | Rock move | `@rock` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-ghost` | Ghost move | `@ghost` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-dragon` | Dragon move | `@dragon` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-dark` | Dark move | `@dark` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-steel` | Steel move | `@steel` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-any-fairy` | Fairy move | `@fairy` | `move-type` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:116` |
| `move-fast-normal` | Normal Fast Attack | `@1normal` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-fire` | Fire Fast Attack | `@1fire` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-water` | Water Fast Attack | `@1water` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-grass` | Grass Fast Attack | `@1grass` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-electric` | Electric Fast Attack | `@1electric` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-ice` | Ice Fast Attack | `@1ice` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-fighting` | Fighting Fast Attack | `@1fighting` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-poison` | Poison Fast Attack | `@1poison` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-ground` | Ground Fast Attack | `@1ground` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-flying` | Flying Fast Attack | `@1flying` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-psychic` | Psychic Fast Attack | `@1psychic` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-bug` | Bug Fast Attack | `@1bug` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-rock` | Rock Fast Attack | `@1rock` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-ghost` | Ghost Fast Attack | `@1ghost` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-dragon` | Dragon Fast Attack | `@1dragon` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-dark` | Dark Fast Attack | `@1dark` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-steel` | Steel Fast Attack | `@1steel` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-fast-fairy` | Fairy Fast Attack | `@1fairy` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:125` |
| `move-charge1-normal` | Normal first Charged Attack | `@2normal` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-fire` | Fire first Charged Attack | `@2fire` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-water` | Water first Charged Attack | `@2water` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-grass` | Grass first Charged Attack | `@2grass` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-electric` | Electric first Charged Attack | `@2electric` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-ice` | Ice first Charged Attack | `@2ice` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-fighting` | Fighting first Charged Attack | `@2fighting` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-poison` | Poison first Charged Attack | `@2poison` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-ground` | Ground first Charged Attack | `@2ground` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-flying` | Flying first Charged Attack | `@2flying` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-psychic` | Psychic first Charged Attack | `@2psychic` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-bug` | Bug first Charged Attack | `@2bug` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-rock` | Rock first Charged Attack | `@2rock` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-ghost` | Ghost first Charged Attack | `@2ghost` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-dragon` | Dragon first Charged Attack | `@2dragon` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-dark` | Dark first Charged Attack | `@2dark` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-steel` | Steel first Charged Attack | `@2steel` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge1-fairy` | Fairy first Charged Attack | `@2fairy` | `move-slot` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:134` |
| `move-charge2-normal` | Normal second Charged Attack | `@3normal` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-fire` | Fire second Charged Attack | `@3fire` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-water` | Water second Charged Attack | `@3water` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-grass` | Grass second Charged Attack | `@3grass` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-electric` | Electric second Charged Attack | `@3electric` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-ice` | Ice second Charged Attack | `@3ice` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-fighting` | Fighting second Charged Attack | `@3fighting` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-poison` | Poison second Charged Attack | `@3poison` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-ground` | Ground second Charged Attack | `@3ground` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-flying` | Flying second Charged Attack | `@3flying` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-psychic` | Psychic second Charged Attack | `@3psychic` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-bug` | Bug second Charged Attack | `@3bug` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-rock` | Rock second Charged Attack | `@3rock` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-ghost` | Ghost second Charged Attack | `@3ghost` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-dragon` | Dragon second Charged Attack | `@3dragon` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-dark` | Dark second Charged Attack | `@3dark` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-steel` | Steel second Charged Attack | `@3steel` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `move-charge2-fairy` | Fairy second Charged Attack | `@3fairy` | `move-slot` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:143` |
| `age-0-30` | Caught in last 30 days | `age0-30` | `age` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:152` |
| `age-today` | Caught in last 24 hours | `age0` | `age` | reference / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:156` |
| `hatched` | Hatched | `hatched` | `origin` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:160` |
| `traded` | Traded | `traded` | `origin` | core / 1 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:163` |
| `raid` | Raid caught | `raid` | `origin` | core / 1 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:166` |
| `research` | Research reward | `research` | `origin` | core / 1 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:169` |
| `rocket` | Rocket encounter | `rocket` | `origin` | core / 1 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:172` |
| `size-xl-group` | XL or XXL size | `xl,xxl` | `size-xl` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:176` |
| `size-xs-group` | XS or XXS size | `xs,xxs` | `size-xs` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:181` |
| `size-xxl` | XXL size | `xxl` | `size-xl` | core / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:186` |
| `size-xxs` | XXS size | `xxs` | `size-xs` | core / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:192` |
| `shiny` | Shiny | `shiny` | `visual-status` | core / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:199` |
| `shadow` | Shadow | `shadow` | `shadow` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:203` |
| `purified` | Purified | `purified` | `purified` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:207` |
| `not-purified` | No Purified Pokemon | `!purified` | `purified` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:211` |
| `not-shadow` | No Shadow Pokemon | `!shadow` | `shadow` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:216` |
| `appraisal-high` | 3-star or 4-star appraisal | `3*,4*` | `appraisal` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:223` |
| `appraisal-low` | 0-star or 1-star appraisal | `0*,1*` | `appraisal` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:227` |
| `appraisal-perfect` | Perfect appraisal | `4*` | `appraisal` | spicy / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:231` |
| `rare-any` | Legendary, Mythical, or Ultra Beast | `legendary,mythical,ultrabeast` | `rarity` | core / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:236` |
| `legendary` | Legendary | `legendary` | `rarity` | core / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:240` |
| `mythical` | Mythical | `mythical` | `rarity` | spicy / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:244` |
| `ultrabeast` | Ultra Beast | `ultrabeast` | `rarity` | spicy / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:248` |
| `type-weak-fire` | Weak to Fire | `<fire` | `type-effectiveness` | spicy / 2 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:253` |
| `type-coverage-water` | Coverage against Water | `>water` | `type-effectiveness` | spicy / 2 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:257` |
| `meta-moves-banned` | No listed meta moves | `!@Hydro Cannon&!@Blast Burn&!@Frenzy Plant&!@Meteor Mash&!@Smack Down&!@Aqua Tail&!@Volt Switch&!@Icicle Spear&!@Precipice Blades&!@Sunsteel Strike&!@Aeroblast&!@Payback&!@Psystrike&!@Sacred Fire&!@Ice Burn&!@Origin Pulse&!@Spacial Rend&!@Roar of Time&!@Moongeist Beam&!@Dragon Ascent&!@Glaciate&!@Fusion Bolt&!@Fusion Flare&!@Nature's Madness&!@Oblivion Wing&!@Behemoth Blade&!@Behemoth Bash&!@Shadow Force&!@Sacred Sword&!@Double Iron Bash&!@Geomancy&!@Bleakwind Storm&!@Sandsear Storm&!@Wildbolt Storm&!@Doom Desire&!@Techno Blast&!@Rock Wrecker&!@V-create` | `meta-moves` | chaos / 4 | IMPLEMENTATION_ASSUMPTION | `docs/static/js/rule-data.js:262` |
| `weather-move` | Weather-boosted attack now | `@weather` | `move-weather` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:267` |
| `lucky` | Lucky | `lucky` | `lucky` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:272` |
| `costume` | Costume | `costume` | `costume` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:276` |
| `candy-mid` | 100-200 family Candy | `countcandy100-200` | `candy` | spicy / 4 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:280` |
| `candy-high` | At least 100 family Candy | `countcandy100-` | `candy` | spicy / 1 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:284` |
| `candy-low` | Up to 100 family Candy | `countcandy-100` | `candy` | spicy / 1 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:287` |
| `candy-xl-high` | At least 50 family Candy XL | `countcandyxl50-` | `candy-xl` | spicy / 3 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:290` |
| `powered-xl` | Powered beyond level 40 | `candyxl` | `powered-xl` | spicy / 3 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:294` |
| `buddy-good-plus` | Good Buddy or higher | `buddy2-5` | `buddy` | spicy / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:299` |
| `buddy-best` | Best Buddy | `buddy5` | `buddy` | spicy / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:302` |
| `buddy-none` | No buddy history | `buddy0` | `buddy` | spicy / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:306` |
| `age-month-to-year` | Caught 30-365 days ago | `age30-365` | `age` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:310` |
| `age-year-plus` | Caught at least 365 days ago | `age365-` | `age` | core / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:314` |
| `age-three-years-plus` | Caught at least 1000 days ago | `age1000-` | `age` | spicy / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:318` |
| `year-current` | Caught this year | `(computed/reference only)` | `year` | reference / 1 | IMPLEMENTATION_ASSUMPTION | `docs/static/js/rule-data.js:325` |
| `year-previous` | Caught last year | `(computed/reference only)` | `year` | reference / 1 | IMPLEMENTATION_ASSUMPTION | `docs/static/js/rule-data.js:329` |
| `hp-150` | 150 HP or less | `hp-150` | `hp` | spicy / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:334` |
| `hp-100-150` | 100-150 HP | `hp100-150` | `hp` | spicy / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:337` |
| `cp-500` | 500 CP or less | `cp-500` | `cp` | spicy / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:340` |
| `cp-100-500` | 100-500 CP | `cp100-500` | `cp` | spicy / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:344` |
| `cp-1000-1500` | 1000-1500 CP | `cp1000-1500` | `cp` | spicy / 1 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:349` |
| `cp-1500-plus` | 1500 CP or higher | `cp1500-` | `cp` | chaos / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:354` |
| `iv-low-attack` | 0-5 Attack IV band | `0attack,1attack` | `iv-attack` | spicy / 2 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:360` |
| `iv-high-defense` | 11-15 Defense IV band | `3defense,4defense` | `iv-defense` | spicy / 2 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:364` |
| `iv-mid-hp` | 1-10 HP IV band | `1hp,2hp` | `iv-hp` | spicy / 2 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:368` |
| `iv-pvpish` | 0/15/15 IV bands | `0attack&4defense&4hp` | `iv-combo` | chaos / 4 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:372` |
| `iv-high-bulk-bands` | Low Attack, high bulk bands | `0attack&3defense&3hp` | `iv-combo` | spicy / 3 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:376` |
| `remote-raid` | Remote Raid origin | `remoteraid` | `origin` | spicy / 2 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:381` |
| `mega-raid` | Mega Raid origin | `megaraid` | `origin` | spicy / 2 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:385` |
| `gbl-origin` | GBL encounter | `gbl` | `origin` | spicy / 2 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:389` |
| `mega-capable` | Mega-capable species | `mega` | `mega` | spicy / 2 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:394` |
| `mega-eligible` | Eligible to Mega Evolve | `megaevolve` | `mega` | spicy / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:398` |
| `mega-level-base` | Base Mega Level | `mega1` | `mega-level` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:402` |
| `mega-level-high` | High or Max Mega Level | `mega2,mega3` | `mega-level` | spicy / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:406` |
| `mega-level-supermax` | Super Max Mega Level | `mega4` | `mega-level` | chaos / 4 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:410` |
| `dynamax` | Dynamax | `dynamax` | `max` | spicy / 2 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:415` |
| `gigantamax` | Gigantamax | `gigantamax` | `max` | spicy / 3 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:419` |
| `dynamax-unlocked` | Dynamax with unlocked Max moves | `dynamax1-` | `max-count` | reference / 3 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:423` |
| `maxmove-any-level` | Any Max Move level | `maxmove1-3` | `max-move` | reference / 3 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:427` |
| `maxmove-invested` | Max Move level 2-3 | `maxmove2-3` | `max-move` | spicy / 3 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:431` |
| `maxguard-invested` | Max Guard level 2-3 | `maxguard2-3` | `max-move` | spicy / 3 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:435` |
| `maxspirit-invested` | Max Spirit level 2-3 | `maxspirit2-3` | `max-move` | spicy / 3 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:439` |
| `egg-exclusive` | Egg-exclusive species | `eggsonly` | `origin-special` | chaos / 4 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:444` |
| `exraid` | EX Raid origin | `exraid` | `origin-special` | chaos / 4 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:448` |
| `snapshot` | Snapshot encounter | `snapshot` | `origin-special` | chaos / 4 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:452` |
| `party` | Party Play reward | `party` | `origin-special` | chaos / 4 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:456` |
| `background-any` | Rare background | `background` | `background` | chaos / 4 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:461` |
| `location-background` | Location background | `locationbackground` | `background` | reference / 4 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:465` |
| `exclude-location-background` | Exclude Location Backgrounds | `!locationbackground` | `background` | chaos / 4 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:469` |
| `special-background` | Special Background | `specialbackground` | `background` | chaos / 4 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:474` |
| `adventure-effect` | Adventure Effect | `adventureeffect` | `special-status` | chaos / 4 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:478` |
| `fusion` | Fusion | `fusion` | `special-status` | reference / 4 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:482` |
| `exclude-fusion` | Exclude Fusion | `!fusion` | `special-status` | chaos / 4 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:486` |
| `hypertraining` | Hyper Training | `hypertraining` | `special-status` | reference / 4 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:491` |
| `exclude-hypertraining` | Exclude Hyper Training | `!hypertraining` | `special-status` | chaos / 4 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:495` |
| `distance-far` | Distant | `distance1000-` | `distance` | chaos / 4 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:500` |
| `distance-range` | Nearby | `distance1000` | `distance` | chaos / 4 | OFFICIAL_DOCUMENTATION | `docs/static/js/rule-data.js:505` |
| `candy-xl-window` | 50-100 family Candy XL | `countcandyxl50-100` | `candy-xl` | chaos / 4 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:510` |
| `copy-count` | At least two of the species | `count2-` | `copy-count` | chaos / 3 | VERIFIED_EXTERNAL_REFERENCE | `docs/static/js/rule-data.js:514` |
| `buddy-candy-distance` | Buddy Candy walking distance | `candykm...` | `buddy-candy` | reference / 3 | UNVERIFIED | `docs/static/js/rule-data.js:518` |

### Broader reference-only and user-supplied vocabulary

The following are documented by `GBL_FILTER_FILTER_REFERENCE.md` but lack a corresponding finite random rule, or are only accepted as user text by `app.js:addCustomRule`. Official Help Center: `cpN`, `cp-N`, `cpN-`, `cpN-M`, analogous `hp`, species name, Pokédex number, nickname, `+name`, all 18 types, ten regions, `@Move Name`, `@type`, `@1/@2/@3type`, `@special`, `@weather`, `ageN`, `buddy0-5`, `evolve`, `favorite`, `defender`, `#tagname`, `shiny`, `shadow`, `purified`, `costume`, `traded`, `legendary`, `mythical`, `ultrabeast`, `background`, `locationbackground`, `megaevolve`, `mega1-3`, and size terms. The reference also lists official or claimed official `yearN`, `hatched`, `lucky`, `eggsonly`, `dynamax`, `gigantamax`, `fusion`, `hypertraining`, `item`, `evolvenew`, `evolvequest`, `tradeevolve`, and `distanceN`; individual labels need the exact supporting official page before being promoted to `OFFICIAL_DOCUMENTATION` here. [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Box_(GO)) and [GO Hub](https://db.pokemongohub.net/tools/search-strings) corroborate many of them as `VERIFIED_EXTERNAL_REFERENCE`.

The reference's external/current vocabulary includes `countcandyN`, `countcandyxlN`, `countN`, `candykmN`, `candyxl`, `<type`, `>type`, `male`, `female`, `genderunknown`, `raid`, `remoteraid`, `megaraid`, `exraid`, `research`, `gbl`, `rocket`, `snapshot`, `party`, `specialbackground`, `adventureeffect`, `mega`, `mega4`, `dynamaxN`, `gigantamaxN`, `maxmoveN`, `maxguardN`, and `maxspiritN`. Numeric forms should follow only families actually documented to accept ranges. `countcandy` is family Candy quantity; `countcandyxl` is Candy XL quantity; `count` is copies by Dex number; `candykm` is Buddy walking distance; `candyxl` is powered past level 40. GO Hub documents the key distinctions and IV bands. `event` is Caution/Reference; `showcase`, invented `level40`, and arbitrary exact IV 1–14 are unconfirmed and not generated. `candykm...` in the finite catalog is a **placeholder**, not a paste-ready search; its `reference` pool prevents ordinary random selection. User names, nicknames, and tags are never invented by the finite catalog. `app.js:addCustomRule` validates delimiters, not whether a game keyword exists, so user input is not vocabulary verification.

The supplementary table covers supported reference forms absent from the finite rule catalog or broader than one of its stored values. `N` and `M` mean supplied nonnegative integers, not literal characters. These entries have no finite rule ID unless the preceding inventory already lists one. Pool values are those in `GBL_FILTER_FILTER_REFERENCE.md`, which can differ from production rule pools as noted later.

| Reference search/value family | Reference difficulty | Evidence class for term | Where defined / external basis |
|---|---|---|---|
| `cpN`, `cp-N`, `cpN-`, `cpN-M`; `hpN` and corresponding HP ranges | Spicy; `cp-1500`/`cp-2500` Structural | `OFFICIAL_DOCUMENTATION` | `GBL_FILTER_FILTER_REFERENCE.md:Numeric / battle stats`; [Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/) |
| `distanceN`, `distanceN-`, `distanceN-M` | Chaos | `OFFICIAL_DOCUMENTATION` | Reference `Numeric / battle stats`; [Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/) |
| `countcandyN`, `countcandyN-M`, `countcandyN-`, `countcandy-N` | Spicy | `VERIFIED_EXTERNAL_REFERENCE` | Reference `Candy / collection quantities`; [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Box_(GO)), [GO Hub](https://db.pokemongohub.net/tools/search-strings) |
| `countcandyxlN`, `countcandyxlN-M`, `countcandyxlN-` | Spicy / Chaos | `VERIFIED_EXTERNAL_REFERENCE` | Same two external references and reference `Candy / collection quantities` |
| `countN-`, `countN-M` (Dex copy count) | Reference in text; `copy-count` is Chaos in code | `VERIFIED_EXTERNAL_REFERENCE` | Same two external references; `rule-data.js:copy-count` |
| `candykmN` and ranges; `candyxl` | Spicy | `VERIFIED_EXTERNAL_REFERENCE` | Reference `Candy / collection quantities`; [GO Hub](https://db.pokemongohub.net/tools/search-strings) |
| Species name, nickname, Pokédex number, `+name` | Reference except evolutionary family Spicy | `OFFICIAL_DOCUMENTATION` | Reference `Species / identity`; [Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/) |
| `male`, `female`, `genderunknown` | Spicy | `VERIFIED_EXTERNAL_REFERENCE` | Reference `Gender`; [GO Hub](https://db.pokemongohub.net/tools/search-strings) |
| `@Move Name`; `@special`; `@weather`; `@1/@2/@3type` | Spicy, except general `@type` Core | `OFFICIAL_DOCUMENTATION` | Reference `Moves`; [Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/) |
| `age0`, `age1`, `ageN-M`; `yearN` | Core for age; Spicy for year | `OFFICIAL_DOCUMENTATION` | Reference `Age / acquisition / origin`; [Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/) |
| `eggsonly`, `hatched`, `traded`, `lucky` | Chaos, Core, Core, Spicy respectively | `OFFICIAL_DOCUMENTATION` | Reference `Age / acquisition / origin`; [Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/) |
| `raid`, `remoteraid`, `megaraid`, `exraid`, `research`, `gbl`, `rocket`, `snapshot`, `party` | Core/Spicy/Chaos by term in reference; see finite catalog | `VERIFIED_EXTERNAL_REFERENCE` | Reference `Encounter method filters`; [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Box_(GO)), [GO Hub](https://db.pokemongohub.net/tools/search-strings) |
| `0*`–`4*`; `0`–`4` + `attack`/`defense`/`hp` | Core/Spicy overall; Spicy individual | `OFFICIAL_DOCUMENTATION` for syntax; `VERIFIED_EXTERNAL_REFERENCE` for raw IV band and total thresholds | Reference `Appraisal / IV-related`; [Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/), [GO Hub](https://db.pokemongohub.net/tools/search-strings) |
| `background`, `locationbackground`; `specialbackground` | Chaos | Official for first two; `VERIFIED_EXTERNAL_REFERENCE` for last | Reference `Rarity / special status`; [Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/), [GO Hub](https://db.pokemongohub.net/tools/search-strings) |
| `megaevolve`, `mega1`–`mega3`; `mega`, `mega4` | Spicy / Chaos | Official for first group; `VERIFIED_EXTERNAL_REFERENCE` for latter search terms | Reference `Max / Mega / Fusion`; [Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/), [GO Hub](https://db.pokemongohub.net/tools/search-strings), [official Super Max announcement](https://pokemongo.com/news/mega-evolution-2026-update) |
| `dynamaxN`, `gigantamaxN`, `maxmoveN`, `maxguardN`, `maxspiritN` and documented ranges | Spicy / Chaos | `VERIFIED_EXTERNAL_REFERENCE` | Reference `Max / Mega / Fusion`; [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Box_(GO)), [GO Hub](https://db.pokemongohub.net/tools/search-strings) |
| `buddy0`–`buddy5`; `evolve`, `item`, `evolvenew`, `evolvequest`, `tradeevolve` | Buddy Spicy; evolution searches Reference | `OFFICIAL_DOCUMENTATION` | Reference `Buddy`, `Evolution management`; [Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/) |
| `favorite`, `defender`, `#tagname`, `hypertraining` | Reference except Hyper Training Chaos | `OFFICIAL_DOCUMENTATION` | Reference `Other collection/status searches`; [Help Center](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/) |
| `event` alias; `showcase`, `level40`, arbitrary exact 1–14 IV | Caution/Reference for `event`; do not generate others | `UNVERIFIED` for generation | Reference `Known aliases` / `Unconfirmed`; absent from finite random pool |

`app.js:allRules` also creates `size-xl-selection` as `xl`, `xxl`, or `xl,xxl`; `age-generated-{lower}-{upper}` as `ageN-M`; `buddy-range-{min}-{max}` as `buddyN-M`; `mega-level-bounded-{1..4}` as `megaN`; and sampled `type-banned-*`, `region-banned-*`, `move-type-banned-*` as one to three `!term` clauses joined by `&`. These generated IDs are parameter families, not a finite fixed list. `year-current` and `year-previous` store empty searches plus metadata and remain reference only. Cup preset vocabulary, Dex exclusions, manual conditions, and Pain Cup candidate numbers live in `docs/static/js/cup-data.js` and `pvpoke-data.js`; they are structural filters, not challenge rule IDs.

## Operators, parser, and serializer

**Intended:** `GBL_FILTER_AGENTS.md:Search Construction` and the reference say `&` AND, comma OR, `!` prefix exclusion, and hyphen numeric ranges. The reference also allows `:` and `;` as OR and `|` as AND, while generated strings prefer comma and `&`. It gives `fire,water` and `xl,xxl` but does not state mixed-operator precedence. The Help Center documents each operator and CP/HP range forms but likewise does not settle precedence by a mixed example. [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Box_(GO)) explicitly orders `!` > comma/colon/semicolon OR > `&`/`|` AND; [GO Hub](https://db.pokemongohub.net/tools/search-strings) independently says commas are evaluated inside ampersands. This is `VERIFIED_EXTERNAL_REFERENCE`, pending `USER_VERIFIED_IN_GAME`.

**Implemented:** `generator-utils.js:validateSearchExpression` first splits on `,;:`, then each resulting branch on `&`, yielding a disjunction of conjunctions (DNF). It trims terms, preserves quoted delimiters and backslash escapes, normalizes OR separators to comma, and rejects empty branches, dangling `&`/`!`, and unclosed quotes. It does **not** validate keyword existence, numeric bounds, parenthesized grouping, or whether `!` applies to a compound expression. It does not split `|` even though the reference names it as AND. `combineSearch` takes separately supplied expressions, builds their Cartesian product of local alternatives, deduplicates exact case-insensitive terms and identical clauses, and caps expansion at 4,096 alternatives. It serializes each result as `term&term,term&term`. This is correct under the local DNF interpretation; under the externally documented game order, such a string can admit unintended combinations because comma groups bind before the next `&`.

For example, local parsing of `fire,water&shiny` is `fire OR (water AND shiny)`. The externally documented reading is `(fire OR water) AND shiny`. Locally, `fire&shiny,water&shiny` is `(fire AND shiny) OR (water AND shiny)`. The externally documented reading is `fire AND (shiny OR water) AND shiny`, equivalent to `fire AND shiny` (assuming ordinary Boolean term behavior). Conversely, the compact `fire,water&shiny` expresses the intended “shiny Fire or Water” under external precedence. Parentheses are not supported by the local grammar and are not a documented game grouping device. A leading `!` is treated as part of a leaf term by the local parser; `!shadow&!purified` is the intersection of two exclusions. `cp0-1500` and `cp-1500` mean an inclusive upper bound under the documented range conventions; `cp1500-` means an inclusive lower bound. `cpSearchForRange` emits `cp0-M` for zero minimum. `stripCpTerms` removes CP-looking leaf terms from each cup expression and drops the entire cup filter if any remaining OR branch is empty; it is a structural cleanup, not a semantic solver. `removeSearchTerms` similarly strips matched leaf terms. Both inherit the local parser's grouping assumption.

### Truth-table style comparison

`F` = Fire, `W` = Water, `S` = Shiny. “Intended” means the rule labels/cup text, “local” means `validateSearchExpression`, and “external” means the cited operator order; actual game results remain unrecorded.

| Expression / case | Intended membership | Local interpretation | External-reference interpretation | Distinguishing inventory witness |
|---|---|---|---|---|
| `fire,water&shiny` | `(F∨W)∧S` | `F∨(W∧S)` | `(F∨W)∧S` | Non-shiny Fire: local yes, external no. |
| `fire&shiny,water&shiny` | `(F∨W)∧S` | `(F∧S)∨(W∧S)` | `F∧(S∨W)∧S = F∧S` | Shiny Water without Fire: local yes, external no. |
| G01503, `shiny|cp-500`, Holiday Ultra | Shiny, CP ≤500, one of Normal/Grass/Electric/Ice/Flying/Ghost | Six alternatives, each `cp-500&type&shiny` | `cp-500&normal&shiny,cp-500&grass&shiny,…` reads as simultaneous type requirements across `&` groups, so likely empty or severely narrowed; no live count. | Shiny single-type Normal ≤500. |
| G07404, `shiny|size-xs-group`, Fossil Master | Rock/Steel/Water, Shiny, XS or XXS | Six alternatives (`rock&shiny&xs` … `water&shiny&xxs`) | Cross-AND of comma groups; an XS Water-only Shiny is not sufficient under that order. | Shiny XS Water without Rock/Steel. |
| G00103, Pain Cup bottom-100, `size-xl-selection|research` | One of 153 candidate Dex numbers, CP ≤1500, non-rare, XXL, research origin | First 152 Dex numbers form unconstrained OR branches; only last (`982`) gets all trailing constraints. | `(candidate Dex OR …)&cp0-1500&!legendary&!mythical&!ultrabeast&xxl&research`; matches cup intent if all terms work. | A candidate-number Pokémon above 1500 CP, or a non-XXL candidate. |

These real rows are in `reviews/stress-2026-11-05/generations.csv`; G00103 is also in `flagged.csv`. G01503 was marked `CUP_LEAGUE_MISMATCH`, with `cp-500` repeated in all six local branches. G07404 was also marked `CUP_LEAGUE_MISMATCH`, with no Master CP constraint. The stress review reports G00103 `OR_PRECEDENCE_AMBIGUOUS` and leaves `cp_constraint_preserved_per_or_branch` blank. Its 552 Pain Cup compact cases are *not* confirmed CP failures. The broader repeated DNF outputs are equally dependent on the unresolved game precedence; the review's CP-per-local-branch pass does not validate their live meaning.

## Assembly and special cups

`app.js:generate` selects up to the requested count (default two, UI clamp 1–6) through `chooseSelection`; `chooseNextRule` applies settings, optional additional families, cup locks, `canAddRule`, and `isAllowedForLeague`, then weighted selection. An optional `disqualifier_only` rule is chosen separately at 18% (Chill/Spicy) or 30% (Chaos), so the final search may contain an additional exclusion beyond the two displayed challenge rules. `allRules` adds sampled type, region, and move-type bans as ordinary candidate rules, each internally conjoining its `!` terms. `generate` constructs `[normalized CP, cup prefix, custom additional expressions, non-CP selected searches, disqualifier searches]`, then calls `buildSearchOutput`/`combineSearch`. Settings changes rebuild the same structure in `markConfigPending`. A last-search retry loop allows 30 attempts; repeated outputs may remain. `getStaticCupPrefix`, `cupPresetSearch`, custom-cup persistence, and `additionalRuleExpressions` strip embedded CP terms so league CP is supplied centrally.

For regular cups, `cupPresetSearch` composes the cup search with `!Dex` species bans, then strips CP; `combineSearch` cross-expands with all other groups. Cup `lockTypes`, `lockMoves`, and `blockedFamilies` disable additional random families. Manual eligibility lives as text only: Element Cup's unevolved condition; Love Cup's red/pink Pokédex color; Bug Bite's move/type intent; Meta Madness's qualifying special-move distinction; Pain Cup's exact species/form ranking membership. Bug Bite's saved `bug&@bug,@poison,@rock` is a concise example of the disagreement: the local parser sees `(bug AND @bug) OR @poison OR @rock`, admitting non-Bug candidates, whereas the external operator order sees `bug AND (@bug OR @poison OR @rock)`, matching its stated type/move intent. The source still describes the type check as manual, so this example cannot prove client behavior. `@special` includes Return/Frustration per the official Help Center and is only a candidate filter for Meta Madness. `docs/static/js/cup-data.js` provides official news URLs for official cup definitions; homegrown cups are marked `official:false`. Choosing a league different from a cup's suggested/official league is permitted and recorded as a mismatch, as G01503 and G07404 show.

Pain Cup follows `pvpoke-data.js:getBottomRanked`: bottom N rows from each cached Great/Ultra/Master ranking, deduplicated by exact species/form, rarity categories removed, then projected to Dex numbers for the search. This projection can include other forms sharing the Dex number; the exact roster must be checked manually. `buildPainCupSearch` deliberately keeps the candidate numbers as one compact comma group and appends CP, three rare-category exclusions, and other requirements with `&`; it bypasses `combineSearch` to avoid a long cross-product. That compact form matches the **external** precedence reading and conflicts with the **local** DNF reading. The code and stress tests explicitly label this ambiguity; neither reading has a preserved in-game result.

## Compatibility and CP safeguards

`generator-utils.js:canAddRule` rejects a duplicate ID, same `family`, or same `exclusiveGroup`; it also blocks Pokémon-type versus type-effectiveness and `iv-combo` versus individual IV families. This prevents `shadow` with `!shadow`, Shadow with Purified (shared exclusive group), and the two size directions. It does not inspect all positive/negative leaf terms or IV/star arithmetic across families. Two different IV families may combine with an appraisal rule and yield an impossible total. `app.js:isFamilyBlockedByCup` handles cup locks; `ruleProfileWeight` and scarcity values bias selection but do not prove nonempty collections. `isAllowedForLeague` filters selected CP rules by league bounds; it uses `>=` at the cap, so a `cp1500-` candidate is rejected for Great even though exact 1500 could intersect. This is a conservative selector rule, not a CP-serialization failure.

`normalizeCpConstraint` finds the selected CP-family rule, intersects its min/max with the league, emits one resulting CP expression, and falls back to the league range if the intersection is empty. `generate` removes the selected CP rule from `otherRules`, so it is not appended twice. For example, G01503's Ultra league plus `cp-500` produces `cp-500`, repeated per local cup alternative. Tests in `tests/generator-utils.test.cjs` cover the intersection, CP stripping from cup prefixes, and one CP term per local branch; `tests/generator-stress-review.test.cjs` checks CP interval overlap and regular OR composition. The 10,000-row review found zero CP-preservation failures **under its local parser**. No reproduced duplicate/conflicting CP defect is established. Custom expressions are delimiter-validated but not globally checked for semantic CP contradictions after user input; this is a coverage boundary rather than a demonstrated failure.

The review harness (`tools/generator-stress-review.cjs:classifyPair,ivTotalFeasible,checkGenerationRecord`) distinguishes semantic classes: `CONFIRMED_INVALID` for every branch's direct term contradiction or impossible IV totals; `SUSPECTED_INVALID` for acquisition and size-overlap hypotheses; `FALSE_POSITIVE_CANDIDATE` for negative-scarcity, trade/hatch coexistence, and likely redundant subsets; `SCARCITY_WARNING` for high-scarcity positive rules; `GENERATOR_EXCLUDED` for metadata exclusions; `COMPLEXITY_WARNING` for >120 characters or >24 local branches; and `COMPATIBLE` otherwise. Its IV bands are 0→0, 1→1–5, 2→6–10, 3→11–14, 4→15; stars are computed over the three-stat total out of 45, with 4* exactly 45. G00170 (`iv-mid-hp|appraisal-perfect`) is impossible because 4* requires HP 15 and `1hp,2hp` requires 1–10. `iv-high-bulk-bands` (`0attack&3defense&3hp`) totals at most 28 and cannot be 3* or 4*. These conclusions follow the documented band model; tests of the review harness reinforce that arithmetic but do not test the client. Hatched plus Shadow/Purified (G00478), hatched plus raid origin, and distinct encounter methods remain **suspected**, since source labels do not settle post-trade/origin persistence. `traded` may coexist with hatched. `raid` with `remoteraid`/`megaraid` may be redundant rather than impossible. Mega, Max, and special-status battle eligibility depends on format/current state. No trainer collection size was measured.

### Material-assumption evidence register

| Claim | Evidence class | Basis and boundary |
|---|---|---|
| `&` intersects, comma/colon/semicolon unions, `!` excludes; CP/HP hyphen ranges are inclusive | `OFFICIAL_DOCUMENTATION` | [Help Center inventory search](https://niantic.helpshift.com/hc/en/6-pokemon-go/faq/1486-searching-filtering-your-pokemon-inventory/); it does not state mixed precedence. |
| Mixed order is `!` > comma OR > `&` AND | `VERIFIED_EXTERNAL_REFERENCE` | [Bulbapedia logical operators](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Box_(GO)) and [GO Hub combining searches](https://db.pokemongohub.net/tools/search-strings). No repository client-result record. |
| Local order is `!` as leaf prefix, then `&`, then comma OR | `IMPLEMENTATION_ASSUMPTION` | `generator-utils.js:validateSearchExpression`; `tests/generator-utils.test.cjs` asserts its expansions. |
| Candy quantity, copy count, Candy XL, powered-XL, and IV band meanings | `VERIFIED_EXTERNAL_REFERENCE` | [Bulbapedia search queries](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Box_(GO)) and [GO Hub range/category lists](https://db.pokemongohub.net/tools/search-strings); the local `GBL_FILTER_FILTER_REFERENCE.md` agrees, but no project in-game record exists. |
| 4* needs 15/15/15; 0/1/2/3-star thresholds follow total IV 0–22/23–29/30–36/37–44 | `VERIFIED_EXTERNAL_REFERENCE` | [GO Hub appraisal table](https://db.pokemongohub.net/tools/search-strings); `tools/generator-stress-review.cjs:ivTotalFeasible` computes these thresholds. |
| Different encounter labels are exclusive, or hatch cannot later coexist with Shadow/Purified | `UNVERIFIED` | `tools/generator-stress-review.cjs:classifyPair` marks these suspected; G00478 shows one case. Official keyword definitions do not settle lifecycle overlap. |
| Trade may preserve hatch origin; raid subtype may be a subset of `raid` | `IMPLEMENTATION_ASSUMPTION` | `classifyPair` labels them false-positive/redundancy candidates; specimen-level verification remains open. |
| High-scarcity rule combinations are empty in a given trainer's collection | `UNVERIFIED` | `rule-data.js:scarcity`, `reviewWarnings`, and `classifyPair` supply heuristic weights only. |
| Selected Mega/Max/Fusion candidates can battle in a given format | `UNVERIFIED` | `cup-data.js:manualRules` and review flag `BATTLE_FORMAT_CONDITIONAL`; eligibility changes with format/current state. |
| Ordinary expanded branches and compact Pain Cup text preserve CP in-game | `UNVERIFIED` | Static local checks pass for regular branches and return unknown for Pain Cup (`checkGenerationRecord`); live precedence is unresolved. |
| No `USER_VERIFIED_IN_GAME` evidence is present | `UNVERIFIED` as a mechanics claim | Repository inventory and 10,000-generation review contain no search screenshots or client counts. |

## Source contradictions and coverage gaps

1. **Precedence:** `GBL_FILTER_AGENTS.md` and the reference intend usable paste-ready intersections but omit mixed precedence. `generator-utils.js:validateSearchExpression/combineSearch` and regular-cup tests assume AND binds before OR; current Bulbapedia and GO Hub references say OR binds before AND. Tests such as “search composition distributes AND across OR groups” verify the serializer's own model, so a passing test cannot establish live semantics. Pain Cup's compact serializer assumes the opposite grouping from the local parser, and its test records ambiguity rather than asserting a CP bug.
2. **Compatibility:** `GBL_FILTER_AGENTS.md:Compatibility` says avoid contradictions and accidental empty pools. `canAddRule` only enforces IDs/families/exclusive groups plus two cross-family exceptions; G00170 and the 16 stress-review confirmed-invalid generations show a concrete gap. The review test proves the harness recognizes an invalid pair, while the production chooser still accepts it.
3. **Policy versus UI:** Instructions describe plain-language one-rule preservation, `search only`, `reroll second rule`, and no default league. The deployed page is a configured UI with a default league selection and random rule generation; it does not implement a natural-language request interpreter. The markdown is therefore a behavior aspiration, not an exact contract for this deployed UI.
4. **Vocabulary versus generation:** The reference lists many Reference/Caution terms; random `allRules` omits reference entries, but `addCustomRule` accepts any delimiter-valid text, including unverified terms. The reference labels `count2-` Reference while the production `copy-count` rule is Chaos. It also calls `@1/@2/@3type` Core/Spicy while `move-charge2-*` is Chaos. `locationbackground` is Reference in finite rules even though reference taxonomy calls backgrounds Chaos. These are pool-policy differences, not syntax proof.
5. **Coverage:** Static tests do not query Pokémon GO, cannot establish operator precedence, acquisition overlaps, real collection scarcity, form-level Pain Cup precision, custom-cup semantics, or search-box behavior for strings up to 10,459 characters (G08612). The review says 10,000 outputs, zero malformed local searches, 16 confirmed-invalid and 47 suspected-invalid generated samples, 552 Pain Cup ambiguous compact outputs, and 481 repeated searches; those are source simulation results. `tests/generator-utils.test.cjs` has a 100-filter sample and broad regex assertions, not an in-game oracle. Root-level old code and `archive/legacy-flask/` are not the deployed contract.

## Prioritised suspected root causes and proposed fixes (not applied)

| Priority / confidence | Suspected root cause; impact | Minimal reproduction and evidence | Proposed change after verification |
|---|---|---|---|
| P1 / high for source mismatch, medium for live effect | Local DNF serializer and parser use opposite mixed precedence from two current references. Ordinary multi-OR combinations may narrow or empty live results. | `combineSearch(["fire,water","shiny"])` emits `fire&shiny,water&shiny`; G01503 and G07404 are real expanded outputs. | Establish client precedence, then represent the game's grouping directly; review every regular cup and OR expansion, and add external-oracle tests. |
| P1 / high under documented IV model | Selector lacks cross-family IV/appraisal feasibility; generates impossible searches. | G00170 `1hp,2hp` plus `4*`; pairwise P023101 and review test for `iv-high-bulk-bands`. | Add a feasibility check at selection time across all composed branches using the confirmed appraisal model. |
| P1 / medium, pending live precedence | Pain Cup compact serializer and local validator disagree; CP and exclusions appear absent from most *local* branches, while external precedence groups them globally. | G00103; 552 ambiguous Pain Cup cases; `buildPainCupSearch` joins candidate comma list then `&` constraints. | Resolve precedence in game; then align Pain Cup serialization, local parser, and review check; retain a length strategy. Do not label a CP bug before reproduction. |
| P2 / high source, medium usability | Manual cup eligibility and Dex projection are only approximate; selected league can mismatch official cup format. | G00103 has 152 Dex candidates and exact-form caveat; G01503 Holiday Ultra; G07404 Fossil Master. | Surface manual checks and mismatch explicitly at paste time; encode only conditions the client can express safely. |
| P2 / low-to-medium mechanics | Acquisition and size compatibility is based on partial family metadata; scarcity warnings do not distinguish proven impossibility. | G00478 hatched/Shadow; `hatched&traded`; `size-xl-group&size-xs-group`; pairwise classifications. | Verify representative specimens; add only proven exclusions/subsets, keeping scarcity separate. |
| P3 / high source, low live certainty | Delimiter validation accepts arbitrary terms and `|` is not parsed despite reference support; exact source vocabulary is not enforced for custom input. | `validateSearchExpression("showcase")` succeeds; `fire|water` remains one leaf; `candykm...` is a non-pasteable reference placeholder. | Distinguish syntax parsing from keyword validation in UI; document/parse supported aliases consistently after client check. |
| P3 / high source | Long cross-products reduce usability, potentially exceed client entry constraints. | G08612 length 10,459; stress p95 length 1,288. | Establish actual client paste/search limit; choose compact, verified grouping or split into separate searches. |

## Focused in-game verification checklist

Use the same English-language client, inventory, and search screen for every comparison. Record client version, date, counts, full typed string, and screenshots of search field plus at least one identifying result; save a baseline screenshot of each witness Pokémon's type, Shiny, CP, size, and origin. Do not infer precedence from a zero count without a known witness.

1. **Decisive precedence:** Find a non-Shiny Fire Pokémon, a Shiny Water-only Pokémon, and a Shiny Fire Pokémon. Record counts and witness membership for `fire,water&shiny` and `fire&shiny,water&shiny`, plus `fire&shiny` and `water&shiny`. Local model includes non-Shiny Fire in the first and Shiny Water-only in the second; external model excludes both. This single test decides the central parser/serializer mismatch.
2. **League CP under real expanded search:** With a known Shiny Normal Pokémon ≤500 CP (and ideally a Shiny Grass-only counterpart), paste G01503's full string and compare `normal,grass,electric,ice,flying,ghost&shiny&cp-500`. Record counts and specimen membership. Local DNF predicts the expanded form works; external precedence predicts the compact form works. Confirm CP separately with `cp-500`.
3. **Pain Cup CP and global constraints:** With a known G00103 candidate Dex Pokémon above 1500 CP or non-XXL, paste the exact G00103 search and record whether it appears, plus counts for the full search and `cp0-1500&xxl&research`. Local DNF predicts early Dex branches can leak the witness; external model predicts they cannot. Keep exact form/Dex membership separate.
4. **IV arithmetic:** Use a known 4* Pokémon and a known 1hp/2hp Pokémon. Compare `4*`, `1hp,2hp`, and `4*&1hp,2hp`; record counts and appraisal screenshots. Both models of the *terms* predict no intersection, though mixed operator precedence itself must be considered when interpreting the last string. A direct `4*&1hp` and `4*&2hp` pair avoids the comma ambiguity.
5. **Acquisition and status:** Use a known traded hatch, a Shadow, a Purified Pokémon, and if possible a hatched specimen later traded. Record `hatched`, `traded`, `hatched&traded`, `hatched&shadow`, and `hatched&purified` counts and origin/status screenshots. This distinguishes impossibility from preserved origin metadata. Do not infer absence from a collection with no known witness.
6. **Size and alias details:** On known XS/XXS and XL/XXL specimens, test `xs`, `xxs`, `xl`, `xxl`, `xs&xxl`; separately test `fire|shiny` versus `fire&shiny` on known witnesses. Record counts and result identities to settle size overlap and `|` handling.
7. **Client length and niche syntax:** Paste one moderate real expanded row (G07404) and, only if practical, a 1,000+ character row and G08612. Record whether the field retains every character and the result count. Test `countcandy`, `countcandyxl`, `count`, `mega4`, and `candykmN` only with known inventory/candy/level witnesses; a zero count alone is inconclusive.

## Reviewed material and limits

Read: `GBL_FILTER_AGENTS.md`, `GBL_FILTER_FILTER_REFERENCE.md`, `README.md`, `docs/index.html`, deployed `docs/static/js/{rule-data,generator-utils,app,cup-data,pvpoke-data}.js`, `tests/{generator-utils,generator-stress-review,pvpoke-data}.test.cjs` where relevant, `tools/generator-stress-review.cjs`, `reviews/stress-2026-11-05/{summary.md,run-metadata.json,generations.csv,flagged.csv,pairwise.csv}`, and available root legacy entry-point references. The earlier `reviews/generated-filter-review-250.csv` is available but the 10,000-row review supersedes it for cited case IDs. The PvPoke snapshot is bundled locally; no live rankings were fetched for this audit. No project screenshot, count log, or other recorded user in-game verification was found. Official cup URL links in `cup-data.js` establish intended cup definitions, not that every cup restriction can be encoded in storage search.
