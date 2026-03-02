import type { EnemyRuntime, HeroRuntime, ProjectileTraceSeed, TowerRuntime } from "../runtime.js";

const MAGE_SPLASH_RADIUS = 56;

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

  private applyDamage(enemy: EnemyRuntime, damage: number): void {
    enemy.hp = Math.max(0, enemy.hp - damage);
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
