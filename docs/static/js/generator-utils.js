(function (root) {
  const TYPE_LEANING_MULTIPLIERS = Object.freeze({ light: 2, medium: 4, strong: 8 });

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

  function validateSearchExpression(expression) {
    const value = String(expression == null ? "" : expression).trim();
    if (!value) return { valid: true, normalized: "", alternatives: [], error: "" };

    const orParts = splitSearchLevel(value, ",;:");
    if (orParts.error) return { valid: false, normalized: "", alternatives: [], error: orParts.error };
    const alternatives = [];
    for (const branch of orParts.parts) {
      if (!branch) return { valid: false, normalized: "", alternatives: [], error: "Add a search term on both sides of each OR separator." };
      const andParts = splitSearchLevel(branch, "&");
      if (andParts.error) return { valid: false, normalized: "", alternatives: [], error: andParts.error };
      if (andParts.parts.some((term) => !term || term === "!")) {
        return { valid: false, normalized: "", alternatives: [], error: "Add a search term after each AND or exclusion marker." };
      }
      alternatives.push(andParts.parts);
    }
    const normalized = alternatives.map((terms) => terms.join("&")).join(",");
    return { valid: true, normalized: normalized, alternatives: alternatives, error: "" };
  }

  function combineSearch(parts) {
    const expressions = parts.map((part) => String(part == null ? "" : part).trim()).filter(Boolean);
    if (!expressions.length) return "";

    let clauses = [[]];
    for (const expression of expressions) {
      const parsed = validateSearchExpression(expression);
      if (!parsed.valid) throw new Error(parsed.error);
      let expanded = [];
      for (const clause of clauses) {
        for (const alternative of parsed.alternatives) {
          const terms = clause.slice();
          alternative.forEach((term) => {
            if (!terms.some((existing) => existing.toLowerCase() === term.toLowerCase())) terms.push(term);
          });
          if (!expanded.some((existing) => existing.join("&").toLowerCase() === terms.join("&").toLowerCase())) {
            expanded.push(terms);
          }
          if (expanded.length > 4096) throw new Error("This filter has too many OR combinations. Simplify one of its search expressions.");
        }
      }
      clauses = expanded;
    }
    return clauses.map((clause) => clause.join("&")).join(",");
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
    combineSearch: combineSearch,
    cpSearchForRange: cpSearchForRange,
    normalizeCpConstraint: normalizeCpConstraint,
    leagueWithOptionalCpLimit: leagueWithOptionalCpLimit,
    isAllowedForLeague: isAllowedForLeague
  });

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GBL_RANDOMISER_UTILS = api;
})(typeof window !== "undefined" ? window : globalThis);
