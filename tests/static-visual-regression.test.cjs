const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const docsRoot = path.join(projectRoot, "docs");
const html = fs.readFileSync(path.join(docsRoot, "index.html"), "utf8");
const css = fs.readFileSync(path.join(docsRoot, "static/css/app.css"), "utf8");
const app = fs.readFileSync(path.join(docsRoot, "static/js/app.js"), "utf8");
const backgroundTypes = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];

test("type-background artwork resolves from the GitHub Pages docs root and remains visible in the layout", () => {
  const rootMatch = /const BACKGROUND_ROOT = "([^\"]+)"/.exec(app);
  assert.ok(rootMatch, "the app defines one background asset root");
  assert.equal(rootMatch[1], "./static/background/types/");
  const backgroundDirectory = path.join(docsRoot, "static/background/types");
  const actualFiles = fs.readdirSync(backgroundDirectory).sort();
  for (const type of backgroundTypes) {
    const expected = type + ".svg";
    assert.ok(actualFiles.includes(expected), "case-sensitive Pages asset exists: " + expected);
  }
  assert.match(css, /body::before[^}]*background-image:\s*var\(--theme-bg-image\)/);
  assert.match(css, /body::before[^}]*background-repeat:\s*no-repeat/);
  assert.match(css, /body::before[^}]*background-size:\s*var\(--theme-bg-size\)/);
  assert.match(css, /body::before[^}]*opacity:\s*var\(--theme-bg-opacity\)/);
  assert.match(css, /body::before[^}]*pointer-events:\s*none/);
  assert.match(css, /\.shell\s*\{[^}]*z-index:\s*1/);
  assert.doesNotMatch(css, /--theme-bg-image:\s*none[^;]*;\s*body::before[^}]*background-image:\s*none/);
});

test("cup controls, collapsed ranking lists, and the optional lookup stay compact on mobile", () => {
  assert.match(html, /id="cup-tiles"/);
  assert.match(html, /id="pvpoke-browser" class="pvpoke-browser"/);
  assert.match(app, /className = "pain-cup-eligible-list"/);
  assert.match(app, /listLabel\.textContent = "Eligible Pokémon and forms/);
  assert.doesNotMatch(html, /search-segments|pvpoke-refresh|Load latest snapshot/);
  assert.match(css, /\.pain-cup-eligible-list\s*\{/);
  assert.match(css, /\.pvpoke-browser\s*\{/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /\.pain-cup-eligible-list ul\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.cup-controls-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
