// ---------------------------------------------------------------
// Phaser version of the game (test).
// Reuses ../data/, ../meadow.js (grass, flower spots) and ../title.js.
// Rewritten in Phaser: loading, animations, input, actors, maps, fade.
//
// Controls: arrows / WASD walk, Q cycles the player's form.
// Run it from a local server (e.g. VS Code Live Server), not file://.
// ---------------------------------------------------------------

// meadow.js reads these three globals
const GAME_W = 960;
const GAME_H = 600;
const GRASS_COLOUR = "#5aa85a";

// SAME KNOBS AS main.js
const FOOT_PAD = 0.1;
const FRAME_TIME = 0.15;
const WANDER_SPEED_FACTOR = 0.5;
const PLAYER_FORMS = ["clair", "bulbasaur", "cubone"];
const WALL_X = 60;
const EXIT_EDGE = 20;
const MIN_Y = 120;
const MAX_Y = GAME_H - 20;
const ARRIVE_INSET = 30;
const FADE_MS = 350;
const FLOWER_FADE_MS = 150; // Flower fade time (opacity comes from PROP_FADE_ALPHA in meadow.js)

const CHARACTERS = { ...TRAINERS, ...POKEMON };
const FILE_DIR = { down: "front", up: "back", left: "left", right: "right" };
const DIRS = Object.keys(FILE_DIR);
const rand = Phaser.Math.FloatBetween;

// Texture keys, e.g. "cubone-front-1", "clair-standing-left"
const stepKey = (id, dir, n) => `${id}-${FILE_DIR[dir]}-${n}`;
const standKey = (id, dir) => `${id}-standing-${FILE_DIR[dir]}`;

// ---------- Boot: load everything, define animations ----------
class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    this.load.setPath("../"); // Data files use paths from the repo root

    for (const [id, c] of Object.entries(CHARACTERS)) {
      const { base, standing } = c.sprites.normal;
      for (const dir of DIRS) {
        const f = FILE_DIR[dir];
        this.load.image(stepKey(id, dir, 1), `${base}-${f}-1.png`);
        this.load.image(stepKey(id, dir, 2), `${base}-${f}-2.png`);
        if (standing)
          this.load.image(standKey(id, dir), `${base}-standing-${f}.png`);
      }
    }

    // Flowers: the file path is the texture key (Set removes duplicates)
    const flowers = new Set([
      ...MEADOW_FLOWER_SRCS,
      ...TITLE_FLOWERS.map((f) => f.src),
    ]);
    flowers.forEach((src) => this.load.image(src, src));
  }

  create() {
    // One walk animation per character and direction.
    // Trainer: step, stand, step, stand. Pokemon: two steps.
    for (const [id, c] of Object.entries(CHARACTERS)) {
      for (const dir of DIRS) {
        const keys = c.sprites.normal.standing
          ? [
              stepKey(id, dir, 1),
              standKey(id, dir),
              stepKey(id, dir, 2),
              standKey(id, dir),
            ]
          : [stepKey(id, dir, 1), stepKey(id, dir, 2)];
        this.anims.create({
          key: `${id}-walk-${dir}`,
          frames: keys.map((key) => ({ key })),
          frameRate: 1 / FRAME_TIME,
          repeat: -1,
        });
      }
    }
    this.scene.start("map");
  }
}

// ---------- Actor: anything that walks ----------
class Actor extends Phaser.GameObjects.Sprite {
  constructor(scene, id, x, y, speedFactor = 1) {
    super(scene, x, y, stepKey(id, "down", 1));
    scene.add.existing(this);
    this.shadow = scene.add.ellipse(x, y, 1, 14, 0x000000, 0.18);
    this.speedFactor = speedFactor;
    this.dir = "down";
    this.moving = false;
    this.setCharacter(id);
    this.step(0, 0, 0); // Place shadow and depth
  }

  // Changes look and speed. Position and facing are kept.
  setCharacter(id) {
    const c = CHARACTERS[id];
    this.id = id;
    this.speed = c.movement.speed * this.speedFactor;
    this.setScale(c.render.scale).setOrigin(0.5, 1 - FOOT_PAD); // Origin = the feet
    this.shadow.setSize(this.displayWidth * 0.64, 14);
    this.showPose();
  }

