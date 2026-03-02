import type {
  ClientMessage,
  GameSnapshot,
  PlayerProgression,
  RunSummary,
  ServerMessage,
  TowerTypeId,
  UpgradeOption,
} from "@aetherfall/shared";

interface ClientHandlers {
  onConnected: (playerId: string) => void;
  onState: (snapshot: GameSnapshot) => void;
  onUpgradeOptions: (options: UpgradeOption[]) => void;
  onRunEnded: (summary: RunSummary, progression: PlayerProgression) => void;
  onError: (message: string) => void;
}

const STORAGE_PLAYER_ID_KEY = "aetherfall_player_id";

export class GameClient {
  private socket: WebSocket | null = null;

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

  connect(): void {
    const wsUrl = import.meta.env.VITE_WS_URL ?? "ws://localhost:3000";
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
      this.handlers.onError("Connection to server closed.");
    });

    this.socket.addEventListener("error", () => {
      this.handlers.onError("Failed to connect to server.");
    });
  }

  setHandlers(handlers: Partial<ClientHandlers>): void {
    this.handlers = { ...this.handlers, ...handlers };
  }

  sendInput(dx: number, dy: number): void {
    this.send({
      type: "input",
      dx,
      dy,
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
        this.handlers.onUpgradeOptions(parsed.options);
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
