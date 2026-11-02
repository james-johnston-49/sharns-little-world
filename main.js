// ---------------------------------------------------------------
// Sharn's Little World: walking animation test
// Arrow keys / WASD move the player in four directions (no diagonals).
// Q or Shift switches the player between Clair and Bulbasaur (appearance only).
// Cubone and Bulbasaur wander on their own. Character details live in the data folder.
// ---------------------------------------------------------------

const GAME_W = 960;
const GAME_H = 600; // 16:10, wide but not as thin as 16:9, so dark bars stay small in most windows
const GRASS_COLOUR = "#5aa85a"; // placeholder for the open grass field

// Tuning knobs
const FOOT_PAD = 0.1; // fraction of each image's height that is empty space under the feet
const FRAME_TIME = 0.15; // seconds each walk frame is shown
const WANDER_SPEED_FACTOR = 0.5; // wandering Pokemon walk at this fraction of their normal speed
const TRANSFORM_KEYS = ["q"]; // either key switches the player's form
const PLAYER_FORMS = ["clair", "bulbasaur"]; // what the key cycles through (ids from the data folder)
const WALL_X = 60; // feet stop this far from a side edge...
const EXIT_EDGE = 20; // ...unless that side has an exit, then they can walk this close to it
const MIN_Y = 100; // highest the feet can go (the trainer's sprite has empty space above her head, so her head reaches the top edge)
const MAX_Y = GAME_H - 20; // lowest the feet can go
const ARRIVE_INSET = 30; // how far in from the edge you appear after changing map
const FADE_TIME = 0.35; // seconds to fade out (and again to fade in) when changing map

// Everything that can be drawn as a character, from data/trainer.js and data/pokemon.js
const CHARACTERS = { ...TRAINERS, ...POKEMON };

const canvas = document.getElementById("game");
// the game's size is set here (GAME_W / GAME_H), then CSS-scaled to fit the window
canvas.width = GAME_W;
canvas.height = GAME_H;
canvas.style.width = `min(100vw, calc(100vh * ${GAME_W} / ${GAME_H}))`;
canvas.style.aspectRatio = `${GAME_W} / ${GAME_H}`;
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // keep pixel art crisp

// ---------- Sprite loading ----------
// Game direction -> the word used in the file names
const FILE_DIR = { down: "front", up: "back", left: "left", right: "right" };
const DIRS = Object.keys(FILE_DIR);

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

