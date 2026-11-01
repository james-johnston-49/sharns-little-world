// ---------------------------------------------------------------
// Trainer data: one entry per human character.
// Same shape as the Pokemon entries in pokemon.js, minus the Pokemon-only fields.
// ---------------------------------------------------------------

const TRAINERS = {
  clair: {
    id: "clair",
    name: "Clair",

    // Sprite assets
    sprites: {
      normal: {
        base: "assets/sprites/trainer/clair",
        standing: true, // has standing poses (clair-standing-front.png, ...)
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
