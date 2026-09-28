window.GBL_RULE_DATA = (() => {
  const TYPES = [
    "normal", "fire", "water", "grass", "electric", "ice",
    "fighting", "poison", "ground", "flying", "psychic",
    "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"
  ];

  const REGIONS = [
    "kanto", "johto", "hoenn", "sinnoh", "unova",
    "kalos", "alola", "galar", "hisui", "paldea"
  ];

  // Curated set of signature, exclusive, Community Day, and meta-defining moves.
  // Keep these as display names so Pokémon GO search syntax preserves spaces/apostrophes.
  const META_MOVES = [
    "Hydro Cannon",
    "Blast Burn",
    "Frenzy Plant",
    "Meteor Mash",
    "Smack Down",
    "Aqua Tail",
    "Volt Switch",
    "Icicle Spear",
    "Precipice Blades",
    "Sunsteel Strike",
    "Aeroblast",
    "Payback",
    "Psystrike",
    "Sacred Fire",
    "Ice Burn",
    "Origin Pulse",
    "Spacial Rend",
    "Roar of Time",
    "Moongeist Beam",
    "Dragon Ascent",
    "Glaciate",
    "Fusion Bolt",
    "Fusion Flare",
    "Nature's Madness",
    "Oblivion Wing",
    "Behemoth Blade",
    "Behemoth Bash",
    "Shadow Force",
    "Sacred Sword",
    "Double Iron Bash",
    "Geomancy",
    "Bleakwind Storm",
    "Sandsear Storm",
    "Wildbolt Storm",
    "Doom Desire",
    "Techno Blast",
    "Rock Wrecker",
    "V-create"
  ];

  // Calendar years are approximated with whole local calendar dates because
  // Pokémon GO's age search uses rolling day buckets, not calendar boundaries.
  const yearToAgeRange = (year, now = new Date()) => {
    const targetYear = Number(year);
    if (!Number.isInteger(targetYear)) throw new TypeError("year must be an integer");

    const dayNumber = (y, month, day) => {
      const date = new Date(0);
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCFullYear(y, month, day);
      return date.getTime() / 86400000;
    };
    const today = dayNumber(now.getFullYear(), now.getMonth(), now.getDate());
    const yearStart = dayNumber(targetYear, 0, 1);
    const nextYearStart = dayNumber(targetYear + 1, 0, 1);
    const yearEnd = nextYearStart - 1;
    const minAge = Math.max(0, today - yearEnd);
    const maxAge = Math.max(0, today - yearStart);
    return `age${Math.min(minAge, maxAge)}-${Math.max(minAge, maxAge)}`;
  };

  const title = (value) => value.charAt(0).toUpperCase() + value.slice(1);

  const rule = (id, label, search, pool, family, options = {}) => ({
    id,
    label,
    search,
    pool,
    family,
    width: options.width || "medium",
    scarcity: options.scarcity || 1,
    tags: options.tags || [],
    explain: options.explain || label,
    exclusiveGroup: options.exclusiveGroup || null,
    weightGroup: options.weightGroup || null,
    maxCp: options.maxCp || null,
    minCp: options.minCp || null,
    ...(options.meta ? { meta: options.meta } : {})
  });

  const rules = [
    ...TYPES.map((type) => rule(
      `type-${type}`,
      `${title(type)} type`,
      type,
      "core",
      "pokemon-type",
      { width: "broad", explain: `Pokemon with ${title(type)} typing.`, meta: { types: [type] } }
    )),

    ...REGIONS.map((region) => rule(
      `region-${region}`,
      `${title(region)} region`,
      region,
      "core",
      "region",
      { width: "broad", explain: `Pokemon from ${title(region)}.` }
    )),

    ...TYPES.map((type) => rule(
      `move-any-${type}`,
      `${title(type)} move`,
      `@${type}`,
      "core",
      "move-type",
      { width: "broad", explain: `Pokemon that know at least one ${title(type)}-type move.`, meta: { move_types: [type] } }
    )),

    ...TYPES.map((type) => rule(
      `move-fast-${type}`,
      `${title(type)} Fast Attack`,
      `@1${type}`,
      "spicy",
      "move-slot",
      { scarcity: 2, explain: `Pokemon whose Fast Attack is ${title(type)} type.`, meta: { move_types: [type] } }
    )),

    ...TYPES.map((type) => rule(
      `move-charge1-${type}`,
      `${title(type)} first Charged Attack`,
      `@2${type}`,
      "spicy",
      "move-slot",
      { scarcity: 2, explain: `Pokemon whose first Charged Attack is ${title(type)} type.`, meta: { move_types: [type] } }
    )),

    ...TYPES.map((type) => rule(
      `move-charge2-${type}`,
      `${title(type)} second Charged Attack`,
      `@3${type}`,
      "chaos",
      "move-slot",
      { scarcity: 3, explain: `Pokemon whose second Charged Attack is ${title(type)} type.`, meta: { move_types: [type] } }
    )),

    rule("age-0-30", "Caught in last 30 days", "age0-30", "core", "age", {
      width: "broad",
      explain: "Pokemon caught in the last 30 days."
    }),
    rule("age-today", "Caught in last 24 hours", "age0", "core", "age", {
      scarcity: 2,
      explain: "Pokemon caught within the last 24 hours."
    }),
    rule("hatched", "Hatched", "hatched", "core", "origin", {
      explain: "Pokemon hatched from Eggs."
    }),
    rule("traded", "Traded", "traded", "core", "origin", {
      explain: "Pokemon received through trades."
    }),
    rule("raid", "Raid caught", "raid", "core", "origin", {
      explain: "Pokemon obtained from raids."
    }),
    rule("research", "Research reward", "research", "core", "origin", {
      explain: "Pokemon obtained from research."
    }),
    rule("rocket", "Rocket encounter", "rocket", "core", "origin", {
      explain: "Pokemon obtained through Team GO Rocket."
    }),

    rule("size-xl-group", "XL or XXL size", "xl,xxl", "core", "size-xl", {
      exclusiveGroup: "pokemon-size",
      weightGroup: "size",
      explain: "Pokemon with XL or XXL size."
    }),
    rule("size-xs-group", "XS or XXS size", "xs,xxs", "core", "size-xs", {
      exclusiveGroup: "pokemon-size",
      weightGroup: "size",
      explain: "Pokemon with XS or XXS size."
    }),
    rule("size-xxl", "XXL size", "xxl", "core", "size-xl", {
      exclusiveGroup: "pokemon-size",
      weightGroup: "size",
      scarcity: 2,
      explain: "Pokemon with XXL size."
    }),
    rule("size-xxs", "XXS size", "xxs", "core", "size-xs", {
      exclusiveGroup: "pokemon-size",
      weightGroup: "size",
      scarcity: 2,
      explain: "Pokemon with XXS size."
    }),

    rule("shiny", "Shiny", "shiny", "core", "visual-status", {
      scarcity: 2,
      explain: "Shiny Pokemon only."
    }),
    rule("shadow", "Shadow", "shadow", "core", "rocket-status", {
      explain: "Shadow Pokemon only."
    }),
    rule("purified", "Purified", "purified", "core", "rocket-status", {
      explain: "Purified Pokemon only."
    }),
    rule("not-purified", "No Purified Pokemon", "!purified", "core", "rocket-status", {
      width: "broad",
      explain: "Exclude Purified Pokemon."
    }),
    rule("not-shadow", "No Shadow Pokemon", "!shadow", "core", "rocket-status", {
      width: "broad",
      tags: ["ban-shadow"],
      explain: "Exclude Shadow Pokemon."
    }),

    rule("appraisal-high", "3-star or 4-star appraisal", "3*,4*", "core", "appraisal", {
      width: "broad",
      explain: "Pokemon with 3-star or 4-star overall appraisal."
    }),
    rule("appraisal-low", "0-star or 1-star appraisal", "0*,1*", "core", "appraisal", {
      width: "broad",
      explain: "Pokemon with 0-star or 1-star overall appraisal."
    }),
    rule("appraisal-perfect", "Perfect appraisal", "4*", "spicy", "appraisal", {
      scarcity: 3,
      explain: "Pokemon with 4-star overall appraisal."
    }),

    rule("rare-any", "Legendary, Mythical, or Ultra Beast", "legendary,mythical,ultrabeast", "core", "rarity", {
      scarcity: 2,
      explain: "Legendary, Mythical, or Ultra Beast Pokemon. These are separate categories joined with OR."
    }),
    rule("legendary", "Legendary", "legendary", "core", "rarity", {
      scarcity: 2,
      explain: "Legendary Pokemon only."
    }),
    rule("mythical", "Mythical", "mythical", "spicy", "rarity", {
      scarcity: 3,
      explain: "Mythical Pokemon only."
    }),
    rule("ultrabeast", "Ultra Beast", "ultrabeast", "spicy", "rarity", {
      scarcity: 3,
      explain: "Ultra Beasts only."
    }),

    rule("type-weak-fire", "Weak to Fire", "<fire", "spicy", "type-effectiveness", {
      scarcity: 2,
      explain: "Pokemon whose typing takes super-effective damage from Fire."
    }),
    rule("type-coverage-water", "Coverage against Water", ">water", "spicy", "type-effectiveness", {
      scarcity: 2,
      explain: "Pokemon that know at least one move super-effective against Water-type targets."
    }),

    rule("meta-moves-banned", "No listed meta moves", META_MOVES.map((move) => `!@${move}`).join("&"), "chaos", "meta-moves", {
      scarcity: 4,
      explain: "Exclude the curated list of meta-defining, signature, and exclusive moves. The list may need updating over time."
    }),

    rule("weather-move", "Weather-boosted attack now", "@weather", "spicy", "move-weather", {
      scarcity: 2,
      explain: "Pokemon with one or more attacks boosted by the current weather."
    }),

    rule("lucky", "Lucky", "lucky", "spicy", "lucky", {
      scarcity: 2,
      explain: "Lucky Pokemon only."
    }),
    rule("costume", "Costume", "costume", "spicy", "costume", {
      scarcity: 2,
      explain: "Costumed event Pokemon."
    }),
    rule("candy-mid", "100-200 family Candy", "countcandy100-200", "spicy", "candy", {
      scarcity: 2,
      explain: "Pokemon whose evolution family has 100 to 200 Candy."
    }),
    rule("candy-high", "At least 100 family Candy", "countcandy100-", "spicy", "candy", {
      explain: "Pokemon whose evolution family has at least 100 Candy."
    }),
    rule("candy-low", "Up to 100 family Candy", "countcandy-100", "spicy", "candy", {
      explain: "Pokemon whose evolution family has up to 100 Candy."
    }),
    rule("candy-xl-high", "At least 50 family Candy XL", "countcandyxl50-", "spicy", "candy-xl", {
      scarcity: 3,
      explain: "Pokemon whose evolution family has at least 50 Candy XL."
    }),
    rule("powered-xl", "Powered beyond level 40", "candyxl", "spicy", "powered-xl", {
      scarcity: 3,
      explain: "Pokemon powered above level 40 using Candy XL."
    }),

    rule("buddy-good-plus", "Good Buddy or higher", "buddy2-5", "spicy", "buddy", {
      explain: "Pokemon with Good Buddy through Best Buddy history."
    }),
    rule("buddy-best", "Best Buddy", "buddy5", "spicy", "buddy", {
      scarcity: 3,
      explain: "Best Buddy Pokemon."
    }),
    rule("buddy-none", "No buddy history", "buddy0", "spicy", "buddy", {
      explain: "Pokemon with no buddy history."
    }),

    rule("year-current", "Caught this year", "", "spicy", "year", {
      meta: { calendarYear: "current" },
      explain: "Caught in the current calendar year."
    }),
    rule("year-previous", "Caught last year", "", "spicy", "year", {
      meta: { calendarYear: "previous" },
      explain: "Caught in the previous calendar year."
    }),

    rule("hp-150", "150 HP or less", "hp-150", "spicy", "hp", {
      explain: "Pokemon with HP up to 150."
    }),
    rule("hp-100-150", "100-150 HP", "hp100-150", "spicy", "hp", {
      explain: "Pokemon with HP from 100 through 150."
    }),
    rule("cp-500", "500 CP or less", "cp-500", "spicy", "cp", {
      maxCp: 500,
      explain: "Pokemon with CP up to 500."
    }),
    rule("cp-100-500", "100-500 CP", "cp100-500", "spicy", "cp", {
      minCp: 100,
      maxCp: 500,
      explain: "Pokemon with CP from 100 through 500."
    }),
    rule("cp-1000-1500", "1000-1500 CP", "cp1000-1500", "spicy", "cp", {
      minCp: 1000,
      maxCp: 1500,
      explain: "Pokemon with CP from 1000 through 1500."
    }),
    rule("cp-1500-plus", "1500 CP or higher", "cp1500-", "chaos", "cp", {
      minCp: 1500,
      scarcity: 3,
      explain: "Pokemon with CP 1500 or higher."
    }),

    rule("iv-zero-attack", "0 Attack IV band", "0attack", "spicy", "iv-attack", {
      scarcity: 2,
      explain: "Pokemon with exactly 0 Attack IV."
    }),
    rule("iv-max-defense", "15 Defense IV", "4defense", "spicy", "iv-defense", {
      scarcity: 2,
      explain: "Pokemon with exactly 15 Defense IV."
    }),
    rule("iv-max-hp", "15 HP IV", "4hp", "spicy", "iv-hp", {
      scarcity: 2,
      explain: "Pokemon with exactly 15 HP IV."
    }),
    rule("iv-pvpish", "0/15/15 IV bands", "0attack&4defense&4hp", "chaos", "iv-combo", {
      scarcity: 4,
      explain: "Exact 0 Attack, exact 15 Defense, and exact 15 HP."
    }),
    rule("iv-high-bulk-bands", "Low Attack, high bulk bands", "0attack&3defense&3hp", "spicy", "iv-combo", {
      scarcity: 3,
      explain: "Exact 0 Attack with Defense and HP in the 11-14 IV bands."
    }),

    rule("remote-raid", "Remote Raid origin", "remoteraid", "spicy", "origin", {
      scarcity: 2,
      explain: "Pokemon obtained from a Remote Raid."
    }),
    rule("mega-raid", "Mega Raid origin", "megaraid", "spicy", "origin", {
      scarcity: 2,
      explain: "Pokemon obtained from a Mega Raid."
    }),
    rule("gbl-origin", "GBL encounter", "gbl", "spicy", "origin", {
      scarcity: 2,
      explain: "Pokemon obtained from GO Battle League."
    }),

    rule("mega-capable", "Mega-capable species", "mega", "spicy", "mega", {
      scarcity: 2,
      explain: "Mega or Primal-capable species regardless of current energy."
    }),
    rule("mega-eligible", "Eligible to Mega Evolve", "megaevolve", "spicy", "mega", {
      scarcity: 3,
      explain: "Pokemon currently eligible to Mega Evolve or Primal Revert."
    }),
    rule("mega-level-base", "Base Mega Level", "mega1", "spicy", "mega-level", {
      scarcity: 2,
      explain: "Pokemon at Base Mega Level."
    }),
    rule("mega-level-high", "High or Max Mega Level", "mega2,mega3", "spicy", "mega-level", {
      scarcity: 3,
      explain: "Pokemon at High or Max Mega Level."
    }),
    rule("mega-level-supermax", "Super Max Mega Level", "mega4", "chaos", "mega-level", {
      scarcity: 4,
      explain: "Pokemon at Super Max Mega Level where supported by the current client."
    }),

    rule("dynamax", "Dynamax", "dynamax", "spicy", "max", {
      scarcity: 2,
      explain: "Dynamax Pokemon."
    }),
    rule("gigantamax", "Gigantamax", "gigantamax", "spicy", "max", {
      scarcity: 3,
      explain: "Gigantamax Pokemon."
    }),
    rule("dynamax-unlocked", "Dynamax with unlocked Max moves", "dynamax1-", "spicy", "max-count", {
      scarcity: 3,
      explain: "Dynamax Pokemon with at least one unlocked Max move."
    }),
    rule("maxmove-leveled", "Max Move level 1-3", "maxmove1-3", "spicy", "max-move", {
      scarcity: 3,
      explain: "Pokemon matching the Max Move level range 1-3."
    }),
    rule("maxguard-leveled", "Max Guard level 1-3", "maxguard1-3", "spicy", "max-move", {
      scarcity: 3,
      explain: "Pokemon matching the Max Guard level range 1-3."
    }),
    rule("maxspirit-leveled", "Max Spirit level 1-3", "maxspirit1-3", "spicy", "max-move", {
      scarcity: 3,
      explain: "Pokemon matching the Max Spirit level range 1-3."
    }),

    rule("egg-exclusive", "Egg-exclusive species", "eggsonly", "chaos", "origin-special", {
      scarcity: 4,
      explain: "Species categorized as Egg-exclusive."
    }),
    rule("exraid", "EX Raid origin", "exraid", "chaos", "origin-special", {
      scarcity: 4,
      explain: "Pokemon obtained from an EX Raid."
    }),
    rule("primalraid", "Primal Raid origin", "primalraid", "chaos", "origin-special", {
      scarcity: 4,
      explain: "Pokemon obtained from a Primal Raid."
    }),
    rule("snapshot", "Snapshot encounter", "snapshot", "chaos", "origin-special", {
      scarcity: 4,
      explain: "Pokemon obtained from a snapshot encounter."
    }),
    rule("party", "Party Play reward", "party", "chaos", "origin-special", {
      scarcity: 4,
      explain: "Pokemon obtained via Party Play encounter or reward semantics."
    }),

    rule("background-any", "Rare background", "background", "chaos", "background", {
      scarcity: 4,
      explain: "Pokemon with a rare background."
    }),
    rule("location-background", "Location background", "locationbackground", "chaos", "background", {
      scarcity: 4,
      explain: "Pokemon with a location catch background."
    }),
    rule("special-background", "Special Background", "specialbackground", "chaos", "background", {
      scarcity: 4,
      explain: "Pokemon with a Special Background."
    }),
    rule("adventure-effect", "Adventure Effect", "adventureeffect", "chaos", "special-status", {
      scarcity: 4,
      explain: "Pokemon with Adventure Effect-capable move/status under current client semantics."
    }),
    rule("fusion", "Fusion", "fusion", "chaos", "special-status", {
      scarcity: 4,
      explain: "Pokemon able to be fused or already fused under documented client semantics."
    }),
    rule("hypertraining", "Hyper Training", "hypertraining", "chaos", "special-status", {
      scarcity: 4,
      explain: "Pokemon currently undergoing Hyper Training."
    }),
    rule("distance-far", "Caught at least 1000 km away", "distance1000-", "chaos", "distance", {
      scarcity: 4,
      explain: "Pokemon caught at least about 1000 km away, based on the game's distance semantics."
    }),
    rule("distance-range", "Caught 100-1000 km away", "distance100-1000", "chaos", "distance", {
      scarcity: 4,
      explain: "Pokemon in the 100 to 1000 km catch-distance range."
    }),
    rule("candy-xl-window", "50-100 family Candy XL", "countcandyxl50-100", "chaos", "candy-xl", {
      scarcity: 4,
      explain: "Pokemon whose evolution family has 50 to 100 Candy XL."
    }),
    rule("copy-count", "At least two of the species", "count2-", "chaos", "copy-count", {
      scarcity: 3,
      explain: "Pokemon whose Pokedex species count is at least two."
    }),
    rule("buddy-candy-distance", "Buddy Candy walking distance", "candykm...", "reference", "buddy-candy", {
      scarcity: 3,
      explain: "Buddy Candy walking-distance searches are recognized, but exact values should be supplied deliberately."
    })
  ];

  const leagues = {
    little: { label: "Little Cup", description: "Little Cup: maximum 500 CP.", search: "cp0-500", maxCp: 500 },
    great: { label: "Great League", description: "Great League: maximum 1500 CP.", search: "cp0-1500", maxCp: 1500 },
    ultra: { label: "Ultra League", description: "Ultra League: maximum 2500 CP.", search: "cp0-2500", maxCp: 2500 },
    master: { label: "Master League", description: "Master League: no CP limit.", search: "", maxCp: null }
  };

  return { leagues, rules, types: TYPES, regions: REGIONS, yearToAgeRange };
})();