// Builds { idle: {dir: image}, walk: {dir: [images]} } for one character.
// Pokemon have two walk frames per direction, so they alternate 1, 2.
// The trainer also has standing poses, so her cycle is step, stand, step, stand.
async function loadSpriteSet(base, { hasStanding = false } = {}) {
  const set = { idle: {}, walk: {} };
  for (const dir of DIRS) {
    const f = FILE_DIR[dir];
    const step1 = await loadImage(`${base}-${f}-1.png`);
    const step2 = await loadImage(`${base}-${f}-2.png`);
    if (hasStanding) {
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

const spriteSets = {}; // loaded sprites, by character id (filled in by start)

// ---------- Actor: anything that walks around ----------
class Actor {
  constructor(id, x, y, speedFactor = 1) {
    this.speedFactor = speedFactor;
    this.x = x; // x and y are the position of the feet
    this.y = y;
    this.dir = "down";
    this.moving = false;
    this.animTime = 0;
    this.setCharacter(id);
  }

  // Changes what this actor looks like and how fast it walks. Position and facing are kept.
  setCharacter(id) {
    const c = CHARACTERS[id];
    this.sprites = spriteSets[id];
    this.scale = c.render.scale;
    this.speed = c.movement.speed * this.speedFactor; // pixels per second
    this.animTime = 0;
  }

  // dx, dy are the intended direction (-1, 0 or 1 on each axis)
  step(dx, dy, dt) {
    this.moving = dx !== 0 || dy !== 0;
    if (!this.moving) {
      this.animTime = 0;
      return;
    }
    const len = Math.hypot(dx, dy);
    this.x += (dx / len) * this.speed * dt;
    this.y += (dy / len) * this.speed * dt;
    this.x = Math.min(Math.max(this.x, bounds.minX), bounds.maxX);
    this.y = Math.min(Math.max(this.y, bounds.minY), bounds.maxY);

    if (Math.abs(dx) > Math.abs(dy)) this.dir = dx < 0 ? "left" : "right";
    else this.dir = dy < 0 ? "up" : "down";

    this.animTime += dt;
  }

  draw(ctx) {
    const frames = this.sprites.walk[this.dir];
    const img = this.moving
      ? frames[Math.floor(this.animTime / FRAME_TIME) % frames.length]
      : this.sprites.idle[this.dir];
    if (!img) return;

    const w = img.width * this.scale;
    const h = img.height * this.scale;

    // simple shadow under the feet
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, w * 0.32, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // anchor on the feet: bottom-centre of the sprite, minus the empty padding
    const left = Math.round(this.x - w / 2);
    const top = Math.round(this.y - h * (1 - FOOT_PAD));
    ctx.drawImage(img, left, top, w, h);

    // remember roughly where the body is, so flowers in front of it know to fade
    this.bounds = {
      left: left + w * 0.15,
      right: left + w * 0.85,
      top: top + h * 0.1,
      bottom: top + h * 0.9,
    };
  }
}

// ---------- Player input (4-directional) ----------
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
const heldDirs = []; // held direction keys, most recently pressed last

window.addEventListener("keydown", (e) => {
  if (e.key.startsWith("Arrow")) e.preventDefault(); // stop the page scrolling
  const key = e.key.toLowerCase();
  if (TRANSFORM_KEYS.includes(key) && !e.repeat) transformPlayer();
  if (key in DIR_KEYS && !heldDirs.includes(key)) heldDirs.push(key);
});
window.addEventListener("keyup", (e) => {
  const i = heldDirs.indexOf(e.key.toLowerCase());
  if (i !== -1) heldDirs.splice(i, 1);
});
window.addEventListener("blur", () => {
  heldDirs.length = 0;
});

// The newest held key wins, so tapping a new direction while holding another switches to it
function readInput() {
  const key = heldDirs[heldDirs.length - 1];
  if (!key) return { dx: 0, dy: 0 };
  const [dx, dy] = DIR_KEYS[key];
  return { dx, dy };
}

// ---------- Transformation ----------
let player = null;
let formIndex = 0;

// Only the player's appearance and speed change. The wandering Pokemon are not affected.
function transformPlayer() {
  if (!player) return;
  formIndex = (formIndex + 1) % PLAYER_FORMS.length;
  player.setCharacter(PLAYER_FORMS[formIndex]);
}

// ---------- Wandering Pokemon ----------
const rand = (min, max) => min + Math.random() * (max - min);
const WANDER_DIRS = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 0],
];

function makeWanderer(actor) {
  return { actor, walking: false, timer: rand(0.5, 2), dx: 0, dy: 0 };
}

function updateWanderer(w, dt) {
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
  // walked into the edge of the field: stop and rest
  if (w.walking && w.actor.x === x && w.actor.y === y) w.timer = 0;
}

// ---------- Maps ----------
// The current map's walking limits (feet position). Changes with each map, see boundsFor.
let bounds = { minX: WALL_X, maxX: GAME_W - WALL_X, minY: MIN_Y, maxY: MAX_Y };

// A side with an exit is open almost to the screen edge, so you can walk off it
function boundsFor(def) {
  const exits = def.exits || {};
  return {
    minX: exits.left ? EXIT_EDGE : WALL_X,
    maxX: GAME_W - (exits.right ? EXIT_EDGE : WALL_X),
    minY: MIN_Y,
    maxY: MAX_Y,
  };
}

let titleImgs = []; // loaded once in start
let meadowImgs = [];
const builtMaps = {}; // grass and flowers per map id, built the first time you visit
let currentMap = null; // { def, grassLayer, props }
let wanderers = [];
let actors = [];

function getMap(id) {
  if (!builtMaps[id]) {
    const def = MAPS[id];
    builtMaps[id] = {
      def,
      grassLayer: buildGrassLayer(def.grassSeed),
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

// side: the edge the player just walked off ("left" or "right"); leave it out for the very first map
function enterMap(id, side) {
  currentMap = getMap(id);
  const def = currentMap.def;
  bounds = boundsFor(def);

  wanderers = (def.wanderers || []).map(([charId, x, y]) =>
    makeWanderer(new Actor(charId, x, y, WANDER_SPEED_FACTOR)),
  );
  actors = [player, ...wanderers.map((w) => w.actor)];

  if (side === "right") player.x = bounds.minX + ARRIVE_INSET; // walked off the right, so appear on the left
  else if (side === "left") player.x = bounds.maxX - ARRIVE_INSET;
  else {
    player.x = def.start.x;
    player.y = def.start.y;
  }
  player.y = Math.min(Math.max(player.y, bounds.minY), bounds.maxY);
}

// ---------- Changing map ----------
let fade = 0; // 0 = clear, 1 = fully black
let pending = null; // { id, side } while fading out to the next map

// Walking into an open edge that has an exit starts the change
function checkExit(dx) {
  const exits = currentMap.def.exits || {};
  if (dx > 0 && exits.right && player.x >= bounds.maxX)
    pending = { id: exits.right, side: "right" };
  else if (dx < 0 && exits.left && player.x <= bounds.minX)
    pending = { id: exits.left, side: "left" };
}

// ---------- Start ----------
async function start() {
  // load every character listed in the data folder
  await Promise.all(
    Object.entries(CHARACTERS).map(async ([id, c]) => {
      spriteSets[id] = await loadSpriteSet(c.sprites.normal.base, {
        hasStanding: c.sprites.normal.standing,
      });
    }),
  );

  // flower sprites, loaded once and shared by every map
  // (anything whose sprite is missing is just left out)
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

  player = new Actor(PLAYER_FORMS[formIndex], 0, 0);
  enterMap(START_MAP);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); // cap so a background tab doesn't cause a huge jump
    last = now;

    // no walking while the screen is fading to the next map
    const { dx, dy } = pending ? { dx: 0, dy: 0 } : readInput();
    player.step(dx, dy, dt);
    if (!pending) checkExit(dx);

    wanderers.forEach((w) => updateWanderer(w, dt));
    currentMap.props.forEach((p) => p.update(dt, actors));

    // fade out, swap the map while the screen is black, then fade back in
    if (pending) {
      fade = Math.min(1, fade + dt / FADE_TIME);
      if (fade >= 1) {
        enterMap(pending.id, pending.side);
        pending = null;
      }
    } else if (fade > 0) {
      fade = Math.max(0, fade - dt / FADE_TIME);
    }

    ctx.drawImage(currentMap.grassLayer, 0, 0);

    // draw whatever is further up the screen first, so things lower down overlap it
    [...currentMap.props, ...actors]
      .sort((a, b) => a.y - b.y)
      .forEach((o) => o.draw(ctx));

    if (fade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
      ctx.fillRect(0, 0, GAME_W, GAME_H);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start();