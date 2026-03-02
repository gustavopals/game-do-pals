import type {
  EnemySnapshot,
  HeroSnapshot,
  HeroSkillId,
  ProjectileTrace,
  TowerSnapshot,
  UpgradeOption,
} from "@pals-defence/shared";

export interface HeroRuntime extends HeroSnapshot {
  inputDx: number;
  inputDy: number;
  reviveInput: boolean;
  attackCooldownLeftMs: number;
  towerDamageMultiplier: number;
  towerCooldownMultiplier: number;
  goldGainMultiplier: number;
  rerollTokens: number;
  pendingUpgradeOptions: UpgradeOption[] | null;
  ownedUpgradeIds: Set<string>;
  totalGoldEarned: number;
  skillCooldownsMs: Record<HeroSkillId, number>;
  critChancePct: number;
  critDamageMultiplier: number;
  poisonPowerMultiplier: number;
  chainDamageMultiplier: number;
}

export interface TowerRuntime extends TowerSnapshot {
  slotIndex: number;
  cooldownLeftMs: number;
}

export interface EnemyRuntime extends EnemySnapshot {
  pathId: number;
  waypointIndex: number;
  heroAttackCooldownLeftMs: number;
  poisonTickAccumulatorMs: number;
  baseSpeed: number;
  eliteEmpowerCooldownMs: number;
  bossSummonCooldownMs: number;
  bossShockwaveCooldownMs: number;
}

export type ProjectileTraceSeed = Omit<ProjectileTrace, "id" | "createdAtMs">;
