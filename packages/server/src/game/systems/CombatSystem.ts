import type { EnemyRuntime, HeroRuntime, ProjectileTraceSeed, TowerRuntime } from "../runtime.js";

const MAGE_SPLASH_RADIUS = 56;
const ENEMY_MELEE_RANGE = 28;
const ENEMY_RANGED_RANGE = 150;
const ENEMY_BOSS_RANGE = 60;

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
  ): CombatResult {
    const projectileTraces: ProjectileTraceSeed[] = [];
    const livingHeroes = heroes.filter((hero) => hero.state === "alive" && hero.hp > 0);

    for (const hero of livingHeroes) {
      hero.attackCooldownLeftMs = Math.max(0, hero.attackCooldownLeftMs - deltaMs);
      if (hero.attackCooldownLeftMs > 0) {
        continue;
      }

      const target = this.findNearestEnemy(hero.x, hero.y, hero.attackRange, enemies);
      if (!target) {
        continue;
      }

      this.applyDamage(target, hero.attackDamage);
      projectileTraces.push({
        kind: "hero_basic",
        from: { x: hero.x, y: hero.y },
        to: { x: target.x, y: target.y },
        durationMs: 170,
        radius: 3,
        color: 0xf3d89e,
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

      if (tower.typeId === "mage") {
        for (const enemy of enemies) {
          if (enemy.hp <= 0) {
            continue;
          }

          const distance = Math.hypot(enemy.x - target.x, enemy.y - target.y);
          if (distance <= MAGE_SPLASH_RADIUS) {
            this.applyDamage(enemy, tower.damage);
          }
        }
      } else {
        this.applyDamage(target, tower.damage);
      }

      projectileTraces.push({
        kind: this.mapTowerTraceKind(tower.typeId),
        from: { x: tower.x, y: tower.y },
        to: { x: target.x, y: target.y },
        durationMs: tower.typeId === "archer" ? 220 : 200,
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

  private findNearestEnemy(
    x: number,
    y: number,
    range: number,
    enemies: EnemyRuntime[],
  ): EnemyRuntime | null {
    let best: EnemyRuntime | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of enemies) {
      if (enemy.hp <= 0) {
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
