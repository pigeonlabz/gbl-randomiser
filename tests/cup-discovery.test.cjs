const assert = require("node:assert/strict");
const test = require("node:test");
const { chooseSuggestions } = require("../docs/static/js/cup-discovery.js");

function makeCups(officialCount, homegrownCount) {
  return [
    ...Array.from({ length: officialCount }, (_, index) => ({ id: "official-" + index, official: true })),
    ...Array.from({ length: homegrownCount }, (_, index) => ({ id: "homegrown-" + index, origin: "homegrown" }))
  ];
}

test("cup suggestions target three official, two homegrown and one wildcard Cup", () => {
  const suggestions = chooseSuggestions(makeCups(8, 6), () => 0.42);
  assert.equal(suggestions.length, 6);
  assert.equal(new Set(suggestions.map((suggestion) => suggestion.id)).size, 6);
  assert.equal(suggestions.filter((suggestion) => suggestion.slot === "official").length, 3);
  assert.equal(suggestions.filter((suggestion) => suggestion.slot === "homegrown").length, 2);
  assert.equal(suggestions.filter((suggestion) => suggestion.slot === "wildcard").length, 1);
});

test("cup suggestions rotate across fresh random selections", () => {
  let value = 0;
  const random = () => {
    value = (value + 0.137) % 1;
    return value;
  };
  const cups = makeCups(8, 6);
  const first = chooseSuggestions(cups, random).map((suggestion) => suggestion.id).sort();
  const second = chooseSuggestions(cups, random).map((suggestion) => suggestion.id).sort();
  assert.notDeepEqual(second, first);
});

test("cup suggestion counts adapt when a category has fewer choices", () => {
  const suggestions = chooseSuggestions(makeCups(2, 2), () => 0.25);
  assert.equal(suggestions.length, 4);
  assert.equal(new Set(suggestions.map((suggestion) => suggestion.id)).size, 4);
  assert.equal(suggestions.filter((suggestion) => suggestion.slot === "official").length, 2);
  assert.equal(suggestions.filter((suggestion) => suggestion.slot === "homegrown").length, 2);
});

test("duplicate catalogue IDs do not create duplicate suggestion cards", () => {
  const suggestions = chooseSuggestions([
    { id: "same", official: true },
    { id: "same", official: true },
    { id: "homegrown", origin: "homegrown" }
  ], () => 0.5);
  assert.equal(new Set(suggestions.map((suggestion) => suggestion.id)).size, suggestions.length);
  assert.deepEqual(new Set(suggestions.map((suggestion) => suggestion.id)), new Set(["same", "homegrown"]));
});
