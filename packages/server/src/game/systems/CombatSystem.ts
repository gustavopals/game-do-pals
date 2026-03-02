import { type SeededRng } from "@pals-defence/shared";

import type { EnemyRuntime, HeroRuntime, ProjectileTraceSeed, TowerRuntime } from "../runtime.js";

const MAGE_SPLASH_RADIUS = 56;
const ENEMY_MELEE_RANGE = 28;
const ENEMY_RANGED_RANGE = 150;
const ENEMY_BOSS_RANGE = 60;

const POISON_TICK_MS = 1000;
const SHOCK_DURATION_MS = 2200;
const CHAIN_RANGE = 120;
const CHAIN_BOUNCES = 2;

interface DamageRoll {
  damage: number;
  isCrit: boolean;
}

export interface CombatResult {
  defeatedEnemyIds: Set<number>;
  projectileTraces: ProjectileTraceSeed[];
}

export class CombatSystem {
  update(
    deltaMs: number,
    heroes: HeroRuntime[],
    towers: TowerRuntime[],
    enemies: EnemyRuntime[],
    rng: SeededRng,
  ): CombatResult {
    const projectileTraces: ProjectileTraceSeed[] = [];
    const livingHeroes = heroes.filter((hero) => hero.state === "alive" && hero.hp > 0);
    const heroById = new Map(heroes.map((hero) => [hero.id, hero]));

    this.updateEnemyStatuses(deltaMs, enemies);

    for (const hero of livingHeroes) {
      hero.attackCooldownLeftMs = Math.max(0, hero.attackCooldownLeftMs - deltaMs);
      if (hero.attackCooldownLeftMs > 0) {
        continue;
      }

      const target = this.findNearestEnemy(hero.x, hero.y, hero.attackRange, enemies);
      if (!target) {
        continue;
      }

      const roll = this.rollCritDamage(
        hero.attackDamage,
        hero.critChancePct,
        hero.critDamageMultiplier,
        rng,
      );
      const wasShocked = target.shockedRemainingMs > 0;

      this.applyDamage(target, roll.damage);
      this.applyChainLightning(target, roll.damage, enemies, hero.chainDamageMultiplier, projectileTraces);
      if (wasShocked) {
        this.applyChainLightning(target, roll.damage, enemies, hero.chainDamageMultiplier, projectileTraces);
      }

      projectileTraces.push({
        kind: "hero_basic",
        from: { x: hero.x, y: hero.y },
        to: { x: target.x, y: target.y },
        durationMs: 170,
        radius: roll.isCrit ? 4 : 3,
        color: roll.isCrit ? 0xffda73 : 0xf3d89e,
      });
      hero.attackCooldownLeftMs = hero.attackCooldownMs;
    }

    for (const tower of towers) {
      tower.cooldownLeftMs = Math.max(0, tower.cooldownLeftMs - deltaMs);
      if (tower.cooldownLeftMs > 0) {
        continue;
      }

      const target = this.findNearestEnemy(tower.x, tower.y, tower.range, enemies);
      if (!target) {
        continue;
      }

      const owner = heroById.get(tower.ownerId);
      const ownerChainMultiplier = owner?.chainDamageMultiplier ?? 1;

      if (tower.typeId === "mage") {
        const wasShocked = target.shockedRemainingMs > 0;

        for (const enemy of enemies) {
          if (enemy.hp <= 0) {
            continue;
          }

          const distance = Math.hypot(enemy.x - target.x, enemy.y - target.y);
          if (distance <= MAGE_SPLASH_RADIUS) {
            this.applyDamage(enemy, tower.damage);
            this.applyShock(enemy, SHOCK_DURATION_MS);
          }
        }

        this.applyChainLightning(target, tower.damage, enemies, ownerChainMultiplier, projectileTraces);
        if (wasShocked) {
          this.applyChainLightning(target, tower.damage, enemies, ownerChainMultiplier, projectileTraces);
        }
      } else if (tower.typeId === "archer") {
        const critChance = (owner?.critChancePct ?? 0) + 8;
        const critMultiplier = owner?.critDamageMultiplier ?? 1.65;
        const roll = this.rollCritDamage(tower.damage, critChance, critMultiplier, rng);
        const wasShocked = target.shockedRemainingMs > 0;

        this.applyDamage(target, roll.damage);
        this.applyChainLightning(target, roll.damage, enemies, ownerChainMultiplier, projectileTraces);
        if (wasShocked) {
          this.applyChainLightning(target, roll.damage, enemies, ownerChainMultiplier, projectileTraces);
        }

        projectileTraces.push({
          kind: this.mapTowerTraceKind(tower.typeId),
          from: { x: tower.x, y: tower.y },
          to: { x: target.x, y: target.y },
          durationMs: 220,
          radius: roll.isCrit ? 4 : 3,
          color: roll.isCrit ? 0xffda73 : this.mapTowerTraceColor(tower.typeId),
        });

        tower.cooldownLeftMs = tower.cooldownMs;
        continue;
      } else {
        const wasShocked = target.shockedRemainingMs > 0;
        this.applyDamage(target, tower.damage);
        this.applyChainLightning(target, tower.damage, enemies, ownerChainMultiplier, projectileTraces);
        if (wasShocked) {
          this.applyChainLightning(target, tower.damage, enemies, ownerChainMultiplier, projectileTraces);
        }
      }

      projectileTraces.push({
        kind: this.mapTowerTraceKind(tower.typeId),
        from: { x: tower.x, y: tower.y },
        to: { x: target.x, y: target.y },
        durationMs: 200,
        radius: tower.typeId === "defender" ? 4 : 3,
        color: this.mapTowerTraceColor(tower.typeId),
      });

      tower.cooldownLeftMs = tower.cooldownMs;
    }

    for (const enemy of enemies) {
      if (enemy.hp <= 0) {
        continue;
      }

      enemy.heroAttackCooldownLeftMs = Math.max(0, enemy.heroAttackCooldownLeftMs - deltaMs);
      if (enemy.heroAttackCooldownLeftMs > 0) {
        continue;
      }

      const targetHero = this.findNearestLivingHero(
        enemy.x,
        enemy.y,
        this.getEnemyAttackRange(enemy),
        livingHeroes,
      );
      if (!targetHero) {
        continue;
      }

      targetHero.hp = Math.max(0, targetHero.hp - this.getEnemyAttackDamage(enemy));

      if (enemy.typeId === "ranged") {
        projectileTraces.push({
          kind: "enemy_spit",
          from: { x: enemy.x, y: enemy.y },
          to: { x: targetHero.x, y: targetHero.y },
          durationMs: 260,
          radius: 3,
          color: 0xf09595,
        });
      } else if (enemy.isBoss) {
        projectileTraces.push({
          kind: "enemy_boss_blast",
          from: { x: enemy.x, y: enemy.y },
          to: { x: targetHero.x, y: targetHero.y },
          durationMs: 230,
          radius: 5,
          color: 0xf03b5f,
        });
      }

      enemy.heroAttackCooldownLeftMs = this.getEnemyAttackCooldownMs(enemy);
    }

    const defeatedEnemyIds = new Set<number>();
    for (const enemy of enemies) {
      if (enemy.hp <= 0) {
        defeatedEnemyIds.add(enemy.id);
      }
    }

    return { defeatedEnemyIds, projectileTraces };
  }

