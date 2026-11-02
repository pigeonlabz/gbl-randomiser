(function (root) {
  const cups = [
    {
      id: "halloween",
      name: "Halloween Cup",
      official: true,
      officialLeague: "great",
      suggestedLeague: "great",
      search: "poison,bug,ghost,dark,fairy",
      lockTypes: true,
      lockMoves: false,
      edition: "Twilight Trails 2026",
      sourceUrl: "https://pokemongo.com/news/go-battle-league-twilight-trails"
    },
    {
      id: "mega-halloween",
      name: "Mega Halloween Cup",
      official: true,
      officialLeague: "great",
      suggestedLeague: "great",
      search: "poison,bug,ghost,dark,fairy",
      lockTypes: true,
      lockMoves: false,
      edition: "Twilight Trails 2026",
      notes: ["Mega-Evolved Pokémon are eligible in this edition."],
      sourceUrl: "https://pokemongo.com/news/go-battle-league-twilight-trails"
    },
    {
      id: "jungle",
      name: "Jungle Cup",
      official: true,
      officialLeague: "great",
      suggestedLeague: "great",
      search: "normal,grass,electric,poison,ground,flying,bug,dark",
      lockTypes: true,
      lockMoves: false,
      edition: "Memories in Motion 2026",
      sourceUrl: "https://pokemongo.com/news/go-battle-league-memories-in-motion"
    },
    {
      id: "fantasy",
      name: "Fantasy Cup",
      official: true,
      officialLeague: "great",
      suggestedLeague: "great",
      search: "dragon,steel,fairy",
      lockTypes: true,
      lockMoves: false,
      edition: "Twilight Trails 2026",
      sourceUrl: "https://pokemongo.com/news/go-battle-league-twilight-trails"
    },
    {
      id: "fantasy-ultra",
      name: "Fantasy Cup: Ultra League",
      official: true,
      officialLeague: "ultra",
      suggestedLeague: "ultra",
      search: "dragon,steel,fairy",
      lockTypes: true,
      lockMoves: false,
      edition: "Forever Forward 2026",
      sourceUrl: "https://pokemongo.com/news/go-battle-league-forever-forward"
    },
    {
      id: "retro",
      name: "Retro Cup",
      official: true,
      officialLeague: "great",
      suggestedLeague: "great",
      search: "!dark&!steel&!fairy",
      lockTypes: true,
      lockMoves: false,
      edition: "Twilight Trails 2026",
      sourceUrl: "https://pokemongo.com/news/go-battle-league-twilight-trails"
    },
    {
      id: "willpower",
      name: "Willpower Cup",
      official: true,
      officialLeague: "great",
      suggestedLeague: "great",
      search: "fighting,psychic,dark",
      speciesBans: [282, 570, 571],
      lockTypes: true,
      lockMoves: false,
      edition: "Twilight Trails 2026",
      sourceUrl: "https://pokemongo.com/news/go-battle-league-twilight-trails"
    },
    {
      id: "element",
      name: "Element Cup",
      official: true,
      officialLeague: "little",
      suggestedLeague: "little",
      search: "fire,water,grass",
      lockTypes: true,
      lockMoves: true,
      manualRules: ["Only Pokémon that can evolve and have never evolved are eligible."],
      edition: "Official Element Cup format",
      sourceUrl: "https://pokemongo.com/news/gobattleleague-season11"
    },
    {
      id: "fossil",
      name: "Fossil Cup",
      official: true,
      officialLeague: "great",
      suggestedLeague: "great",
      search: "rock,steel,water",
      lockTypes: true,
      lockMoves: false,
      edition: "Official Fossil Cup format",
      sourceUrl: "https://pokemongo.com/news/go-battle-league-delightful-days"
    },
    {
      id: "holiday",
      name: "Holiday Cup",
      official: true,
      officialLeague: "great",
      suggestedLeague: "great",
      search: "normal,grass,electric,ice,flying,ghost",
      lockTypes: true,
      lockMoves: false,
      edition: "Official Holiday Cup format",
      sourceUrl: "https://pokemongo.com/news/go-battle-league-precious-paths"
    },
    {
      id: "holiday-ultra",
      name: "Holiday Cup: Ultra League",
      official: true,
      officialLeague: "ultra",
      suggestedLeague: "ultra",
      search: "normal,grass,electric,ice,flying,ghost",
      lockTypes: true,
      lockMoves: false,
      edition: "Official Holiday Cup format",
      sourceUrl: "https://pokemongo.com/news/go-battle-league-precious-paths"
    },
    {
      id: "love",
      name: "Love Cup",
      official: true,
      officialLeague: "great",
      suggestedLeague: "great",
      search: "",
      lockTypes: true,
      lockMoves: false,
      manualRules: ["Only Pokémon shown as red or pink in the Pokédex are eligible."],
      edition: "Official Love Cup format",
      sourceUrl: "https://pokemongo.com/news/go-battle-league-precious-paths"
    },
    {
      id: "scroll",
      name: "Scroll Cup",
      official: true,
      officialLeague: "great",
      suggestedLeague: "great",
      search: "water,fighting,dark",
      speciesBans: [730],
      lockTypes: true,
      lockMoves: false,
      edition: "Official Scroll Cup format",
      sourceUrl: "https://pokemongo.com/news/go-battle-league-precious-paths"
    },
    {
      id: "rock-challenge",
      name: "Rock challenge (custom filter)",
      official: false,
      officialLeague: null,
      suggestedLeague: "master",
      search: "rock&!@rock",
      lockTypes: true,
      lockMoves: true,
      notes: ["Custom preset; it does not represent a verified official cup format."]
    }
  ];

  root.GBL_CUP_DATA = Object.freeze(cups.map((cup) => Object.freeze(cup)));
})(window);
