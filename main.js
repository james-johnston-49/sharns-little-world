// ---------------------------------------------------------------
// Sharn's Little World: walking animation test
// Arrow keys / WASD move the trainer. Cubone and Bulbasaur wander.
// ---------------------------------------------------------------

const GAME_W = 960;
const GAME_H = 540;
const GRASS_COLOUR = "#5aa85a"; // placeholder for the open grass field

// Tuning knobs
const SPRITE_SCALE = 0.5; // sprite files are large, so they are drawn at half size
const FOOT_PAD = 0.1; // fraction of each image's height that is empty space under the feet
const FRAME_TIME = 0.15; // seconds each walk frame is shown
const BOUNDS = { minX: 60, maxX: GAME_W - 60, minY: 170, maxY: GAME_H - 20 }; // limits for the feet position

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

// ---------- Actor: anything that walks around ----------
class Actor {
  constructor(sprites, x, y, speed) {
    this.sprites = sprites;
    this.x = x; // x and y are the position of the feet
    this.y = y;
    this.speed = speed; // pixels per second
    this.dir = "down";
    this.moving = false;
    this.animTime = 0;
  }

  // dx, dy are the intended direction (-1, 0 or 1 on each axis)
  step(dx, dy, dt) {
    this.moving = dx !== 0 || dy !== 0;
    if (!this.moving) {
      this.animTime = 0;
      return;
    }
    const len = Math.hypot(dx, dy); // so diagonals aren't faster
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

    const w = img.width * SPRITE_SCALE;
    const h = img.height * SPRITE_SCALE;

    // simple shadow under the feet
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, w * 0.32, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // anchor on the feet: bottom-centre of the sprite, minus the empty padding
    ctx.drawImage(
      img,
      Math.round(this.x - w / 2),
      Math.round(this.y - h * (1 - FOOT_PAD)),
      w,
      h,
    );
  }
}

// ---------- Player input ----------
const keys = new Set();
window.addEventListener("keydown", (e) => {
  if (e.key.startsWith("Arrow")) e.preventDefault(); // stop the page scrolling
  keys.add(e.key.toLowerCase());
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());

function readInput() {
  const left = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");
  const up = keys.has("arrowup") || keys.has("w");
  const down = keys.has("arrowdown") || keys.has("s");
  return { dx: Number(right) - Number(left), dy: Number(down) - Number(up) };
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
  const [clair, cubone, bulbasaur] = await Promise.all([
    loadSpriteSet("assets/sprites/trainer/clair", { hasStanding: true }),
    loadSpriteSet("assets/sprites/pokemon/cubone/cubone"),
    loadSpriteSet("assets/sprites/pokemon/bulbasaur/bulbasaur"),
  ]);

  const player = new Actor(clair, GAME_W / 2, 400, 200);
  const wanderers = [
    makeWanderer(new Actor(cubone, 250, 300, 80)),
    makeWanderer(new Actor(bulbasaur, 720, 320, 70)),
  ];
  const actors = [player, ...wanderers.map((w) => w.actor)];

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); // cap so a background tab doesn't cause a huge jump
    last = now;

    const { dx, dy } = readInput();
    player.step(dx, dy, dt);
    wanderers.forEach((w) => updateWanderer(w, dt));

    ctx.fillStyle = GRASS_COLOUR;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // draw further-back actors first so closer ones overlap them
    [...actors].sort((a, b) => a.y - b.y).forEach((a) => a.draw(ctx));

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start();
