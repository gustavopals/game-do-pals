import { MAX_WAVES, type EnemyTypeId, SeededRng } from "@pals-defence/shared";

export interface SpawnInstruction {
  typeId: EnemyTypeId;
  pathId: number;
}

interface WaveSpec {
  count: number;
  intervalMs: number;
  pool: EnemyTypeId[];
}

export class WaveSystem {
  private wave = 1;
  private remainingSpawns = 0;
  private spawnIntervalMs = 900;
  private spawnCountdownMs = 0;
  private intermissionMs = 0;
  private currentPool: EnemyTypeId[] = [];
  private completed = false;

  constructor(private readonly totalWaves = MAX_WAVES) {
    this.startWave(1);
  }

  get currentWave(): number {
    return this.wave;
  }

  get done(): boolean {
    return this.completed;
  }

  reset(): void {
    this.wave = 1;
    this.remainingSpawns = 0;
    this.spawnIntervalMs = 900;
    this.spawnCountdownMs = 0;
    this.intermissionMs = 0;
    this.currentPool = [];
    this.completed = false;
    this.startWave(1);
  }

  update(
    deltaMs: number,
    activeEnemies: number,
    pathCount: number,
    rng: SeededRng,
  ): SpawnInstruction[] {
    if (this.completed) {
      return [];
    }

    if (this.intermissionMs > 0) {
      this.intermissionMs -= deltaMs;
      if (this.intermissionMs <= 0) {
        this.startWave(this.wave + 1);
      }
      return [];
    }

    const spawns: SpawnInstruction[] = [];

    if (this.remainingSpawns > 0) {
      this.spawnCountdownMs -= deltaMs;

      while (this.remainingSpawns > 0 && this.spawnCountdownMs <= 0) {
        const pathId = Math.max(0, rng.rangeInt(0, pathCount - 1));
        const typeId = rng.pickOne(this.currentPool);

        spawns.push({ typeId, pathId });
        this.remainingSpawns -= 1;
        this.spawnCountdownMs += this.spawnIntervalMs;
      }

      return spawns;
    }

    if (activeEnemies === 0) {
      if (this.wave >= this.totalWaves) {
        this.completed = true;
      } else {
        this.intermissionMs = 3500;
      }
    }

    return spawns;
  }

  private startWave(wave: number): void {
    this.wave = Math.min(wave, this.totalWaves);
    const spec = this.getWaveSpec(this.wave);

    this.remainingSpawns = spec.count;
    this.spawnIntervalMs = spec.intervalMs;
    this.spawnCountdownMs = 400;
    this.currentPool = spec.pool;
  }

  private getWaveSpec(wave: number): WaveSpec {
    switch (wave) {
      case 1:
        return {
          count: 12,
          intervalMs: 900,
          pool: ["swarm", "swarm", "swarm", "ranged", "runner"],
        };
      case 2:
        return {
          count: 16,
          intervalMs: 840,
          pool: ["swarm", "ranged", "runner", "armored"],
        };
      case 3:
        return {
          count: 20,
          intervalMs: 790,
          pool: ["swarm", "ranged", "runner", "armored", "elite"],
        };
      case 4:
        return {
          count: 24,
          intervalMs: 760,
          pool: ["swarm", "ranged", "runner", "armored", "elite", "elite"],
        };
      case 5:
        return {
          count: 28,
          intervalMs: 730,
          pool: ["swarm", "ranged", "runner", "armored", "elite", "elite"],
        };
      case 6:
      default:
        return {
          count: 1,
          intervalMs: 1200,
          pool: ["boss"],
        };
    }
  }
}
