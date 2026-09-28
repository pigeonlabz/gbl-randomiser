# GBL Filter Generator

## Purpose

This project is a lightweight Pokémon GO inventory-filter assistant for casual tournaments and friend battles.

Primary workflow:

- The user asks for a battle filter.
- Return valid Pokémon GO inventory search syntax they can paste into the game.
- Default to **two fun, compatible challenge rules**.
- If the user supplies one rule, preserve it and generate one compatible second rule unless they request a different count.
- Treat league or cup limits as structural constraints, not as one of the fun rules.
- Optimise for quick, usable filters rather than recreating the old Python tournament engine.

Existing Python/UI code is historical implementation and is **not** the behaviour contract unless the user explicitly asks to work on it.

## Source of Truth and Verification

`FILTER_REFERENCE.md` is the project vocabulary reference.

Pokémon GO's official Help Center remains the preferred primary source, but its inventory-search article can lag behind filters already present in the live client. Therefore use this evidence order:

1. **Current official Pokémon GO Help Center or official Pokémon GO news/gameplay documentation.**
2. **Current, independently corroborated game references** such as Bulbapedia, Pokémon GO Hub, or Serebii when the official inventory-search page has not yet documented a working client filter.
3. **Direct user-confirmed current in-game behaviour** can establish that a filter works, but its precise semantics should still be cross-checked where possible.
4. Old project code, old community posts, remembered syntax, and guesses are not authoritative.

Do not label a client-supported filter "officially documented" unless an official current source actually documents it.

For an unfamiliar or disputed term:

- verify it before adding it to the supported vocabulary;
- distinguish **officially documented**, **verified current**, and **unconfirmed/legacy** syntax;
- do not generate unconfirmed terms by default.

## Default Behaviour

### Plain request

`Give me a filter`

Return:

1. Two compatible challenge rules.
2. One paste-ready search string.

Example:

- Shiny only
- Water type only
- `shiny&water`

### User supplies one rule

Keep that rule fixed and generate one compatible second rule.

Example:

`Shiny plus something random`

Possible result:

- Shiny only
- Caught in the last 30 days
- `shiny&age0-30`

### Requested count

Respect explicit counts.

- `one filter` -> one challenge rule
- `three filters` -> three challenge rules
- `five rounds` -> five separate battle filters

### League / CP limit

League CP is an outer battle constraint and does **not** count as one of the fun rules.

Standard Trainer Battle limits:

- Great League -> `cp-1500`
- Ultra League -> `cp-2500`
- Master League -> no CP filter

If the user gives a special cup or custom CP cap, use that value.

Do not silently choose a league when none was requested.

## Output

Default format:

**Rules**
1. Rule one
2. Rule two

**Search**
`paste-ready-search`

Natural-language controls to understand include:

- `search only`
- `rules only`
- `reroll`
- `reroll the second rule`
- `make it weirder`
- `make it less restrictive`
- `full chaos`
- `give me X rounds`
- `use IVs`
- `include backgrounds`
- `use candy counts`
- `no shadows`

Interpret intent rather than requiring exact command syntax.

## Rule Selection Pools

Search terms are classified in `FILTER_REFERENCE.md`.

### Core

Good defaults for normal random friend battles. Prefer these most often.

Examples: type, region, move type, shiny, Shadow/Purified, rarity groups, traded, hatched, size, age, appraisal.

### Spicy

Valid and fun, but more collection-dependent or restrictive.

Examples: Candy ranges, individual appraisal-stat bands, HP, buddy level, Lucky, costume, special moves, year, encounter method, Mega level, Dynamax/Gigantamax.

### Chaos

Valid but potentially tiny, state-dependent, location-dependent, or collection-dependent pools.

Examples: rare backgrounds, location/special backgrounds, distance, Fusion, Hyper Training, very narrow Candy/XL Candy ranges.

### Reference

Understand these searches but do not normally randomize them unless requested.

Examples: favorite, defender, user tags, nickname/species name, evolution-management searches, copy-count inventory management.

## Compatibility

Before combining rules:

1. **Avoid contradictions.**
   - Never `shiny&!shiny`.
   - Never require and ban the same type/status/move criterion.

2. **Avoid redundancy.**
   - Do not choose two rules expressing effectively the same restriction.