  // Walk animation while moving, idle pose otherwise
  showPose() {
    if (this.moving) {
      this.play(`${this.id}-walk-${this.dir}`, true);
    } else {
      this.stop();
      const standing = CHARACTERS[this.id].sprites.normal.standing;
      this.setTexture(
        standing ? standKey(this.id, this.dir) : stepKey(this.id, this.dir, 1),
      );
    }
  }

  // Moves for one frame. dx, dy: -1, 0 or 1. dt: seconds.
  step(dx, dy, dt) {
    this.moving = dx !== 0 || dy !== 0;
    if (this.moving) {
      const b = this.scene.bounds;
      this.x = Phaser.Math.Clamp(this.x + dx * this.speed * dt, b.minX, b.maxX);
      this.y = Phaser.Math.Clamp(this.y + dy * this.speed * dt, b.minY, b.maxY);
      if (Math.abs(dx) > Math.abs(dy)) this.dir = dx < 0 ? "left" : "right";
      else this.dir = dy < 0 ? "up" : "down";
    }
    this.showPose();
    this.setDepth(this.y); // Lower on screen = in front
    this.shadow.setPosition(this.x, this.y).setDepth(this.y - 0.5);
  }

  // Body box (middle 70% wide, 80% tall) so flowers in front know to fade
  box() {
    const w = this.displayWidth;
    const h = this.displayHeight;
    const left = this.x - w / 2;
    const top = this.y - h * (1 - FOOT_PAD);
    return {
      y: this.y,
      bounds: {
        left: left + w * 0.15,
        right: left + w * 0.85,
        top: top + h * 0.1,
        bottom: top + h * 0.9,
      },
    };
  }
}

// ---------- Wandering Pokemon: walk a bit, rest, repeat ----------
const WANDER_DIRS = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 0],
];

class Wanderer {
  constructor(actor) {
    this.actor = actor;
    this.walking = false;
    this.timer = rand(0.5, 2);
    this.dx = 0;
    this.dy = 0;
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.walking = !this.walking;
      if (this.walking) {
        [this.dx, this.dy] = Phaser.Utils.Array.GetRandom(WANDER_DIRS);
        this.timer = rand(0.8, 2.2);
      } else {
        this.dx = this.dy = 0;
        this.timer = rand(1, 3);
      }
    }
    const { x, y } = this.actor;
    this.actor.step(this.dx, this.dy, dt);
    // Hit an edge: rest
    if (this.walking && this.actor.x === x && this.actor.y === y)
      this.timer = 0;
  }
}

// ---------- Map scene: one map; restarted with new data to change map ----------
const DIR_KEYS = {
  LEFT: [-1, 0],
  A: [-1, 0],
  RIGHT: [1, 0],
  D: [1, 0],
  UP: [0, -1],
  W: [0, -1],
  DOWN: [0, 1],
  S: [0, 1],
};

// Walking limits. A side with an exit is open almost to the edge.
function boundsFor(def) {
  const exits = def.exits || {};
  return {
    minX: exits.left ? EXIT_EDGE : WALL_X,
    maxX: GAME_W - (exits.right ? EXIT_EDGE : WALL_X),
    minY: MIN_Y,
    maxY: MAX_Y,
  };
}

class MapScene extends Phaser.Scene {
  constructor() {
    super("map");
  }

  // data: { id, side, y } when arriving from another map, empty on first load
  init(data = {}) {
    this.arrival = data;
  }

  create() {
    const { id = START_MAP, side, y } = this.arrival;
    const def = MAPS[id];
    this.def = def;
    this.bounds = boundsFor(def);
    this.changing = false;

    this.addGrass(id, def);
    this.addFlowers(def);

    // Player: appears on the opposite side from the edge just left
    const b = this.bounds;
    let px = def.start?.x;
    let py = def.start?.y ?? y;
    if (side === "right") [px, py] = [b.minX + ARRIVE_INSET, y];
    if (side === "left") [px, py] = [b.maxX - ARRIVE_INSET, y];
    py = Phaser.Math.Clamp(py, b.minY, b.maxY);
    this.player = new Actor(
      this,
      PLAYER_FORMS[this.registry.get("form") ?? 0],
      px,
      py,
    );

    this.wanderers = (def.wanderers || []).map(
      ([charId, x, wy]) =>
        new Wanderer(new Actor(this, charId, x, wy, WANDER_SPEED_FACTOR)),
    );

    // Input
    this.held = []; // Held direction keys, newest last
    this.dirKeys = Object.entries(DIR_KEYS).map(([k, dir]) => ({
      key: this.input.keyboard.addKey(k),
      dir,
    }));
    this.input.keyboard.on("keydown-Q", (e) => {
      if (!e.repeat) this.transform();
    });

    this.cameras.main.fadeIn(FADE_MS);
  }

