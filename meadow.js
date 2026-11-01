// ---------------------------------------------------------------
// The grass field and the flowers scattered over it.
//  - buildGrassLayer(): paints a textured grass background once
//  - Prop: anything that stands on the ground (a flower), drawn in depth order with the characters
//  - makeMeadowProps(): scatters flowers over the field, keeping clear of the title
// ---------------------------------------------------------------

// Flowers scattered over the field (files in assets/sprites/flowers/)
const MEADOW_FLOWER_SRCS = [
  "assets/sprites/flowers/flower1(yellow-cluster).png",
  "assets/sprites/flowers/flower3(perriwinkle).png",
  "assets/sprites/flowers/flowers12(pink-rose).png",
  "assets/sprites/flowers/flowers37(rapunzel).png",
  "assets/sprites/flowers/flowers41(daisy).png",
];

// Tuning knobs
const MEADOW_COUNT = 60; // how many flowers to scatter
const MEADOW_FLOWER_SIZE = 32; // drawn width of a scattered flower (the files are 32 wide, so 32 keeps pixels even)
const MEADOW_MIN_GAP = 46; // closest two scattered flowers may be
const MEADOW_TITLE_MARGIN = 26; // clear space kept around the title
const MEADOW_SEED = 11; // change for a different (but still fixed) scatter
const GRASS_TUFT_COUNT = 520; // how many little grass tufts are painted
const PROP_FOOT_PAD = 0.06; // fraction of a flower sprite's height that is empty space under its base
const PROP_FADE_ALPHA = 0.7; // how see-through a flower becomes while it covers a character (1 = never fades)
const PROP_FADE_SPEED = 10; // how quickly flowers fade in and out

// Grass colours
const GRASS_LIGHT = "#66b463";
const GRASS_DARK = "#4b9a4c";
const GRASS_TUFT = "#3d8744";
const GRASS_TUFT_HIGHLIGHT = "#82c97a";

// Small seeded random generator, so the scatter is identical every time the page loads
function seededRandom(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Prop: a flower (or anything) standing on the ground ----------
// y is the position of its base, so props sort with the characters by how far down the screen they stand.
class Prop {
  constructor(img, x, baseY, width) {
    this.img = img;
    this.x = x;
    this.y = baseY;
    this.w = width;
    this.h = img.naturalHeight * (width / img.naturalWidth);
    this.alpha = 1;
  }

  // Fades the flower while it is in front of a character and covering them, so nobody gets lost behind the flowers
  update(dt, actors) {
    const left = this.x - this.w / 2;
    const right = this.x + this.w / 2;
    const top = this.y - this.h * (1 - PROP_FOOT_PAD);
    const bottom = this.y;
    let covering = false;
    for (const a of actors) {
      const b = a.bounds; // where the character was last drawn
      if (!b || a.y >= this.y) continue; // only characters standing behind this flower
      if (
        b.right > left &&
        b.left < right &&
        b.bottom > top &&
        b.top < bottom
      ) {
        covering = true;
        break;
      }
    }
    const target = covering ? PROP_FADE_ALPHA : 1;
    this.alpha += (target - this.alpha) * Math.min(1, dt * PROP_FADE_SPEED);
  }

  draw(ctx) {
    const faded = this.alpha < 0.999;
    if (faded) ctx.globalAlpha = this.alpha;
    ctx.drawImage(
      this.img,
      Math.round(this.x - this.w / 2),
      Math.round(this.y - this.h * (1 - PROP_FOOT_PAD)),
      this.w,
      this.h,
    );
    if (faded) ctx.globalAlpha = 1;
  }
}

// ---------- Grass ----------
// A canvas the size of the game with soft light and dark patches and lots of small tufts
function buildGrassLayer() {
  const layer = document.createElement("canvas");
  layer.width = GAME_W;
  layer.height = GAME_H;
  const g = layer.getContext("2d");
  g.imageSmoothingEnabled = false;
  const rand = seededRandom(3);

  g.fillStyle = GRASS_COLOUR;
  g.fillRect(0, 0, GAME_W, GAME_H);

  // soft patches: coarse random noise, smoothed, drawn as light or dark blocks
  const CELL = 24;
  const cols = Math.ceil(GAME_W / CELL) + 2;
  const rows = Math.ceil(GAME_H / CELL) + 2;
  let noise = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => rand() * 2 - 1),
  );
  for (let pass = 0; pass < 3; pass++) {
    // smooth it so the patches are wide and gentle
    noise = noise.map((row, r) =>
      row.map((_, c) => {
        let sum = 0,
          n = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const v = noise[r + dr]?.[c + dc];
            if (v !== undefined) {
              sum += v;
              n++;
            }
          }
        return sum / n;
      }),
    );
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = noise[r][c];
      if (Math.abs(v) < 0.08) continue;
      g.fillStyle = v > 0 ? GRASS_LIGHT : GRASS_DARK;
      g.globalAlpha = Math.min(Math.abs(v) * 4, 0.7);
      g.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
  }
  g.globalAlpha = 1;

  // tufts: three little blades, on a jittered grid so they don't clump
  const U = 3; // one tuft "pixel" in game pixels
  const step = Math.sqrt((GAME_W * GAME_H) / GRASS_TUFT_COUNT);
  for (let y = 0; y < GAME_H; y += step) {
    for (let x = 0; x < GAME_W; x += step) {
      const tx = Math.round((x + rand() * step) / U) * U;
      const ty = Math.round((y + rand() * step) / U) * U;
      g.fillStyle = GRASS_TUFT;
      g.fillRect(tx - U, ty - 2 * U, U, 2 * U); // left blade
      g.fillRect(tx, ty - 3 * U, U, 3 * U); // middle blade (tallest)
      g.fillRect(tx + U, ty - 2 * U, U, 2 * U); // right blade
      g.fillStyle = GRASS_TUFT_HIGHLIGHT;
      g.fillRect(tx, ty - 3 * U, U, U); // bright tip
    }
  }
  return layer;
}

// ---------- Scattered flowers ----------
// images: loaded flower images. Returns an array of Props.
function makeMeadowProps(images) {
  if (images.length === 0) return [];
  const rand = seededRandom(MEADOW_SEED);
  const title = titleBounds();
  const clear = {
    left: title.x - MEADOW_TITLE_MARGIN,
    right: title.x + title.w + MEADOW_TITLE_MARGIN,
    top: title.y - MEADOW_TITLE_MARGIN,
    bottom: title.y + title.h + MEADOW_TITLE_MARGIN,
  };

  const props = [];
  const half = MEADOW_FLOWER_SIZE / 2;
  for (
    let attempt = 0;
    attempt < MEADOW_COUNT * 40 && props.length < MEADOW_COUNT;
    attempt++
  ) {
    const x = half + rand() * (GAME_W - MEADOW_FLOWER_SIZE);
    const y = MEADOW_FLOWER_SIZE + rand() * (GAME_H - MEADOW_FLOWER_SIZE - 6); // y is the base of the flower
    const topOfFlower = y - MEADOW_FLOWER_SIZE;
    // keep the title readable: skip anything that would overlap its area
    if (
      x + half > clear.left &&
      x - half < clear.right &&
      y > clear.top &&
      topOfFlower < clear.bottom
    )
      continue;
    // keep flowers from piling up
    if (props.some((p) => Math.hypot(p.x - x, p.y - y) < MEADOW_MIN_GAP))
      continue;
    const img = images[Math.floor(rand() * images.length)];
    props.push(new Prop(img, x, y, MEADOW_FLOWER_SIZE));
  }
  return props;
}
