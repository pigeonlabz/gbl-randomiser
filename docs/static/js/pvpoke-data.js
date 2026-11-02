(function (root) {
  const SCHEMA_VERSION = 1;
  const SEARCH_BATCH_LIMIT = 200;
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
  const SNAPSHOT_KEY = "gblr.pvpoke.snapshot.v1";

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

  function getBottomRanked(dataset, limit) {
    const size = Math.max(1, Math.min(250, Number(limit) || 100));
    const rankings = getRankings(dataset, 1500);
    const indexes = indexDataset(dataset);
    const windowRows = rankings.slice(Math.max(0, rankings.length - size));
    const banned = [];
    const selected = [];
    const unmapped = [];
    windowRows.forEach((ranking) => {
      const species = indexes.speciesById.get(ranking.id);
      if (!species) {
        unmapped.push({ ranking, reason: "No exact speciesId match exists in the cached Game Master." });
        return;
      }
      const categories = asArray(species.tags).map((tag) => String(tag).toLowerCase());
      const blockedCategory = categories.find((category) => LEGENDARY_TAGS.has(category));
      if (blockedCategory) {
        banned.push({ ranking, species, category: blockedCategory });
        return;
      }
      selected.push({ ranking, species });
    });

    const allByDex = new Map();
    asArray(dataset && dataset.species).forEach((species) => {
      const key = String(species.dex);
      if (!allByDex.has(key)) allByDex.set(key, []);
      allByDex.get(key).push(species);
    });
    const terms = [];
    const ambiguous = [];
    selected.forEach(({ ranking, species }) => {
      const mapping = toGoSearchTerm(species, allByDex.get(String(species.dex)) || []);
      if (mapping.term) {
        terms.push({ id: species.id, name: species.name, dex: species.dex, rank: ranking.rank, term: mapping.term });
      } else {
        ambiguous.push({ id: species.id, name: species.name, dex: species.dex, rank: ranking.rank, reason: mapping.reason });
      }
    });
    const dedupedTerms = [];
    const seen = new Set();
    terms.forEach((item) => {
      if (seen.has(item.term)) return;
      seen.add(item.term);
      dedupedTerms.push(item);
    });
    const branches = dedupedTerms.map((item) => "!legendary&!mythical&!ultrabeast&" + item.term);
    const batches = packSearchBranches(branches, SEARCH_BATCH_LIMIT);
    return {
      requested: size,
      rankingWindowStart: windowRows.length ? windowRows[0].rank : null,
      rankingWindowEnd: windowRows.length ? windowRows[windowRows.length - 1].rank : null,
      candidates: windowRows.length,
      eligible: selected.length,
      mapped: dedupedTerms.length,
      banned,
      unmapped,
      ambiguous,
      terms: dedupedTerms,
      branches,
      batches,
      search: branches.join(","),
      snapshot: dataset && dataset.meta ? dataset.meta : null
    };
  }

  function toGoSearchTerm(species, sameDexSpecies) {
    const dex = String(species.dex);
    const ids = String(species.id || "").toLowerCase().split("_");
    const tags = asArray(species.tags).map((tag) => String(tag).toLowerCase());
    const name = String(species.name || "");
    const regionTerms = [];
    const formTokens = [];
    ids.forEach((token) => {
      if (REGION_FORMS[token]) regionTerms.push(REGION_FORMS[token]);
      else if (["shadow", "purified"].includes(token)) formTokens.push(token);
    });
    const paren = /\(([^)]+)\)/g;
    let match;
    while ((match = paren.exec(name))) {
      const labels = normalize(match[1]).split(/\s+/).filter(Boolean);
      for (const label of labels) {
        if (REGION_FORMS[label]) regionTerms.push(REGION_FORMS[label]);
        else if (["shadow", "purified"].includes(label)) formTokens.push(label);
        else return { term: "", reason: "The form label “" + match[1] + "” has no verified Pokémon GO search mapping." };
      }
    }
    if (tags.includes("shadow") && !formTokens.includes("shadow")) formTokens.push("shadow");
    if (tags.includes("purified") && !formTokens.includes("purified")) formTokens.push("purified");
    const qualifiers = Array.from(new Set(regionTerms.concat(formTokens)));
    const knownVariantIds = new Set(["shadow", "purified", "alolan", "alola", "galarian", "galar", "hisuian", "hisui", "paldean", "paldea"]);
    const baseSlug = normalize(name).replace(/ /g, "_");
    const hasUnrecognizedVariant = sameDexSpecies.length > 1 && !qualifiers.length &&
      String(species.id || "").toLowerCase() !== baseSlug;
    if (hasUnrecognizedVariant) return { term: "", reason: "The PvPoke identifier contains an unverified form distinction." };

    const sameDexUnmapped = sameDexSpecies.filter((candidate) => {
      if (candidate.id === species.id) return false;
      const candidateIds = String(candidate.id || "").toLowerCase().split("_");
      const candidateTags = asArray(candidate.tags).map((tag) => String(tag).toLowerCase());
      const candidateNameMatches = /\(([^)]+)\)/.exec(String(candidate.name || ""));
      const candidateQualifiers = candidateIds.filter((token) => knownVariantIds.has(token));
      if (candidateTags.some((tag) => ["shadow", "purified"].includes(tag)) && !candidateQualifiers.length) candidateQualifiers.push(candidateTags.find((tag) => ["shadow", "purified"].includes(tag)));
      if (candidateNameMatches && !candidateQualifiers.length) {
        const label = normalize(candidateNameMatches[1]).replace(/ /g, "");
        if (!REGION_FORMS[label] && !["shadow", "purified"].includes(label)) return true;
      }
      const candidateBaseSlug = normalize(candidate.name).replace(/ /g, "_");
      return candidateQualifiers.length === 0 && String(candidate.id || "").toLowerCase() !== candidateBaseSlug;
    });
    if (sameDexUnmapped.length) return { term: "", reason: "Another form shares this Pokédex number and cannot be separated with a verified search term." };

    const excluded = [];
    const presentQualifiers = new Set();
    sameDexSpecies.forEach((candidate) => {
      const candidateIds = String(candidate.id || "").toLowerCase().split("_");
      const candidateTags = asArray(candidate.tags).map((tag) => String(tag).toLowerCase());
      candidateIds.forEach((token) => {
        if (REGION_FORMS[token]) presentQualifiers.add(REGION_FORMS[token]);
        if (["shadow", "purified"].includes(token)) presentQualifiers.add(token);
      });
      candidateTags.filter((tag) => ["shadow", "purified"].includes(tag)).forEach((tag) => presentQualifiers.add(tag));
    });
    Array.from(presentQualifiers).sort().forEach((qualifier) => { if (!qualifiers.includes(qualifier)) excluded.push("!" + qualifier); });
    const queryTerms = [dex].concat(qualifiers, excluded);
    return { term: queryTerms.join("&"), reason: "" };
  }

  function packSearchBranches(branches, maxLength) {
    const limit = Math.max(1, Number(maxLength) || SEARCH_BATCH_LIMIT);
    const batches = [];
    let current = "";
    for (const branch of branches) {
      if (branch.length > limit) return { valid: false, batches: [], error: "A single Pokémon GO search clause exceeds the " + limit + " character batch limit." };
      const candidate = current ? current + "," + branch : branch;
      if (candidate.length > limit) {
        batches.push(current);
        current = branch;
      } else {
        current = candidate;
      }
    }
    if (current) batches.push(current);
    return { valid: true, batches, error: "" };
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
    const storage = settings.storage || (root && root.sessionStorage);
    const fetcher = settings.fetch || (root && root.fetch ? root.fetch.bind(root) : null);
    if (!fetcher) return Promise.resolve({ dataset: makeFallbackDataset(root && root.GBL_SPECIES_DATA), source: "fallback", warning: "PvPoke data could not be loaded in this browser." });
    try {
      const cached = storage && storage.getItem(SNAPSHOT_KEY);
      if (cached) {
        const dataset = JSON.parse(cached);
        const validation = validateDataset(dataset);
        if (validation.valid) return Promise.resolve({ dataset, source: "tab snapshot", warning: "" });
      }
    } catch (error) {
      // Browser storage can be disabled or full; the local JSON fetch remains available.
    }
    return fetcher(datasetUrl || "./static/data/pvpoke-v1.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("PvPoke dataset request failed (" + response.status + ").");
        return response.json();
      })
      .then((dataset) => {
        const validation = validateDataset(dataset);
        if (!validation.valid) throw new Error(validation.errors.join(" "));
        try { if (storage) storage.setItem(SNAPSHOT_KEY, JSON.stringify(dataset)); } catch (error) { /* Keep the validated data in memory for this page. */ }
        return { dataset, source: "local snapshot", warning: "" };
      })
      .catch((error) => ({
        dataset: makeFallbackDataset(root && root.GBL_SPECIES_DATA),
        source: "fallback",
        warning: "Cached PvPoke data is unavailable. Ranking cups are disabled until a valid local snapshot is restored. " + error.message
      }));
  }

  function clearPinnedSnapshot(storage) {
    try { (storage || (root && root.sessionStorage)).removeItem(SNAPSHOT_KEY); } catch (error) { /* The next page load will still use the tab's in-memory data. */ }
  }

  function pinDataset(dataset, storage) {
    const validation = validateDataset(dataset);
    if (!validation.valid) return false;
    try {
      const target = storage || (root && root.sessionStorage);
      if (!target) return false;
      target.setItem(SNAPSHOT_KEY, JSON.stringify(dataset));
      return true;
    } catch (error) {
      return false;
    }
  }

  const api = Object.freeze({
    SCHEMA_VERSION,
    SEARCH_BATCH_LIMIT,
    validateDataset,
    indexDataset,
    getSpecies,
    getMove,
    getRankings,
    getMetaMadnessCandidates,
    searchSpecies,
    getBottomRanked,
    toGoSearchTerm,
    packSearchBranches,
    makeFallbackDataset,
    load,
    clearPinnedSnapshot,
    pinDataset
  });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GBL_PVPOKE_DATA = api;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : null));
