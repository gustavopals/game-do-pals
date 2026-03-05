import fs from "node:fs";
import path from "node:path";

import type { DifficultyPreset, RunSummary } from "@pals-defence/shared";

interface TelemetryBucket {
  runs: number;
  wins: number;
  losses: number;
  bestWave: number;
  totalReachedWave: number;
  totalDurationMs: number;
  totalGoldEarned: number;
}

interface RunTelemetryEntry {
  recordedAtIso: string;
  difficulty: DifficultyPreset;
  runStatus: RunSummary["runStatus"];
  reachedWave: number;
  durationMs: number;
  partySize: number;
  totalGoldEarned: number;
  avgGoldPerPlayer: number;
  maxGoldPerPlayer: number;
  minGoldPerPlayer: number;
}

interface TelemetryState {
  version: 1;
  totals: TelemetryBucket;
  byDifficulty: Record<DifficultyPreset, TelemetryBucket>;
  byPartySize: Record<string, TelemetryBucket>;
  recentRuns: RunTelemetryEntry[];
}

interface RecordRunInput {
  difficulty: DifficultyPreset;
  partySize: number;
  summaries: RunSummary[];
}

const MAX_RECENT_RUNS = 120;

export class TelemetryStore {
  private state: TelemetryState = createDefaultState();

  constructor(private readonly filePath: string) {
    this.load();
  }

  recordRun(input: RecordRunInput): void {
    if (input.summaries.length === 0) {
      return;
    }

    const runStatus = input.summaries[0].runStatus;
    const reachedWave = Math.max(...input.summaries.map((summary) => summary.reachedWave));
    const durationMs = Math.max(...input.summaries.map((summary) => summary.durationMs));
    const totalGoldEarned = input.summaries.reduce((sum, summary) => sum + summary.goldEarned, 0);
    const maxGoldPerPlayer = Math.max(...input.summaries.map((summary) => summary.goldEarned));
    const minGoldPerPlayer = Math.min(...input.summaries.map((summary) => summary.goldEarned));
    const partySize = Math.max(1, input.partySize);
    const partySizeKey = `${Math.min(4, partySize)}`;

    const sharedMetric = {
      runStatus,
      reachedWave,
      durationMs,
      totalGoldEarned,
    };

    this.updateBucket(this.state.totals, sharedMetric);
    this.updateBucket(this.state.byDifficulty[input.difficulty], sharedMetric);
    this.updateBucket(this.ensurePartySizeBucket(partySizeKey), sharedMetric);

    const entry: RunTelemetryEntry = {
      recordedAtIso: new Date().toISOString(),
      difficulty: input.difficulty,
      runStatus,
      reachedWave,
      durationMs,
      partySize,
      totalGoldEarned,
      avgGoldPerPlayer: Math.round(totalGoldEarned / partySize),
      maxGoldPerPlayer,
      minGoldPerPlayer,
    };
    this.state.recentRuns.push(entry);
    if (this.state.recentRuns.length > MAX_RECENT_RUNS) {
      this.state.recentRuns.splice(0, this.state.recentRuns.length - MAX_RECENT_RUNS);
    }

    this.persist();
  }

  private ensurePartySizeBucket(partySizeKey: string): TelemetryBucket {
    if (!this.state.byPartySize[partySizeKey]) {
      this.state.byPartySize[partySizeKey] = createEmptyBucket();
    }
    return this.state.byPartySize[partySizeKey];
  }

  private updateBucket(
    bucket: TelemetryBucket,
    metric: {
      runStatus: RunSummary["runStatus"];
      reachedWave: number;
      durationMs: number;
      totalGoldEarned: number;
    },
  ): void {
    bucket.runs += 1;
    bucket.wins += metric.runStatus === "won" ? 1 : 0;
    bucket.losses += metric.runStatus === "lost" ? 1 : 0;
    bucket.bestWave = Math.max(bucket.bestWave, metric.reachedWave);
    bucket.totalReachedWave += metric.reachedWave;
    bucket.totalDurationMs += metric.durationMs;
    bucket.totalGoldEarned += metric.totalGoldEarned;
  }

