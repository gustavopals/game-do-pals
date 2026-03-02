export type TowerTypeId = "defender" | "archer" | "mage";

export type EnemyTypeId =
  | "swarm"
  | "ranged"
  | "armored"
  | "runner"
  | "elite"
  | "boss";

export type HeroSkillId = "arcaneBolt" | "aetherPulse";
export type HeroState = "alive" | "downed" | "dead";

export interface Vec2 {
  x: number;
  y: number;
}

export interface MapConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  heroSpawn: Vec2;
  basePosition: Vec2;
  paths: Vec2[][];
  towerSlots: Vec2[];
}

export interface HeroSnapshot {
  id: string;
  name: string;
  x: number;
  y: number;
  state: HeroState;
  hp: number;
  maxHp: number;
  moveSpeed: number;
  attackDamage: number;
  attackRange: number;
  attackCooldownMs: number;
  level: number;
  xp: number;
  nextLevelXp: number;
  gold: number;
  maxTowers: number;
  skills: HeroSkillSnapshot[];
  downedRemainingMs: number;
  reviveProgressMs: number;
}

export interface TowerSnapshot {
  id: number;
  ownerId: string;
  typeId: TowerTypeId;
  x: number;
  y: number;
  level: number;
  damage: number;
  range: number;
  cooldownMs: number;
}

export interface EnemySnapshot {
  id: number;
  typeId: EnemyTypeId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  rewardGold: number;
  rewardXp: number;
  isBoss: boolean;
  poisonStacks: number;
  poisonRemainingMs: number;
  shockedRemainingMs: number;
}

export interface GameSnapshot {
  tick: number;
  timeMs: number;
  seed: number;
  map: MapConfig;
  wave: number;
  totalWaves: number;
  runStatus: "running" | "won" | "lost";
  baseHp: number;
  baseMaxHp: number;
  heroes: HeroSnapshot[];
  towers: TowerSnapshot[];
  enemies: EnemySnapshot[];
  projectileTraces: ProjectileTrace[];
}

export interface HeroSkillSnapshot {
  id: HeroSkillId;
  name: string;
  description: string;
  hotkey: "Q" | "E";
  cooldownMs: number;
  cooldownRemainingMs: number;
}

export interface ProjectileTrace {
  id: number;
  kind:
    | "hero_basic"
    | "tower_defender"
    | "tower_archer"
    | "tower_mage"
    | "skill_arcane_bolt"
    | "skill_pulse_shard"
    | "enemy_spit"
    | "enemy_boss_blast"
    | "chain_lightning";
  from: Vec2;
  to: Vec2;
  durationMs: number;
  radius: number;
  color: number;
  createdAtMs: number;
}

export interface TowerDefinition {
  id: TowerTypeId;
  name: string;
  description: string;
  cost: number;
  baseDamage: number;
  baseRange: number;
  baseCooldownMs: number;
}

export interface EnemyDefinition {
  id: EnemyTypeId;
  name: string;
  maxHp: number;
  speed: number;
  rewardGold: number;
  rewardXp: number;
  contactDamage: number;
  weight: number;
  isBoss?: boolean;
}

export type UpgradeEffect =
  | { kind: "hero_damage_flat"; amount: number }
  | { kind: "tower_damage_pct"; amountPct: number }
  | { kind: "tower_cooldown_pct"; amountPct: number }
  | { kind: "hero_move_speed_flat"; amount: number }
  | { kind: "hero_attack_range_flat"; amount: number }
  | { kind: "tower_slot_flat"; amount: number }
  | { kind: "gold_gain_pct"; amountPct: number }
  | { kind: "heal_flat"; amount: number }
  | { kind: "base_repair_flat"; amount: number }
  | { kind: "reroll_token_flat"; amount: number }
  | { kind: "crit_chance_flat"; amountPct: number }
  | { kind: "crit_damage_pct"; amountPct: number }
  | { kind: "poison_power_pct"; amountPct: number }
  | { kind: "chain_damage_pct"; amountPct: number };

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "rare" | "epic";
  effects: UpgradeEffect[];
}

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  rarity: "common" | "rare" | "epic";
}

export interface RunSummary {
  runStatus: "won" | "lost";
  reachedWave: number;
  goldEarned: number;
  durationMs: number;
}

export interface PlayerProgression {
  playerId: string;
  totalEssence: number;
  runs: number;
  wins: number;
}

export type ClientMessage =
  | {
      type: "join";
      playerId: string;
      displayName: string;
    }
  | {
      type: "input";
      dx: number;
      dy: number;
    }
  | {
      type: "placeTower";
      towerTypeId: TowerTypeId;
      slotIndex: number;
    }
  | {
      type: "chooseUpgrade";
      upgradeId: string;
    }
  | {
      type: "castSkill";
      skillId: HeroSkillId;
      targetX: number;
      targetY: number;
    };

export type ServerMessage =
  | {
      type: "welcome";
      playerId: string;
      displayName: string;
      seed: number;
      map: MapConfig;
      progression: PlayerProgression;
    }
  | {
      type: "state";
      snapshot: GameSnapshot;
    }
  | {
      type: "upgradeOptions";
      options: UpgradeOption[];
    }
  | {
      type: "runEnded";
      summary: RunSummary;
      progression: PlayerProgression;
    }
  | {
      type: "error";
      message: string;
    };
