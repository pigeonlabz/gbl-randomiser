(function (root) {
  const SCHEMA_VERSION = 1;
  const TYPES = new Set([
    "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
    "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
  ]);
  const LEGENDARY_TAGS = new Set(["legendary", "mythical", "ultrabeast"]);
  const REGION_FORMS = Object.freeze({
    alolan: "alola", alola: "alola",
    galarian: "galar", galar: "galar",
    hisuian: "hisui", hisui: "hisui",
    paldean: "paldea", paldea: "paldea"
  });

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function validateDataset(dataset) {
    const errors = [];
    if (!dataset || typeof dataset !== "object" || Array.isArray(dataset)) {
      return { valid: false, errors: ["Dataset must be a JSON object."] };
    }
    if (dataset.schemaVersion !== SCHEMA_VERSION) errors.push("Unsupported PvPoke dataset schema version.");
    if (!dataset.meta || typeof dataset.meta !== "object" || !dataset.meta.sourceRevision) {
      errors.push("Dataset source revision metadata is missing.");
    }
    if (!Array.isArray(dataset.species) || dataset.species.length < 100) errors.push("Species data is missing or incomplete.");
    if (!Array.isArray(dataset.moves) || dataset.moves.length < 50) errors.push("Move data is missing or incomplete.");
    if (!Array.isArray(dataset.rankings) || dataset.rankings.length < 250) errors.push("Great League overall rankings are missing or incomplete.");
    if (errors.length) return { valid: false, errors };

    const speciesIds = new Set();
    for (const species of dataset.species) {
      if (!species || typeof species.id !== "string" || !species.id || speciesIds.has(species.id)) {
        errors.push("Species identifiers must be present and unique.");
        break;
      }
      speciesIds.add(species.id);
      if (!Number.isInteger(Number(species.dex)) || Number(species.dex) < 1) errors.push("Species " + species.id + " has no valid Pokédex number.");
      if (!Array.isArray(species.types) || !species.types.length || species.types.some((type) => !TYPES.has(type))) errors.push("Species " + species.id + " has invalid typing data.");
      if (!species.baseStats || !["attack", "defense", "stamina"].every((key) => Number.isFinite(Number(species.baseStats[key])))) {
        errors.push("Species " + species.id + " has invalid base stats.");
      }
      if (!Array.isArray(species.fastMoves) || !Array.isArray(species.chargedMoves)) errors.push("Species " + species.id + " has invalid move lists.");
      if (!Array.isArray(species.tags)) errors.push("Species " + species.id + " has invalid category tags.");
      if (errors.length > 8) break;
    }

    const moveIds = new Set();
    for (const move of dataset.moves) {
      if (!move || typeof move.id !== "string" || !move.id || moveIds.has(move.id) || !TYPES.has(move.type) || !move.name) {
        errors.push("Move identifiers, names, and types must be present and unique.");
        break;
      }
      moveIds.add(move.id);
    }

    for (const species of dataset.species) {
      const ids = asArray(species.fastMoves).concat(asArray(species.chargedMoves), asArray(species.legacyMoves), asArray(species.eliteMoves));
      if (ids.some((id) => !moveIds.has(id))) {
        errors.push("Species " + species.id + " refers to a move missing from the dataset.");
        break;
      }
    }

    const rankingIds = new Set();
    for (const ranking of dataset.rankings) {
      if (!ranking || typeof ranking.id !== "string" || !ranking.id || !Number.isInteger(ranking.rank) || ranking.rank < 1 || rankingIds.has(ranking.id)) {
        errors.push("Ranking identifiers and rank positions must be present and unique.");
        break;
      }
      rankingIds.add(ranking.id);
    }
    return { valid: errors.length === 0, errors };
  }

  function indexDataset(dataset) {
    return {
      speciesById: new Map(asArray(dataset && dataset.species).map((species) => [species.id, species])),
      movesById: new Map(asArray(dataset && dataset.moves).map((move) => [move.id, move])),
      rankingById: new Map(asArray(dataset && dataset.rankings).map((ranking) => [ranking.id, ranking]))
    };
  }

  function getSpecies(dataset, id) {
    return indexDataset(dataset).speciesById.get(String(id || "")) || null;
  }

  function getMove(dataset, id) {
    return indexDataset(dataset).movesById.get(String(id || "")) || null;
  }

  function getRankings(dataset, leagueCp) {
    const requested = Number(leagueCp || 1500);
    if (requested !== 1500) return [];
    return asArray(dataset && dataset.rankings).slice();
  }

  function getMetaMadnessCandidates(dataset) {
    const indexes = indexDataset(dataset);
    return asArray(dataset && dataset.species).map((species) => {
      const eliteMoves = new Set(asArray(species.eliteMoves));
      const qualifyingIds = Array.from(new Set(asArray(species.legacyMoves).concat(asArray(species.eliteMoves))))
        .filter((id) => !["RETURN", "FRUSTRATION"].includes(String(id).toUpperCase()));
      const qualifyingMoves = qualifyingIds.map((id) => {
        const move = indexes.movesById.get(id);
        return move ? { id, name: move.name, type: move.type, access: eliteMoves.has(id) ? "Elite TM or legacy" : "legacy / event-exclusive" } : null;
      }).filter(Boolean);
      return qualifyingMoves.length ? { species, qualifyingMoves } : null;
    }).filter(Boolean);
  }

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function searchSpecies(dataset, query, limit) {
    const needle = normalize(query);
    if (!needle) return [];
    const indexes = indexDataset(dataset);
    const rankingById = indexes.rankingById;
    const moveNameById = indexes.movesById;
    const take = Math.max(1, Math.min(100, Number(limit) || 12));
    const numericDex = /^#?(\d+)$/.exec(needle);
    const matches = asArray(dataset && dataset.species).map((species) => {
      const ranking = rankingById.get(species.id) || null;
      const moveNames = asArray(species.fastMoves).concat(asArray(species.chargedMoves))
        .map((moveId) => moveNameById.get(moveId)).filter(Boolean).map((move) => move.name);
      const haystack = normalize([
        species.name, species.id, species.dex, ...asArray(species.types), ...asArray(species.tags),
        ...moveNames, ranking ? "rank " + ranking.rank : ""
      ].join(" "));
      const score = numericDex
        ? (Number(species.dex) === Number(numericDex[1]) ? 1 : 0)
        : (haystack.includes(needle) ? 1 : 0);
      return score ? Object.assign({}, species, { ranking, matchedMoves: moveNames }) : null;
    }).filter(Boolean);
    matches.sort((first, second) => (first.ranking ? first.ranking.rank : Infinity) - (second.ranking ? second.ranking.rank : Infinity) || first.name.localeCompare(second.name));
    return matches.slice(0, take);
  }

  function getFormLabel(species, sameDexCount) {
    const name = String(species && species.name || "");
    const inName = name.match(/\(([^)]+)\)/g);
    if (inName) return inName.map((part) => part.slice(1, -1)).join(", ");
    const regionalName = /^(Alolan|Galarian|Hisuian|Paldean)\s+/i.exec(name);
    if (regionalName) return regionalName[1];
    const tags = asArray(species && species.tags).map((tag) => String(tag).toLowerCase());
    const speciesId = String(species && species.id || "").toLowerCase();
    const idParts = speciesId.split("_");
    const knownForm = idParts.find((part) => REGION_FORMS[part] || ["shadow", "purified"].includes(part));
    if (knownForm) return knownForm;
    if (tags.includes("shadow") || tags.includes("purified")) return tags.find((tag) => tag === "shadow" || tag === "purified");
    if (speciesId === normalize(name).replace(/ /g, "_")) return "Standard form";
    return sameDexCount > 1 ? "Form listed separately by PvPoke" : "Standard form";
  }

  function getBottomRanked(dataset, limit) {
    const size = Number(limit) === 250 ? 250 : 100;
    const rankings = getRankings(dataset, 1500);
    const indexes = indexDataset(dataset);
    const windowRows = rankings.slice(Math.max(0, rankings.length - size));
    const byDex = new Map();
    asArray(dataset && dataset.species).forEach((species) => {
      const key = String(species.dex);
      if (!byDex.has(key)) byDex.set(key, []);
      byDex.get(key).push(species);
    });

    const banned = [];
    const eligiblePokemon = [];
    const unmapped = [];
    windowRows.forEach((ranking) => {
      const species = indexes.speciesById.get(ranking.id);
      if (!species) {
        unmapped.push({ id: ranking.id, name: ranking.name, rank: ranking.rank, reason: "No exact speciesId match exists in the cached Game Master." });
        return;
      }
      const categories = asArray(species.tags).map((tag) => String(tag).toLowerCase().replace(/[^a-z]/g, ""));
      const blockedCategory = categories.find((category) => LEGENDARY_TAGS.has(category));
      if (blockedCategory) {
        banned.push({ id: species.id, name: species.name, dex: species.dex, rank: ranking.rank, category: blockedCategory });
        return;
      }
      eligiblePokemon.push({
        id: species.id,
        name: species.name,
        form: getFormLabel(species, (byDex.get(String(species.dex)) || []).length),
        dex: species.dex,
        rank: ranking.rank,
        types: asArray(species.types).slice()
      });
    });

    const dexes = Array.from(new Set(eligiblePokemon.map((species) => String(species.dex))))
      .filter((dex) => /^\d+$/.test(dex))
      .sort((first, second) => Number(first) - Number(second));
    return {
      requested: size,
      rankingWindowStart: windowRows.length ? windowRows[0].rank : null,
      rankingWindowEnd: windowRows.length ? windowRows[windowRows.length - 1].rank : null,
      candidates: windowRows.length,
      eligible: eligiblePokemon.length,
      eligiblePokemon,
      banned,
      unmapped,
      dexes,
      candidateCount: dexes.length,
      candidateSearch: dexes.join(","),
      approximate: true,
      snapshot: dataset && dataset.meta ? dataset.meta : null
    };
  }

  function buildPainCupSearch(selection, cpSearch, additionalGroups) {
    const dexes = Array.from(new Set(asArray(selection && selection.dexes).map((dex) => String(dex).trim()).filter((dex) => /^\d+$/.test(dex))))
      .sort((first, second) => Number(first) - Number(second));
    if (!dexes.length) return { valid: false, search: "", error: "No eligible Pokédex numbers are available for this ranking window." };
    const groups = [dexes.join(","), String(cpSearch || "cp-1500").trim(), "!legendary", "!mythical", "!ultrabeast"];
    asArray(additionalGroups).forEach((group) => {
      const value = String(group || "").trim();
      if (value) groups.push(value);
    });
    if (groups.some((group) => !group || group.split(/[&,]/).some((term) => !term.trim() || term.trim() === "!"))) {
      return { valid: false, search: "", error: "A Pokémon GO search group is empty or incomplete." };
    }
    return { valid: true, search: groups.join("&"), groups, error: "" };
  }

  function makeFallbackDataset(speciesRows) {
    return {
      schemaVersion: SCHEMA_VERSION,
      meta: { source: "Local species-name fallback", sourceRevision: "fallback", updatedAt: "", upstreamTimestamp: "", license: "" },
      species: asArray(speciesRows).map(([dex, name]) => ({ id: "dex-" + dex, dex, name, types: [], baseStats: {}, fastMoves: [], chargedMoves: [], legacyMoves: [], eliteMoves: [], tags: [] })),
      moves: [],
      rankings: []
    };
  }

  function load(datasetUrl, options) {
    const settings = options || {};
    const fetcher = settings.fetch || (root && root.fetch ? root.fetch.bind(root) : null);
    if (!fetcher) return Promise.resolve({ dataset: makeFallbackDataset(root && root.GBL_SPECIES_DATA), source: "fallback", warning: "PvPoke data could not be loaded in this browser." });
    return fetcher(datasetUrl || "./static/data/pvpoke-v1.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("PvPoke dataset request failed (" + response.status + ").");
        return response.json();
      })
      .then((dataset) => {
        const validation = validateDataset(dataset);
        if (!validation.valid) throw new Error(validation.errors.join(" "));
        return { dataset, source: "local snapshot", warning: "" };
      })
      .catch((error) => ({
        dataset: makeFallbackDataset(root && root.GBL_SPECIES_DATA),
        source: "fallback",
        warning: "Cached PvPoke data is unavailable. Ranking cups are disabled until a valid local snapshot is restored. " + error.message
      }));
  }

  const api = Object.freeze({
    SCHEMA_VERSION,
    validateDataset,
    indexDataset,
    getSpecies,
    getMove,
    getRankings,
    getMetaMadnessCandidates,
    searchSpecies,
    getBottomRanked,
    buildPainCupSearch,
    makeFallbackDataset,
    load
  });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GBL_PVPOKE_DATA = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : null));
