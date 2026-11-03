// ---------------------------------------------------------------
// Pokemon: one entry per Pokemon. To add one, put its sprites in
// assets/sprites/pokemon/<name>/ (same file naming as the others)
// and add an entry below.
//
// Used by the game:
//   sprites.normal.base      sprite path, without "-front-1.png"
//   sprites.normal.standing  true if it has standing poses
//   movement.speed           pixels per second
//   render.scale             sprite size (1 = file's own size)
//
// Stored for later: id, name, types, category, sprites.shiny, moves, evolution
//
// Keep id the same as the key (e.g. bulbasaur): the code looks Pokemon up by key.
// ---------------------------------------------------------------

const POKEMON = {
  bulbasaur: {
    id: "bulbasaur",
    name: "Bulbasaur",

    // Classification
    types: ["grass", "poison"],
    category: "james-favourites", // e.g. "starter", "james-favourites"

    // Sprites
    sprites: {
      normal: {
        base: "assets/sprites/pokemon/bulbasaur/bulbasaur",
        standing: false,
      },
      shiny: null, // None yet
    },

    // Movement
    movement: {
      speed: 140,
    },

    // Rendering
    render: {
      scale: 0.5,
    },

    // Gameplay (future)
    moves: [],
    evolution: null,
  },

  cubone: {
    id: "cubone",
    name: "Cubone",

    // Classification
    types: ["ground"],
    category: "starter",

    // Sprites
    sprites: {
      normal: {
        base: "assets/sprites/pokemon/cubone/cubone",
        standing: false,
      },
      shiny: null,
    },

    // Movement
    movement: {
      speed: 160,
    },

    // Rendering
    render: {
      scale: 0.5,
    },

    // Gameplay (future)
    moves: [],
    evolution: null,
  },
};
