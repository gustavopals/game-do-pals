import type { MapConfig } from "@pals-defence/shared";

import type { EnemyRuntime } from "../runtime.js";

export interface PathUpdateResult {
  reachedBaseIds: number[];
}

export class PathSystem {
  update(deltaMs: number, map: MapConfig, enemies: EnemyRuntime[]): PathUpdateResult {
    const reachedBaseIds: number[] = [];
    const dt = deltaMs / 1000;

    for (const enemy of enemies) {
      const path = map.paths[enemy.pathId];
      if (!path || path.length < 2) {
        continue;
      }

      let remainingMovement = enemy.speed * dt;

      while (remainingMovement > 0) {
        const nextIndex = enemy.waypointIndex + 1;
        const target = path[nextIndex];

        if (!target) {
          reachedBaseIds.push(enemy.id);
          break;
        }

        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 0.0001) {
          enemy.waypointIndex = nextIndex;
          continue;
        }

        if (remainingMovement >= distance) {
          enemy.x = target.x;
          enemy.y = target.y;
          enemy.waypointIndex = nextIndex;
          remainingMovement -= distance;

          if (enemy.waypointIndex >= path.length - 1) {
            reachedBaseIds.push(enemy.id);
            break;
          }
        } else {
          const nx = dx / distance;
          const ny = dy / distance;

          enemy.x += nx * remainingMovement;
          enemy.y += ny * remainingMovement;
          remainingMovement = 0;
        }
      }
    }

    return { reachedBaseIds };
  }
}
