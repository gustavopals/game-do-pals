import {
  type DifficultyBalanceProfile,
  type EnemyTypeId,
  type SeededRng,
} from "@pals-defence/shared";

import type { EnemyRuntime, HeroRuntime, ProjectileTraceSeed } from "../runtime.js";

const BOSS_PHASE_TWO_HP_RATIO = 0.66;
const BOSS_PHASE_THREE_HP_RATIO = 0.33;
const BOSS_PHASE_TWO_SPEED_MULTIPLIER = 1.12;
const BOSS_PHASE_THREE_SPEED_MULTIPLIER = 1.26;

type SummonEnemyTypeId = Exclude<EnemyTypeId, "boss">;

export interface EnemySpawnRequest {
  typeId: SummonEnemyTypeId;
  pathId: number;
}

export interface EnemyAbilityResult {
  spawnRequests: EnemySpawnRequest[];
  projectileTraces: ProjectileTraceSeed[];
}

export class EnemyAbilitySystem {
  constructor(private readonly balance: DifficultyBalanceProfile) {}

  update(
    deltaMs: number,
    heroes: HeroRuntime[],
    enemies: EnemyRuntime[],
    pathCount: number,
    rng: SeededRng,
  ): EnemyAbilityResult {
    const spawnRequests: EnemySpawnRequest[] = [];
    const projectileTraces: ProjectileTraceSeed[] = [];

    for (const enemy of enemies) {
      if (enemy.hp <= 0) {
        continue;
      }

      if (enemy.typeId === "elite") {
        this.updateElite(deltaMs, enemy, projectileTraces, rng);
      }

      if (enemy.isBoss) {
        this.updateBoss(deltaMs, enemy, heroes, pathCount, projectileTraces, spawnRequests, rng);
      }
    }

    return { spawnRequests, projectileTraces };
  }

  private updateElite(
    deltaMs: number,
    enemy: EnemyRuntime,
    projectileTraces: ProjectileTraceSeed[],
    rng: SeededRng,
  ): void {
    enemy.eliteEmpoweredRemainingMs = Math.max(0, enemy.eliteEmpoweredRemainingMs - deltaMs);
    enemy.eliteEmpowerCooldownMs = Math.max(0, enemy.eliteEmpowerCooldownMs - deltaMs);

    if (enemy.eliteEmpoweredRemainingMs <= 0 && enemy.eliteEmpowerCooldownMs <= 0) {
      enemy.eliteEmpoweredRemainingMs = this.balance.eliteEmpowerDurationMs;
      enemy.eliteEmpowerCooldownMs = rng.rangeInt(
        this.balance.eliteEmpowerCooldownMinMs,
        this.balance.eliteEmpowerCooldownMaxMs,
      );

      projectileTraces.push({
        kind: "enemy_elite_burst",
        from: { x: enemy.x, y: enemy.y },
        to: { x: enemy.x, y: enemy.y },
        durationMs: 320,
        radius: 13,
        color: 0xff9349,
      });
    }

    enemy.speed =
      enemy.eliteEmpoweredRemainingMs > 0
        ? Math.round(enemy.baseSpeed * this.balance.eliteEmpowerSpeedMultiplier)
        : enemy.baseSpeed;
  }

