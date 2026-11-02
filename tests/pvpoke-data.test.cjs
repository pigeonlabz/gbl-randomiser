const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const pvpoke = require("../docs/static/js/pvpoke-data.js");
const utils = require("../docs/static/js/generator-utils.js");
const { refreshPvpokeData } = require("../tools/update-pvpoke-data.mjs");

const types = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
const sourceRevision = "a".repeat(40);

function makeFixture() {
  const moves = Array.from({ length: 60 }, (_, index) => ({
    id: "MOVE_" + index,
    name: "Move " + index,
    type: types[index % types.length],
    energy: 45,
    energyGain: 8,
    power: 50
  }));
  const species = Array.from({ length: 320 }, (_, index) => ({
    id: "species_" + (index + 1),
    dex: index + 1,
    name: "Species " + (index + 1),
    types: [types[index % types.length]],
    baseStats: { attack: 120, defense: 130, stamina: 140 },
    fastMoves: ["MOVE_0"],
    chargedMoves: ["MOVE_1"],
    legacyMoves: [],
    eliteMoves: [],
    tags: [],
    released: true
  }));
  const rankings = species.map((entry, index) => ({ id: entry.id, name: entry.name, rank: index + 1, score: 40 - index / 20, rating: 300 - index }));
  const replace = (index, entry) => {
    species[index] = Object.assign({}, species[index], entry);
    rankings[index].id = species[index].id;
    rankings[index].name = species[index].name;
  };
  replace(18, { id: "unused_dex_19", dex: 950, name: "Unused Dex Form" });
  replace(250, { id: "castform", dex: 351, name: "Castform", types: ["normal"] });
  replace(251, { id: "castform_sunny", dex: 351, name: "Castform (Sunny)", types: ["fire"] });
  replace(260, { id: "rattata", dex: 19, name: "Rattata", types: ["normal"] });
  replace(261, { id: "rattata_shadow", dex: 19, name: "Rattata (Shadow)", types: ["normal"], tags: ["shadow"] });
  replace(262, { id: "rattata_alolan", dex: 19, name: "Rattata (Alolan)", types: ["dark", "normal"] });
  replace(263, { id: "rattata_alolan_shadow", dex: 19, name: "Rattata (Alolan, Shadow)", types: ["dark", "normal"], tags: ["shadow"] });
  replace(316, { id: "rare_legendary", dex: 900, name: "Rare Legendary", tags: ["legendary"] });
  replace(317, { id: "rare_mythical", dex: 901, name: "Rare Mythical", tags: ["mythical"] });
  replace(318, { id: "rare_ultrabeast", dex: 902, name: "Rare Ultra Beast", tags: ["ultrabeast"] });
  replace(319, { id: "rare_normal", dex: 903, name: "Rare Normal" });
  return {
    schemaVersion: 1,
    meta: { source: "PvPoke", sourceRevision, generatedAt: "2026-11-02T00:00:00.000Z", upstreamTimestamp: "2026-11-01 18:13:55", license: "MIT" },
    species,
    moves,
    rankings
  };
}

test("PvPoke snapshot validation and core lookups work", () => {
  const dataset = makeFixture();
  assert.equal(pvpoke.validateDataset(dataset).valid, true);
  assert.equal(pvpoke.getSpecies(dataset, "rattata_alolan").dex, 19);
  assert.equal(pvpoke.getMove(dataset, "MOVE_1").name, "Move 1");
  assert.equal(pvpoke.getRankings(dataset, 1500).length, 320);
  assert.deepEqual(Array.from(pvpoke.searchSpecies(dataset, "rank 42", 3), (species) => species.ranking.rank), [42]);
  assert.deepEqual(Array.from(pvpoke.searchSpecies(dataset, "19", 10), (species) => species.name), ["Rattata", "Rattata (Shadow)", "Rattata (Alolan)", "Rattata (Alolan, Shadow)"]);
  const invalid = Object.assign({}, dataset, { rankings: dataset.rankings.slice(0, 20) });
  assert.equal(pvpoke.validateDataset(invalid).valid, false);
});

test("a tab-pinned ranking snapshot survives a reload without contacting the source", async () => {
  const dataset = makeFixture();
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  assert.equal(pvpoke.pinDataset(dataset, storage), true);
  const loaded = await pvpoke.load("./static/data/pvpoke-v1.json", {
    storage,
    fetch: async () => { throw new Error("network should not be called for a pinned tab snapshot"); }
  });
  assert.equal(loaded.source, "tab snapshot");
  assert.equal(loaded.dataset.meta.sourceRevision, sourceRevision);
});

test("Pain Cup selects the bottom 100 and 250 rows, then removes banned categories", () => {
  const dataset = makeFixture();
  const bottom100 = pvpoke.getBottomRanked(dataset, 100);
  const bottom250 = pvpoke.getBottomRanked(dataset, 250);
  assert.equal(bottom100.candidates, 100);
  assert.equal(bottom100.rankingWindowStart, 221);
  assert.equal(bottom100.eligible, 97);
  assert.equal(bottom100.banned.length, 3);
  assert.equal(bottom100.batches.valid, true);
  assert.ok(bottom100.batches.batches.length > 1);
  assert.ok(bottom100.batches.batches.every((batch) => batch.length <= 200));
  assert.equal(bottom250.candidates, 250);
  assert.equal(bottom250.eligible, 247);
  assert.equal(bottom250.banned.length, 3);
  const generatedBranches = bottom100.batches.batches.flatMap((batch) => batch.split(","));
  assert.equal(generatedBranches.length, bottom100.mapped);
  assert.ok(generatedBranches.every((branch) => branch.startsWith("!legendary&!mythical&!ultrabeast&")));
});