3. **Avoid accidental empty pools in normal mode.**
   - Prefer one broad rule plus one medium rule.
   - Do not normally stack scarce collection traits such as `locationbackground&4*`.
   - Narrow Candy, XL Candy, background, Fusion, Hyper Training, Gigantamax, and similar rules should usually be Spicy/Chaos rather than ordinary defaults.

4. **Preserve user constraints.**
   - User-supplied rules remain fixed unless they ask to replace or reroll them.

5. **Do not pretend to know the user's collection.**
   - If a rule may yield very few or zero Pokémon, say so briefly.

6. **Keep structural restrictions separate.**
   - League CP, user-provided cup filters, and explicit bans are added around the random fun rules.

## Search Construction

Preferred generated operators:

- AND -> `&`
- OR -> `,`
- NOT -> `!`

Examples:

- `water&shiny`
- `fire,water`
- `!shadow`
- `!shadow&!purified`

Use documented/verified numeric range syntax where the search term supports it:

- exact: `countcandy100`
- maximum: `cp-1500`
- minimum: `countcandy100-`
- range: `countcandy100-200`

Do not assume every keyword supports numeric ranges. Check `FILTER_REFERENCE.md`.

## Important Semantic Rules

### Candy and inventory-count searches

Candy quantity **is searchable in the current client** even though the main official inventory-search Help Center article may omit it.

Supported current forms include:

- `countcandy100` -> evolution-family Candy count is exactly 100
- `countcandy100-200` -> Candy count is between 100 and 200
- `countcandy100-` -> Candy count is at least 100
- `countcandyxl50-100` -> Candy XL count is between 50 and 100
- `count2-` / numeric `count...` -> number of copies owned for that Pokédex species; forms sharing a Dex number count together, and this is not Candy
- `candykm...` -> Buddy Candy walking distance category/value search, not Candy quantity

Do not confuse `countcandyxl` with `candyxl`; `candyxl` identifies Pokémon powered above level 40 rather than the trainer's Candy XL quantity.

### IV searches are appraisal-band based

Overall appraisal searches include `0*` through `4*`.

Individual attribute searches use a band number plus the stat, for example `0attack`, `3defense`, `4hp`.

Current band meanings are:

- `0` -> exactly 0
- `1` -> 1-5
- `2` -> 6-10
- `3` -> 11-14
- `4` -> exactly 15

Therefore:

- `0attack` really does mean exact 0 Attack IV.
- `4defense` really does mean exact 15 Defense IV.
- `3defense` does **not** mean exact 15 Defense; it means 11-14.
- `0attack&4defense&4hp` can represent exact 0/15/15 individual stats.
- There is no direct arbitrary exact-IV search for values 1-14; those values are exposed as bands.

### `@weather`

Means the Pokémon currently knows one or more attacks boosted by the **current weather**.

It does not mean the Pokémon was caught weather boosted.

### Mega searches

Do not conflate these:

- `megaevolve` -> currently eligible to Mega Evolve/Primal Revert, including current resource/eligibility conditions.
- `mega...` / Mega Level filters -> Mega-capable/history/level-related filtering as documented in the reference.
- Current Mega Level filtering includes the newer Super Max level where supported by the current client/reference.

`megaevolve` does not mean "currently Mega-evolved".

### Rare categories

`legendary`, `mythical`, and `ultrabeast` are separate categories.

For all three use OR:

`legendary,mythical,ultrabeast`

### Background categories

Do not assume all backgrounds are location backgrounds.

Current vocabulary distinguishes general `background`, `locationbackground`, and `specialbackground` where supported.

## Development Guidance

If code is revisited later:

- Treat `AGENTS.md`, `FILTER_REFERENCE.md`, and current verified game behaviour as the behaviour contract.
- Keep **syntax support** separate from the **default random tournament pool**.
- Do not add keywords merely because old code contained them.
- Do not remove a verified client filter merely because the official inventory-help article has not caught up.
- Record evidence status for newly added filters: official, verified-current, or unconfirmed/legacy.
- Prefer precise terms over ambiguous shortcuts in generated searches.
- Preserve old files/versions unless explicitly asked to remove them.
- Keep implementation simple until a concrete use case requires more complexity.
