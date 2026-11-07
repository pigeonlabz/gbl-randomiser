(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GBL_CUP_DISCOVERY = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function shuffled(items, random) {
    const result = items.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const value = Math.max(0, Math.min(0.999999999, Number(random()) || 0));
      const swapIndex = Math.floor(value * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function chooseSuggestions(cups, random) {
    const randomValue = typeof random === "function" ? random : Math.random;
    const available = [];
    const knownIds = new Set();
    (Array.isArray(cups) ? cups : []).forEach((cup) => {
      if (!cup || !cup.id || knownIds.has(cup.id)) return;
      knownIds.add(cup.id);
      available.push(cup);
    });

    const selected = [];
    const selectedIds = new Set();
    function take(pool, count, slot) {
      shuffled(pool.filter((cup) => !selectedIds.has(cup.id)), randomValue)
        .slice(0, count)
        .forEach((cup) => {
          selected.push({ id: cup.id, slot: slot });
          selectedIds.add(cup.id);
        });
    }

    take(available.filter((cup) => cup.official), 3, "official");
    take(available.filter((cup) => cup.origin === "homegrown"), 2, "homegrown");
    take(available, 1, "wildcard");
    take(available, Math.max(0, 6 - selected.length), "wildcard");

    return shuffled(selected, randomValue);
  }

  return Object.freeze({ chooseSuggestions: chooseSuggestions });
});
