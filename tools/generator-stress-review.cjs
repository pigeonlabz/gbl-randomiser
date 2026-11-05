#!/usr/bin/env node
"use strict";

// Reproducible, source-driven audit harness for the deployed static generator.
// It uses the production rule data and generator utilities without importing or
// mutating the browser UI. Heuristic game-mechanics judgments are explicitly
// separated from contradictions that can be proved from the documented model.

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");
const { performance } = require("node:perf_hooks");
const { execFileSync } = require("node:child_process");
const utils = require("../docs/static/js/generator-utils.js");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUTPUT = path.join(ROOT, "reviews", "stress-2026-11-05");
const LEAGUE_IDS = ["great", "ultra", "master"];
const PROFILES = ["chill", "spicy", "chaos"];
const BASE_SEED = 20261105;
const REVIEW_DATE = new Date("2026-11-05T12:00:00Z");
const FINGERPRINT_FILES = [
  "docs/static/js/generator-utils.js",
  "docs/static/js/app.js",
  "docs/static/js/rule-data.js",
  "docs/static/js/cup-data.js",
  "docs/static/js/pvpoke-data.js",
  "docs/static/data/pvpoke-v2.json",
  "tools/generator-stress-review.cjs"
];

function sourceFingerprint() {
  const hash = crypto.createHash("sha256");
  FINGERPRINT_FILES.forEach((file) => {
    hash.update(file, "utf8");
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(ROOT, file)));
    hash.update("\0");
  });
  return hash.digest("hex");
}

function loadWindowFile(file, globalName) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), "utf8"), context, { filename: file });
  return context.window[globalName];
}

const DATA = loadWindowFile("docs/static/js/rule-data.js", "GBL_RULE_DATA");
const CUPS = loadWindowFile("docs/static/js/cup-data.js", "GBL_CUP_DATA");
const PVPOKE = require("../docs/static/js/pvpoke-data.js");
const PVPOKE_SNAPSHOT = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/static/data/pvpoke-v2.json"), "utf8"));
const APP_SOURCE = fs.readFileSync(path.join(ROOT, "docs/static/js/app.js"), "utf8");
const ADVANCED_FAMILIES = readLiteralDeclaration(APP_SOURCE, "advancedFamilies", "[", "]");
const PROFILE_DEFAULTS = readLiteralDeclaration(APP_SOURCE, "profileDefaults", "{", "}");
const PROFILE_POOL_WEIGHTS = readLiteralDeclaration(APP_SOURCE, "profilePoolWeights", "{", "}");
const SETTING_FOR_RULE_FAMILY = new Map(
  ADVANCED_FAMILIES.flatMap((definition) => definition.ruleFamilies.map((family) => [family, definition.id]))
);
const ADDITIONAL_FAMILY_IDS = new Set(ADVANCED_FAMILIES.filter((definition) => !definition.primary).map((definition) => definition.id));