test("Pain Cup distinguishes recognized forms and refuses ambiguous mappings", () => {
  const dataset = makeFixture();
  const bottom = pvpoke.getBottomRanked(dataset, 100);
  const mapped = new Map(bottom.terms.map((entry) => [entry.id, entry.term]));
  assert.equal(mapped.get("rattata"), "19&!alola&!shadow");
  assert.equal(mapped.get("rattata_shadow"), "19&shadow&!alola");
  assert.equal(mapped.get("rattata_alolan"), "19&alola&!shadow");
  assert.equal(mapped.get("rattata_alolan_shadow"), "19&alola&shadow");
  assert.ok(bottom.ambiguous.some((entry) => entry.id === "castform"));
  assert.ok(bottom.ambiguous.some((entry) => entry.id === "castform_sunny"));
  assert.ok(!mapped.has("castform") && !mapped.has("castform_sunny"));
});

test("Bug Bite and Meta Madness preserve their mandatory cup rules", () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../docs/static/js/cup-data.js"), "utf8"), context);
  const cups = context.window.GBL_CUP_DATA;
  const bugBite = cups.find((cup) => cup.id === "bug-bite");
  const metaMadness = cups.find((cup) => cup.id === "meta-madness");
  const allTypes = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
  const bugSearch = utils.validateSearchExpression(bugBite.search);
  const bugTerms = bugSearch.alternatives[0];
  assert.equal(bugSearch.valid, true);
  assert.ok(bugTerms.includes("bug") && bugTerms.includes("@bug"));
  for (const type of allTypes.filter((value) => !["bug", "poison", "rock"].includes(value))) assert.ok(bugTerms.includes("!@" + type), "Bug Bite excludes " + type + " moves");
  assert.ok(!bugTerms.includes("!@poison") && !bugTerms.includes("!@rock"));
  assert.equal(bugBite.requiredLeague, "great");
  assert.equal(bugBite.lockTypes, true);
  assert.equal(bugBite.lockMoves, true);
  assert.ok(metaMadness.search.includes("@special"));
  assert.ok(metaMadness.search.includes("!legendary") && metaMadness.search.includes("!mythical") && metaMadness.search.includes("!ultrabeast"));
  assert.ok(metaMadness.manualRules.join(" ").includes("Return and Frustration do not qualify"));
  assert.ok(metaMadness.notes.join(" ").includes("candidate filter"));
  assert.deepEqual(Array.from(metaMadness.blockedFamilies), ["rarity"]);
  for (let roll = 0; roll < 20; roll += 1) {
    const search = utils.combineSearch([bugBite.search, roll % 2 ? "shiny" : "age0-30"]);
    assert.ok(search.includes("@bug") && search.includes("!@fire"), "rerolls retain the mandatory Bug Bite cup prefix");
  }
});

test("Meta Madness candidates count Legacy and Elite TM moves, excluding Return and Frustration", () => {
  const dataset = makeFixture();
  dataset.moves.push({ id: "RETURN", name: "Return", type: "normal" }, { id: "FRUSTRATION", name: "Frustration", type: "normal" });
  dataset.species[0].legacyMoves = ["RETURN", "MOVE_3"];
  dataset.species[1].eliteMoves = ["FRUSTRATION"];
  dataset.species[2].eliteMoves = ["MOVE_4"];
  const candidates = pvpoke.getMetaMadnessCandidates(dataset);
  assert.deepEqual(Array.from(candidates, (entry) => entry.species.id), ["species_1", "species_3"]);
  assert.deepEqual(candidates[0].qualifyingMoves.map((move) => move.id), ["MOVE_3"]);
  assert.deepEqual(candidates[1].qualifyingMoves.map((move) => move.id), ["MOVE_4"]);
});

test("a refresh failure leaves the existing local dataset untouched", async () => {
  const tempDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gblr-pvpoke-test-"));
  const dataFile = path.join(tempDirectory, "pvpoke-v1.json");
  await fs.promises.writeFile(dataFile, "previous validated snapshot\n", "utf8");
  const failingFetch = async () => ({ ok: false, status: 503, text: async () => "unavailable" });
  await assert.rejects(refreshPvpokeData({ fetch: failingFetch, outputDirectory: tempDirectory }), /HTTP 503/);
  assert.equal(await fs.promises.readFile(dataFile, "utf8"), "previous validated snapshot\n");
  await fs.promises.rm(tempDirectory, { recursive: true, force: true });
});

test("static page assets remain relative and the updater is wired to the Pages folder", () => {
  const html = fs.readFileSync(path.join(__dirname, "../docs/index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../docs/static/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../docs/static/css/app.css"), "utf8");
  const workflow = fs.readFileSync(path.join(__dirname, "../.github/workflows/refresh-pvpoke-data.yml"), "utf8");
  const docsDirectory = path.join(__dirname, "../docs");
  assert.match(html, /src="\.\/static\/js\/pvpoke-data\.js"/);
  assert.match(app, /\.\/static\/data\/pvpoke-v1\.json/);
  assert.match(workflow, /node tools\/update-pvpoke-data\.mjs/);
  assert.match(workflow, /git push/);
  const localHtmlPaths = Array.from(html.matchAll(/(?:src|href)="\.\/([^"]+)"/g), (match) => match[1]);
  assert.ok(localHtmlPaths.length >= 6);
  for (const relativePath of localHtmlPaths) assert.equal(fs.existsSync(path.join(docsDirectory, relativePath)), true, relativePath + " resolves under docs/");
  for (const root of ["./static/icons/types/", "./static/icons/rules/", "./static/background/types/"]) {
    assert.match(app, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(fs.existsSync(path.join(docsDirectory, root)), true, root + " exists in the Pages build");
  }
  assert.match(css, /@media \(max-width:\s*640px\)/);
});
