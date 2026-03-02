import {
  BASE_MAX_HP,
  DEFAULT_MAP,
  DIFFICULTY_BALANCE,
  ENEMY_DEFINITIONS,
  HERO_BASE_ATTACK_COOLDOWN_MS,
  HERO_BASE_ATTACK_DAMAGE,
  HERO_BASE_ATTACK_RANGE,
  HERO_BASE_MAX_HP,
  HERO_BASE_MOVE_SPEED,
  INITIAL_TOWER_CAP,
  MAX_WAVES,
  TICK_MS,
  TOWER_RELOCATE_COST,
  TOWER_DEFINITIONS,
  XP_PER_LEVEL_BASE,
  XP_PER_LEVEL_GROWTH,
  type ClientMessage,
  type DifficultyBalanceProfile,
  type DifficultyPreset,
  type EnemySnapshot,
  type GameSnapshot,
  type HeroSnapshot,
  type HeroSkillId,
  type HeroSkillSnapshot,
  type ProjectileTrace,
  type RunSummary,
  type ServerMessage,
  type TowerSnapshot,
  type UpgradeDefinition,
} from "@pals-defence/shared";
import { SeededRng } from "@pals-defence/shared";
import WebSocket, { type RawData } from "ws";

import type { ProgressionStore } from "../persistence/ProgressionStore.js";
import type {
  EnemyRuntime,
  HeroRuntime,
  ProjectileTraceSeed,
  TowerRuntime,
} from "./runtime.js";
import { CombatSystem } from "./systems/CombatSystem.js";
import { EnemyAbilitySystem } from "./systems/EnemyAbilitySystem.js";
import { PathSystem } from "./systems/PathSystem.js";
import { UpgradeSystem } from "./systems/UpgradeSystem.js";
import { WaveSystem } from "./systems/WaveSystem.js";

interface PlayerSession {
  socket: WebSocket;
  displayName: string;
  hero: HeroRuntime;
}

interface GameRoomOptions {
  seed: number;
  difficulty: DifficultyPreset;
  progressionStore: ProgressionStore;
}

interface HeroSkillDefinition {
  id: HeroSkillId;
  name: string;
  description: string;
  hotkey: "Q" | "E";
  cooldownMs: number;
}

const HERO_SKILL_DEFINITIONS: Record<HeroSkillId, HeroSkillDefinition> = {
  arcaneBolt: {
    id: "arcaneBolt",
    name: "Arcane Bolt",
    description: "Dispara um projétil mágico potente no alvo próximo ao cursor.",
    hotkey: "Q",
    cooldownMs: 5000,
  },
  aetherPulse: {
    id: "aetherPulse",
    name: "Aether Pulse",
    description: "Dispara fragmentos energéticos em até 4 inimigos próximos.",
    hotkey: "E",
    cooldownMs: 9000,
  },
};

const DOWNED_BLEEDOUT_MS = 12000;
const REVIVE_REQUIRED_MS = 2800;
const REVIVE_RANGE = 56;
const REVIVE_DECAY_FACTOR = 0.7;
const ARCANE_BOLT_SHOCK_MS = 2800;
const AETHER_PULSE_POISON_MS = 5200;
const EARLY_WAVE_BONUS_INTERVAL_MS = 500;
const REVIVE_REQUIRED_MS_BY_PARTY_SIZE: Record<number, number> = {
  1: REVIVE_REQUIRED_MS,
  2: 3000,
  3: 3900,
  4: 4700,
};
const DOWNED_BLEEDOUT_MS_BY_PARTY_SIZE: Record<number, number> = {
  1: DOWNED_BLEEDOUT_MS,
  2: 12500,
  3: 14500,
  4: 17000,
};
const REVIVE_DECAY_FACTOR_BY_PARTY_SIZE: Record<number, number> = {
  1: REVIVE_DECAY_FACTOR,
  2: 0.75,
  3: 0.82,
  4: 0.9,
};
const REVIVE_HELPER_STRENGTH_FALLOFF = [1, 0.6, 0.4, 0.25];
const STARTING_GOLD_BY_DIFFICULTY: Record<DifficultyPreset, number> = {
  easy: 100,
  normal: 90,
  hard: 82,
};
const PARTY_GOLD_REWARD_SCALE_BY_SIZE: Record<number, number> = {
  1: 1,
  2: 0.84,
  3: 0.72,
  4: 0.64,
};
const PARTY_XP_REWARD_SCALE_BY_SIZE: Record<number, number> = {
  1: 1,
  2: 0.92,
  3: 0.86,
  4: 0.8,
};

export class GameRoom {
  private readonly map = DEFAULT_MAP;
  private readonly progressionStore: ProgressionStore;

  private playersById = new Map<string, PlayerSession>();
  private playerIdBySocket = new Map<WebSocket, string>();

  private towers: TowerRuntime[] = [];
  private enemies: EnemyRuntime[] = [];

  private nextTowerId = 1;
  private nextEnemyId = 1;
  private nextProjectileTraceId = 1;

  private tick = 0;
  private elapsedMs = 0;
  private frameProjectileTraces: ProjectileTrace[] = [];

  private readonly baseMaxHp = BASE_MAX_HP;
  private baseHp = BASE_MAX_HP;

  private runStatus: "running" | "won" | "lost" = "running";

  private waveSystem = new WaveSystem(MAX_WAVES);
  private pathSystem = new PathSystem();
  private combatSystem: CombatSystem;
  private enemyAbilitySystem: EnemyAbilitySystem;
  private upgradeSystem = new UpgradeSystem();

  private seed: number;
  private rng: SeededRng;
  private difficulty: DifficultyPreset;
  private difficultyBalance: DifficultyBalanceProfile;

  private loopHandle: NodeJS.Timeout;
  private resetHandle: NodeJS.Timeout | null = null;

