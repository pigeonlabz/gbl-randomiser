# Pokémon GO Filter Reference

Search vocabulary for the GBL Filter Generator.

Last triple-checked: **2026-07-26**.

## Evidence labels

- **Official**: present in current Pokémon GO Help Center or current official Pokémon GO gameplay/news documentation.
- **Verified-current**: currently documented by multiple independent up-to-date Pokémon GO references and/or contemporary client-rollout evidence, but omitted from the main official inventory-search Help Center article.
- **Caution**: appears to work/currently be documented, but is ambiguous, shortcut-like, language-sensitive, or too fragile to use as a normal generated rule.
- **Unconfirmed**: anecdotal/current reports exist but evidence is not strong enough for normal generation.

## Tournament pool labels

- **Core**: good ordinary random battle rule.
- **Spicy**: useful but more restrictive or collection-dependent.
- **Chaos**: valid but potentially very restrictive/state-dependent.
- **Reference**: understand it, but do not normally randomize it.

The evidence label and tournament pool label describe different things. A filter can be Verified-current but still Core/Spicy/Chaos.

---

## Numeric / battle stats

| Search | Meaning | Evidence | Pool |
|---|---|---|---|
| `cp300` | Exact CP 300 | Official | Spicy |
| `cp-1500` | CP up to 1500 | Official | Structural |
| `cp1500-` | CP 1500 or higher | Official | Spicy |
| `cp1000-1500` | CP from 1000 through 1500 | Official | Spicy |
| `hp150` | Exact HP 150 | Official | Spicy |
| `hp-150` | HP up to 150 | Official | Spicy |
| `hp150-` | HP 150 or higher | Official | Spicy |
| `hp100-150` | HP from 100 through 150 | Official | Spicy |
| `distance1000` | Caught within 1000 km of current location | Official | Chaos |
| `distance1000-` | Caught at least/about more than the threshold distance away according to the game's range semantics | Official | Chaos |
| `distance100-1000` | Catch-distance range | Official | Chaos |

Distance depends on the trainer's current location.

### Generic numeric ranges

For search terms that support numeric values, the common pattern is:

- exact: `term100`
- maximum: `term-100`
- minimum: `term100-`
- range: `term50-100`

Do not assume an arbitrary keyword accepts this syntax; use only terms documented below.

---

## Candy / collection quantities

These are important current-client filters that the main Niantic inventory-search Help Center page may omit.

| Search | Meaning | Evidence | Pool |
|---|---|---|---|
| `countcandy100` | Evolution-family Candy total exactly 100 | Verified-current | Spicy |
| `countcandy100-200` | Evolution-family Candy total from 100 through 200 | Verified-current | Spicy |
| `countcandy100-` | Evolution-family Candy total at least 100 | Verified-current | Spicy |
| `countcandy-100` | Evolution-family Candy total up to 100 | Verified-current | Spicy |
| `countcandyxl50` | Evolution-family Candy XL total exactly 50 | Verified-current | Spicy |
| `countcandyxl50-100` | Candy XL total from 50 through 100 | Verified-current | Chaos |
| `countcandyxl50-` | Candy XL total at least 50 | Verified-current | Spicy/Chaos |
| `count2-` | Pokémon whose Pokédex species count is at least two; forms sharing a Dex number count together | Verified-current | Reference |
| `count5-10` | Pokémon whose Pokédex species count is from 5 through 10 | Verified-current | Reference |
| `candykm...` | Filters by Buddy Candy walking-distance value/category using numeric/range syntax | Verified-current | Spicy |
| `candyxl` | Pokémon powered above level 40 using Candy XL | Verified-current | Spicy |

### Important distinctions

- `countcandy` = Candy quantity.
- `countcandyxl` = Candy XL quantity.
- `count` = Pokémon copy count, not Candy.
- `candyxl` = Pokémon that have been powered beyond level 40, not Candy XL inventory quantity.
- Candy is associated with an evolution family, so `countcandy...` reflects that shared family Candy pool rather than a unique balance stored on one individual Pokémon.

Example battle challenge:

`cp-1500&countcandy100-200&water`

---

## Species / identity

| Search | Meaning | Evidence | Pool |
|---|---|---|---|
| `Pikachu` | Pokémon name | Official | Reference |
| `+Pikachu` | Evolutionary family | Official | Spicy |
| `25` | Pokédex number | Official | Reference |
| user nickname | Pokémon nickname | Official | Reference |
| `water` | Pokémon has Water typing | Official | Core |

