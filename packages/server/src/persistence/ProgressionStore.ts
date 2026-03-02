import fs from "node:fs";
import path from "node:path";

import type { PlayerProgression, RunSummary } from "@pals-defence/shared";

interface ProgressionState {
  players: Record<string, PlayerProgression>;
}

const DEFAULT_STATE: ProgressionState = {
  players: {},
};

export class ProgressionStore {
  private state: ProgressionState = DEFAULT_STATE;

  constructor(private readonly filePath: string) {
    this.load();
  }

  get(playerId: string): PlayerProgression {
    const current = this.state.players[playerId] ?? {
      playerId,
      totalEssence: 0,
      runs: 0,
      wins: 0,
    };

    return { ...current };
  }

  applyRun(playerId: string, summary: RunSummary): PlayerProgression {
    const previous = this.get(playerId);

    const next: PlayerProgression = {
      playerId,
      totalEssence:
        previous.totalEssence + summary.goldEarned + (summary.runStatus === "won" ? 50 : 20),
      runs: previous.runs + 1,
      wins: previous.wins + (summary.runStatus === "won" ? 1 : 0),
    };

    this.state.players[playerId] = next;
    this.persist();

    return { ...next };
  }

  private load(): void {
    if (!fs.existsSync(this.filePath)) {
      this.state = { ...DEFAULT_STATE, players: {} };
      return;
    }

    try {
      const raw = fs.readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as ProgressionState;

      this.state = {
        players: parsed.players ?? {},
      };
    } catch {
      this.state = { ...DEFAULT_STATE, players: {} };
    }
  }

  private persist(): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), "utf-8");
  }
}
