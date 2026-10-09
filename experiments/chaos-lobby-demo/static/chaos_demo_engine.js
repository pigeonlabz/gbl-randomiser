"use strict";

// Browser-only generator. No fetch, production imports, persistence or build step.
(() => {
  const TYPES = ["normal", "fire", "water", "electric", "grass", "ice", "fighting",
    "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon",
    "dark", "steel", "fairy"];
  const LEAGUES = {
    "Great League": { cp_cap: 1500, search: "cp-1500" },
    "Ultra League": { cp_cap: 2500, search: "cp-2500" },
    "Master League": { cp_cap: null, search: "" },
  };

  // Edit/add role policy HERE. This is the only role definition structure.
  // Supported pools: broad, type, type_plus_filters. null rerolls = unlimited.
  const ROLE_DEFINITIONS = {
    Hunter: {
      description: "Ultra League with a broad Pokémon pool.",
      league: "Ultra League", pool: "broad", reroll_limit: 2,
      rules: ["Any Pokémon within your CP cap; no additional pool restrictions."], filters: [],
    },
    Specialist: {
      description: "One random type; dual types are allowed if that type matches.",
      league: null, pool: "type", reroll_limit: 2, rules: [], filters: [],
    },
    Purist: {
      description: "Great League without Legendary, Mythical or Ultra Beast Pokémon.",
      league: "Great League", pool: "broad", reroll_limit: 2,
      rules: ["No Legendary, Mythical or Ultra Beast Pokémon."],
      filters: ["!legendary", "!mythical", "!ultrabeast"],
    },
    Wildcard: {
      description: "A broad pool, but only one normal player reroll.",
      league: null, pool: "broad", reroll_limit: 1,
      rules: ["Any Pokémon within your CP cap; no additional pool restrictions."], filters: [],
    },
    Underdog: {
      description: "A random type plus extra restrictions, with four player rerolls.",
      league: null, pool: "type_plus_filters", reroll_limit: 4, rules: [], filters: [],
      extra_filter_choices: [
        { rules: ["No Shadow Pokémon."], filters: ["!shadow"] },
        { rules: ["No Legendary, Mythical or Ultra Beast Pokémon."],
          filters: ["!legendary", "!mythical", "!ultrabeast"] },
        { rules: ["No Shadow, Legendary, Mythical or Ultra Beast Pokémon."],
          filters: ["!shadow", "!legendary", "!mythical", "!ultrabeast"] },
      ],
    },
  };

  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const choose = (items, rng) => items[Math.floor(rng() * items.length)];
  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

  function validateSettings(settings = {}) {
    if (!isObject(settings)) throw new Error("Settings must be an object.");
    const league = settings.flexible_league ?? "random";
    if (league !== "random" && !has(LEAGUES, league)) throw new Error("Choose a valid flexible-role league or Random.");
    return { flexible_league: league };
  }

  function validateAssignment(assignment) {
    if (!isObject(assignment)) throw new Error("Assignment must be an object.");
    const { role, league, rules, reroll_limit: limit } = assignment;
    if (typeof role !== "string" || (!has(ROLE_DEFINITIONS, role) && role !== "Custom")) throw new Error("Choose a demo role or Custom.");
    if (typeof league !== "string" || !has(LEAGUES, league)) throw new Error("Choose a valid league.");
    if (!Array.isArray(rules) || rules.length < 1 || rules.length > 12 ||
      rules.some(rule => typeof rule !== "string" || !rule.trim() || rule.length > 300)) {
      throw new Error("Enter 1–12 rules, each 1–300 characters long.");
    }
    let search = assignment.search ?? "";
    if (typeof search !== "string" || search.length > 500) throw new Error("Search must be text of at most 500 characters.");
    if (limit !== null && (!Number.isInteger(limit) || limit < 0 || limit > 99)) throw new Error("Rerolls must be 0–99 or unlimited.");
    search = search.trim();
    const warnings = [];
    const complexSearch = /[,;:|()]/.test(search);
    const tokens = new Set(search.split("&").map(token => token.trim().toLowerCase()).filter(Boolean));
    if (search && (search.startsWith("&") || search.endsWith("&") || search.includes("&&"))) throw new Error("Search contains an empty AND condition.");
    if (!complexSearch) {
      if ([...tokens].some(token => token.startsWith("!") && tokens.has(token.slice(1)))) throw new Error("Search requires and excludes the same condition.");
      if (tokens.has("shadow") && tokens.has("purified")) throw new Error("A Pokémon cannot be both Shadow and Purified.");
      let cpMin = 10;
      let cpMax = Infinity;
      tokens.forEach(token => {
        const match = token.match(/^cp(?:(\d+)?-(\d+)?|(\d+))$/);
        if (!match) return;
        const low = match[3] || match[1];
        const high = match[3] || match[2];
        if (low) cpMin = Math.max(cpMin, Number(low));
        if (high) cpMax = Math.min(cpMax, Number(high));
      });
      if (cpMin > cpMax) throw new Error("Search CP conditions have no overlapping range.");
      const cap = LEAGUES[league].cp_cap;
      if (cap !== null && cpMin > cap) throw new Error("Search requires CP above this league's cap.");
      if (cap !== null && cpMax > cap) warnings.push("Search does not enforce the league cap; check CP manually.");
    } else {
      warnings.push("Complex custom search: compatibility has not been checked.");
    }
    if (!search) warnings.push("No search filter supplied; apply the written rules manually.");
    if (assignment.source === "manual") warnings.push("Host override: written rules and search may differ; verify both.");
    if (role === "Specialist" || role === "Underdog") warnings.push("Your collection may contain too few eligible Pokémon; use host recovery if needed.");
    return {
      role, league, rules: rules.map(rule => rule.trim()), search, reroll_limit: limit,
      source: assignment.source === "manual" ? "manual" : "generated", warnings,
    };
  }

  function generateAssignment(settings = {}, { role = null, exclude_role = null, rng = Math.random } = {}) {
    settings = validateSettings(settings);
    if (role === null) {
      const choices = Object.keys(ROLE_DEFINITIONS).filter(name => name !== exclude_role);
      role = choose(choices.length ? choices : Object.keys(ROLE_DEFINITIONS), rng);
    }
    if (typeof role !== "string" || !has(ROLE_DEFINITIONS, role)) throw new Error("Unknown demo role.");
    const definition = ROLE_DEFINITIONS[role];
    let league = definition.league || settings.flexible_league;
    if (league === "random") league = choose(Object.keys(LEAGUES), rng);
    const rules = [...definition.rules];
    const filters = [...definition.filters];
    if (definition.pool === "type" || definition.pool === "type_plus_filters") {
      const pokemonType = choose(TYPES, rng);
      rules.push(`Only ${pokemonType[0].toUpperCase() + pokemonType.slice(1)}-type Pokémon; matching dual types are allowed.`);
      filters.push(pokemonType);
    } else if (definition.pool !== "broad") {
      throw new Error(`Unsupported pool for ${role}.`);
    }
    if (definition.pool === "type_plus_filters") {
      const extra = choose(definition.extra_filter_choices, rng);
      rules.push(...extra.rules);
      filters.push(...extra.filters);
    }
    return validateAssignment({
      role, league, rules, search: [LEAGUES[league].search, ...filters].filter(Boolean).join("&"),
      reroll_limit: definition.reroll_limit, source: "generated",
    });
  }

  function generateRound(count, settings = {}, rng = Math.random) {
    if (!Number.isInteger(count) || count < 1 || count > 12) throw new Error("A demo round needs 1–12 players.");
    settings = validateSettings(settings);
    const roles = [];
    while (roles.length < count) {
      const bag = Object.keys(ROLE_DEFINITIONS);
      for (let index = bag.length - 1; index > 0; index--) {
        const target = Math.floor(rng() * (index + 1));
        [bag[index], bag[target]] = [bag[target], bag[index]];
      }
      roles.push(...bag);
    }
    return roles.slice(0, count).map(role => {
      try {
        return { assignment: generateAssignment(settings, { role, rng }), error: null };
      } catch {
        return { assignment: null, error: `Could not generate ${role}. Use host reroll or Edit to recover.` };
      }
    });
  }

  const engine = { roles: ROLE_DEFINITIONS, leagues: LEAGUES, generateAssignment, generateRound, validateAssignment };
  if (typeof module !== "undefined" && module.exports) module.exports = engine;
  else window.ChaosDemoEngine = engine;
})();
