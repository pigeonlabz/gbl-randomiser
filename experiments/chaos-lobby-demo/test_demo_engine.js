"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const engine = require("./static/chaos_demo_engine.js");
const { generateAssignment, generateRound, validateAssignment } = engine;

test("Hunter and Purist have the requested fixed leagues and filters", () => {
  const hunter = generateAssignment({}, { role: "Hunter" });
  assert.equal(hunter.league, "Ultra League");
  assert.equal(hunter.search, "cp-2500");
  const purist = generateAssignment({}, { role: "Purist" });
  assert.equal(purist.league, "Great League");
  assert.deepEqual(purist.search.split("&"), ["cp-1500", "!legendary", "!mythical", "!ultrabeast"]);
});

test("2–6-player lobbies get independently owned assignments and role variety", () => {
  for (let count = 2; count <= 6; count++) {
    const slots = generateRound(count);
    assert.equal(slots.length, count);
    assert.ok(slots.every(slot => slot.error === null));
    assert.equal(new Set(slots.map(slot => slot.assignment.role)).size, Math.min(5, count));
    const otherCards = JSON.stringify(slots.slice(1));
    slots[0].assignment.rules.push("Host changed only this player");
    assert.equal(JSON.stringify(slots.slice(1)), otherCards);
  }
});

test("fixed leagues survive flexible league settings", () => {
  const settings = { flexible_league: "Master League" };
  for (const role of ["Specialist", "Wildcard", "Underdog"]) {
    assert.equal(generateAssignment(settings, { role }).league, "Master League");
  }
  assert.equal(generateAssignment(settings, { role: "Hunter" }).league, "Ultra League");
  assert.equal(generateAssignment(settings, { role: "Purist" }).league, "Great League");
});

test("Specialist has a type; Underdog adds restrictions and rerolls; Wildcard gets one", () => {
  const specialist = generateAssignment({}, { role: "Specialist" });
  const underdog = generateAssignment({}, { role: "Underdog" });
  assert.match(specialist.rules[0], /^Only .*type Pokémon/);
  assert.ok(underdog.rules.length > specialist.rules.length);
  assert.ok(underdog.reroll_limit > specialist.reroll_limit);
  assert.equal(generateAssignment({}, { role: "Wildcard" }).reroll_limit, 1);
});

test("single-player reroll excludes previous role and preserves prior assignments/settings", () => {
  const settings = { flexible_league: "Great League" };
  const original = generateRound(6, settings);
  const before = JSON.stringify(original);
  const rerolled = generateAssignment(settings, { exclude_role: original[0].assignment.role });
  assert.notEqual(rerolled.role, original[0].assignment.role);
  assert.equal(JSON.stringify(original), before);
  assert.deepEqual(settings, { flexible_league: "Great League" });
});

test("one broken role leaves the other four assignments usable", () => {
  const pool = engine.roles.Specialist.pool;
  try {
    engine.roles.Specialist.pool = "broken";
    const slots = generateRound(5);
    assert.equal(slots.filter(slot => slot.error).length, 1);
    assert.equal(slots.filter(slot => slot.assignment).length, 4);
  } finally {
    engine.roles.Specialist.pool = pool;
  }
});

test("generated assignments remain valid across many independent rolls", () => {
  for (const role of Object.keys(engine.roles)) {
    for (let index = 0; index < 40; index++) {
      const assignment = generateAssignment({}, { role });
      assert.deepEqual(validateAssignment(assignment), assignment);
    }
  }
});

test("contradictions, disjoint CP ranges and malformed searches are rejected", () => {
  const original = generateAssignment({}, { role: "Hunter" });
  for (const search of ["shiny&!shiny", "shadow&purified", "cp3000-", "cp2000-&cp-1000", "cp-2500&&water"]) {
    assert.throws(() => validateAssignment({ ...original, search }));
  }
  assert.equal(original.search, "cp-2500");
});

test("custom unlimited overrides and complex searches remain editable with visible warnings", () => {
  const assignment = validateAssignment({
    role: "Custom", league: "Great League", rules: ["Host rule"], search: "water,fire",
    reroll_limit: null, source: "manual",
  });
  assert.equal(assignment.reroll_limit, null);
  assert.equal(assignment.source, "manual");
  assert.ok(assignment.warnings.some(warning => warning.includes("not been checked")));
});

test("invalid inputs fail visibly; following generation still works", () => {
  for (const count of [0, 13, true, "2", 2.5]) assert.throws(() => generateRound(count));
  assert.throws(() => generateAssignment({}, { role: "Missing" }));
  assert.throws(() => generateAssignment({ flexible_league: "Missing" }));
  assert.throws(() => generateAssignment({}, { role: "toString" }));
  assert.throws(() => validateAssignment({}));
  assert.ok(generateAssignment().role);
});
