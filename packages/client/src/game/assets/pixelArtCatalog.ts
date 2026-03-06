import type { EnemyTypeId } from "@pals-defence/shared";
import type Phaser from "phaser";

export interface PixelTextureDef {
  key: string;
  data: string[];
  pixelWidth?: number;
}

// Void Wardens palette — dark obsidian stone + teal emissive + amber danger + arcane purple
const VOID_WARDENS_PALETTE = {
  "0": "#050810", // void black
  "1": "#0c1220", // stone darkest
  "2": "#141b2e", // stone dark
  "3": "#1e2840", // stone mid
  "4": "#28334e", // stone light
  "5": "#36425e", // stone highlight
  "6": "#130c28", // void path darkest
  "7": "#1e1240", // void path dark
  "8": "#2c1a5c", // void path mid
  "9": "#3e2480", // void path bright
  A: "#00e5d4", // teal emissive — hero / defender core
  B: "#50f5e8", // teal bright
  C: "#009e98", // teal dim
  D: "#e07030", // amber — ranged / runner
  E: "#f09840", // amber bright
  F: "#d4e4f0", // ghost white — highlights / eyes
  G: "#6c38c0", // rune purple — mage / elite
  H: "#a060f0", // rune bright
  I: "#c02838", // crimson — swarm
  J: "#e04050", // crimson bright
  K: "#485270", // slate blue — armor trim / armored
  L: "#6470a0", // slate light
  M: "#263450", // stone runed — tower walls
  N: "#364864", // stone runed light
  O: "#421e78", // void purple deep — boss / pools
  P: "#ffb840", // gold bright
  Q: "#c08030", // amber gold
  R: "#b840a0", // rune pink / magenta — boss phase 3
  S: "#8090a8", // pale gray — skin / bones
  T: "#201410", // dark earth
  U: "#382010", // bark / rust
  V: "#50d068", // poison green
};

export const PIXEL_PALETTE = VOID_WARDENS_PALETTE as unknown as Phaser.Types.Create.Palette;

export const ENEMY_TINTS: Record<EnemyTypeId, number> = {
  swarm: 0xffffff,
  ranged: 0xffffff,
  armored: 0xffffff,
  runner: 0xffffff,
  elite: 0xffffff,
  boss: 0xffffff,
};

export const TOWER_TEXTURE_KEYS = {
  defender: "tower_defender",
  archer: "tower_archer",
  mage: "tower_mage",
} as const;

export const HERO_TEXTURE_KEYS = {
  alive: ["hero_alive_0", "hero_alive_1", "hero_alive_2", "hero_alive_3"] as const,
  downed: "hero_downed",
  dead: "hero_dead",
} as const;

export const ENEMY_TEXTURE_KEYS = {
  swarm: ["enemy_swarm_0", "enemy_swarm_1"] as const,
  ranged: ["enemy_ranged_0", "enemy_ranged_1"] as const,
  armored: ["enemy_armored_0", "enemy_armored_1"] as const,
  runner: ["enemy_runner_0", "enemy_runner_1"] as const,
  elite: ["enemy_elite_0", "enemy_elite_1"] as const,
  boss: ["enemy_boss_0", "enemy_boss_1", "enemy_boss_2"] as const,
} as const;

