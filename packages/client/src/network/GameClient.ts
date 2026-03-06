import type {
  ClientMessage,
  DifficultyPreset,
  GameSnapshot,
  HeroSkillId,
  PlayerProgression,
  RunSummary,
  ServerMessage,
  TowerTypeId,
  UpgradeOption,
} from "@pals-defence/shared";

interface ClientHandlers {
  onConnected: (playerId: string) => void;
  onState: (snapshot: GameSnapshot) => void;
  onUpgradeOptions: (options: UpgradeOption[], rerollTokens: number) => void;
  onRunEnded: (summary: RunSummary, progression: PlayerProgression) => void;
  onError: (message: string) => void;
}

const STORAGE_PLAYER_ID_KEY = "pals_defence_player_id";

interface ConnectOptions {
  difficulty: DifficultyPreset;
  mapId: string;
}

export class GameClient {
  private socket: WebSocket | null = null;
  private isManualClose = false;

  private handlers: ClientHandlers = {
    onConnected: () => {
      // no-op
    },
    onState: () => {
      // no-op
    },
    onUpgradeOptions: () => {
      // no-op
    },
    onRunEnded: () => {
      // no-op
    },
    onError: (message) => {
      console.error(message);
    },
  };

  private readonly playerId = this.getOrCreatePlayerId();
  private readonly displayName = `Warden-${this.playerId.slice(-4)}`;

  connect(options: ConnectOptions): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isManualClose = false;
    const wsUrl = this.buildWsUrl(options);
    this.socket = new WebSocket(wsUrl);

    this.socket.addEventListener("open", () => {
      this.send({
        type: "join",
        playerId: this.playerId,
        displayName: this.displayName,
      });
    });

    this.socket.addEventListener("message", (event) => {
      this.handleServerMessage(event.data);
    });

    this.socket.addEventListener("close", () => {
      this.socket = null;
      if (this.isManualClose) {
        this.isManualClose = false;
        return;
      }
      this.handlers.onError("Connection to server closed.");
    });

    this.socket.addEventListener("error", () => {
      this.handlers.onError("Failed to connect to server.");
    });
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    if (this.socket.readyState === WebSocket.CLOSING || this.socket.readyState === WebSocket.CLOSED) {
      this.socket = null;
      return;
    }

    this.isManualClose = true;
    this.socket.close(1000, "client_disconnect");
  }

  setHandlers(handlers: Partial<ClientHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  sendInput(dx: number, dy: number, revive: boolean): void {
    this.send({
      type: "input",
      dx,
      dy,
      revive,
    });
  }

  placeTower(towerTypeId: TowerTypeId, slotIndex: number): void {
    this.send({
      type: "placeTower",
      towerTypeId,
      slotIndex,
    });
  }

  chooseUpgrade(upgradeId: string): void {
    this.send({
      type: "chooseUpgrade",
      upgradeId,
    });
  }

  rerollUpgrades(): void {
    this.send({
      type: "rerollUpgrades",
    });
  }

  startNextWave(): void {
    this.send({
      type: "startNextWave",
    });
  }

  moveTower(towerId: number, slotIndex: number): void {
    this.send({
      type: "moveTower",
      towerId,
      slotIndex,
    });
  }

  castSkill(skillId: HeroSkillId, targetX: number, targetY: number): void {
    this.send({
      type: "castSkill",
      skillId,
      targetX,
      targetY,
    });
  }

  private handleServerMessage(raw: string): void {
    let parsed: ServerMessage;

    try {
      parsed = JSON.parse(raw) as ServerMessage;
    } catch {
      this.handlers.onError("Received malformed server message.");
      return;
    }

    switch (parsed.type) {
      case "welcome":
        this.handlers.onConnected(parsed.playerId);
        break;
      case "state":
        this.handlers.onState(parsed.snapshot);
        break;
      case "upgradeOptions":
        this.handlers.onUpgradeOptions(parsed.options, parsed.rerollTokens);
        break;
      case "runEnded":
        this.handlers.onRunEnded(parsed.summary, parsed.progression);
        break;
      case "error":
        this.handlers.onError(parsed.message);
        break;
      default:
        break;
    }
  }

  private send(message: ClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(message));
  }

  private buildWsUrl(options: ConnectOptions): string {
    const rawBaseUrl = import.meta.env.VITE_WS_URL ?? "ws://localhost:3000";
    const fallbackOrigin = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;
    const wsUrl = new URL(rawBaseUrl, fallbackOrigin);
    wsUrl.searchParams.set("difficulty", options.difficulty);
    wsUrl.searchParams.set("map", options.mapId);
    return wsUrl.toString();
  }

  private getOrCreatePlayerId(): string {
    const current = localStorage.getItem(STORAGE_PLAYER_ID_KEY);
    if (current && current.length > 0) {
      return current;
    }

    const generated = `player-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(STORAGE_PLAYER_ID_KEY, generated);
    return generated;
  }
}
