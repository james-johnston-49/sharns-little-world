// ---------------------------------------------------------------
// Maps: one entry per screen the player can walk around.
// To add a new one, add a row here and point an exit at it.
// ---------------------------------------------------------------
//
// grassSeed    change for a different (but fixed) grass pattern
// flowerSeed   change for a different (but fixed) flower scatter
// title        true puts the name in flowers on this map
// start        where the player first appears (only used for START_MAP)
// wanderers    Pokemon that roam on their own: [id, x, y]
// exits        walking off an edge leads to another map: { right: "map-id", left: "map-id" }

const START_MAP = "landing";

const MAPS = {
  landing: {
    grassSeed: 3,
    flowerSeed: 11,
    title: true,
    start: { x: 480, y: 480 },
    wanderers: [
      ["cubone", 250, 330],
      ["bulbasaur", 720, 355],
    ],
    exits: { right: "garden" },
  },

  // placeholder for the first real map
  garden: {
    grassSeed: 8,
    flowerSeed: 23,
    title: false,
    wanderers: [["bulbasaur", 600, 380]],
    exits: { left: "landing" },
  },
};