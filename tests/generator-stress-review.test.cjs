const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const utils = require("../docs/static/js/generator-utils.js");
const review = require("../tools/generator-stress-review.cjs");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../docs/static/js/rule-data.js"), "utf8"), context);
const ruleData = context.window.GBL_RULE_DATA;

function rule(id) {
  return ruleData.rules.find((entry) => entry.id === id);
}

test("pairwise analyzer catches impossible IV total with 3-star or 4-star appraisal", () => {
  const ivRule = rule("iv-high-bulk-bands");
  const threeStar = { id: "test-three-star", family: "appraisal", pool: "core", search: "3*" };
  const fourStar = rule("appraisal-perfect");
  assert.equal(review.classifyPair(ivRule, threeStar).classification, "CONFIRMED_INVALID");
  assert.equal(review.classifyPair(ivRule, fourStar).classification, "CONFIRMED_INVALID");
  assert.equal(review.classifyPair(rule("appraisal-high"), rule("iv-high-defense")).classification, "COMPATIBLE",
    "unconstrained Attack and HP IVs can make the high Defense band compatible with 3-star appraisal");
  assert.equal(review.classifyPair({ id: "star-3", family: "appraisal", search: "3*" },
    { id: "star-4", family: "appraisal", search: "4*" }).classification, "CONFIRMED_INVALID",
  "3-star and 4-star are mutually exclusive exact appraisal categories");
});

test("hatch and Shadow/Purified overlap stays suspected, while trade is not treated as exclusive", () => {
  assert.equal(review.classifyPair(rule("hatched"), rule("shadow")).classification, "SUSPECTED_INVALID");
  assert.equal(review.classifyPair(rule("hatched"), rule("purified")).classification, "SUSPECTED_INVALID");
  const traded = review.classifyPair(rule("hatched"), rule("traded"));
  assert.equal(traded.classification, "FALSE_POSITIVE_CANDIDATE");
  assert.ok(traded.secondaryFlags.includes("TRADED_ORIGIN_NOT_EXCLUSIVE"));
});

test("negative location-background exclusion is not warned as scarce-positive", () => {
  const result = review.classifyPair(rule("exclude-location-background"), rule("shiny"));
  assert.equal(result.classification, "FALSE_POSITIVE_CANDIDATE");
  assert.ok(result.secondaryFlags.includes("NEGATIVE_RULE_NOT_SCARCE"));
  assert.match(result.reasons.join(" "), /Negative trait restriction broadens eligibility/);
});

test("CP interval pairs are invalid only when their numeric intersection is empty", () => {
  assert.equal(review.classifyPair(rule("cp-500"), rule("cp-1000-1500")).classification, "CONFIRMED_INVALID");
  assert.notEqual(review.classifyPair(rule("cp-1000-1500"), rule("cp-1500-plus")).classification, "CONFIRMED_INVALID",
    "the inclusive boundary at 1500 can still overlap");
});

test("exclusive generator metadata does not automatically become a semantic contradiction", () => {
  assert.notEqual(review.classifyPair(rule("shadow"), rule("not-purified")).classification, "SUSPECTED_INVALID");
  assert.notEqual(review.classifyPair(rule("size-xl-group"), rule("size-xxl")).classification, "SUSPECTED_INVALID");
  assert.equal(review.classifyPair(rule("size-xl-group"), rule("size-xs-group")).classification, "SUSPECTED_INVALID");
});

test("OR composition keeps candidate alternatives grouped beside shared AND constraints", () => {
  const combined = utils.combineSearch(["cp0-1500", "rock&!@rock", "xxl,xxs"]);
  assert.equal(combined, "cp0-1500&rock&!@rock&xxl,xxs");
  const groups = utils.validateSearchExpression(combined).groups;
  assert.deepEqual(groups, [["cp0-1500"], ["rock"], ["!@rock"], ["xxl", "xxs"]]);
  assert.ok(review.tokenizeDnf(combined).clauses.every((branch) => branch.includes("cp0-1500")));
});

test("Pain Cup compact candidate OR keeps shared CP in every semantic branch", () => {
  const result = review.checkGenerationRecord({ search: "1,2&cp0-1500&!legendary" }, {
    leagueId: "great", cup: { dynamicFilter: "pvpoke-bottom-rankings" }
  });
  assert.equal(result.cpPreserved, true);
  assert.equal(result.orPrecedenceAmbiguous, false);
  assert.equal(result.cpPreservationUnderCompactCupGrouping, true);
  assert.equal(result.branchCount, 2);
});

test("balanced configuration plan rotates profiles within each configuration", () => {
  const configurations = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const plan = review.createBalancedPlan(configurations, 18);
  for (const configuration of configurations) {
    const counts = plan.filter((item) => item.config.id === configuration.id)
      .reduce((result, item) => (result[item.profile] = (result[item.profile] || 0) + 1, result), {});
    assert.deepEqual(counts, { chill: 2, spicy: 2, chaos: 2 });
  }
});

test("seeded random stream and exhaustive catalog are stable", () => {
  const first = review.seededRandom(20261105);
  const second = review.seededRandom(20261105);
  assert.deepEqual(Array.from({ length: 5 }, first), Array.from({ length: 5 }, second));
  const catalog = review.makePairCatalog();
  assert.ok(catalog.length > 200);
  assert.ok(catalog.some((entry) => entry.id === "variant-buddy-0-5"));
  assert.ok(catalog.some((entry) => entry.id === "variant-appraisal-3-star"));
  assert.ok(catalog.some((entry) => entry.id === "variant-ban-move-grass"));
});

test("review classifications are stable and do not repeat when multiple checks find the same issue", () => {
  assert.deepEqual(review.uniqueClassifications(["CONFIRMED_INVALID", "FALSE_POSITIVE_CANDIDATE", "CONFIRMED_INVALID"]),
    ["CONFIRMED_INVALID", "FALSE_POSITIVE_CANDIDATE"]);
});