  private updateEnemyStatuses(deltaMs: number, enemies: EnemyRuntime[]): void {
    for (const enemy of enemies) {
      if (enemy.hp <= 0) {
        continue;
      }

      enemy.shockedRemainingMs = Math.max(0, enemy.shockedRemainingMs - deltaMs);

      if (enemy.poisonRemainingMs <= 0 || enemy.poisonStacks <= 0) {
        enemy.poisonRemainingMs = 0;
        enemy.poisonStacks = 0;
        enemy.poisonTickAccumulatorMs = 0;
        continue;
      }

      enemy.poisonRemainingMs = Math.max(0, enemy.poisonRemainingMs - deltaMs);
      enemy.poisonTickAccumulatorMs += deltaMs;

      while (enemy.poisonTickAccumulatorMs >= POISON_TICK_MS && enemy.hp > 0) {
        enemy.poisonTickAccumulatorMs -= POISON_TICK_MS;
        const poisonDamage = Math.max(1, Math.round(enemy.poisonStacks * 2));
        this.applyDamage(enemy, poisonDamage);
      }

      if (enemy.poisonRemainingMs <= 0) {
        enemy.poisonStacks = 0;
        enemy.poisonTickAccumulatorMs = 0;
      }
    }
  }

  private applyChainLightning(
    source: EnemyRuntime,
    baseDamage: number,
    enemies: EnemyRuntime[],
    damageMultiplier: number,
    projectileTraces: ProjectileTraceSeed[],
  ): void {
    if (source.hp <= 0 || source.shockedRemainingMs <= 0) {
      return;
    }

    const damaged = new Set<number>([source.id]);
    let from = source;
    let chainDamage = Math.max(1, Math.round(baseDamage * 0.45 * damageMultiplier));

    for (let bounce = 0; bounce < CHAIN_BOUNCES; bounce += 1) {
      const next = this.findNearestEnemy(from.x, from.y, CHAIN_RANGE, enemies, damaged);
      if (!next) {
        break;
      }

      this.applyDamage(next, chainDamage);
      damaged.add(next.id);

      projectileTraces.push({
        kind: "chain_lightning",
        from: { x: from.x, y: from.y },
        to: { x: next.x, y: next.y },
        durationMs: 150,
        radius: 2,
        color: 0x83ecff,
      });

      from = next;
      chainDamage = Math.max(1, Math.round(chainDamage * 0.72));
    }
  }

