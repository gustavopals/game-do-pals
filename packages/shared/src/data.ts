import type {
  EnemyDefinition,
  MapConfig,
  TowerDefinition,
  UpgradeDefinition,
} from "./types.js";

export const TOWER_DEFINITIONS: Record<string, TowerDefinition> = {
  defender: {
    id: "defender",
    name: "Defender",
    description: "Frontline resistente para segurar as rotas.",
    cost: 30,
    baseDamage: 6,
    baseRange: 90,
    baseCooldownMs: 900,
  },
  archer: {
    id: "archer",
    name: "Archer",
    description: "DPS de longo alcance com ataque veloz.",
    cost: 35,
    baseDamage: 9,
    baseRange: 150,
    baseCooldownMs: 700,
  },
  mage: {
    id: "mage",
    name: "Mage",
    description: "Dano mágico em área pequena por impacto.",
    cost: 40,
    baseDamage: 12,
    baseRange: 130,
    baseCooldownMs: 1000,
  },
};

export const ENEMY_DEFINITIONS: Record<string, EnemyDefinition> = {
  swarm: {
    id: "swarm",
    name: "Swarmling",
    maxHp: 22,
    speed: 54,
    rewardGold: 5,
    rewardXp: 7,
    contactDamage: 3,
    weight: 45,
  },
  ranged: {
    id: "ranged",
    name: "Rift Archer",
    maxHp: 30,
    speed: 48,
    rewardGold: 7,
    rewardXp: 9,
    contactDamage: 4,
    weight: 22,
  },
  armored: {
    id: "armored",
    name: "Obsidian Guard",
    maxHp: 48,
    speed: 38,
    rewardGold: 11,
    rewardXp: 13,
    contactDamage: 7,
    weight: 18,
  },
  runner: {
    id: "runner",
    name: "Blink Runner",
    maxHp: 17,
    speed: 82,
    rewardGold: 6,
    rewardXp: 8,
    contactDamage: 4,
    weight: 25,
  },
  elite: {
    id: "elite",
    name: "Fracture Champion",
    maxHp: 110,
    speed: 46,
    rewardGold: 21,
    rewardXp: 26,
    contactDamage: 11,
    weight: 8,
  },
  boss: {
    id: "boss",
    name: "Pals Defence Behemoth",
    maxHp: 560,
    speed: 34,
    rewardGold: 100,
    rewardXp: 125,
    contactDamage: 28,
    weight: 0,
    isBoss: true,
  },
};

export const UPGRADE_POOL: UpgradeDefinition[] = [
  {
    id: "iron_focus",
    name: "Iron Focus",
    description: "+4 dano do heroi.",
    rarity: "common",
    effects: [{ kind: "hero_damage_flat", amount: 4 }],
  },
  {
    id: "long_step",
    name: "Long Step",
    description: "+30 velocidade de movimento.",
    rarity: "common",
    effects: [{ kind: "hero_move_speed_flat", amount: 30 }],
  },
  {
    id: "tower_forging",
    name: "Tower Forging",
    description: "Torres causam +18% dano.",
    rarity: "common",
    effects: [{ kind: "tower_damage_pct", amountPct: 18 }],
  },
  {
    id: "rapid_bolts",
    name: "Rapid Bolts",
    description: "Torres atacam 15% mais rapido.",
    rarity: "common",
    effects: [{ kind: "tower_cooldown_pct", amountPct: 15 }],
  },
  {
    id: "extended_sight",
    name: "Extended Sight",
    description: "+30 alcance de ataque do heroi.",
    rarity: "common",
    effects: [{ kind: "hero_attack_range_flat", amount: 30 }],
  },
  {
    id: "reinforced_slots",
    name: "Reinforced Slots",
    description: "+1 limite de torres.",
    rarity: "rare",
    effects: [{ kind: "tower_slot_flat", amount: 1 }],
  },
  {
    id: "greedy_aura",
    name: "Greedy Aura",
    description: "+20% ouro recebido.",
    rarity: "rare",
    effects: [{ kind: "gold_gain_pct", amountPct: 20 }],
  },
  {
    id: "second_wind",
    name: "Second Wind",
    description: "Recupera 25 de vida.",
    rarity: "rare",
    effects: [{ kind: "heal_flat", amount: 25 }],
  },
  {
    id: "monolith_patch",
    name: "Monolith Patch",
    description: "Recupera 15 de vida da base.",
    rarity: "rare",
    effects: [{ kind: "base_repair_flat", amount: 15 }],
  },
  {
    id: "tactical_reroll",
    name: "Tactical Reroll",
    description: "+1 token de reroll para upgrades futuros.",
    rarity: "epic",
    effects: [{ kind: "reroll_token_flat", amount: 1 }],
  },
  {
    id: "keen_eyes",
    name: "Keen Eyes",
    description: "+8% chance de critico.",
    rarity: "rare",
    effects: [{ kind: "crit_chance_flat", amountPct: 8 }],
  },
  {
    id: "rending_focus",
    name: "Rending Focus",
    description: "+35% dano critico.",
    rarity: "rare",
    effects: [{ kind: "crit_damage_pct", amountPct: 35 }],
  },
  {
    id: "venomous_runes",
    name: "Venomous Runes",
    description: "+30% poder de veneno.",
    rarity: "rare",
    effects: [{ kind: "poison_power_pct", amountPct: 30 }],
  },
  {
    id: "storm_conductor",
    name: "Storm Conductor",
    description: "+25% dano de chain lightning.",
    rarity: "epic",
    effects: [{ kind: "chain_damage_pct", amountPct: 25 }],
  },
];