export const PIXEL_TEXTURES: PixelTextureDef[] = [
  // ─── GROUND TILES ───────────────────────────────────────────
  {
    // Darkest obsidian stone
    key: "tile_grass_a",
    data: [
      "11111111",
      "12111211",
      "11211121",
      "21111112",
      "11121111",
      "12111211",
      "11211112",
      "11111111",
    ],
  },
  {
    // Mid stone with subtle cracks
    key: "tile_grass_b",
    data: [
      "22332232",
      "23222322",
      "22323232",
      "32222233",
      "23322232",
      "22232223",
      "32223232",
      "22332232",
    ],
  },
  {
    // Lighter stone with blue-runed traces
    key: "tile_grass_c",
    data: [
      "33443344",
      "34343433",
      "43334334",
      "34M43443",
      "33443M34",
      "43334433",
      "34343334",
      "33443344",
    ],
  },
  {
    // Void-corrupted path — dark
    key: "tile_path_a",
    data: [
      "66777666",
      "77888877",
      "78899887",
      "88998988",
      "78998887",
      "78899887",
      "77888877",
      "66777666",
    ],
  },
  {
    // Void path with rune glow hints
    key: "tile_path_b",
    data: [
      "77887788",
      "78899887",
      "88G99G88",
      "79G99G97",
      "79G99G97",
      "88G99G88",
      "78899887",
      "77887788",
    ],
  },
  {
    // Void path — bright center
    key: "tile_path_c",
    data: [
      "88999888",
      "89988998",
      "99889899",
      "89998998",
      "89998998",
      "99889899",
      "89988998",
      "88999888",
    ],
  },

  // ─── PROPS ──────────────────────────────────────────────────
  {
    // Void crystal cluster — small teal+purple shards
    key: "prop_bush",
    data: [
      "....A...",
      "...ABA..",
      "..ABFBA.",
      "..AGBGA.",
      "..ABBA..",
      "...333..",
      "...22...",
      "........",
    ],
  },
  {
    // Obsidian chunk — dark stone with blue-metallic sheen
    key: "prop_stone",
    data: [
      "........",
      "..3443..",
      ".34KK43.",
      ".4KLLK4.",
      ".4KLLK4.",
      ".34KK43.",
      "..3443..",
      "........",
    ],
  },
  {
    // Amber rune mark — glowing inscription on ground
    key: "prop_flower_gold",
    data: [
      "........",
      "...Q....",
      "..QDQ...",
      ".QDEDQ..",
      "..QDQ...",
      "...Q....",
      "........",
      "........",
    ],
  },
  {
    // Teal rune mark — arcane inscription
    key: "prop_flower_blue",
    data: [
      "........",
      "...C....",
      "..CAC...",
      ".CABAC..",
      "..CAC...",
      "...C....",
      "........",
      "........",
    ],
  },
  {
    // Void pillar — tall runed stone column with glowing runes
    key: "prop_tree",
    data: [
      "..MNNM..",
      ".MN44NM.",
      "MN4GG4NM",
      "MN4GG4NM",
      "MN4554NM",
      "MN4554NM",
      ".MN44NM.",
      "..2222..",
    ],
  },
  {
    // Bone totem — pale remains of fallen
    key: "prop_tree_dead",
    data: [
      "..SSSS..",
      ".SFFFFS.",
      ".SFSSFS.",
      "..SSSS..",
      "..SSSS..",
      ".SFSSFS.",
      ".SFFFFS.",
      "..SSSS..",
    ],
  },
  {
    // Large crystal shard — teal+purple landmark
    key: "prop_crystal",
    data: [
      "....B...",
      "...BHB..",
      "..BHFHB.",
      ".BHFFFHB",
      "..BHFHB.",
      "...BHB..",
      "...GGG..",
      "...222..",
    ],
  },
  {
    // Ruin arch fragment — broken ancient gateway
    key: "prop_ruin",
    data: [
      "........",
      ".44..44.",
      ".4M44M4.",
      ".44MM44.",
      ".4MNNM4.",
      ".44MM44.",
      ".44..44.",
      "........",
    ],
  },
  {
    // Void pool — small pool of void energy
    key: "prop_mushroom",
    data: [
      "........",
      "..8998..",
      ".89OO98.",
      ".9OHHO9.",
      ".9OHHO9.",
      ".89OO98.",
      "..8998..",
      "........",
    ],
  },
  {
    // Void tendril — energy rising from ground
    key: "prop_grass_tall",
    data: [
      "...O....",
      "..OH....",
      "..OHO...",
      ".OHHO...",
      "..OHO...",
      "..8O8...",
      "...8....",
      "........",
    ],
  },
  {
    // Ancient wall fragment — fortification remnant
    key: "prop_fence",
    data: [
      "........",
      ".MMMMMM.",
      ".M4444M.",
      ".MNNNNM.",
      ".M4444M.",
      ".MMMMMM.",
      "..4..4..",
      "........",
    ],
  },
  {
    // Rune circle — inscribed arcane circle on ground
    key: "prop_crop",
    data: [
      "..CCCC..",
      ".CAAAC..",
      ".CAGAC..",
      ".CAFAC..",
      ".CAGAC..",
      ".CAAAC..",
      "..CCCC..",
      "........",
    ],
  },
  {
    // Ancient urn — ceremonial stone vessel
    key: "prop_barrel",
    data: [
      "........",
      "..NNNN..",
      ".NKSSKN.",
      ".NK44KN.",
      ".NK44KN.",
      ".NKSSKN.",
      "..NNNN..",
      "........",
    ],
  },

  // ─── TOWERS ─────────────────────────────────────────────────
  {
    // Defender: stone aegis with teal crystal core
    key: "tower_defender",
    data: [
      "00MMNNMM00",
      "0MN4444NM0",
      "MN44CC44NM",
      "N4CCAACC4N",
      "M4CAABAC4M",
      "M4CAABAC4M",
      "N4CCAACC4N",
      "MN44CC44NM",
      "0MN4444NM0",
      "00MMNNMM00",
    ],
    pixelWidth: 3,
  },
  {
    // Archer: stone spire with amber targeting crystal
    key: "tower_archer",
    data: [
      "003MNNM300",
      "03M4444M30",
      "3M44QQ44M3",
      "M44QDDQ44M",
      "34QDEEQD43",
      "34QDEEQD43",
      "M44QDDQ44M",
      "3M44QQ44M3",
      "03M4444M30",
      "003MNNM300",
    ],
    pixelWidth: 3,
  },
  {
    // Mage: void condenser with arcane purple core
    key: "tower_mage",
    data: [
      "000GHHG000",
      "00GHOOGH00",
      "0GHOHHOHG0",
      "GHOHRRHOHG",
      "HOHRFFRHOH",
      "HOHRFFRHOH",
      "GHOHRRHOHG",
      "0GHOHHOHG0",
      "00GHOOGH00",
      "000GHHG000",
    ],
    pixelWidth: 3,
  },

  // ─── HERO ───────────────────────────────────────────────────
  {
    // Neutral/standing
    key: "hero_alive_0",
    data: [
      "000FFFF000",
      "00FSSSF000",
      "0FKAAAKF00",
      "0FK4CC4KF0",
      "0FKC44CKF0",
      "0FKC44CKF0",
      "0FK4CC4KF0",
      "00FK44KF00",
      "0044004400",
      "0440000440",
    ],
    pixelWidth: 3,
  },
  {
    // Walk frame A — left foot forward
    key: "hero_alive_1",
    data: [
      "000FFFF000",
      "00FSSSF000",
      "0FKAAAKF00",
      "0FK4CC4KF0",
      "0FKC44CKF0",
      "0FKC44CKF0",
      "0FK4CC4KF0",
      "00FK44KF00",
      "0440000000",
      "0034004400",
    ],
    pixelWidth: 3,
  },
  {
    // Walk frame B — arms swing
    key: "hero_alive_2",
    data: [
      "000FFFF000",
      "00FSSSF000",
      "0FKAAAKF00",
      "0FK4CC4KF0",
      "0FKC44CKF0",
      "0FKC44CKF0",
      "0FK4CC4KF0",
      "00FK44KF00",
      "0044004400",
      "0040000340",
    ],
    pixelWidth: 3,
  },
  {
    // Walk frame C — right foot forward
    key: "hero_alive_3",
    data: [
      "000FFFF000",
      "00FSSSF000",
      "0FKAAAKF00",
      "0FK4CC4KF0",
      "0FKC44CKF0",
      "0FKC44CKF0",
      "0FK4CC4KF0",
      "00FK44KF00",
      "0000004400",
      "0044003400",
    ],
    pixelWidth: 3,
  },
  {
    // Downed — lying horizontal
    key: "hero_downed",
    data: [
      "0000000000",
      "0FFFFFFFFF",
      "FKSSKKSSKF",
      "FKAAAAAAAF",
      "FK4CC4C4KF",
      "FKKKKK44F0",
      "0444444440",
      "0066006600",
      "0000000000",
      "0000000000",
    ],
    pixelWidth: 3,
  },
  {
    // Dead — crimson X
    key: "hero_dead",
    data: [
      "I00000000I",
      "0I000000I0",
      "00I0000I00",
      "000I00I000",
      "0000II0000",
      "0000II0000",
      "000I00I000",
      "00I0000I00",
      "0I000000I0",
      "I00000000I",
    ],
    pixelWidth: 3,
  },

  // ─── ENEMIES ────────────────────────────────────────────────
  {
    // Swarm: void parasite — crimson insectoid
    key: "enemy_swarm_0",
    data: [
      "00IIII00",
      "0IJJJJI0",
      "IJJFFJJI",
      "IJ4FF4JI",
      "IJ4JJ4JI",
      "IJ4JJ4JI",
      "0IJ44JI0",
      "00I00I00",
    ],
    pixelWidth: 3,
  },
  {
    key: "enemy_swarm_1",
    data: [
      "00IIII00",
      "0IJJJJI0",
      "IJJFFJJI",
      "IJ4FF4JI",
      "IJ4JJ4JI",
      "IJ4JJ4JI",
      "0IJ44JI0",
      "0I0000I0",
    ],
    pixelWidth: 3,
  },
  {
    // Ranged: void archer — gaunt with amber eye
    key: "enemy_ranged_0",
    data: [
      "00444400",
      "04DQQD40",
      "4DQEEQD4",
      "4DQFEEQD",
      "4D4DD4D4",
      "4DD44DD4",
      "004P0400",
      "04000040",
    ],
    pixelWidth: 3,
  },
  {
    key: "enemy_ranged_1",
    data: [
      "00444400",
      "04DQQD40",
      "4DQEEQD4",
      "4DQFEEQD",
      "4D4DD4D4",
      "4DD44DD4",
      "040P0040",
      "00400040",
    ],
    pixelWidth: 3,
  },
  {
    // Armored: void-plated knight — heavy slate silhouette
    key: "enemy_armored_0",
    data: [
      "00LLLL00",
      "0LKSSKL0",
      "LKSKFSKL",
      "LK5FF5KL",
      "LK5LL5KL",
      "LKL55LKL",
      "0LK55KL0",
      "00L00L00",
    ],
    pixelWidth: 3,
  },
  {
    key: "enemy_armored_1",
    data: [
      "00LLLL00",
      "0LKSSKL0",
      "LKSKFSKL",
      "LK5FF5KL",
      "LK5LL5KL",
      "LKL55LKL",
      "0L0000L0",
      "00LLLL00",
    ],
    pixelWidth: 3,
  },
  {
    // Runner: void wraith — fast amber/pale with speed shadow
    key: "enemy_runner_0",
    data: [
      "00DDDD00",
      "0DEEEED0",
      "DEFSSFED",
      "DE3SS3ED",
      "DESSSSD0",
      "0DE33ED0",
      "07000070",
      "00700700",
    ],
    pixelWidth: 3,
  },
  {
    key: "enemy_runner_1",
    data: [
      "00DDDD00",
      "0DEEEED0",
      "DEFSSFED",
      "DE3SS3ED",
      "DESSSSD0",
      "0DE33ED0",
      "00700700",
      "07000070",
    ],
    pixelWidth: 3,
  },
  {
    // Elite: empowered void champion — rune purple glow
    key: "enemy_elite_0",
    data: [
      "00HHHH00",
      "0HGOOGH0",
      "HGOFFOGH",
      "HG3HH3GH",
      "HG3FF3GH",
      "HG3HH3GH",
      "0HGOOPH0",
      "00H00H00",
    ],
    pixelWidth: 3,
  },
  {
    key: "enemy_elite_1",
    data: [
      "00HHHH00",
      "0HGOOGH0",
      "HGOFFOGH",
      "HG3HH3GH",
      "HG3FF3GH",
      "HG3HH3GH",
      "0H0000H0",
      "00HH0H00",
    ],
    pixelWidth: 3,
  },
  {
    // Boss phase 1 — void entity, purple/arcane
    key: "enemy_boss_0",
    data: [
      "00OOOOOO00",
      "0OGHHHGO00",
      "OGHIIIIHGO",
      "GHIJJJIIHG",
      "OHIJFFJIHO",
      "OHIJFFJIHO",
      "GHIIJJIIHG",
      "OGHIIIIHGO",
      "0OGHHHGO00",
      "00OO00OO00",
    ],
    pixelWidth: 3,
  },
  {
    // Boss phase 2 — corruption spreads, more crimson
    key: "enemy_boss_1",
    data: [
      "00JOOOOJ00",
      "0JGHHHGJ00",
      "JGHIJJIHJG",
      "GHIJJJJIHG",
      "JHIJFFJIHJ",
      "JHIJFFJIHJ",
      "GHIJJJJIHG",
      "JGHIJJIHJG",
      "0JGHHHGJ00",
      "0JJ0000JJ0",
    ],
    pixelWidth: 3,
  },
  {
    // Boss phase 3 — rage, full crimson/magenta
    key: "enemy_boss_2",
    data: [
      "00IJJJJI00",
      "0IJRRRJI00",
      "IJRIIIIIRJ",
      "JIJRJJRIJI",
      "IIJRFFRJII",
      "IIJRFFRJII",
      "JIJRJJRIJI",
      "IJRIIIIIRJ",
      "0IJRRRJI00",
      "00IJ00JI00",
    ],
    pixelWidth: 3,
  },
];