  constructor(options: GameRoomOptions) {
    this.seed = options.seed;
    this.rng = new SeededRng(this.seed);
    this.progressionStore = options.progressionStore;
    this.difficulty = options.difficulty;
    this.difficultyBalance = DIFFICULTY_BALANCE[this.difficulty];
    this.combatSystem = new CombatSystem(this.difficultyBalance);
    this.enemyAbilitySystem = new EnemyAbilitySystem(this.difficultyBalance);

    this.loopHandle = setInterval(() => {
      this.update(TICK_MS);
    }, TICK_MS);
  }

  attachConnection(socket: WebSocket): void {
    socket.on("message", (raw) => this.onSocketMessage(socket, raw));
    socket.on("close", () => this.onSocketClosed(socket));
    socket.on("error", () => this.onSocketClosed(socket));
  }

  private onSocketMessage(socket: WebSocket, raw: RawData): void {
    let payload: unknown;

    try {
      payload = JSON.parse(raw.toString());
    } catch {
      this.send(socket, { type: "error", message: "Invalid JSON payload." });
      return;
    }

    if (!this.isClientMessage(payload)) {
      this.send(socket, { type: "error", message: "Invalid message shape." });
      return;
    }

    if (payload.type === "join") {
      this.handleJoin(socket, payload);
      return;
    }

    const playerId = this.playerIdBySocket.get(socket);
    if (!playerId) {
      this.send(socket, { type: "error", message: "You must send join before game actions." });
      return;
    }

    const session = this.playersById.get(playerId);
    if (!session) {
      this.send(socket, { type: "error", message: "Player session not found." });
      return;
    }

    switch (payload.type) {
      case "input": {
        session.hero.inputDx = this.clamp(payload.dx, -1, 1);
        session.hero.inputDy = this.clamp(payload.dy, -1, 1);
        session.hero.reviveInput = Boolean(payload.revive);
        break;
      }
      case "placeTower": {
        this.handleTowerPlacement(session.hero, payload.towerTypeId, payload.slotIndex);
        break;
      }
      case "moveTower": {
        this.handleTowerRelocation(session.hero, payload.towerId, payload.slotIndex);
        break;
      }
      case "chooseUpgrade": {
        this.handleUpgradeChoice(playerId, payload.upgradeId);
        break;
      }
      case "rerollUpgrades": {
        this.handleUpgradeReroll(playerId);
        break;
      }
      case "startNextWave": {
        this.handleStartNextWave(playerId);
        break;
      }
      case "castSkill": {
        this.handleCastSkill(session.hero, payload.skillId, payload.targetX, payload.targetY);
        break;
      }
      default:
        break;
    }
  }

  private handleJoin(socket: WebSocket, payload: Extract<ClientMessage, { type: "join" }>): void {
    const playerId = this.sanitizeId(payload.playerId);
    const displayName = this.sanitizeName(payload.displayName);

    if (!playerId) {
      this.send(socket, { type: "error", message: "Invalid playerId." });
      return;
    }

    const existing = this.playersById.get(playerId);

    if (existing) {
      this.playerIdBySocket.delete(existing.socket);
      existing.socket = socket;
      existing.displayName = displayName;
      existing.hero.name = displayName;
    } else {
      this.playersById.set(playerId, {
        socket,
        displayName,
        hero: this.createHero(playerId, displayName),
      });
    }

    this.playerIdBySocket.set(socket, playerId);

    const progression = this.progressionStore.get(playerId);

    this.send(socket, {
      type: "welcome",
      playerId,
      displayName,
      seed: this.seed,
      difficulty: this.difficulty,
      map: this.map,
      progression,
    });

    const hero = this.playersById.get(playerId)?.hero;
    if (hero?.pendingUpgradeOptions && hero.pendingUpgradeOptions.length > 0) {
      this.send(socket, {
        type: "upgradeOptions",
        options: hero.pendingUpgradeOptions,
        rerollTokens: hero.rerollTokens,
      });
    }

    this.send(socket, {
      type: "state",
      snapshot: this.snapshot(),
    });
  }

  private handleTowerPlacement(
    hero: HeroRuntime,
    towerTypeId: Extract<ClientMessage, { type: "placeTower" }>['towerTypeId'],
    slotIndex: number,
  ): void {
    if (
      this.runStatus !== "running" ||
      this.hasUpgradeSelectionPause() ||
      hero.state !== "alive" ||
      hero.hp <= 0
    ) {
      return;
    }

    const towerDef = TOWER_DEFINITIONS[towerTypeId];
    if (!towerDef) {
      return;
    }

    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= this.map.towerSlots.length) {
      return;
    }

    const occupied = this.towers.some((tower) => tower.slotIndex === slotIndex);
    if (occupied) {
      return;
    }

    const ownedCount = this.towers.filter((tower) => tower.ownerId === hero.id).length;
    if (ownedCount >= hero.maxTowers) {
      return;
    }

    if (hero.gold < towerDef.cost) {
      return;
    }

    hero.gold -= towerDef.cost;

    const slot = this.map.towerSlots[slotIndex];
    const stats = this.getTowerStats(hero, towerTypeId);

    const tower: TowerRuntime = {
      id: this.nextTowerId,
      ownerId: hero.id,
      typeId: towerTypeId,
      x: slot.x,
      y: slot.y,
      level: 1,
      damage: stats.damage,
      range: towerDef.baseRange,
      cooldownMs: stats.cooldownMs,
      slotIndex,
      cooldownLeftMs: this.rng.rangeInt(0, stats.cooldownMs),
    };

