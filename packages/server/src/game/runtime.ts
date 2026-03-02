import type {
  EnemySnapshot,
  HeroSnapshot,
  TowerSnapshot,
  UpgradeOption,
} from "@aetherfall/shared";

export interface HeroRuntime extends HeroSnapshot {
  inputDx: number;
  inputDy: number;
  attackCooldownLeftMs: number;
  towerDamageMultiplier: number;
  towerCooldownMultiplier: number;
  goldGainMultiplier: number;
  rerollTokens: number;
  pendingUpgradeOptions: UpgradeOption[] | null;
  ownedUpgradeIds: Set<string>;
  totalGoldEarned: number;
}

export interface TowerRuntime extends TowerSnapshot {
  slotIndex: number;
  cooldownLeftMs: number;
}

export interface EnemyRuntime extends EnemySnapshot {
  pathId: number;
  waypointIndex: number;
}
