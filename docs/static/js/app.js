(() => {
  const DATA = window.GBL_RULE_DATA;
  const GENERATOR_UTILS = window.GBL_RANDOMISER_UTILS;
  const leagues = DATA.leagues;
  const rules = DATA.rules;
  const types = DATA.types;
  const regions = DATA.regions;
  const SPECIES = (window.GBL_SPECIES_DATA || []).map(([id, name]) => ({ id: id, name: name }));
  const CUP_PRESETS = window.GBL_CUP_DATA || [];

  const advancedFamilies = [
    { id: "shiny", label: "Shiny", description: "Restricts the battle to shiny Pokémon.", ruleFamilies: ["visual-status"], primary: true },
    { id: "rarity", label: "Legendary / Mythical", description: "Uses Legendary, Mythical, or Ultra Beast Pokémon.", ruleFamilies: ["rarity"], primary: true },
    { id: "cp", label: "Extra CP limit", description: "Adds an additional random CP cap.", ruleFamilies: ["cp"], primary: true },
    { id: "pokemon-type", label: "Pokémon types", description: "Allows or bans selected Pokémon types.", ruleFamilies: ["pokemon-type"], primary: true },
    { id: "region", label: "Region", description: "Uses regions such as Kanto, Johto, Hoenn, or Paldea.", ruleFamilies: ["region"], primary: true },
    { id: "move-typing", label: "Move types", description: "Requires or bans moves of selected types.", ruleFamilies: ["move-type", "move-slot"], primary: true },
    { id: "shadow", label: "Shadow", description: "Uses Shadow Pokémon or excludes them.", ruleFamilies: ["shadow"], primary: true },
    { id: "time", label: "Time", description: "Restricts catches by age or date range.", ruleFamilies: ["age"], primary: true, limits: "time" },
    { id: "xl-size", label: "XL / XXL", description: "Uses oversized Pokémon.", ruleFamilies: ["size-xl"], primary: true },
    { id: "xs-size", label: "XS / XXS", description: "Uses unusually small Pokémon.", ruleFamilies: ["size-xs"] },
    { id: "buddy", label: "Buddy", description: "Uses Pokémon matching buddy-progress requirements.", ruleFamilies: ["buddy"], primary: true, limits: "buddy" },
    { id: "weather", label: "Weather", description: "Uses weather-related move filters.", ruleFamilies: ["move-weather"], primary: true },
    { id: "mega", label: "Mega", description: "Uses Mega-related eligibility or progress.", ruleFamilies: ["mega", "mega-level"], primary: true, limits: "mega" },
    { id: "meta-moves", label: "Meta moves", description: "Excludes selected powerful or commonly used moves.", ruleFamilies: ["meta-moves"] },
    { id: "purified", label: "Purified", description: "Uses Purified Pokémon or excludes them.", ruleFamilies: ["purified"] },
    { id: "type-matchups", label: "Type matchups", description: "Uses battle matchup and type-effectiveness restrictions.", ruleFamilies: ["type-effectiveness"], primary: true },
    { id: "acquisition", label: "How it was obtained", description: "Uses traits such as Lucky, Traded, Hatched, or Costume.", ruleFamilies: ["origin", "origin-special", "year"], primary: true },
    { id: "battle-stats", label: "Appraisal / IVs", description: "Uses appraisal star ranges or battle-stat filters.", ruleFamilies: ["appraisal", "hp", "iv-attack", "iv-defense", "iv-hp", "iv-combo"] },
    { id: "collection", label: "Collection traits", description: "Uses unusual collection and inventory traits.", ruleFamilies: ["lucky", "costume", "candy", "candy-xl", "powered-xl", "distance", "background", "copy-count", "buddy-candy"] },
    { id: "special-forms", label: "Special forms", description: "Uses Dynamax, Gigantamax, or other special forms.", ruleFamilies: ["max", "max-count", "max-move", "special-status"] }
  ];
  const additionalFamilyIds = new Set(advancedFamilies.filter((definition) => !definition.primary).map((definition) => definition.id));

  const profileDefaults = {
    chill: {
      shiny: 3, rarity: 2, cp: 2, "pokemon-type": 9, region: 8, "move-typing": 5,
      shadow: 4, time: 6, purified: 1, "xl-size": 4, "xs-size": 4, buddy: 4,
      weather: 3, mega: 2, "meta-moves": 0, "type-matchups": 2,
      acquisition: 4, "battle-stats": 3, collection: 2, "special-forms": 1
    },
    spicy: {
      shiny: 5, rarity: 5, cp: 5, "pokemon-type": 6, region: 4, "move-typing": 7,
      shadow: 5, time: 5, purified: 2, "xl-size": 5, "xs-size": 4, buddy: 5,
      weather: 6, mega: 5, "meta-moves": 4, "type-matchups": 5,
      acquisition: 5, "battle-stats": 5, collection: 5, "special-forms": 4
    },
    chaos: {
      shiny: 5, rarity: 6, cp: 7, "pokemon-type": 4, region: 4, "move-typing": 8,
      shadow: 5, time: 5, purified: 2, "xl-size": 6, "xs-size": 5, buddy: 4,
      weather: 7, mega: 7, "meta-moves": 8, "type-matchups": 7,
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
  const cupSettingsFields = document.getElementById("cup-settings-fields");
  const cupSelect = document.getElementById("cup-select");
  const cupTileRow = document.getElementById("cup-tiles");
  const cupPickerPopup = document.getElementById("cup-picker-popup");
  const cupPickerSearch = document.getElementById("cup-picker-search");
  const officialCupOptions = document.getElementById("official-cup-options");
  const customCupOptions = document.getElementById("custom-cup-options");
  const cupPickerEmpty = document.getElementById("cup-picker-empty");
  const cupPickerClose = document.getElementById("cup-picker-close");
  const cupFormatInfo = document.getElementById("cup-format-info");
  const cupFormatError = document.getElementById("cup-format-error");
  const cupPrefixInput = document.getElementById("cup-prefix");
  const cupLocks = document.getElementById("cup-locks");
  const cupLockTypes = document.getElementById("cup-lock-types");
  const cupLockMoves = document.getElementById("cup-lock-moves");
  const leagueInputs = Array.from(document.querySelectorAll('input[name="league"]'));
  const includeMutatorsInput = document.getElementById("include-mutators");
  const includeMutatorsToggle = document.getElementById("mutator-toggle-group");
  const mutatorSettings = document.getElementById("mutator-settings");
  const mutatorAdvancedSettings = document.getElementById("mutator-advanced-settings");
  const mutatorCount = document.getElementById("mutator-count");
  const battleTargetInput = document.getElementById("battle-target");
  const extraFilterInput = document.getElementById("extra-filter");
  const additionalRuleInput = document.getElementById("additional-rule-input");
  const addAdditionalRuleButton = document.getElementById("add-additional-rule");
  const additionalRuleSuggestions = document.getElementById("additional-rule-suggestions");
  const additionalRuleStatus = document.getElementById("additional-rule-status");
  const additionalRuleChips = document.getElementById("additional-rule-chips");
  const additionalFilterPreview = document.getElementById("additional-filter-preview");
  const advancedExpressionStatus = document.getElementById("advanced-expression-status");
  const typeLeaningChips = document.getElementById("type-leaning-chips");
  const typeLeaningAdd = document.getElementById("type-leaning-add");
  const typeLeaningPokemon = document.getElementById("type-leaning-pokemon");
  const typeLeaningMove = document.getElementById("type-leaning-move");
  const primaryFamilyControls = document.getElementById("primary-family-controls");
  const additionalFamilyControls = document.getElementById("additional-family-controls");
  const additionalFamiliesToggle = document.getElementById("additional-families-enabled");
  const additionalFamilyWarning = document.getElementById("additional-family-warning");
  const additionalFamilyState = document.getElementById("additional-family-state");
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
  const familyLimitElements = new Map();
  const DEFAULT_OLDEST_CATCH_DATE = "2016-07-06";
  const familyLimits = {
    buddy: { min: "", max: "" },
    mega: { min: "", max: "" },
    time: { newerDate: "", oldestDate: DEFAULT_OLDEST_CATCH_DATE }
  };
  let familySettings = {};
  let additionalFamiliesEnabled = false;
  let activeProfile = "chill";
  let typeLeaning = { types: [], strength: "medium", pokemon: true, move: true };
  let additionalRules = [];
  let suggestionItems = [];
  let activeSuggestionIndex = -1;
  let currentCup = null;
  let currentState = null;
  let configPending = false;
  let generatedCount = 0;
  let battleCount = 0;
  let previousSearch = "";
  let copyFeedbackTimer = null;
  const RECENT_CUPS_KEY = "gbl-filter-recent-cups-v1";
  let recentCupIds = readRecentCupIds();

  function makeRuleDisplay(rule) {
    const display = Object.assign({}, rule);
    display.settingFamily = settingForRuleFamily.get(rule.family) || "collection";
    display.search = String(rule.search || "");
    const calendarYear = rule.meta && rule.meta.calendarYear;
    if (calendarYear) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const targetYear = calendarYear === "current" ? currentYear : currentYear - 1;
      display.search = DATA.yearToAgeRange(targetYear, now);
      display.label = "Caught in " + targetYear;
      display.explain = "Caught in " + targetYear + ".";
    }
    return display;
  }

  function dateInputDay(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const result = Date.UTC(year, month, day) / 86400000;
    const check = new Date(result * 86400000);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month || check.getUTCDate() !== day) return null;
    return result;
  }

  function currentUtcDay(now = new Date()) {
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000;
  }

  function localDateInputValue(now = new Date()) {
    const pad = (value) => String(value).padStart(2, "0");
    return now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
  }

  function makeTimeRule(now = new Date()) {
    const setting = familyLimits.time;
    const today = currentUtcDay(now);
    const newerDateDay = dateInputDay(setting.newerDate);
    const oldestDateDay = dateInputDay(setting.oldestDate) ?? dateInputDay(DEFAULT_OLDEST_CATCH_DATE);
    const lowerAge = Math.max(0, Math.min(today, today - (newerDateDay == null ? today : newerDateDay)));
    const upperAge = Math.max(lowerAge, today - Math.min(today, oldestDateDay));
    const search = lowerAge === upperAge
      ? "age" + lowerAge
      : "age" + lowerAge + "-" + upperAge;
    let label;
    let explain;
    if (lowerAge === 0 && upperAge === 0) {
      label = "Caught in last 24 hours";
      explain = "Caught within the last 24 hours.";
    } else if (lowerAge === upperAge) {
      label = "Caught about " + upperAge + " days ago";
      explain = "Caught about " + upperAge + " days ago.";
    } else if (lowerAge === 0) {
      const unit = upperAge === 1 ? "day" : "days";
      label = "Caught within " + upperAge + " " + unit;
      explain = "Caught within the last " + upperAge + " " + unit + ".";
    } else {
      const minUnit = lowerAge === 1 ? "day" : "days";
      const maxUnit = upperAge === 1 ? "day" : "days";
      label = "Caught " + lowerAge + "–" + upperAge + " days ago";
      explain = "Caught between " + lowerAge + " " + minUnit + " and " + upperAge + " " + maxUnit + " ago.";
    }
    return {
      id: "age-generated-" + lowerAge + "-" + upperAge,
      family: "age", settingFamily: "time", pool: "core", scarcity: 1,
      label: label, explain: explain, search: search
    };
  }

  function makeBoundedBuddyRules() {
    const bounds = familyLimits.buddy;
    if (bounds.min === "" && bounds.max === "") return [];
    const minimum = bounds.min === "" ? 0 : Number(bounds.min);
    const maximum = bounds.max === "" ? 5 : Number(bounds.max);
    const results = [];
    for (let min = minimum; min <= maximum; min += 1) {
      for (let max = min; max <= maximum; max += 1) {
        const search = "buddy" + min + "-" + max;
        results.push({
          id: "buddy-range-" + min + "-" + max,
          family: "buddy", settingFamily: "buddy", pool: "spicy",
          scarcity: max - min >= 3 ? 1 : 2,
          label: min === max ? "Buddy level " + min : "Buddy levels " + min + "–" + max,
          explain: min === max
            ? "Pokémon with Buddy level " + min + "."
            : "Pokémon with Buddy progress from level " + min + " through " + max + ".",
          search: search
        });
      }
    }
    return results;
  }

  function makeBoundedMegaRules() {
    const bounds = familyLimits.mega;
    if (bounds.min === "" && bounds.max === "") return [];
    const minimum = bounds.min === "" ? 1 : Number(bounds.min);
    const maximum = bounds.max === "" ? 4 : Number(bounds.max);
    const levels = [
      { level: 1, label: "Base", pool: "spicy", scarcity: 2 },
      { level: 2, label: "High", pool: "spicy", scarcity: 3 },
      { level: 3, label: "Max", pool: "spicy", scarcity: 3 },
      { level: 4, label: "Super Max", pool: "chaos", scarcity: 4 }
    ];
    return levels.filter((entry) => entry.level >= minimum && entry.level <= maximum).map((entry) => ({
      id: "mega-level-bounded-" + entry.level,
      family: "mega-level", settingFamily: "mega", pool: entry.pool, scarcity: entry.scarcity,
      label: entry.label + " Mega Level",
      explain: "Pokémon at " + entry.label + " Mega Level.",
      search: "mega" + entry.level
    }));
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
    const leaningScope = family === "pokemon-type" ? "pokemon" : family === "move-type" ? "move" : null;
    const selected = leaningScope && isTypeLeaningEnabled(leaningScope)
      ? sampleWeightedTypes(values, 1, Math.min(3, values.length), leaningScope)
      : sampleTerms(values, 1, Math.min(3, values.length));
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
    const hasBuddyBounds = familyLimits.buddy.min !== "" || familyLimits.buddy.max !== "";
    const hasMegaBounds = familyLimits.mega.min !== "" || familyLimits.mega.max !== "";
    const hasCustomTimeBounds = familyLimits.time.newerDate !== "" || familyLimits.time.oldestDate !== DEFAULT_OLDEST_CATCH_DATE;
    const sourceRules = rules.filter((rule) => rule.pool !== "reference" &&
      !(hasCustomTimeBounds && rule.family === "age") &&
      !(hasBuddyBounds && rule.family === "buddy") &&
      !(hasMegaBounds && (rule.family === "mega" || rule.family === "mega-level")));
    return sourceRules.map(makeRuleDisplay).concat(
      hasCustomTimeBounds ? [makeTimeRule()] : [], makeBoundedBuddyRules(), makeBoundedMegaRules(), generatedExclusions
    );
  }

  function getStaticCupPrefix() {
    const value = cupPrefixInput.value.trim();
    if (!value) return "";
    const parsed = GENERATOR_UTILS.validateSearchExpression(value);
    return parsed.valid ? parsed.normalized : "";
  }
  function getExtraFilter() {
    const value = extraFilterInput.value.trim();
    if (!value) return "";
    const parsed = GENERATOR_UTILS.validateSearchExpression(value);
    return parsed.valid ? parsed.normalized : "";
  }
  function selectedLeagueId() {
    const selected = leagueInputs.find((input) => input.checked);
    return selected ? selected.value : "master";
  }
  function getSelectedLeague() {
    return leagues[selectedLeagueId()] || leagues.master;
  }
  function cupForSelection() {
    return currentCup && cupSelect.value === currentCup.id ? currentCup : null;
  }
  function cupSuggestedLeague(cup) {
    const leagueId = cup.suggestedLeague || cup.officialLeague || cup.league;
    return leagueId ? leagues[leagueId] || null : null;
  }
  function cupDisplayName(cup) {
    const suggestedLeague = cupSuggestedLeague(cup);
    return cup.name + (suggestedLeague ? " (Suggested: " + suggestedLeague.label + ")" : "");
  }
  function readRecentCupIds() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(RECENT_CUPS_KEY) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter((id, index) =>
        (id === "custom" || CUP_PRESETS.some((cup) => cup.id === id)) && saved.indexOf(id) === index
      ).slice(0, 5);
    } catch (error) {
      return [];
    }
  }
  function saveRecentCupIds() {
    try {
      window.localStorage.setItem(RECENT_CUPS_KEY, JSON.stringify(recentCupIds));
    } catch (error) {
      // Storage may be disabled; Cup selection still works for this page view.
    }
  }
  function cupPickerItem(id) {
    if (id === "custom") return { id: "custom", name: "Custom Cup filter…", official: false };
    return CUP_PRESETS.find((cup) => cup.id === id) || null;
  }
  function cupQuickLabel(cup) {
    if (cup.id === "custom") return "Custom filter";
    return cup.name.replace(/\s+Cup(?::)?/i, "").replace(/:\s*/, " ").trim();
  }
  function updateCupPickerSelection() {
    const selectedId = cupSelect.value;
    cupPickerPopup.querySelectorAll("[data-cup-option]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.cupId === selectedId));
    });
    cupTileRow.querySelectorAll("[data-cup-id]").forEach((button) => {
      const selected = button.dataset.cupId === selectedId;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-selected", selected);
    });
  }
  function renderCupQuickSelections() {
    cupTileRow.replaceChildren();
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "cup-quick-tile cup-open-tile";
    openButton.dataset.cupId = "";
    openButton.setAttribute("aria-label", "Open League, no Cup restrictions");
    openButton.setAttribute("aria-pressed", String(cupSelect.value === ""));
    const openIcon = document.createElement("span");
    openIcon.className = "cup-quick-icon";
    openIcon.setAttribute("aria-hidden", "true");
    openIcon.textContent = "○";
    const openLabel = document.createElement("span");
    openLabel.textContent = "Open";
    openButton.append(openIcon, openLabel);
    cupTileRow.appendChild(openButton);

    const ids = recentCupIds.filter((id) => cupPickerItem(id));
    const selectedId = cupSelect.value;
    if (selectedId && cupPickerItem(selectedId)) {
      const existingIndex = ids.indexOf(selectedId);
      if (existingIndex >= 0) ids.splice(existingIndex, 1);
      ids.unshift(selectedId);
    }
    ids.slice(0, 2).forEach((id) => {
      const cup = cupPickerItem(id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cup-quick-tile";
      button.dataset.cupId = cup.id;
      button.setAttribute("aria-label", cupDisplayName(cup));
      button.setAttribute("aria-pressed", String(cup.id === selectedId));
      button.title = cupDisplayName(cup);
      const icon = document.createElement("span");
      icon.className = "cup-quick-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = cup.id === "custom" ? "⚙" : "🏆";
      const label = document.createElement("span");
      label.textContent = cupQuickLabel(cup);
      button.append(icon, label);
      cupTileRow.appendChild(button);
    });

    const moreButton = document.createElement("button");
    moreButton.type = "button";
    moreButton.className = "cup-quick-tile cup-more-tile";
    moreButton.dataset.cupMore = "true";
    moreButton.setAttribute("aria-haspopup", "dialog");
    moreButton.setAttribute("aria-expanded", String(!cupPickerPopup.hidden));
    moreButton.setAttribute("aria-controls", "cup-picker-popup");
    moreButton.setAttribute("aria-label", "More Cups");
    const moreIcon = document.createElement("span");
    moreIcon.className = "cup-quick-icon";
    moreIcon.setAttribute("aria-hidden", "true");
    moreIcon.textContent = "⋯";
    const moreLabel = document.createElement("span");
    moreLabel.textContent = "More";
    moreButton.append(moreIcon, moreLabel);
    cupTileRow.appendChild(moreButton);
    updateCupPickerSelection();
  }
  function renderCupPickerOptions() {
    officialCupOptions.replaceChildren();
    customCupOptions.replaceChildren();
    const entries = CUP_PRESETS.concat([{ id: "custom", name: "Custom Cup filter…", official: false }]);
    entries.forEach((cup) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cup-picker-option";
      button.dataset.cupOption = "true";
      button.dataset.cupId = cup.id;
      button.setAttribute("aria-pressed", String(cup.id === cupSelect.value));
      const name = document.createElement("span");
      name.className = "cup-option-name";
      name.textContent = cup.name;
      button.appendChild(name);
      const suggestedLeague = cupSuggestedLeague(cup);
      const meta = document.createElement("small");
      meta.className = "cup-option-meta";
      meta.textContent = suggestedLeague ? "Suggested: " + suggestedLeague.label : cup.id === "custom" ? "Enter your own eligibility search" : "Custom preset";
      button.appendChild(meta);
      button.dataset.searchText = (cup.name + " " + (suggestedLeague ? suggestedLeague.label : "") + " " + meta.textContent).toLocaleLowerCase();
      (cup.official ? officialCupOptions : customCupOptions).appendChild(button);
    });
    updateCupPickerSearch();
    updateCupPickerSelection();
  }
  function updateCupPickerSearch() {
    const query = cupPickerSearch.value.trim().toLocaleLowerCase();
    let visibleCount = 0;
    cupPickerPopup.querySelectorAll("[data-cup-option]").forEach((button) => {
      const visible = !query || button.dataset.searchText.includes(query);
      button.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    document.getElementById("official-cup-group").hidden = !officialCupOptions.querySelector("[data-cup-option]:not([hidden])");
    document.getElementById("custom-cup-group").hidden = !customCupOptions.querySelector("[data-cup-option]:not([hidden])");
    cupPickerEmpty.hidden = visibleCount > 0;
  }
  function positionCupPicker() {
    if (cupPickerPopup.hidden) return;
    const anchor = cupTileRow.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    cupPickerPopup.style.visibility = "hidden";
    cupPickerPopup.style.left = "0px";
    cupPickerPopup.style.top = "0px";
    const panel = cupPickerPopup.getBoundingClientRect();
    const left = Math.max(margin, Math.min(anchor.left + anchor.width / 2 - panel.width / 2, viewportWidth - panel.width - margin));
    let top = anchor.bottom + 8;
    if (top + panel.height > viewportHeight - margin && anchor.top - panel.height - 8 >= margin) top = anchor.top - panel.height - 8;
    top = Math.max(margin, Math.min(top, viewportHeight - panel.height - margin));
    cupPickerPopup.style.left = Math.round(left) + "px";
    cupPickerPopup.style.top = Math.round(top) + "px";
    cupPickerPopup.style.visibility = "";
  }
  function closeCupPicker(returnFocus) {
    if (cupPickerPopup.hidden) return;
    cupPickerPopup.hidden = true;
    const moreButton = cupTileRow.querySelector("[data-cup-more]");
    if (moreButton) moreButton.setAttribute("aria-expanded", "false");
    if (returnFocus) {
      (moreButton || cupTileRow.querySelector("[data-cup-id]")).focus();
    }
  }
  function ensureCupSelectOptions() {
    const knownIds = new Set(Array.from(cupSelect.options, (option) => option.value));
    const groups = {
      official: cupSelect.querySelector('optgroup[label="Official GBL formats"]'),
      custom: cupSelect.querySelector('optgroup[label="Custom filter presets"]')
    };
    CUP_PRESETS.forEach((cup) => {
      if (knownIds.has(cup.id)) return;
      const option = document.createElement("option");
      option.value = cup.id;
      option.textContent = cupDisplayName(cup);
      const group = cup.official ? groups.official : groups.custom;
      (group || cupSelect).appendChild(option);
      knownIds.add(cup.id);
    });
  }
  function openCupPicker() {
    cupPickerPopup.hidden = false;
    cupPickerSearch.value = "";
    updateCupPickerSearch();
    const moreButton = cupTileRow.querySelector("[data-cup-more]");
    if (moreButton) moreButton.setAttribute("aria-expanded", "true");
    positionCupPicker();
    cupPickerSearch.focus({ preventScroll: true });
  }
  function rememberCupSelection() {
    const id = cupSelect.value;
    if (!id) return;
    recentCupIds = [id].concat(recentCupIds.filter((recentId) => recentId !== id)).slice(0, 5);
    saveRecentCupIds();
    renderCupQuickSelections();
    renderCupPickerOptions();
  }
  function setupCupPicker() {
    ensureCupSelectOptions();
    renderCupPickerOptions();
    renderCupQuickSelections();
    cupTileRow.addEventListener("click", (event) => {
      const moreButton = event.target.closest("[data-cup-more]");
      if (moreButton) {
        openCupPicker();
        return;
      }
      const cupButton = event.target.closest("[data-cup-id]");
      if (!cupButton) return;
      const id = cupButton.dataset.cupId;
      if (cupSelect.value !== id) {
        cupSelect.value = id;
        cupSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    cupPickerPopup.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cup-option]");
      if (!button) return;
      if (cupSelect.value !== button.dataset.cupId) {
        cupSelect.value = button.dataset.cupId;
        cupSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
      closeCupPicker(true);
    });
    cupPickerSearch.addEventListener("input", updateCupPickerSearch);
    cupPickerSearch.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        const first = cupPickerPopup.querySelector("[data-cup-option]:not([hidden])");
        if (first) { event.preventDefault(); first.focus(); }
      } else if (event.key === "Enter") {
        const first = cupPickerPopup.querySelector("[data-cup-option]:not([hidden])");
        if (first) { event.preventDefault(); first.click(); }
      }
    });
    cupPickerClose.addEventListener("click", () => closeCupPicker(true));
    document.addEventListener("pointerdown", (event) => {
      if (!cupPickerPopup.hidden && !cupPickerPopup.contains(event.target) && !cupTileRow.contains(event.target)) closeCupPicker(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !cupPickerPopup.hidden) {
        event.preventDefault();
        closeCupPicker(true);
      }
    });
    window.addEventListener("resize", positionCupPicker);
    window.addEventListener("scroll", positionCupPicker, true);
    cupSelect.addEventListener("change", rememberCupSelection);
  }
  function cupPresetSearch(cup) {
    const bannedSpecies = (cup.speciesBans || []).map((dex) => "!" + dex).join("&");
    return GENERATOR_UTILS.combineSearch([cup.search, bannedSpecies]);
  }
  function renderTypeLeaningControls() {
    typeLeaningChips.replaceChildren();
    typeLeaning.types.forEach((type) => {
      const chip = document.createElement("span");
      chip.className = "type-leaning-chip";
      const label = document.createElement("span");
      label.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove " + label.textContent + " type leaning");
      remove.addEventListener("click", () => {
        typeLeaning.types = typeLeaning.types.filter((selected) => selected !== type);
        renderTypeLeaningControls();
        markConfigPending();
      });
      chip.append(label, remove);
      typeLeaningChips.appendChild(chip);
    });

    const previousType = typeLeaningAdd.value;
    typeLeaningAdd.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = typeLeaning.types.length === types.length ? "All types selected" : "+ Add type";
    placeholder.disabled = typeLeaning.types.length === types.length;
    typeLeaningAdd.appendChild(placeholder);
    types.filter((type) => !typeLeaning.types.includes(type)).forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
      typeLeaningAdd.appendChild(option);
    });
    typeLeaningAdd.disabled = typeLeaning.types.length === types.length;
    typeLeaningAdd.value = types.includes(previousType) && !typeLeaning.types.includes(previousType) ? previousType : "";

    document.querySelectorAll('input[name="type-leaning-strength"]').forEach((input) => {
      input.checked = input.value === typeLeaning.strength;
    });
    typeLeaningPokemon.checked = typeLeaning.pokemon;
    typeLeaningMove.checked = typeLeaning.move;
  }
  function isFamilyBlockedByCup(settingFamily) {
    if (!cupForSelection() && !getStaticCupPrefix()) return false;
    if (settingFamily === "pokemon-type") return cupLockTypes.checked;
    if (settingFamily === "move-typing") return cupLockMoves.checked;
    return false;
  }
  function isAllowedForLeague(rule, league) {
    return GENERATOR_UTILS.isAllowedForLeague(rule, league);
  }
  function canAdd(rule, selected) {
    return GENERATOR_UTILS.canAddRule(rule, selected);
  }

  function normalizeLookup(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function speciesLookupKeys(species) {
    const keys = [normalizeLookup(species.name)];
    if (species.id === 29) keys.push("nidoranf");
    if (species.id === 32) keys.push("nidoranm");
    return keys;
  }

  function findExactSpecies(value) {
    const query = String(value || "").trim();
    if (/^\d+$/.test(query)) return SPECIES.find((species) => species.id === Number(query)) || null;
    const key = normalizeLookup(query);
    return SPECIES.find((species) => speciesLookupKeys(species).includes(key)) || null;
  }

  function hideAdditionalSuggestions() {
    suggestionItems = [];
    activeSuggestionIndex = -1;
    additionalRuleSuggestions.replaceChildren();
    additionalRuleSuggestions.hidden = true;
    additionalRuleInput.setAttribute("aria-expanded", "false");
    additionalRuleInput.removeAttribute("aria-activedescendant");
  }

  function updateAdditionalSuggestions() {
    const query = additionalRuleInput.value.trim();
    const key = normalizeLookup(query);
    if (!key) {
      hideAdditionalSuggestions();
      return;
    }
    const numeric = /^\d+$/.test(query);
    const matches = SPECIES.filter((species) => numeric
      ? String(species.id).startsWith(query)
      : speciesLookupKeys(species).some((name) => name.startsWith(key) || name.includes(key))
    ).sort((first, second) => {
      if (numeric) return first.id - second.id;
      const firstStarts = speciesLookupKeys(first).some((name) => name.startsWith(key));
      const secondStarts = speciesLookupKeys(second).some((name) => name.startsWith(key));
      return Number(secondStarts) - Number(firstStarts) || first.id - second.id;
    }).slice(0, 8);
    suggestionItems = matches;
    activeSuggestionIndex = matches.length ? 0 : -1;
    additionalRuleSuggestions.replaceChildren();
    matches.forEach((species, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.id = "species-suggestion-" + species.id;
      option.className = "rule-suggestion";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === activeSuggestionIndex));
      option.textContent = species.name + " · #" + species.id;
      option.addEventListener("click", () => addSpeciesRule(species));
      additionalRuleSuggestions.appendChild(option);
    });
    additionalRuleSuggestions.hidden = !matches.length;
    additionalRuleInput.setAttribute("aria-expanded", String(matches.length > 0));
    if (activeSuggestionIndex >= 0) additionalRuleInput.setAttribute("aria-activedescendant", "species-suggestion-" + matches[activeSuggestionIndex].id);
    else additionalRuleInput.removeAttribute("aria-activedescendant");
  }

  function updateAdditionalSuggestionsSelection() {
    const options = Array.from(additionalRuleSuggestions.querySelectorAll('[role="option"]'));
    options.forEach((option, index) => option.setAttribute("aria-selected", String(index === activeSuggestionIndex)));
    if (suggestionItems[activeSuggestionIndex]) {
      additionalRuleInput.setAttribute("aria-activedescendant", "species-suggestion-" + suggestionItems[activeSuggestionIndex].id);
    } else {
      additionalRuleInput.removeAttribute("aria-activedescendant");
    }
  }

  function renderAdditionalRuleChips() {
    additionalRuleChips.replaceChildren();
    additionalRules.forEach((rule, index) => {
      const chip = document.createElement("span");
      chip.className = "additional-rule-chip";
      chip.setAttribute("role", "listitem");
      const label = document.createElement("span");
      label.textContent = rule.kind === "pokemon" ? "🚫 " + rule.label : "🏷 " + rule.label;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove " + rule.label + " rule");
      remove.addEventListener("click", () => {
        additionalRules.splice(index, 1);
        renderAdditionalRuleChips();
        markConfigPending();
      });
      chip.append(label, remove);
      additionalRuleChips.appendChild(chip);
    });
  }

  function addSpeciesRule(species) {
    if (!species) return;
    if (additionalRules.some((rule) => rule.kind === "pokemon" && rule.dex === species.id)) {
      additionalRuleStatus.textContent = species.name + " is already excluded.";
      hideAdditionalSuggestions();
      return;
    }
    additionalRules.push({ kind: "pokemon", dex: species.id, label: species.name, search: "!" + species.id });
    additionalRuleInput.value = "";
    additionalRuleStatus.textContent = "Added " + species.name + " as a Pokédex exclusion.";
    hideAdditionalSuggestions();
    renderAdditionalRuleChips();
    markConfigPending();
  }

  function addCustomRule(value) {
    const parsed = GENERATOR_UTILS.validateSearchExpression(value);
    if (!String(value || "").trim()) {
      additionalRuleStatus.textContent = "Enter a Pokémon or search rule first.";
      return;
    }
    if (!parsed.valid) {
      additionalRuleStatus.textContent = parsed.error;
      return;
    }
    const duplicateKey = parsed.normalized.toLowerCase().replace(/\s+/g, "");
    if (additionalRules.some((rule) => rule.kind === "custom" && rule.search.toLowerCase().replace(/\s+/g, "") === duplicateKey)) {
      additionalRuleStatus.textContent = "That custom rule is already added.";
      return;
    }
    additionalRules.push({ kind: "custom", label: parsed.normalized, search: parsed.normalized });
    additionalRuleInput.value = "";
    additionalRuleStatus.textContent = "Added rule: " + parsed.normalized;
    hideAdditionalSuggestions();
    renderAdditionalRuleChips();
    markConfigPending();
  }

  function addAdditionalRule() {
    const query = additionalRuleInput.value.trim();
    if (!query) {
      additionalRuleStatus.textContent = "Enter a Pokémon or search rule first.";
      return;
    }
    if (/^\d+$/.test(query)) {
      const species = findExactSpecies(query);
      if (species) addSpeciesRule(species);
      else additionalRuleStatus.textContent = "No Pokémon has Pokédex number " + query + ".";
      return;
    }
    if (suggestionItems.length) {
      const selected = suggestionItems[activeSuggestionIndex] || findExactSpecies(query) || suggestionItems[0];
      addSpeciesRule(selected);
      return;
    }
    const exactSpecies = findExactSpecies(query);
    if (exactSpecies) addSpeciesRule(exactSpecies);
    else addCustomRule(query);
  }

  function additionalRuleExpressions() {
    return additionalRules.map((rule) => rule.search).concat(getExtraFilter()).filter(Boolean);
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

  function isTypeLeaningEnabled(scope) {
    return GENERATOR_UTILS.typeLeaningScopeEnabled(scope, typeLeaning.types.length, typeLeaning.pokemon, typeLeaning.move);
  }

  function typeLeaningWeight(type, scope) {
    return GENERATOR_UTILS.typeWeight(type, typeLeaning.types, typeLeaning.strength, isTypeLeaningEnabled(scope));
  }

  function sampleWeightedTypes(values, minCount, maxCount, scope) {
    const count = randomInteger(minCount, Math.min(maxCount, values.length));
    return GENERATOR_UTILS.weightedSample(values, count, (value) => typeLeaningWeight(value, scope)).sort();
  }

  function ruleTypeLeaningWeight(rule) {
    const meta = rule.meta || {};
    const ruleId = String(rule.id || "");
    if (ruleId.indexOf("type-banned-") === 0 || ruleId.indexOf("move-type-banned-") === 0) return 1;
    if (rule.family === "pokemon-type") {
      const ruleTypes = Array.isArray(meta.types) ? meta.types : [];
      return ruleTypes.length ? ruleTypes.reduce((sum, type) => sum + typeLeaningWeight(type, "pokemon"), 0) / ruleTypes.length : 1;
    }
    if (rule.family === "move-type" || rule.family === "move-slot") {
      const ruleTypes = Array.isArray(meta.move_types) ? meta.move_types : [];
      return ruleTypes.length ? ruleTypes.reduce((sum, type) => sum + typeLeaningWeight(type, "move"), 0) / ruleTypes.length : 1;
    }
    return 1;
  }

  function makeLimitSelect(labelText, maximum, minimum = 0) {
    const label = document.createElement("label");
    label.className = "family-limit-control";
    const text = document.createElement("span");
    text.textContent = labelText;
    const select = document.createElement("select");
    select.setAttribute("aria-label", labelText + " bound");
    select.add(new Option("Any", ""));
    for (let value = minimum; value <= maximum; value += 1) select.add(new Option(String(value), String(value)));
    label.append(text, select);
    return { label: label, input: select };
  }

  function createFamilyLimitControls(definition) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "family-limit-button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "Configure " + definition.label + " limits");
    const panelId = "family-" + definition.id + "-limits";
    button.setAttribute("aria-controls", panelId);
    button.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14M7 3v4m6 1v4m-4 1v4"/></svg>';

    const panel = document.createElement("div");
    panel.id = panelId;
    panel.className = "family-limits";
    panel.hidden = true;
    button.addEventListener("click", () => {
      const open = panel.hidden;
      panel.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
    });

    const controls = { button: button, panel: panel, inputs: [] };
    if (definition.limits === "buddy" || definition.limits === "mega") {
      const maximum = definition.limits === "buddy" ? 5 : 4;
      const minimum = definition.limits === "buddy" ? 0 : 1;
      const noun = definition.limits === "buddy" ? "Buddy" : "Mega Level";
      const lower = makeLimitSelect("≥ " + noun, maximum, minimum);
      const upper = makeLimitSelect("≤ " + noun, maximum, minimum);
      lower.input.id = "family-" + definition.id + "-min";
      upper.input.id = "family-" + definition.id + "-max";
      panel.append(lower.label, upper.label);
      controls.inputs = [lower.input, upper.input];
      controls.inputs.forEach((input, index) => input.addEventListener("change", () => {
        const key = definition.limits;
        const bounds = familyLimits[key];
        bounds[index === 0 ? "min" : "max"] = input.value;
        const low = bounds.min === "" ? 0 : Number(bounds.min);
        const high = bounds.max === "" ? maximum : Number(bounds.max);
        if (low > high) bounds[index === 0 ? "max" : "min"] = input.value;
        controls.inputs[0].value = bounds.min;
        controls.inputs[1].value = bounds.max;
        markProfileCustom();
        markConfigPending();
      }));
    } else if (definition.limits === "time") {
      const newerLabel = document.createElement("label");
      newerLabel.className = "family-limit-control family-limit-control--date";
      const newerText = document.createElement("span");
      newerText.textContent = "Caught on or before";
      const newerInput = document.createElement("input");
      newerInput.type = "date";
      newerInput.id = "family-time-newer-date";
      newerInput.setAttribute("aria-label", "Newest allowed catch date");
      newerLabel.append(newerText, newerInput);

      const oldestLabel = document.createElement("label");
      oldestLabel.className = "family-limit-control family-limit-control--date";
      const oldestText = document.createElement("span");
      oldestText.textContent = "Caught on or after";
      const oldestInput = document.createElement("input");
      oldestInput.type = "date";
      oldestInput.id = "family-time-oldest-date";
      oldestInput.setAttribute("aria-label", "Oldest allowed catch date");
      oldestLabel.append(oldestText, oldestInput);
      panel.append(newerLabel, oldestLabel);
      controls.inputs = [newerInput, oldestInput];
      const updateTimeBounds = (changedIndex) => {
        let newer = familyLimits.time.newerDate;
        let oldest = familyLimits.time.oldestDate;
        if (newer && oldest && oldest > newer) {
          if (changedIndex === 0) oldest = newer;
          else newer = oldest;
          familyLimits.time.newerDate = newer;
          familyLimits.time.oldestDate = oldest;
          newerInput.value = newer;
          oldestInput.value = oldest;
        }
        newerInput.min = oldest || "";
        oldestInput.max = newer || localDateInputValue();
      };
      newerInput.addEventListener("change", () => {
        familyLimits.time.newerDate = newerInput.value;
        updateTimeBounds(0);
        markProfileCustom();
        markConfigPending();
      });
      oldestInput.addEventListener("change", () => {
        familyLimits.time.oldestDate = oldestInput.value || DEFAULT_OLDEST_CATCH_DATE;
        oldestInput.value = familyLimits.time.oldestDate;
        updateTimeBounds(1);
        markProfileCustom();
        markConfigPending();
      });
      controls.sync = () => {
        newerInput.value = familyLimits.time.newerDate;
        oldestInput.value = familyLimits.time.oldestDate;
        updateTimeBounds(-1);
      };
    }
    return controls;
  }

  function chooseNextRule(pool, selected, profile, league) {
    const available = [];
    pool.forEach((rule) => {
      const setting = familySettings[rule.settingFamily];
      if (!setting || !setting.enabled || setting.weight <= 0) return;
      if (!additionalFamiliesEnabled && additionalFamilyIds.has(rule.settingFamily)) return;
      if (isFamilyBlockedByCup(rule.settingFamily)) return;
      if (!canAdd(rule, selected) || !isAllowedForLeague(rule, league)) return;
      available.push(rule);
    });
    return GENERATOR_UTILS.chooseChallengeRule(available, {
      groupIdFor: (rule) => rule.weightGroup || rule.family,
      groupWeightFor: (rule) => ruleProfileWeight(rule, profile),
      ruleWeightFor: (rule) => ruleProfileWeight(rule, profile) * ruleTypeLeaningWeight(rule)
    });
  }

  function chooseOptionalDisqualifier(pool, selected, profile, league) {
    const available = pool.filter((rule) => {
      if (rule.role !== "disqualifier_only") return false;
      const setting = familySettings[rule.settingFamily];
      return Boolean(setting && setting.enabled && setting.weight > 0) &&
        (additionalFamiliesEnabled || !additionalFamilyIds.has(rule.settingFamily)) &&
        !isFamilyBlockedByCup(rule.settingFamily) && canAdd(rule, selected) && isAllowedForLeague(rule, league);
    });
    const scarcityWeight = (rule) => 1 / (1 + Math.max(0, (rule.scarcity || 1) - 1) * 0.22);
    return GENERATOR_UTILS.chooseOptionalDisqualifier(available, {
      chance: profile === "chaos" ? 0.3 : 0.18,
      groupIdFor: (rule) => rule.weightGroup || rule.family,
      groupWeightFor: scarcityWeight,
      ruleWeightFor: scarcityWeight
    });
  }

  function createFamilyControls(container, definitions) {
    definitions.forEach((definition) => {
      const row = document.createElement("div");
      row.className = "family-setting";
      const heading = document.createElement("div");
      heading.className = "family-heading";
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
      heading.appendChild(toggleLabel);
      let limitControls = null;
      if (definition.limits) {
        limitControls = createFamilyLimitControls(definition);
        heading.appendChild(limitControls.button);
      }

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
      row.append(heading, helper, weightLabel);
      if (limitControls) row.appendChild(limitControls.panel);
      container.appendChild(row);
      familyControlElements.set(definition.id, { checkbox: checkbox, range: range, output: output, row: row, helper: helper });
      if (limitControls) familyLimitElements.set(definition.id, limitControls);

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
      const legacyFamily = definition.id === "shadow" || definition.id === "purified" ? "rocket-status" :
        definition.id === "time" ? "recent-catch" : null;
      const legacyWeight = definition.id === "shadow" || definition.id === "purified"
        ? (defaults.shadow_purified ?? defaults[legacyFamily])
        : legacyFamily && defaults[legacyFamily];
      let weight = defaults[definition.id];
      if (weight == null && legacyWeight != null) {
        weight = definition.id === "purified" ? Math.min(2, legacyWeight) : legacyWeight;
      }
      familySettings[definition.id] = {
        enabled: true,
        weight: weight == null ? 1 : weight
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
      const limits = familyLimitElements.get(definition.id);
      if (limits && limits.sync) limits.sync();
      if (limits && limits.inputs.length && definition.limits !== "time") {
        const bounds = familyLimits[definition.limits];
        limits.inputs[0].value = bounds.min;
        limits.inputs[1].value = bounds.max;
      }
    });
    additionalFamiliesToggle.checked = additionalFamiliesEnabled;
    additionalFamilyControls.classList.toggle("is-opted-out", !additionalFamiliesEnabled);
    additionalFamilyWarning.hidden = !additionalFamiliesEnabled;
    additionalFamilyState.textContent = additionalFamiliesEnabled ? "Included in generation" : "Not participating";
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
    if (currentState) {
      const selectedLeague = getSelectedLeague();
      const league = selectedLeague;
      const cpConstraint = normalizeCpConstraint(league, currentState.selected);
      const otherRules = currentState.selected.filter((rule) => rule.family !== "cp");
      const cupPrefix = getStaticCupPrefix();
      currentState.league = selectedLeague;
      currentState.cpConstraint = cpConstraint;
      currentState.cupPrefix = cupPrefix;
      currentState.cupName = getCurrentCupName();
      currentState.extraFilter = getExtraFilter();
      currentState.additionalRules = additionalRules.slice();
      try {
        currentState.search = GENERATOR_UTILS.combineSearch([cpConstraint.search, cupPrefix]
          .concat(additionalRuleExpressions(), otherRules.map((rule) => rule.search), currentState.disqualifiers.map((rule) => rule.search)));
        additionalFilterPreview.textContent = currentState.search || "Add a rule or generate a filter to preview it here.";
        render();
      } catch (error) {
        additionalRuleStatus.textContent = error.message;
      }
    }
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

  function normalizeCpConstraint(league, selectedRules) {
    return GENERATOR_UTILS.normalizeCpConstraint(league, selectedRules);
  }

  function cpRangeSummary(range) {
    if (range.minCp === 0 && Number.isFinite(range.maxCp)) return range.maxCp.toLocaleString() + " CP";
    if (range.minCp === range.maxCp) return range.minCp.toLocaleString() + " CP";
    if (!Number.isFinite(range.maxCp)) return range.minCp.toLocaleString() + "+ CP";
    return range.minCp.toLocaleString() + "–" + range.maxCp.toLocaleString() + " CP";
  }

  function cpRangeDescription(range) {
    if (range.minCp === 0 && Number.isFinite(range.maxCp)) return "Max " + range.maxCp.toLocaleString() + " CP";
    if (range.minCp === range.maxCp) return "Exactly " + range.minCp.toLocaleString() + " CP";
    if (!Number.isFinite(range.maxCp)) return range.minCp > 0 ? range.minCp.toLocaleString() + "+ CP" : "No CP cap";
    return range.minCp.toLocaleString() + "–" + range.maxCp.toLocaleString() + " CP";
  }

  function generate() {
    const league = getSelectedLeague();
    const leagueConstraint = league;
    const profile = activeProfile;
    const includeMutators = shouldGenerateMutators();
    const requestedCount = includeMutators ? Math.max(1, Math.min(6, Number(mutatorCount.value) || 2)) : 0;
    const pool = allRules();
    let selected = [];
    let disqualifiers = [];
    let search = "";
    let cpConstraint = null;
    let compositionError = null;
    const cupPrefix = getStaticCupPrefix();
    const extraFilter = getExtraFilter();

    for (let attempt = 0; attempt < (includeMutators ? 30 : 1); attempt += 1) {
      selected = includeMutators ? chooseSelection(profile, leagueConstraint, requestedCount, pool) : [];
      const disqualifier = includeMutators ? chooseOptionalDisqualifier(pool, selected, profile, leagueConstraint) : null;
      disqualifiers = disqualifier ? [disqualifier] : [];
      cpConstraint = normalizeCpConstraint(leagueConstraint, selected);
      const otherRules = selected.filter((rule) => rule.family !== "cp");
      const parts = [cpConstraint.search, cupPrefix]
        .concat(additionalRuleExpressions())
        .concat(otherRules.map((rule) => rule.search), disqualifiers.map((rule) => rule.search)).filter(Boolean);
      try {
        search = GENERATOR_UTILS.combineSearch(parts);
        compositionError = null;
      } catch (error) {
        compositionError = error;
        continue;
      }
      if (search !== previousSearch || attempt === 29) break;
    }

    if (compositionError) {
      additionalRuleStatus.textContent = compositionError.message;
      generationNote.textContent = compositionError.message;
      return;
    }

    currentState = {
      league: league,
      selected: selected,
      disqualifiers: disqualifiers,
      cpConstraint: cpConstraint,
      search: search,
      requestedCount: requestedCount,
      includeMutators: includeMutators,
      cupPrefix: cupPrefix,
      cupName: getCurrentCupName(),
      extraFilter: extraFilter,
      additionalRules: additionalRules.slice()
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
    const cup = cupForSelection();
    if (cup) return cupDisplayName(cup);
    return getStaticCupPrefix() ? "Custom Cup" : "";
  }

  function updateCupFormatInfo() {
    cupFormatInfo.replaceChildren();
    const cup = cupForSelection();
    const rawPrefix = cupPrefixInput.value.trim();
    const prefixState = rawPrefix ? GENERATOR_UTILS.validateSearchExpression(rawPrefix) : { valid: true, error: "" };
    cupFormatError.hidden = !rawPrefix || prefixState.valid;
    cupFormatError.textContent = cupFormatError.hidden ? "" : "Cup search needs attention: " + prefixState.error;
    if (!cup && !rawPrefix) {
      cupFormatInfo.textContent = cupSelect.value === "custom"
        ? "Custom Cup filter selected. Enter a search prefix in More Cup settings."
        : "Open League — no Cup eligibility restrictions are active.";
      return;
    }
    const status = document.createElement("p");
    status.className = "cup-format-status";
    if (!cup) {
      status.textContent = "Custom Cup search filter. This is not a verified official Cup format.";
    } else if (!cup.official) {
      status.textContent = "Custom preset · not a verified official Cup format.";
    } else if (cup.officialLeague === selectedLeagueId()) {
      status.textContent = "Official format · " + (cup.edition || "verified GBL cup") + ". " +
        "Eligibility restrictions are listed below.";
    } else {
      status.textContent = "Custom league/Cup combination. Official " + cup.name + " eligibility restrictions are being used with the selected League.";
    }
    cupFormatInfo.appendChild(status);

    if (cup && Array.isArray(cup.manualRules) && cup.manualRules.length) {
      const manual = document.createElement("p");
      manual.className = "cup-manual-rules";
      manual.textContent = "Manual eligibility check: " + cup.manualRules.join(" ");
      cupFormatInfo.appendChild(manual);
    }
    if (cup && Array.isArray(cup.notes) && cup.notes.length) {
      const note = document.createElement("p");
      note.className = "cup-format-note";
      note.textContent = cup.notes.join(" ");
      cupFormatInfo.appendChild(note);
    }
    if (cup && cup.sourceUrl) {
      const source = document.createElement("a");
      source.href = cup.sourceUrl;
      source.target = "_blank";
      source.rel = "noreferrer";
      source.textContent = "Official format reference";
      cupFormatInfo.appendChild(source);
    }
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
      rule.role === "disqualifier_only" ||
      (Array.isArray(rule.tags) && rule.tags.includes("ban-shadow"));

    if (family === "pokemon-type" || family === "move-type" || family === "move-slot") {
      const rawTypes = Array.isArray(meta.types) ? meta.types :
        (Array.isArray(meta.move_types) ? meta.move_types : []);
      const validTypes = rawTypes.map((value) => String(value).toLowerCase()).filter((value) => types.includes(value));
      if (validTypes.length) return { kind: "types", types: validTypes, move: family !== "pokemon-type", banned: banned };
    }
    if (family === "shadow" || family === "purified") {
      if (id === "shadow" || id === "not-shadow") return { kind: "rule", icon: "shadow", banned: id === "not-shadow" };
      if (id === "purified" || id === "not-purified") return { kind: "rule", icon: "purified", banned: id === "not-purified" };
    }
    if (RULE_ICONS_BY_FAMILY[family]) {
      return { kind: "rule", icon: RULE_ICONS_BY_FAMILY[family], banned: family === "region" && banned };
    }
    return { kind: "fallback", banned: banned };
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
      if (spec.banned) appendIndicator(visual, "!", "visual-indicator--ban");
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
    chip.setAttribute("aria-label", label);
    chip.title = label;
    if (visualRule) {
      const visual = createRuleVisual(visualRule, "rule-visual rule-visual--chip");
      visual.querySelectorAll(".visual-indicator").forEach((indicator) => { indicator.textContent = ""; });
      chip.appendChild(visual);
    } else {
      const marker = document.createElement("span");
      marker.className = "rule-visual rule-visual--chip";
      marker.setAttribute("aria-hidden", "true");
      const dot = document.createElement("span");
      dot.className = "rule-marker";
      marker.appendChild(dot);
      chip.appendChild(marker);
    }
    filterSummary.appendChild(chip);
  }

  function compactRuleDescription(rule, description) {
    if (rule.id === "league-limit") return cpRangeDescription(currentState.cpConstraint);
    if (rule.id === "cup-prefix") return String(description || "").replace(" filter: ", " · ");

    const shortLabels = {
      "rare-any": "Legendary / Mythical / Ultra Beast",
      shiny: "Shiny only",
      shadow: "Shadow only",
      purified: "Purified only",
      "not-shadow": "Exclude Shadow",
      "not-purified": "Exclude Purified"
    };
    if (shortLabels[rule.id]) return shortLabels[rule.id];

    let text = rule.label || description || rule.explain || "Rule";
    if (rule.family === "age") {
      text = text
        .replace(/^Caught in last /i, "Last ")
        .replace(/^Caught within the last /i, "Last ")
        .replace(/^Caught within /i, "Within ")
        .replace(/^Caught about /i, "")
        .replace(/^Caught (?=\d+.*days ago$)/i, "");
    }
    if (String(rule.id).indexOf("type-banned-") === 0) text = text.replace(/^No (.+?) type Pokémon$/i, "No $1 typing");
    if (String(rule.id).indexOf("move-type-banned-") === 0) text = text.replace(/^No (.+?) type moves$/i, "No $1 moves");
    if (String(rule.id).indexOf("region-banned-") === 0) text = text.replace(/^No Pokémon from /i, "Not from ");
    return String(text).replaceAll("Pokemon", "Pokémon").replace(/[.]+$/, "");
  }

  function appendRuleRow(rule, description) {
    const row = document.createElement("li");
    row.appendChild(createRuleVisual(rule, "rule-visual"));
    const text = document.createElement("span");
    text.className = "rule-description";
    text.textContent = compactRuleDescription(rule, description);
    row.appendChild(text);
    ruleList.appendChild(row);
  }

  function renderSummary() {
    filterSummary.replaceChildren();
    const leagueRule = { id: "league-limit", family: "cp" };
    const cpConstraint = currentState.cpConstraint;
    const leagueName = currentState.league.label.replace(" League", "");
    const leagueLabel = cpConstraint.generatedRule
      ? leagueName + " · " + cpRangeSummary(cpConstraint)
      : Number.isFinite(cpConstraint.maxCp)
        ? leagueName + " · " + cpConstraint.maxCp.toLocaleString() + " CP"
        : currentState.league.label;
    createSummaryChip(leagueLabel, "league", leagueRule);
    if (currentState.cupName) createSummaryChip(currentState.cupName, "cup", null);
    currentState.additionalRules.forEach((rule) => createSummaryChip(rule.label, "additional", null));
    currentState.selected.forEach((rule) => {
      if (rule.family === "cp") return;
      createSummaryChip(getSummaryLabel(rule), "", rule);
    });
    currentState.disqualifiers.forEach((rule) => createSummaryChip(getSummaryLabel(rule), "", rule));
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
    additionalFilterPreview.textContent = currentState.search || "Add a rule or generate a filter to preview it here.";
    renderSummary();
    ruleList.replaceChildren();
    appendRuleRow({ id: "league-limit", family: "cp" }, cpRangeDescription(currentState.cpConstraint));
    if (currentState.cupName) {
      appendRuleRow({ id: "cup-prefix", family: "" }, currentState.cupPrefix
        ? currentState.cupName + " filter: " + currentState.cupPrefix
        : currentState.cupName + " · check the manual eligibility note above");
    }
    currentState.additionalRules.forEach((rule, index) => {
      appendRuleRow({ id: "additional-rule-" + index, family: "" }, rule.kind === "pokemon"
        ? "Exclude " + rule.label + " (Pokédex #" + rule.dex + ")"
        : "Additional search rule: " + rule.label);
    });
    currentState.selected.forEach((rule) => {
      if (rule.family === "cp") return;
      appendRuleRow(rule, rule.explain || rule.label);
    });
    currentState.disqualifiers.forEach((rule) => appendRuleRow(rule, rule.explain || rule.label));
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
    const hasCup = Boolean(cupSelect.value || cupPrefixInput.value.trim());
    cupSettingsFields.disabled = false;
    const canGenerateMutators = shouldGenerateMutators();
    cupLocks.disabled = !hasCup || !canGenerateMutators;
    cupLockTypes.disabled = !hasCup || !canGenerateMutators;
    cupLockMoves.disabled = !hasCup || !canGenerateMutators;
    includeMutatorsToggle.hidden = !hasCup;
    const lockNames = [];
    if (cupLockTypes.checked && hasCup) lockNames.push("Pokémon type rules");
    if (cupLockMoves.checked && hasCup) lockNames.push("move type rules");
    document.getElementById("cup-lock-note").textContent = hasCup && !canGenerateMutators
      ? "Cup locks are available when Include mutators is on."
      : lockNames.length
        ? "Paused for this Cup: " + lockNames.join(" and ") + ". Other rule families stay available."
        : "Choose any overlapping rule families to pause while this Cup filter is active.";
    updateMutatorSettingsVisibility();
    updateCupFormatInfo();
    syncFamilyControls();
  }

  function shouldGenerateMutators() {
    return GENERATOR_UTILS.shouldGenerateMutators(Boolean(cupSelect.value), includeMutatorsInput.checked);
  }

  function updateMutatorSettingsVisibility() {
    const enabled = shouldGenerateMutators();
    mutatorSettings.hidden = !enabled;
    mutatorAdvancedSettings.hidden = !enabled;
  }

  function syncMutatorModeForCurrentState(refreshFilter) {
    updateMutatorSettingsVisibility();
    if (!currentState) return;

    const enabled = shouldGenerateMutators();
    const previousEnabled = currentState.includeMutators !== false;
    const transition = GENERATOR_UTILS.mutatorModeTransition(previousEnabled, enabled);
    if (transition.shouldClear) {
      currentState.selected = [];
      currentState.disqualifiers = [];
      currentState.requestedCount = 0;
      currentState.includeMutators = false;
      markConfigPending();
      return;
    }
    if (transition.shouldRegenerate) {
      generate();
      return;
    }
    if (refreshFilter) markConfigPending();
  }

  function onCupSelectionChanged() {
    const id = cupSelect.value;
    currentCup = CUP_PRESETS.find((cup) => cup.id === id) || null;
    if (currentCup) {
      cupPrefixInput.value = cupPresetSearch(currentCup);
      cupLockTypes.checked = currentCup.lockTypes;
      cupLockMoves.checked = currentCup.lockMoves;
    } else if (id === "custom") {
      cupPrefixInput.value = "";
      cupLockTypes.checked = false;
      cupLockMoves.checked = false;
    } else {
      cupPrefixInput.value = "";
      cupLockTypes.checked = false;
      cupLockMoves.checked = false;
    }
    battleCount = 0;
    updateCupControls();
    syncMutatorModeForCurrentState(true);
  }

  function onCupPrefixChanged() {
    if (cupSelect.value && cupSelect.value !== "custom" && cupPrefixInput.value.trim() !== currentCup.search) {
      cupSelect.value = "custom";
      currentCup = null;
    } else if (cupPrefixInput.value.trim() && !cupSelect.value) {
      cupSelect.value = "custom";
      currentCup = null;
    } else if (!cupPrefixInput.value.trim() && cupSelect.value === "custom") {
      cupSelect.value = "";
      currentCup = null;
    }
    updateCupControls();
    syncMutatorModeForCurrentState(true);
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
    familyLimits.buddy = { min: "", max: "" };
    familyLimits.mega = { min: "", max: "" };
    familyLimits.time = { newerDate: "", oldestDate: DEFAULT_OLDEST_CATCH_DATE };
    typeLeaning = { types: [], strength: "medium", pokemon: true, move: true };
    syncFamilyControls();
    renderTypeLeaningControls();
    updateProfileChoices();
    extraFilterInput.value = "";
    advancedExpressionStatus.textContent = "";
    customBadge.hidden = true;
    markConfigPending();
  }

  function setupContextTooltips() {
    const items = Array.from(document.querySelectorAll("[data-context-tooltip-trigger]"))
      .map((trigger) => ({
        trigger: trigger,
        panel: document.getElementById(trigger.getAttribute("aria-controls")),
        hoveringTrigger: false,
        hoveringPanel: false
      }))
      .filter((item) => item.panel);
    let activeItem = null;
    let closeTimer = null;

    function clearCloseTimer() {
      if (closeTimer !== null) window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    function isFocused(item) {
      return item.trigger === document.activeElement || item.panel.contains(document.activeElement);
    }

    function position(item) {
      if (item.panel.hidden) return;
      item.panel.style.visibility = "hidden";
      item.panel.style.left = "0px";
      item.panel.style.top = "0px";
      const triggerRect = item.trigger.getBoundingClientRect();
      const panelRect = item.panel.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 12;
      const gap = 8;
      let left = triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;
      left = Math.max(margin, Math.min(left, viewportWidth - panelRect.width - margin));
      let top = triggerRect.bottom + gap;
      const topIfAbove = triggerRect.top - panelRect.height - gap;
      if (top + panelRect.height > viewportHeight - margin && topIfAbove >= margin) top = topIfAbove;
      top = Math.max(margin, Math.min(top, viewportHeight - panelRect.height - margin));
      item.panel.style.left = Math.round(left) + "px";
      item.panel.style.top = Math.round(top) + "px";
      item.panel.style.visibility = "";
    }

    function close(item, returnFocus) {
      if (!item || activeItem !== item) return;
      clearCloseTimer();
      item.trigger.setAttribute("aria-expanded", "false");
      item.panel.hidden = true;
      activeItem = null;
      if (returnFocus) item.trigger.focus();
    }

    function open(item) {
      clearCloseTimer();
      if (activeItem && activeItem !== item) close(activeItem, false);
      activeItem = item;
      item.panel.hidden = false;
      item.trigger.setAttribute("aria-expanded", "true");
      position(item);
    }

    function scheduleClose(item) {
      clearCloseTimer();
      closeTimer = window.setTimeout(() => {
        if (activeItem === item && !item.hoveringTrigger && !item.hoveringPanel && !isFocused(item)) close(item, false);
      }, 220);
    }

    items.forEach((item) => {
      item.trigger.addEventListener("pointerenter", (event) => {
        if (event.pointerType !== "mouse") return;
        item.hoveringTrigger = true;
        open(item);
      });
      item.trigger.addEventListener("pointerleave", (event) => {
        if (event.pointerType !== "mouse") return;
        item.hoveringTrigger = false;
        scheduleClose(item);
      });
      item.panel.addEventListener("pointerenter", (event) => {
        if (event.pointerType !== "mouse") return;
        item.hoveringPanel = true;
        clearCloseTimer();
      });
      item.panel.addEventListener("pointerleave", (event) => {
        if (event.pointerType !== "mouse") return;
        item.hoveringPanel = false;
        scheduleClose(item);
      });
      item.trigger.addEventListener("focus", () => open(item));
      item.panel.addEventListener("focusin", () => open(item));
      item.trigger.addEventListener("focusout", () => window.setTimeout(() => {
        if (activeItem === item && !isFocused(item) && !item.hoveringTrigger && !item.hoveringPanel) close(item, false);
      }, 0));
      item.panel.addEventListener("focusout", () => window.setTimeout(() => {
        if (activeItem === item && !isFocused(item) && !item.hoveringTrigger && !item.hoveringPanel) close(item, false);
      }, 0));
      item.trigger.addEventListener("click", () => open(item));
    });

    document.addEventListener("pointerdown", (event) => {
      if (activeItem && !activeItem.trigger.contains(event.target) && !activeItem.panel.contains(event.target)) close(activeItem, false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activeItem) {
        event.preventDefault();
        close(activeItem, true);
      }
    });
    window.addEventListener("resize", () => { if (activeItem) position(activeItem); });
    window.addEventListener("scroll", () => { if (activeItem) position(activeItem); }, true);
  }

  function setup() {
    setupContextTooltips();
    setupCupPicker();
    createFamilyControls(primaryFamilyControls, advancedFamilies.filter((definition) => definition.primary));
    createFamilyControls(additionalFamilyControls, advancedFamilies.filter((definition) => !definition.primary));
    loadProfileDefaults("chill");
    updateProfileChoices();
    renderTypeLeaningControls();
    renderAdditionalRuleChips();
    updateCupControls();

    additionalFamiliesToggle.addEventListener("change", () => {
      additionalFamiliesEnabled = additionalFamiliesToggle.checked;
      syncFamilyControls();
      markConfigPending();
    });

    document.querySelectorAll('input[name="randomness"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) updateProfileFromInput(input);
      });
    });
    typeLeaningAdd.addEventListener("change", () => {
      const selectedType = typeLeaningAdd.value;
      if (types.includes(selectedType) && !typeLeaning.types.includes(selectedType)) {
        typeLeaning.types.push(selectedType);
        renderTypeLeaningControls();
        markConfigPending();
      }
    });
    document.querySelectorAll('input[name="type-leaning-strength"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) return;
        typeLeaning.strength = input.value;
        markConfigPending();
      });
    });
    typeLeaningPokemon.addEventListener("change", () => {
      typeLeaning.pokemon = typeLeaningPokemon.checked;
      markConfigPending();
    });
    typeLeaningMove.addEventListener("change", () => {
      typeLeaning.move = typeLeaningMove.checked;
      markConfigPending();
    });
    cupSelect.addEventListener("change", onCupSelectionChanged);
    cupPrefixInput.addEventListener("input", onCupPrefixChanged);
    cupPrefixInput.addEventListener("input", () => {
      renderCupQuickSelections();
      updateCupPickerSelection();
    });
    includeMutatorsInput.addEventListener("change", () => {
      updateCupControls();
      syncMutatorModeForCurrentState(false);
    });
    cupLockTypes.addEventListener("change", () => { markProfileCustom(); updateCupControls(); markConfigPending(); });
    cupLockMoves.addEventListener("change", () => { markProfileCustom(); updateCupControls(); markConfigPending(); });
    leagueInputs.forEach((input) => input.addEventListener("change", () => {
      updateCupFormatInfo();
      markConfigPending();
    }));
    mutatorCount.addEventListener("change", markConfigPending);
    battleTargetInput.addEventListener("change", () => { battleCount = 0; markConfigPending(); });
    extraFilterInput.addEventListener("input", () => {
      const value = extraFilterInput.value.trim();
      const parsed = value ? GENERATOR_UTILS.validateSearchExpression(value) : { valid: true, error: "" };
      advancedExpressionStatus.textContent = parsed.valid ? "" : parsed.error;
      markProfileCustom();
      markConfigPending();
    });
    additionalRuleInput.addEventListener("input", () => {
      additionalRuleStatus.textContent = "";
      updateAdditionalSuggestions();
    });
    additionalRuleInput.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" && suggestionItems.length) {
        event.preventDefault();
        activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, suggestionItems.length - 1);
        updateAdditionalSuggestionsSelection();
      } else if (event.key === "ArrowUp" && suggestionItems.length) {
        event.preventDefault();
        activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
        updateAdditionalSuggestionsSelection();
      } else if (event.key === "Escape") {
        hideAdditionalSuggestions();
      } else if (event.key === "Enter") {
        event.preventDefault();
        addAdditionalRule();
      }
    });
    addAdditionalRuleButton.addEventListener("click", addAdditionalRule);
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
