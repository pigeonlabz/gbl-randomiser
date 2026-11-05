(function (root) {
  const TYPE_LEANING_MULTIPLIERS = Object.freeze({ balanced: 2, light: 2, medium: 4, strong: 8 });

  function weightedPick(items, weightFor, random = Math.random) {
    const weighted = items.map((item) => ({ item: item, weight: weightFor(item) })).filter((entry) => entry.weight > 0);
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    if (!total) return null;
    let threshold = random() * total;
    for (const entry of weighted) {
      threshold -= entry.weight;
      if (threshold < 0) return entry.item;
    }
    return weighted[weighted.length - 1].item;
  }

  function typeWeight(type, preferredTypes, strength, enabled) {
    if (!enabled) return 1;
    const preferred = preferredTypes.map((value) => String(value).toLowerCase());
    return preferred.includes(String(type).toLowerCase())
      ? TYPE_LEANING_MULTIPLIERS[strength] || TYPE_LEANING_MULTIPLIERS.medium
      : 1;
  }

  function typeLeaningScopeEnabled(scope, selectedTypeCount, pokemonEnabled, moveEnabled) {
    if (!selectedTypeCount) return false;
    return scope === "pokemon" ? pokemonEnabled : moveEnabled;
  }

  function leagueCpUiState(leagueId, preference, checked, disabled) {
    const isMaster = leagueId === "master";
    const savedPreference = isMaster && !disabled ? Boolean(checked) : Boolean(preference);
    return {
      enabled: !isMaster,
      checked: !isMaster && savedPreference,
      preference: savedPreference
    };
  }

  function shouldGenerateMutators(cupSelected, includeMutators) {
    return !cupSelected || Boolean(includeMutators);
  }

  function mutatorModeTransition(previousEnabled, nextEnabled) {
    return {
      changed: Boolean(previousEnabled) !== Boolean(nextEnabled),
      shouldClear: Boolean(previousEnabled) && !Boolean(nextEnabled),
      shouldRegenerate: !Boolean(previousEnabled) && Boolean(nextEnabled)
    };
  }

  function weightedSample(values, count, weightFor, random = Math.random) {
    const remaining = values.slice();
    const selected = [];
    const sampleCount = Math.max(0, Math.min(remaining.length, Math.floor(count)));
    for (let index = 0; index < sampleCount; index += 1) {
      const item = weightedPick(remaining, weightFor, random);
      if (item == null) break;
      selected.push(item);
      remaining.splice(remaining.indexOf(item), 1);
    }
    return selected;
  }

  function canAddRule(rule, selected) {
    if (selected.some((chosen) =>
      chosen.id === rule.id ||
      chosen.family === rule.family ||
      (rule.exclusiveGroup && chosen.exclusiveGroup === rule.exclusiveGroup)
    )) return false;
    const hasTypeRule = selected.some((chosen) => chosen.family === "pokemon-type");
    const hasEffectivenessRule = selected.some((chosen) => chosen.family === "type-effectiveness");
    if ((rule.family === "pokemon-type" && hasEffectivenessRule) ||
        (rule.family === "type-effectiveness" && hasTypeRule)) return false;
    const individualIvFamilies = ["iv-attack", "iv-defense", "iv-hp"];
    if ((rule.family === "iv-combo" && selected.some((chosen) => individualIvFamilies.includes(chosen.family))) ||
        (individualIvFamilies.includes(rule.family) && selected.some((chosen) => chosen.family === "iv-combo"))) return false;
    return true;
  }

  function chooseRule(pool, options = {}) {
    const groupIdFor = options.groupIdFor || ((rule) => rule.weightGroup || rule.family);
    const groupWeightFor = options.groupWeightFor || (() => 1);
    const ruleWeightFor = options.ruleWeightFor || (() => 1);
    const random = options.random || Math.random;
    const groups = new Map();
    pool.forEach((rule) => {
      const groupId = groupIdFor(rule);
      if (!groups.has(groupId)) groups.set(groupId, []);
      groups.get(groupId).push(rule);
    });
    const groupChoices = Array.from(groups.entries()).map(([groupId, groupRules]) => ({
      groupId: groupId,
      rules: groupRules,
      weight: groupRules.reduce((sum, rule) => sum + groupWeightFor(rule), 0) / groupRules.length
    }));
    const selectedGroup = weightedPick(groupChoices, (entry) => entry.weight, random);
    return selectedGroup ? weightedPick(selectedGroup.rules, ruleWeightFor, random) : null;
  }

  function chooseChallengeRule(pool, options = {}) {
    return chooseRule(pool.filter((rule) => rule.role !== "disqualifier_only"), options);
  }

  function chooseOptionalDisqualifier(pool, options = {}) {
    const random = options.random || Math.random;
    const chance = Math.max(0, Math.min(1, Number(options.chance) || 0));
    if (random() >= chance) return null;
    const disqualifiers = pool.filter((rule) => rule.role === "disqualifier_only");
    return chooseRule(disqualifiers, options);
  }

  function splitSearchLevel(value, delimiters) {
    const parts = [];
    let quote = "";
    let escaped = false;
    let start = 0;
    for (let index = 0; index < value.length; index += 1) {
      const character = value[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (quote) {
        if (character === quote) quote = "";
        continue;
      }
      if (character === "\"") {
        quote = character;
        continue;
      }
      if (delimiters.includes(character)) {
        parts.push(value.slice(start, index).trim());
        start = index + 1;
      }
    }
    if (quote) return { parts: [], error: "Close the quote in this search expression." };
    parts.push(value.slice(start).trim());
    return { parts: parts, error: "" };
  }

  function hasUnquotedGrouping(value) {
    let quote = "";
    let escaped = false;
    for (const character of value) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (quote) {
        if (character === quote) quote = "";
        continue;
      }
      if (character === "\"") quote = character;
      else if (character === "(" || character === ")") return true;
    }
    return false;
  }

  function validateSearchExpression(expression) {
    const value = String(expression == null ? "" : expression).trim();
    if (!value) return { valid: true, normalized: "", groups: [], error: "" };
    if (hasUnquotedGrouping(value)) {
      return { valid: false, normalized: "", groups: [], error: "Parentheses cannot group Pokémon GO searches. Use comma-separated OR groups joined with &." };
    }

    const andParts = splitSearchLevel(value, "&|");
    if (andParts.error) return { valid: false, normalized: "", groups: [], error: andParts.error };
    const groups = [];
    for (const group of andParts.parts) {
      if (!group) return { valid: false, normalized: "", groups: [], error: "Add a search term on both sides of each AND separator." };
      const orParts = splitSearchLevel(group, ",;:");
      if (orParts.error) return { valid: false, normalized: "", groups: [], error: orParts.error };
      if (orParts.parts.some((term) => !term || term === "!")) {
        return { valid: false, normalized: "", groups: [], error: "Add a search term on both sides of each OR separator and after each exclusion marker." };
      }
      groups.push(orParts.parts);
    }
    const normalized = groups.map((terms) => terms.join(",")).join("&");
    return { valid: true, normalized: normalized, groups: groups, error: "" };
  }

  function stripCpTerms(expression) {
    const parsed = validateSearchExpression(expression);
    if (!parsed.valid || !parsed.groups.length) return "";
    const groups = parsed.groups.filter((terms) => {
      const cpTerms = terms.filter((term) => /^!?cp(?:$|[-\d])/i.test(term));
      if (!cpTerms.length) return true;
      if (cpTerms.length !== terms.length) {
        throw new Error("A CP search joined to OR alternatives cannot be separated from Cup eligibility. Rewrite the Cup filter so CP is its own AND condition.");
      }
      return false;
    });
    return groups.map((terms) => terms.join(",")).join("&");
  }

  function removeSearchTerms(expression, removedTerms) {
    const parsed = validateSearchExpression(expression);
    if (!parsed.valid || !parsed.groups.length) return "";
    const removed = new Set((Array.isArray(removedTerms) ? removedTerms : [removedTerms])
      .map((term) => String(term || "").replace(/^!+/, "").toLowerCase()).filter(Boolean));
    const groups = parsed.groups.filter((terms) => {
      const remaining = terms.filter((term) => !removed.has(term.replace(/^!+/, "").toLowerCase()));
      if (remaining.length && remaining.length !== terms.length) {
        throw new Error("A term joined to OR alternatives cannot be removed without changing the group's meaning.");
      }
      return remaining.length > 0;
    });
    return groups.map((terms) => terms.join(",")).join("&");
  }

  function sizeSearchForSelection(includeXL, includeXXL) {
    const terms = [];
    if (includeXL) terms.push("xl");
    if (includeXXL) terms.push("xxl");
    return terms.join(",");
  }

  function combineSearch(parts) {
    const expressions = parts.map((part) => String(part == null ? "" : part).trim()).filter(Boolean);
    if (!expressions.length) return "";

    const groups = [];
    for (const expression of expressions) {
      const parsed = validateSearchExpression(expression);
      if (!parsed.valid) throw new Error(parsed.error);
      for (const terms of parsed.groups) {
        const uniqueTerms = terms.filter((term, index) =>
          terms.findIndex((candidate) => candidate.toLowerCase() === term.toLowerCase()) === index);
        const key = uniqueTerms.map((term) => term.toLowerCase()).sort().join("\u0000");
        if (!groups.some((existing) => existing.key === key)) {
          groups.push({ key: key, terms: uniqueTerms });
        }
      }
    }
    const cpGroups = [];
    groups.forEach((group, index) => {
      if (group.terms.length !== 1) return;
      const match = /^cp(\d+)?(?:-(\d*))?$/i.exec(group.terms[0]);
      if (!match || match[1] == null && match[2] == null) return;
      const minCp = match[1] == null ? 0 : Number(match[1]);
      const maxCp = match[2] == null ? (match[1] == null ? Infinity : minCp) : match[2] === "" ? Infinity : Number(match[2]);
      cpGroups.push({ index, minCp, maxCp });
    });
    if (cpGroups.length > 1) {
      const minCp = Math.max(...cpGroups.map((range) => range.minCp));
      const maxCp = Math.min(...cpGroups.map((range) => range.maxCp));
      if (minCp > maxCp) throw new Error("The combined CP search constraints have no overlapping values.");
      const firstIndex = cpGroups[0].index;
      const cpTerm = minCp === maxCp ? "cp" + minCp : cpSearchForRange(minCp, maxCp);
      groups[firstIndex] = { key: cpTerm.toLowerCase(), terms: [cpTerm] };
      const redundantIndexes = new Set(cpGroups.slice(1).map((range) => range.index));
      for (let index = groups.length - 1; index >= 0; index -= 1) {
        if (redundantIndexes.has(index)) groups.splice(index, 1);
      }
    }
    const termCount = groups.reduce((count, group) => count + group.terms.length, 0);
    if (termCount > 4096) throw new Error("This filter has too many OR alternatives. Simplify one of its search expressions.");
    return groups.map((group) => group.terms.join(",")).join("&");
  }

  function cpSearchForRange(minCp, maxCp) {
    if (maxCp === Infinity) return minCp > 0 ? "cp" + minCp + "-" : "";
    if (minCp <= 0) return "cp0-" + maxCp;
    return "cp" + minCp + "-" + maxCp;
  }

  function normalizeCpConstraint(league, selectedRules) {
    const generatedRule = selectedRules.find((rule) => rule.family === "cp") || null;
    if (!generatedRule) {
      return {
        generatedRule: null,
        minCp: league.minCp == null ? 0 : league.minCp,
        maxCp: league.maxCp == null ? Infinity : league.maxCp,
        search: league.search
      };
    }

    const leagueMin = league.minCp == null ? 0 : league.minCp;
    const leagueMax = league.maxCp == null ? Infinity : league.maxCp;
    const generatedMin = generatedRule.minCp == null ? 0 : generatedRule.minCp;
    const generatedMax = generatedRule.maxCp == null ? Infinity : generatedRule.maxCp;
    const minCp = Math.max(leagueMin, generatedMin);
    const maxCp = Math.min(leagueMax, generatedMax);
    if (minCp > maxCp) {
      return {
        generatedRule: null,
        minCp: leagueMin,
        maxCp: leagueMax,
        search: league.search
      };
    }
    const unchanged = minCp === generatedMin && maxCp === generatedMax;

    return {
      generatedRule: generatedRule,
      minCp: minCp,
      maxCp: maxCp,
      search: unchanged ? generatedRule.search : cpSearchForRange(minCp, maxCp)
    };
  }

  function leagueWithOptionalCpLimit(league, enabled) {
    if (enabled && league.maxCp) return league;
    return Object.assign({}, league, { minCp: null, maxCp: null, search: "" });
  }

  function isAllowedForLeague(rule, league) {
    if (!league.maxCp || rule.family !== "cp") return true;
    if (rule.minCp != null && rule.minCp >= league.maxCp) return false;
    if (rule.minCp == null && rule.maxCp != null && rule.maxCp >= league.maxCp) return false;
    return true;
  }

  const api = Object.freeze({
    TYPE_LEANING_MULTIPLIERS: TYPE_LEANING_MULTIPLIERS,
    weightedPick: weightedPick,
    typeWeight: typeWeight,
    typeLeaningScopeEnabled: typeLeaningScopeEnabled,
    leagueCpUiState: leagueCpUiState,
    shouldGenerateMutators: shouldGenerateMutators,
    mutatorModeTransition: mutatorModeTransition,
    weightedSample: weightedSample,
    canAddRule: canAddRule,
    chooseRule: chooseRule,
    chooseChallengeRule: chooseChallengeRule,
    chooseOptionalDisqualifier: chooseOptionalDisqualifier,
    validateSearchExpression: validateSearchExpression,
    removeSearchTerms: removeSearchTerms,
    stripCpTerms: stripCpTerms,
    combineSearch: combineSearch,
    sizeSearchForSelection: sizeSearchForSelection,
    cpSearchForRange: cpSearchForRange,
    normalizeCpConstraint: normalizeCpConstraint,
    leagueWithOptionalCpLimit: leagueWithOptionalCpLimit,
    isAllowedForLeague: isAllowedForLeague
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GBL_RANDOMISER_UTILS = api;
})(typeof window !== "undefined" ? window : globalThis);
