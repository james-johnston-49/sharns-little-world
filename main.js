// ---------------------------------------------------------------
// Sharn's Little World: walking animation test
// Arrow keys / WASD move the player in four directions (no diagonals).
// Q or Shift switches the player between Clair and Bulbasaur (appearance only).
// Cubone and Bulbasaur wander on their own. Character details live in the data folder.
// ---------------------------------------------------------------

const GAME_W = 960;
const GAME_H = 540;
const GRASS_COLOUR = "#5aa85a"; // placeholder for the open grass field

// Tuning knobs
const FOOT_PAD = 0.1; // fraction of each image's height that is empty space under the feet
const FRAME_TIME = 0.15; // seconds each walk frame is shown
const WANDER_SPEED_FACTOR = 0.5; // wandering Pokemon walk at this fraction of their normal speed
const TRANSFORM_KEYS = ["q"]; // either key switches the player's form
const PLAYER_FORMS = ["clair", "bulbasaur"]; // what the key cycles through (ids from the data folder)
const BOUNDS = { minX: 60, maxX: GAME_W - 60, minY: 170, maxY: GAME_H - 20 }; // limits for the feet position

// Everything that can be drawn as a character, from data/trainer.js and data/pokemon.js
const CHARACTERS = { ...TRAINERS, ...POKEMON };

const canvas = document.getElementById("game");
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
    this.x = Math.min(Math.max(this.x, BOUNDS.minX), BOUNDS.maxX);
    this.y = Math.min(Math.max(this.y, BOUNDS.minY), BOUNDS.maxY);

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

  // the field: textured grass, the name in flowers, and flowers scattered around it
  // (anything whose sprite is missing is just left out)
  const titleImgs = (
    await Promise.all(
      TITLE_FLOWERS.map(async (f) => ({
        img: await loadImage(f.src),
        weight: f.weight,
      })),
    )
  ).filter((f) => f.img);
  const meadowImgs = (
    await Promise.all(MEADOW_FLOWER_SRCS.map(loadImage))
  ).filter(Boolean);
  const grassLayer = buildGrassLayer();
  const props = [...makeTitleProps(titleImgs), ...makeMeadowProps(meadowImgs)];

  player = new Actor(PLAYER_FORMS[formIndex], GAME_W / 2, 400);
  const wanderers = [
    makeWanderer(new Actor("cubone", 250, 300, WANDER_SPEED_FACTOR)),
    makeWanderer(new Actor("bulbasaur", 720, 320, WANDER_SPEED_FACTOR)),
  ];
  const actors = [player, ...wanderers.map((w) => w.actor)];

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); // cap so a background tab doesn't cause a huge jump
    last = now;

    const { dx, dy } = readInput();
    player.step(dx, dy, dt);
    wanderers.forEach((w) => updateWanderer(w, dt));
    props.forEach((p) => p.update(dt, actors));

    ctx.drawImage(grassLayer, 0, 0);

    // draw whatever is further up the screen first, so things lower down overlap it
    [...props, ...actors].sort((a, b) => a.y - b.y).forEach((o) => o.draw(ctx));

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start();
