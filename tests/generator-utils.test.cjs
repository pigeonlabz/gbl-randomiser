const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const utils = require("../docs/static/js/generator-utils.js");
const ruleDataContext = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "../docs/static/js/rule-data.js"), "utf8"),
  ruleDataContext
);
const ruleData = ruleDataContext.window.GBL_RULE_DATA;
const speciesDataContext = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "../docs/static/js/species-data.js"), "utf8"),
  speciesDataContext
);
const speciesData = speciesDataContext.window.GBL_SPECIES_DATA;
const cupDataContext = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "../docs/static/js/cup-data.js"), "utf8"),
  cupDataContext
);
const cupData = cupDataContext.window.GBL_CUP_DATA;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

const CHILL_POOL_WEIGHTS = { core: 8, spicy: 1.4, chaos: 0 };
const SPICY_POOL_WEIGHTS = { core: 3, spicy: 6, chaos: 1.2 };
const CHAOS_POOL_WEIGHTS = { core: 2, spicy: 4, chaos: 7 };

function profileWeight(rule, poolWeights) {
  const poolWeight = poolWeights[rule.pool] || 0;
  const scarcity = Math.max(0, (rule.scarcity || 1) - 1);
  return poolWeight / (1 + scarcity * 0.22);
}

function pickFromRules(pool, selected, poolWeights, random) {
  const available = pool.filter((rule) =>
    profileWeight(rule, poolWeights) > 0 && utils.canAddRule(rule, selected)
  );
  return utils.chooseChallengeRule(available, {
    groupIdFor: (rule) => rule.weightGroup || rule.family,
    groupWeightFor: (rule) => profileWeight(rule, poolWeights),
    ruleWeightFor: (rule) => profileWeight(rule, poolWeights),
    random
  });
}

function makeRepresentativeBatch(seed, count = 100) {
  const randomRules = ruleData.rules.filter((rule) =>
    rule.pool !== "reference" && rule.family !== "meta-moves" && rule.family !== "size-xs"
  );
  const profiles = [CHILL_POOL_WEIGHTS, SPICY_POOL_WEIGHTS, CHAOS_POOL_WEIGHTS];
  const random = seededRandom(seed);
  return Array.from({ length: count }, (_, index) => {
    const poolWeights = profiles[index % profiles.length];
    const selected = [];
    for (let index = 0; index < 2; index += 1) {
      const next = pickFromRules(randomRules, selected, poolWeights, random);
      if (!next) break;
      selected.push(next);
    }
    const profile = index % profiles.length === 0 ? "chill" : index % profiles.length === 1 ? "spicy" : "chaos";
    const disqualifier = utils.chooseOptionalDisqualifier(randomRules, {
      chance: profile === "chaos" ? 0.3 : 0.18,
      groupIdFor: (rule) => rule.weightGroup || rule.family,
      groupWeightFor: (rule) => 1 / (1 + Math.max(0, (rule.scarcity || 1) - 1) * 0.22),
      ruleWeightFor: (rule) => 1 / (1 + Math.max(0, (rule.scarcity || 1) - 1) * 0.22),
      random
    });
    const disqualifiers = disqualifier ? [disqualifier] : [];
    return {
      selected,
      disqualifiers,
      search: utils.combineSearch(selected.map((rule) => rule.search).concat(disqualifiers.map((rule) => rule.search)))
    };
  });
}

test("legacy optional CP helper stays compatible and generated ranges intersect once", () => {
  const little = { label: "Little Cup", search: "cp0-500", minCp: null, maxCp: 500 };
  const great = { label: "Great League", search: "cp0-1500", minCp: null, maxCp: 1500 };
  const ultra = { label: "Ultra League", search: "cp0-2500", minCp: null, maxCp: 2500 };
  const withoutLimit = utils.leagueWithOptionalCpLimit(great, false);
  assert.equal(withoutLimit.search, "");
  assert.equal(withoutLimit.maxCp, null);
  assert.equal(great.search, "cp0-1500");

  const active = utils.leagueWithOptionalCpLimit(great, true);
  assert.equal(utils.normalizeCpConstraint(active, []).search, "cp0-1500");
  const randomCap = { family: "cp", search: "cp1000-1500", minCp: 1000, maxCp: 1500 };
  const combined = utils.normalizeCpConstraint(active, [randomCap]);
  assert.equal(combined.search, "cp1000-1500");
  assert.doesNotMatch(combined.search, /&/);
  assert.equal(utils.isAllowedForLeague(randomCap, active), true);
  assert.equal(utils.isAllowedForLeague({ family: "cp", minCp: 1500, maxCp: null }, active), false);
  assert.equal(utils.normalizeCpConstraint(little, []).search, "cp0-500");
  assert.equal(utils.isAllowedForLeague({ family: "cp", minCp: null, maxCp: 500 }, little), false);
  assert.equal(utils.normalizeCpConstraint(ultra, []).search, "cp0-2500");

  const master = { label: "Master League", search: "", minCp: null, maxCp: null };
  assert.equal(utils.leagueWithOptionalCpLimit(master, true).search, "");
});