  // Grass is painted once per map (meadow.js) and kept as a texture
  addGrass(id, def) {
    const key = `grass-${id}`;
    if (!this.textures.exists(key))
      this.textures.addCanvas(key, buildGrassLayer(def.grassSeed));
    this.add.image(0, 0, key).setOrigin(0).setDepth(-1);
  }

  // meadow.js and title.js pick the spots; each becomes a Phaser image
  addFlowers(def) {
    const keyOf = new Map(); // Image element -> texture key
    const image = (src) => {
      const img = this.textures.get(src).getSourceImage();
      keyOf.set(img, src);
      return img;
    };
    const titleImgs = TITLE_FLOWERS.map((f) => ({
      img: image(f.src),
      weight: f.weight,
    }));
    const meadowImgs = MEADOW_FLOWER_SRCS.map(image);

    this.props = [
      ...(def.title ? makeTitleProps(titleImgs) : []),
      ...makeMeadowProps(meadowImgs, {
        seed: def.flowerSeed,
        avoidTitle: def.title,
      }),
    ];
    for (const p of this.props) {
      p.sprite = this.add
        .image(p.x, p.y, keyOf.get(p.img))
        .setOrigin(0.5, 1 - PROP_FOOT_PAD)
        .setDisplaySize(p.w, p.h)
        .setDepth(p.y);
      p.covering = false;
    }
  }

  // Next form, wrapping around. The choice is kept across maps.
  transform() {
    const i = ((this.registry.get("form") ?? 0) + 1) % PLAYER_FORMS.length;
    this.registry.set("form", i);
    this.player.setCharacter(PLAYER_FORMS[i]);
  }

  // This frame's direction as [dx, dy]. The newest held key wins.
  readInput() {
    for (const k of this.dirKeys) {
      const i = this.held.indexOf(k);
      if (k.key.isDown && i === -1) this.held.push(k);
      else if (!k.key.isDown && i !== -1) this.held.splice(i, 1);
    }
    const top = this.held[this.held.length - 1];
    return top ? top.dir : [0, 0];
  }

  update(_, delta) {
    const dt = delta / 1000;
    const [dx, dy] = this.changing ? [0, 0] : this.readInput();
    this.player.step(dx, dy, dt);
    this.wanderers.forEach((w) => w.update(dt));
    this.checkExit(dx);

    const boxes = [this.player, ...this.wanderers.map((w) => w.actor)].map(
      (a) => a.box(),
    );
    for (const p of this.props) this.fadeFlower(p, boxes);
  }

  // Fades a flower while it covers someone standing behind it.
  // Only starts a tween when the state changes.
  fadeFlower(p, boxes) {
    const left = p.x - p.w / 2;
    const right = p.x + p.w / 2;
    const top = p.y - p.h * (1 - PROP_FOOT_PAD);
    const covering = boxes.some(
      ({ y, bounds: b }) =>
        y < p.y &&
        b.right > left &&
        b.left < right &&
        b.bottom > top &&
        b.top < p.y,
    );
    if (covering === p.covering) return;
    p.covering = covering;
    this.tweens.killTweensOf(p.sprite); // Reversing mid-fade starts from where it is
    this.tweens.add({
      targets: p.sprite,
      alpha: covering ? PROP_FADE_ALPHA : 1,
      duration: FLOWER_FADE_MS,
      ease: "Sine.easeOut",
    });
  }

  // Walking into an open edge that has an exit changes map
  checkExit(dx) {
    if (this.changing) return;
    const { exits = {} } = this.def;
    const p = this.player;
    const b = this.bounds;
    if (dx > 0 && exits.right && p.x >= b.maxX)
      this.leave(exits.right, "right");
    else if (dx < 0 && exits.left && p.x <= b.minX)
      this.leave(exits.left, "left");
  }

  // Fade out, then restart this scene as the next map
  leave(id, side) {
    this.changing = true;
    const cam = this.cameras.main;
    cam.fadeOut(FADE_MS);
    cam.once("camerafadeoutcomplete", () =>
      this.scene.restart({ id, side, y: this.player.y }),
    );
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: "game",
  backgroundColor: GRASS_COLOUR,
  pixelArt: true, // Crisp scaling
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, MapScene],
});
