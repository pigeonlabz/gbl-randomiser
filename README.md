# GBL Randomiser GitHub Pages build

This is the deployed, self-contained static website in `docs/`. It uses local HTML, CSS, JavaScript, artwork, cup presets, and a locally hosted PvPoke JSON snapshot. It does not call a runtime backend or PvPoke API.

## PvPoke snapshot

`docs/static/data/pvpoke-v1.json` is the versioned Great League snapshot bundled with the site. It contains the Game Master and ranking fields used by the page and records its source commit and snapshot date. `docs/static/data/PVPOKE-LICENSE.txt` preserves PvPoke's MIT license. The page reads this local file only; it makes no request to PvPoke.

To import a future snapshot manually, choose and review a full PvPoke commit SHA, then run `node tools/update-pvpoke-data.mjs <40-character-commit-sha>`. The script downloads that pinned revision, validates it, and replaces the local JSON and license. It never polls for a newer revision. No scheduled updater or automatic refresh workflow is installed.

## Custom cups

- **Bug Bite** forces Great League and includes `bug`, `@bug`, and negative move-type searches for every type outside Bug, Poison, and Rock. Type and move mutators are locked while this cup is active.
- **Meta Madness** forces Great League and starts with `@special` plus Legendary, Mythical, and Ultra Beast exclusions. `@special` is only a candidate filter: manually check the equipped moves for a qualifying Community Day, event-exclusive, or legacy Elite TM move. Return and Frustration do not qualify.
- **Pain Cup** forces Great League and selects the last 100 or 250 ordered ranking rows in the bundled snapshot, then removes Legendary, Mythical, and Ultra Beast entries. The copied comma-separated Pokédex search is an approximate candidate filter because it can match other forms sharing a number. The collapsed list shows the exact ranked Pokémon and forms. Shared CP and rarity terms appear once.

The ranking cutoff uses the final N snapshot rows before rarity exclusions. That cutoff, exclusions, candidate search and exact eligible forms are computed deterministically from the bundled snapshot.

## Existing behavior and verification

Cup presets and weighted rule data remain bundled with the static page. Recent Cup choices and custom Cup settings continue using their existing local storage keys. This build has no account-backed or shared battle sessions; the optional battle target remains page-local.

Run the repository checks from the project root:

```sh
node --test tests/*.test.cjs
node --check docs/static/js/app.js
node --check docs/static/js/pvpoke-data.js
node --check tools/update-pvpoke-data.mjs
```