test("legacy league CP preference helper persists across league changes", () => {
  let state = utils.leagueCpUiState("master", false, false, true);
  assert.deepEqual(state, { enabled: false, checked: false, preference: false });

  state = utils.leagueCpUiState("great", state.preference, state.checked, true);
  assert.deepEqual(state, { enabled: true, checked: false, preference: false });
  state = utils.leagueCpUiState("great", true, true, false);
  state = utils.leagueCpUiState("ultra", state.preference, state.checked, false);
  assert.deepEqual(state, { enabled: true, checked: true, preference: true });

  state = utils.leagueCpUiState("master", state.preference, state.checked, false);
  assert.deepEqual(state, { enabled: false, checked: false, preference: true });
  state = utils.leagueCpUiState("great", state.preference, state.checked, true);
  assert.deepEqual(state, { enabled: true, checked: true, preference: true });
});

test("selected league caps remain authoritative and cup caps can only lower them", () => {
  const leagues = {
    little: { label: "Little Cup", search: "cp0-500", minCp: null, maxCp: 500 },
    great: { label: "Great League", search: "cp0-1500", minCp: null, maxCp: 1500 },
    ultra: { label: "Ultra League", search: "cp0-2500", minCp: null, maxCp: 2500 },
    master: { label: "Master League", search: "", minCp: null, maxCp: null }
  };
  const aggressiveRule = { family: "cp", search: "cp2000-", minCp: 2000, maxCp: null };
  assert.equal(utils.normalizeCpConstraint(leagues.little, [aggressiveRule]).search, "cp0-500");
  assert.equal(utils.normalizeCpConstraint(leagues.great, [aggressiveRule]).search, "cp0-1500");
  assert.equal(utils.normalizeCpConstraint(leagues.ultra, [aggressiveRule]).search, "cp2000-2500");
  assert.equal(utils.normalizeCpConstraint(leagues.master, [aggressiveRule]).search, "cp2000-");

  const littleCupOnGreat = utils.leagueWithCupCap(leagues.great, 500);
  assert.equal(littleCupOnGreat.maxCp, 500);
  assert.equal(utils.normalizeCpConstraint(littleCupOnGreat, [aggressiveRule]).search, "cp0-500");
  const greatCupOnMaster = utils.leagueWithCupCap(leagues.master, 1500);
  assert.equal(utils.normalizeCpConstraint(greatCupOnMaster, [aggressiveRule]).search, "cp0-1500");
  assert.equal(utils.leagueWithCupCap(leagues.little, 1500).maxCp, 500);
});

test("type leaning uses qualitative multipliers and honors disabled scopes", () => {
  const preferred = ["water"];
  assert.equal(utils.typeWeight("water", preferred, "light", true), 2);
  assert.equal(utils.typeWeight("water", preferred, "medium", true), 4);
  assert.equal(utils.typeWeight("water", preferred, "strong", true), 8);
  assert.equal(utils.typeWeight("fire", preferred, "strong", true), 1);
  assert.equal(utils.typeWeight("water", preferred, "strong", false), 1);
  assert.equal(utils.typeWeight("water", [], "strong", true), 1);
  assert.equal(utils.typeLeaningScopeEnabled("pokemon", 0, true, true), false);
  assert.equal(utils.typeLeaningScopeEnabled("pokemon", 1, false, true), false);
  assert.equal(utils.typeLeaningScopeEnabled("move", 1, false, true), true);
});

