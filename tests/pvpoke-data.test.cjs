const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const pvpoke = require("../docs/static/js/pvpoke-data.js");
const utils = require("../docs/static/js/generator-utils.js");
const { buildSnapshot, refreshPvpokeData } = require("../tools/update-pvpoke-data.mjs");

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
  const makeRankings = (entries) => entries.map((entry, index) => ({
    id: entry.id,
    name: entry.name,
    rank: index + 1,
    score: 40 - index / 20,
    rating: 300 - index
  }));
  return {
    schemaVersion: 2,
    meta: { source: "PvPoke", sourceRevision, generatedAt: "2026-11-02T00:00:00.000Z", upstreamTimestamp: "2026-11-01 18:13:55", license: "MIT" },
    species,
    moves,
    rankingsByLeague: {
      "1500": makeRankings(species),
      "2500": makeRankings(species.slice(20, 220).concat(species.slice(300, 320), species.slice(220, 300), species.slice(0, 20))),
      "10000": makeRankings(species.slice(0, 100).concat(species.slice(200, 320), species.slice(100, 200)))
    }
  };
}

function makeUpstreamFixture() {
  const moves = Array.from({ length: 100 }, (_, index) => ({
    moveId: "MOVE_" + index,
    name: "Move " + index,
    type: types[index % types.length],
    energy: 40,
    energyGain: 8,
    power: 50
  }));
  const pokemon = Array.from({ length: 850 }, (_, index) => ({
    speciesId: "species_" + (index + 1),
    speciesName: "Species " + (index + 1),
    dex: index + 1,
    types: ["normal"],
    baseStats: { atk: 100, def: 100, hp: 100 },
    fastMoves: ["MOVE_0"],
    chargedMoves: ["MOVE_1"],
    legacyMoves: [],
    eliteMoves: [],
    tags: [],
    released: true
  }));
  const rankingsByLeague = Object.fromEntries([[1500, 0], [2500, 30], [10000, 60]].map(([cp, offset]) => {
    const ordered = pokemon.slice(offset).concat(pokemon.slice(0, offset));
    return [String(cp), ordered.slice(0, 300).map((species, index) => ({
      speciesId: species.speciesId,
      speciesName: species.speciesName,
      score: 10 - index / 100,
      rating: 500 - index
    }))];
  }));
  return { gamemaster: { pokemon, moves, timestamp: "fixture timestamp" }, rankingsByLeague };
}

test("PvPoke snapshot validation and core lookups work", () => {
  const dataset = makeFixture();
  const validation = pvpoke.validateDataset(dataset);
  assert.equal(validation.valid, true, validation.errors.join(" "));
  assert.equal(pvpoke.getSpecies(dataset, "rattata_alolan").dex, 19);
  assert.equal(pvpoke.getMove(dataset, "MOVE_1").name, "Move 1");
  assert.equal(pvpoke.getRankings(dataset, 1500).length, 320);
  assert.equal(pvpoke.getRankings(dataset, 2500).length, 320);
  assert.equal(pvpoke.getRankings(dataset, 10000).length, 320);
  assert.deepEqual(Array.from(pvpoke.searchSpecies(dataset, "rank 42", 3), (species) => species.ranking.rank), [42]);
  assert.deepEqual(Array.from(pvpoke.searchSpecies(dataset, "19", 10), (species) => species.name), ["Rattata", "Rattata (Shadow)", "Rattata (Alolan)", "Rattata (Alolan, Shadow)"]);
  const invalid = Object.assign({}, dataset, { rankingsByLeague: Object.assign({}, dataset.rankingsByLeague, { "2500": dataset.rankingsByLeague["2500"].slice(0, 20) }) });
  assert.equal(pvpoke.validateDataset(invalid).valid, false);
  const greatOnly = Object.assign({}, dataset, { rankingsByLeague: { "1500": dataset.rankingsByLeague["1500"] } });
  const unavailableUniversalPool = pvpoke.getBottomRanked(greatOnly, 250);
  assert.equal(unavailableUniversalPool.valid, false);
  assert.equal(unavailableUniversalPool.candidateCount, 0);
  assert.match(unavailableUniversalPool.error, /requires Great, Ultra, and Master rankings/);
});