Do not invent nicknames. Only use nickname searches supplied by the user.

### Regions

Official documented region terms include:

- `kanto`
- `johto`
- `hoenn`
- `sinnoh`
- `unova`
- `kalos`
- `alola`
- `galar`
- `hisui`
- `paldea`

Region is a **Core** tournament family.

Hisui is valid and must not be omitted.

### Gender

| Search | Meaning | Evidence | Pool |
|---|---|---|---|
| `male` | Male Pokémon | Verified-current | Spicy |
| `female` | Female Pokémon | Verified-current | Spicy |
| `genderunknown` | Genderless/unknown-gender Pokémon | Verified-current | Spicy |

---

## Type effectiveness searches

Current client references document searches based on weakness/coverage as well as the Pokémon's own typing.

| Search | Meaning | Evidence | Pool |
|---|---|---|---|
| `<fire` | Pokémon whose typing takes super-effective damage from Fire | Verified-current | Spicy |
| `>fire` | Pokémon that know at least one move super-effective against Fire-type targets | Verified-current | Spicy |

These are powerful but easier to misunderstand than plain `fire` or `@fire`, so explain the rule in words when generated.

---

## Moves

| Search | Meaning | Evidence | Pool |
|---|---|---|---|
| `@Move Name` | Knows that specific move | Official | Spicy |
| `@grass` | Knows at least one Grass-type move | Official | Core |
| `@1ghost` | Fast Attack is Ghost type | Official | Core/Spicy |
| `@2ghost` | First Charged Attack is Ghost type | Official | Core/Spicy |
| `@3ghost` | Second Charged Attack is Ghost type | Official | Core/Spicy |
| `@special` | Has a special move not currently learnable with a normal TM | Official | Spicy |
| `@weather` | Has one or more attacks boosted by current weather | Official | Spicy |

`@weather` is about the **current weather's effect on attacks**, not catch-time weather boost.

Some current references expose placeholder-based searches related to whether a second Charged Attack is unlocked. Treat those as **Caution/Reference** rather than a normal random rule because the syntax is non-obvious and potentially brittle.

---

## Age / acquisition / origin

| Search | Meaning | Evidence | Pool |
|---|---|---|---|
| `age0` | Caught within the last 24 hours | Official | Core |
| `age1` | Caught 24-48 hours ago | Official | Core |
| `age0-30` | Age range in days | Official | Core |
| `year2019` | Acquired during 2019 | Official | Spicy |
| `hatched` | Trainer hatched this Pokémon from an Egg | Official | Core |
| `eggsonly` | Species categorized as Egg-exclusive | Official | Chaos |
| `traded` | Received through a trade | Official | Core |
| `lucky` | Lucky Pokémon | Official | Spicy |

### Encounter method filters

Current client references also document encounter/origin terms not all present in the main official inventory-search article:

| Search | Meaning | Evidence | Pool |
|---|---|---|---|
| `raid` | Obtained from a raid | Verified-current | Core/Spicy |
| `remoteraid` | Obtained from a Remote Raid | Verified-current | Spicy |
| `megaraid` | Obtained from a Mega Raid | Verified-current | Spicy |
| `exraid` | Obtained from an EX Raid | Verified-current | Chaos |
| `primalraid` | Obtained from a Primal Raid | Verified-current | Chaos |
| `research` | Obtained from research | Verified-current | Core/Spicy |
| `gbl` | Obtained from GO Battle League | Verified-current | Spicy |
| `rocket` | Obtained through Team GO Rocket | Verified-current | Core/Spicy |
| `snapshot` | Obtained from a snapshot encounter | Verified-current | Chaos |
| `party` | Obtained via Party Play encounter/reward semantics used by the client | Verified-current | Chaos |

`hatched` and `eggsonly` remain different concepts.

---

## Appraisal / IV-related

### Overall appraisal

- `0*`
- `1*`
- `2*`
- `3*`
- `4*`

Evidence: **Official**. Pool: **Core/Spicy**.

### Individual attribute appraisal bands

Official/current syntax combines a band number with a base stat:

- `0attack` / `1attack` / ... / `4attack`
- `0defense` / ... / `4defense`
- `0hp` / ... / `4hp`

