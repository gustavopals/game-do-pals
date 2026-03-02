import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

import { GameRoom } from "./game/GameRoom.js";
import { ProgressionStore } from "./persistence/ProgressionStore.js";

const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const progressionFile = path.resolve(__dirname, "../data/progression.json");

const progressionStore = new ProgressionStore(progressionFile);
const room = new GameRoom({
  seed: Number.parseInt(process.env.SEED ?? `${Date.now()}`, 10),
  progressionStore,
});

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket) => {
  room.attachConnection(socket);
});

console.log(`[server] Pals Defence listening on ws://localhost:${PORT}`);