  private updateBoss(
    deltaMs: number,
    enemy: EnemyRuntime,
    heroes: HeroRuntime[],
    pathCount: number,
    projectileTraces: ProjectileTraceSeed[],
    spawnRequests: EnemySpawnRequest[],
    rng: SeededRng,
  ): void {
    const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
    const nextPhase = this.resolveBossPhase(hpRatio);

    if (nextPhase > enemy.bossPhase) {
      enemy.bossPhase = nextPhase;
      projectileTraces.push({
        kind: "enemy_boss_shockwave",
        from: { x: enemy.x, y: enemy.y },
        to: { x: enemy.x, y: enemy.y },
        durationMs: 360,
        radius: 18,
        color: 0xffc173,
      });

      enemy.bossSummonCooldownMs = Math.min(
        enemy.bossSummonCooldownMs,
        Math.round(this.balance.bossSummonCooldownPhase2Ms * 0.2),
      );
      if (enemy.bossPhase >= 3) {
        enemy.bossShockwaveCooldownMs = Math.min(
          enemy.bossShockwaveCooldownMs,
          Math.round(this.balance.bossShockwaveCooldownMs * 0.24),
        );
      }
    }

    enemy.speed = Math.round(enemy.baseSpeed * this.getBossSpeedMultiplier(enemy.bossPhase));

    if (enemy.bossPhase >= 2) {
      enemy.bossSummonCooldownMs = Math.max(0, enemy.bossSummonCooldownMs - deltaMs);
      if (enemy.bossSummonCooldownMs <= 0) {
        const summonCount =
          enemy.bossPhase >= 3
            ? this.balance.bossSummonCountPhase3
            : this.balance.bossSummonCountPhase2;
        const safePathCount = Math.max(1, pathCount);

        for (let index = 0; index < summonCount; index += 1) {
          spawnRequests.push({
            typeId: this.rollBossSummon(enemy.bossPhase, rng),
            pathId: rng.rangeInt(0, safePathCount - 1),
          });
        }

        projectileTraces.push({
          kind: "enemy_boss_summon",
          from: { x: enemy.x, y: enemy.y },
          to: { x: enemy.x, y: enemy.y },
          durationMs: 420,
          radius: enemy.bossPhase >= 3 ? 20 : 16,
          color: 0xff6d8f,
        });

        enemy.bossSummonCooldownMs =
          enemy.bossPhase >= 3
            ? this.balance.bossSummonCooldownPhase3Ms
            : this.balance.bossSummonCooldownPhase2Ms;
      }
    }

    if (enemy.bossPhase >= 3) {
      enemy.bossShockwaveCooldownMs = Math.max(0, enemy.bossShockwaveCooldownMs - deltaMs);

      if (enemy.bossShockwaveCooldownMs <= 0) {
        for (const hero of heroes) {
          if (hero.state !== "alive" || hero.hp <= 0) {
            continue;
          }

          const distance = Math.hypot(hero.x - enemy.x, hero.y - enemy.y);
          if (distance > this.balance.bossShockwaveRadius) {
            continue;
          }

          hero.hp = Math.max(0, hero.hp - this.balance.bossShockwaveDamage);
        }

        projectileTraces.push({
          kind: "enemy_boss_shockwave",
          from: { x: enemy.x, y: enemy.y },
          to: { x: enemy.x, y: enemy.y },
          durationMs: 460,
          radius: 22,
          color: 0xff4e7c,
        });

        enemy.bossShockwaveCooldownMs = this.balance.bossShockwaveCooldownMs;
      }
    }
  }

  private resolveBossPhase(hpRatio: number): number {
    if (hpRatio <= BOSS_PHASE_THREE_HP_RATIO) {
      return 3;
    }
    if (hpRatio <= BOSS_PHASE_TWO_HP_RATIO) {
      return 2;
    }
    return 1;
  }

  private getBossSpeedMultiplier(phase: number): number {
    if (phase >= 3) {
      return BOSS_PHASE_THREE_SPEED_MULTIPLIER;
    }
    if (phase >= 2) {
      return BOSS_PHASE_TWO_SPEED_MULTIPLIER;
    }
    return 1;
  }

  private rollBossSummon(phase: number, rng: SeededRng): SummonEnemyTypeId {
    const phaseTwoPool: SummonEnemyTypeId[] = ["swarm", "runner", "ranged"];
    const phaseThreePool: SummonEnemyTypeId[] = ["runner", "ranged", "armored", "elite"];
    return rng.pickOne(phase >= 3 ? phaseThreePool : phaseTwoPool);
  }
}
