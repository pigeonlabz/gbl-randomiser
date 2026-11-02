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
    { id: "shiny", label: "Shiny", description: "", ruleFamilies: ["visual-status"], primary: true },
    { id: "rarity", label: "Legendary", shortLabel: "Legendary", description: "Legendary, Mythical, or Ultra Beast Pokémon.", ruleFamilies: ["rarity"], primary: true },
    { id: "cp", label: "Random CP Cap", shortLabel: "Random CP Cap", description: "Adds a random CP limit within your selected league.", ruleFamilies: ["cp"], primary: true },
    { id: "pokemon-type", label: "Typing", shortLabel: "Typing", description: "", ruleFamilies: ["pokemon-type"], primary: true },
    { id: "region", label: "Regions", shortLabel: "Regions", description: "The region a Pokémon species originates from.", ruleFamilies: ["region"], primary: true },
    { id: "move-typing", label: "Move Typing", shortLabel: "Move Typing", description: "Requires or bans moves of selected types.", ruleFamilies: ["move-type", "move-slot"], primary: true },
    { id: "shadow", label: "Shadow", description: "", ruleFamilies: ["shadow"], primary: true },
    { id: "time", label: "Age", description: "How long ago the Pokémon was obtained.", ruleFamilies: ["age"], limits: "time" },
    { id: "xl-size", label: "XXL", description: "It's huge!", ruleFamilies: ["size-xl"], primary: true },
    { id: "xs-size", label: "XS / XXS", description: "Uses unusually small Pokémon.", ruleFamilies: ["size-xs"] },
    { id: "buddy", label: "Buddy", description: "Buddy level or no Buddy history.", ruleFamilies: ["buddy"], limits: "buddy" },
    { id: "weather", label: "Weather", description: "Has a move boosted by the current weather.", ruleFamilies: ["move-weather"], primary: true },
    { id: "mega", label: "Mega", description: "Mega-capable Pokémon, current Mega eligibility, and Mega level.", ruleFamilies: ["mega", "mega-level"], limits: "mega" },
    { id: "meta-moves", label: "Meta moves", description: "Excludes selected powerful or commonly used moves.", ruleFamilies: ["meta-moves"] },
    { id: "purified", label: "Purified", description: "Uses Purified Pokémon or excludes them.", ruleFamilies: ["purified"] },
    { id: "type-matchups", label: "Type Matchups", shortLabel: "Type Matchups", description: "Filters Pokémon that are weak to selected types or have moves that are super-effective against them.", ruleFamilies: ["type-effectiveness"], primary: true },
    { id: "acquisition", label: "Origin", shortLabel: "Origin", description: "How you obtained the Pokémon.", ruleFamilies: ["origin", "origin-special", "year"], primary: true },
    { id: "battle-stats", label: "Appraisal / IVs", shortLabel: "Appraisal / IVs", description: "Uses appraisal star ranges or battle-stat filters.", ruleFamilies: ["appraisal", "hp", "iv-attack", "iv-defense", "iv-hp", "iv-combo"] },
    { id: "collection", label: "Collection traits", shortLabel: "Collection", description: "Uses unusual collection and inventory traits.", ruleFamilies: ["lucky", "costume", "candy", "candy-xl", "powered-xl", "background", "copy-count", "buddy-candy"] },
    { id: "distance", label: "Distance", description: "How far away a Pokémon was caught from your current location.", ruleFamilies: ["distance"], primary: true },
    { id: "special-forms", label: "Special forms", shortLabel: "Special Forms", description: "Uses Dynamax, Gigantamax, or other special forms.", ruleFamilies: ["max", "max-count", "max-move", "special-status"] }
  ];
  const additionalFamilyIds = new Set(advancedFamilies.filter((definition) => !definition.primary).map((definition) => definition.id));

  const profileDefaults = {
    chill: {
      shiny: 3, rarity: 2, cp: 2, "pokemon-type": 9, region: 8, "move-typing": 5,
      shadow: 4, time: 6, purified: 1, "xl-size": 4, "xs-size": 4, buddy: 4,
      weather: 3, mega: 2, "meta-moves": 0, "type-matchups": 2,
      acquisition: 4, "battle-stats": 3, collection: 2, distance: 4, "special-forms": 1
    },
    spicy: {
      shiny: 5, rarity: 5, cp: 5, "pokemon-type": 6, region: 4, "move-typing": 7,
      shadow: 5, time: 5, purified: 2, "xl-size": 5, "xs-size": 4, buddy: 5,
      weather: 6, mega: 5, "meta-moves": 4, "type-matchups": 5,
      acquisition: 5, "battle-stats": 5, collection: 5, distance: 4, "special-forms": 4
    },
    chaos: {
      shiny: 5, rarity: 6, cp: 7, "pokemon-type": 4, region: 4, "move-typing": 8,
      shadow: 5, time: 5, purified: 2, "xl-size": 6, "xs-size": 5, buddy: 4,
      weather: 7, mega: 7, "meta-moves": 8, "type-matchups": 7,
      acquisition: 6, "battle-stats": 7, collection: 7, distance: 4, "special-forms": 8
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
    mega: "mega", "mega-level": "mega-level", buddy: "buddy", "move-weather": "weather", distance: "distance"
  };
  const DEFAULT_BACKGROUND_TYPES = ["steel", "water", "fairy"];

  const form = document.getElementById("filter-form");
  const cupSettingsFields = document.getElementById("cup-settings-fields");
  const cupSelect = document.getElementById("cup-select");
  const cupTileRow = document.getElementById("cup-tiles");
  const cupLibraryButton = document.getElementById("cup-library-open");
  const cupPickerPopup = document.getElementById("cup-picker-popup");
  const cupPickerSearch = document.getElementById("cup-picker-search");
  const officialCupOptions = document.getElementById("official-cup-options");
  const customCupOptions = document.getElementById("custom-cup-options");
  const cupPickerEmpty = document.getElementById("cup-picker-empty");
  const cupPickerClose = document.getElementById("cup-picker-close");
  const cupFormatInfo = document.getElementById("cup-format-info");
  const cupNoSelectionInfo = document.getElementById("cup-no-selection-info");
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
  const primaryFamilyControls = document.getElementById("primary-family-controls");
  const additionalFamilyControls = document.getElementById("additional-family-controls");
  const additionalFamiliesToggle = document.getElementById("additional-families-enabled");
  const additionalFamilyWarning = document.getElementById("additional-family-warning");
  const additionalFamilyState = document.getElementById("additional-family-state");
  const searchOutput = document.getElementById("search-output");
  const ruleList = document.getElementById("rule-list");
  const copyButton = document.getElementById("copy-filter");
  const copyStatus = document.getElementById("copy-status");
  const generationNote = document.getElementById("generation-note");
  const battleStatus = document.getElementById("battle-status");
  const customBadge = document.getElementById("custom-badge");
  const resetAdvancedButton = document.getElementById("reset-advanced");
  const customCupEditor = document.getElementById("custom-cup-editor");
  const customCupEditorClose = document.getElementById("custom-cup-editor-close");
  const customCupApply = document.getElementById("custom-cup-apply");
  const customCupEditorError = document.getElementById("custom-cup-editor-error");

  const familyControlElements = new Map();
  const familyLimitElements = new Map();
  const sizeCategoryElements = new Map();
  const DEFAULT_OLDEST_CATCH_DATE = "2016-07-06";
  const familyLimits = {
    buddy: { min: "", max: "" },
    mega: { min: "", max: "" },
    time: { newerDate: "", oldestDate: DEFAULT_OLDEST_CATCH_DATE }
  };
  let familySettings = {};
  let additionalFamiliesEnabled = false;
  let activeProfile = "chill";
  let typeLeaning = { types: [] };
  let sizeCategories = { xl: false, xxl: true };
  let additionalRules = [];
  let suggestionItems = [];
  let activeSuggestionIndex = -1;
  let currentCup = null;
  let lastActiveCupId = "";
  let suppressCustomCupDialog = false;
  const CUSTOM_CUP_SETTINGS_KEY = "gbl-filter-custom-cup-v1";
  let customCupSettings = readCustomCupSettings();
  let currentState = null;
  let configPending = false;
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
    const sizeSearch = GENERATOR_UTILS.sizeSearchForSelection(sizeCategories.xl, sizeCategories.xxl);
    const sizeBaseRule = rules.find((rule) => rule.id === "size-xl-group");
    const sizeRule = sizeSearch && sizeBaseRule ? makeRuleDisplay(Object.assign({}, sizeBaseRule, {
      id: "size-xl-selection",
      label: sizeCategories.xl && sizeCategories.xxl ? "XL or XXL size" : sizeCategories.xxl ? "XXL size" : "XL size",
      search: sizeSearch,
      explain: sizeCategories.xl && sizeCategories.xxl
        ? "Pokemon with XL or XXL size."
        : sizeCategories.xxl ? "Pokemon with XXL size." : "Pokemon with XL size."
    })) : null;
    const sourceRules = rules.filter((rule) => rule.pool !== "reference" && rule.family !== "size-xl" &&
      !(hasCustomTimeBounds && rule.family === "age") &&
      !(hasBuddyBounds && rule.family === "buddy") &&
      !(hasMegaBounds && (rule.family === "mega" || rule.family === "mega-level")));
    return sourceRules.map(makeRuleDisplay).concat(
      sizeRule ? [sizeRule] : [], hasCustomTimeBounds ? [makeTimeRule()] : [], makeBoundedBuddyRules(), makeBoundedMegaRules(), generatedExclusions
    );
  }

  function getStaticCupPrefix() {
    const value = cupSelect.value === "custom" ? customCupSettings.prefix : cupSelect.value ? cupPrefixInput.value : "";
    if (!value) return "";
    const parsed = GENERATOR_UTILS.validateSearchExpression(value);
    return parsed.valid ? GENERATOR_UTILS.stripCpTerms(parsed.normalized) : "";
  }
  function getExtraFilter() {
    const value = cupSelect.value === "custom" ? customCupSettings.extraFilter : "";
    if (!value) return "";
    const parsed = GENERATOR_UTILS.validateSearchExpression(value);
    return parsed.valid ? GENERATOR_UTILS.stripCpTerms(parsed.normalized) : "";
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
  function cupEmoji(cup) {
    const emoji = cup && typeof cup.emoji === "string" ? cup.emoji.trim() : "";
    return emoji || (cup && cup.official ? "🏆" : "🧩");
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
  function readCustomCupSettings() {
    const defaults = { prefix: "", additionalRules: [], extraFilter: "" };
    try {
      const saved = JSON.parse(window.localStorage.getItem(CUSTOM_CUP_SETTINGS_KEY) || "null");
      if (!saved || typeof saved !== "object") return defaults;
      const validExpression = (value) => {
        const parsed = GENERATOR_UTILS.validateSearchExpression(value);
        return parsed.valid ? GENERATOR_UTILS.stripCpTerms(parsed.normalized) : "";
      };
      return {
        prefix: validExpression(saved.prefix),
        extraFilter: validExpression(saved.extraFilter),
        additionalRules: (Array.isArray(saved.additionalRules) ? saved.additionalRules : []).reduce((result, rule) => {
          if (!rule || typeof rule !== "object") return result;
          const parsed = GENERATOR_UTILS.validateSearchExpression(rule.search);
          const search = parsed.valid ? GENERATOR_UTILS.stripCpTerms(parsed.normalized) : "";
          if (!search) return result;
          if (rule.kind === "pokemon" && Number.isInteger(Number(rule.dex))) {
            const dex = Number(rule.dex);
            if (result.some((item) => item.kind === "pokemon" && item.dex === dex)) return result;
            result.push({ kind: "pokemon", dex: dex, label: String(rule.label || "Pokémon"), search: search });
          } else if (rule.kind === "custom" && !result.some((item) => item.kind === "custom" && item.search.toLowerCase() === search.toLowerCase())) {
            result.push({ kind: "custom", label: search, search: search });
          }
          return result;
        }, [])
      };
    } catch (error) {
      return defaults;
    }
  }
  function saveCustomCupSettings() {
    try {
      window.localStorage.setItem(CUSTOM_CUP_SETTINGS_KEY, JSON.stringify(customCupSettings));
    } catch (error) {
      // Custom Cup remains usable for this page view when local storage is unavailable.
    }
  }
  function cupPickerItem(id) {
    if (id === "custom") return { id: "custom", name: "Custom Cup filter…", official: false };
    return CUP_PRESETS.find((cup) => cup.id === id) || null;
  }
  function normalizeCupSearchText(value) {
    return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
  function buildCupSearchIndex(cup, typeNames, speciesList, leagueMap) {
    const normalize = normalizeCupSearchText;
    const typeSet = new Set(typeNames.map(normalize));
    const speciesById = new Map(speciesList.map((species) => [String(species.id), species.name]));
    const rules = [];
    const keywords = [];
    const ruleKeys = new Set();
    const typeEmojis = {
      normal: "⚪", fire: "🔥", water: "💧", grass: "🌿", electric: "⚡", ice: "❄️",
      fighting: "🥊", poison: "☠️", ground: "🟤", flying: "🪽", psychic: "🔮", bug: "🐛",
      rock: "🪨", ghost: "👻", dragon: "🐉", dark: "🌑", steel: "⚙️", fairy: "🧚"
    };
    const toList = (value) => Array.isArray(value) ? value : value == null || value === "" ? [] : [value];
    const addRule = (searchTerms, reason) => {
      const normalizedTerms = toList(searchTerms).map(normalize).filter(Boolean);
      if (!normalizedTerms.length) return;
      const searchText = normalizedTerms.join(" ");
      if (ruleKeys.has(searchText)) return;
      ruleKeys.add(searchText);
      rules.push({ searchText, reason });
    };
    const addTypeRule = (rawType, allowed) => {
      const type = normalize(rawType);
      if (!typeSet.has(type)) return false;
      const title = type.charAt(0).toUpperCase() + type.slice(1);
      addRule(type, allowed ? (typeEmojis[type] || "🔹") + " " + title + " type allowed" : "🚫 " + title + " type banned");
      return true;
    };
    const addMoveRule = (move) => {
      const label = String(move || "").trim().replace(/^!+@*/, "").replace(/^@+/, "");
      if (!label) return;
      const type = typeNames.find((candidate) => normalize(candidate) === normalize(label));
      const title = type || label;
      const icon = type ? typeEmojis[normalize(type)] || "⚡" : "⚡";
      addRule([label, "@" + label], icon + " " + title.charAt(0).toUpperCase() + title.slice(1) + (type ? " moves restricted" : " move restriction"));
    };
    const addPokemonRule = (value) => {
      const id = value && typeof value === "object" ? value.id : value;
      const name = value && typeof value === "object" ? value.name : speciesById.get(String(id));
      const label = name || String(value || "").trim();
      if (label) addRule([label, id], "🚫 " + label + " restricted");
    };
    const addStructuredTypes = (values, allowed) => toList(values).forEach((value) => addTypeRule(value, allowed));
    const addCustomTerms = (values) => toList(values).forEach((value) => {
      if (typeof value !== "string" && typeof value !== "number") return;
      const term = String(value).trim();
      if (term) keywords.push({ searchText: normalize(term), reason: "🔎 Preset term: " + term });
    });

    const suggestedLeagueId = cup.suggestedLeague || cup.officialLeague || cup.league;
    const leagueLabel = suggestedLeagueId && leagueMap[suggestedLeagueId] ? leagueMap[suggestedLeagueId].label : "";
    const typeRestrictions = cup.typeRestrictions && typeof cup.typeRestrictions === "object" ? cup.typeRestrictions : {};
    addStructuredTypes(cup.eligibleTypes || cup.allowedTypes || typeRestrictions.eligible || typeRestrictions.allowed, true);
    addStructuredTypes(cup.bannedTypes || cup.excludedTypes || cup.typeBans || typeRestrictions.banned || typeRestrictions.excluded, false);
    if (Array.isArray(cup.types)) addStructuredTypes(cup.types, true);

    ["speciesBans", "pokemonBans", "bannedSpecies", "bannedPokemon", "pokemonRestrictions", "speciesRestrictions"]
      .forEach((key) => toList(cup[key]).forEach(addPokemonRule));
    ["moveRestrictions", "moveBans", "bannedMoves", "requiredMoves", "allowedMoves", "moveTypes"]
      .forEach((key) => toList(cup[key]).forEach(addMoveRule));

    String(cup.search || "").split(/[&,]/).forEach((rawTerm) => {
      const term = rawTerm.trim();
      if (!term) return;
      const isBanned = term.startsWith("!");
      const withoutExclusion = term.replace(/^!+/, "");
      if (withoutExclusion.startsWith("@")) {
        addMoveRule(withoutExclusion);
        return;
      }
      if (addTypeRule(withoutExclusion, !isBanned)) return;
      const dexId = withoutExclusion.match(/^\d+$/);
      if (dexId && speciesById.has(dexId[0])) {
        addPokemonRule(dexId[0]);
        return;
      }
      addRule([withoutExclusion, term], "🔎 Search rule: " + term);
    });

    const metadata = cup.metadata && typeof cup.metadata === "object" ? cup.metadata : {};
    [cup.searchTerms, cup.customSearchTerms, cup.keywords, metadata.searchTerms, metadata.keywords].forEach(addCustomTerms);
    const name = normalize(cup.name);
    const league = normalize(leagueLabel);
    return {
      name,
      league,
      leagueLabel,
      rules,
      keywords,
      searchText: [name, league, rules.map((rule) => rule.searchText).join(" "), keywords.map((term) => term.searchText).join(" ")].join(" ")
    };
  }
  function cupSearchIndex(cup) {
    return buildCupSearchIndex(cup, types, SPECIES, leagues);
  }
  function matchCupSearch(index, query) {
    const terms = normalizeCupSearchText(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return { matches: true, reason: "" };
    if (!terms.every((term) => index.searchText.includes(term))) return { matches: false, reason: "" };
    if (terms.every((term) => index.name.includes(term))) return { matches: true, reason: "" };

    const matchingRule = index.rules.find((rule) => terms.some((term) => rule.searchText.includes(term)));
    if (matchingRule) return { matches: true, reason: matchingRule.reason };
    const matchingKeyword = index.keywords.find((keyword) => terms.some((term) => keyword.searchText.includes(term)));
    if (matchingKeyword) return { matches: true, reason: matchingKeyword.reason };
    return { matches: true, reason: "" };
  }
  function cupQuickLabel(cup) {
    if (cup.id === "custom") return "Custom";
    if (cup.id === "rock-challenge") return "Rock Challenge";
    return cup.name.replace(/\s+Cup(?::)?/i, "").replace(/:\s*/, " ").replace(/\s+League$/i, "").trim();
  }
  function scrollSelectedCupIntoView() {
    const selected = Array.from(cupTileRow.querySelectorAll("[data-cup-id]"))
      .find((button) => button.dataset.cupId === cupSelect.value);
    if (!selected) return;
    const rowBounds = cupTileRow.getBoundingClientRect();
    const tileBounds = selected.getBoundingClientRect();
    let nextScrollLeft = cupTileRow.scrollLeft;
    if (tileBounds.left < rowBounds.left) nextScrollLeft += tileBounds.left - rowBounds.left;
    else if (tileBounds.right > rowBounds.right) nextScrollLeft += tileBounds.right - rowBounds.right;
    if (nextScrollLeft !== cupTileRow.scrollLeft) cupTileRow.scrollTo({ left: nextScrollLeft, behavior: "smooth" });
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
    scrollSelectedCupIntoView();
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
    openLabel.textContent = "None";
    openButton.append(openIcon, openLabel);
    cupTileRow.appendChild(openButton);

    const ids = recentCupIds.filter((id) => id && cupPickerItem(id));
    if (cupSelect.value && cupPickerItem(cupSelect.value)) {
      ids.unshift(cupSelect.value);
    }
    const orderedIds = Array.from(new Set(ids.concat(CUP_PRESETS.map((cup) => cup.id), "custom")));
    orderedIds.forEach((id) => {
      const cup = cupPickerItem(id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cup-quick-tile";
      button.dataset.cupId = cup.id;
      const cupName = cup.id === "custom" ? "Custom Cup filter: enter your own eligibility search" : cupDisplayName(cup);
      button.setAttribute("aria-label", cupName);
      button.setAttribute("aria-pressed", String(cup.id === cupSelect.value));
      button.title = cupDisplayName(cup);
      const icon = document.createElement("span");
      icon.className = "cup-quick-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = cupEmoji(cup);
      const label = document.createElement("span");
      label.className = "cup-quick-label";
      label.textContent = cupQuickLabel(cup);
      button.append(icon, label);
      cupTileRow.appendChild(button);
    });

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
      button.setAttribute("aria-label", cupDisplayName(cup) + (cup.official ? ", official format" : ", custom cup"));
      const name = document.createElement("span");
      name.className = "cup-option-name";
      const emoji = document.createElement("span");
      emoji.className = "cup-option-emoji";
      emoji.setAttribute("aria-hidden", "true");
      emoji.textContent = cupEmoji(cup);
      const title = document.createElement("span");
      title.className = "cup-option-title";
      title.textContent = cup.name;
      name.append(emoji, title);
      button.appendChild(name);
      const suggestedLeague = cupSuggestedLeague(cup);
      const meta = document.createElement("small");
      meta.className = "cup-option-meta";
      meta.textContent = suggestedLeague ? "Suggested: " + suggestedLeague.label : cup.id === "custom" ? "Enter your own eligibility search" : "Custom preset";
      button.appendChild(meta);
      const matchReason = document.createElement("small");
      matchReason.className = "cup-option-match-reason";
      matchReason.hidden = true;
      button.appendChild(matchReason);
      button.cupSearchIndex = cupSearchIndex(cup);
      (cup.official ? officialCupOptions : customCupOptions).appendChild(button);
    });
    updateCupPickerSearch();
    updateCupPickerSelection();
  }
  function updateCupPickerSearch() {
    const query = cupPickerSearch.value.trim();
    let visibleCount = 0;
    cupPickerPopup.querySelectorAll("[data-cup-option]").forEach((button) => {
      const result = matchCupSearch(button.cupSearchIndex, query);
      button.hidden = !result.matches;
      const reason = button.querySelector(".cup-option-match-reason");
      reason.textContent = result.reason;
      reason.hidden = !result.matches || !result.reason;
      if (result.matches) visibleCount += 1;
    });
    document.getElementById("official-cup-group").hidden = !officialCupOptions.querySelector("[data-cup-option]:not([hidden])");
    document.getElementById("custom-cup-group").hidden = !customCupOptions.querySelector("[data-cup-option]:not([hidden])");
    cupPickerEmpty.hidden = visibleCount > 0;
  }
  function positionCupPicker() {
    if (cupPickerPopup.hidden) return;
    const anchor = cupLibraryButton.getBoundingClientRect();
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
    cupLibraryButton.setAttribute("aria-expanded", "false");
    if (returnFocus) cupLibraryButton.focus();
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
    cupLibraryButton.setAttribute("aria-expanded", "true");
    positionCupPicker();
    cupPickerSearch.focus({ preventScroll: true });
  }
  function rememberCupSelection() {
    const id = cupSelect.value;
    if (!id) {
      updateCupPickerSelection();
      return;
    }
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
      const cupButton = event.target.closest("[data-cup-id]");
      if (!cupButton) return;
      requestCupSelection(cupButton.dataset.cupId);
    });
    cupLibraryButton.addEventListener("click", () => {
      if (cupPickerPopup.hidden) openCupPicker();
      else closeCupPicker(false);
    });
    cupPickerPopup.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cup-option]");
      if (!button) return;
      closeCupPicker(true);
      requestCupSelection(button.dataset.cupId);
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
      if (!cupPickerPopup.hidden && !cupPickerPopup.contains(event.target) &&
        !cupTileRow.contains(event.target) && !cupLibraryButton.contains(event.target)) closeCupPicker(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !cupPickerPopup.hidden) {
        event.preventDefault();
        closeCupPicker(true);
      }
    });
    window.addEventListener("resize", positionCupPicker);
    window.addEventListener("scroll", positionCupPicker, true);
    cupTileRow.addEventListener("wheel", (event) => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX) || cupTileRow.scrollWidth <= cupTileRow.clientWidth) return;
      event.preventDefault();
      cupTileRow.scrollLeft += event.deltaY;
    }, { passive: false });
  }
  function requestCupSelection(id) {
    if (id === "custom") {
      openCustomCupEditor();
      return;
    }
    if (cupSelect.value === id) return;
    cupSelect.value = id;
    cupSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function cupPresetSearch(cup) {
    const bannedSpecies = (cup.speciesBans || []).map((dex) => "!" + dex).join("&");
    return GENERATOR_UTILS.stripCpTerms(GENERATOR_UTILS.combineSearch([cup.search, bannedSpecies]));
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
    if (cupSelect.value !== "custom") return [];
    return customCupSettings.additionalRules.map((rule) => GENERATOR_UTILS.stripCpTerms(rule.search))
      .concat(getExtraFilter()).filter(Boolean);
  }

  function updateCustomCupDraftPreview() {
    const prefixValue = cupPrefixInput.value.trim();
    const expressionValue = extraFilterInput.value.trim();
    const prefix = prefixValue ? GENERATOR_UTILS.validateSearchExpression(prefixValue) : { valid: true, normalized: "" };
    const expression = expressionValue ? GENERATOR_UTILS.validateSearchExpression(expressionValue) : { valid: true, normalized: "" };
    const error = !prefix.valid ? "Cup search prefix: " + prefix.error :
      !expression.valid ? "Custom Search Expression: " + expression.error : "";
    customCupEditorError.textContent = error;
    advancedExpressionStatus.textContent = expression.valid ? "" : expression.error;
    cupFormatError.hidden = true;
    cupFormatError.textContent = "";
    if (error) return;
    try {
      additionalFilterPreview.textContent = GENERATOR_UTILS.combineSearch([
        GENERATOR_UTILS.stripCpTerms(prefix.normalized),
        ...additionalRules.map((rule) => GENERATOR_UTILS.stripCpTerms(rule.search)),
        GENERATOR_UTILS.stripCpTerms(expression.normalized)
      ]) || "Add Cup eligibility rules to preview the search.";
    } catch (previewError) {
      customCupEditorError.textContent = previewError.message;
    }
  }

  function openCustomCupEditor() {
    cupPrefixInput.value = customCupSettings.prefix;
    additionalRules = customCupSettings.additionalRules.map((rule) => Object.assign({}, rule));
    extraFilterInput.value = customCupSettings.extraFilter;
    additionalRuleInput.value = "";
    additionalRuleStatus.textContent = "";
    advancedExpressionStatus.textContent = "";
    customCupEditorError.textContent = "";
    hideAdditionalSuggestions();
    renderAdditionalRuleChips();
    updateCustomCupDraftPreview();
    if (!customCupEditor.open) customCupEditor.showModal();
    additionalRuleInput.focus({ preventScroll: true });
  }

  function applyCustomCupEditor() {
    const prefixValue = cupPrefixInput.value.trim();
    const expressionValue = extraFilterInput.value.trim();
    const prefix = prefixValue ? GENERATOR_UTILS.validateSearchExpression(prefixValue) : { valid: true, normalized: "" };
    const expression = expressionValue ? GENERATOR_UTILS.validateSearchExpression(expressionValue) : { valid: true, normalized: "" };
    if (!prefix.valid || !expression.valid) {
      updateCustomCupDraftPreview();
      (prefix.valid ? extraFilterInput : cupPrefixInput).focus();
      return;
    }
    const nextRules = additionalRules.map((rule) => {
      const parsed = GENERATOR_UTILS.validateSearchExpression(rule.search);
      return parsed.valid ? Object.assign({}, rule, {
        search: GENERATOR_UTILS.stripCpTerms(parsed.normalized),
        label: rule.kind === "pokemon" ? rule.label : GENERATOR_UTILS.stripCpTerms(parsed.normalized)
      }) : null;
    }).filter((rule) => rule && rule.search);
    customCupSettings = {
      prefix: GENERATOR_UTILS.stripCpTerms(prefix.normalized),
      additionalRules: nextRules,
      extraFilter: GENERATOR_UTILS.stripCpTerms(expression.normalized)
    };
    saveCustomCupSettings();
    additionalRules = customCupSettings.additionalRules.map((rule) => Object.assign({}, rule));
    customCupEditor.close("apply");
    if (cupSelect.value !== "custom") {
      suppressCustomCupDialog = true;
      cupSelect.value = "custom";
      cupSelect.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      currentCup = null;
      cupPrefixInput.value = customCupSettings.prefix;
      updateCupPickerSelection();
      updateCupControls();
      syncMutatorModeForCurrentState(true);
    }
  }

  function restoreCupPrefixInput() {
    cupPrefixInput.value = cupSelect.value === "custom"
      ? customCupSettings.prefix
      : currentCup ? cupPresetSearch(currentCup) : "";
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

  function isTypeLeaningEnabled() {
    return typeLeaning.types.length > 0;
  }

  function typeLeaningWeight(type) {
    return GENERATOR_UTILS.typeWeight(type, typeLeaning.types, "balanced", isTypeLeaningEnabled());
  }

  function sampleWeightedTypes(values, minCount, maxCount, scope) {
    const count = randomInteger(minCount, Math.min(maxCount, values.length));
    return GENERATOR_UTILS.weightedSample(values, count, (value) => typeLeaningWeight(value)).sort();
  }

  function ruleTypeLeaningWeight(rule) {
    const meta = rule.meta || {};
    const ruleId = String(rule.id || "");
    if (ruleId.indexOf("type-banned-") === 0 || ruleId.indexOf("move-type-banned-") === 0) return 1;
    if (rule.family === "pokemon-type") {
      const ruleTypes = Array.isArray(meta.types) ? meta.types : [];
      return ruleTypes.length ? ruleTypes.reduce((sum, type) => sum + typeLeaningWeight(type), 0) / ruleTypes.length : 1;
    }
    if (rule.family === "move-type" || rule.family === "move-slot") {
      const ruleTypes = Array.isArray(meta.move_types) ? meta.move_types : [];
      return ruleTypes.length ? ruleTypes.reduce((sum, type) => sum + typeLeaningWeight(type), 0) / ruleTypes.length : 1;
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
      title.textContent = definition.shortLabel || definition.label;
      const tooltipId = "family-" + definition.id + "-tooltip";
      let helper = null;
      let infoButton = null;
      if (definition.description) {
        row.classList.add("has-family-tooltip");
        helper = document.createElement("div");
        helper.className = "context-tooltip family-description-tooltip";
        helper.id = tooltipId;
        helper.setAttribute("role", "dialog");
        helper.setAttribute("aria-labelledby", tooltipId + "-title");
        helper.hidden = true;
        const tooltipTitle = document.createElement("h2");
        tooltipTitle.id = tooltipId + "-title";
        tooltipTitle.className = "visually-hidden";
        tooltipTitle.textContent = definition.label + " details";
        const tooltipDescription = document.createElement("p");
        tooltipDescription.className = "family-description";
        tooltipDescription.textContent = definition.description;
        helper.append(tooltipTitle, tooltipDescription);
        checkbox.setAttribute("aria-describedby", helper.id);
      }
      toggleLabel.append(checkbox, title);
      heading.appendChild(toggleLabel);
      if (helper) {
        infoButton = document.createElement("button");
        infoButton.className = "info-trigger family-info-trigger";
        infoButton.type = "button";
        infoButton.setAttribute("aria-label", definition.label + " information");
        infoButton.setAttribute("aria-haspopup", "dialog");
        infoButton.setAttribute("aria-expanded", "false");
        infoButton.setAttribute("aria-controls", helper.id);
        infoButton.setAttribute("aria-describedby", helper.id);
        infoButton.setAttribute("data-context-tooltip-trigger", "");
        const infoIcon = document.createElement("span");
        infoIcon.setAttribute("aria-hidden", "true");
        infoIcon.textContent = "ⓘ";
        infoButton.appendChild(infoIcon);
      }
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
      row.appendChild(heading);
      if (infoButton) row.appendChild(infoButton);
      if (definition.id === "xl-size") {
        const options = document.createElement("div");
        options.className = "family-size-options";
        [{ id: "xl", label: "XL" }, { id: "xxl", label: "XXL" }].forEach((category) => {
          const label = document.createElement("label");
          const input = document.createElement("input");
          input.type = "checkbox";
          input.id = "family-size-" + category.id;
          input.checked = Boolean(sizeCategories[category.id]);
          input.setAttribute("aria-label", category.label + " size Pokémon");
          const text = document.createElement("span");
          text.textContent = category.label;
          label.append(input, text);
          options.appendChild(label);
          sizeCategoryElements.set(category.id, input);
          input.addEventListener("change", () => {
            sizeCategories[category.id] = input.checked;
            markProfileCustom();
            syncFamilyControls();
            markConfigPending();
          });
        });
        row.appendChild(options);
      }
      row.appendChild(weightLabel);
      if (helper) row.appendChild(helper);
      if (limitControls) row.appendChild(limitControls.panel);
      container.appendChild(row);
      familyControlElements.set(definition.id, { checkbox: checkbox, range: range, output: output, row: row, helper: helper && helper.querySelector(".family-description") });
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
      if (elements.helper) {
        elements.helper.textContent = blocked
          ? definition.description + " Paused while this Cup prefix handles it."
          : definition.description;
      }
      updateRangeProgress(elements.range);
      const limits = familyLimitElements.get(definition.id);
      if (limits && limits.sync) limits.sync();
      if (limits && limits.inputs.length && definition.limits !== "time") {
        const bounds = familyLimits[definition.limits];
        limits.inputs[0].value = bounds.min;
        limits.inputs[1].value = bounds.max;
      }
    });
    sizeCategoryElements.forEach((input, category) => {
      input.checked = Boolean(sizeCategories[category]);
      input.disabled = !familySettings["xl-size"].enabled;
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
    if (customCupEditor.open) {
      updateCustomCupDraftPreview();
      return;
    }
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
      currentState.additionalRules = cupSelect.value === "custom" ? customCupSettings.additionalRules.slice() : [];
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

  function cpRangeDescription(range) {
    if (range.minCp === 0 && Number.isFinite(range.maxCp)) return "Max " + range.maxCp.toLocaleString() + " CP";
    if (range.minCp === range.maxCp) return "Exactly " + range.minCp.toLocaleString() + " CP";
    if (!Number.isFinite(range.maxCp)) return range.minCp > 0 ? range.minCp.toLocaleString() + "+ CP" : "No CP cap";
    return range.minCp.toLocaleString() + "–" + range.maxCp.toLocaleString() + " CP";
  }

  function generate() {
    if (customCupEditor.open) return;
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
      additionalRules: cupSelect.value === "custom" ? customCupSettings.additionalRules.slice() : []
    };
    previousSearch = search;
    configPending = false;
    const target = Math.max(0, Math.min(99, Number(battleTargetInput.value) || 0));
    if (target > 0 && battleCount >= target) battleCount = 0;
    battleCount += 1;
    render();
  }

  function getCurrentCupName() {
    const cup = cupForSelection();
    if (cup) return cupDisplayName(cup);
    return cupSelect.value === "custom" ? "Custom Cup" : "";
  }

  function updateCupFormatInfo() {
    cupFormatInfo.replaceChildren();
    const cup = cupForSelection();
    const rawPrefix = cupSelect.value === "custom" ? customCupSettings.prefix : cup ? cupPrefixInput.value.trim() : "";
    const prefixState = rawPrefix ? GENERATOR_UTILS.validateSearchExpression(rawPrefix) : { valid: true, error: "" };
    cupFormatError.hidden = !rawPrefix || prefixState.valid;
    cupFormatError.textContent = cupFormatError.hidden ? "" : "Cup search needs attention: " + prefixState.error;
    cupNoSelectionInfo.hidden = Boolean(cupSelect.value || rawPrefix);
    if (!cup && !rawPrefix && cupSelect.value !== "custom") {
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

  function appendRuleRow(rule, description, index) {
    const row = document.createElement("li");
    const details = String(description || rule.explain || rule.label || "Active restriction");
    const tooltipId = "active-rule-tooltip-" + index;
    const trigger = document.createElement("button");
    trigger.className = "rule-tooltip-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-label", details);
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", tooltipId);
    trigger.setAttribute("aria-describedby", tooltipId);
    trigger.setAttribute("data-context-tooltip-trigger", "");
    trigger.appendChild(createRuleVisual(rule, "rule-visual"));

    const tooltip = document.createElement("div");
    tooltip.id = tooltipId;
    tooltip.className = "context-tooltip rule-context-tooltip";
    tooltip.setAttribute("role", "dialog");
    tooltip.setAttribute("aria-labelledby", tooltipId + "-title");
    tooltip.hidden = true;
    const title = document.createElement("h2");
    title.id = tooltipId + "-title";
    title.className = "visually-hidden";
    title.textContent = "Active restriction";
    const text = document.createElement("p");
    text.textContent = details;
    tooltip.append(title, text);

    row.append(trigger, tooltip);
    ruleList.appendChild(row);
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
    battleStatus.hidden = !target;
    battleStatus.textContent = target ? "Battle " + battleCount + " of " + target : "";
  }

  function resizeSearchOutput() {
    searchOutput.style.height = "auto";
    const cap = Math.max(116, Math.floor(window.innerHeight * 0.55));
    searchOutput.style.height = Math.min(Math.max(searchOutput.scrollHeight, 116), cap) + "px";
  }

  function render() {
    searchOutput.value = currentState.search;
    resizeSearchOutput();
    additionalFilterPreview.textContent = currentState.search || "Add a rule or generate a filter to preview it here.";
    ruleList.replaceChildren();
    let ruleIndex = 0;
    appendRuleRow({ id: "league-limit", family: "cp" }, cpRangeDescription(currentState.cpConstraint), ruleIndex++);
    if (currentState.cupName) {
      const cupDescription = currentState.cupPrefix
        ? currentState.cupName + " filter: " + currentState.cupPrefix
        : currentState.cupName === "Custom Cup"
          ? "Custom Cup · user-defined eligibility rules"
          : currentState.cupName + " · check the manual eligibility note above";
      appendRuleRow({ id: "cup-prefix", family: "" }, cupDescription, ruleIndex++);
    }
    currentState.additionalRules.forEach((rule, index) => {
      appendRuleRow({ id: "additional-rule-" + index, family: "" }, rule.kind === "pokemon"
        ? "Exclude " + rule.label + " (Pokédex #" + rule.dex + ")"
        : "Additional search rule: " + rule.label, ruleIndex++);
    });
    if (currentState.extraFilter) {
      appendRuleRow({ id: "advanced-expression", family: "" }, "Advanced search expression: " + currentState.extraFilter, ruleIndex++);
    }
    currentState.selected.forEach((rule) => {
      if (rule.family === "cp") return;
      appendRuleRow(rule, rule.explain || rule.label, ruleIndex++);
    });
    currentState.disqualifiers.forEach((rule) => appendRuleRow(rule, rule.explain || rule.label, ruleIndex++));
    applyTypeBackground();
    updateBattleStatus();
    updateGenerationNote();
    copyStatus.textContent = "";
    copyButton.classList.remove("is-copied");
    copyButton.setAttribute("aria-label", "Copy filter");
    copyButton.dataset.tooltip = "Copy filter";
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
    copyButton.classList.toggle("is-copied", copied);
    copyButton.setAttribute("aria-label", copied ? "Filter copied" : "Copy filter");
    copyButton.dataset.tooltip = copied ? "Copied" : "Copy filter";
    window.clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = window.setTimeout(() => {
      copyStatus.textContent = "";
      copyButton.classList.remove("is-copied");
      copyButton.setAttribute("aria-label", "Copy filter");
      copyButton.dataset.tooltip = "Copy filter";
    }, 2500);
  }

  function updateCupControls() {
    const hasCup = Boolean(cupSelect.value);
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
    if (id === "custom" && !suppressCustomCupDialog) {
      cupSelect.value = lastActiveCupId;
      updateCupPickerSelection();
      openCustomCupEditor();
      return;
    }
    suppressCustomCupDialog = false;
    lastActiveCupId = id;
    currentCup = CUP_PRESETS.find((cup) => cup.id === id) || null;
    if (currentCup) {
      cupPrefixInput.value = cupPresetSearch(currentCup);
      cupLockTypes.checked = currentCup.lockTypes;
      cupLockMoves.checked = currentCup.lockMoves;
    } else if (id === "custom") {
      cupPrefixInput.value = customCupSettings.prefix;
      cupLockTypes.checked = false;
      cupLockMoves.checked = false;
      additionalRules = customCupSettings.additionalRules.map((rule) => Object.assign({}, rule));
    } else {
      cupPrefixInput.value = "";
      cupLockTypes.checked = false;
      cupLockMoves.checked = false;
    }
    battleCount = 0;
    updateCupPickerSelection();
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
    typeLeaning = { types: [] };
    sizeCategories = { xl: false, xxl: true };
    syncFamilyControls();
    renderTypeLeaningControls();
    updateProfileChoices();
    customBadge.hidden = true;
    markConfigPending();
  }

  function setupContextTooltips() {
    const items = new WeakMap();
    let activeItem = null;
    let closeTimer = null;

    function itemForTrigger(trigger) {
      if (!trigger) return null;
      if (!items.has(trigger)) {
        const panel = document.getElementById(trigger.getAttribute("aria-controls"));
        if (!panel) return null;
        items.set(trigger, { trigger: trigger, panel: panel, hoveringTrigger: false, hoveringPanel: false });
      }
      return items.get(trigger);
    }

    function itemForPanel(panel) {
      if (!panel) return null;
      const trigger = Array.from(document.querySelectorAll("[data-context-tooltip-trigger]"))
        .find((candidate) => candidate.getAttribute("aria-controls") === panel.id);
      return itemForTrigger(trigger);
    }

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

    document.addEventListener("pointerdown", (event) => {
      if (activeItem && !activeItem.trigger.contains(event.target) && !activeItem.panel.contains(event.target)) close(activeItem, false);
    });
    document.addEventListener("pointerover", (event) => {
      if (event.pointerType !== "mouse") return;
      const trigger = event.target.closest && event.target.closest("[data-context-tooltip-trigger]");
      if (trigger) {
        const item = itemForTrigger(trigger);
        if (item) {
          item.hoveringTrigger = true;
          open(item);
        }
        return;
      }
      const item = itemForPanel(event.target.closest && event.target.closest(".context-tooltip"));
      if (item) {
        item.hoveringPanel = true;
        clearCloseTimer();
      }
    });
    document.addEventListener("pointerout", (event) => {
      if (event.pointerType !== "mouse") return;
      const trigger = event.target.closest && event.target.closest("[data-context-tooltip-trigger]");
      if (trigger && (!event.relatedTarget || !trigger.contains(event.relatedTarget))) {
        const item = itemForTrigger(trigger);
        if (item) {
          item.hoveringTrigger = false;
          scheduleClose(item);
        }
        return;
      }
      const panel = event.target.closest && event.target.closest(".context-tooltip");
      if (panel && (!event.relatedTarget || !panel.contains(event.relatedTarget))) {
        const item = itemForPanel(panel);
        if (item) {
          item.hoveringPanel = false;
          scheduleClose(item);
        }
      }
    });
    document.addEventListener("focusin", (event) => {
      const trigger = event.target.closest && event.target.closest("[data-context-tooltip-trigger]");
      const item = trigger ? itemForTrigger(trigger) : itemForPanel(event.target.closest && event.target.closest(".context-tooltip"));
      if (item) open(item);
    });
    document.addEventListener("focusout", (event) => {
      const trigger = event.target.closest && event.target.closest("[data-context-tooltip-trigger]");
      const item = trigger ? itemForTrigger(trigger) : itemForPanel(event.target.closest && event.target.closest(".context-tooltip"));
      if (!item) return;
      window.setTimeout(() => {
        if (activeItem === item && !isFocused(item) && !item.hoveringTrigger && !item.hoveringPanel) close(item, false);
      }, 0);
    });
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest && event.target.closest("[data-context-tooltip-trigger]");
      const item = itemForTrigger(trigger);
      if (item) open(item);
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
    cupSelect.addEventListener("change", onCupSelectionChanged);
    cupSelect.addEventListener("change", rememberCupSelection);
    cupPrefixInput.addEventListener("input", updateCustomCupDraftPreview);
    [cupPrefixInput, extraFilterInput].forEach((input) => input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") event.preventDefault();
    }));
    customCupEditor.addEventListener("close", () => {
      if (customCupEditor.returnValue === "apply") return;
      restoreCupPrefixInput();
      additionalRules = customCupSettings.additionalRules.map((rule) => Object.assign({}, rule));
      extraFilterInput.value = customCupSettings.extraFilter;
      renderAdditionalRuleChips();
      updateCupFormatInfo();
    });
    customCupEditor.addEventListener("click", (event) => {
      if (event.target === customCupEditor) customCupEditor.close("cancel");
    });
    customCupApply.addEventListener("click", applyCustomCupEditor);
    customCupEditor.querySelector("form").addEventListener("submit", (event) => {
      if (event.submitter !== customCupEditorClose && event.submitter !== document.getElementById("custom-cup-cancel")) {
        event.preventDefault();
      }
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
      if (customCupEditor.open) {
        updateCustomCupDraftPreview();
        return;
      }
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
    window.addEventListener("resize", resizeSearchOutput);
    generate();
  }

  setup();
})();
