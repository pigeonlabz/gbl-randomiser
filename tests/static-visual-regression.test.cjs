const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL, fileURLToPath } = require("node:url");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const docsRoot = path.join(projectRoot, "docs");
const html = fs.readFileSync(path.join(docsRoot, "index.html"), "utf8");
const css = fs.readFileSync(path.join(docsRoot, "static/css/app.css"), "utf8");
const app = fs.readFileSync(path.join(docsRoot, "static/js/app.js"), "utf8");
const backgroundTypes = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];

test("all type-background URLs resolve from local pages and the GitHub Pages subpath", () => {
  const rootMatch = /const BACKGROUND_ROOT = "([^\"]+)"/.exec(app);
  assert.ok(rootMatch, "the app defines one background asset root");
  assert.equal(rootMatch[1], "./static/background/types/");
  assert.match(app, /new URL\(BACKGROUND_ROOT \+ type \+ "\.svg", document\.baseURI\)\.href/);
  const backgroundDirectory = path.join(docsRoot, "static/background/types");
  const actualFiles = fs.readdirSync(backgroundDirectory).sort();
  const pageBases = [
    pathToFileURL(path.join(docsRoot, "index.html")),
    new URL("https://example.github.io/gbl-randomiser/")
  ];
  for (const type of backgroundTypes) {
    const expected = type + ".svg";
    assert.ok(actualFiles.includes(expected), "case-sensitive Pages asset exists: " + expected);
    const assetPath = path.join(backgroundDirectory, expected);
    assert.ok(fs.statSync(assetPath).isFile(), expected + " is an original SVG asset");
    for (const pageBase of pageBases) {
      const stylesheetBase = new URL("./static/css/app.css", pageBase);
      const generatedUrl = new URL(rootMatch[1] + expected, pageBase);
      const cssResolvedUrl = new URL(generatedUrl.href, stylesheetBase);
      assert.equal(cssResolvedUrl.href, generatedUrl.href, type + " CSS URL resolves from " + pageBase.href);
      if (pageBase.protocol === "file:") {
        assert.equal(path.resolve(fileURLToPath(cssResolvedUrl)), path.resolve(assetPath), type + " local asset path");
      } else {
        assert.equal(cssResolvedUrl.pathname, "/gbl-randomiser/static/background/types/" + expected, type + " Pages asset path");
      }
    }
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
