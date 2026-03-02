import { type EnemyTypeId, type SeededRng } from "@pals-defence/shared";

import type { EnemyRuntime, HeroRuntime, ProjectileTraceSeed } from "../runtime.js";

const ELITE_EMPOWER_DURATION_MS = 1600;
const ELITE_EMPOWER_COOLDOWN_MIN_MS = 4200;
const ELITE_EMPOWER_COOLDOWN_MAX_MS = 6200;
const ELITE_SPEED_MULTIPLIER = 1.55;

const BOSS_PHASE_TWO_HP_RATIO = 0.66;
const BOSS_PHASE_THREE_HP_RATIO = 0.33;
const BOSS_PHASE_TWO_SPEED_MULTIPLIER = 1.12;
const BOSS_PHASE_THREE_SPEED_MULTIPLIER = 1.26;

const BOSS_SUMMON_COOLDOWN_PHASE_TWO_MS = 6200;
const BOSS_SUMMON_COOLDOWN_PHASE_THREE_MS = 4300;
const BOSS_SHOCKWAVE_COOLDOWN_MS = 3800;
const BOSS_SHOCKWAVE_RADIUS = 145;
const BOSS_SHOCKWAVE_DAMAGE = 22;

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
      enemy.eliteEmpoweredRemainingMs = ELITE_EMPOWER_DURATION_MS;
      enemy.eliteEmpowerCooldownMs = rng.rangeInt(
        ELITE_EMPOWER_COOLDOWN_MIN_MS,
        ELITE_EMPOWER_COOLDOWN_MAX_MS,
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
        ? Math.round(enemy.baseSpeed * ELITE_SPEED_MULTIPLIER)
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

      enemy.bossSummonCooldownMs = Math.min(enemy.bossSummonCooldownMs, 1200);
      if (enemy.bossPhase >= 3) {
        enemy.bossShockwaveCooldownMs = Math.min(enemy.bossShockwaveCooldownMs, 900);
      }
    }

    enemy.speed = Math.round(enemy.baseSpeed * this.getBossSpeedMultiplier(enemy.bossPhase));

    if (enemy.bossPhase >= 2) {
      enemy.bossSummonCooldownMs = Math.max(0, enemy.bossSummonCooldownMs - deltaMs);
      if (enemy.bossSummonCooldownMs <= 0) {
        const summonCount = enemy.bossPhase >= 3 ? 3 : 2;
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
            ? BOSS_SUMMON_COOLDOWN_PHASE_THREE_MS
            : BOSS_SUMMON_COOLDOWN_PHASE_TWO_MS;
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
          if (distance > BOSS_SHOCKWAVE_RADIUS) {
            continue;
          }

          hero.hp = Math.max(0, hero.hp - BOSS_SHOCKWAVE_DAMAGE);
        }

        projectileTraces.push({
          kind: "enemy_boss_shockwave",
          from: { x: enemy.x, y: enemy.y },
          to: { x: enemy.x, y: enemy.y },
          durationMs: 460,
          radius: 22,
          color: 0xff4e7c,
        });

        enemy.bossShockwaveCooldownMs = BOSS_SHOCKWAVE_COOLDOWN_MS;
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
