// ---------------------------------------------------------------
// Landing page title: spells a name out in flower sprites on the grass.
// The flowers are Props (see meadow.js) so they are drawn in depth order with the characters.
// ---------------------------------------------------------------

const TITLE_TEXT = "SHARN";

// The flowers the title is made of, with how often each is used (files in assets/sprites/flowers/).
// Both are white, so the name stays clear.
const TITLE_FLOWERS = [
  { src: "assets/sprites/flowers/flowers6(moon-flower).png", weight: 6 },
  { src: "assets/sprites/flowers/flowers41(daisy).png", weight: 3 },
];

// Tuning knobs
const TITLE_CELL = 30; // sideways spacing between letter spots (the letters are 5 x 7 spots)
const TITLE_CELL_H = 30; // up-and-down spacing; taller spots make the letters taller and easier to read
const TITLE_FLOWER_SIZE = 48; // average drawn width of one flower, in game pixels
const TITLE_SIZE_VARIATION = 0.2; // how much sizes vary (0.2 = from 20% smaller to 20% bigger)
const TITLE_FLOWERS_PER_CELL = 4; // flowers piled onto each spot; more means lusher
const TITLE_SPREAD = 0.5; // how far they scatter from the spot (fraction of a cell); more means wider strokes
const TITLE_SPILL = 0; // chance of stray flowers beside each stroke (0 = clean edges; they made the letters harder to read)
const TITLE_CENTRE_Y = 250; // vertical middle of the title, in game pixels
const TITLE_SEED = 7; // change for a different (but still fixed) scatter

// Each letter is 5 spots wide and 7 tall. # = a flower goes here.
const TITLE_FONT = {
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
};

// Where the title sits on the screen (used to keep scattered flowers clear of it)
const TITLE_LETTER_COLS = 5;
const TITLE_LETTER_ROWS = 7;
const TITLE_GAP_COLS = 1;

function titleBounds() {
  const letters = [...TITLE_TEXT];
  const cols =
    letters.length * TITLE_LETTER_COLS + (letters.length - 1) * TITLE_GAP_COLS;
  const w = cols * TITLE_CELL;
  const h = TITLE_LETTER_ROWS * TITLE_CELL_H;
  return { x: (GAME_W - w) / 2, y: TITLE_CENTRE_Y - h / 2, w, h };
}

// Returns the title as an array of flower Props (see meadow.js), so they are drawn in depth order.
// images: [{ img, weight }, ...] for the flowers in TITLE_FLOWERS that loaded.
function makeTitleProps(images) {
  if (images.length === 0) return [];
  const rand = seededRandom(TITLE_SEED);
  const { x: left, y: top } = titleBounds();
  const totalWeight = images.reduce((sum, f) => sum + f.weight, 0);

  function pickImage() {
    let roll = rand() * totalWeight;
    for (const f of images) {
      roll -= f.weight;
      if (roll <= 0) return f.img;
    }
    return images[0].img;
  }

  // one flower near (cx, cy), at a random size and spot inside the given spread
  function addFlower(props, cx, cy, spread, sizeScale = 1) {
    const img = pickImage();
    const w =
      TITLE_FLOWER_SIZE *
      sizeScale *
      (1 + (rand() * 2 - 1) * TITLE_SIZE_VARIATION);
    const h = img.naturalHeight * (w / img.naturalWidth);
    // two random numbers added together bunch the flowers toward the middle of the spot
    const dx = (rand() + rand() - 1) * spread * TITLE_CELL;
    const dy = (rand() + rand() - 1) * spread * TITLE_CELL_H;
    // the flower is centred on its spot, so its base sits below that
    props.push(new Prop(img, cx + dx, cy + dy + h * (0.5 - PROP_FOOT_PAD), w));
  }

  const props = [];
  [...TITLE_TEXT].forEach((ch, letterIndex) => {
    const glyph = TITLE_FONT[ch];
    if (!glyph) {
      console.warn("No flower letter for:", ch);
      return;
    }
    const isOn = (row, col) => glyph[row]?.[col] === "#";
    glyph.forEach((rowText, row) => {
      [...rowText].forEach((_, col) => {
        const cx =
          left +
          (letterIndex * (TITLE_LETTER_COLS + TITLE_GAP_COLS) + col + 0.5) *
            TITLE_CELL;
        const cy = top + (row + 0.5) * TITLE_CELL_H;
        if (isOn(row, col)) {
          for (let k = 0; k < TITLE_FLOWERS_PER_CELL; k++)
            addFlower(props, cx, cy, TITLE_SPREAD);
        } else if (
          [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
          ].some(([dr, dc]) => isOn(row + dr, col + dc))
        ) {
          // an empty spot touching a stroke: sometimes a couple of smaller strays
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