Current band semantics:

| Band | Raw IV range |
|---|---|
| `0` | exactly 0 |
| `1` | 1-5 |
| `2` | 6-10 |
| `3` | 11-14 |
| `4` | exactly 15 |

Pool: **Spicy**.

Examples:

- `0attack&3defense&3hp` = exact 0 Attack, Defense 11-14, HP 11-14.
- `0attack&4defense&4hp` = exact 0 Attack / 15 Defense / 15 HP.

Do **not** claim that `3defense` means exact 15 Defense.

There is no direct arbitrary exact-IV syntax for values 1-14; those are represented by appraisal bands.

---

## Size

Official searches:

- `xxs`
- `xs`
- `xl`
- `xxl`

Pool: **Core**.

Broader OR example:

`xl,xxl`

Do not confuse size `xl` with `candyxl`.

---

## Rarity / special status

| Search | Meaning | Evidence | Pool |
|---|---|---|---|
| `shiny` | Shiny Pokémon | Official | Core |
| `legendary` | Legendary Pokémon | Official | Core |
| `mythical` | Mythical Pokémon | Official | Core/Spicy |
| `ultrabeast` | Ultra Beast | Official | Core/Spicy |
| `shadow` | Shadow Pokémon | Official | Core |
| `purified` | Purified Pokémon | Official | Core |
| `costume` | Event/costumed Pokémon | Official | Spicy |
| `event` | Event Pokémon alias listed by a current reference; prefer `costume` | Caution | Reference |
| `background` | Has a rare background; current references resolve this across Location/Special Backgrounds | Official | Chaos |
| `locationbackground` | Has a location catch background | Official | Chaos |
| `specialbackground` | Has a Special Background | Verified-current | Chaos |
| `adventureeffect` | Has an Adventure Effect-capable move/status under current client semantics | Verified-current | Spicy/Chaos |

Rare-category OR example:

`legendary,mythical,ultrabeast`

Do not treat `legendary` as shorthand for all three categories.

For generated filters, prefer `costume` over the less-stable/alias-like `event` term.

---

## Max / Mega / Fusion

| Search | Meaning | Evidence | Pool |
|---|---|---|---|
| `dynamax` | Dynamax Pokémon | Official | Spicy |
| `gigantamax` | Gigantamax Pokémon | Official | Spicy |
| `fusion` | Able to be fused or already underwent Fusion under the documented client semantics | Official | Chaos |
| `megaevolve` | Currently eligible to Mega Evolve/Primal Revert given relevant eligibility/resources | Official | Spicy |
| `mega` | Mega/Primal-capable species regardless of current Mega/Primal Energy | Verified-current | Spicy |
| `mega1` | Base Mega Level | Official | Spicy |
| `mega2` | High Mega Level | Official | Spicy |
| `mega3` | Max Mega Level | Official | Spicy |
| `mega4` | Super Max Mega Level | Verified-current (Super Max level itself is Official) | Spicy/Chaos |

Current references also document numeric Max filters:

| Search | Meaning | Evidence | Pool |
|---|---|---|---|
| `dynamaxN` | Dynamax Pokémon with N unlocked Max moves; numeric ranges are supported | Verified-current | Spicy |
| `gigantamaxN` | Gigantamax Pokémon with N unlocked Max moves; numeric ranges are supported | Verified-current | Spicy/Chaos |
| `maxmove1-3` | Max Move level filter | Verified-current | Spicy |
| `maxguard1-3` | Max Guard level filter | Verified-current | Spicy |
| `maxspirit1-3` | Max Spirit level filter | Verified-current | Spicy |

Battle-format eligibility for Max/Mega-related Pokémon depends on the actual battle format. Treat these as conditional rather than universally safe restrictions.

`megaevolve` does **not** mean currently Mega-evolved.

The official inventory-search article can lag newer Mega Level additions; official 2026 Pokémon GO material confirms the newer **Super Max** Mega Level exists.

---

## Buddy

Official range: `buddy0-5`.

- `buddy0`: no buddy history
- `buddy1`: has been a buddy but never reached Good Buddy
- `buddy2-5`: Good Buddy through Best Buddy progression

Pool: **Spicy**.

---

## Evolution management

