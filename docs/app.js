(() => {
  const { leagues, rules, types, regions } = window.GBL_RULE_DATA;
  const form = document.getElementById("filter-form");
  const leagueSelect = document.getElementById("league-select");
  const mutatorCount = document.getElementById("mutator-count");
  const staticFilterInput = document.getElementById("static-filter");
  const ruleList = document.getElementById("rule-list");
  const searchOutput = document.getElementById("search-output");
  const copyButton = document.getElementById("copy-filter");
  const copyStatus = document.getElementById("copy-status");
  const generationNote = document.getElementById("generation-note");
  const customisedBadge = document.getElementById("advanced-customised");
  const resetAdvancedButton = document.getElementById("reset-advanced");

  const advancedFamilies = [
    { id: "shiny", label: "Shiny", ruleFamilies: ["visual-status"], primary: true },
    { id: "rarity", label: "Legendary / Mythical / Ultra Beast", ruleFamilies: ["rarity"], primary: true },
    { id: "cp", label: "CP restriction", ruleFamilies: ["cp"], primary: true },
    { id: "pokemon-type", label: "Pokémon typing", ruleFamilies: ["pokemon-type"], primary: true },
    { id: "region", label: "Region", ruleFamilies: ["region"], primary: true },
    { id: "move-typing", label: "Move typing", ruleFamilies: ["move-type", "move-slot"], primary: true },
    { id: "rocket-status", label: "Shadow / Purified", ruleFamilies: ["rocket-status"], primary: true },
    { id: "recent-catch", label: "Recent catch", ruleFamilies: ["age"], primary: true },
    { id: "xl-size", label: "XL / XXL", ruleFamilies: ["size-xl"], primary: true },
    { id: "xs-size", label: "XS / XXS", ruleFamilies: ["size-xs"], primary: true },
    { id: "buddy", label: "Buddy", ruleFamilies: ["buddy"], primary: true },
    { id: "weather", label: "Weather", ruleFamilies: ["move-weather"], primary: true },
    { id: "mega", label: "Mega", ruleFamilies: ["mega", "mega-level"], primary: true },
    { id: "meta-moves", label: "Meta move restrictions", ruleFamilies: ["meta-moves"], primary: true },
    { id: "type-matchups", label: "Type matchups", ruleFamilies: ["type-effectiveness"] },
    { id: "special-moves", label: "Special moves", ruleFamilies: ["move-special"] },
    { id: "acquisition", label: "Acquisition and origin", ruleFamilies: ["origin", "origin-special", "year"] },
    { id: "battle-stats", label: "Appraisal and battle stats", ruleFamilies: ["appraisal", "hp", "iv-attack", "iv-defense", "iv-hp", "iv-combo"] },
    { id: "collection", label: "Other collection traits", ruleFamilies: ["lucky", "costume", "candy", "candy-xl", "powered-xl", "distance", "background", "copy-count", "buddy-candy"] },
    { id: "special-forms", label: "Max and special forms", ruleFamilies: ["max", "max-count", "max-move", "special-status"] }
  ];

  const profileDefaults = {
    chill: {
      shiny: 3, rarity: 2, cp: 2, "pokemon-type": 9, region: 8, "move-typing": 5,
      "rocket-status": 4, "recent-catch": 6, "xl-size": 4, "xs-size": 4, buddy: 4,
      weather: 3, mega: 2, "meta-moves": 0, "type-matchups": 2, "special-moves": 3,
      acquisition: 4, "battle-stats": 3, collection: 2, "special-forms": 1
    },
    spicy: {
      shiny: 5, rarity: 5, cp: 5, "pokemon-type": 6, region: 4, "move-typing": 7,
      "rocket-status": 5, "recent-catch": 5, "xl-size": 5, "xs-size": 4, buddy: 5,
      weather: 6, mega: 5, "meta-moves": 4, "type-matchups": 5, "special-moves": 6,
      acquisition: 5, "battle-stats": 5, collection: 5, "special-forms": 4
    },
    chaos: {
      shiny: 5, rarity: 6, cp: 7, "pokemon-type": 4, region: 4, "move-typing": 8,
      "rocket-status": 5, "recent-catch": 5, "xl-size": 6, "xs-size": 5, buddy: 4,
      weather: 7, mega: 7, "meta-moves": 8, "type-matchups": 7, "special-moves": 6,
      acquisition: 6, "battle-stats": 7, collection: 7, "special-forms": 8
    }
  };

  const profilePoolWeights = {
    chill: { core: 8, spicy: 1.4, chaos: 0 },
    spicy: { core: 3, spicy: 6, chaos: 1.2 },
    chaos: { core: 2, spicy: 4, chaos: 7 }
  };

  const familySettingByRuleFamily = new Map();
  advancedFamilies.forEach((settingFamily) => {
    settingFamily.ruleFamilies.forEach((ruleFamily) => familySettingByRuleFamily.set(ruleFamily, settingFamily.id));
  });

  const familyControlElements = new Map();
  let familySettings = {};
  let currentState = null;
  let configPending = false;
  let copyFeedbackTimer = null;

  function currentRandomness() {
    return new FormData(form).get("randomness") || "chill";
  }

  function displayRule(rule) {
    const year = new Date().getFullYear();
    return {
      ...rule,
      settingFamily: familySettingByRuleFamily.get(rule.family) || "collection",
      search: rule.search
        .replaceAll("yearCURRENT", `year${year}`)
        .replaceAll("yearPREVIOUS", `year${year - 1}`)
    };
  }

  function randomInteger(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function sampleTerms(values, minCount, maxCount) {
    const shuffled = values.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInteger(0, index);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled.slice(0, randomInteger(minCount, maxCount)).sort();
  }

  function exclusionRule(id, family, values, termPrefix, noun) {
    const selected = sampleTerms(values, 1, Math.min(3, values.length));
    const names = selected.map((value) => value.charAt(0).toUpperCase() + value.slice(1));
    let label;
    let explain;
    if (family === "region") {
      label = `No Pokemon from ${names.join(" or ")}`;
      explain = `Exclude Pokemon from ${names.join(" or ")}.`;
    } else if (family === "move-type") {
      label = `No ${names.join(" or ")} type moves`;
      explain = `Exclude Pokemon that know ${names.join(" or ")} type moves.`;
    } else {
      label = `No ${names.join(" or ")} type Pokemon`;
      explain = `Exclude Pokemon with ${names.join(" or ")} typing.`;
    }
    return {
      id: `${id}-${selected.join("-")}`,
      family,
      settingFamily: familySettingByRuleFamily.get(family),
      pool: "core",
      scarcity: 1,
      label,
      explain,
      search: selected.map((value) => `!${termPrefix}${value}`).join("&")
    };
  }

  function allRules() {
    return rules
      .filter((rule) => rule.pool !== "reference")
      .map(displayRule)
      .concat([
        exclusionRule("type-banned", "pokemon-type", types, "", "types"),
        exclusionRule("region-banned", "region", regions, "", "regions"),
        exclusionRule("move-type-banned", "move-type", types, "@", "move types")
      ]);
  }

  function staticFilterValue() {
    return staticFilterInput.value.trim().replace(/^&+|&+$/g, "");
  }

  function isAllowedForLeague(rule, league) {
    if (!league.maxCp || rule.family !== "cp") return true;
    if (rule.minCp != null && rule.minCp >= league.maxCp) return false;
    if (rule.minCp == null && rule.maxCp != null && rule.maxCp >= league.maxCp) return false;
    return true;
  }

  function canAdd(rule, selected) {
    if (selected.some((chosen) =>
      chosen.id === rule.id ||
      chosen.family === rule.family ||
      (rule.exclusiveGroup && chosen.exclusiveGroup === rule.exclusiveGroup)
    )) return false;

    const hasTypeRule = selected.some((chosen) => chosen.family === "pokemon-type");
    const hasEffectivenessRule = selected.some((chosen) => chosen.family === "type-effectiveness");
    if ((rule.family === "pokemon-type" && hasEffectivenessRule) ||
        (rule.family === "type-effectiveness" && hasTypeRule)) return false;

    return true;
  }

  function ruleProfileWeight(rule, randomness) {
    const profile = randomness in profilePoolWeights ? randomness : "chill";
    const poolWeight = profilePoolWeights[profile][rule.pool] || 0;
    const setting = familySettings[rule.settingFamily];
    const defaultWeight = profileDefaults[profile][rule.settingFamily] ?? 1;
    // Preserve the profile's existing pool mix until a family weight is adjusted.
    // A manual increase can opt a family into a pool the profile normally omits.
    const optedInPoolWeight = poolWeight === 0 && setting && setting.weight !== defaultWeight ? 0.35 : poolWeight;
    const familyWeight = setting
      ? (defaultWeight === 0 ? setting.weight : setting.weight / defaultWeight)
      : 0;
    const scarcity = Math.max(0, (rule.scarcity || 1) - 1);
    return familyWeight * optedInPoolWeight / (1 + scarcity * 0.22);
  }

  function weightedPick(items, weightFor) {
    const weighted = items.map((item) => ({ item, weight: weightFor(item) })).filter((entry) => entry.weight > 0);
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    if (!total) return null;

    let threshold = Math.random() * total;
    for (const entry of weighted) {
      threshold -= entry.weight;
      if (threshold < 0) return entry.item;
    }
    return weighted[weighted.length - 1].item;
  }

  function chooseNextRule(pool, selected, randomness, league) {
    const availableGroups = new Map();
    pool.forEach((rule) => {
      const configuration = familySettings[rule.settingFamily];
      if (!configuration || !configuration.enabled || configuration.weight <= 0) return;
      if (!canAdd(rule, selected) || !isAllowedForLeague(rule, league)) return;
      const groupId = rule.weightGroup || rule.family;
      if (!availableGroups.has(groupId)) availableGroups.set(groupId, []);
      availableGroups.get(groupId).push(rule);
    });

    const groupChoices = Array.from(availableGroups.entries()).map(([groupId, groupRules]) => ({
      groupId,
      rules: groupRules,
      weight: groupRules.reduce(
        (sum, rule) => sum + ruleProfileWeight(rule, randomness), 0
      ) / groupRules.length
    }));

    const selectedGroup = weightedPick(groupChoices, (entry) => entry.weight);
    if (!selectedGroup) return null;
    return weightedPick(selectedGroup.rules, (rule) => ruleProfileWeight(rule, randomness));
  }

  function createFamilyControls(container, definitions) {
    definitions.forEach((definition) => {
      const row = document.createElement("div");
      row.className = "family-setting";

      const toggleLabel = document.createElement("label");
      toggleLabel.className = "family-toggle";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `family-${definition.id}-enabled`;
      const title = document.createElement("span");
      title.textContent = definition.label;
      toggleLabel.appendChild(checkbox);
      toggleLabel.appendChild(title);

      const weightLabel = document.createElement("label");
      weightLabel.className = "family-weight";
      const range = document.createElement("input");
      range.type = "range";
      range.id = `family-${definition.id}-weight`;
      range.min = "0";
      range.max = "10";
      range.step = "1";
      range.setAttribute("aria-label", `${definition.label} weight`);
      const output = document.createElement("output");
      output.htmlFor = range.id;
      weightLabel.appendChild(range);
      weightLabel.appendChild(output);

      row.appendChild(toggleLabel);
      row.appendChild(weightLabel);
      container.appendChild(row);
      familyControlElements.set(definition.id, { checkbox, range, output });

      checkbox.addEventListener("change", () => {
        familySettings[definition.id].enabled = checkbox.checked;
        updateCustomisedState();
        markConfigPending();
      });
      range.addEventListener("input", () => {
        familySettings[definition.id].weight = Number(range.value);
        output.textContent = range.value;
        updateCustomisedState();
        markConfigPending();
      });
    });
  }

  function loadProfileDefaults(profile) {
    const defaults = profileDefaults[profile] || profileDefaults.chill;
    familySettings = {};
    advancedFamilies.forEach((definition) => {
      familySettings[definition.id] = { enabled: true, weight: defaults[definition.id] ?? 1 };
    });
    syncFamilyControls();
  }

  function syncFamilyControls() {
    advancedFamilies.forEach((definition) => {
      const elements = familyControlElements.get(definition.id);
      if (!elements) return;
      const setting = familySettings[definition.id];
      elements.checkbox.checked = setting.enabled;
      elements.range.value = String(setting.weight);
      elements.output.textContent = String(setting.weight);
    });
  }

  function updateCustomisedState() {
    const profile = currentRandomness();
    const defaults = profileDefaults[profile] || profileDefaults.chill;
    const staticChanged = staticFilterValue().length > 0;
    const familyChanged = advancedFamilies.some((definition) => {
      const setting = familySettings[definition.id];
      return !setting || !setting.enabled || setting.weight !== defaults[definition.id];
    });
    customisedBadge.hidden = !(staticChanged || familyChanged);
  }

  function updateGenerationNote() {
    if (!currentState) return;
    const notes = [];
    if (currentState.selected.length < currentState.requestedCount) {
      notes.push(`Generated ${currentState.selected.length} of ${currentState.requestedCount} requested mutators with the enabled rule set.`);
    }
    if (configPending) notes.push("Settings changed. Generate to apply.");
    generationNote.textContent = notes.join(" ");
  }

  function markConfigPending() {
    configPending = true;
    updateGenerationNote();
  }

  function generate() {
    const league = leagues[leagueSelect.value] || leagues.great;
    const randomness = currentRandomness();
    const requestedCount = Math.max(1, Math.min(6, Number(mutatorCount.value) || 2));
    const selected = [];
    const pool = allRules();

    for (let index = 0; index < requestedCount; index += 1) {
      const next = chooseNextRule(pool, selected, randomness, league);
      if (!next) break;
      selected.push(next);
    }

    const parts = [league.search, staticFilterValue(), ...selected.map((rule) => rule.search)].filter(Boolean);
    currentState = { league, selected, search: parts.join("&"), requestedCount, staticFilter: staticFilterValue() };
    configPending = false;
    render();
  }

  function render() {
    ruleList.replaceChildren();

    const leagueItem = document.createElement("li");
    leagueItem.textContent = currentState.league.description;
    ruleList.appendChild(leagueItem);

    if (currentState.staticFilter) {
      const staticItem = document.createElement("li");
      staticItem.textContent = `Static filter: ${currentState.staticFilter}`;
      ruleList.appendChild(staticItem);
    }

    currentState.selected.forEach((rule) => {
      const item = document.createElement("li");
      item.textContent = rule.explain || rule.label;
      ruleList.appendChild(item);
    });

    searchOutput.value = currentState.search;
    copyStatus.textContent = "";
    updateGenerationNote();
  }

  async function copyFilter() {
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(searchOutput.value);
        copied = true;
      } catch (error) {
        copied = false;
      }
    }

    if (!copied) {
      searchOutput.focus();
      searchOutput.select();
      try {
        copied = document.execCommand("copy");
      } catch (error) {
        copied = false;
      }
    }

    copyStatus.textContent = copied ? "Copied!" : "Filter selected. Press Ctrl+C or ⌘C to copy.";
    if (copyFeedbackTimer) window.clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = window.setTimeout(() => {
      copyStatus.textContent = "";
    }, 2200);
  }

  createFamilyControls(
    document.getElementById("primary-family-controls"),
    advancedFamilies.filter((definition) => definition.primary)
  );
  createFamilyControls(
    document.getElementById("additional-family-controls"),
    advancedFamilies.filter((definition) => !definition.primary)
  );
  loadProfileDefaults(currentRandomness());

  ["chill", "spicy", "chaos"].forEach((profile) => {
    const input = document.getElementById(`randomness-${profile}`);
    input.addEventListener("change", () => {
      if (!input.checked) return;
      loadProfileDefaults(profile);
      updateCustomisedState();
      markConfigPending();
    });
  });

  staticFilterInput.addEventListener("input", () => {
    updateCustomisedState();
    markConfigPending();
  });
  leagueSelect.addEventListener("change", markConfigPending);
  mutatorCount.addEventListener("change", markConfigPending);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    generate();
  });
  copyButton.addEventListener("click", copyFilter);
  resetAdvancedButton.addEventListener("click", () => {
    const hadAdvancedChanges = !customisedBadge.hidden;
    staticFilterInput.value = "";
    loadProfileDefaults(currentRandomness());
    updateCustomisedState();
    if (hadAdvancedChanges) markConfigPending();
    else updateGenerationNote();
  });

  updateCustomisedState();
  generate();
})();
