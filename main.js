// ---------------------------------------------------------------
// Sharn's Little World: main game file
//
// Controls
//   Arrow keys / WASD   walk (4 directions, no diagonals)
//   Q                   cycle the player's form (appearance only)
//
// Contents: sprite loading, Actor, input, transforming, wandering,
// maps, then start() and the game loop.
// Other files: data/ (characters, maps), meadow.js (grass, flowers),
// title.js (name in flowers).
// ---------------------------------------------------------------


// 16:10 SCREEN SIZE
const GAME_W = 960;
const GAME_H = 600;
const GRASS_COLOUR = "#5aa85a"; // Base grass (meadow.js paints over it)


// ANIMATION
const FOOT_PAD = 0.1; // Empty share of a sprite's height under the feet
const FRAME_TIME = 0.15; // Seconds per walk frame


// CHARACTERS
const WANDER_SPEED_FACTOR = 0.5; // Wanderers walk at this share of normal speed
const TRANSFORM_KEYS = ["q"]; // Keys that change the player's form
const PLAYER_FORMS = ["clair", "bulbasaur",  "cubone"]; // Forms the key cycles through (ids from data/)


// WALKING LIMITS (feet position, game pixels)
const WALL_X = 60; // Distance feet stay from a side edge...
const EXIT_EDGE = 20; // ...or from an edge with an exit
const MIN_Y = 120; // Highest the feet go (the trainer sprite has empty space above her head)
const MAX_Y = GAME_H - 20; // Lowest the feet go


// CHANGING MAP
const ARRIVE_INSET = 30; // How far in from the edge the player appears
const FADE_TIME = 0.35; // Seconds to fade out, and again to fade in


// All drawable characters by id (data/trainer.js and data/pokemon.js)
const CHARACTERS = { ...TRAINERS, ...POKEMON };

const canvas = document.getElementById("game");
// Draw at the internal size, then scale to fit the window
canvas.width = GAME_W;
canvas.height = GAME_H;
canvas.style.width = `min(100vw, calc(100vh * ${GAME_W} / ${GAME_H}))`;
canvas.style.aspectRatio = `${GAME_W} / ${GAME_H}`;
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // Keep pixel art crisp


// ---------- Sprite loading ----------
// Game direction -> file name word (e.g. "down" uses cubone-front-1.png)
const FILE_DIR = { down: "front", up: "back", left: "left", right: "right" };
const DIRS = Object.keys(FILE_DIR);

// Loads an image. Gives null if the file is missing, so one bad sprite doesn't stop the game.
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn("Missing sprite:", src);
      resolve(null);
    };
    img.src = src;
  });
}

// Loads one character's sprites: { idle: { dir: image }, walk: { dir: [images] } }
// Pokemon alternate two walk frames. The trainer also has standing poses:
// step, stand, step, stand.
async function loadSpriteSet(base, { hasStanding = false } = {}) {
  const set = { idle: {}, walk: {} };
  for (const dir of DIRS) {
    const f = FILE_DIR[dir];
    const step1 = await loadImage(`${base}-${f}-1.png`);
    const step2 = await loadImage(`${base}-${f}-2.png`);
    if (hasStanding) {
      // Use step1 if the standing pose is missing
      const stand = (await loadImage(`${base}-standing-${f}.png`)) || step1;
      set.idle[dir] = stand;
      set.walk[dir] = [step1, stand, step2, stand];
    } else {
      set.idle[dir] = step1;
      set.walk[dir] = [step1, step2];
    }
  }
  return set;
}

const spriteSets = {}; // By character id (filled in by start())


// ---------- Actor: anything that walks ----------
// The player and every wandering Pokemon.
class Actor {
  constructor(id, x, y, speedFactor = 1) {
    this.speedFactor = speedFactor; // 1 = normal speed
    this.x = x; // Position of the feet
    this.y = y;
    this.dir = "down"; // Facing: down, up, left or right
    this.moving = false; // Walking (walk frames) or idle
    this.animTime = 0; // Seconds spent walking
    this.setCharacter(id);
  }

  // Changes look and speed. Position and facing are kept.
  setCharacter(id) {
    const c = CHARACTERS[id];
    this.sprites = spriteSets[id];
    this.scale = c.render.scale;
    this.speed = c.movement.speed * this.speedFactor; // Pixels per second
    this.animTime = 0;
  }

  // Moves for one frame. dx, dy: direction (-1, 0 or 1); dt: seconds since last frame.
  step(dx, dy, dt) {
    this.moving = dx !== 0 || dy !== 0;
    if (!this.moving) {
      this.animTime = 0;
      return;
    }
    // Normalise so diagonals wouldn't be faster (unused: input is 4-directional)
    const len = Math.hypot(dx, dy);
    this.x += (dx / len) * this.speed * dt;
    this.y += (dy / len) * this.speed * dt;
    // Stay within the map's limits
    this.x = Math.min(Math.max(this.x, bounds.minX), bounds.maxX);
    this.y = Math.min(Math.max(this.y, bounds.minY), bounds.maxY);

    // Face the bigger movement
    if (Math.abs(dx) > Math.abs(dy)) this.dir = dx < 0 ? "left" : "right";
    else this.dir = dy < 0 ? "up" : "down";

    this.animTime += dt;
  }