test("the browser loader fetches only the bundled snapshot and validates it", async () => {
  const dataset = makeFixture();
  let requestedUrl = "";
  const loaded = await pvpoke.load(undefined, {
    fetch: async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => dataset };
    }
  });
  assert.equal(requestedUrl, "./static/data/pvpoke-v2.json");
  assert.equal(loaded.source, "local snapshot");
  assert.equal(loaded.dataset.meta.sourceRevision, sourceRevision);
});

test("Pain Cup unions deterministic bottom-100/250 windows from all three league rankings", () => {
  const dataset = makeFixture();
  const bottom100 = pvpoke.getBottomRanked(dataset, 100);
  const bottom250 = pvpoke.getBottomRanked(dataset, 250);
  assert.equal(bottom100.candidates, 300);
  assert.equal(bottom100.uniqueCandidates, 220);
  assert.deepEqual(Array.from(bottom100.rankingWindows, (window) => [window.leagueCp, window.startRank, window.endRank]), [
    [1500, 221, 320], [2500, 221, 320], [10000, 221, 320]
  ]);
  assert.equal(bottom100.eligible, 217);
  assert.equal(bottom100.banned.length, 3);
  assert.equal(bottom250.candidates, 750);
  assert.equal(bottom250.uniqueCandidates, 270);
  assert.equal(bottom250.eligible, 267);
  assert.equal(bottom250.banned.length, 3);
  assert.equal(bottom100.eligiblePokemon.find((entry) => entry.id === "rare_normal").rankingPositions["1500"], 320);
});

test("Pain Cup lists regional/Shadow forms while deduplicating their Pokédex search numbers", () => {
  const dataset = makeFixture();
  const bottom = pvpoke.getBottomRanked(dataset, 100);
  const rattata = bottom.eligiblePokemon.filter((entry) => entry.dex === 19);
  const castform = bottom.eligiblePokemon.filter((entry) => entry.dex === 351);
  assert.deepEqual(Array.from(rattata, (entry) => entry.id), ["rattata", "rattata_alolan", "rattata_alolan_shadow", "rattata_shadow"]);
  assert.deepEqual(Array.from(castform, (entry) => entry.id), ["castform", "castform_sunny"]);
  assert.deepEqual(Object.fromEntries(rattata.map((entry) => [entry.id, entry.form])), {
    rattata: "Standard form",
    rattata_alolan: "Alolan",
    rattata_alolan_shadow: "Alolan, Shadow",
    rattata_shadow: "Shadow"
  });
  assert.equal(castform[1].form, "Sunny");
  assert.equal(bottom.dexes.filter((dex) => dex === "19").length, 1);
  assert.equal(bottom.dexes.filter((dex) => dex === "351").length, 1);
  assert.equal(bottom.approximate, true);
});

test("Pain Cup handles empty rankings and duplicate form entries safely", () => {
  const empty = pvpoke.getBottomRanked({ species: [], moves: [], rankingsByLeague: { "1500": [], "2500": [], "10000": [] } }, 100);
  assert.equal(empty.candidates, 0);
  assert.deepEqual(empty.dexes, []);
  assert.deepEqual(empty.eligiblePokemon, []);
  assert.equal(pvpoke.buildPainCupSearch(empty).valid, false);
  const duplicated = pvpoke.getBottomRanked(makeFixture(), 100);
  assert.equal(new Set(duplicated.dexes).size, duplicated.dexes.length);
});

