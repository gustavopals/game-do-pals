import { parseDifficultyPreset, type DifficultyPreset } from "@pals-defence/shared";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

import { GameRoom } from "./game/GameRoom.js";
import { ProgressionStore } from "./persistence/ProgressionStore.js";

const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const defaultDifficulty = parseDifficultyPreset(process.env.DIFFICULTY);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const progressionFile = path.resolve(__dirname, "../data/progression.json");

const progressionStore = new ProgressionStore(progressionFile);
const baseSeed = Number.parseInt(process.env.SEED ?? `${Date.now()}`, 10);
const difficultySeedOffset: Record<DifficultyPreset, number> = {
  easy: 0,
  normal: 10_000,
  hard: 20_000,
};
const roomsByDifficulty = new Map<DifficultyPreset, GameRoom>();

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket, request) => {
  const requestUrl = request.url ?? "/";
  const parsedUrl = new URL(requestUrl, `ws://localhost:${PORT}`);
  const requestedDifficulty = parsedUrl.searchParams.get("difficulty");
  const difficulty = requestedDifficulty
    ? parseDifficultyPreset(requestedDifficulty)
    : defaultDifficulty;

  let room = roomsByDifficulty.get(difficulty);
  if (!room) {
    room = new GameRoom({
      seed: baseSeed + difficultySeedOffset[difficulty],
      difficulty,
      progressionStore,
    });
    roomsByDifficulty.set(difficulty, room);
    console.log(`[server] created room for difficulty=${difficulty}`);
  }

  room.attachConnection(socket);
});

console.log(`[server] Pals Defence listening on ws://localhost:${PORT} (default=${defaultDifficulty})`);