| Search | Meaning | Evidence | Pool |
|---|---|---|---|
| `evolve` | Currently eligible to evolve, considering Candy/items/requirements | Official | Reference |
| `item` | Can evolve using an item | Official | Reference |
| `evolvenew` | Can evolve toward a new Pokédex entry | Official | Reference |
| `evolvequest` | Quest-based evolution | Official | Reference |
| `tradeevolve` | Eligible for Candy-free/reduced-Candy trade evolution | Official | Reference |

These are valid searches but usually poor random battle restrictions.

`evolve` is **not** a substitute for the separate current `countcandy...` quantity search family.

---

## Other collection/status searches

| Search | Meaning | Evidence | Pool |
|---|---|---|---|
| `favorite` | Marked as favourite | Official | Reference |
| `defender` | Currently defending a Gym | Official | Reference |
| `hypertraining` | Currently undergoing Hyper Training | Official | Chaos |
| `#tagname` | Pokémon with user-created tag | Official | Reference |

Never invent user tag names.

`defender` should not normally be used as a random battle restriction because it is an inventory-management state and may select Pokémon unavailable for the intended battle.

---

## Operators

### AND

Prefer:

`&`

Example:

`water&shiny`

The official documentation also describes `|` as a combining operator in relevant contexts, but generated project searches should prefer `&` for clarity/consistency.

### OR

Supported separators include:

- `,`
- `:`
- `;`

Prefer comma.

Example:

`fire,water`

### NOT

Prefix with `!`.

Examples:

- `!shadow`
- `!shadow&!purified`

### Ranges

Use verified hyphen syntax.

Examples:

- `cp-1500`
- `cp1000-1500`
- `hp100-`
- `age0-30`
- `countcandy100-200`
- `countcandyxl50-`

---

## Standard Trainer Battle league constraints

Standard limits:

- Great League: maximum 1500 CP -> `cp-1500`
- Ultra League: maximum 2500 CP -> `cp-2500`
- Master League: no maximum CP filter

Special cups may have different limits. Use the user's stated cup/limit rather than assuming one.

League CP is structural and does not consume one of the default two fun rules.

---

## Good generated-rule patterns

### Broad + broad

`hoenn&@dark`

### Broad + collection trait

`water&traded`

### League + two challenge rules

`cp-1500&shiny&age0-30`

### Candy challenge

`countcandy100-200&ghost`

### Candy XL chaos

`countcandyxl50-100&shiny`

This can be very collection-dependent; flag that when appropriate.

### Size OR group

`xl,xxl`

### Rare-category group

`legendary,mythical,ultrabeast`

### IV/appraisal challenge

`0attack&4defense`

This means exact 0 Attack and exact 15 Defense.

---

## Known aliases / ambiguous shortcuts

Some current references document shortcut forms such as bare `count`, `mega`, `dynamax`, or `gigantamax` resolving to numeric ranges/defaults.

For generated tournament searches:

- prefer explicit syntax when it avoids ambiguity;
- do not rely on a shortcut whose meaning could be mistaken for a Pokémon name or move;
- explain unusual filters in plain English.

---

## Unconfirmed / do not generate by default

Do not invent or confidently generate syntax that has only anecdotal support.

As of this review:

- `showcase` / `!showcase` has recent anecdotal reports but is not sufficiently corroborated in the current primary reference set for normal generation.
- Do not invent arbitrary direct Pokémon-level filters such as `level40` unless newly verified.
- Do not invent arbitrary exact 1-14 IV syntax; use appraisal bands.
- Do not reinterpret `@weather` as "caught weather boosted".
- Do not claim `megaevolve` means currently Mega-evolved.
- Do not claim `legendary` includes Mythical Pokémon or Ultra Beasts.

When a new filter is discovered, add it only after checking current behaviour/evidence and label its evidence status.

---

## Reference sources used for this review

Primary:

- Pokémon GO Help Center: Searching & Filtering Your Pokémon Inventory.
- Current official Pokémon GO Mega Evolution / Super Max Mega Level documentation and news.

Current corroborating references for client filters the Help Center omits:

- Bulbapedia: Pokémon Box / Pokémon GO search syntax.
- Pokémon GO Hub: Pokémon GO Search Strings guide.
- Serebii: Pokémon GO Search page.
- Contemporary client-rollout/community evidence only as supplementary support, not as the sole authority.

The project's policy is deliberately **not** "anything absent from the Help Center is invalid" because the Help Center demonstrably lags some live-client search additions.