test("compact Pain Cup search groups Dex alternatives before shared AND constraints", () => {
  const selection = { dexes: ["2", "1", "2"] };
  const query = pvpoke.buildPainCupSearch(selection, "cp-1500");
  assert.equal(query.valid, true);
  assert.equal(query.search, "1,2&cp-1500&!legendary&!mythical&!ultrabeast");
  for (const shared of ["cp-1500", "!legendary", "!mythical", "!ultrabeast"]) {
    assert.equal(query.search.split(shared).length - 1, 1, shared + " occurs once");
  }
  const matches = (pokemon) => query.groups.every((group) => group.split(",").some((raw) => {
    const term = raw.trim();
    if (term === "cp-1500") return pokemon.cp <= 1500;
    if (term.startsWith("!")) return !pokemon.categories.includes(term.slice(1));
    return Number(term) === pokemon.dex;
  }));
  assert.equal(matches({ dex: 1, cp: 1500, categories: [] }), true);
  assert.equal(matches({ dex: 2, cp: 1500, categories: [] }), true);
  assert.equal(matches({ dex: 3, cp: 1200, categories: [] }), false);
  assert.equal(matches({ dex: 1, cp: 1400, categories: ["legendary"] }), false);
  assert.equal(matches({ dex: 2, cp: 1400, categories: ["mythical"] }), false);
  assert.equal(matches({ dex: 1, cp: 1400, categories: ["ultrabeast"] }), false);
  const masterQuery = pvpoke.buildPainCupSearch(selection, "");
  assert.equal(masterQuery.search, "1,2&!legendary&!mythical&!ultrabeast");
  assert.ok(!masterQuery.search.includes("cp-1500"), "an unbounded selected league adds no Great League CP cap");
});