  draw(ctx) {
    // Walk frame while moving, idle pose otherwise
    const frames = this.sprites.walk[this.dir];
    const img = this.moving
      ? frames[Math.floor(this.animTime / FRAME_TIME) % frames.length]
      : this.sprites.idle[this.dir];
    if (!img) return; // Sprite failed to load

    const w = img.width * this.scale;
    const h = img.height * this.scale;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, w * 0.32, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Anchor on the feet: bottom-centre, minus the empty padding
    const left = Math.round(this.x - w / 2);
    const top = Math.round(this.y - h * (1 - FOOT_PAD));
    ctx.drawImage(img, left, top, w, h);

    // Body box (middle 70% wide, 80% tall) so flowers in front know to fade.
    // Not the walking limits (`bounds` below).
    this.bounds = {
      left: left + w * 0.15,
      right: left + w * 0.85,
      top: top + h * 0.1,
      bottom: top + h * 0.9,
    };
  }
}

// ---------- Player input (4-directional) ----------
// Key -> direction [dx, dy]
const DIR_KEYS = {
  arrowleft: [-1, 0],
  a: [-1, 0],
  arrowright: [1, 0],
  d: [1, 0],
  arrowup: [0, -1],
  w: [0, -1],
  arrowdown: [0, 1],
  s: [0, 1],
};
const heldDirs = []; // Held direction keys, newest last

window.addEventListener("keydown", (e) => {
  if (e.key.startsWith("Arrow")) e.preventDefault(); // Don't scroll the page
  const key = e.key.toLowerCase();
  // Once per press, not while held
  if (TRANSFORM_KEYS.includes(key) && !e.repeat) transformPlayer();
  if (key in DIR_KEYS && !heldDirs.includes(key)) heldDirs.push(key);
});
window.addEventListener("keyup", (e) => {
  const i = heldDirs.indexOf(e.key.toLowerCase());
  if (i !== -1) heldDirs.splice(i, 1);
});
window.addEventListener("blur", () => {
  // keyup never fires if focus is lost, so clear held keys
  heldDirs.length = 0;
});

// This frame's direction as { dx, dy }. The newest held key wins.
function readInput() {
  const key = heldDirs[heldDirs.length - 1];
  if (!key) return { dx: 0, dy: 0 };
  const [dx, dy] = DIR_KEYS[key];
  return { dx, dy };
}

// ---------- Transformation ----------
let player = null; // The player's Actor (created in start())
let formIndex = 0; // Current entry in PLAYER_FORMS

// Next form, wrapping around. Changes the player only, not the wanderers.
function transformPlayer() {
  if (!player) return;
  formIndex = (formIndex + 1) % PLAYER_FORMS.length;
  player.setCharacter(PLAYER_FORMS[formIndex]);
}

// ---------- Wandering Pokemon ----------
// Each one alternates between walking in a random direction and resting.
const rand = (min, max) => min + Math.random() * (max - min);
const WANDER_DIRS = [
  [0, 1], // down
  [0, -1], // up
  [-1, 0], // left
  [1, 0], // right
];

// Wraps an Actor with wander state: walking or resting, time left, direction
function makeWanderer(actor) {
  return { actor, walking: false, timer: rand(0.5, 2), dx: 0, dy: 0 };
}

function updateWanderer(w, dt) {
  // Timer up: switch between walking and resting
  w.timer -= dt;
  if (w.timer <= 0) {
    w.walking = !w.walking;
    if (w.walking) {
      [w.dx, w.dy] =
        WANDER_DIRS[Math.floor(Math.random() * WANDER_DIRS.length)];
      w.timer = rand(0.8, 2.2);
    } else {
      w.dx = w.dy = 0;
      w.timer = rand(1, 3);
    }
  }
  const { x, y } = w.actor;
  w.actor.step(w.dx, w.dy, dt);
  // Didn't move, so it hit an edge: rest
  if (w.walking && w.actor.x === x && w.actor.y === y) w.timer = 0;
}

// ---------- Maps ----------
// The current map's walking limits (feet). Replaced on each map change.
let bounds = { minX: WALL_X, maxX: GAME_W - WALL_X, minY: MIN_Y, maxY: MAX_Y };

