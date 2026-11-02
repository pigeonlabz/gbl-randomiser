# GBL Randomiser GitHub Pages build

This is the deployed, self-contained static website in `docs/`. It uses local HTML, CSS, JavaScript, artwork, cup presets, and a locally hosted PvPoke JSON snapshot. It does not call a runtime backend or PvPoke API.

## PvPoke snapshot

`docs/static/data/pvpoke-v1.json` contains the compact Great League overall ranking snapshot and the Game Master fields used by the site: species identifiers, Pokédex numbers, forms, typings, base stats, move lists, move types, Legacy/Elite TM move markers, and category tags. The snapshot records its upstream Git commit, Game Master timestamp, and generation time. `docs/static/data/PVPOKE-LICENSE.txt` preserves PvPoke's MIT license and attribution.

The scheduled and manually triggerable `Refresh PvPoke data` workflow downloads the minified Game Master, Great League overall rankings, and license from one pinned upstream revision. The updater validates the inputs and generated snapshot before writing a temporary file and replacing the checked-in dataset. A failed download or validation leaves the previous dataset in place; the website keeps using that local snapshot and never depends on PvPoke being available at runtime.

The browser keeps the validated snapshot loaded in the current tab so Pain Cup does not change during a tournament. The PvPoke lookup shows the exact revision and update time. Use **Load latest snapshot** to clear the tab pin and fetch the deployed snapshot again.

## Custom cups

- **Bug Bite** forces Great League and includes `bug`, `@bug`, and negative move-type searches for every type outside Bug, Poison, and Rock. Type and move mutators are locked while this cup is active.
- **Meta Madness** forces Great League and starts with `@special` plus Legendary, Mythical, and Ultra Beast exclusions. `@special` is only a candidate filter: manually check the equipped moves for a qualifying Community Day, event-exclusive, or legacy Elite TM move. Return and Frustration do not qualify.
- **Pain Cup** forces Great League and selects the last 100 or 250 Great League overall ranking entries in the pinned snapshot, then removes Legendary, Mythical, and Ultra Beast Pokémon. The interface reports unmapped or ambiguous forms and omits them from copyable searches. Long outputs are split into batches of at most 200 characters; run every batch to cover the full mapped selection.

Recognized Shadow and regional form distinctions use Pokédex-number searches with matching form terms. Other form mappings require manual verification rather than a potentially over-broad Pokémon GO search.

## Existing behavior and verification

Cup presets and weighted rule data remain bundled with the static page. Recent Cup choices and custom Cup settings continue using their existing local storage keys. This build has no account-backed or shared battle sessions; the optional battle target remains page-local.

Run the repository checks from the project root:

```sh
node --test tests/*.test.cjs
node --check docs/static/js/app.js
node --check docs/static/js/pvpoke-data.js
node --check tools/update-pvpoke-data.mjs
```