function readLiteralDeclaration(source, name, open, close) {
  const marker = `const ${name} = `;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Could not find ${name} in deployed app.js.`);
  const literalStart = start + marker.length;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = literalStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "\"" || character === "'") { quote = character; continue; }
    if (character === open) depth += 1;
    else if (character === close && --depth === 0) {
      return vm.runInNewContext(`(${source.slice(literalStart, index + 1)})`);
    }
  }
  throw new Error(`Could not parse ${name} from deployed app.js.`);
}

function seededRandom(seed) {
  let value = Number(seed) >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function uniqueClassifications(values) {
  return [...new Set(values)];
}

function randomInteger(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

function sampleTerms(random, values, minCount, maxCount) {
  const shuffled = values.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(random, 0, index);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, randomInteger(random, minCount, maxCount)).sort();
}

function makeExclusion(random, id, family, values, prefix) {
  const selected = sampleTerms(random, values, 1, Math.min(3, values.length));
  const names = selected.map((value) => value[0].toUpperCase() + value.slice(1));
  const label = family === "region" ? `No Pokémon from ${names.join(" or ")}`
    : family === "move-type" ? `No ${names.join(" or ")} type moves`
      : `No ${names.join(" or ")} type Pokémon`;
  const explain = family === "region" ? `Exclude Pokémon from ${names.join(" or ")}.`
    : family === "move-type" ? `Exclude Pokémon that know ${names.join(" or ")} type moves.`
      : `Exclude Pokémon with ${names.join(" or ")} typing.`;
  return {
    id: `${id}-${selected.join("-")}`, family,
    settingFamily: SETTING_FOR_RULE_FAMILY.get(family), pool: "core", scarcity: 1,
    label, explain, search: selected.map((value) => `!${prefix}${value}`).join("&"),
    meta: family === "pokemon-type" ? { types: selected }
      : family === "move-type" ? { move_types: selected } : undefined
  };
}

function displayRule(rule) {
  const display = { ...rule, settingFamily: SETTING_FOR_RULE_FAMILY.get(rule.family) || "collection", search: String(rule.search || "") };
  const yearKind = rule.meta && rule.meta.calendarYear;
  if (yearKind) {
    const year = yearKind === "current" ? REVIEW_DATE.getFullYear() : REVIEW_DATE.getFullYear() - 1;
    display.search = DATA.yearToAgeRange(year, REVIEW_DATE);
    display.label = `Caught in ${year}`;
    display.explain = `Caught in ${year}.`;
  }
  return display;
}

function makeRulePool(random, config) {
  const hasBuddyBounds = config.buddyBounds != null;
  const hasMegaBounds = config.megaBounds != null;
  const hasCustomTimeBounds = config.timeBounds != null;
  const sizeSearch = utils.sizeSearchForSelection(Boolean(config.sizeXL), config.sizeXXL !== false);
  const sizeBase = DATA.rules.find((rule) => rule.id === "size-xl-group");
  const sourceRules = DATA.rules.filter((rule) => rule.pool !== "reference" && rule.family !== "size-xl" &&
    !(hasCustomTimeBounds && rule.family === "age") &&
    !(hasBuddyBounds && rule.family === "buddy") &&
    !(hasMegaBounds && (rule.family === "mega" || rule.family === "mega-level"))
  ).map(displayRule);
  if (sizeSearch && sizeBase) sourceRules.push(displayRule({ ...sizeBase,
    id: "size-xl-selection",
    label: config.sizeXL && config.sizeXXL !== false ? "XL or XXL size" : config.sizeXXL === false ? "XL size" : "XXL size",
    search: sizeSearch
  }));
  if (hasCustomTimeBounds) sourceRules.push({
    id: `age-generated-${config.timeBounds.min}-${config.timeBounds.max}`, family: "age", settingFamily: "time",
    pool: "core", scarcity: 1, label: "Configured catch age range", explain: "Configured catch age range.",
    search: config.timeBounds.min === config.timeBounds.max ? `age${config.timeBounds.min}` : `age${config.timeBounds.min}-${config.timeBounds.max}`
  });
  if (hasBuddyBounds) {
    for (let min = config.buddyBounds.min; min <= config.buddyBounds.max; min += 1) {
      for (let max = min; max <= config.buddyBounds.max; max += 1) sourceRules.push({
        id: `buddy-range-${min}-${max}`, family: "buddy", settingFamily: "buddy", pool: "spicy",
        scarcity: max - min >= 3 ? 1 : 2,
        label: min === max ? `Buddy level ${min}` : `Buddy levels ${min}–${max}`,
        explain: `Pokémon with Buddy progress from level ${min} through ${max}.`, search: `buddy${min}-${max}`
      });
    }
  }
  if (hasMegaBounds) {
    const levels = [
      { level: 1, label: "Base", pool: "spicy", scarcity: 2 },
      { level: 2, label: "High", pool: "spicy", scarcity: 3 },
      { level: 3, label: "Max", pool: "spicy", scarcity: 3 },
      { level: 4, label: "Super Max", pool: "chaos", scarcity: 4 }
    ];
    levels.filter((entry) => entry.level >= config.megaBounds.min && entry.level <= config.megaBounds.max).forEach((entry) => {
      sourceRules.push({ id: `mega-level-bounded-${entry.level}`, family: "mega-level", settingFamily: "mega",
        pool: entry.pool, scarcity: entry.scarcity, label: `${entry.label} Mega Level`, explain: `Pokémon at ${entry.label} Mega Level.`, search: `mega${entry.level}` });
    });
  }
  if (hasCustomTimeBounds) {
    // The UI validates and normalizes date bounds. Age interval arithmetic is
    // retained in sample rows as a configured range; arbitrary dates are not
    // enumerated in the exhaustive rule matrix.
  }
  sourceRules.push(makeExclusion(random, "type-banned", "pokemon-type", DATA.types, ""));
  sourceRules.push(makeExclusion(random, "region-banned", "region", DATA.regions, ""));
  sourceRules.push(makeExclusion(random, "move-type-banned", "move-type", DATA.types, "@"));
  return sourceRules;
}

function ruleProfileWeight(rule, profile, settings) {
  const poolWeight = PROFILE_POOL_WEIGHTS[profile][rule.pool] || 0;
  const setting = settings[rule.settingFamily];
  const defaultWeight = PROFILE_DEFAULTS[profile][rule.settingFamily] == null ? 1 : PROFILE_DEFAULTS[profile][rule.settingFamily];
  const optedInPoolWeight = poolWeight === 0 && setting && setting.weight !== defaultWeight ? 0.35 : poolWeight;
  const familyWeight = setting ? (defaultWeight === 0 ? setting.weight : setting.weight / defaultWeight) : 0;
  const scarcity = Math.max(0, (rule.scarcity || 1) - 1);
  return familyWeight * optedInPoolWeight / (1 + scarcity * 0.22);
}

function isCupBlocked(rule, config) {
  if (!config.cup) return false;
  if (Array.isArray(config.cup.blockedFamilies) && config.cup.blockedFamilies.includes(rule.settingFamily)) return true;
  if (rule.settingFamily === "pokemon-type" && config.cup.lockTypes) return true;
  if (rule.settingFamily === "move-typing" && config.cup.lockMoves) return true;
  return false;
}

function chooseSelection(pool, profile, league, config, random, count = 2) {
  const settings = Object.fromEntries(Object.entries(PROFILE_DEFAULTS[profile]).map(([id, weight]) => [id, { enabled: true, weight }]));
  const selected = [];
  for (let index = 0; index < count; index += 1) {
    const available = pool.filter((rule) => {
      const setting = settings[rule.settingFamily];
      if (!setting || !setting.enabled || setting.weight <= 0) return false;
      if (!config.additionalFamiliesEnabled && ADDITIONAL_FAMILY_IDS.has(rule.settingFamily)) return false;
      if (isCupBlocked(rule, config)) return false;
      return utils.canAddRule(rule, selected) && utils.isAllowedForLeague(rule, league);
    });
    const next = utils.chooseChallengeRule(available, {
      groupIdFor: (rule) => rule.weightGroup || rule.family,
      groupWeightFor: (rule) => ruleProfileWeight(rule, profile, settings),
      ruleWeightFor: (rule) => ruleProfileWeight(rule, profile, settings), random
    });
    if (!next) break;
    selected.push(next);
  }
  return selected;
}

function chooseDisqualifier(pool, selected, profile, league, config, random) {
  const settings = Object.fromEntries(Object.entries(PROFILE_DEFAULTS[profile]).map(([id, weight]) => [id, { enabled: true, weight }]));
  const available = pool.filter((rule) => {
    if (rule.role !== "disqualifier_only") return false;
    const setting = settings[rule.settingFamily];
    return Boolean(setting && setting.enabled && setting.weight > 0) &&
      (config.additionalFamiliesEnabled || !ADDITIONAL_FAMILY_IDS.has(rule.settingFamily)) &&
      !isCupBlocked(rule, config) && utils.canAddRule(rule, selected) && utils.isAllowedForLeague(rule, league);
  });
  const scarcityWeight = (rule) => 1 / (1 + Math.max(0, (rule.scarcity || 1) - 1) * 0.22);
  return utils.chooseOptionalDisqualifier(available, {
    chance: profile === "chaos" ? 0.3 : 0.18,
    groupIdFor: (rule) => rule.weightGroup || rule.family,
    groupWeightFor: scarcityWeight, ruleWeightFor: scarcityWeight, random
  });
}

function cupSearch(cup) {
  const bannedSpecies = (cup.speciesBans || []).map((dex) => `!${dex}`).join("&");
  return utils.stripCpTerms(utils.combineSearch([cup.search, bannedSpecies]));
}

function createConfigurations() {
  const configs = [];
  for (const leagueId of LEAGUE_IDS) {
    for (const additionalFamiliesEnabled of [false, true]) configs.push({
      id: `open-${leagueId}-additional-${additionalFamiliesEnabled ? "on" : "off"}`,
      leagueId, cup: null, cupSearch: "", additionalFamiliesEnabled, includeMutators: true, rankingLimit: null
    });
  }
  for (const cup of CUPS) {
    for (const leagueId of LEAGUE_IDS) {
      for (const additionalFamiliesEnabled of [false, true]) {
        const limits = cup.dynamicFilter === "pvpoke-bottom-rankings" ? [100, 250] : [null];
        for (const rankingLimit of limits) configs.push({
          id: `cup-${cup.id}-${leagueId}-additional-${additionalFamiliesEnabled ? "on" : "off"}${rankingLimit ? `-bottom-${rankingLimit}` : ""}`,
          leagueId, cup, cupSearch: cup.dynamicFilter === "pvpoke-bottom-rankings" ? "" : cupSearch(cup),
          additionalFamiliesEnabled, includeMutators: true, rankingLimit
        });
      }
    }
  }
  return configs;
}

function leagueData(leagueId) {
  return DATA.leagues[leagueId];
}

function buildGeneratedSearch(config, selected, disqualifier, pvpokeSelection) {
  const league = leagueData(config.leagueId);
  const cpConstraint = utils.normalizeCpConstraint(league, selected);
  const otherRules = selected.filter((rule) => rule.family !== "cp");
  const additionalGroups = otherRules.map((rule) => rule.search).concat(disqualifier ? [disqualifier.search] : []);
  if (config.cup && config.cup.dynamicFilter === "pvpoke-bottom-rankings") {
    const result = PVPOKE.buildPainCupSearch(pvpokeSelection, cpConstraint.search, additionalGroups);
    if (!result.valid) throw new Error(result.error);
    return { search: result.search, cpConstraint, cupSearch: pvpokeSelection.candidateSearch };
  }
  const parts = [cpConstraint.search, config.cupSearch].concat(additionalGroups).filter(Boolean);
  return { search: utils.combineSearch(parts), cpConstraint, cupSearch: config.cupSearch };
}

function reviewWarnings(rules, search) {
  const warnings = new Set();
  const causes = [];
  for (const rule of rules) {
    const negative = String(rule.search || "").trim().startsWith("!");
    if (!negative && ((rule.scarcity || 1) >= 4 || rule.pool === "chaos" && (rule.scarcity || 1) >= 3 || ["mythical", "ultrabeast"].includes(rule.id))) {
      warnings.add("SCARCITY_WARNING");
      causes.push(`${rule.id}: positive ${rule.pool} / scarcity-${rule.scarcity} requirement may yield a tiny pool`);
    }
    if (["distance"].includes(rule.family)) { warnings.add("COLLECTION_DEPENDENT"); causes.push(`${rule.id}: trainer-location dependent`); }
    if (rule.family === "move-weather") { warnings.add("STATE_DEPENDENT"); causes.push(`${rule.id}: current-weather dependent`); }
    if (["mega", "mega-level", "max", "max-count", "max-move", "special-status"].includes(rule.family)) {
      warnings.add("BATTLE_ELIGIBILITY_CONDITIONAL"); causes.push(`${rule.id}: battle-format/current-state check may be needed`);
    }
  }
  const length = search.length;
  const orAlternatives = (search.match(/,/g) || []).length + 1;
  if (length > 120 || orAlternatives > 24) {
    warnings.add("COMPLEXITY_WARNING"); causes.push(`search has ${length} characters and ${orAlternatives} comma-separated alternatives`);
  }
  return { warnings: [...warnings], causes };
}

function tokenizeDnf(search) {
  const parsed = utils.validateSearchExpression(search);
  if (!parsed.valid) return { valid: false, clauses: [], error: parsed.error };
  let clauses = [[]];
  for (const group of parsed.groups) {
    const expanded = [];
    for (const clause of clauses) for (const term of group) {
      expanded.push(clause.concat(term.toLowerCase()));
      if (expanded.length > 65536) return { valid: false, clauses: [], error: "Semantic branch expansion exceeds review limit." };
    }
    clauses = expanded;
  }
  return { valid: true, clauses, error: "" };
}

function canonicalTerm(term) { return String(term).replace(/^!+/, "").toLowerCase(); }

function clauseContradiction(terms) {
  const positive = new Set(terms.filter((term) => !term.startsWith("!")).map(canonicalTerm));
  return terms.some((term) => term.startsWith("!") && positive.has(canonicalTerm(term)));
}

function ivTotalFeasible(terms) {
  const ranges = { 0: [0, 0], 1: [1, 5], 2: [6, 10], 3: [11, 14], 4: [15, 15] };
  const statTerms = terms.map((term) => /^(\d)(attack|defense|hp)$/.exec(term)).filter(Boolean);
  let totals = new Set([0]);
  const seenStats = new Map();
  for (const match of statTerms) {
    const stat = match[2];
    const [min, max] = ranges[Number(match[1])];
    const previous = seenStats.get(stat);
    if (previous && Math.max(previous[0], min) > Math.min(previous[1], max)) return false;
    seenStats.set(stat, previous ? [Math.max(previous[0], min), Math.min(previous[1], max)] : [min, max]);
  }
  const starTerms = terms.map((term) => /^(\d)\*$/.exec(term)).filter(Boolean).map((match) => Number(match[1]));
  if (new Set(starTerms).size > 1) return false;
  if (!starTerms.length) return true;
  for (const stat of ["attack", "defense", "hp"]) {
    const [min, max] = seenStats.get(stat) || [0, 15];
    const next = new Set();
    for (const total of totals) for (let value = min; value <= max; value += 1) next.add(total + value);
    totals = next;
  }
  return [...totals].some((total) => {
    const percent = total / 45 * 100;
    const star = percent < 50 ? 0 : percent < 66 ? 1 : percent < 82 ? 2 : percent < 100 ? 3 : 4;
    return starTerms.includes(star);
  });
}

function classifyPair(first, second) {
  let combined;
  let cpConflict = false;
  try {
    combined = utils.combineSearch([first.search, second.search]);
  } catch (error) {
    if (!/CP search constraints have no overlapping values/i.test(error.message)) throw error;
    cpConflict = true;
    combined = [first.search, second.search].filter(Boolean).join("&");
  }
  const dnf = tokenizeDnf(combined);
  const allBranchesContradict = cpConflict || dnf.valid && dnf.clauses.length > 0 && dnf.clauses.every((terms) =>
    clauseContradiction(terms) || !ivTotalFeasible(terms));
  const reasons = [];
  const flags = [];
  let classification = "COMPATIBLE";
  let evidence = "static search composition; no live-client verification";
  const ids = new Set([first.id, second.id]);
  const searches = new Set([first.search, second.search]);
  const families = new Set([first.family, second.family]);

  if (allBranchesContradict) {
    classification = "CONFIRMED_INVALID";
    if (cpConflict) reasons.push("The CP constraints have no overlapping values.");
    if (dnf.clauses.every(clauseContradiction)) reasons.push("Every AND branch requires and excludes the same normalized search term.");
    if (dnf.clauses.some((terms) => !ivTotalFeasible(terms))) reasons.push("IV band totals cannot satisfy the requested overall appraisal star band(s).");
    evidence = "demonstrable from the search DNF and documented appraisal-band ranges";
  }
  if (classification === "COMPATIBLE" && families.has("shadow") && families.has("purified") &&
      [first.search, second.search].includes("shadow") && [first.search, second.search].includes("purified")) {
    classification = "CONFIRMED_INVALID";
    reasons.push("A Pokémon cannot simultaneously have Shadow and Purified status.");
    evidence = "known status lifecycle; static semantic rule";
  }
  if (classification === "COMPATIBLE" && families.has("size-xl") && families.has("size-xs") && dnf.valid &&
      dnf.clauses.every((terms) => (terms.includes("xl") || terms.includes("xxl")) && (terms.includes("xs") || terms.includes("xxs")))) {
    classification = "SUSPECTED_INVALID";
    reasons.push("Every OR branch requires both a large-size and small-size category; category overlap should be checked against the live client.");
    evidence = "rule search terms and generator size exclusiveGroup; static inference, manual verification required";
  }
  if (classification === "COMPATIBLE" && ((ids.has("hatched") && ids.has("shadow")) || (ids.has("hatched") && ids.has("purified")))) {
    classification = "SUSPECTED_INVALID";
    reasons.push("Hatched and Shadow/Purified acquisition-status overlap appears unavailable, but the current client semantics were not verified.");
    evidence = "mechanics inference only; manual verification required";
  }
  if (classification === "COMPATIBLE" && ids.has("hatched") && ["raid", "remote-raid", "mega-raid", "exraid"].some((id) => ids.has(id))) {
    classification = "SUSPECTED_INVALID";
    reasons.push("Hatched and raid-origin appear to describe exclusive acquisition events; provenance behavior after transfer is not established here.");
    evidence = "mechanics inference only; manual verification required";
  }
  const encounterMethods = new Set(["raid", "remote-raid", "mega-raid", "exraid", "research", "gbl-origin", "rocket", "snapshot", "party"]);
  const pairedMethods = [first.id, second.id].filter((id) => encounterMethods.has(id));
  const raidSubsetPair = pairedMethods.length === 2 && pairedMethods.includes("raid") && ["remote-raid", "mega-raid", "exraid"].some((id) => pairedMethods.includes(id));
  if (classification === "COMPATIBLE" && pairedMethods.length === 2 && !raidSubsetPair) {
    classification = "SUSPECTED_INVALID";
    reasons.push("The pair requires two distinct encounter-origin labels; origin persistence and cross-category overlap need live-client verification.");
    evidence = "acquisition semantics inference only; manual verification required";
  }
  if (classification === "COMPATIBLE" && raidSubsetPair) {
    classification = "FALSE_POSITIVE_CANDIDATE";
    flags.push("ORIGIN_SUBSET_REDUNDANCY");
    reasons.push("The specific raid-origin rule may already be included by the general raid rule; this is a redundancy candidate, not a contradiction.");
    evidence = "encounter-origin labels; static subset inference";
  }
  if (classification === "COMPATIBLE" && ids.has("hatched") && ids.has("traded")) {
    flags.push("TRADED_ORIGIN_NOT_EXCLUSIVE");
    reasons.push("Trade is a later transfer and may coexist with hatching; do not treat this pair as contradictory.");
    classification = "FALSE_POSITIVE_CANDIDATE";
    evidence = "reference semantics distinguish hatch origin from received-through-trade status";
  }
  if (classification === "COMPATIBLE" && ([first, second].some((rule) => rule.role === "disqualifier_only" && rule.search.startsWith("!")))) {
    flags.push("NEGATIVE_RULE_NOT_SCARCE");
    reasons.push("Negative trait restriction broadens eligibility; it does not inherit scarcity from the corresponding positive trait.");
    evidence = "search polarity; no live collection-size claim";
    if ([first, second].some((rule) => rule.role === "disqualifier_only" && (rule.scarcity || 1) >= 3)) {
      classification = "FALSE_POSITIVE_CANDIDATE";
    }
  }
  if (classification === "COMPATIBLE" && (first.search === second.search || first.search.includes(second.search) || second.search.includes(first.search))) {
    classification = "FALSE_POSITIVE_CANDIDATE";
    flags.push("REDUNDANT_REQUIREMENT");
    reasons.push("One search requirement appears duplicated or subsumed by the other; this may be harmless redundancy rather than invalidity.");
  }
  if (classification === "COMPATIBLE") {
    const positives = [first, second].filter((rule) => !rule.search.startsWith("!") && ((rule.scarcity || 1) >= 4 || rule.pool === "chaos" && (rule.scarcity || 1) >= 3));
    if (positives.length) {
      classification = "SCARCITY_WARNING";
      reasons.push(`Valid combination includes positive high-scarcity requirement(s): ${positives.map((rule) => rule.id).join(", ")}.`);
      evidence = "rule pool/scarcity annotations; candidate count unknown";
    }
  }
  if (["mega", "mega-level", "max", "max-count", "max-move", "special-status"].some((family) => families.has(family))) {
    flags.push("BATTLE_FORMAT_CONDITIONAL");
    reasons.push("Battle eligibility can depend on the format and current state; no single format roster is assumed.");
  }
  if (classification === "COMPATIBLE" && first.family === "cp" && second.family === "cp") {
    const rangeFor = (rule) => {
      const match = /^cp(\d*)-(\d*)$/.exec(rule.search);
      return [rule.minCp == null ? 0 : rule.minCp, rule.maxCp == null ? (match && match[2] ? Number(match[2]) : Infinity) : rule.maxCp];
    };
    const left = rangeFor(first), right = rangeFor(second);
    if (Math.max(left[0], right[0]) > Math.min(left[1], right[1])) {
      classification = "CONFIRMED_INVALID";
      reasons.push("The two CP intervals have no overlap.");
      evidence = "explicit CP interval bounds in rule-data.js";
    }
  }
  const length = combined.length;
  const branches = dnf.valid ? dnf.clauses.length : 0;
  if (length > 120 || branches > 24) {
    if (classification === "COMPATIBLE") classification = "COMPLEXITY_WARNING";
    else flags.push("COMPLEXITY_WARNING");
    reasons.push(`Combined search is ${length} characters across ${branches} OR branches.`);
  }
  const generatorAllowed = utils.canAddRule(first, []) && utils.canAddRule(second, [first]);
  if (classification === "COMPATIBLE" && !generatorAllowed) {
    classification = "GENERATOR_EXCLUDED";
    reasons.push("The current generator rejects this pair through family/exclusive-group compatibility rules.");
    evidence = "production generator-utils.js canAddRule";
  }
  return {
    classification, secondaryFlags: flags, reasons, evidence, combined,
    length, branchCount: branches, generatorAllowed,
    dnfValid: dnf.valid,
    dnfError: dnf.error || ""
  };
}

function makePairCatalog() {
  const catalog = DATA.rules.map((rule) => ({ ...rule, catalogKind: "rule-data" }));
  DATA.types.forEach((type) => {
    catalog.push({ id: `variant-ban-type-${type}`, label: `Exclude ${type} Pokémon type`, family: "pokemon-type", pool: "core", scarcity: 1, search: `!${type}`, catalogKind: "generated-exclusion-variant" });
    catalog.push({ id: `variant-ban-move-${type}`, label: `Exclude ${type} moves`, family: "move-type", pool: "core", scarcity: 1, search: `!@${type}`, catalogKind: "generated-exclusion-variant" });
  });
  DATA.regions.forEach((region) => catalog.push({
    id: `variant-ban-region-${region}`, label: `Exclude ${region} region`, family: "region", pool: "core", scarcity: 1,
    search: `!${region}`, catalogKind: "generated-exclusion-variant"
  }));
  for (let min = 0; min <= 5; min += 1) for (let max = min; max <= 5; max += 1) catalog.push({
    id: `variant-buddy-${min}-${max}`, label: `Buddy level range ${min}-${max}`, family: "buddy", settingFamily: "buddy",
    pool: "spicy", scarcity: max - min >= 3 ? 1 : 2, search: `buddy${min}-${max}`, catalogKind: "parameter-variant"
  });
  catalog.push({ id: "variant-appraisal-3-star", family: "appraisal", pool: "spicy", scarcity: 1, search: "3*", label: "3-star appraisal", catalogKind: "parameter-variant" });
  catalog.push({ id: "variant-appraisal-4-star", family: "appraisal", pool: "spicy", scarcity: 3, search: "4*", label: "4-star appraisal", catalogKind: "parameter-variant" });
  return catalog;
}

function createBalancedPlan(configurations, count) {
  const plan = [];
  const occurrence = new Array(configurations.length).fill(0);
  for (let index = 0; index < count; index += 1) {
    const configIndex = index % configurations.length;
    const config = configurations[configIndex];
    const profile = PROFILES[occurrence[configIndex] % PROFILES.length];
    occurrence[configIndex] += 1;
    plan.push({ config, profile, occurrence: occurrence[configIndex] });
  }
  return plan;
}

function searchBranches(search) {
  const parsed = tokenizeDnf(search);
  return parsed.valid ? parsed.clauses : [];
}

function checkGenerationRecord(record, config) {
  const branches = searchBranches(record.search);
  const cpPattern = /^cp(?:0-)?-?(\d+)(?:-|$)/;
  const cpTerms = branches.map((branch) => branch.filter((term) => /^cp(?:$|[-\d])/i.test(term)));
  const expectedMax = leagueData(config.leagueId).maxCp;
  const cpPreserved = expectedMax == null ? true : cpTerms.every((terms) => terms.some((term) => {
    const match = cpPattern.exec(term);
    if (!match) return false;
    const max = term.endsWith("-") ? Infinity : Number(term.slice(term.lastIndexOf("-") + 1));
    return max <= expectedMax;
  }));
  return {
    validSearch: utils.validateSearchExpression(record.search).valid,
    cpPreserved,
    cpPreservationUnderCompactCupGrouping: cpPreserved,
    orPrecedenceAmbiguous: false,
    branchCount: branches.length,
    repeatedCupClause: config.cup && config.cup.search ? branches.some((branch) => !config.cup.search.split(/[&,]/).some((term) => branch.some((entry) => entry.toLowerCase() === term.toLowerCase()))) : false
  };
}

function severityFor(warnings, failure, validSearch, cpPreserved) {
  if (failure || !validSearch || cpPreserved === false || warnings.includes("CONFIRMED_INVALID")) return "CRITICAL";
  if (warnings.includes("SUSPECTED_INVALID")) return "HIGH";
  if (warnings.some((warning) => ["MANUAL_CUP_ELIGIBILITY", "CUP_LEAGUE_MISMATCH", "COMPLEXITY_WARNING"].includes(warning)) || warnings.includes("SCARCITY_WARNING")) return "REVIEW";
  return warnings.length ? "WATCH" : "NONE";
}

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, REVIEW: 2, WATCH: 3, NONE: 4 };

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("|") : value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function writeCsv(file, rows, headers) {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvCell(row[header])).join(","));
  fs.writeFileSync(file, lines.join("\r\n") + "\r\n", "utf8");
}

function aggregateCounts(values) {
  const counts = new Map();
  values.forEach((value) => { if (value) counts.set(value, (counts.get(value) || 0) + 1); });
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function runReview(options = {}) {
  const count = Number(options.count || 10000);
  const outputDirectory = path.resolve(options.outputDirectory || DEFAULT_OUTPUT);
  const baseSeed = Number(options.seed || BASE_SEED);
  fs.mkdirSync(outputDirectory, { recursive: true });
  const configurations = createConfigurations();
  const plan = createBalancedPlan(configurations, count);
  const painSelections = new Map([100, 250].map((limit) => [limit, PVPOKE.getBottomRanked(PVPOKE_SNAPSHOT, limit)]));
  let previousSearch = "";
  const generationRows = [];
  const pairIds = new Map();
  const familyCounts = new Map();
  const selectedRuleCounts = new Map();
  const warningCounts = new Map();
  const warningCauseCounts = new Map();
  const profileLeagueCounts = new Map();
  const warningProfileLeagueCounts = new Map();
  const warningCodeProfileLeagueCounts = new Map();
  const exclusionCounts = new Map();
  let repeatedExclusionsWithinBranch = 0;
  const lengths = [];
  const generationDurations = [];
  const genStarted = performance.now();
  let invalidGenerated = 0;
  let cpFailures = 0;
  let cpPrecedenceAmbiguities = 0;
  let branchCountTotal = 0;
  let branchCountCorrect = 0;
  let rejectAttemptsTotal = 0;
  let failureCount = 0;

  for (let index = 0; index < count; index += 1) {
    const { config, profile, occurrence } = plan[index];
    const sampleSeed = (baseSeed + index * 7919) >>> 0;
    const random = seededRandom(sampleSeed);
    const league = leagueData(config.leagueId);
    const pvpokeSelection = config.rankingLimit ? painSelections.get(config.rankingLimit) : null;
    const started = performance.now();
    let selected = [];
    let disqualifier = null;
    let built = { search: "", cpConstraint: { search: "" }, cupSearch: config.cupSearch };
    let attempts = 0;
    let rejectionReasons = [];
    let error = "";
    const lastSearch = previousSearch;
    for (attempts = 1; attempts <= 30; attempts += 1) {
      try {
        const pool = makeRulePool(random, config);
        selected = chooseSelection(pool, profile, league, config, random, 2);
        disqualifier = chooseDisqualifier(pool, selected, profile, league, config, random);
        built = buildGeneratedSearch(config, selected, disqualifier, pvpokeSelection);
        if (built.search === lastSearch && attempts < 30) { rejectionReasons.push("same_as_previous_result_in_configuration"); continue; }
        error = "";
        break;
      } catch (caught) {
        error = caught.message;
        rejectionReasons.push(`composition_error:${caught.message}`);
      }
    }
    if (error) failureCount += 1;
    previousSearch = built.search;
    const selectedAll = selected.concat(disqualifier ? [disqualifier] : []);
    const review = reviewWarnings(selectedAll, built.search);
    const pairAssessments = [];
    for (let left = 0; left < selectedAll.length; left += 1) for (let right = left + 1; right < selectedAll.length; right += 1) {
      pairAssessments.push(classifyPair(selectedAll[left], selectedAll[right]));
    }
    const dnf = tokenizeDnf(built.search);
    const searchBranchesImpossible = dnf.valid && dnf.clauses.length > 0 && dnf.clauses.every((terms) => clauseContradiction(terms) || !ivTotalFeasible(terms));
    const classifications = [...new Set(pairAssessments.map((item) => item.classification).filter((value) => value !== "COMPATIBLE" && value !== "GENERATOR_EXCLUDED"))];
    if (searchBranchesImpossible) classifications.push("CONFIRMED_INVALID");
    const normalizedClassifications = uniqueClassifications(classifications);
    if (classifications.includes("CONFIRMED_INVALID")) {
      review.warnings.push("CONFIRMED_INVALID");
      review.causes.push("all composed AND/OR branches are contradictory under the static DNF and IV-band checks");
    } else if (classifications.includes("SUSPECTED_INVALID")) {
      review.warnings.push("SUSPECTED_INVALID");
      review.causes.push("selected pair has a likely mechanics conflict that needs live-client verification");
    }
    if (config.cup && config.cup.manualRules && config.cup.manualRules.length) {
      review.warnings.push("MANUAL_CUP_ELIGIBILITY");
      review.causes.push(`cup ${config.cup.id}: manual eligibility condition is not fully encoded in the search (${config.cup.manualRules.join(" ")})`);
    }
    if (config.cup && config.cup.dynamicFilter === "pvpoke-bottom-rankings") {
      review.warnings.push("APPROXIMATE_DEX_CANDIDATES");
      review.causes.push("pain-cup: comma-separated Pokédex candidates share AND constraints; Dex numbers can match other forms");
    }
    if (config.cup && config.cup.officialLeague && config.cup.officialLeague !== config.leagueId) {
      review.warnings.push("CUP_LEAGUE_MISMATCH");
      review.causes.push(`cup ${config.cup.id}: official eligibility restrictions used with ${league.label}; UI describes this as a custom league/Cup combination`);
    }
    const checks = checkGenerationRecord({ search: built.search }, config);
    if (!checks.validSearch) invalidGenerated += 1;
    if (checks.cpPreserved === false) cpFailures += 1;
    if (checks.orPrecedenceAmbiguous) cpPrecedenceAmbiguities += 1;
    branchCountTotal += checks.branchCount;
    branchCountCorrect += checks.validSearch ? checks.branchCount : 0;
    lengths.push(built.search.length);
    rejectAttemptsTotal += Math.max(0, attempts - 1);
    const pairKey = selected.map((rule) => rule.id).sort().join(" + ");
    pairIds.set(pairKey, (pairIds.get(pairKey) || 0) + 1);
    selectedAll.forEach((rule) => {
      familyCounts.set(rule.family, (familyCounts.get(rule.family) || 0) + 1);
      selectedRuleCounts.set(rule.id, (selectedRuleCounts.get(rule.id) || 0) + 1);
    });
    review.warnings.forEach((warning) => warningCounts.set(warning, (warningCounts.get(warning) || 0) + 1));
    review.causes.forEach((cause) => warningCauseCounts.set(cause, (warningCauseCounts.get(cause) || 0) + 1));
    const pl = `${profile}/${config.leagueId}`;
    profileLeagueCounts.set(pl, (profileLeagueCounts.get(pl) || 0) + 1);
    if (review.warnings.length) warningProfileLeagueCounts.set(pl, (warningProfileLeagueCounts.get(pl) || 0) + 1);
    review.warnings.forEach((warning) => {
      const key = `${pl}/${warning}`;
      warningCodeProfileLeagueCounts.set(key, (warningCodeProfileLeagueCounts.get(key) || 0) + 1);
    });
    searchBranches(built.search).forEach((branch) => {
      const exclusions = branch.filter((term) => term.startsWith("!"));
      if (new Set(exclusions).size !== exclusions.length) repeatedExclusionsWithinBranch += 1;
      exclusions.forEach((term) => exclusionCounts.set(term, (exclusionCounts.get(term) || 0) + 1));
    });
    const duration = performance.now() - started;
    generationDurations.push(duration);
    generationRows.push({
      sample_id: `G${String(index + 1).padStart(5, "0")}`,
      seed: sampleSeed,
      configuration_id: config.id,
      cup_id: config.cup ? config.cup.id : "open-league",
      cup_name: config.cup ? config.cup.name : "Open League",
      cup_origin: config.cup ? (config.cup.origin || (config.cup.official ? "official" : "custom-preset")) : "none",
      cup_mode: !config.cup ? "open" : config.cup.officialLeague && config.cup.officialLeague !== config.leagueId ? "supported_custom_league_combination" : "preset_league_combination",
      ranking_limit: config.rankingLimit || "",
      league: league.label,
      difficulty: profile,
      additional_families_enabled: config.additionalFamiliesEnabled,
      mutators_enabled: true,
      requested_rules: 2,
      selected_rule_count: selected.length,
      rule_ids: selected.map((rule) => rule.id),
      rule_labels: selected.map((rule) => rule.label),
      rule_families: selected.map((rule) => rule.family),
      rule_pools: selected.map((rule) => rule.pool),
      disqualifier_id: disqualifier ? disqualifier.id : "",
      disqualifier_search: disqualifier ? disqualifier.search : "",
      final_search: built.search,
      warnings: review.warnings,
      warning_causes: review.causes,
      review_classifications: normalizedClassifications,
      severity: severityFor(review.warnings, error, checks.validSearch, checks.cpPreserved),
      rejection_attempts: attempts - 1,
      rejection_reasons: rejectionReasons,
      generation_failure: error,
      search_valid: checks.validSearch,
      cp_constraint_search: built.cpConstraint.search,
      cp_constraint_preserved_per_or_branch: checks.cpPreserved,
      cp_preserved_under_compact_cup_grouping: checks.cpPreservationUnderCompactCupGrouping,
      or_precedence_ambiguous: checks.orPrecedenceAmbiguous,
      or_branch_count: checks.branchCount,
      search_length: built.search.length,
      generation_time_ms: Number(duration.toFixed(4)),
      configuration_occurrence: occurrence
    });
  }
  const generationTimeMs = performance.now() - genStarted;

  const catalog = makePairCatalog();
  const pairRows = [];
  const pairStarted = performance.now();
  let pairId = 0;
  for (let firstIndex = 0; firstIndex < catalog.length; firstIndex += 1) {
    const first = catalog[firstIndex];
    for (let secondIndex = firstIndex + 1; secondIndex < catalog.length; secondIndex += 1) {
      const second = catalog[secondIndex];
      const outcome = classifyPair(first, second);
      pairId += 1;
      pairRows.push({
        pair_id: `P${String(pairId).padStart(6, "0")}`,
        sample_id: `P${String(pairId).padStart(6, "0")}`,
        seed: "deterministic_exhaustive",
        configuration_id: "all-rule-pairs",
        rule_id_a: first.id, rule_id_b: second.id,
        label_a: first.label || first.id, label_b: second.label || second.id,
        family_a: first.family, family_b: second.family,
        pool_a: first.pool || "variant", pool_b: second.pool || "variant",
        search_a: first.search, search_b: second.search,
        combined_search: outcome.combined,
        classification: outcome.classification,
        severity: outcome.classification === "CONFIRMED_INVALID" ? "CRITICAL"
          : outcome.classification === "SUSPECTED_INVALID" ? "HIGH"
            : ["COMPLEXITY_WARNING", "SCARCITY_WARNING"].includes(outcome.classification) ? "REVIEW" : "WATCH",
        secondary_flags: outcome.secondaryFlags,
        reasoning: outcome.reasons,
        evidence_basis: outcome.evidence,
        generator_can_add_pair: outcome.generatorAllowed,
        dnf_parse_valid: outcome.dnfValid,
        dnf_parse_error: outcome.dnfError,
        or_branch_count: outcome.branchCount,
        combined_length: outcome.length,
        catalog_kind_a: first.catalogKind || "rule-data",
        catalog_kind_b: second.catalogKind || "rule-data"
      });
    }
  }
  const pairwiseTimeMs = performance.now() - pairStarted;

  const excludedDisqualifiers = new Set(DATA.rules.filter((rule) => rule.role === "disqualifier_only").map((rule) => rule.id));
  const neverGeneratedRuleIds = DATA.rules.filter((rule) => !selectedRuleCounts.has(rule.id) && !excludedDisqualifiers.has(rule.id)).map((rule) => rule.id);
  const selectedFamilyNames = new Set([...familyCounts.keys()]);
  const neverGeneratedFamilies = [...new Set(DATA.rules.map((rule) => rule.family))].filter((family) => !selectedFamilyNames.has(family));
  const duplicateKeys = new Map();
  const duplicateConfigKeys = new Map();
  generationRows.forEach((row) => {
    duplicateKeys.set(row.final_search, (duplicateKeys.get(row.final_search) || 0) + 1);
    const configKey = `${row.configuration_id}\u0000${row.final_search}`;
    duplicateConfigKeys.set(configKey, (duplicateConfigKeys.get(configKey) || 0) + 1);
  });
  const repeatedOutputs = [...duplicateKeys.values()].reduce((sum, occurrences) => sum + Math.max(0, occurrences - 1), 0);
  const repeatedOutputsWithinConfiguration = [...duplicateConfigKeys.values()].reduce((sum, occurrences) => sum + Math.max(0, occurrences - 1), 0);
  const sortedLengths = lengths.slice().sort((a, b) => a - b);
  const sortedDurations = generationDurations.slice().sort((a, b) => a - b);
  const flaggedRows = generationRows.filter((row) => row.warnings.length || row.generation_failure || !row.search_valid || row.cp_constraint_preserved_per_or_branch === false);
  flaggedRows.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.sample_id.localeCompare(b.sample_id));
  pairRows.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.pair_id.localeCompare(b.pair_id));
  const pairClassificationCounts = aggregateCounts(pairRows.map((row) => row.classification));
  const configDistribution = configurations.map((config) => ({
    configuration_id: config.id,
    cup_id: config.cup ? config.cup.id : "open-league",
    league: config.leagueId,
    additional_families_enabled: config.additionalFamiliesEnabled,
    supported_by_build: true,
    samples: generationRows.filter((row) => row.configuration_id === config.id).length,
    difficulty_counts: aggregateCounts(generationRows.filter((row) => row.configuration_id === config.id).map((row) => row.difficulty))
  }));
  const unsupportedConfigurations = [
    { configuration: "custom-cup-editor-with-user-entered-rules", reason: "No user-specific custom cup input was supplied; the harness does not invent one." },
    { configuration: "cup-mutators-disabled", reason: "This produces no random rules, so it is not a random-generation sample." }
  ];
  const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const result = {
    report_directory: outputDirectory,
    generator_revision: revision,
    generator_revision_short: revision.slice(0, 12),
    source_fingerprint_sha256: sourceFingerprint(),
    source_fingerprint_files: FINGERPRINT_FILES,
    generated_at_utc: new Date().toISOString(),
    review_date: REVIEW_DATE.toISOString(),
    seed_scheme: "sample_seed = (base_seed + (zero_based_sample_index * 7919)) modulo 2^32; one LCG stream per sample",
    base_seed: baseSeed,
    sample_count_requested: count,
    sample_count_recorded: generationRows.length,
    profiles: PROFILES,
    leagues: LEAGUE_IDS,
    configuration_count: configurations.length,
    configuration_distribution: configDistribution,
    supported_homegrown_cups: CUPS.filter((cup) => cup.origin === "homegrown").map((cup) => cup.id),
    supported_official_cups: CUPS.filter((cup) => cup.official).map((cup) => cup.id),
    unsupported_configurations: unsupportedConfigurations,
    additional_family_variants: [false, true],
    mutators_enabled_for_random_samples: true,
    requested_challenge_rule_count: 2,
    rule_catalog_count: catalog.length,
    rule_data_catalog_count: DATA.rules.length,
    parameter_variant_count: catalog.length - DATA.rules.length,
    generated_single_exclusion_variant_count: catalog.filter((rule) => rule.catalogKind === "generated-exclusion-variant").length,
    generated_multi_exclusion_combinations_enumerated: false,
    pairwise_pair_count: pairRows.length,
    pairwise_classification_counts: pairClassificationCounts,
    pairwise_timing_ms: Number(pairwiseTimeMs.toFixed(2)),
    generation_timing_ms_total: Number(generationTimeMs.toFixed(2)),
    generation_timing_ms_min: Number(sortedDurations[0].toFixed(4)),
    generation_timing_ms_median: Number(sortedDurations[Math.floor(sortedDurations.length * 0.5)].toFixed(4)),
    generation_timing_ms_p95: Number(sortedDurations[Math.floor(sortedDurations.length * 0.95)].toFixed(4)),
    generation_timing_ms_max: Number(sortedDurations[sortedDurations.length - 1].toFixed(4)),
    invalid_generated_searches: invalidGenerated,
    cp_preservation_failures: cpFailures,
    or_precedence_ambiguous_cup_outputs: cpPrecedenceAmbiguities,
    generation_failures: failureCount,
    generation_failure_rate: count ? Number((failureCount / count).toFixed(6)) : 0,
    rejected_candidate_attempts: rejectAttemptsTotal,
    samples_with_retries: generationRows.filter((row) => row.rejection_attempts > 0).length,
    retry_sample_rate: count ? Number((generationRows.filter((row) => row.rejection_attempts > 0).length / count).toFixed(6)) : 0,
    repeated_generation_outputs_after_previous_result_retries: repeatedOutputs,
    repeated_outputs_within_same_configuration: repeatedOutputsWithinConfiguration,
    unique_selected_rule_pairs: pairIds.size,
    selected_rule_pair_repeat_frequency: Object.fromEntries([...pairIds.entries()].filter(([, value]) => value > 1).sort((a, b) => b[1] - a[1])),
    rule_family_counts_including_optional_disqualifiers: Object.fromEntries([...familyCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    rule_id_occurrence_counts: Object.fromEntries([...selectedRuleCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    never_generated_rule_ids: neverGeneratedRuleIds,
    never_generated_families: neverGeneratedFamilies,
    warning_counts_by_type: Object.fromEntries([...warningCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    warning_causes_top_20: [...warningCauseCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 20).map(([cause, count]) => ({ cause, count })),
    difficulty_league_counts: Object.fromEntries([...profileLeagueCounts.entries()].sort()),
    warning_sample_counts_by_difficulty_league: Object.fromEntries([...warningProfileLeagueCounts.entries()].sort()),
    warning_counts_by_difficulty_league: Object.fromEntries([...warningCodeProfileLeagueCounts.entries()].sort()),
    most_frequent_exclusion_clauses: Object.fromEntries([...exclusionCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 20)),
    repeated_exclusions_within_any_single_and_branch: repeatedExclusionsWithinBranch,
    search_length: { min: Math.min(...lengths), p50: sortedLengths[Math.floor(sortedLengths.length * 0.5)], p95: sortedLengths[Math.floor(sortedLengths.length * 0.95)], max: Math.max(...lengths) },
    longest_search_examples: generationRows.slice().sort((a, b) => b.search_length - a.search_length).slice(0, 5).map(({ sample_id, seed, configuration_id, final_search, search_length }) => ({ sample_id, seed, configuration_id, final_search, search_length })),
    flagged_generation_count: flaggedRows.length,
    or_branch_count_total: branchCountTotal,
    or_branch_count_validated: branchCountCorrect,
    observed_evidence_limit: "Offline simulation and static inference only. No live Pokémon GO client was queried; collection sizes and uncertain mechanics require manual verification.",
    heuristic_thresholds: { complexity_max_characters: 120, complexity_max_or_alternatives: 24, scarcity_rule_scarcity_minimum: 4 },
    search_semantics_model: "AND across groups; comma/colon/semicolon OR within each group; NOT applies to a term"
  };

  writeCsv(path.join(outputDirectory, "generations.csv"), generationRows, Object.keys(generationRows[0]));
  writeCsv(path.join(outputDirectory, "flagged.csv"), flaggedRows, Object.keys(flaggedRows[0]));
  writeCsv(path.join(outputDirectory, "pairwise.csv"), pairRows, Object.keys(pairRows[0]));
  fs.writeFileSync(path.join(outputDirectory, "run-metadata.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(outputDirectory, "summary.md"), buildSummary(result, flaggedRows, pairRows), "utf8");
  return result;
}

function buildSummary(metadata, flaggedRows, pairRows) {
  const examples = pairRows.filter((row) => ["CONFIRMED_INVALID", "SUSPECTED_INVALID", "FALSE_POSITIVE_CANDIDATE", "COMPLEXITY_WARNING"].includes(row.classification));
  const pairFor = (predicate) => examples.find(predicate);
  const pairSampleFor = (pair) => pair && flaggedRows.find((row) => {
    const ids = [...(row.rule_ids || []), row.disqualifier_id].filter(Boolean).sort();
    return ids.includes(pair.rule_id_a) && ids.includes(pair.rule_id_b);
  });
  const withSample = (pair) => pair ? { pair, sample: pairSampleFor(pair) } : null;
  const compact = (value, maxLength = 180) => value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
  const rulePair = (first, second, classification) => withSample(pairFor((row) =>
    [row.rule_id_a, row.rule_id_b].includes(first) && [row.rule_id_a, row.rule_id_b].includes(second)
      && (!classification || row.classification === classification)));
  const firstGeneratedInvalid = flaggedRows.find((row) => row.warnings.includes("CONFIRMED_INVALID"));
  const firstGeneratedInvalidIds = firstGeneratedInvalid
    ? [...(firstGeneratedInvalid.rule_ids || []), firstGeneratedInvalid.disqualifier_id].filter(Boolean)
    : [];
  const generatedInvalidPair = pairFor((pair) => pair.classification === "CONFIRMED_INVALID"
    && firstGeneratedInvalidIds.includes(pair.rule_id_a) && firstGeneratedInvalidIds.includes(pair.rule_id_b));
  const sortedFindings = [
    { title: "IV appraisal totals conflict in generated output", priority: "P1", proof: withSample(generatedInvalidPair) },
    { title: "Hatched and Shadow/Purified overlap is unresolved", priority: "P1", proof: rulePair("hatched", "shadow", "SUSPECTED_INVALID") || rulePair("hatched", "purified", "SUSPECTED_INVALID") },
    { title: "Manual Cup conditions and cross-league combinations need review", priority: "P2", proof: flaggedRows.find((row) => row.warnings.includes("MANUAL_CUP_ELIGIBILITY") || row.warnings.includes("CUP_LEAGUE_MISMATCH")) },
    { title: "Scarcity and long generated searches need usability review", priority: "P2", proof: flaggedRows.slice().sort((a, b) => b.search_length - a.search_length)[0] }
  ];
  const profileLeagueRows = [];
  for (const profile of metadata.profiles) for (const league of metadata.leagues) {
    const key = `${profile}/${league}`;
    const warningIncidences = Object.entries(metadata.warning_counts_by_difficulty_league)
      .filter(([warningKey]) => warningKey.startsWith(`${key}/`))
      .reduce((sum, [, count]) => sum + count, 0);
    profileLeagueRows.push(`| ${profile} | ${league} | ${metadata.difficulty_league_counts[key] || 0} | ${metadata.warning_sample_counts_by_difficulty_league[key] || 0} | ${warningIncidences} |`);
  }
  const topWarnings = Object.entries(metadata.warning_counts_by_type).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([warning, count]) => `${warning}=${count}`).join(", ");
  const topCauses = metadata.warning_causes_top_20.slice(0, 5)
    .map(({ cause, count }) => `${compact(cause, 150)} (${count})`).join("; ");
  const longestExamples = metadata.longest_search_examples.slice(0, 3)
    .map(({ sample_id, search_length }) => `${sample_id}=${search_length} chars`).join(", ");
  const lines = [
    "# GBL Filter Generator stress review",
    "",
    `Generated from the deployed source tree based on revision \`${metadata.generator_revision}\` (source SHA-256 \`${metadata.source_fingerprint_sha256}\`) on ${metadata.generated_at_utc}.`,
    "",
    "## Method",
    "",
    `- ${metadata.sample_count_recorded.toLocaleString()} seeded source-driven generations; seed scheme and config roster are in run-metadata.json.`,
    `- ${metadata.configuration_count} applicable configurations across Great, Ultra, Master, Open League and ${metadata.supported_official_cups.length + metadata.supported_homegrown_cups.length} bundled Cup presets; additional families both off and on.`,
    "- Every applicable configuration receives Chill, Spicy, and Chaos samples with per-profile counts balanced within one. Every sample requests two challenge rules; Cups use mutators enabled. Pain Cup is exercised at both bundled ranking windows.",
    `- Exhaustive unordered pairs: ${metadata.rule_catalog_count} entries (${metadata.rule_data_catalog_count} rule-data IDs plus ${metadata.parameter_variant_count} parameter/generated exclusion variants), ${metadata.pairwise_pair_count.toLocaleString()} pairs. Runtime multi-term negative-exclusion permutations are not individually expanded; each term family is represented by singleton variants to avoid a combinatorial matrix explosion.`,
    "- Static source simulation only. Search syntax and AND-across-groups / OR-within-groups semantics are evaluated by the production generator-utils.js; app selection orchestration is modeled from deployed app.js. No live Pokémon GO client or user collection was queried.",
    "- Unavailable by design: freeform user-authored custom Cups (no supplied settings), and Cup runs with mutators disabled because those produce no random rules.",
    "",
    "## Results",
    "",
    `- Recorded outputs: **${metadata.sample_count_recorded.toLocaleString()}**; generation failures: ${metadata.generation_failures}; malformed searches: ${metadata.invalid_generated_searches}; CP preservation failures: ${metadata.cp_preservation_failures}.`,
    `- Static semantic checks tagged ${metadata.warning_counts_by_type.CONFIRMED_INVALID || 0} generated samples as confirmed invalid (IV/appraisal contradictions) and ${metadata.warning_counts_by_type.SUSPECTED_INVALID || 0} as suspected invalid; these are separate from search-syntax validation.`,
    `- Compact Pain Cup output has ${metadata.or_precedence_ambiguous_cup_outputs} shared-CP semantic failures under the updated parser; its comma-separated candidate list is treated as one OR group joined to CP and exclusions.`,
    `- Rejected candidate attempts: ${metadata.rejected_candidate_attempts}; ${metadata.repeated_generation_outputs_after_previous_result_retries} repeated searches overall (${metadata.repeated_outputs_within_same_configuration} within the same config) after same-as-previous retries.`,
    `- Unique selected rule pairs: ${metadata.unique_selected_rule_pairs}; pair occurrences/repeats are detailed in run-metadata.json.`,
    `- Warning-bearing samples by profile/league: ${Object.entries(metadata.warning_sample_counts_by_difficulty_league).map(([key, count]) => `${key}=${count}`).join(", ")}.`,
    "- Warning counts by profile/league (warning count is warning-code incidences; warning-bearing samples can have multiple warnings):",
    "",
    "| Difficulty | League | Outputs | Outputs with warnings | Warning incidences |",
    "|---|---|---:|---:|---:|",
    ...profileLeagueRows,
    "",
    `- Most frequent warning codes: ${topWarnings}.`,
    `- Most frequent causes: ${topCauses}.`,
    "- Detailed warning-code counts by profile/league are in run-metadata.json; complexity thresholds (over 120 characters or 24 OR branches) are heuristic.",
    `- Repeated exclusion clauses inside one AND branch: ${metadata.repeated_exclusions_within_any_single_and_branch}; most frequent negations are listed in run-metadata.json.`,
    `- Pair classifications: ${Object.entries(metadata.pairwise_classification_counts).map(([name, count]) => `${name}=${count}`).join(", ")}.`,
    `- Search lengths: min ${metadata.search_length.min}, median ${metadata.search_length.p50}, p95 ${metadata.search_length.p95}, max ${metadata.search_length.max} characters.`,
    `- Longest search samples: ${longestExamples}; full strings are in generations.csv and flagged.csv.`,
    `- Generation time: ${metadata.generation_timing_ms_total} ms total; pairwise evaluation: ${metadata.pairwise_timing_ms} ms.`,
    "",
    "## Highest-priority findings",
    ""
  ];
  sortedFindings.forEach((finding, index) => {
    const proof = finding.proof;
    let evidence = "";
    if (proof && proof.pair) {
      const pair = proof.pair;
      const reason = (pair.reasoning || []).join(" ");
      const sample = proof.sample ? `; flagged.csv ${proof.sample.sample_id} (seed ${proof.sample.seed}, config ${proof.sample.configuration_id})` : "";
      evidence = ` Evidence: pairwise.csv ${pair.pair_id}, ${pair.rule_id_a} + ${pair.rule_id_b}${sample}. ${reason}`;
    } else if (proof && proof.sample_id) {
      const rules = (proof.rule_ids || []).join(" + ") || "none";
      const warnings = (proof.warnings || []).join(", ");
      const cause = compact((proof.warning_causes || []).join(" "), 220);
      evidence = ` Evidence: flagged.csv ${proof.sample_id} (seed ${proof.seed}, config ${proof.configuration_id}, rules ${rules}, ${proof.search_length} chars; ${warnings}). ${cause}`;
    }
    lines.push(`${index + 1}. **${finding.priority} — ${finding.title}.**${evidence}`);
  });
  lines.push(
    "",
    "## Regression checks",
    "",
    "- `hatched&shadow` and `hatched&purified` are retained as SUSPECTED_INVALID, not confirmed; no live mechanics check was performed.",
    "- `0attack&3defense&3hp` combined with `3*` or `4*` is CONFIRMED_INVALID under the documented IV bands and appraisal total model.",
    "- Negative `!locationbackground` is never treated as a positive scarcity requirement; pairwise rows explicitly mark that polarity as a false-positive warning candidate.",
    "- Compact comma groups and AND constraints are parsed using the confirmed game precedence; semantic branches are checked for the appropriate league CP ceiling. See `pairwise.csv` and generation row validation columns.",
    "- Collection-dependent pool size, uncertain acquisition semantics, and battle-format eligibility remain heuristic/manual review items.",
    "",
    "## Artifacts",
    "",
    "- `generations.csv`: complete raw generation log.",
    "- `flagged.csv`: suspicious, conditional, scarce, or complex generation rows with sample IDs, seeds, config and reasons.",
    "- `pairwise.csv`: complete catalog-pair matrix and static classification reasoning.",
    "- `run-metadata.json`: exact seed scheme, base revision, source fingerprint and files, configuration roster, counts, timing, and limitations.",
    ""
  );
  return lines.join("\n");
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const valueFor = (flag, fallback) => {
    const index = args.indexOf(flag);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
  };
  const result = runReview({ count: Number(valueFor("--count", "10000")), seed: Number(valueFor("--seed", String(BASE_SEED))), outputDirectory: valueFor("--out", DEFAULT_OUTPUT) });
  process.stdout.write(JSON.stringify({
    report_directory: result.report_directory,
    sample_count_recorded: result.sample_count_recorded,
    pairwise_pair_count: result.pairwise_pair_count,
    generation_failures: result.generation_failures,
    cp_preservation_failures: result.cp_preservation_failures,
    or_precedence_ambiguous_cup_outputs: result.or_precedence_ambiguous_cup_outputs,
    invalid_generated_searches: result.invalid_generated_searches,
    flagged_generation_count: result.flagged_generation_count,
    generation_timing_ms_total: result.generation_timing_ms_total,
    pairwise_timing_ms: result.pairwise_timing_ms
  }, null, 2) + "\n");
}

module.exports = {
  checkGenerationRecord, classifyPair, createBalancedPlan, createConfigurations, makePairCatalog, uniqueClassifications,
  runReview, seededRandom, tokenizeDnf, ivTotalFeasible
};
