# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (run once from root)
npm install

# Development (run in separate terminals)
npm run dev:server          # starts server with tsx watch on ws://localhost:3000
npm run dev:client          # starts Vite dev server on http://localhost:5173

# With options
DIFFICULTY=hard npm run dev:server          # difficulty preset: easy | normal | hard
VITE_WS_URL=ws://localhost:3000 npm --workspace @pals-defence/client run dev

# Type checking
npm run typecheck            # all workspaces
npm --workspace @pals-defence/server run typecheck
npm --workspace @pals-defence/client run typecheck

# Build
npm run build                # all workspaces
```

There are no automated tests in this project.

## Architecture

This is an npm workspaces monorepo with three packages:

- `packages/shared` (`@pals-defence/shared`) — shared types, game data, constants, difficulty profiles, and a seeded RNG. This is the contract layer between server and client.
- `packages/server` (`@pals-defence/server`) — authoritative game server (Node.js + `ws`). All game logic runs here.
- `packages/client` (`@pals-defence/client`) — browser client (Phaser 3 + Vite). Renders state received from the server; no game logic of its own.

### Network protocol

The server sends `ServerMessage` and receives `ClientMessage` (both defined in `packages/shared/src/types.ts`). The key flow:

1. Client connects via WebSocket and sends `join`.
2. Server responds with `welcome` (seed, difficulty, map, progression).
3. Server sends `state` (full `GameSnapshot`) every tick (~50ms).
4. Client sends `input` (movement dx/dy, revive flag) every frame; also sends `placeTower`, `moveTower`, `castSkill`, `chooseUpgrade`, `rerollUpgrades`, `startNextWave`.
5. On run end, server sends `runEnded` with summary and updated progression.

### Server internals (`packages/server/src/`)

- `index.ts` — creates a `WebSocketServer`, routes connections to a `GameRoom` per difficulty preset.
- `game/GameRoom.ts` — owns one game loop (`setInterval` at `TICK_MS`), manages player sessions, processes `ClientMessage`s, and broadcasts `GameSnapshot` to all connected clients.
- `game/runtime.ts` — runtime-only interfaces (`HeroRuntime`, `TowerRuntime`, `EnemyRuntime`) that extend the shared snapshots with server-side state (cooldowns, accumulators, input).
- `game/ecs/EntityStore.ts` — lightweight ECS used as architectural scaffolding (not yet driving combat/wave logic).
- `game/systems/` — five pure systems called each tick by `GameRoom`:
  - `WaveSystem` — spawns enemies per wave schedule.
  - `PathSystem` — moves enemies along waypoints, applies contact damage to base.
  - `CombatSystem` — tower and hero attacks, poison/shock ticks, projectile traces, crit/chain effects.
  - `EnemyAbilitySystem` — elite burst, boss phase transitions (summon, shockwave).
  - `UpgradeSystem` — applies `UpgradeDefinition` effects to a `HeroRuntime`.
- `persistence/` — `ProgressionStore` and `TelemetryStore` read/write JSON files in `packages/server/data/`.

### Client internals (`packages/client/src/`)

- `main.ts` — bootstraps Phaser with a single scene (`GameScene`).
- `game/GameScene.ts` — the entire client: manages screen modes (`menu | difficulty | connecting | playing | runEnd`), renders all game entities from the latest `GameSnapshot`, handles keyboard/mouse input, and drives `GameClient`.
- `network/GameClient.ts` — wraps the browser `WebSocket`, serializes/deserializes messages, stores `playerId` in `localStorage`.
- `ui/UpgradeOverlay.ts` — overlay rendered during upgrade selection phase.
- `audio/SfxEngine.ts` — synthesized SFX using the Web Audio API.
- `i18n.ts` — `pt`/`en` locale strings; `tr()` for lookup, `toggleLocale()` to switch at runtime.
- `game/assets/pixelArtCatalog.ts` — pixel art textures generated at runtime (no image files for entities).
- `game/assets/mapLayerConfig.ts` — typed config for map tile layers; runtime map loaded from `public/assets/maps/wardens-field.layers.json`.

### Shared (`packages/shared/src/`)

- `types.ts` — all TypeScript interfaces and discriminated union message types.
- `data.ts` — static definitions for towers, enemies, upgrades, and the default map config.
- `constants.ts` — tick rate, hero/base stats, XP curves, costs.
- `difficulty.ts` — `DifficultyBalanceProfile` and `DIFFICULTY_BALANCE` scaling factors per preset.
- `rng.ts` — `SeededRng` class for deterministic randomness (used server-side).
