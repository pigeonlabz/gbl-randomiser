(() => {
  const { leagues, rules, types, regions } = window.GBL_RULE_DATA;
  const TYPE_ICONS = Object.fromEntries(types.map((type) => [type, `./assets/types/${type}.png`]));
  const RULE_ICONS = { cp: "cp", shiny: "shiny", rare: "rare", region: "region", shadow: "shadow", purified: "purified", recent: "recent", xl: "xl", xs: "xs", "meta-ban": "meta-ban", mega: "mega", buddy: "buddy", weather: "weather", "mega-level": "mega-level" };
  const ruleVisuals = window.GBL_RULE_VISUALS;
  const titleType = (type) => type.charAt(0).toUpperCase() + type.slice(1);
  const themeIndex = window.crypto && window.crypto.getRandomValues
    ? window.crypto.getRandomValues(new Uint32Array(1))[0] % types.length
    : Math.floor(Math.random() * types.length);
  document.documentElement.dataset.theme = types[themeIndex];
  const form = document.getElementById("filter-form");
  const leagueSelect = document.getElementById("league-select");
  const mutatorCount = document.getElementById("mutator-count");
  const staticFilterInput = document.getElementById("static-filter");
  const ruleList = document.getElementById("rule-list");
  const filterSummary = document.getElementById("filter-summary");
  const searchOutput = document.getElementById("search-output");
  const copyButton = document.getElementById("copy-filter");
  const copyStatus = document.getElementById("copy-status");
  const generationNote = document.getElementById("generation-note");
  const customisedBadge = document.getElementById("advanced-customised");
  const resetAdvancedButton = document.getElementById("reset-advanced");

  const advancedFamilies = [
    { id: "shiny", label: "Shiny", description: "Restricts the battle to shiny Pokémon.", ruleFamilies: ["visual-status"], primary: true },
    { id: "rarity", label: "Legendary / Mythical", description: "Uses Legendary, Mythical, or Ultra Beast Pokémon.", ruleFamilies: ["rarity"], primary: true },
    { id: "cp", label: "Extra CP limit", description: "Adds an additional random CP cap.", ruleFamilies: ["cp"], primary: true },
    { id: "pokemon-type", label: "Pokémon types", description: "Allows or bans selected Pokémon types.", ruleFamilies: ["pokemon-type"], primary: true },
    { id: "region", label: "Region", description: "Uses regions such as Kanto, Johto, Hoenn, or Paldea.", ruleFamilies: ["region"], primary: true },
    { id: "move-typing", label: "Move types", description: "Requires or bans moves of selected types.", ruleFamilies: ["move-type", "move-slot"], primary: true },
    { id: "rocket-status", label: "Shadow / Purified", description: "Uses Shadow, Purified, or excludes those Pokémon.", ruleFamilies: ["rocket-status"], primary: true },
    { id: "recent-catch", label: "Recent catches", description: "Restricts the pool by when Pokémon were caught.", ruleFamilies: ["age"], primary: true },
    { id: "xl-size", label: "XL / XXL", description: "Uses oversized Pokémon.", ruleFamilies: ["size-xl"], primary: true },
    { id: "xs-size", label: "XS / XXS", description: "Uses unusually small Pokémon.", ruleFamilies: ["size-xs"], primary: true },
    { id: "buddy", label: "Buddy", description: "Uses Pokémon matching buddy-progress requirements.", ruleFamilies: ["buddy"], primary: true },
    { id: "weather", label: "Weather", description: "Uses weather-related move filters.", ruleFamilies: ["move-weather"], primary: true },
    { id: "mega", label: "Mega", description: "Uses Mega-related eligibility or progress.", ruleFamilies: ["mega", "mega-level"], primary: true },
    { id: "meta-moves", label: "Meta moves", description: "Excludes selected powerful or commonly used moves.", ruleFamilies: ["meta-moves"], primary: true },
    { id: "type-matchups", label: "Type matchups", description: "Uses battle matchup and type-effectiveness restrictions.", ruleFamilies: ["type-effectiveness"] },
    { id: "special-moves", label: "Special moves", description: "Uses special or unusual move-related filters.", ruleFamilies: ["move-special"] },
    { id: "acquisition", label: "How it was obtained", description: "Uses traits such as Lucky, Traded, Hatched, or Costume.", ruleFamilies: ["origin", "origin-special", "year"] },
    { id: "battle-stats", label: "Appraisal / IVs", description: "Uses appraisal star ranges or battle-stat filters.", ruleFamilies: ["appraisal", "hp", "iv-attack", "iv-defense", "iv-hp", "iv-combo"] },
    { id: "collection", label: "Collection traits", description: "Uses unusual collection and inventory traits.", ruleFamilies: ["lucky", "costume", "candy", "candy-xl", "powered-xl", "distance", "background", "copy-count", "buddy-candy"] },
    { id: "special-forms", label: "Special forms", description: "Uses Dynamax, Gigantamax, or other special forms.", ruleFamilies: ["max", "max-count", "max-move", "special-status"] }
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
      search: selected.map((value) => `!${termPrefix}${value}`).join("&"),
      meta: family === "pokemon-type" ? { types: selected }
        : family === "move-type" ? { move_types: selected }
        : undefined
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
      const helper = document.createElement("small");
      helper.className = "family-description";
      helper.id = "family-" + definition.id + "-description";
      helper.textContent = definition.description;
      checkbox.setAttribute("aria-describedby", helper.id);
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
      range.setAttribute("aria-label", definition.label + " likelihood");
      const output = document.createElement("output");
      output.htmlFor = range.id;
      weightLabel.appendChild(range);
      weightLabel.appendChild(output);

      row.appendChild(toggleLabel);
      row.appendChild(helper);
      row.appendChild(weightLabel);
      container.appendChild(row);
      familyControlElements.set(definition.id, { checkbox, range, output, row });

      checkbox.addEventListener("change", () => {
        familySettings[definition.id].enabled = checkbox.checked;
        row.classList.toggle("is-disabled", !checkbox.checked);
        updateCustomisedState();
        markConfigPending();
      });
      range.addEventListener("input", () => {
        familySettings[definition.id].weight = Number(range.value);
        output.textContent = range.value;
        updateRangeProgress(range);
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

  function updateRangeProgress(range) {
    const minimum = Number(range.min) || 0;
    const maximum = Number(range.max) || 10;
    const value = Number(range.value) || 0;
    const progress = maximum > minimum ? ((value - minimum) / (maximum - minimum)) * 100 : 0;
    range.style.setProperty("--range-progress", progress + "%");
  }

  function syncFamilyControls() {
    advancedFamilies.forEach((definition) => {
      const elements = familyControlElements.get(definition.id);
      if (!elements) return;
      const setting = familySettings[definition.id];
      elements.checkbox.checked = setting.enabled;
      elements.row.classList.toggle("is-disabled", !setting.enabled);
      elements.range.value = String(setting.weight);
      elements.output.textContent = String(setting.weight);
      updateRangeProgress(elements.range);
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

  function addIndicator(iconWrap, value, className, label) {
    if (!value) return;
    const indicator = document.createElement("span");
    indicator.className = `visual-indicator ${className}`;
    indicator.textContent = value;
    indicator.setAttribute("aria-label", label);
    iconWrap.appendChild(indicator);
  }

  function makeVisualIcon(src, alt, size, spec) {
    const wrapper = document.createElement("span");
    wrapper.className = "visual-icon";
    wrapper.setAttribute("aria-hidden", "true");
    const icon = document.createElement("img");
    icon.src = src;
    icon.alt = alt;
    icon.width = size;
    icon.height = size;
    icon.loading = "lazy";
    icon.addEventListener("error", () => wrapper.classList.add("visual-icon--missing"), { once: true });
    wrapper.appendChild(icon);
    addIndicator(wrapper, spec.move ? "@" : "", "visual-indicator--move", "Move type");
    addIndicator(wrapper, spec.banned ? "!" : "", "visual-indicator--ban", "Banned");
    return wrapper;
  }

  function createRuleVisual(rule, className = "rule-visual") {
    const spec = ruleVisuals.resolve(rule);
    const visual = document.createElement("span");
    visual.className = className;
    visual.setAttribute("aria-hidden", "true");

    if (spec.kind === "types") {
      spec.types.forEach((type) => {
        const source = TYPE_ICONS[type];
        if (source) visual.appendChild(makeVisualIcon(source, `${titleType(type)} type`, 24, spec));
      });
    } else if (spec.kind === "rule" && RULE_ICONS[spec.icon]) {
      visual.appendChild(makeVisualIcon(`./assets/icons/rules/${RULE_ICONS[spec.icon]}.svg`, `${spec.icon} rule`, 24, spec));
    } else {
      const marker = document.createElement("span");
      marker.className = "rule-marker";
      visual.appendChild(marker);
    }
    return visual;
  }

  function summaryLabel(rule, spec) {
    if (spec.kind === "types") {
      const names = spec.types.map(titleType).join(" + ");
      return `${spec.banned ? "No " : ""}${names}${spec.move ? " move" : ""}`;
    }
    return rule.label || rule.explain || "Rule";
  }

  function renderFilterSummary() {
    filterSummary.replaceChildren();
    const leagueChip = document.createElement("span");
    leagueChip.className = "filter-chip";
    leagueChip.setAttribute("role", "listitem");
    if (currentState.league.maxCp) {
      leagueChip.appendChild(makeVisualIcon("./assets/icons/rules/cp.svg", "CP limit", 22, {}));
      const cpLabel = document.createElement("span");
      cpLabel.textContent = `${currentState.league.maxCp} CP`;
      leagueChip.appendChild(cpLabel);
      leagueChip.setAttribute("aria-label", `${currentState.league.label}: maximum ${currentState.league.maxCp} CP`);
    } else {
      const leagueLabel = document.createElement("span");
      leagueLabel.textContent = currentState.league.label;
      leagueChip.appendChild(leagueLabel);
    }
    filterSummary.appendChild(leagueChip);

    currentState.selected.forEach((rule) => {
      const spec = ruleVisuals.resolve(rule);
      const chip = document.createElement("span");
      chip.className = "filter-chip";
      chip.setAttribute("role", "listitem");
      chip.appendChild(createRuleVisual(rule, "rule-visual rule-visual--chip"));
      const label = document.createElement("span");
      label.className = "filter-chip-label";
      label.textContent = summaryLabel(rule, spec);
      chip.appendChild(label);
      filterSummary.appendChild(chip);
    });
    filterSummary.setAttribute("role", "list");
    filterSummary.setAttribute("aria-label", "Active filter summary");
  }

  function applyTypeBackground() {
    const selectedTypes = ruleVisuals.backgroundTypes(currentState.selected);
    const images = selectedTypes.map((type) => `url("./assets/background/types/${type}.svg")`);
    const positions = ["8% 14%", "76% 24%", "42% 82%"].slice(0, selectedTypes.length);
    document.documentElement.style.setProperty("--theme-bg-image", images.join(", "));
    document.documentElement.style.setProperty("--theme-bg-position", positions.join(", "));
  }

  function appendRuleRow(rule, descriptionText) {
    const item = document.createElement("li");
    item.appendChild(createRuleVisual(rule));
    const description = document.createElement("span");
    description.className = "rule-description";
    description.textContent = descriptionText;
    item.appendChild(description);
    ruleList.appendChild(item);
  }

  function render() {
    ruleList.replaceChildren();
    renderFilterSummary();
    applyTypeBackground();

    const leagueRule = { id: "league-limit", family: currentState.league.maxCp ? "cp" : "", label: currentState.league.label };
    appendRuleRow(leagueRule, currentState.league.description);

    if (currentState.staticFilter) {
      appendRuleRow({ id: "static-filter", family: "", label: "Static filter" }, `Static filter: ${currentState.staticFilter}`);
    }

    currentState.selected.forEach((rule) => {
      appendRuleRow(rule, rule.explain || rule.label);
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
