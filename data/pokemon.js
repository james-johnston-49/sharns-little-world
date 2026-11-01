// ---------------------------------------------------------------
// Pokemon data: one entry per Pokemon.
// To add a new one, drop its sprites in assets/sprites/pokemon/<name>/ using the
// same file naming (name-front-1.png, name-left-2.png, ...) and add an entry here.
// ---------------------------------------------------------------
//
// base         path to the sprites, without the "-front-1.png" ending
// hasStanding  true if there are standing poses (the Pokemon so far have none)
// speed        walking speed in pixels per second
// scale        how large the sprite is drawn (1 = the file's own size)

const POKEMON = {
  bulbasaur: {
    name: "Bulbasaur",
    base: "assets/sprites/pokemon/bulbasaur/bulbasaur",
    hasStanding: false,
    speed: 140,
    scale: 0.5,
  },
  cubone: {
    name: "Cubone",
    base: "assets/sprites/pokemon/cubone/cubone",
    hasStanding: false,
    speed: 160,
    scale: 0.5,
  },
};
