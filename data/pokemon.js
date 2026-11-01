// ---------------------------------------------------------------
// Pokemon data: one entry per Pokemon.
// To add a new one, drop its sprites in assets/sprites/pokemon/<name>/ using the
// same file naming (name-front-1.png, name-left-2.png, ...) and add an entry here.
// ---------------------------------------------------------------
//
// The game reads these today:
//   sprites.normal.base      path to the sprites, without the "-front-1.png" ending
//   sprites.normal.standing  true if there are standing poses (the Pokemon so far have none)
//   movement.speed           walking speed in pixels per second
//   render.scale             how large the sprite is drawn (1 = the file's own size)
//   name                     display name
// Everything else is stored for later and not used yet.
// The key (bulbasaur) is what the code uses to find a Pokemon, so keep id the same as it.

const POKEMON = {
  bulbasaur: {
    id: "bulbasaur",
    name: "Bulbasaur",

    // Classification
    types: ["grass", "poison"],
    category: "james-favourites",

    // Sprite assets
    sprites: {
      normal: {
        base: "assets/sprites/pokemon/bulbasaur/bulbasaur",
        standing: false,
      },
      shiny: null,
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

    types: ["ground"],
    category: "starter",

    sprites: {
      normal: {
        base: "assets/sprites/pokemon/cubone/cubone",
        standing: false,
      },
      shiny: null,
    },

    movement: {
      speed: 160,
    },

    render: {
      scale: 0.5,
    },

    moves: [],
    evolution: null,
  },
};
