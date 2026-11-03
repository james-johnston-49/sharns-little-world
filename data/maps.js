// ---------------------------------------------------------------
// Maps: one entry per screen. To add one, add an entry here and
// point an exit from another map at it.
//
//   grassSeed    changes the grass pattern
//   flowerSeed   changes the flower scatter
//   title        true shows the name in flowers
//   start        player's first position (START_MAP only)
//   wanderers    roaming Pokemon, as [id, x, y]
//   exits        { left: "map-id", right: "map-id" } (only these two so far)
// ---------------------------------------------------------------

const START_MAP = "landing";

const MAPS = {
  // Landing page: Sharn spelled out in flowers
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

  // Placeholder for the first real map
  garden: {
    grassSeed: 8,
    flowerSeed: 23,
    title: false,
    wanderers: [["bulbasaur", 600, 380]],
    exits: { left: "landing" },
  },
};
