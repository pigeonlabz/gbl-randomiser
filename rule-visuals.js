(() => {
  const TYPE_SET = new Set([
    "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
    "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
  ]);
  const DEFAULT_BACKGROUND_TYPES = ["steel", "water", "fairy"];
  const ICON_BY_FAMILY = {
    "visual-status": "shiny",
    rarity: "rare",
    cp: "cp",
    region: "region",
    age: "recent",
    "size-xl": "xl",
    "size-xs": "xs",
    "meta-moves": "meta-ban",
    mega: "mega",
    "mega-level": "mega-level",
    buddy: "buddy",
    "move-weather": "weather"
  };

  function resolve(rule) {
    const id = String(rule?.id || "");
    const family = String(rule?.family || "");
    const meta = rule?.meta || {};
    const isBanned = id.startsWith("type-banned-") || id.startsWith("move-type-banned-") ||
      id.startsWith("region-banned-") || id === "not-shadow" || id === "not-purified" ||
      (Array.isArray(rule?.tags) && rule.tags.includes("ban-shadow"));

    if (family === "pokemon-type" || family === "move-type" || family === "move-slot") {
      const rawTypes = Array.isArray(meta.types) ? meta.types
        : Array.isArray(meta.move_types) ? meta.move_types : [];
      const types = rawTypes.map((type) => String(type).toLowerCase()).filter((type) => TYPE_SET.has(type));
      if (types.length) return { kind: "types", types, move: family !== "pokemon-type", banned: isBanned };
    }

    if (family === "rocket-status") {
      if (id === "shadow" || id === "not-shadow") return { kind: "rule", icon: "shadow", banned: id === "not-shadow" };
      if (id === "purified" || id === "not-purified") return { kind: "rule", icon: "purified", banned: id === "not-purified" };
    }

    if (ICON_BY_FAMILY[family]) {
      return { kind: "rule", icon: ICON_BY_FAMILY[family], banned: family === "region" && isBanned };
    }

    return { kind: "fallback", banned: false };
  }

  function backgroundTypes(rules) {
    const selected = [];
    (Array.isArray(rules) ? rules : []).forEach((rule) => {
      const meta = rule?.meta || {};
      const candidates = Array.isArray(meta.types) ? meta.types
        : Array.isArray(meta.move_types) ? meta.move_types : [];
      candidates.forEach((candidate) => {
        const type = String(candidate).toLowerCase();
        if (TYPE_SET.has(type) && !selected.includes(type) && selected.length < 3) selected.push(type);
      });
    });
    return selected.length ? selected : DEFAULT_BACKGROUND_TYPES.slice();
  }

  const visuals = { resolve, backgroundTypes, defaultBackgroundTypes: DEFAULT_BACKGROUND_TYPES.slice() };
  if (typeof window !== "undefined") window.GBL_RULE_VISUALS = visuals;
  if (typeof module !== "undefined" && module.exports) module.exports = visuals;
})();
