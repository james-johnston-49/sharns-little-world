// ---------------------------------------------------------------
// Trainers: one entry per human character.
// Same shape as pokemon.js, minus the Pokemon-only fields.
// ---------------------------------------------------------------

const TRAINERS = {
  clair: {
    id: "clair",
    name: "Clair",

    // Sprites
    sprites: {
      normal: {
        base: "assets/sprites/trainer/clair",
        standing: true, // Has clair-standing-front.png, etc.
      },
    },

    // Movement
    movement: {
      speed: 200,
    },

    // Rendering
    render: {
      scale: 0.5,
    },
  },
};
