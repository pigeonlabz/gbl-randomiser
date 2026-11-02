# GBL Randomiser GitHub Pages build

This is the deployed, self-contained static website in `docs/`. It uses local HTML, CSS, JavaScript, artwork, cup presets, and a locally hosted PvPoke JSON snapshot. It does not call a runtime backend or PvPoke API.

## PvPoke snapshot

`docs/static/data/pvpoke-v2.json` is the versioned snapshot bundled with the site. It includes Game Master data and separate Great, Ultra, and Master overall rankings from one source revision. `docs/static/data/pvpoke-v1.json` is retained as the earlier Great-only snapshot. `docs/static/data/PVPOKE-LICENSE.txt` preserves PvPoke's MIT license. The page reads its bundled snapshot only; it makes no request to PvPoke.

To import a future snapshot manually, choose and review a full PvPoke commit SHA, then run `node tools/update-pvpoke-data.mjs <40-character-commit-sha>`. The script downloads the Game Master and all three pinned league ranking files, validates them as one dataset, and writes `pvpoke-v2.json` with the preserved MIT license. It never polls for a newer revision. No scheduled updater or automatic refresh workflow is installed.

## Custom cups

- **Bug Bite** supports any selected league and includes `bug`, `@bug`, and negative move-type searches for every type outside Bug, Poison, and Rock. Type and move mutators are locked while this cup is active.
- **Meta Madness** supports any selected league and starts with `@special` plus Legendary, Mythical, and Ultra Beast exclusions. `@special` is only a candidate filter: manually check the equipped moves for a qualifying Community Day, event-exclusive, or legacy Elite TM move. Return and Frustration do not qualify.
- **Pain Cup** uses one shared eligibility pool: the union of the bottom 250 (or 100) Great, Ultra, and Master overall ranking rows, deduplicated by exact species/form before Legendary, Mythical, and Ultra Beast entries are removed. It works in Little, Great, Ultra, and Master League; only the selected league's CP rule is added. The copied comma-separated Pokédex search is an approximate candidate filter because it can match other forms sharing a number. The collapsed list shows the exact eligible forms and their per-league ranks.

Each ranking cutoff uses the final N rows in that league's snapshot before the league results are combined and rarity exclusions are applied. The union, exclusions, candidate search and exact eligible forms are computed deterministically from the bundled snapshot.

## Existing behavior and verification

Cup presets and weighted rule data remain bundled with the static page. Recent Cup choices and custom Cup settings continue using their existing local storage keys. This build has no account-backed or shared battle sessions; the optional battle target remains page-local.

Run the repository checks from the project root:

```sh
node --test tests/*.test.cjs
node --check docs/static/js/app.js
node --check docs/static/js/pvpoke-data.js
node --check tools/update-pvpoke-data.mjs
```
