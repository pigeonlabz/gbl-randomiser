# Pokémon GO GBL Randomiser

A tiny, static page that makes a random Pokémon GO search filter for friendly Battle League challenges. It runs in the browser with plain HTML, CSS, and JavaScript; there are no dependencies or build steps.

Made by **PigeonLabs**.

## Use it

Open [`docs/index.html`](docs/index.html), choose a league, mutator count, and randomness level, then select **Generate New Filter**. Copy the search string into Pokémon GO.

Example filter:

```text
cp0-1500&shiny&age0-30
```

## GitHub Pages

In the repository settings, enable GitHub Pages with branch **main** and folder **/docs**. The site is already organized for that source; no build or deployment workflow is needed.

## Local development

Open `docs/index.html` directly in a browser. Edit `docs/index.html`, `docs/styles.css`, and `docs/app.js`; the rule vocabulary is in `docs/rule-data.js`.

The old Flask/session prototype is kept under `archive/legacy-flask/` for reference and is not part of the published site. Artwork with unclear redistribution rights is kept locally under `archive/unverified-artwork/` and excluded from the public release by `.gitignore`.

This is an unofficial community tool developed by **PigeonLabs**. It is not affiliated with, endorsed by, or sponsored by Niantic, Pokémon, Nintendo, or The Pokémon Company. Pokémon and related names are trademarks of their respective owners.