    this.nextTowerId += 1;
    this.towers.push(tower);
  }

  private handleTowerRelocation(hero: HeroRuntime, towerId: number, slotIndex: number): void {
    if (
      this.runStatus !== "running" ||
      this.hasUpgradeSelectionPause() ||
      hero.state !== "alive" ||
      hero.hp <= 0
    ) {
      return;
    }

    if (!Number.isInteger(towerId) || towerId <= 0) {
      return;
    }

    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= this.map.towerSlots.length) {
      return;
    }

    const tower = this.towers.find((entry) => entry.id === towerId && entry.ownerId === hero.id);
    if (!tower) {
      return;
    }

    if (tower.slotIndex === slotIndex) {
      return;
    }

    const occupied = this.towers.some((entry) => entry.slotIndex === slotIndex && entry.id !== tower.id);
    if (occupied) {
      return;
    }

    if (hero.gold < TOWER_RELOCATE_COST) {
      return;
    }

    hero.gold -= TOWER_RELOCATE_COST;
    const slot = this.map.towerSlots[slotIndex];
    tower.slotIndex = slotIndex;
    tower.x = slot.x;
    tower.y = slot.y;
    tower.cooldownLeftMs = Math.min(tower.cooldownLeftMs, tower.cooldownMs);
  }

  private handleUpgradeChoice(playerId: string, upgradeId: string): void {
    const session = this.playersById.get(playerId);
    if (!session) {
      return;
    }

    const hero = session.hero;
    if (hero.state !== "alive") {
      return;
    }

    const pending = hero.pendingUpgradeOptions;

    if (!pending || pending.length === 0) {
      return;
    }

    const isAllowed = pending.some((option) => option.id === upgradeId);
    if (!isAllowed) {
      return;
    }

    const definition = this.upgradeSystem.getDefinition(upgradeId);
    if (!definition) {
      return;
    }

    this.applyUpgrade(hero, definition);
    hero.ownedUpgradeIds.add(definition.id);
    hero.pendingUpgradeOptions = null;

    this.checkLevelUpsForHero(playerId, hero);
  }

  private handleUpgradeReroll(playerId: string): void {
    const session = this.playersById.get(playerId);
    if (!session) {
      return;
    }

    const hero = session.hero;
    if (this.runStatus !== "running" || hero.state !== "alive" || hero.hp <= 0) {
      return;
    }

    const pending = hero.pendingUpgradeOptions;
    if (!pending || pending.length === 0) {
      return;
    }

    if (hero.rerollTokens <= 0) {
      return;
    }

    hero.rerollTokens -= 1;
    const previousOptionIds = new Set(pending.map((option) => option.id));
    const nextOptions = this.generateRerolledOptions(hero, previousOptionIds);
    if (nextOptions.length === 0) {
      hero.pendingUpgradeOptions = pending;
      hero.rerollTokens += 1;
      return;
    }

    hero.pendingUpgradeOptions = nextOptions;
    this.sendToPlayer(playerId, {
      type: "upgradeOptions",
      options: nextOptions,
      rerollTokens: hero.rerollTokens,
    });
  }

  private handleCastSkill(
    hero: HeroRuntime,
    skillId: HeroSkillId,
    targetX: number,
    targetY: number,
  ): void {
    if (
      this.runStatus !== "running" ||
      this.hasUpgradeSelectionPause() ||
      hero.pendingUpgradeOptions ||
      hero.state !== "alive" ||
      hero.hp <= 0
    ) {
      return;
    }

    if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) {
      return;
    }

    const definition = HERO_SKILL_DEFINITIONS[skillId];
    if (!definition) {
      return;
    }

    if (hero.skillCooldownsMs[skillId] > 0) {
      return;
    }

    const clampedX = this.clamp(targetX, 0, this.map.width);
    const clampedY = this.clamp(targetY, 0, this.map.height);

    switch (skillId) {
      case "arcaneBolt": {
        const target =
          this.findNearestEnemyFromPoint(clampedX, clampedY, 260) ??
          this.findNearestEnemyFromPoint(hero.x, hero.y, Math.max(hero.attackRange * 2, 180));
        if (!target) {
          return;
        }

        const critChance = Math.min(95, Math.max(0, hero.critChancePct + 12));
        const isCrit = this.rng.next() * 100 < critChance;
        const critMultiplier = isCrit ? Math.max(1.3, hero.critDamageMultiplier) : 1;
        const damage = Math.max(12, Math.round(hero.attackDamage * 4.6 * critMultiplier));
        target.hp = Math.max(0, target.hp - damage);
        target.shockedRemainingMs = Math.max(target.shockedRemainingMs, ARCANE_BOLT_SHOCK_MS);

        this.pushProjectileTrace({
          kind: "skill_arcane_bolt",
          from: { x: hero.x, y: hero.y },
          to: { x: target.x, y: target.y },
          durationMs: 300,
          radius: isCrit ? 7 : 6,
          color: isCrit ? 0xf6d86f : 0xc187ff,
        });

        hero.skillCooldownsMs.arcaneBolt = definition.cooldownMs;
        break;
      }
      case "aetherPulse": {
        const targets = this.findNearestEnemies(hero.x, hero.y, 250, 4);
        if (targets.length === 0) {
          return;
        }

        const damage = Math.max(8, Math.round(hero.attackDamage * 2.15));
        for (const target of targets) {
          target.hp = Math.max(0, target.hp - damage);
          const poisonStacks = Math.max(1, Math.round(2 * hero.poisonPowerMultiplier));
          target.poisonStacks = Math.min(12, target.poisonStacks + poisonStacks);
          target.poisonRemainingMs = Math.max(target.poisonRemainingMs, AETHER_PULSE_POISON_MS);

          this.pushProjectileTrace({
            kind: "skill_pulse_shard",
            from: { x: hero.x, y: hero.y },
            to: { x: target.x, y: target.y },
            durationMs: 240,
            radius: 4,
            color: 0x69f2dc,
          });
        }

        hero.skillCooldownsMs.aetherPulse = definition.cooldownMs;
        break;
      }
      default:
        break;
    }
  }

  private handleStartNextWave(playerId: string): void {
    const session = this.playersById.get(playerId);
    if (!session || this.runStatus !== "running" || this.hasUpgradeSelectionPause()) {
      return;
    }

    if (session.hero.state === "dead") {
      return;
    }

    const intermissionRemainingMs = this.waveSystem.intermissionRemainingMs;
    const skipped = this.waveSystem.skipIntermission();
    if (!skipped || intermissionRemainingMs <= 0) {
      return;
    }

    const bonusGold = Math.max(1, Math.floor(intermissionRemainingMs / EARLY_WAVE_BONUS_INTERVAL_MS));
    for (const teammate of this.playersById.values()) {
      if (teammate.hero.state === "dead") {
        continue;
      }
      teammate.hero.gold += bonusGold;
      teammate.hero.totalGoldEarned += bonusGold;
    }
  }

  private update(deltaMs: number): void {
    if (this.playersById.size === 0) {
      return;
    }

    this.tick += 1;
    this.elapsedMs += deltaMs;

    if (this.runStatus === "running" && !this.hasUpgradeSelectionPause()) {
      this.updateHeroCooldowns(deltaMs);
      this.updateHeroMovement(deltaMs);

      const spawns = this.waveSystem.update(
        deltaMs,
        this.enemies.length,
        this.map.paths.length,
        this.rng,
      );
      for (const spawn of spawns) {
        this.spawnEnemy(spawn.typeId, spawn.pathId);
      }

      const heroes = [...this.playersById.values()].map((session) => session.hero);
      const enemyAbilityResult = this.enemyAbilitySystem.update(
        deltaMs,
        heroes,
        this.enemies,
        this.map.paths.length,
        this.rng,
      );
      for (const spawn of enemyAbilityResult.spawnRequests) {
        this.spawnEnemy(spawn.typeId, spawn.pathId);
      }
      this.pushProjectileTraceBatch(enemyAbilityResult.projectileTraces);

      const pathUpdate = this.pathSystem.update(deltaMs, this.map, this.enemies);
      if (pathUpdate.reachedBaseIds.length > 0) {
        const reachedSet = new Set(pathUpdate.reachedBaseIds);
        for (const enemy of this.enemies) {
          if (!reachedSet.has(enemy.id)) {
            continue;
          }

          const enemyDef = ENEMY_DEFINITIONS[enemy.typeId];
          const contactDamage = Math.max(
            1,
            Math.round(
              enemyDef.contactDamage * this.difficultyBalance.enemyContactDamageMultiplier,
            ),
          );
          this.baseHp = Math.max(0, this.baseHp - contactDamage);
        }

        this.enemies = this.enemies.filter((enemy) => !reachedSet.has(enemy.id));
      }

      const combatResult = this.combatSystem.update(
        deltaMs,
        heroes,
        this.towers,
        this.enemies,
        this.rng,
      );
      this.pushProjectileTraceBatch(combatResult.projectileTraces);
      this.handleEnemyDefeats(combatResult.defeatedEnemyIds);
      this.applyDownedStateTransitions();
      this.updateDownedReviveSystem(deltaMs);

      for (const [playerId, session] of this.playersById.entries()) {
        this.checkLevelUpsForHero(playerId, session.hero);
      }

      if (this.baseHp <= 0 || this.isPartyWiped()) {
        this.endRun("lost");
      } else if (this.waveSystem.done && this.enemies.length === 0) {
        this.endRun("won");
      }
    } else if (this.runStatus === "running") {
      this.clearReviveVisualState();
    }

    this.broadcastState();
    this.frameProjectileTraces = [];
  }

  private updateHeroMovement(deltaMs: number): void {
    const dt = deltaMs / 1000;

    for (const session of this.playersById.values()) {
      const hero = session.hero;
      if (hero.state !== "alive" || hero.hp <= 0) {
        hero.reviveInput = false;
        hero.isReviving = false;
        hero.reviveTargetId = null;
        continue;
      }

      if (hero.reviveInput) {
        continue;
      }

      const length = Math.hypot(hero.inputDx, hero.inputDy);

      if (length < 0.0001) {
        continue;
      }

      const nx = hero.inputDx / length;
      const ny = hero.inputDy / length;

      hero.x = this.clamp(hero.x + nx * hero.moveSpeed * dt, 0, this.map.width);
      hero.y = this.clamp(hero.y + ny * hero.moveSpeed * dt, 0, this.map.height);
    }
  }

  private updateHeroCooldowns(deltaMs: number): void {
    for (const session of this.playersById.values()) {
      const hero = session.hero;
      for (const skillId of Object.keys(hero.skillCooldownsMs) as HeroSkillId[]) {
        hero.skillCooldownsMs[skillId] = Math.max(0, hero.skillCooldownsMs[skillId] - deltaMs);
      }
    }
  }

  private clearReviveVisualState(): void {
    for (const session of this.playersById.values()) {
      session.hero.isReviving = false;
      session.hero.reviveTargetId = null;
      session.hero.reviveInput = false;
    }
  }

  private spawnEnemy(typeId: Extract<EnemyRuntime["typeId"], string>, pathId: number): void {
    const enemyDef = ENEMY_DEFINITIONS[typeId];
    const scaledHp = Math.max(1, Math.round(enemyDef.maxHp * this.difficultyBalance.enemyHpMultiplier));
    const scaledSpeed = Math.max(
      10,
      Math.round(enemyDef.speed * this.difficultyBalance.enemySpeedMultiplier),
    );
    const safePathId = Math.max(0, Math.min(pathId, this.map.paths.length - 1));
    const path = this.map.paths[safePathId] ?? this.map.paths[0];
    const spawnPoint = path[0];

    const enemy: EnemyRuntime = {
      id: this.nextEnemyId,
      typeId: enemyDef.id,
      x: spawnPoint.x,
      y: spawnPoint.y,
      hp: scaledHp,
      maxHp: scaledHp,
      speed: scaledSpeed,
      rewardGold: enemyDef.rewardGold,
      rewardXp: enemyDef.rewardXp,
      isBoss: Boolean(enemyDef.isBoss),
      poisonStacks: 0,
      poisonRemainingMs: 0,
      shockedRemainingMs: 0,
      eliteEmpoweredRemainingMs: 0,
      bossPhase: enemyDef.isBoss ? 1 : 0,
      pathId: safePathId,
      waypointIndex: 0,
      heroAttackCooldownLeftMs: this.rng.rangeInt(180, 900),
      poisonTickAccumulatorMs: 0,
      baseSpeed: scaledSpeed,
      eliteEmpowerCooldownMs: this.rng.rangeInt(
        this.difficultyBalance.eliteEmpowerCooldownMinMs,
        this.difficultyBalance.eliteEmpowerCooldownMaxMs,
      ),
      bossSummonCooldownMs: enemyDef.isBoss
        ? Math.round(this.difficultyBalance.bossSummonCooldownPhase2Ms * 0.68)
        : 0,
      bossShockwaveCooldownMs: enemyDef.isBoss
        ? Math.round(this.difficultyBalance.bossShockwaveCooldownMs * 0.74)
        : 0,
    };

    this.nextEnemyId += 1;
    this.enemies.push(enemy);
  }

  private findNearestEnemyFromPoint(
    x: number,
    y: number,
    maxRange: number,
  ): EnemyRuntime | undefined {
    let best: EnemyRuntime | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) {
        continue;
      }

      const distance = Math.hypot(enemy.x - x, enemy.y - y);
      if (distance > maxRange) {
        continue;
      }

      if (distance < bestDistance) {
        bestDistance = distance;
        best = enemy;
      }
    }

    return best;
  }

  private findNearestEnemies(
    x: number,
    y: number,
    maxRange: number,
    count: number,
  ): EnemyRuntime[] {
    return this.enemies
      .filter((enemy) => enemy.hp > 0 && Math.hypot(enemy.x - x, enemy.y - y) <= maxRange)
      .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))
      .slice(0, count);
  }

  private pushProjectileTrace(trace: ProjectileTraceSeed): void {
    this.frameProjectileTraces.push({
      ...trace,
      id: this.nextProjectileTraceId,
      createdAtMs: this.elapsedMs,
    });
    this.nextProjectileTraceId += 1;
  }

  private pushProjectileTraceBatch(traces: ProjectileTraceSeed[]): void {
    for (const trace of traces) {
      this.pushProjectileTrace(trace);
    }
  }

  private hasLivingHeroes(): boolean {
    for (const session of this.playersById.values()) {
      if (session.hero.state === "alive" && session.hero.hp > 0) {
        return true;
      }
    }

    return false;
  }

  private hasDownedHeroes(): boolean {
    for (const session of this.playersById.values()) {
      if (session.hero.state === "downed") {
        return true;
      }
    }

    return false;
  }

  private isPartyWiped(): boolean {
    return !this.hasLivingHeroes() && !this.hasDownedHeroes();
  }

  private hasUpgradeSelectionPause(): boolean {
    for (const session of this.playersById.values()) {
      const pending = session.hero.pendingUpgradeOptions;
      if (pending && pending.length > 0) {
        return true;
      }
    }

    return false;
  }

  private getPartySizeForReviveTuning(): number {
    return Math.max(1, Math.min(4, this.playersById.size));
  }

  private getReviveRequiredMs(): number {
    const partySize = this.getPartySizeForReviveTuning();
    return REVIVE_REQUIRED_MS_BY_PARTY_SIZE[partySize] ?? REVIVE_REQUIRED_MS;
  }

  private getDownedBleedoutMs(): number {
    const partySize = this.getPartySizeForReviveTuning();
    return DOWNED_BLEEDOUT_MS_BY_PARTY_SIZE[partySize] ?? DOWNED_BLEEDOUT_MS;
  }

  private getReviveDecayFactor(): number {
    const partySize = this.getPartySizeForReviveTuning();
    return REVIVE_DECAY_FACTOR_BY_PARTY_SIZE[partySize] ?? REVIVE_DECAY_FACTOR;
  }

  private getEffectiveReviveHelperStrength(helperCount: number): number {
    if (helperCount <= 0) {
      return 0;
    }

    let strength = 0;
    for (let index = 0; index < helperCount; index += 1) {
      const falloff =
        REVIVE_HELPER_STRENGTH_FALLOFF[index] ??
        REVIVE_HELPER_STRENGTH_FALLOFF[REVIVE_HELPER_STRENGTH_FALLOFF.length - 1] * 0.65;
      strength += falloff;
    }

    return Math.max(0, strength);
  }

  private getPartyGoldRewardScale(): number {
    const size = this.getPartySizeForReviveTuning();
    return PARTY_GOLD_REWARD_SCALE_BY_SIZE[size] ?? PARTY_GOLD_REWARD_SCALE_BY_SIZE[4];
  }

  private getPartyXpRewardScale(): number {
    const size = this.getPartySizeForReviveTuning();
    return PARTY_XP_REWARD_SCALE_BY_SIZE[size] ?? PARTY_XP_REWARD_SCALE_BY_SIZE[4];
  }

  private applyDownedStateTransitions(): void {
    for (const session of this.playersById.values()) {
      const hero = session.hero;

      if (hero.state === "alive" && hero.hp <= 0) {
        hero.hp = 0;
        hero.state = "downed";
        hero.isReviving = false;
        hero.reviveTargetId = null;
        hero.reviveInput = false;
        hero.downedRemainingMs = this.getDownedBleedoutMs();
        hero.reviveProgressMs = 0;
        hero.inputDx = 0;
        hero.inputDy = 0;
      }

      if (hero.state === "dead") {
        hero.hp = 0;
        hero.isReviving = false;
        hero.reviveTargetId = null;
        hero.reviveInput = false;
        hero.inputDx = 0;
        hero.inputDy = 0;
      }
    }
  }

  private updateDownedReviveSystem(deltaMs: number): void {
    const heroes = [...this.playersById.values()].map((session) => session.hero);
    const aliveHeroes = heroes.filter((hero) => hero.state === "alive" && hero.hp > 0);
    const downedHeroes = heroes.filter((hero) => hero.state === "downed");
    const reviveRequiredMs = this.getReviveRequiredMs();
    const reviveDecayFactor = this.getReviveDecayFactor();

    for (const hero of aliveHeroes) {
      hero.isReviving = false;
      hero.reviveTargetId = null;
    }

    const helpersByTargetId = new Map<string, number>();
    for (const reviver of aliveHeroes) {
      if (!reviver.reviveInput) {
        continue;
      }

      let target: HeroRuntime | null = null;
      let targetDistance = Number.POSITIVE_INFINITY;

      for (const downedHero of downedHeroes) {
        if (downedHero.id === reviver.id) {
          continue;
        }

        const distance = Math.hypot(reviver.x - downedHero.x, reviver.y - downedHero.y);
        if (distance > REVIVE_RANGE || distance >= targetDistance) {
          continue;
        }

        target = downedHero;
        targetDistance = distance;
      }

      if (!target) {
        continue;
      }

      reviver.isReviving = true;
      reviver.reviveTargetId = target.id;
      helpersByTargetId.set(target.id, (helpersByTargetId.get(target.id) ?? 0) + 1);
    }

    for (const hero of heroes) {
      if (hero.state !== "downed") {
        if (hero.state !== "alive") {
          hero.isReviving = false;
          hero.reviveTargetId = null;
        }
        continue;
      }

      hero.downedRemainingMs = Math.max(0, hero.downedRemainingMs - deltaMs);
      if (hero.downedRemainingMs <= 0) {
        hero.state = "dead";
        hero.reviveProgressMs = 0;
        continue;
      }

      const helpers = helpersByTargetId.get(hero.id) ?? 0;
      const helperStrength = this.getEffectiveReviveHelperStrength(helpers);

      if (helperStrength > 0) {
        hero.reviveProgressMs = Math.min(
          reviveRequiredMs,
          hero.reviveProgressMs + deltaMs * helperStrength,
        );

        if (hero.reviveProgressMs >= reviveRequiredMs) {
          hero.state = "alive";
          hero.hp = Math.max(1, Math.round(hero.maxHp * 0.4));
          hero.reviveInput = false;
          hero.isReviving = false;
          hero.reviveTargetId = null;
          hero.downedRemainingMs = 0;
          hero.reviveProgressMs = 0;
          hero.inputDx = 0;
          hero.inputDy = 0;
        }
      } else {
        hero.reviveProgressMs = Math.max(
          0,
          hero.reviveProgressMs - deltaMs * reviveDecayFactor,
        );
      }
    }
  }

  private handleEnemyDefeats(defeatedEnemyIds: Set<number>): void {
    if (defeatedEnemyIds.size === 0) {
      return;
    }

    const defeatedEnemies = this.enemies.filter((enemy) => defeatedEnemyIds.has(enemy.id));
    const heroes = [...this.playersById.values()].map((session) => session.hero);
    const partyGoldScale = this.getPartyGoldRewardScale();
    const partyXpScale = this.getPartyXpRewardScale();
    const difficultyGoldScale = this.difficultyBalance.enemyGoldRewardMultiplier;
    const difficultyXpScale = this.difficultyBalance.enemyXpRewardMultiplier;

    for (const enemy of defeatedEnemies) {
      for (const hero of heroes) {
        if (hero.state === "dead") {
          continue;
        }

        const rewardedGold = Math.max(
          1,
          Math.round(
            enemy.rewardGold *
              difficultyGoldScale *
              partyGoldScale *
              hero.goldGainMultiplier,
          ),
        );
        const rewardedXp = Math.max(
          1,
          Math.round(enemy.rewardXp * difficultyXpScale * partyXpScale),
        );

        hero.gold += rewardedGold;
        hero.totalGoldEarned += rewardedGold;
        hero.xp += rewardedXp;
      }
    }

    this.enemies = this.enemies.filter((enemy) => !defeatedEnemyIds.has(enemy.id));
  }

  private checkLevelUpsForHero(playerId: string, hero: HeroRuntime): void {
    if (hero.pendingUpgradeOptions || hero.state !== "alive" || hero.hp <= 0) {
      return;
    }

    while (hero.xp >= hero.nextLevelXp) {
      hero.xp -= hero.nextLevelXp;
      hero.level += 1;
      hero.nextLevelXp = this.getNextLevelXp(hero.level);

      const options = this.upgradeSystem.generateOptions(hero, this.rng);
      if (options.length > 0) {
        hero.pendingUpgradeOptions = options;
        this.sendToPlayer(playerId, {
          type: "upgradeOptions",
          options,
          rerollTokens: hero.rerollTokens,
        });
      }

      break;
    }
  }

  private applyUpgrade(hero: HeroRuntime, definition: UpgradeDefinition): void {
    for (const effect of definition.effects) {
      switch (effect.kind) {
        case "hero_damage_flat":
          hero.attackDamage += effect.amount;
          break;
        case "tower_damage_pct":
          hero.towerDamageMultiplier *= 1 + effect.amountPct / 100;
          this.recalculateOwnedTowers(hero.id);
          break;
        case "tower_cooldown_pct":
          hero.towerCooldownMultiplier *= 1 - effect.amountPct / 100;
          hero.towerCooldownMultiplier = Math.max(0.25, hero.towerCooldownMultiplier);
          this.recalculateOwnedTowers(hero.id);
          break;
        case "hero_move_speed_flat":
          hero.moveSpeed += effect.amount;
          break;
        case "hero_attack_range_flat":
          hero.attackRange += effect.amount;
          break;
        case "tower_slot_flat":
          hero.maxTowers += effect.amount;
          break;
        case "gold_gain_pct":
          hero.goldGainMultiplier *= 1 + effect.amountPct / 100;
          break;
        case "heal_flat":
          hero.hp = Math.min(hero.maxHp, hero.hp + effect.amount);
          break;
        case "base_repair_flat":
          this.baseHp = Math.min(this.baseMaxHp, this.baseHp + effect.amount);
          break;
        case "reroll_token_flat":
          hero.rerollTokens += effect.amount;
          break;
        case "crit_chance_flat":
          hero.critChancePct += effect.amountPct;
          break;
        case "crit_damage_pct":
          hero.critDamageMultiplier *= 1 + effect.amountPct / 100;
          break;
        case "poison_power_pct":
          hero.poisonPowerMultiplier *= 1 + effect.amountPct / 100;
          break;
        case "chain_damage_pct":
          hero.chainDamageMultiplier *= 1 + effect.amountPct / 100;
          break;
        default:
          break;
      }
    }
  }

  private generateRerolledOptions(hero: HeroRuntime, previousOptionIds: Set<string>) {
    let candidate = this.upgradeSystem.generateOptions(hero, this.rng);

    for (let attempt = 0; attempt < 6; attempt += 1) {
      candidate = this.upgradeSystem.generateOptions(hero, this.rng);
      if (this.hasAnyOptionDifference(candidate, previousOptionIds)) {
        return candidate;
      }
    }

    return candidate;
  }

  private hasAnyOptionDifference(
    candidate: { id: string }[],
    previousOptionIds: Set<string>,
  ): boolean {
    if (candidate.length !== previousOptionIds.size) {
      return true;
    }

    for (const option of candidate) {
      if (!previousOptionIds.has(option.id)) {
        return true;
      }
    }

    return false;
  }

  private recalculateOwnedTowers(ownerId: string): void {
    const hero = this.playersById.get(ownerId)?.hero;
    if (!hero) {
      return;
    }

    for (const tower of this.towers) {
      if (tower.ownerId !== ownerId) {
        continue;
      }

      const stats = this.getTowerStats(hero, tower.typeId);
      tower.damage = stats.damage;
      tower.cooldownMs = stats.cooldownMs;
      tower.cooldownLeftMs = Math.min(tower.cooldownLeftMs, tower.cooldownMs);
    }
  }

  private getTowerStats(
    hero: HeroRuntime,
    towerTypeId: Extract<TowerSnapshot["typeId"], string>,
  ): { damage: number; cooldownMs: number } {
    const towerDef = TOWER_DEFINITIONS[towerTypeId];

    return {
      damage: Math.max(1, Math.round(towerDef.baseDamage * hero.towerDamageMultiplier)),
      cooldownMs: Math.max(180, Math.round(towerDef.baseCooldownMs * hero.towerCooldownMultiplier)),
    };
  }

  private endRun(status: "won" | "lost"): void {
    if (this.runStatus !== "running") {
      return;
    }

    this.runStatus = status;

    for (const [playerId, session] of this.playersById.entries()) {
      const summary: RunSummary = {
        runStatus: status,
        reachedWave: this.waveSystem.currentWave,
        goldEarned: session.hero.totalGoldEarned,
        durationMs: this.elapsedMs,
      };

      const progression = this.progressionStore.applyRun(playerId, summary);
      this.send(session.socket, {
        type: "runEnded",
        summary,
        progression,
      });
    }

    if (!this.resetHandle) {
      this.resetHandle = setTimeout(() => {
        this.resetHandle = null;
        this.resetRun();
      }, 5000);
    }
  }

  private resetRun(): void {
    this.waveSystem.reset();
    this.towers = [];
    this.enemies = [];
    this.nextTowerId = 1;
    this.nextEnemyId = 1;
    this.tick = 0;
    this.elapsedMs = 0;
    this.baseHp = this.baseMaxHp;
    this.frameProjectileTraces = [];
    this.runStatus = "running";

    for (const [playerId, session] of this.playersById.entries()) {
      session.hero = this.createHero(playerId, session.displayName);
    }

    this.broadcastState();
  }

  private createHero(playerId: string, displayName: string): HeroRuntime {
    return {
      id: playerId,
      name: displayName,
      x: this.map.heroSpawn.x,
      y: this.map.heroSpawn.y,
      state: "alive",
      isReviving: false,
      reviveTargetId: null,
      hp: HERO_BASE_MAX_HP,
      maxHp: HERO_BASE_MAX_HP,
      moveSpeed: HERO_BASE_MOVE_SPEED,
      attackDamage: HERO_BASE_ATTACK_DAMAGE,
      attackRange: HERO_BASE_ATTACK_RANGE,
      attackCooldownMs: HERO_BASE_ATTACK_COOLDOWN_MS,
      level: 1,
      xp: 0,
      nextLevelXp: this.getNextLevelXp(1),
      gold: STARTING_GOLD_BY_DIFFICULTY[this.difficulty],
      maxTowers: INITIAL_TOWER_CAP,
      skills: [],
      downedRemainingMs: 0,
      reviveProgressMs: 0,
      inputDx: 0,
      inputDy: 0,
      reviveInput: false,
      attackCooldownLeftMs: 200,
      towerDamageMultiplier: 1,
      towerCooldownMultiplier: 1,
      goldGainMultiplier: 1,
      rerollTokens: 0,
      pendingUpgradeOptions: null,
      ownedUpgradeIds: new Set<string>(),
      totalGoldEarned: 0,
      skillCooldownsMs: {
        arcaneBolt: 0,
        aetherPulse: 0,
      },
      critChancePct: 10,
      critDamageMultiplier: 1.7,
      poisonPowerMultiplier: 1,
      chainDamageMultiplier: 1,
    };
  }

  private getNextLevelXp(level: number): number {
    return Math.floor(XP_PER_LEVEL_BASE * Math.pow(XP_PER_LEVEL_GROWTH, level - 1));
  }

  private snapshot(): GameSnapshot {
    return {
      tick: this.tick,
      timeMs: this.elapsedMs,
      seed: this.seed,
      difficulty: this.difficulty,
      map: this.map,
      wave: this.waveSystem.currentWave,
      totalWaves: MAX_WAVES,
      waveState: this.waveSystem.waveState,
      isUpgradeSelectionPhase: this.hasUpgradeSelectionPause(),
      intermissionRemainingMs: this.waveSystem.intermissionRemainingMs,
      remainingWaveSpawns: this.waveSystem.remainingWaveSpawns,
      reviveRequiredMs: this.getReviveRequiredMs(),
      runStatus: this.runStatus,
      baseHp: this.baseHp,
      baseMaxHp: this.baseMaxHp,
      heroes: [...this.playersById.values()].map((session) => this.toHeroSnapshot(session.hero)),
      towers: this.towers.map((tower) => this.toTowerSnapshot(tower)),
      enemies: this.enemies.map((enemy) => this.toEnemySnapshot(enemy)),
      projectileTraces: this.frameProjectileTraces,
    };
  }

  private toHeroSnapshot(hero: HeroRuntime): HeroSnapshot {
    return {
      id: hero.id,
      name: hero.name,
      x: hero.x,
      y: hero.y,
      state: hero.state,
      isReviving: hero.isReviving,
      reviveTargetId: hero.reviveTargetId,
      hp: hero.hp,
      maxHp: hero.maxHp,
      moveSpeed: hero.moveSpeed,
      attackDamage: hero.attackDamage,
      attackRange: hero.attackRange,
      attackCooldownMs: hero.attackCooldownMs,
      level: hero.level,
      xp: hero.xp,
      nextLevelXp: hero.nextLevelXp,
      gold: hero.gold,
      rerollTokens: hero.rerollTokens,
      maxTowers: hero.maxTowers,
      skills: this.toHeroSkills(hero),
      downedRemainingMs: hero.downedRemainingMs,
      reviveProgressMs: hero.reviveProgressMs,
    };
  }

  private toHeroSkills(hero: HeroRuntime): HeroSkillSnapshot[] {
    return (Object.keys(HERO_SKILL_DEFINITIONS) as HeroSkillId[]).map((skillId) => {
      const definition = HERO_SKILL_DEFINITIONS[skillId];
      return {
        id: definition.id,
        name: definition.name,
        description: definition.description,
        hotkey: definition.hotkey,
        cooldownMs: definition.cooldownMs,
        cooldownRemainingMs: hero.skillCooldownsMs[definition.id],
      };
    });
  }

  private toTowerSnapshot(tower: TowerRuntime): TowerSnapshot {
    return {
      id: tower.id,
      ownerId: tower.ownerId,
      typeId: tower.typeId,
      x: tower.x,
      y: tower.y,
      level: tower.level,
      damage: tower.damage,
      range: tower.range,
      cooldownMs: tower.cooldownMs,
    };
  }

  private toEnemySnapshot(enemy: EnemyRuntime): EnemySnapshot {
    return {
      id: enemy.id,
      typeId: enemy.typeId,
      x: enemy.x,
      y: enemy.y,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      speed: enemy.speed,
      rewardGold: enemy.rewardGold,
      rewardXp: enemy.rewardXp,
      isBoss: enemy.isBoss,
      poisonStacks: enemy.poisonStacks,
      poisonRemainingMs: enemy.poisonRemainingMs,
      shockedRemainingMs: enemy.shockedRemainingMs,
      eliteEmpoweredRemainingMs: enemy.eliteEmpoweredRemainingMs,
      bossPhase: enemy.bossPhase,
    };
  }

  private sendToPlayer(playerId: string, message: ServerMessage): void {
    const session = this.playersById.get(playerId);
    if (!session) {
      return;
    }

    this.send(session.socket, message);
  }

  private broadcastState(): void {
    const state: ServerMessage = {
      type: "state",
      snapshot: this.snapshot(),
    };

    for (const session of this.playersById.values()) {
      this.send(session.socket, state);
    }
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(message));
  }

  private onSocketClosed(socket: WebSocket): void {
    const playerId = this.playerIdBySocket.get(socket);
    if (!playerId) {
      return;
    }

    this.playerIdBySocket.delete(socket);
    const session = this.playersById.get(playerId);

    if (!session || session.socket !== socket) {
      return;
    }

    this.playersById.delete(playerId);
    this.towers = this.towers.filter((tower) => tower.ownerId !== playerId);
  }

  private sanitizeId(value: string): string {
    return value.trim().slice(0, 64);
  }

  private sanitizeName(value: string): string {
    const normalized = value.trim().slice(0, 24);
    return normalized.length > 0 ? normalized : "Warden";
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private isClientMessage(payload: unknown): payload is ClientMessage {
    if (!payload || typeof payload !== "object") {
      return false;
    }

    const maybe = payload as { type?: unknown };
    return typeof maybe.type === "string";
  }
}
