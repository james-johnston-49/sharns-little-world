// ---------------------------------------------------------------
// Trainer data: one entry per human character.
// ---------------------------------------------------------------
//
// base         path to the sprites, without the "-front-1.png" ending
// hasStanding  true if there are standing poses (clair-standing-front.png, ...)
// speed        walking speed in pixels per second
// scale        how large the sprite is drawn (1 = the file's own size)

const TRAINERS = {
  clair: {
    name: "Clair",
    base: "assets/sprites/trainer/clair",
    hasStanding: true,
    speed: 200,
    scale: 0.5,
  },
};