test("type leaning makes selected types more likely without guaranteeing them", () => {
  const types = ["normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
  const random = seededRandom(701);
  const counts = new Map(types.map((type) => [type, 0]));
  for (let index = 0; index < 12000; index += 1) {
    const selected = utils.weightedPick(
      types,
      (type) => utils.typeWeight(type, ["water", "poison"], "strong", true),
      random
    );
    counts.set(selected, counts.get(selected) + 1);
  }
  const preferredCount = counts.get("water") + counts.get("poison");
  assert.ok(preferredCount > 5000 && preferredCount < 7000, "preferred types should be favored without becoming certain");
  assert.ok(counts.get("fire") > 0 && counts.get("grass") > 0, "non-preferred types remain eligible");
});

test("weighted type samples do not duplicate a selected type", () => {
  const selected = utils.weightedSample(
    ["water", "poison", "ghost", "fire"],
    4,
    (type) => utils.typeWeight(type, ["water", "poison"], "strong", true),
    seededRandom(32)
  );
  assert.equal(selected.length, 4);
  assert.equal(new Set(selected).size, selected.length);
});

test("published generator markup keeps result and controls in one form", () => {
  const html = fs.readFileSync(path.join(__dirname, "../docs/index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "../docs/static/js/app.js"), "utf8");
  const formStart = html.indexOf('<form id="filter-form" class="generator-panel">');
  const resultStart = html.indexOf('<section class="result-panel"', formStart);
  const controlsStart = html.indexOf('<div class="controls">', resultStart);
  const formEnd = html.indexOf("</form>", controlsStart);
  assert.ok(formStart >= 0 && resultStart > formStart && controlsStart > resultStart && formEnd > controlsStart);
  assert.ok(html.indexOf('id="extra-filter"', controlsStart) < formEnd);
  assert.ok(html.indexOf('class="league-selector"') < html.indexOf('id="cup-select"'));
  assert.ok(html.indexOf('id="cup-select"') < html.indexOf('id="mutator-count"'));
  const utilitiesScript = html.indexOf('<script src="./static/js/generator-utils.js">');
  const speciesScript = html.indexOf('<script src="./static/js/species-data.js">');
  const cupsScript = html.indexOf('<script src="./static/js/cup-data.js">');
  const appScript = html.indexOf('<script src="./static/js/app.js">');
  assert.ok(html.indexOf('id="type-leaning-add"') < speciesScript && speciesScript < cupsScript && cupsScript < utilitiesScript && utilitiesScript < appScript);
  assert.equal((html.match(/type="radio" name="league"/g) || []).length, 4);
  assert.equal((html.match(/type="radio" name="league"[^>]*\schecked/g) || []).length, 1);
  assert.match(html, /value="little"[\s\S]*?500 CP[\s\S]*?value="great"[\s\S]*?1,500 CP[\s\S]*?value="ultra"[\s\S]*?2,500 CP[\s\S]*?value="master" checked[\s\S]*?Unlimited CP/);
  assert.doesNotMatch(html, /id="league-select"|id="league-cp-limit"/);
  assert.match(html, /<option value="" selected>None — Open League<\/option>/);
  assert.match(html, /id="additional-rule-input"[^>]*role="combobox"/);
  assert.match(html, /id="add-additional-rule"[^>]*aria-label="Add rule"/);
  assert.match(html, /Additional Rules/);
  const ids = Array.from(html.matchAll(/\sid="([^"]+)"/g), (match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "published markup IDs stay unique");
  for (const [, id] of app.matchAll(/getElementById\("([^"]+)"\)/g)) {
    assert.ok(ids.includes(id), "app element exists in markup: " + id);
  }
  const cupChange = app.slice(app.indexOf("function onCupSelectionChanged"), app.indexOf("function onCupPrefixChanged"));
  assert.doesNotMatch(cupChange, /leagueInputs[^\n]*checked\s*=|leagueSelect\.value\s*=/, "cup changes keep the chosen league");
  const css = fs.readFileSync(path.join(__dirname, "../docs/static/css/app.css"), "utf8");
  assert.match(css, /\.league-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,/);
  assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//, "the static page does not add runtime network scripts");
  assert.match(html, /name="type-leaning-strength" value="medium" checked/);
  assert.match(html, /id="type-leaning-pokemon" type="checkbox" checked/);
  assert.match(html, /id="type-leaning-move" type="checkbox" checked/);
  assert.match(html, /<p class="site-version">v1\.0\.0<\/p>/);
});

test("search composition distributes AND across OR groups and validates empty branches", () => {
  assert.equal(
    utils.combineSearch(["fire,water", "shiny,shadow"]),
    "fire&shiny,fire&shadow,water&shiny,water&shadow"
  );
  assert.equal(utils.combineSearch(["0attack,1attack", "water"]), "0attack&water,1attack&water");
  assert.equal(
    utils.combineSearch(["fighting,psychic,dark", "!282&!570"]),
    "fighting&!282&!570,psychic&!282&!570,dark&!282&!570"
  );
  assert.equal(utils.validateSearchExpression("fire:water;grass").normalized, "fire,water,grass");
  for (const invalid of ["fire,,water", "fire&", "&water", "!", "\"unclosed"]) {
    assert.equal(utils.validateSearchExpression(invalid).valid, false, invalid);
    assert.throws(() => utils.combineSearch([invalid]), Error);
  }
  assert.equal(utils.validateSearchExpression("@King's Shield").valid, true);
  assert.equal(utils.combineSearch(["water", "water"]), "water");
});

test("bundled species and official cup snapshots cover supported presets", () => {
  assert.equal(speciesData.length, 1025);
  assert.deepEqual(Array.from(speciesData[0]), [1, "Bulbasaur"]);
  assert.deepEqual(Array.from(speciesData.at(-1)), [1025, "Pecharunt"]);
  assert.ok(speciesData.some(([id, name]) => id === 939 && name === "Bellibolt"));

  const getCup = (id) => cupData.find((cup) => cup.id === id);
  for (const cup of cupData) {
    assert.equal(utils.validateSearchExpression(cup.search).valid, true, cup.id + " cup search is valid");
    if (cup.official) assert.ok(cup.sourceUrl, cup.id + " has an official source");
  }
  assert.equal(getCup("halloween").maxCp, 1500);
  assert.equal(getCup("jungle").search, "normal,grass,electric,poison,ground,flying,bug,dark");
  assert.equal(getCup("fantasy").search, "dragon,steel,fairy");
  assert.equal(getCup("retro").search, "!dark&!steel&!fairy");
  assert.deepEqual(Array.from(getCup("willpower").speciesBans), [282, 570, 571]);
  assert.equal(getCup("element").manualRules.length, 1);
  assert.match(getCup("love").manualRules[0], /red or pink/);
  assert.equal(getCup("rock-challenge").official, false);

  const willpower = getCup("willpower");
  const banned = willpower.speciesBans.map((dex) => "!" + dex).join("&");
  assert.equal(
    utils.combineSearch([willpower.search, banned]),
    "fighting&!282&!570&!571,psychic&!282&!570&!571,dark&!282&!570&!571"
  );
});

test("random time rules use broad age bands and keep calendar-year searches out of the pool", () => {
  const ageRules = ruleData.rules.filter((rule) => rule.family === "age" && rule.pool !== "reference");
  assert.deepEqual(Array.from(ageRules, (rule) => rule.search), ["age0-30", "age30-365", "age365-", "age1000-"]);

  const yearRules = ruleData.rules.filter((rule) => rule.family === "year");
  assert.ok(yearRules.length > 0, "year display conversion remains available as reference data");
  assert.ok(yearRules.every((rule) => rule.pool === "reference"));
  assert.equal(ruleData.rules.some((rule) => /^year\d{4}$/.test(rule.search)), false);
  assert.match(ruleData.yearToAgeRange(2019, new Date("2026-10-05T00:00:00Z")), /^age\d+-\d+$/);

  const batch = makeRepresentativeBatch(20261005);
  assert.equal(batch.length, 100);
  assert.ok(batch.every((filter) => !/\byear\d{4}\b/.test(filter.search)));
});

test("Candy generation uses ranges and thresholds, with one-sided counts weighted above bounded ranges", () => {
  const candyRules = ruleData.rules.filter((rule) => rule.family === "candy" && rule.pool !== "reference");
  const candyXlRules = ruleData.rules.filter((rule) => rule.family === "candy-xl" && rule.pool !== "reference");
  assert.ok(candyRules.length > 0);
  assert.ok(candyXlRules.length > 0);
  for (const rule of candyRules.concat(candyXlRules)) {
    assert.doesNotMatch(rule.search, /^countcandy(?:xl)?\d+$/);
    assert.match(rule.search, /^countcandy(?:xl)?(?:-\d+|\d+-|\d+-\d+)$/);
  }

  const random = seededRandom(8128);
  const candyCounts = new Map();
  for (let index = 0; index < 500; index += 1) {
    const selected = utils.chooseRule(candyRules, {
      groupIdFor: (rule) => rule.family,
      groupWeightFor: (rule) => profileWeight(rule, SPICY_POOL_WEIGHTS),
      ruleWeightFor: (rule) => profileWeight(rule, SPICY_POOL_WEIGHTS),
      random
    });
    candyCounts.set(selected.search, (candyCounts.get(selected.search) || 0) + 1);
  }
  assert.ok(
    (candyCounts.get("countcandy100-") || 0) + (candyCounts.get("countcandy-100") || 0) >
      (candyCounts.get("countcandy100-200") || 0),
    "one-sided Candy thresholds should be selected more often than the bounded range"
  );

  const candyXlCounts = new Map();
  const candyXlRandom = seededRandom(9917);
  for (let index = 0; index < 500; index += 1) {
    const selected = utils.chooseRule(candyXlRules, {
      groupIdFor: (rule) => rule.family,
      groupWeightFor: (rule) => profileWeight(rule, SPICY_POOL_WEIGHTS),
      ruleWeightFor: (rule) => profileWeight(rule, SPICY_POOL_WEIGHTS),
      random: candyXlRandom
    });
    candyXlCounts.set(selected.search, (candyXlCounts.get(selected.search) || 0) + 1);
  }
  assert.ok(
    (candyXlCounts.get("countcandyxl50-") || 0) > (candyXlCounts.get("countcandyxl50-100") || 0),
    "the one-sided Candy XL threshold should be selected more often than the bounded range"
  );
});

test("individual IV rules use grouped appraisal bands and retain their AND semantics", () => {
  const expected = {
    "iv-attack": "0attack,1attack",
    "iv-defense": "3defense,4defense",
    "iv-hp": "1hp,2hp"
  };
  for (const [family, search] of Object.entries(expected)) {
    const matches = ruleData.rules.filter((rule) => rule.family === family && rule.pool !== "reference");
    assert.equal(matches.length, 1);
    assert.equal(matches[0].search, search);
    assert.match(matches[0].search, /^(?:[0-4](?:attack|defense|hp))(?:,(?:[0-4](?:attack|defense|hp)))+$/);
  }
  assert.ok(ruleData.rules.every((rule) => !/(?:^|[&,])(?:attack|defense)-\d/.test(rule.search)));
  assert.equal(utils.combineSearch([expected["iv-attack"], "water"]), "0attack&water,1attack&water");
  assert.equal(
    utils.combineSearch([expected["iv-attack"], expected["iv-defense"]]),
    "0attack&3defense,0attack&4defense,1attack&3defense,1attack&4defense"
  );
});

test("normal appraisal selection favors two-star-band OR groups", () => {
  const appraisalRules = ruleData.rules.filter((rule) => rule.family === "appraisal" && rule.pool !== "reference");
  assert.ok(appraisalRules.some((rule) => rule.search === "3*,4*"));
  assert.ok(appraisalRules.some((rule) => rule.search === "0*,1*"));
  assert.ok(appraisalRules.some((rule) => rule.search === "4*"), "restrictive perfect appraisal remains available");

  const random = seededRandom(4419);
  let paired = 0;
  for (let index = 0; index < 300; index += 1) {
    const selected = utils.chooseRule(appraisalRules, {
      groupIdFor: (rule) => rule.family,
      groupWeightFor: (rule) => profileWeight(rule, CHILL_POOL_WEIGHTS),
      ruleWeightFor: (rule) => profileWeight(rule, CHILL_POOL_WEIGHTS),
      random
    });
    if (selected.search.includes(",")) paired += 1;
  }
  assert.ok(paired > 250, "two-band appraisal groups should dominate Chill selection");
});

test("Max generation excludes parent-equivalent level-one filters and keeps invested ranges", () => {
  const randomMaxRules = ruleData.rules.filter((rule) => rule.pool !== "reference" && rule.family.startsWith("max"));
  assert.equal(randomMaxRules.some((rule) => rule.search === "maxmove1-3"), false);
  assert.equal(randomMaxRules.some((rule) => rule.search === "dynamax1-"), false);
  for (const search of ["maxmove2-3", "maxguard2-3", "maxspirit2-3"]) {
    assert.ok(randomMaxRules.some((rule) => rule.search === search), search + " should remain generatable");
  }
  assert.ok(ruleData.rules.some((rule) => rule.search === "maxmove1-3" && rule.pool === "reference"));
});

test("rare state-dependent traits are reference-only as positives and optional as negated disqualifiers", () => {
  const sensitive = ["locationbackground", "fusion", "hypertraining"];
  for (const search of sensitive) {
    const positives = ruleData.rules.filter((rule) => rule.search === search);
    assert.equal(positives.length, 1, search + " positive syntax remains in the reference catalog");
    assert.equal(positives[0].pool, "reference");
    const negative = ruleData.rules.find((rule) => rule.search === "!" + search);
    assert.ok(negative, search + " negated form should be available");
    assert.equal(negative.role, "disqualifier_only");
    assert.equal(
      utils.chooseOptionalDisqualifier([negative], { chance: 1, random: () => 0.5 }),
      negative,
      search + " negated form should be eligible when the optional pick is forced"
    );
  }
  assert.equal(utils.chooseChallengeRule(ruleData.rules, { random: () => 0 }), ruleData.rules.find((rule) => rule.role !== "disqualifier_only"));
});

test("optional disqualifiers do not consume challenge slots and are limited to one per roll", () => {
  const candidatePool = [
    { id: "main-a", family: "main-a", search: "grass" },
    { id: "main-b", family: "main-b", search: "age365-" },
    ...ruleData.rules.filter((rule) => rule.role === "disqualifier_only")
  ];
  const selected = [];
  for (let index = 0; index < 2; index += 1) {
    const next = utils.chooseChallengeRule(candidatePool.filter((rule) => utils.canAddRule(rule, selected)), { random: () => 0 });
    assert.ok(next);
    selected.push(next);
  }
  assert.equal(selected.length, 2);
  assert.ok(selected.every((rule) => rule.role !== "disqualifier_only"));

  const disqualifier = utils.chooseOptionalDisqualifier(candidatePool, { chance: 1, random: () => 0 });
  const disqualifiers = disqualifier ? [disqualifier] : [];
  assert.equal(disqualifiers.length, 1);
  assert.equal(selected.length, 2, "the disqualifier is appended separately from challenge slots");
  assert.equal(utils.chooseOptionalDisqualifier(candidatePool, { chance: 0.2, random: () => 0.99 }), null);

  const batch = makeRepresentativeBatch(20261005);
  assert.ok(batch.some((filter) => filter.disqualifiers.length === 1));
  assert.ok(batch.some((filter) => filter.disqualifiers.length === 0));
  assert.ok(batch.every((filter) => filter.disqualifiers.length <= 1));
});

test("compatibility still rejects contradictions and the seeded 100-filter batch has clean searches", () => {
  const shadow = ruleData.rules.find((rule) => rule.id === "shadow");
  const notShadow = ruleData.rules.find((rule) => rule.id === "not-shadow");
  const water = ruleData.rules.find((rule) => rule.id === "type-water");
  const noWater = { id: "type-banned-water", family: "pokemon-type", search: "!water" };
  const iv = ruleData.rules.find((rule) => rule.family === "iv-attack");
  const ivDefense = ruleData.rules.find((rule) => rule.family === "iv-defense");
  const ivCombo = ruleData.rules.find((rule) => rule.family === "iv-combo");
  assert.equal(utils.canAddRule(notShadow, [shadow]), false);
  assert.equal(utils.canAddRule(noWater, [water]), false);
  assert.equal(utils.canAddRule(ivCombo, [iv]), false);
  assert.equal(utils.canAddRule(ivDefense, [iv]), true);
  assert.equal(utils.canAddRule(ruleData.rules.find((rule) => rule.family === "type-effectiveness"), [water]), false);

  const batch = makeRepresentativeBatch(20261005);
  assert.equal(batch.length, 100);
  for (const filter of batch) {
    assert.equal(filter.selected.length, 2);
    assert.ok(filter.selected.every((rule) => rule.role !== "disqualifier_only"));
    assert.ok(filter.disqualifiers.length <= 1);
    assert.ok(filter.search);
    assert.doesNotMatch(filter.search, /\byear\d{4}\b/);
    assert.doesNotMatch(filter.search, /countcandy(?:xl)?\d+(?:&|$)/);
    assert.doesNotMatch(filter.search, /(?:^|[&,])(?:attack|defense)-\d/);
    assert.doesNotMatch(filter.search, /(?:^|&)maxmove1-3(?:&|$)/);
    for (const term of ["locationbackground", "fusion", "hypertraining"]) {
      assert.doesNotMatch(filter.search, new RegExp("(?:^|&)(?!\\!)" + term + "(?:&|$)"));
    }
  }
});