export const MAPS: MapConfig[] = [
  {
    id: "wardens-field",
    name: "Wardens Field",
    width: 1600,
    height: 900,
    heroSpawn: { x: 325, y: 425 },
    basePosition: { x: 1413, y: 425 },
    paths: [
      [
        { x: 50, y: 150 },
        { x: 400, y: 150 },
        { x: 400, y: 350 },
        { x: 950, y: 350 },
        { x: 950, y: 425 },
        { x: 1413, y: 425 },
      ],
      [
        { x: 50, y: 700 },
        { x: 525, y: 700 },
        { x: 525, y: 525 },
        { x: 1125, y: 525 },
        { x: 1125, y: 425 },
        { x: 1413, y: 425 },
      ],
    ],
    towerSlots: [
      { x: 275, y: 275 },
      { x: 275, y: 588 },
      { x: 538, y: 438 },
      { x: 775, y: 250 },
      { x: 800, y: 625 },
      { x: 1075, y: 400 },
      { x: 1225, y: 275 },
      { x: 1225, y: 625 },
    ],
  },
  {
    id: "fracture-crossroads",
    name: "Fracture Crossroads",
    width: 1600,
    height: 900,
    heroSpawn: { x: 580, y: 450 },
    basePosition: { x: 1413, y: 450 },
    paths: [
      // North route: enters top, snakes across upper half
      [
        { x: 50, y: 100 },
        { x: 320, y: 100 },
        { x: 320, y: 280 },
        { x: 720, y: 280 },
        { x: 720, y: 150 },
        { x: 1080, y: 150 },
        { x: 1080, y: 420 },
        { x: 1413, y: 420 },
      ],
      // Middle route: enters center, weaves up then down
      [
        { x: 50, y: 450 },
        { x: 240, y: 450 },
        { x: 240, y: 580 },
        { x: 580, y: 580 },
        { x: 580, y: 400 },
        { x: 880, y: 400 },
        { x: 880, y: 450 },
        { x: 1413, y: 450 },
      ],
      // South route: enters bottom, snakes across lower half
      [
        { x: 50, y: 800 },
        { x: 320, y: 800 },
        { x: 320, y: 620 },
        { x: 720, y: 620 },
        { x: 720, y: 750 },
        { x: 1080, y: 750 },
        { x: 1080, y: 480 },
        { x: 1413, y: 480 },
      ],
    ],
    towerSlots: [
      { x: 195, y: 190 },  // covers north entry and mid-west
      { x: 195, y: 710 },  // covers south entry
      { x: 450, y: 190 },  // north path early coverage
      { x: 450, y: 710 },  // south path early coverage
      { x: 640, y: 340 },  // chokepoint between north and middle paths
      { x: 640, y: 510 },  // chokepoint between middle and south paths
      { x: 900, y: 280 },  // late north coverage
      { x: 900, y: 620 },  // late south coverage
      { x: 1200, y: 330 }, // base defence top
      { x: 1200, y: 580 }, // base defence bottom
    ],
  },
];

export const DEFAULT_MAP = MAPS[0];
