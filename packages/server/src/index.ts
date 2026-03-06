import { MAPS, parseDifficultyPreset, type DifficultyPreset } from "@pals-defence/shared";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";

import { GameRoom } from "./game/GameRoom.js";
import { ProgressionStore } from "./persistence/ProgressionStore.js";
import { TelemetryStore } from "./persistence/TelemetryStore.js";

const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const defaultDifficulty = parseDifficultyPreset(process.env.DIFFICULTY);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const progressionFile = path.resolve(__dirname, "../data/progression.json");
const telemetryFile = path.resolve(__dirname, "../data/telemetry.json");

const progressionStore = new ProgressionStore(progressionFile);
const telemetryStore = new TelemetryStore(telemetryFile);
const baseSeed = Number.parseInt(process.env.SEED ?? `${Date.now()}`, 10);
const difficultySeedOffset: Record<DifficultyPreset, number> = {
  easy: 0,
  normal: 10_000,
  hard: 20_000,
};
const mapSeedOffset: Record<string, number> = {
  "wardens-field": 0,
  "fracture-crossroads": 50_000,
};
const rooms = new Map<string, GameRoom>();

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket, request) => {
  const requestUrl = request.url ?? "/";
  const parsedUrl = new URL(requestUrl, `ws://localhost:${PORT}`);
  const requestedDifficulty = parsedUrl.searchParams.get("difficulty");
  const requestedMapId = parsedUrl.searchParams.get("map") ?? "wardens-field";
  const difficulty = requestedDifficulty
    ? parseDifficultyPreset(requestedDifficulty)
    : defaultDifficulty;
  const map = MAPS.find((m) => m.id === requestedMapId) ?? MAPS[0];
  const roomKey = `${difficulty}_${map.id}`;

  let room = rooms.get(roomKey);
  if (!room) {
    const seedOffset = difficultySeedOffset[difficulty] + (mapSeedOffset[map.id] ?? 0);
    room = new GameRoom({
      seed: baseSeed + seedOffset,
      difficulty,
      map,
      progressionStore,
      telemetryStore,
    });
    rooms.set(roomKey, room);
    console.log(`[server] created room for difficulty=${difficulty} map=${map.id}`);
  }

  room.attachConnection(socket);
});

console.log(`[server] Pals Defence listening on ws://localhost:${PORT} (default=${defaultDifficulty})`);
