// ---------------------------------------------------------------
// Character data: one entry per trainer or Pokemon.
// To add a new one, drop its sprites in a folder using the same file
// naming (name-front-1.png, name-left-2.png, ...) and add a row here.
// ---------------------------------------------------------------
//
// base         path to the sprites, without the "-front-1.png" ending
// hasStanding  true if there are standing poses (clair-standing-front.png, ...)
// speed        walking speed in pixels per second
// scale        how large the sprite is drawn (1 = the file's own size)

const CHARACTERS = {
  clair: {
    name: "Clair",
    kind: "trainer",
    base: "assets/sprites/trainer/clair",
    hasStanding: true,
    speed: 200,
    scale: 0.5,
  },
  bulbasaur: {
    name: "Bulbasaur",
    kind: "pokemon",
    base: "assets/sprites/pokemon/bulbasaur/bulbasaur",
    hasStanding: false,
    speed: 140,
    scale: 0.5,
  },
  cubone: {
    name: "Cubone",
    kind: "pokemon",
    base: "assets/sprites/pokemon/cubone/cubone",
    hasStanding: false,
    speed: 160,
    scale: 0.5,
  },
};
