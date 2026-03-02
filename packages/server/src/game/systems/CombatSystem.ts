import type { EnemyRuntime, HeroRuntime, TowerRuntime } from "../runtime.js";

const MAGE_SPLASH_RADIUS = 56;

export interface CombatResult {
  defeatedEnemyIds: Set<number>;
}

export class CombatSystem {
  update(
    deltaMs: number,
    heroes: HeroRuntime[],
    towers: TowerRuntime[],
    enemies: EnemyRuntime[],
  ): CombatResult {
    for (const hero of heroes) {
      hero.attackCooldownLeftMs = Math.max(0, hero.attackCooldownLeftMs - deltaMs);
      if (hero.attackCooldownLeftMs > 0) {
        continue;
      }

      const target = this.findNearestEnemy(hero.x, hero.y, hero.attackRange, enemies);
      if (!target) {
        continue;
      }

      this.applyDamage(target, hero.attackDamage);
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

      tower.cooldownLeftMs = tower.cooldownMs;
    }

    const defeatedEnemyIds = new Set<number>();
    for (const enemy of enemies) {
      if (enemy.hp <= 0) {
        defeatedEnemyIds.add(enemy.id);
      }
    }

    return { defeatedEnemyIds };
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

  private applyDamage(enemy: EnemyRuntime, damage: number): void {
    enemy.hp = Math.max(0, enemy.hp - damage);
  }
}