// Walking limits for a map. A side with an exit is open almost to the edge.
function boundsFor(def) {
  const exits = def.exits || {};
  return {
    minX: exits.left ? EXIT_EDGE : WALL_X,
    maxX: GAME_W - (exits.right ? EXIT_EDGE : WALL_X),
    minY: MIN_Y,
    maxY: MAX_Y,
  };
}

let titleImgs = []; // Title flower images (loaded in start())
let meadowImgs = []; // Scattered flower images (loaded in start())
const builtMaps = {}; // Built maps by id (built on first visit)
let currentMap = null; // { def, grassLayer, props }
let wanderers = []; // This map's wandering Pokemon
let actors = []; // Player + wanderers (for draw order and flower fading)

// Returns a map by id, building its grass and flowers on first use.
// def is its entry in data/maps.js.
function getMap(id) {
  if (!builtMaps[id]) {
    const def = MAPS[id];
    builtMaps[id] = {
      def,
      grassLayer: buildGrassLayer(def.grassSeed),
      // Title flowers (if the map has a title), then scattered flowers
      props: [
        ...(def.title ? makeTitleProps(titleImgs) : []),
        ...makeMeadowProps(meadowImgs, {
          seed: def.flowerSeed,
          avoidTitle: def.title,
        }),
      ],
    };
  }
  return builtMaps[id];
}

// Puts the player on a map and creates its wanderers.
// side: the edge just walked off ("left" or "right"); omit for the first map.
function enterMap(id, side) {
  currentMap = getMap(id);
  const def = currentMap.def;
  bounds = boundsFor(def);

  wanderers = (def.wanderers || []).map(([charId, x, y]) =>
    makeWanderer(new Actor(charId, x, y, WANDER_SPEED_FACTOR)),
  );
  actors = [player, ...wanderers.map((w) => w.actor)];

  // Appear on the opposite side from the edge just left
  if (side === "right") player.x = bounds.minX + ARRIVE_INSET; // Walked off the right, so appear on the left
  else if (side === "left") player.x = bounds.maxX - ARRIVE_INSET;
  else {
    // First map: use its start point
    player.x = def.start.x;
    player.y = def.start.y;
  }
  player.y = Math.min(Math.max(player.y, bounds.minY), bounds.maxY);
}

// ---------- Changing map ----------
let fade = 0; // Black overlay: 0 = clear, 1 = black
let pending = null; // { id, side } while fading out to the next map

// Starts a map change when walking into an open edge that has an exit.
// dx: walking direction (negative = left, positive = right)
function checkExit(dx) {
  const exits = currentMap.def.exits || {};
  if (dx > 0 && exits.right && player.x >= bounds.maxX)
    pending = { id: exits.right, side: "right" };
  else if (dx < 0 && exits.left && player.x <= bounds.minX)
    pending = { id: exits.left, side: "left" };
}

// ---------- Start ----------
async function start() {
  // Load sprites for every character
  await Promise.all(
    Object.entries(CHARACTERS).map(async ([id, c]) => {
      spriteSets[id] = await loadSpriteSet(c.sprites.normal.base, {
        hasStanding: c.sprites.normal.standing,
      });
    }),
  );

  // Load flower sprites once, shared by all maps. Missing ones are left out.
  // Title flowers keep their weight (how often each is used).
  titleImgs = (
    await Promise.all(
      TITLE_FLOWERS.map(async (f) => ({
        img: await loadImage(f.src),
        weight: f.weight,
      })),
    )
  ).filter((f) => f.img);
  meadowImgs = (await Promise.all(MEADOW_FLOWER_SRCS.map(loadImage))).filter(
    Boolean,
  );

  // Create the player (enterMap sets their position)
  player = new Actor(PLAYER_FORMS[formIndex], 0, 0);
  enterMap(START_MAP);

  // ---------- Game loop (once per screen frame) ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); // Seconds; capped so a background tab doesn't cause a jump
    last = now;

    // Player (can't walk while fading to the next map)
    const { dx, dy } = pending ? { dx: 0, dy: 0 } : readInput();
    player.step(dx, dy, dt);
    if (!pending) checkExit(dx);

    // Wanderers and flowers
    wanderers.forEach((w) => updateWanderer(w, dt));
    currentMap.props.forEach((p) => p.update(dt, actors));

    // Map change: fade out, swap the map at black, fade back in
    if (pending) {
      fade = Math.min(1, fade + dt / FADE_TIME);
      if (fade >= 1) {
        enterMap(pending.id, pending.side);
        pending = null;
      }
    } else if (fade > 0) {
      fade = Math.max(0, fade - dt / FADE_TIME);
    }

    // Draw: grass first
    ctx.drawImage(currentMap.grassLayer, 0, 0);

    // Then flowers and characters by height on screen (lower overlaps higher)
    [...currentMap.props, ...actors]
      .sort((a, b) => a.y - b.y)
      .forEach((o) => o.draw(ctx));

    // Fade overlay
    if (fade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start();