  private load(): void {
    if (!fs.existsSync(this.filePath)) {
      this.state = createDefaultState();
      return;
    }

    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<TelemetryState>;

      this.state = {
        version: 1,
        totals: parsed.totals ? sanitizeBucket(parsed.totals) : createEmptyBucket(),
        byDifficulty: {
          easy: parsed.byDifficulty?.easy
            ? sanitizeBucket(parsed.byDifficulty.easy)
            : createEmptyBucket(),
          normal: parsed.byDifficulty?.normal
            ? sanitizeBucket(parsed.byDifficulty.normal)
            : createEmptyBucket(),
          hard: parsed.byDifficulty?.hard
            ? sanitizeBucket(parsed.byDifficulty.hard)
            : createEmptyBucket(),
        },
        byPartySize: parsed.byPartySize ? sanitizePartySizeBuckets(parsed.byPartySize) : {},
        recentRuns: Array.isArray(parsed.recentRuns)
          ? parsed.recentRuns.slice(-MAX_RECENT_RUNS).map(sanitizeRunEntry)
          : [],
      };
    } catch {
      this.state = createDefaultState();
    }
  }

  private persist(): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), "utf-8");
  }
}

function createDefaultState(): TelemetryState {
  return {
    version: 1,
    totals: createEmptyBucket(),
    byDifficulty: {
      easy: createEmptyBucket(),
      normal: createEmptyBucket(),
      hard: createEmptyBucket(),
    },
    byPartySize: {},
    recentRuns: [],
  };
}

function createEmptyBucket(): TelemetryBucket {
  return {
    runs: 0,
    wins: 0,
    losses: 0,
    bestWave: 0,
    totalReachedWave: 0,
    totalDurationMs: 0,
    totalGoldEarned: 0,
  };
}

function sanitizeBucket(candidate: Partial<TelemetryBucket>): TelemetryBucket {
  return {
    runs: Math.max(0, Number(candidate.runs) || 0),
    wins: Math.max(0, Number(candidate.wins) || 0),
    losses: Math.max(0, Number(candidate.losses) || 0),
    bestWave: Math.max(0, Number(candidate.bestWave) || 0),
    totalReachedWave: Math.max(0, Number(candidate.totalReachedWave) || 0),
    totalDurationMs: Math.max(0, Number(candidate.totalDurationMs) || 0),
    totalGoldEarned: Math.max(0, Number(candidate.totalGoldEarned) || 0),
  };
}

function sanitizePartySizeBuckets(
  candidate: Record<string, Partial<TelemetryBucket>>,
): Record<string, TelemetryBucket> {
  const result: Record<string, TelemetryBucket> = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (!/^\d+$/.test(key)) {
      continue;
    }
    result[key] = sanitizeBucket(value);
  }
  return result;
}

function sanitizeRunEntry(candidate: Partial<RunTelemetryEntry>): RunTelemetryEntry {
  const runStatus = candidate.runStatus === "won" ? "won" : "lost";

  return {
    recordedAtIso:
      typeof candidate.recordedAtIso === "string" && candidate.recordedAtIso.length > 0
        ? candidate.recordedAtIso
        : new Date(0).toISOString(),
    difficulty:
      candidate.difficulty === "easy" || candidate.difficulty === "normal" || candidate.difficulty === "hard"
        ? candidate.difficulty
        : "normal",
    runStatus,
    reachedWave: Math.max(0, Number(candidate.reachedWave) || 0),
    durationMs: Math.max(0, Number(candidate.durationMs) || 0),
    partySize: Math.max(1, Number(candidate.partySize) || 1),
    totalGoldEarned: Math.max(0, Number(candidate.totalGoldEarned) || 0),
    avgGoldPerPlayer: Math.max(0, Number(candidate.avgGoldPerPlayer) || 0),
    maxGoldPerPlayer: Math.max(0, Number(candidate.maxGoldPerPlayer) || 0),
    minGoldPerPlayer: Math.max(0, Number(candidate.minGoldPerPlayer) || 0),
  };
}
