# GBL Randomiser GitHub Pages build

This is the deployed, self-contained static website. It uses local HTML, CSS, JavaScript, artwork, cup presets, and a locally hosted PvPoke JSON snapshot. It does not call a runtime backend or PvPoke API.

## PvPoke snapshot

`static/data/pvpoke-v2.json` is the versioned snapshot bundled with the site. It contains the Game Master data and Great, Ultra, and Master overall rankings from one PvPoke source revision. `static/data/pvpoke-v1.json` is preserved as the earlier Great-only snapshot. `static/data/PVPOKE-LICENSE.txt` preserves the MIT license. The page reads the bundled snapshot only and makes no request to PvPoke.

For a future manual import, choose and review a full PvPoke commit SHA and run `node tools/update-pvpoke-data.mjs <40-character-commit-sha>` from the repository root. The script downloads the Game Master and all three league ranking files from that pinned revision, validates them, and writes `pvpoke-v2.json` and the license. It never polls for newer data. There is no scheduled updater or automatic refresh workflow.

## Custom cups

- **Bug Bite** supports any selected league and includes `bug`, `@bug`, and negative move-type searches for every type outside Bug, Poison, and Rock. Type and move mutators are locked while this cup is active.
- **Meta Madness** supports any selected league and starts with `@special` plus Legendary, Mythical, and Ultra Beast exclusions. `@special` is only a candidate filter: manually check the equipped moves for a qualifying Community Day, event-exclusive, or legacy Elite TM move. Return and Frustration do not qualify.
- **Pain Cup** uses one shared pool formed from the union of each league's bottom 250 (or 100) Great, Ultra, and Master overall ranking rows. Exact species/forms are deduplicated before Legendary, Mythical, and Ultra Beast entries are removed. The same pool applies in Little, Great, Ultra, and Master League; only the selected league's CP rule is added. The copied comma-separated Pokédex search is approximate because it can match other forms sharing a number. The collapsed list shows exact eligible forms with their per-league ranks.

Each league's bottom-N cutoff uses its final N snapshot rows. The union, exclusions, candidate search and exact eligible forms are computed deterministically from the bundled snapshot.

## Existing behavior and verification

Cup presets and weighted rule data remain bundled with the static page. Recent Cup choices and custom Cup settings continue using their existing local storage keys. This build has no account-backed or shared battle sessions; the optional battle target remains page-local.

Run the repository checks from the project root:

```sh
node --test tests/*.test.cjs
node --check docs/static/js/app.js
node --check docs/static/js/pvpoke-data.js
node --check tools/update-pvpoke-data.mjs
```
