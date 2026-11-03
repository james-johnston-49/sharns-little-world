// ---------------------------------------------------------------
// Grass and flowers.
//  - seededRandom(): repeatable random numbers
//  - Prop: a flower (or anything) standing on the ground
//  - buildGrassLayer(): paints a map's grass
//  - makeMeadowProps(): scatters flowers, clear of the title
// ---------------------------------------------------------------

// Flowers scattered over the field (assets/sprites/flowers/)
const MEADOW_FLOWER_SRCS = [
  "assets/sprites/flowers/flower1(yellow-cluster).png",
  "assets/sprites/flowers/flower3(perriwinkle).png",
  "assets/sprites/flowers/flowers12(pink-rose).png",
  "assets/sprites/flowers/flowers37(rapunzel).png",
  "assets/sprites/flowers/flowers41(daisy).png",
];

// SCATTERED FLOWERS
const MEADOW_COUNT = 66; // How many
const MEADOW_FLOWER_SIZE = 32; // Drawn width (files are 32 wide, so this keeps pixels even)
const MEADOW_MIN_GAP = 46; // Minimum distance between flowers
const MEADOW_TITLE_MARGIN = 26; // Clear space around the title
const MEADOW_SEED = 11; // Changes the scatter

// GRASS
const GRASS_TUFT_COUNT = 580; // Approximate number of tufts

// FLOWER FADING (when covering a character)
const PROP_FOOT_PAD = 0.06; // Empty share of a sprite's height under its base
const PROP_FADE_ALPHA = 0.7; // Opacity while covering (1 = never fades)
const PROP_FADE_SPEED = 10; // Fade speed

// GRASS COLOURS
const GRASS_LIGHT = "#66b463"; // Light patches
const GRASS_DARK = "#4b9a4c"; // Dark patches
const GRASS_TUFT = "#3d8744"; // Tuft blades
const GRASS_TUFT_HIGHLIGHT = "#82c97a"; // Tuft tips

// ---------- Seeded random ----------
// Like Math.random() (0 up to 1), but the same seed gives the same
// sequence, so every page load looks identical. (mulberry32)
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

// ---------- Prop: a flower standing on the ground ----------
// x is the centre, y is the base. Props sort with characters by y.
class Prop {
  constructor(img, x, baseY, width) {
    this.img = img;
    this.x = x;
    this.y = baseY;
    this.w = width;
    this.h = img.naturalHeight * (width / img.naturalWidth);
    this.alpha = 1; // 1 = solid
  }

  // Fades while covering a character standing behind it
  update(dt, actors) {
    // The flower's box
    const left = this.x - this.w / 2;
    const right = this.x + this.w / 2;
    const top = this.y - this.h * (1 - PROP_FOOT_PAD);
    const bottom = this.y;
    let covering = false;
    for (const a of actors) {
      const b = a.bounds; // Body box from the last draw
      // Skip undrawn characters and ones in front of the flower
      if (!b || a.y >= this.y) continue;
      // Boxes overlap?
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
    // Ease toward the target for a smooth fade
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
    if (faded) ctx.globalAlpha = 1; // Reset
  }
}

// ---------- Grass ----------
// Paints light and dark patches plus small tufts onto a canvas.
// Built once per map. seed: changes the pattern.
function buildGrassLayer(seed = 3) {
  const layer = document.createElement("canvas");
  layer.width = GAME_W;
  layer.height = GAME_H;
  const g = layer.getContext("2d");
  g.imageSmoothingEnabled = false;
  const rand = seededRandom(seed);

  // 1. Base colour
  g.fillStyle = GRASS_COLOUR;
  g.fillRect(0, 0, GAME_W, GAME_H);

  // 2. Patches: random noise, smoothed, drawn as light/dark blocks
  const CELL = 24; // Block size
  const cols = Math.ceil(GAME_W / CELL) + 2;
  const rows = Math.ceil(GAME_H / CELL) + 2;
  let noise = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => rand() * 2 - 1),
  );
  for (let pass = 0; pass < 3; pass++) {
    // Average with neighbours for wide, gentle patches
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
      // Positive = light, negative = dark. Near 0 stays plain; stronger = more opaque.
      if (Math.abs(v) < 0.08) continue;
      g.fillStyle = v > 0 ? GRASS_LIGHT : GRASS_DARK;
      g.globalAlpha = Math.min(Math.abs(v) * 4, 0.7);
      g.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
  }
  g.globalAlpha = 1;

  // 3. Tufts: three blades each, on a jittered grid so they don't clump
  const U = 3; // One tuft "pixel"
  const step = Math.sqrt((GAME_W * GAME_H) / GRASS_TUFT_COUNT); // Grid spacing
  for (let y = 0; y < GAME_H; y += step) {
    for (let x = 0; x < GAME_W; x += step) {
      const tx = Math.round((x + rand() * step) / U) * U;
      const ty = Math.round((y + rand() * step) / U) * U;
      g.fillStyle = GRASS_TUFT;
      g.fillRect(tx - U, ty - 2 * U, U, 2 * U); // Left blade
      g.fillRect(tx, ty - 3 * U, U, 3 * U); // Middle (tallest)
      g.fillRect(tx + U, ty - 2 * U, U, 2 * U); // Right blade
      g.fillStyle = GRASS_TUFT_HIGHLIGHT;
      g.fillRect(tx, ty - 3 * U, U, U); // Tip
    }
  }
  return layer;
}

// ---------- Scattered flowers ----------
// Returns an array of Props.
//   images       loaded flower images
//   seed         changes the scatter
//   avoidTitle   keep clear of the name (landing map only)
function makeMeadowProps(
  images,
  { seed = MEADOW_SEED, avoidTitle = false } = {},
) {
  if (images.length === 0) return [];
  const rand = seededRandom(seed);
  const title = avoidTitle ? titleBounds() : null;
  // Title box plus margin: no flowers inside
  const clear = title && {
    left: title.x - MEADOW_TITLE_MARGIN,
    right: title.x + title.w + MEADOW_TITLE_MARGIN,
    top: title.y - MEADOW_TITLE_MARGIN,
    bottom: title.y + title.h + MEADOW_TITLE_MARGIN,
  };

  const props = [];
  const half = MEADOW_FLOWER_SIZE / 2;
  // Try random spots (up to 40 per flower) until the count is reached
  for (
    let attempt = 0;
    attempt < MEADOW_COUNT * 40 && props.length < MEADOW_COUNT;
    attempt++
  ) {
    const x = half + rand() * (GAME_W - MEADOW_FLOWER_SIZE);
    const y = MEADOW_FLOWER_SIZE + rand() * (GAME_H - MEADOW_FLOWER_SIZE - 6); // Flower base
    const topOfFlower = y - MEADOW_FLOWER_SIZE;
    // Skip spots overlapping the title
    if (
      clear &&
      x + half > clear.left &&
      x - half < clear.right &&
      y > clear.top &&
      topOfFlower < clear.bottom
    )
      continue;
    // Skip spots too close to another flower
    if (props.some((p) => Math.hypot(p.x - x, p.y - y) < MEADOW_MIN_GAP))
      continue;
    const img = images[Math.floor(rand() * images.length)];
    props.push(new Prop(img, x, y, MEADOW_FLOWER_SIZE));
  }
  return props;
}