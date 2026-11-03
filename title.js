// ---------------------------------------------------------------
// Landing page title: a name spelled in flowers on the grass.
// Each letter is a grid of cells (see TITLE_FONT) with a pile of
// flowers on every filled cell. The flowers are Props (meadow.js).
// ---------------------------------------------------------------

const TITLE_TEXT = "SHARN"; // Each letter needs an entry in TITLE_FONT

// Flower images and how often each is used (assets/sprites/flowers/)
const TITLE_FLOWERS = [
  { src: "assets/sprites/flowers/flowers6(moon-flower).png", weight: 6 },
  { src: "assets/sprites/flowers/flowers41(daisy).png", weight: 3 },
];

// TUNING KNOBS
const TITLE_CELL = 30; // Cell width (game pixels)
const TITLE_CELL_H = 30; // Cell height (taller = easier to read)
const TITLE_FLOWER_SIZE = 48; // Average flower width
const TITLE_SIZE_VARIATION = 0.2; // Size variation (0.2 = ±20%)
const TITLE_FLOWERS_PER_CELL = 4; // Flowers per filled cell (more = lusher)
const TITLE_SPREAD = 0.5; // Scatter from cell centre, in cells (more = wider strokes)
const TITLE_SPILL = 0; // Chance of strays beside a stroke (0 = clean edges)
const TITLE_CENTRE_Y = 285; // Vertical middle of the title
const TITLE_SEED = 7; // Changes the scatter

// Letters: 5 cells wide, 7 tall. # = flowers, . = empty. Add letters here.
const TITLE_FONT = {
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
};

// Letter grid size
const TITLE_LETTER_COLS = 5;
const TITLE_LETTER_ROWS = 7;
const TITLE_GAP_COLS = 1; // Empty cells between letters

// The title's box on screen: { x, y, w, h }.
// meadow.js uses it to keep other flowers clear.
function titleBounds() {
  const letters = [...TITLE_TEXT];
  // Letters plus the gaps between them
  const cols =
    letters.length * TITLE_LETTER_COLS + (letters.length - 1) * TITLE_GAP_COLS;
  const w = cols * TITLE_CELL;
  const h = TITLE_LETTER_ROWS * TITLE_CELL_H;
  return { x: (GAME_W - w) / 2, y: TITLE_CENTRE_Y - h / 2, w, h };
}

// Returns the title as an array of flower Props.
// images: [{ img, weight }, ...] for the TITLE_FLOWERS that loaded.
function makeTitleProps(images) {
  if (images.length === 0) return [];
  const rand = seededRandom(TITLE_SEED);
  const { x: left, y: top } = titleBounds();
  const totalWeight = images.reduce((sum, f) => sum + f.weight, 0);

  // Random image, favouring higher weights
  function pickImage() {
    let roll = rand() * totalWeight;
    for (const f of images) {
      roll -= f.weight;
      if (roll <= 0) return f.img;
    }
    return images[0].img;
  }

  // Adds one flower near (cx, cy), randomly sized and placed within `spread`.
  // sizeScale shrinks or grows it (used for strays).
  function addFlower(props, cx, cy, spread, sizeScale = 1) {
    const img = pickImage();
    const w =
      TITLE_FLOWER_SIZE *
      sizeScale *
      (1 + (rand() * 2 - 1) * TITLE_SIZE_VARIATION);
    const h = img.naturalHeight * (w / img.naturalWidth);
    // Adding two randoms bunches flowers toward the cell centre
    const dx = (rand() + rand() - 1) * spread * TITLE_CELL;
    const dy = (rand() + rand() - 1) * spread * TITLE_CELL_H;
    // Centred on the cell, so the base sits about half its height lower
    props.push(new Prop(img, cx + dx, cy + dy + h * (0.5 - PROP_FOOT_PAD), w));
  }

  const props = [];
  [...TITLE_TEXT].forEach((ch, letterIndex) => {
    const glyph = TITLE_FONT[ch];
    if (!glyph) {
      console.warn("No flower letter for:", ch);
      return;
    }
    // Is this cell filled? (safe outside the grid)
    const isOn = (row, col) => glyph[row]?.[col] === "#";
    glyph.forEach((rowText, row) => {
      [...rowText].forEach((_, col) => {
        // Cell centre on screen
        const cx =
          left +
          (letterIndex * (TITLE_LETTER_COLS + TITLE_GAP_COLS) + col + 0.5) *
            TITLE_CELL;
        const cy = top + (row + 0.5) * TITLE_CELL_H;
        if (isOn(row, col)) {
          // Filled cell: pile of flowers
          for (let k = 0; k < TITLE_FLOWERS_PER_CELL; k++)
            addFlower(props, cx, cy, TITLE_SPREAD);
        } else if (
          // Empty cell next to a stroke
          [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
          ].some(([dr, dc]) => isOn(row + dr, col + dc))
        ) {
          // Maybe a couple of small strays (see TITLE_SPILL)
          if (rand() < TITLE_SPILL) {
            for (let k = 0; k < 2; k++)
              addFlower(props, cx, cy, TITLE_SPREAD * 0.8, 0.75);
          }
        }
      });
    });
  });
  return props;
}