test("Pain Cup keeps one shared pool when switching among Little, Great, Ultra, and Master", () => {
  const dataset = makeFixture();
  const pool = pvpoke.getBottomRanked(dataset, 100);
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../docs/static/js/rule-data.js"), "utf8"), context);
  const leagues = context.window.GBL_RULE_DATA.leagues;
  const cupContext = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../docs/static/js/cup-data.js"), "utf8"), cupContext);
  const painCup = cupContext.window.GBL_CUP_DATA.find((cup) => cup.id === "pain-cup");
  assert.equal(painCup.requiredLeague, undefined);
  assert.equal(painCup.suggestedLeague, undefined);
  const queries = ["little", "great", "ultra", "master"].map((leagueId) =>
    pvpoke.buildPainCupSearch(pool, utils.normalizeCpConstraint(leagues[leagueId], []).search).search
  );
  const eligibilityTerms = queries.map((query) => query.slice(0, query.indexOf("&") < 0 ? undefined : query.indexOf("&")));
  assert.equal(new Set(eligibilityTerms).size, 1, "changing the selected league never changes the unioned pool");
  assert.ok(queries[0].includes("&cp0-500&"));
  assert.ok(queries[1].includes("&cp0-1500&"));
  assert.ok(queries[2].includes("&cp0-2500&"));
  assert.ok(!queries[3].includes("cp0-500") && !queries[3].includes("cp0-1500") && !queries[3].includes("cp0-2500"));
  const app = fs.readFileSync(path.join(__dirname, "../docs/static/js/app.js"), "utf8");
  assert.match(app, /const cpSearch = constraints\.find\([^\n]+\) \|\| ""/);
  assert.match(app, /leagueInputs\.forEach\(\(input\) => input\.addEventListener\("change", \(\) => \{\s*updateCupFormatInfo\(\);\s*markConfigPending\(\);/);
});

test("bundled Pain Cup output is one compact approximate candidate search", () => {
  const dataset = JSON.parse(fs.readFileSync(path.join(__dirname, "../docs/static/data/pvpoke-v2.json"), "utf8"));
  const bottom250 = pvpoke.getBottomRanked(dataset, 250);
  const search = pvpoke.buildPainCupSearch(bottom250, "cp0-1500");
  assert.equal(search.valid, true);
  assert.ok(search.search.length < 1500, "deduplicated universal candidate search remains practical as one string");
  assert.equal(search.search.split("&cp0-1500").length - 1, 1);
  assert.equal(search.search.split("!legendary").length - 1, 1);
  assert.equal(search.search.split("!mythical").length - 1, 1);
  assert.equal(search.search.split("!ultrabeast").length - 1, 1);
  assert.ok(!/\bBatch\b/.test(search.search));
});

test("manual snapshot import builds a validated multi-league dataset from one pinned revision", async () => {
  const upstream = makeUpstreamFixture();
  const snapshot = buildSnapshot(upstream.gamemaster, upstream.rankingsByLeague, sourceRevision, new Date("2026-11-02T00:00:00.000Z"));
  assert.equal(snapshot.schemaVersion, 2);
  assert.deepEqual(Object.keys(snapshot.rankingsByLeague), ["1500", "2500", "10000"]);
  assert.equal(snapshot.meta.counts.rankingsByLeague["1500"], 300);
  assert.equal(snapshot.meta.counts.rankingsByLeague["2500"], 300);
  assert.equal(snapshot.meta.counts.rankingsByLeague["10000"], 300);
  assert.equal(pvpoke.validateDataset(snapshot).valid, true);

  const tempDirectory = await fs.promises.mkdtemp(path.join(__dirname, ".pvpoke-import-test-"));
  const requests = [];
  const fakeFetch = async (url) => {
    requests.push(url);
    if (url.endsWith("gamemaster.min.json")) return { ok: true, text: async () => JSON.stringify(upstream.gamemaster) };
    if (url.endsWith("rankings-1500.json")) return { ok: true, text: async () => JSON.stringify(upstream.rankingsByLeague["1500"]) };
    if (url.endsWith("rankings-2500.json")) return { ok: true, text: async () => JSON.stringify(upstream.rankingsByLeague["2500"]) };
    if (url.endsWith("rankings-10000.json")) return { ok: true, text: async () => JSON.stringify(upstream.rankingsByLeague["10000"]) };
    return { ok: true, text: async () => "MIT License\n\nPermission is hereby granted to use, copy, modify, and distribute this software." };
  };
  try {
    const imported = await refreshPvpokeData({ fetch: fakeFetch, sourceRevision, outputDirectory: tempDirectory, now: new Date("2026-11-02T00:00:00.000Z") });
    const written = JSON.parse(await fs.promises.readFile(path.join(tempDirectory, "pvpoke-v2.json"), "utf8"));
    assert.equal(pvpoke.validateDataset(written).valid, true);
    assert.equal(imported.files.some((file) => file.endsWith("pvpoke-v2.json")), true);
    assert.equal(requests.length, 5);
    for (const filename of ["rankings-1500.json", "rankings-2500.json", "rankings-10000.json"]) {
      assert.ok(requests.some((url) => url.includes("/" + sourceRevision + "/") && url.endsWith(filename)), filename + " is pinned and imported");
    }
  } finally {
    await fs.promises.rm(tempDirectory, { recursive: true, force: true });
  }
});

test("Bug Bite and Meta Madness preserve their mandatory cup rules", () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../docs/static/js/cup-data.js"), "utf8"), context);
  const cups = context.window.GBL_CUP_DATA;
  const bugBite = cups.find((cup) => cup.id === "bug-bite");
  const metaMadness = cups.find((cup) => cup.id === "meta-madness");
  assert.equal(bugBite.search, "bug&@bug,@poison,@rock");
  assert.equal(utils.validateSearchExpression(bugBite.search).valid, true);
  assert.equal(utils.combineSearch([bugBite.search]), "bug&@bug,@poison,@rock");
  assert.equal(bugBite.origin, "homegrown");
  assert.ok(bugBite.manualRules.join(" ").includes("Bug-, Poison-, or Rock-type attack"));
  assert.ok(bugBite.notes.join(" ").includes("do not exclude other equipped move types"));
  assert.equal(bugBite.requiredLeague, undefined, "Bug Bite does not pin a league");
  assert.equal(bugBite.suggestedLeague, undefined, "Bug Bite does not imply a preferred league");
  assert.equal(metaMadness.requiredLeague, undefined, "Meta Madness does not pin a league");
  assert.equal(metaMadness.suggestedLeague, undefined, "Meta Madness does not imply a preferred league");
  assert.equal(bugBite.lockTypes, true);
  assert.equal(bugBite.lockMoves, true);
  assert.ok(metaMadness.search.includes("@special"));
  assert.ok(metaMadness.search.includes("!legendary") && metaMadness.search.includes("!mythical") && metaMadness.search.includes("!ultrabeast"));
  assert.ok(metaMadness.manualRules.join(" ").includes("Return and Frustration alone do not qualify"));
  assert.ok(metaMadness.notes.join(" ").includes("candidate filter"));
  assert.deepEqual(Array.from(metaMadness.blockedFamilies), ["rarity"]);
  for (let roll = 0; roll < 20; roll += 1) {
    const challenge = roll % 2 ? "shiny" : "age0-30";
    const search = utils.combineSearch([bugBite.search, challenge]);
    assert.equal(search, "bug&@bug,@poison,@rock&" + challenge, "rerolls preserve mandatory Bug typing and OR move alternatives");
  }
});

test("homegrown cup rules combine with each league CP limit without changing cup selection", () => {
  const cupContext = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../docs/static/js/cup-data.js"), "utf8"), cupContext);
  const cups = cupContext.window.GBL_CUP_DATA.filter((cup) => !cup.official);
  assert.deepEqual(Array.from(cups, (cup) => cup.id), ["rock-challenge", "bug-bite", "meta-madness", "pain-cup", "explorer-cup", "earth-wind-fire", "haunted-machinery", "toxic-depths", "frostbite-cup"]);
  assert.ok(cups.every((cup) => cup.origin === "homegrown"), "all Pigeon Labs original cups are marked homegrown");
  const homegrownSearches = {
    "explorer-cup": "fighting,water,bug,poison,steel&@fighting,@water,@bug,@poison,@steel&!fire&!@fire",
    "earth-wind-fire": "Ground,Flying,Fire&@ground,@flying,@fire&!legendary&!ultrabeast",
    "haunted-machinery": "ghost,steel,electric,ground&@ghost,@steel,@electric,@ground",
    "toxic-depths": "water,poison,psychic,electric&@water,@poison,@psychic,@electric",
    "frostbite-cup": "ice,fighting,ghost,poison&@ice,@fighting,@ghost,@poison&!legendary&!ultrabeast"
  };
  for (const [id, search] of Object.entries(homegrownSearches)) assert.equal(cups.find((cup) => cup.id === id).search, search, id + " preserves its exact filter operators and casing");
  for (const cup of cups) assert.equal(cup.requiredLeague, undefined, cup.id + " does not pin a league");
  const ruleContext = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../docs/static/js/rule-data.js"), "utf8"), ruleContext);
  const leagues = ruleContext.window.GBL_RULE_DATA.leagues;
  const app = fs.readFileSync(path.join(__dirname, "../docs/static/js/app.js"), "utf8");
  const leagueChangeStart = app.indexOf('leagueInputs.forEach((input) => input.addEventListener("change"');
  const leagueChange = app.slice(leagueChangeStart, app.indexOf("mutatorCount.addEventListener", leagueChangeStart));
  assert.match(leagueChange, /updateCupFormatInfo\(\);\s*markConfigPending\(\);/);
  assert.doesNotMatch(leagueChange, /cupSelect\.value\s*=|currentCup\s*=/, "league changes leave the selected cup untouched");

  const pool = pvpoke.getBottomRanked(JSON.parse(fs.readFileSync(path.join(__dirname, "../docs/static/data/pvpoke-v2.json"), "utf8")), 250);
  for (const cup of cups) {
    for (const leagueId of ["little", "great", "ultra", "master"]) {
      const cpSearch = utils.normalizeCpConstraint(leagues[leagueId], []).search;
      const result = cup.id === "pain-cup"
        ? pvpoke.buildPainCupSearch(pool, cpSearch)
        : { valid: true, search: utils.combineSearch([cup.search, cpSearch]) };
      assert.equal(result.valid, true, cup.id + " in " + leagueId);
      if (cup.id === "pain-cup") {
        assert.ok(result.search.includes(pool.candidateSearch), "Pain Cup candidate pool remains in " + leagueId);
      } else {
        assert.equal(result.search, utils.combineSearch([cup.search, cpSearch]), cup.id + " eligibility remains in " + leagueId);
      }
      if (cpSearch) assert.ok(result.search.includes(cpSearch), cup.id + " receives " + leagueId + " CP limit");
      else assert.doesNotMatch(result.search, /(?:^|[&,])cp(?:\d|-)/i, cup.id + " has no CP limit in Master League");
      for (const otherLeague of ["little", "great", "ultra", "master"].filter((id) => id !== leagueId)) {
        const otherCp = utils.normalizeCpConstraint(leagues[otherLeague], []).search;
        if (otherCp) assert.ok(!result.search.includes(otherCp), cup.id + " does not include the " + otherLeague + " CP limit");
      }
    }
  }
  assert.equal(new Set(cups.map((cup) => cup.id)).size, 9, "all homegrown presets are independently selectable across leagues");
  assert.doesNotMatch(app, /forcedLeagueId|cup\.requiredLeague/, "cup metadata cannot reset or lock the selected league");
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
  assert.ok(candidates[0].species.legacyMoves.includes("RETURN"), "a qualifying move remains valid alongside Return");
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../docs/static/js/cup-data.js"), "utf8"), context);
  const metaMadness = context.window.GBL_CUP_DATA.find((cup) => cup.id === "meta-madness");
  assert.ok(!/!@return|!@frustration/i.test(metaMadness.search));
});

test("a refresh failure leaves the existing local dataset untouched", async () => {
  const tempDirectory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gblr-pvpoke-test-"));
  const dataFile = path.join(tempDirectory, "pvpoke-v2.json");
  await fs.promises.writeFile(dataFile, "previous validated snapshot\n", "utf8");
  const failingFetch = async () => ({ ok: false, status: 503, text: async () => "unavailable" });
  await assert.rejects(refreshPvpokeData({ fetch: failingFetch, sourceRevision, outputDirectory: tempDirectory }), /HTTP 503/);
  assert.equal(await fs.promises.readFile(dataFile, "utf8"), "previous validated snapshot\n");
  await fs.promises.rm(tempDirectory, { recursive: true, force: true });
});

test("static page assets stay local and the updater requires a manually pinned revision", () => {
  const html = fs.readFileSync(path.join(__dirname, "../docs/index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../docs/static/js/app.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../docs/static/css/app.css"), "utf8");
  const updater = fs.readFileSync(path.join(__dirname, "../tools/update-pvpoke-data.mjs"), "utf8");
  const docsReadme = fs.readFileSync(path.join(__dirname, "../docs/README.md"), "utf8");
  const docsDirectory = path.join(__dirname, "../docs");
  assert.match(html, /src="\.\/static\/js\/pvpoke-data\.js"/);
  assert.match(app, /\.\/static\/data\/pvpoke-v2\.json/);
  assert.doesNotMatch(app, /raw\.githubusercontent\.com|api\.github\.com|pvpoke\.com\/data/i);
  assert.doesNotMatch(updater, /commits\/master|schedule:/);
  assert.match(updater, /Pass a full PvPoke Git commit SHA/);
  assert.match(docsReadme, /manual import/i);
  assert.equal(fs.existsSync(path.join(__dirname, "../.github/workflows/refresh-pvpoke-data.yml")), false);
  const localHtmlPaths = Array.from(html.matchAll(/(?:src|href)="\.\/([^"]+)"/g), (match) => match[1]);
  assert.ok(localHtmlPaths.length >= 6);
  for (const relativePath of localHtmlPaths) assert.equal(fs.existsSync(path.join(docsDirectory, relativePath)), true, relativePath + " resolves under docs/");
  assert.equal(fs.existsSync(path.join(docsDirectory, "static/data/pvpoke-v1.json")), true, "the earlier snapshot remains preserved");
  assert.equal(fs.existsSync(path.join(docsDirectory, "static/data/pvpoke-v2.json")), true, "the universal rankings snapshot is bundled locally");
  for (const root of ["./static/icons/types/", "./static/icons/rules/", "./static/background/types/"]) {
    assert.match(app, new RegExp(root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(fs.existsSync(path.join(docsDirectory, root)), true, root + " exists in the Pages build");
  }
  assert.match(css, /@media \(max-width:\s*640px\)/);
});