  private findNearestEnemy(
    x: number,
    y: number,
    range: number,
    enemies: EnemyRuntime[],
    ignoredIds: Set<number> = new Set<number>(),
  ): EnemyRuntime | null {
    let best: EnemyRuntime | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of enemies) {
      if (enemy.hp <= 0 || ignoredIds.has(enemy.id)) {
        continue;
      }

      const distance = Math.hypot(enemy.x - x, enemy.y - y);
      if (distance > range) {
        continue;
      }

      if (distance < bestDistance) {
        bestDistance = distance;
        best = enemy;
      }
    }

    return best;
  }

  private findNearestLivingHero(
    x: number,
    y: number,
    range: number,
    heroes: HeroRuntime[],
  ): HeroRuntime | null {
    let best: HeroRuntime | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const hero of heroes) {
      if (hero.hp <= 0) {
        continue;
      }

      const distance = Math.hypot(hero.x - x, hero.y - y);
      if (distance > range) {
        continue;
      }

      if (distance < bestDistance) {
        bestDistance = distance;
        best = hero;
      }
    }

    return best;
  }

  private applyDamage(enemy: EnemyRuntime, damage: number): void {
    enemy.hp = Math.max(0, enemy.hp - damage);
  }

  private applyShock(enemy: EnemyRuntime, durationMs: number): void {
    enemy.shockedRemainingMs = Math.max(enemy.shockedRemainingMs, durationMs);
  }

  private rollCritDamage(
    baseDamage: number,
    critChancePct: number,
    critDamageMultiplier: number,
    rng: SeededRng,
  ): DamageRoll {
    const safeChance = Math.min(95, Math.max(0, critChancePct));
    const isCrit = rng.next() * 100 < safeChance;
    if (!isCrit) {
      return { damage: Math.max(1, Math.round(baseDamage)), isCrit: false };
    }

    return {
      damage: Math.max(1, Math.round(baseDamage * Math.max(1.25, critDamageMultiplier))),
      isCrit: true,
    };
  }

  private getEnemyAttackRange(enemy: EnemyRuntime): number {
    if (enemy.isBoss) {
      return ENEMY_BOSS_RANGE;
    }

    if (enemy.typeId === "ranged") {
      return ENEMY_RANGED_RANGE;
    }

    return ENEMY_MELEE_RANGE;
  }

  private getEnemyAttackDamage(enemy: EnemyRuntime): number {
    if (enemy.isBoss) {
      return 18;
    }

    switch (enemy.typeId) {
      case "ranged":
        return 4;
      case "armored":
        return 6;
      case "elite":
        return 8;
      case "runner":
        return 3;
      case "swarm":
      default:
        return 3;
    }
  }

  private getEnemyAttackCooldownMs(enemy: EnemyRuntime): number {
    if (enemy.isBoss) {
      return 1200;
    }

    if (enemy.typeId === "ranged") {
      return 1100;
    }

    return 900;
  }

  private mapTowerTraceKind(towerType: TowerRuntime["typeId"]): ProjectileTraceSeed["kind"] {
    switch (towerType) {
      case "defender":
        return "tower_defender";
      case "archer":
        return "tower_archer";
      case "mage":
      default:
        return "tower_mage";
    }
  }

  private mapTowerTraceColor(towerType: TowerRuntime["typeId"]): number {
    switch (towerType) {
      case "defender":
        return 0x8aa86b;
      case "archer":
        return 0xbee96f;
      case "mage":
      default:
        return 0x6fdcf2;
    }
  }
}
