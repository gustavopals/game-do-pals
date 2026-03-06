export const TICK_RATE = 20;
export const TICK_MS = 1000 / TICK_RATE;

export const HERO_BASE_MAX_HP = 120;
export const HERO_BASE_MOVE_SPEED = 180;
export const HERO_BASE_ATTACK_DAMAGE = 7;
export const HERO_BASE_ATTACK_RANGE = 110;
export const HERO_BASE_ATTACK_COOLDOWN_MS = 800;

export const BASE_MAX_HP = 100;
export const MAX_WAVES = 6;

export const INITIAL_TOWER_CAP = 3;
export const UPGRADE_CHOICES = 3;
export const TOWER_RELOCATE_COST = 12;
export const TOWER_MAX_LEVEL = 5;
export const TOWER_LEVEL_DAMAGE_STEP_PCT = 20;
export const TOWER_LEVEL_RANGE_STEP = 16;
export const TOWER_UPGRADE_BASE_COST = 20;
export const TOWER_UPGRADE_COST_GROWTH = 1.65;

export const XP_PER_LEVEL_BASE = 35;
export const XP_PER_LEVEL_GROWTH = 1.2;

export function getTowerUpgradeCost(currentLevel: number): number {
  const normalizedLevel = Math.max(1, Math.floor(currentLevel));
  return Math.max(
    1,
    Math.round(TOWER_UPGRADE_BASE_COST * Math.pow(TOWER_UPGRADE_COST_GROWTH, normalizedLevel - 1)),
  );
}
