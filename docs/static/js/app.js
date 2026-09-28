(() => {
  const DATA = window.GBL_RULE_DATA;
  const leagues = DATA.leagues;
  const rules = DATA.rules;
  const types = DATA.types;
  const regions = DATA.regions;

  const CUP_PRESETS = [
    { id: "element", name: "Element Cup", search: "fire,water,grass", league: "little", lockTypes: true, lockMoves: true },
    { id: "fantasy", name: "Fantasy Cup", search: "fairy,dragon", league: "ultra", lockTypes: true, lockMoves: true },
    { id: "fossil", name: "Fossil Cup", search: "rock,steel,water", league: "great", lockTypes: true, lockMoves: false },
    { id: "halloween", name: "Halloween Cup", search: "poison,bug,ghost,dark,fairy", league: "great", lockTypes: true, lockMoves: false },
    { id: "holiday", name: "Holiday Cup", search: "ice,electric,flying,ghost", league: "great", lockTypes: true, lockMoves: false },
    { id: "jungle", name: "Jungle Cup", search: "normal,grass,electric,poison,ground,flying,bug", league: "great", lockTypes: true, lockMoves: false },
    { id: "love", name: "Love Cup", search: "fairy,fire,water,normal,psychic", league: "great", lockTypes: true, lockMoves: false },
    { id: "rock", name: "Rock Cup", search: "rock&!@rock", league: "master", lockTypes: true, lockMoves: true },
    { id: "scroll", name: "Scroll Cup", search: "fighting,water,dark", league: "great", lockTypes: true, lockMoves: false }
  ];

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

  const settingForRuleFamily = new Map();
  advancedFamilies.forEach((setting) => setting.ruleFamilies.forEach((family) => settingForRuleFamily.set(family, setting.id)));
  const TYPE_ICON_ROOT = "./static/icons/types/";
  const RULE_ICON_ROOT = "./static/icons/rules/";
  const BACKGROUND_ROOT = "../background/types/";
  const RULE_ICONS_BY_FAMILY = {
    "visual-status": "shiny", rarity: "rare", cp: "cp", region: "region",
    age: "recent", "size-xl": "xl", "size-xs": "xs", "meta-moves": "meta-ban",
    mega: "mega", "mega-level": "mega-level", buddy: "buddy", "move-weather": "weather"
  };
  const DEFAULT_BACKGROUND_TYPES = ["steel", "water", "fairy"];

  const form = document.getElementById("filter-form");
  const cupSelect = document.getElementById("cup-select");
  const cupPrefixInput = document.getElementById("cup-prefix");
  const cupLocks = document.getElementById("cup-locks");
  const cupLockTypes = document.getElementById("cup-lock-types");
  const cupLockMoves = document.getElementById("cup-lock-moves");
  const leagueSelect = document.getElementById("league-select");
  const mutatorCount = document.getElementById("mutator-count");
  const battleTargetInput = document.getElementById("battle-target");
  const extraFilterInput = document.getElementById("extra-filter");
  const primaryFamilyControls = document.getElementById("primary-family-controls");
  const additionalFamilyControls = document.getElementById("additional-family-controls");
  const filterSummary = document.getElementById("filter-summary");
  const searchOutput = document.getElementById("search-output");
  const ruleList = document.getElementById("rule-list");
  const copyButton = document.getElementById("copy-filter");
  const copyStatus = document.getElementById("copy-status");
  const generationNote = document.getElementById("generation-note");
  const battleStatus = document.getElementById("battle-status");
  const customBadge = document.getElementById("custom-badge");
  const resetAdvancedButton = document.getElementById("reset-advanced");

  const familyControlElements = new Map();
  let familySettings = {};
  let activeProfile = "chill";
  let currentCup = null;
  let currentState = null;
  let configPending = false;
  let generatedCount = 0;
  let battleCount = 0;
  let previousSearch = "";
  let copyFeedbackTimer = null;

  function makeRuleDisplay(rule) {
    const year = new Date().getFullYear();
    const display = Object.assign({}, rule);
    display.settingFamily = settingForRuleFamily.get(rule.family) || "collection";
    display.search = String(rule.search || "")
      .replaceAll("yearCURRENT", "year" + year)
      .replaceAll("yearPREVIOUS", "year" + (year - 1));
    return display;
  }

  function randomInteger(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function sampleTerms(values, minCount, maxCount) {
    const shuffled = values.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInteger(0, index);
      const held = shuffled[index];
      shuffled[index] = shuffled[swapIndex];
      shuffled[swapIndex] = held;
    }
    return shuffled.slice(0, randomInteger(minCount, maxCount)).sort();
  }

  function makeExclusionRule(id, family, values, termPrefix) {
    const selected = sampleTerms(values, 1, Math.min(3, values.length));
    const names = selected.map((value) => value.charAt(0).toUpperCase() + value.slice(1));
    let label;
    let explain;
    if (family === "region") {
      label = "No Pokémon from " + names.join(" or ");
      explain = "Exclude Pokémon from " + names.join(" or ") + ".";
    } else if (family === "move-type") {
      label = "No " + names.join(" or ") + " type moves";
      explain = "Exclude Pokémon that know " + names.join(" or ") + " type moves.";
    } else {
      label = "No " + names.join(" or ") + " type Pokémon";
      explain = "Exclude Pokémon with " + names.join(" or ") + " typing.";
    }
    const rule = {
      id: id + "-" + selected.join("-"), family: family, settingFamily: settingForRuleFamily.get(family),
      pool: "core", scarcity: 1, label: label, explain: explain,
      search: selected.map((value) => "!" + termPrefix + value).join("&")
    };
    if (family === "pokemon-type") rule.meta = { types: selected };
    if (family === "move-type") rule.meta = { move_types: selected };
    return rule;
  }

  function allRules() {
    const generatedExclusions = [
      makeExclusionRule("type-banned", "pokemon-type", types, ""),
      makeExclusionRule("region-banned", "region", regions, ""),
      makeExclusionRule("move-type-banned", "move-type", types, "@")
    ];
    return rules.filter((rule) => rule.pool !== "reference").map(makeRuleDisplay).concat(generatedExclusions);
  }

  function getStaticCupPrefix() {
    return cupPrefixInput.value.trim().replace(/^&+|&+$/g, "");
  }
  function getExtraFilter() {
    return extraFilterInput.value.trim().replace(/^&+|&+$/g, "");
  }
  function isFamilyBlockedByCup(settingFamily) {
    if (!getStaticCupPrefix()) return false;
    if (settingFamily === "pokemon-type") return cupLockTypes.checked;
    if (settingFamily === "move-typing") return cupLockMoves.checked;
    return false;
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

  function ruleProfileWeight(rule, profile) {
    const preset = profile in profilePoolWeights ? profile : "chill";
    const poolWeight = profilePoolWeights[preset][rule.pool] || 0;
    const setting = familySettings[rule.settingFamily];
    const defaultWeight = profileDefaults[preset][rule.settingFamily] == null ? 1 : profileDefaults[preset][rule.settingFamily];
    const optedInPoolWeight = poolWeight === 0 && setting && setting.weight !== defaultWeight ? 0.35 : poolWeight;
    const familyWeight = setting ? (defaultWeight === 0 ? setting.weight : setting.weight / defaultWeight) : 0;
    const scarcity = Math.max(0, (rule.scarcity || 1) - 1);
    return familyWeight * optedInPoolWeight / (1 + scarcity * 0.22);
  }

  function weightedPick(items, weightFor) {
    const weighted = items.map((item) => ({ item: item, weight: weightFor(item) })).filter((entry) => entry.weight > 0);
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    if (!total) return null;
    let threshold = Math.random() * total;
    for (const entry of weighted) {
      threshold -= entry.weight;
      if (threshold < 0) return entry.item;
    }
    return weighted[weighted.length - 1].item;
  }

  function chooseNextRule(pool, selected, profile, league) {
    const availableGroups = new Map();
    pool.forEach((rule) => {
      const setting = familySettings[rule.settingFamily];
      if (!setting || !setting.enabled || setting.weight <= 0) return;
      if (isFamilyBlockedByCup(rule.settingFamily)) return;
      if (!canAdd(rule, selected) || !isAllowedForLeague(rule, league)) return;
      const groupId = rule.weightGroup || rule.family;
      if (!availableGroups.has(groupId)) availableGroups.set(groupId, []);
      availableGroups.get(groupId).push(rule);
    });
    const groupChoices = Array.from(availableGroups.entries()).map(([groupId, groupRules]) => ({
      groupId: groupId,
      rules: groupRules,
      weight: groupRules.reduce((sum, rule) => sum + ruleProfileWeight(rule, profile), 0) / groupRules.length
    }));
    const selectedGroup = weightedPick(groupChoices, (entry) => entry.weight);
    return selectedGroup ? weightedPick(selectedGroup.rules, (rule) => ruleProfileWeight(rule, profile)) : null;
  }

  function createFamilyControls(container, definitions) {
    definitions.forEach((definition) => {
      const row = document.createElement("div");
      row.className = "family-setting";
      const toggleLabel = document.createElement("label");
      toggleLabel.className = "family-toggle";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "family-" + definition.id + "-enabled";
      const title = document.createElement("span");
      title.textContent = definition.label;
      const helper = document.createElement("small");
      helper.className = "family-description";
      helper.id = "family-" + definition.id + "-description";
      helper.textContent = definition.description;
      checkbox.setAttribute("aria-describedby", helper.id);
      toggleLabel.append(checkbox, title);

      const weightLabel = document.createElement("label");
      weightLabel.className = "family-weight";
      const range = document.createElement("input");
      range.type = "range";
      range.id = "family-" + definition.id + "-weight";
      range.min = "0";
      range.max = "10";
      range.step = "1";
      range.setAttribute("aria-label", definition.label + " likelihood");
      const output = document.createElement("output");
      output.htmlFor = range.id;
      weightLabel.append(range, output);
      row.append(toggleLabel, helper, weightLabel);
      container.appendChild(row);
      familyControlElements.set(definition.id, { checkbox: checkbox, range: range, output: output, row: row, helper: helper });

      checkbox.addEventListener("change", () => {
        familySettings[definition.id].enabled = checkbox.checked;
        markProfileCustom();
        syncFamilyControls();
        markConfigPending();
      });
      range.addEventListener("input", () => {
        familySettings[definition.id].weight = Number(range.value);
        markProfileCustom();
        syncFamilyControls();
        markConfigPending();
      });
    });
  }

  function loadProfileDefaults(profile) {
    const defaults = profileDefaults[profile] || profileDefaults.chill;
    familySettings = {};
    advancedFamilies.forEach((definition) => {
      familySettings[definition.id] = {
        enabled: true,
        weight: defaults[definition.id] == null ? 1 : defaults[definition.id]
      };
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
      const blocked = isFamilyBlockedByCup(definition.id);
      elements.checkbox.checked = setting.enabled;
      elements.checkbox.disabled = blocked;
      elements.row.classList.toggle("is-disabled", !setting.enabled || blocked);
      elements.row.classList.toggle("is-blocked", blocked);
      elements.range.value = String(setting.weight);
      elements.range.disabled = blocked;
      elements.output.textContent = String(setting.weight);
      elements.helper.textContent = blocked
        ? definition.description + " Paused while this Cup prefix handles it."
        : definition.description;
      updateRangeProgress(elements.range);
    });
    customBadge.hidden = activeProfile !== "custom";
  }

  function markProfileCustom() {
    activeProfile = "custom";
    updateProfileChoices();
    customBadge.hidden = false;
  }

  function updateProfileChoices() {
    document.querySelectorAll('input[name="randomness"]').forEach((input) => {
      input.checked = input.value === activeProfile;
    });
  }

  function updateGenerationNote() {
    if (!currentState) return;
    const notes = [];
    if (currentState.selected.length < currentState.requestedCount) {
      notes.push("Generated " + currentState.selected.length + " of " + currentState.requestedCount + " requested rules with the enabled families.");
    }
    if (configPending) notes.push("Settings changed. Generate to apply.");
    generationNote.textContent = notes.join(" ");
  }

  function markConfigPending() {
    configPending = true;
    updateGenerationNote();
  }

  function chooseSelection(profile, league, requestedCount, pool) {
    const selected = [];
    for (let index = 0; index < requestedCount; index += 1) {
      const next = chooseNextRule(pool, selected, profile, league);
      if (!next) break;
      selected.push(next);
    }
    return selected;
  }

  function generate() {
    const league = leagues[leagueSelect.value] || leagues.great;
    const profile = activeProfile;
    const requestedCount = Math.max(1, Math.min(6, Number(mutatorCount.value) || 2));
    const pool = allRules();
    let selected = [];
    let search = "";
    const cupPrefix = getStaticCupPrefix();
    const extraFilter = getExtraFilter();

    for (let attempt = 0; attempt < 30; attempt += 1) {
      selected = chooseSelection(profile, league, requestedCount, pool);
      const parts = [league.search, cupPrefix, extraFilter].concat(selected.map((rule) => rule.search)).filter(Boolean);
      search = parts.join("&");
      if (search !== previousSearch || attempt === 29) break;
    }

    currentState = {
      league: league,
      selected: selected,
      search: search,
      requestedCount: requestedCount,
      cupPrefix: cupPrefix,
      cupName: getCurrentCupName(),
      extraFilter: extraFilter
    };
    previousSearch = search;
    configPending = false;
    generatedCount += 1;
    const target = Math.max(0, Math.min(99, Number(battleTargetInput.value) || 0));
    if (target > 0 && battleCount >= target) battleCount = 0;
    battleCount += 1;
    render();
  }

  function getCurrentCupName() {
    if (!getStaticCupPrefix()) return "";
    if (currentCup && cupSelect.value === currentCup.id) return currentCup.name;
    return "Custom Cup";
  }
  function appendIndicator(wrapper, value, className) {
    if (!value) return;
    const indicator = document.createElement("span");
    indicator.className = "visual-indicator " + className;
    indicator.textContent = value;
    indicator.setAttribute("aria-hidden", "true");
    wrapper.appendChild(indicator);
  }

  function createVisualIcon(src, move, banned) {
    const wrapper = document.createElement("span");
    wrapper.className = "visual-icon";
    wrapper.setAttribute("aria-hidden", "true");
    const image = document.createElement("img");
    image.src = src;
    image.alt = "";
    image.width = 25;
    image.height = 25;
    image.loading = "lazy";
    image.addEventListener("error", () => wrapper.classList.add("visual-icon--missing"), { once: true });
    wrapper.appendChild(image);
    if (move) appendIndicator(wrapper, "@", "visual-indicator--move");
    if (banned) appendIndicator(wrapper, "!", "visual-indicator--ban");
    return wrapper;
  }

  function resolveRuleVisual(rule) {
    const id = String(rule.id || "");
    const family = String(rule.family || "");
    const meta = rule.meta || {};
    const banned = id.indexOf("type-banned-") === 0 ||
      id.indexOf("move-type-banned-") === 0 ||
      id.indexOf("region-banned-") === 0 ||
      id === "not-shadow" || id === "not-purified" ||
      (Array.isArray(rule.tags) && rule.tags.includes("ban-shadow"));

    if (family === "pokemon-type" || family === "move-type" || family === "move-slot") {
      const rawTypes = Array.isArray(meta.types) ? meta.types :
        (Array.isArray(meta.move_types) ? meta.move_types : []);
      const validTypes = rawTypes.map((value) => String(value).toLowerCase()).filter((value) => types.includes(value));
      if (validTypes.length) return { kind: "types", types: validTypes, move: family !== "pokemon-type", banned: banned };
    }
    if (family === "rocket-status") {
      if (id === "shadow" || id === "not-shadow") return { kind: "rule", icon: "shadow", banned: id === "not-shadow" };
      if (id === "purified" || id === "not-purified") return { kind: "rule", icon: "purified", banned: id === "not-purified" };
    }
    if (RULE_ICONS_BY_FAMILY[family]) {
      return { kind: "rule", icon: RULE_ICONS_BY_FAMILY[family], banned: family === "region" && banned };
    }
    return { kind: "fallback", banned: false };
  }

  function createRuleVisual(rule, className) {
    const visual = document.createElement("span");
    visual.className = className || "rule-visual";
    visual.setAttribute("aria-hidden", "true");
    const spec = resolveRuleVisual(rule);
    if (spec.kind === "types") {
      spec.types.forEach((type) => visual.appendChild(createVisualIcon(TYPE_ICON_ROOT + type + ".png", spec.move, spec.banned)));
    } else if (spec.kind === "rule") {
      visual.appendChild(createVisualIcon(RULE_ICON_ROOT + spec.icon + ".svg", false, spec.banned));
    } else {
      const marker = document.createElement("span");
      marker.className = "rule-marker";
      visual.appendChild(marker);
    }
    return visual;
  }

  function getSummaryLabel(rule) {
    const spec = resolveRuleVisual(rule);
    if (spec.kind === "types") {
      const names = spec.types.map((type) => type.charAt(0).toUpperCase() + type.slice(1)).join(" + ");
      return (spec.banned ? "No " : "") + names + (spec.move ? " move" : "");
    }
    return rule.label || rule.explain || "Rule";
  }

  function createSummaryChip(label, modifier, visualRule) {
    const chip = document.createElement("span");
    chip.className = "filter-chip" + (modifier ? " filter-chip--" + modifier : "");
    chip.setAttribute("role", "listitem");
    if (visualRule) chip.appendChild(createRuleVisual(visualRule, "rule-visual rule-visual--chip"));
    else {
      const marker = document.createElement("span");
      marker.className = "rule-visual rule-visual--chip";
      marker.setAttribute("aria-hidden", "true");
      const dot = document.createElement("span");
      dot.className = "rule-marker";
      marker.appendChild(dot);
      chip.appendChild(marker);
    }
    const text = document.createElement("span");
    text.className = "filter-chip-label";
    text.textContent = label;
    chip.appendChild(text);
    filterSummary.appendChild(chip);
  }

  function appendRuleRow(rule, description) {
    const row = document.createElement("li");
    row.appendChild(createRuleVisual(rule, "rule-visual"));
    const text = document.createElement("span");
    text.className = "rule-description";
    text.textContent = String(description || rule.explain || rule.label || "Rule")
      .replaceAll("Pokemon", "Pokémon");
    row.appendChild(text);
    ruleList.appendChild(row);
  }

  function renderSummary() {
    filterSummary.replaceChildren();
    const leagueRule = { id: "league-limit", family: "cp" };
    const leagueLabel = currentState.league.maxCp
      ? currentState.league.label.replace(" League", "") + " · " + currentState.league.maxCp.toLocaleString() + " CP"
      : currentState.league.label;
    createSummaryChip(leagueLabel, "league", leagueRule);
    if (currentState.cupName) createSummaryChip(currentState.cupName, "cup", null);
    currentState.selected.forEach((rule) => createSummaryChip(getSummaryLabel(rule), "", rule));
  }

  function backgroundTypesForRules(selectedRules) {
    const chosen = [];
    selectedRules.forEach((rule) => {
      const meta = rule.meta || {};
      const candidates = Array.isArray(meta.types) ? meta.types :
        (Array.isArray(meta.move_types) ? meta.move_types : []);
      candidates.forEach((value) => {
        const type = String(value).toLowerCase();
        if (types.includes(type) && !chosen.includes(type) && chosen.length < 3) chosen.push(type);
      });
    });
    return chosen.length ? chosen : DEFAULT_BACKGROUND_TYPES.slice();
  }

  function applyTypeBackground() {
    const themeTypes = backgroundTypesForRules(currentState.selected);
    const positions = ["8% 14%", "76% 24%", "42% 82%"];
    const sizes = [
      "clamp(190px, 24vw, 330px) clamp(190px, 24vw, 330px)",
      "clamp(170px, 21vw, 295px) clamp(170px, 21vw, 295px)",
      "clamp(160px, 20vw, 275px) clamp(160px, 20vw, 275px)"
    ];
    document.documentElement.style.setProperty("--theme-bg-image", themeTypes.map((type) => 'url("' + BACKGROUND_ROOT + type + '.svg")').join(", "));
    document.documentElement.style.setProperty("--theme-bg-position", positions.slice(0, themeTypes.length).join(", "));
    document.documentElement.style.setProperty("--theme-bg-size", sizes.slice(0, themeTypes.length).join(", "));
    document.documentElement.dataset.themeTypes = themeTypes.join(" ");
  }

  function updateBattleStatus() {
    const target = Math.max(0, Math.min(99, Number(battleTargetInput.value) || 0));
    battleStatus.textContent = target ? "Battle " + battleCount + " of " + target : "Filter " + generatedCount;
  }

  function render() {
    searchOutput.value = currentState.search;
    renderSummary();
    ruleList.replaceChildren();
    appendRuleRow({ id: "league-limit", family: "cp" }, currentState.league.description);
    if (currentState.cupName) {
      appendRuleRow({ id: "cup-prefix", family: "" }, currentState.cupName + " filter: " + currentState.cupPrefix);
    }
    if (currentState.extraFilter) {
      appendRuleRow({ id: "extra-filter", family: "" }, "Additional search terms: " + currentState.extraFilter);
    }
    currentState.selected.forEach((rule) => appendRuleRow(rule, rule.explain || rule.label));
    applyTypeBackground();
    updateBattleStatus();
    updateGenerationNote();
    copyStatus.textContent = "";
  }

  async function copyFilter() {
    const value = currentState ? currentState.search : searchOutput.value;
    if (!value) return;
    let copied = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
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
    copyStatus.textContent = copied ? "Copied — ready to paste into Pokémon GO." : "Filter selected. Use your device’s Copy command.";
    window.clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = window.setTimeout(() => { copyStatus.textContent = ""; }, 3500);
  }

  function updateCupControls() {
    const hasPrefix = Boolean(getStaticCupPrefix());
    cupLocks.disabled = !hasPrefix;
    cupLockTypes.disabled = !hasPrefix;
    cupLockMoves.disabled = !hasPrefix;
    if (!hasPrefix) {
      cupLockTypes.checked = false;
      cupLockMoves.checked = false;
    }
    const lockNames = [];
    if (cupLockTypes.checked && hasPrefix) lockNames.push("Pokémon type rules");
    if (cupLockMoves.checked && hasPrefix) lockNames.push("move type rules");
    document.getElementById("cup-lock-note").textContent = lockNames.length
      ? "Paused for this Cup: " + lockNames.join(" and ") + ". Other rule families stay available."
      : "Choose any overlapping rule families to pause while this Cup filter is active.";
    syncFamilyControls();
  }
  function onCupSelectionChanged() {
    const id = cupSelect.value;
    currentCup = CUP_PRESETS.find((cup) => cup.id === id) || null;
    if (currentCup) {
      cupPrefixInput.value = currentCup.search;
      leagueSelect.value = currentCup.league;
      battleTargetInput.value = currentCup.battles || "";
      cupLockTypes.checked = currentCup.lockTypes;
      cupLockMoves.checked = currentCup.lockMoves;
    } else if (id === "custom") {
      cupPrefixInput.value = "";
      cupLockTypes.checked = false;
      cupLockMoves.checked = false;
      battleTargetInput.value = "";
    } else {
      cupPrefixInput.value = "";
      cupLockTypes.checked = false;
      cupLockMoves.checked = false;
    }
    battleCount = 0;
    updateCupControls();
    markConfigPending();
  }

  function onCupPrefixChanged() {
    if (cupSelect.value && cupSelect.value !== "custom") {
      cupSelect.value = "custom";
      currentCup = null;
    } else if (cupPrefixInput.value.trim() && !cupSelect.value) {
      cupSelect.value = "custom";
      currentCup = null;
    } else if (!cupPrefixInput.value.trim()) {
      cupSelect.value = "";
      currentCup = null;
    }
    updateCupControls();
    markConfigPending();
  }

  function updateProfileFromInput(input) {
    const profile = input.value;
    if (profile === "custom") {
      activeProfile = "custom";
    } else {
      activeProfile = profile;
      loadProfileDefaults(profile);
    }
    updateProfileChoices();
    customBadge.hidden = activeProfile !== "custom";
    markConfigPending();
  }

  function resetAdvancedSettings() {
    loadProfileDefaults(activeProfile);
    updateProfileChoices();
    extraFilterInput.value = "";
    customBadge.hidden = true;
    markConfigPending();
  }

  function setup() {
    createFamilyControls(primaryFamilyControls, advancedFamilies.filter((definition) => definition.primary));
    createFamilyControls(additionalFamilyControls, advancedFamilies.filter((definition) => !definition.primary));
    loadProfileDefaults("chill");
    updateProfileChoices();
    updateCupControls();

    document.querySelectorAll('input[name="randomness"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) updateProfileFromInput(input);
      });
    });
    cupSelect.addEventListener("change", onCupSelectionChanged);
    cupPrefixInput.addEventListener("input", onCupPrefixChanged);
    cupLockTypes.addEventListener("change", () => { markProfileCustom(); updateCupControls(); markConfigPending(); });
    cupLockMoves.addEventListener("change", () => { markProfileCustom(); updateCupControls(); markConfigPending(); });
    leagueSelect.addEventListener("change", markConfigPending);
    mutatorCount.addEventListener("change", markConfigPending);
    battleTargetInput.addEventListener("change", () => { battleCount = 0; markConfigPending(); });
    extraFilterInput.addEventListener("input", () => { markProfileCustom(); markConfigPending(); });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      generate();
    });
    copyButton.addEventListener("click", copyFilter);
    resetAdvancedButton.addEventListener("click", resetAdvancedSettings);
    generate();
  }

  setup();
})();
