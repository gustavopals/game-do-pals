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
const publicRooms = new Map<string, GameRoom>();
const privateRooms = new Map<string, GameRoom>();
const PRIVATE_ROOM_CODE_LENGTH = 6;

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket, request) => {
  const requestUrl = request.url ?? "/";
  const parsedUrl = new URL(requestUrl, `ws://localhost:${PORT}`);
  const requestedDifficulty = parsedUrl.searchParams.get("difficulty");
  const requestedMapId = parsedUrl.searchParams.get("map") ?? "wardens-field";
  const requestedMode = parsedUrl.searchParams.get("mode");
  const requestedRoomCode = normalizeRoomCode(parsedUrl.searchParams.get("room"));
  const mode: "public" | "private_create" | "private_join" =
    requestedMode === "private_create" || requestedMode === "private_join"
      ? requestedMode
      : "public";
  const difficulty = requestedDifficulty
    ? parseDifficultyPreset(requestedDifficulty)
    : defaultDifficulty;
  const map = MAPS.find((m) => m.id === requestedMapId) ?? MAPS[0];

  if (mode === "private_join") {
    if (!requestedRoomCode) {
      socket.send(JSON.stringify({ type: "error", message: "Private room code is required." }));
      socket.close(1008, "missing_room_code");
      return;
    }

    const room = privateRooms.get(requestedRoomCode);
    if (!room) {
      socket.send(JSON.stringify({ type: "error", message: "Private room not found." }));
      socket.close(1008, "room_not_found");
      return;
    }

    room.attachConnection(socket);
    return;
  }

  if (mode === "private_create") {
    const roomCode = createPrivateRoomCode();
    const room = createRoom({
      difficulty,
      map,
      isPrivateRoom: true,
      roomCode,
      requiresHostStart: true,
      onEmpty: () => {
        privateRooms.delete(roomCode);
      },
    });

    privateRooms.set(roomCode, room);
    console.log(
      `[server] created private room code=${roomCode} difficulty=${difficulty} map=${map.id}`,
    );
    room.attachConnection(socket);
    return;
  }

  const roomKey = `${difficulty}_${map.id}`;
  let room = publicRooms.get(roomKey);
  if (!room) {
    room = createRoom({
      difficulty,
      map,
      isPrivateRoom: false,
      roomCode: null,
      requiresHostStart: false,
      onEmpty: () => {
        // public rooms stay warm by design
      },
    });
    publicRooms.set(roomKey, room);
    console.log(`[server] created public room for difficulty=${difficulty} map=${map.id}`);
  }

  room.attachConnection(socket);
});

console.log(`[server] Pals Defence listening on ws://localhost:${PORT} (default=${defaultDifficulty})`);

function createRoom(options: {
  difficulty: DifficultyPreset;
  map: (typeof MAPS)[number];
  isPrivateRoom: boolean;
  roomCode: string | null;
  requiresHostStart: boolean;
  onEmpty: () => void;
}): GameRoom {
  const { difficulty, map, isPrivateRoom, roomCode, requiresHostStart, onEmpty } = options;
  const seedOffset = difficultySeedOffset[difficulty] + (mapSeedOffset[map.id] ?? 0);
  return new GameRoom({
    seed: baseSeed + seedOffset,
    difficulty,
    map,
    isPrivateRoom,
    roomCode,
    requiresHostStart,
    progressionStore,
    telemetryStore,
    onEmpty,
  });
}

function createPrivateRoomCode(): string {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const code = randomRoomCode();
    if (!privateRooms.has(code)) {
      return code;
    }
  }

  throw new Error("Unable to allocate private room code.");
}

function randomRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < PRIVATE_ROOM_CODE_LENGTH; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function normalizeRoomCode(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const normalized = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (normalized.length < 4 || normalized.length > 12) {
    return null;
  }
  return normalized;
}
