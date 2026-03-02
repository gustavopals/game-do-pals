import type {
  DifficultyPreset,
  GameSnapshot,
  PlayerProgression,
  ProjectileTrace,
  RunSummary,
  TowerTypeId,
} from "@pals-defence/shared";
import Phaser from "phaser";

import { loadLocale, saveLocale, toggleLocale, tr, type Locale } from "../i18n";
import { GameClient } from "../network/GameClient";
import { UpgradeOverlay } from "../ui/UpgradeOverlay";

const TOWER_COLORS: Record<TowerTypeId, number> = {
  defender: 0x6f7f5a,
  archer: 0x8ccf4f,
  mage: 0x4ec7d8,
};

const HERO_COLOR = 0xeadb9b;
const HERO_DOWNED_COLOR = 0xd1a65b;
const HERO_DEAD_COLOR = 0x5a5555;
const ENEMY_COLOR = 0xd45757;
const BOSS_COLOR = 0x8f253d;
const TITLE_FONT = '"Cinzel", "Palatino Linotype", serif';
const BODY_FONT = '"Spectral", "Segoe UI", serif';

type ScreenMode = "menu" | "difficulty" | "connecting" | "playing" | "runEnd";

interface ActiveProjectile {
  id: number;
  kind: ProjectileTrace["kind"];
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  elapsedMs: number;
  durationMs: number;
  radius: number;
  color: number;
}

interface AmbientMote {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  drift: number;
}

export class GameScene extends Phaser.Scene {
  private snapshot: GameSnapshot | null = null;
  private graphics!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private screenLayer!: Phaser.GameObjects.Container;
  private hudBackdrop!: Phaser.GameObjects.Rectangle;
  private statusBackdrop!: Phaser.GameObjects.Rectangle;
  private localeButton!: Phaser.GameObjects.Text;

  private playerId: string | null = null;
  private selectedTower: TowerTypeId = "defender";
  private selectedDifficulty: DifficultyPreset = "normal";
  private screenMode: ScreenMode = "menu";
  private runEndSummary: RunSummary | null = null;
  private runEndProgression: PlayerProgression | null = null;
  private connectionMessage = "";
  private locale: Locale = "pt";

  private inputSendAccumulatorMs = 0;
  private pointerWorldX = 640;
  private pointerWorldY = 360;

  private latestProjectileTraceId = 0;
  private projectiles: ActiveProjectile[] = [];
  private ambientMotes: AmbientMote[] = [];

  private keys!: {
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    q: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
    one: Phaser.Input.Keyboard.Key;
    two: Phaser.Input.Keyboard.Key;
    three: Phaser.Input.Keyboard.Key;
  };

  constructor(
    private readonly client: GameClient,
    private readonly upgradeOverlay: UpgradeOverlay,
  ) {
    super("game");
  }

  create(): void {
    this.graphics = this.add.graphics();

    this.hudText = this.add
      .text(12, 10, "", {
        color: "#f3ecd5",
        fontSize: "17px",
        fontFamily: BODY_FONT,
        align: "left",
        lineSpacing: 3,
      })
      .setDepth(100);

    this.statusText = this.add
      .text(12, 670, "Pals Defence", {
        color: "#e8d8a8",
        fontSize: "14px",
        fontFamily: BODY_FONT,
      })
      .setDepth(100);

    this.hudBackdrop = this.add
      .rectangle(8, 8, 760, 112, 0x0d1919, 0.58)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xcab97a, 0.45)
      .setDepth(90);

    this.statusBackdrop = this.add
      .rectangle(8, 684, 620, 30, 0x0d1919, 0.58)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xcab97a, 0.45)
      .setDepth(90);

    this.screenLayer = this.add.container(0, 0).setDepth(300);
    this.ambientMotes = this.createAmbientMotes(52);
    this.locale = loadLocale();
    this.localeButton = this.add
      .text(1262, 12, tr(this.locale, "language_button"), {
        color: "#f2e8c6",
        fontSize: "18px",
        fontFamily: TITLE_FONT,
      })
      .setOrigin(1, 0)
      .setDepth(180)
      .setInteractive({ useHandCursor: true });
    this.localeButton.on("pointerover", () => {
      this.localeButton.setColor("#fff6de");
    });
    this.localeButton.on("pointerout", () => {
      this.localeButton.setColor("#f2e8c6");
    });
    this.localeButton.on("pointerdown", () => {
      this.handleToggleLocale();
    });

    this.keys = this.input.keyboard?.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
    }) as GameScene["keys"];

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.pointerWorldX = pointer.worldX;
      this.pointerWorldY = pointer.worldY;
    });

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.pointerWorldX = pointer.worldX;
      this.pointerWorldY = pointer.worldY;
      this.tryPlaceTower(pointer.worldX, pointer.worldY);
    });

    this.client.setHandlers({
      onConnected: (playerId) => {
        this.playerId = playerId;
        this.screenMode = "playing";
        this.connectionMessage = "";
        this.renderScreen();
      },
      onState: (snapshot) => {
        this.snapshot = snapshot;
        this.consumeProjectileTraces(snapshot.projectileTraces);

        if (this.screenMode === "playing" && snapshot.runStatus === "running") {
          const localHero = this.getLocalHero(snapshot);
          if (localHero?.state === "dead") {
            this.statusText.setText(tr(this.locale, "dead_hint"));
          } else if (localHero?.state === "downed") {
            const seconds = Math.ceil(localHero.downedRemainingMs / 1000);
            this.statusText.setText(tr(this.locale, "downed_hint", { seconds }));
          } else {
            this.statusText.setText(
              tr(this.locale, "control_hint", { tower: this.selectedTower.toUpperCase() }),
            );
          }
        }
      },
      onUpgradeOptions: (options) => {
        this.upgradeOverlay.show(options, (upgradeId) => {
          this.client.chooseUpgrade(upgradeId);
        }, this.locale);
      },
      onRunEnded: (summary, progression) => {
        this.upgradeOverlay.hide();
        this.projectiles = [];
        this.runEndSummary = summary;
        this.runEndProgression = progression;
        this.screenMode = "runEnd";
        this.renderScreen();
      },
      onError: (message) => {
        this.upgradeOverlay.hide();
        this.statusText.setText(message);
        const normalized = message.toLowerCase();
        const isConnectionError =
          normalized.includes("connection") || normalized.includes("failed to connect");
        if (isConnectionError) {
          this.connectionMessage = message;
          this.screenMode = "menu";
          this.renderScreen();
        }
      },
    });

    this.renderScreen();
  }

  update(_: number, delta: number): void {
    this.handleInput(delta);
    this.updateProjectiles(delta);
    this.updateAmbientMotes(delta);
    this.drawWorld();
    this.updateHud();
  }

  private handleInput(deltaMs: number): void {
    if (!this.keys) {
      return;
    }

    const localHero = this.getLocalHero();
    const isLocalHeroAlive = localHero !== null && localHero.state === "alive" && localHero.hp > 0;
    const canAct =
      this.screenMode === "playing" &&
      Boolean(this.snapshot) &&
      this.snapshot?.runStatus === "running" &&
      isLocalHeroAlive;

    if (Phaser.Input.Keyboard.JustDown(this.keys.one)) {
      this.selectedTower = "defender";
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.two)) {
      this.selectedTower = "archer";
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.three)) {
      this.selectedTower = "mage";
    }

    if (canAct && Phaser.Input.Keyboard.JustDown(this.keys.q)) {
      this.client.castSkill("arcaneBolt", this.pointerWorldX, this.pointerWorldY);
    }
    if (canAct && Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.client.castSkill("aetherPulse", this.pointerWorldX, this.pointerWorldY);
    }

    const dx = canAct ? Number(this.keys.d.isDown) - Number(this.keys.a.isDown) : 0;
    const dy = canAct ? Number(this.keys.s.isDown) - Number(this.keys.w.isDown) : 0;

    this.inputSendAccumulatorMs += deltaMs;
    if (this.inputSendAccumulatorMs >= 50) {
      this.inputSendAccumulatorMs = 0;
      this.client.sendInput(dx, dy);
    }
  }

  private tryPlaceTower(x: number, y: number): void {
    if (this.screenMode !== "playing" || !this.snapshot || this.snapshot.runStatus !== "running") {
      return;
    }
    const localHero = this.getLocalHero();
    if (!localHero || localHero.state !== "alive" || localHero.hp <= 0) {
      return;
    }

    const slotIndex = this.findClosestSlotIndex(x, y);
    if (slotIndex < 0) {
      return;
    }

    this.client.placeTower(this.selectedTower, slotIndex);
  }

  private findClosestSlotIndex(x: number, y: number): number {
    if (!this.snapshot) {
      return -1;
    }

    let bestIndex = -1;
    let bestDistance = 999999;

    for (let i = 0; i < this.snapshot.map.towerSlots.length; i += 1) {
      const slot = this.snapshot.map.towerSlots[i];
      const distance = Math.hypot(slot.x - x, slot.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    return bestDistance <= 32 ? bestIndex : -1;
  }

  private consumeProjectileTraces(traces: ProjectileTrace[]): void {
    for (const trace of traces) {
      if (trace.id <= this.latestProjectileTraceId) {
        continue;
      }

      this.latestProjectileTraceId = trace.id;
      this.projectiles.push({
        id: trace.id,
        kind: trace.kind,
        fromX: trace.from.x,
        fromY: trace.from.y,
        toX: trace.to.x,
        toY: trace.to.y,
        elapsedMs: 0,
        durationMs: trace.durationMs,
        radius: trace.radius,
        color: trace.color,
      });
    }
  }

  private updateProjectiles(deltaMs: number): void {
    for (const projectile of this.projectiles) {
      projectile.elapsedMs += deltaMs;
    }

    this.projectiles = this.projectiles.filter(
      (projectile) => projectile.elapsedMs < projectile.durationMs,
    );
  }

  private drawWorld(): void {
    this.graphics.clear();
    this.graphics.fillGradientStyle(0x182523, 0x182523, 0x0a1110, 0x0a1110, 1);
    this.graphics.fillRect(0, 0, 1280, 720);
    this.drawAmbientMotes();

    if (!this.snapshot) {
      return;
    }

    const snapshot = this.snapshot;

    this.graphics.fillGradientStyle(0x334734, 0x314332, 0x1d2a21, 0x19221c, 1);
    this.graphics.fillRect(0, 0, snapshot.map.width, snapshot.map.height);

    const terrainPulse = 0.55 + Math.sin(this.time.now / 1200) * 0.45;
    for (let i = 0; i < 8; i += 1) {
      const x = 110 + i * 150;
      const y = (i % 2 === 0 ? 150 : 540) + Math.sin((this.time.now + i * 300) / 900) * 18;
      this.graphics.fillStyle(0x466a4d, 0.08 + terrainPulse * 0.03);
      this.graphics.fillCircle(x, y, 72);
    }

    this.graphics.lineStyle(26, 0x3d3526, 0.68);
    for (const path of snapshot.map.paths) {
      for (let i = 0; i < path.length - 1; i += 1) {
        const from = path[i];
        const to = path[i + 1];
        this.graphics.lineBetween(from.x, from.y, to.x, to.y);
      }
    }

    this.graphics.lineStyle(15, 0x7f6844, 0.94);
    for (const path of snapshot.map.paths) {
      for (let i = 0; i < path.length - 1; i += 1) {
        const from = path[i];
        const to = path[i + 1];
        this.graphics.lineBetween(from.x, from.y, to.x, to.y);
      }
    }

    this.graphics.lineStyle(2, 0xe4cf95, 0.52);
    for (const path of snapshot.map.paths) {
      for (let i = 0; i < path.length - 1; i += 1) {
        const from = path[i];
        const to = path[i + 1];
        this.graphics.lineBetween(from.x, from.y, to.x, to.y);
      }
    }

    const basePulse = 0.5 + Math.sin(this.time.now / 260) * 0.5;
    this.graphics.fillStyle(0x2c7f6a, 0.95);
    this.graphics.fillCircle(snapshot.map.basePosition.x, snapshot.map.basePosition.y, 26);
    this.graphics.lineStyle(4, 0xbcf0de, 0.7);
    this.graphics.strokeCircle(snapshot.map.basePosition.x, snapshot.map.basePosition.y, 34 + basePulse * 3.5);
    this.graphics.lineStyle(2, 0x71dac3, 0.85);
    this.graphics.strokeCircle(snapshot.map.basePosition.x, snapshot.map.basePosition.y, 48 + basePulse * 7);

    const occupiedSlots = new Set<number>();
    for (const tower of snapshot.towers) {
      const slotIndex = snapshot.map.towerSlots.findIndex(
        (slot) => Math.hypot(slot.x - tower.x, slot.y - tower.y) < 2,
      );
      if (slotIndex >= 0) {
        occupiedSlots.add(slotIndex);
      }
    }

    for (let i = 0; i < snapshot.map.towerSlots.length; i += 1) {
      const slot = snapshot.map.towerSlots[i];
      const occupied = occupiedSlots.has(i);
      this.graphics.fillStyle(occupied ? 0x4c3f2a : 0x8f7e51, occupied ? 0.76 : 0.95);
      this.graphics.fillCircle(slot.x, slot.y, 14);
      this.graphics.lineStyle(2, occupied ? 0xb9a271 : 0xe8d39a, 0.88);
      this.graphics.strokeCircle(slot.x, slot.y, 14);
      this.graphics.lineStyle(1, 0xefe4c2, 0.6);
      this.graphics.strokeCircle(slot.x, slot.y, 8);
    }

    for (const tower of snapshot.towers) {
      this.drawTowerShape(tower.typeId, tower.x, tower.y);
    }

    for (const enemy of snapshot.enemies) {
      this.graphics.fillStyle(0x090807, 0.34);
      this.graphics.fillEllipse(enemy.x, enemy.y + (enemy.isBoss ? 12 : 8), enemy.isBoss ? 36 : 22, enemy.isBoss ? 13 : 8);
      this.graphics.fillStyle(enemy.isBoss ? BOSS_COLOR : ENEMY_COLOR, 1);
      this.graphics.fillCircle(enemy.x, enemy.y, enemy.isBoss ? 14 : 9);
      this.graphics.fillStyle(0xffe6dc, enemy.isBoss ? 0.2 : 0.17);
      this.graphics.fillCircle(enemy.x - 3, enemy.y - 4, enemy.isBoss ? 4 : 2.5);

      if (enemy.typeId === "elite" && enemy.eliteEmpoweredRemainingMs > 0) {
        const pulse = 1 + Math.sin(this.time.now / 95) * 1.3;
        this.graphics.lineStyle(2.5, 0xff9f4e, 0.95);
        this.graphics.strokeCircle(enemy.x, enemy.y, 14 + pulse * 1.2);
      }

      if (enemy.isBoss) {
        const phaseColor =
          enemy.bossPhase >= 3 ? 0xff4e7c : enemy.bossPhase >= 2 ? 0xffa55a : 0xd78294;
        this.graphics.lineStyle(3, phaseColor, 0.92);
        this.graphics.strokeCircle(enemy.x, enemy.y, 20 + enemy.bossPhase * 2);
        this.graphics.lineStyle(2, 0xffd7c4, 0.45);
        this.graphics.lineBetween(enemy.x - 8, enemy.y - 16, enemy.x, enemy.y - 22);
        this.graphics.lineBetween(enemy.x + 8, enemy.y - 16, enemy.x, enemy.y - 22);
      }

      if (enemy.poisonRemainingMs > 0 && enemy.poisonStacks > 0) {
        this.graphics.lineStyle(2, 0x7ad866, 0.85);
        this.graphics.strokeCircle(enemy.x, enemy.y, enemy.isBoss ? 18 : 12);
      }

      if (enemy.shockedRemainingMs > 0) {
        this.graphics.lineStyle(2, 0x86ecff, 0.85);
        this.graphics.strokeCircle(enemy.x, enemy.y, enemy.isBoss ? 21 : 15);
      }

      const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
      this.graphics.fillStyle(0x1f0f11, 0.95);
      this.graphics.fillRoundedRect(enemy.x - 13, enemy.y - 17, 26, 5, 2);
      this.graphics.fillStyle(0x9cca74, 1);
      this.graphics.fillRoundedRect(enemy.x - 13, enemy.y - 17, 26 * hpRatio, 5, 2);
    }

    for (const hero of snapshot.heroes) {
      const isLocalHero = hero.id === this.playerId;
      const heroColor =
        hero.state === "alive"
          ? (isLocalHero ? HERO_COLOR : 0xbababa)
          : hero.state === "downed"
            ? HERO_DOWNED_COLOR
            : HERO_DEAD_COLOR;
      this.graphics.fillStyle(0x090807, 0.35);
      this.graphics.fillEllipse(hero.x, hero.y + 11, 24, 10);
      this.graphics.fillStyle(heroColor, 1);
      this.graphics.fillCircle(hero.x, hero.y, 11);
      this.graphics.lineStyle(2.2, isLocalHero ? 0xfaf3cc : 0xd7d7d7, hero.state === "alive" ? 1 : 0.6);
      this.graphics.strokeCircle(hero.x, hero.y, 11);
      this.graphics.fillStyle(0xffffff, 0.18);
      this.graphics.fillCircle(hero.x - 3, hero.y - 4, 3.2);

      if (hero.state === "downed") {
        const reviveRatio = hero.reviveProgressMs > 0 ? hero.reviveProgressMs / 2800 : 0;
        this.graphics.lineStyle(2, 0x90f5a3, 0.9);
        this.graphics.strokeCircle(hero.x, hero.y, 14 + reviveRatio * 3);
      }

      if (hero.state === "dead") {
        this.graphics.lineStyle(2, 0x2e2727, 1);
        this.graphics.lineBetween(hero.x - 7, hero.y - 7, hero.x + 7, hero.y + 7);
        this.graphics.lineBetween(hero.x + 7, hero.y - 7, hero.x - 7, hero.y + 7);
      }
    }

    this.drawProjectiles();

    this.graphics.fillStyle(0x080907, 0.2);
    this.graphics.fillRect(0, 0, snapshot.map.width, 24);
    this.graphics.fillRect(0, snapshot.map.height - 24, snapshot.map.width, 24);
  }

  private drawTowerShape(typeId: TowerTypeId, x: number, y: number): void {
    const color = TOWER_COLORS[typeId];
    this.graphics.fillStyle(0x090807, 0.34);
    this.graphics.fillEllipse(x, y + 12, 24, 10);

    switch (typeId) {
      case "defender": {
        this.graphics.fillStyle(color, 1);
        this.graphics.fillRoundedRect(x - 11, y - 11, 22, 22, 5);
        this.graphics.lineStyle(2, 0xdce8c8, 0.6);
        this.graphics.strokeRoundedRect(x - 11, y - 11, 22, 22, 5);
        this.graphics.lineStyle(2, 0xe8f4d7, 0.65);
        this.graphics.lineBetween(x, y - 6, x, y + 7);
        break;
      }
      case "archer": {
        const triangle = [
          { x, y: y - 12 },
          { x: x + 12, y: y + 10 },
          { x: x - 12, y: y + 10 },
        ];
        this.graphics.fillStyle(color, 1);
        this.graphics.fillPoints(triangle, true);
        this.graphics.lineStyle(2, 0xe5f4c9, 0.62);
        this.graphics.strokePoints(triangle, true);
        this.graphics.lineStyle(1.5, 0xffffff, 0.45);
        this.graphics.lineBetween(x - 4, y + 4, x + 6, y - 2);
        break;
      }
      case "mage":
      default: {
        const crystal = [
          { x, y: y - 13 },
          { x: x + 11, y },
          { x, y: y + 13 },
          { x: x - 11, y },
        ];
        this.graphics.fillStyle(color, 1);
        this.graphics.fillPoints(crystal, true);
        this.graphics.lineStyle(2, 0xcff7ff, 0.64);
        this.graphics.strokePoints(crystal, true);
        this.graphics.lineStyle(2, 0x8bf4ff, 0.7);
        this.graphics.strokeCircle(x, y, 16);
        break;
      }
    }
  }

  private drawProjectiles(): void {
    for (const projectile of this.projectiles) {
      const progress = Phaser.Math.Clamp(projectile.elapsedMs / projectile.durationMs, 0, 1);

      if (projectile.kind === "enemy_boss_shockwave") {
        const radius = projectile.radius + progress * 72;
        this.graphics.lineStyle(4, projectile.color, Math.max(0, 1 - progress));
        this.graphics.strokeCircle(projectile.fromX, projectile.fromY, radius);
        continue;
      }

      if (projectile.kind === "enemy_boss_summon") {
        const pulse = projectile.radius + progress * 22;
        this.graphics.lineStyle(2.5, projectile.color, Math.max(0.15, 0.95 - progress * 0.8));
        this.graphics.strokeCircle(projectile.fromX, projectile.fromY, pulse);
        this.graphics.lineStyle(1.5, 0xffffff, Math.max(0, 0.7 - progress));
        this.graphics.strokeCircle(projectile.fromX, projectile.fromY, pulse * 0.65);
        continue;
      }

      if (projectile.kind === "enemy_elite_burst") {
        const radius = projectile.radius + progress * 18;
        this.graphics.lineStyle(3, projectile.color, Math.max(0, 1 - progress));
        this.graphics.strokeCircle(projectile.fromX, projectile.fromY, radius);
        continue;
      }

      const previousProgress = Phaser.Math.Clamp(
        (projectile.elapsedMs - 35) / projectile.durationMs,
        0,
        1,
      );

      const x = Phaser.Math.Linear(projectile.fromX, projectile.toX, progress);
      const y = Phaser.Math.Linear(projectile.fromY, projectile.toY, progress);

      const previousX = Phaser.Math.Linear(projectile.fromX, projectile.toX, previousProgress);
      const previousY = Phaser.Math.Linear(projectile.fromY, projectile.toY, previousProgress);

      this.graphics.lineStyle(Math.max(1, projectile.radius - 1), projectile.color, 0.5);
      this.graphics.lineBetween(previousX, previousY, x, y);
      this.graphics.fillStyle(projectile.color, 0.95);
      this.graphics.fillCircle(x, y, projectile.radius);

      if (projectile.kind === "skill_arcane_bolt") {
        this.graphics.lineStyle(1.5, 0xffffff, 0.45);
        this.graphics.strokeCircle(x, y, projectile.radius + 2);
      } else if (projectile.kind === "chain_lightning") {
        this.graphics.lineStyle(1.5, 0xffffff, 0.55);
        this.graphics.lineBetween(previousX, previousY, x, y);
      }
    }
  }

  private updateHud(): void {
    if (this.screenMode !== "playing") {
      this.hudText.setText("");
      this.hudBackdrop.setVisible(false);
      this.statusBackdrop.setVisible(false);
      return;
    }

    this.hudBackdrop.setVisible(true);
    this.statusBackdrop.setVisible(true);

    if (!this.snapshot) {
      this.hudText.setText(tr(this.locale, "connecting_title"));
      return;
    }

    const hero = this.snapshot.heroes.find((entry) => entry.id === this.playerId);
    const heroStateLabel =
      hero?.state === "downed"
        ? tr(this.locale, "hero_state_downed")
        : hero?.state === "dead"
          ? tr(this.locale, "hero_state_dead")
          : tr(this.locale, "hero_state_alive");
    const heroInfo = hero
      ? tr(this.locale, "hud_state", {
          state: heroStateLabel,
          hp: hero.hp,
          maxHp: hero.maxHp,
          gold: hero.gold,
          level: hero.level,
          xp: hero.xp,
          nextXp: hero.nextLevelXp,
          towers: this.snapshot.towers.filter((tower) => tower.ownerId === hero.id).length,
          maxTowers: hero.maxTowers,
        })
      : "Hero not joined yet";
    const boss = this.snapshot.enemies.find((enemy) => enemy.isBoss);
    const bossInfo = boss ? tr(this.locale, "boss_phase", { phase: boss.bossPhase }) : "";

    const skillsInfo = hero
      ? hero.skills
          .map((skill) => {
            const seconds = Math.ceil(skill.cooldownRemainingMs / 1000);
            const status = seconds > 0 ? `${seconds}s` : "READY";
            return `[${skill.hotkey}] ${skill.name}: ${status}`;
          })
          .join(" | ")
      : "";

    this.hudText.setText(
      [
        tr(this.locale, "hud_line_one", {
          difficulty: this.getDifficultyLabel(this.snapshot.difficulty),
          wave: this.snapshot.wave,
          totalWaves: this.snapshot.totalWaves,
          baseHp: this.snapshot.baseHp,
          baseMaxHp: this.snapshot.baseMaxHp,
          enemies: this.snapshot.enemies.length,
          boss: bossInfo,
        }),
        heroInfo,
        hero?.state === "downed"
          ? tr(this.locale, "downed_progress", {
              seconds: Math.ceil(hero.downedRemainingMs / 1000),
              progress: Math.round((hero.reviveProgressMs / 2800) * 100),
            })
          : "",
        skillsInfo,
      ].join("\n"),
    );
  }

  private renderScreen(): void {
    if (!this.screenLayer) {
      return;
    }

    this.screenLayer.removeAll(true);
    if (this.screenMode === "playing") {
      return;
    }

    const panel = this.addScreenPanel(640, 360, 860, 520);
    this.screenLayer.add(panel);

    switch (this.screenMode) {
      case "menu":
        this.renderMenuScreen();
        break;
      case "difficulty":
        this.renderDifficultyScreen();
        break;
      case "connecting":
        this.renderConnectingScreen();
        break;
      case "runEnd":
        this.renderRunEndScreen();
        break;
      default:
        break;
    }

    this.screenLayer.setAlpha(0);
    this.screenLayer.setY(16);
    this.tweens.add({
      targets: this.screenLayer,
      alpha: 1,
      y: 0,
      duration: 320,
      ease: "Cubic.Out",
    });
  }

  private renderMenuScreen(): void {
    this.statusText.setText(this.connectionMessage || tr(this.locale, "menu_status_default"));
    this.addScreenTitle(tr(this.locale, "menu_title"));
    this.addScreenSubtitle(tr(this.locale, "menu_subtitle"));
    this.addScreenLore(tr(this.locale, "menu_lore"), 280);

    this.addScreenButton(640, 390, 340, 56, tr(this.locale, "menu_start_run"), () => {
      this.screenMode = "difficulty";
      this.renderScreen();
    });
  }

  private renderDifficultyScreen(): void {
    this.statusText.setText(tr(this.locale, "difficulty_title"));
    this.addScreenTitle(tr(this.locale, "difficulty_title"));
    this.addScreenLore(tr(this.locale, "difficulty_lore"), 254);

    this.addDifficultyButton(640, 320, tr(this.locale, "difficulty_easy"), tr(this.locale, "difficulty_easy_desc"), () => {
      this.startRunWithDifficulty("easy");
    });
    this.addDifficultyButton(640, 398, tr(this.locale, "difficulty_normal"), tr(this.locale, "difficulty_normal_desc"), () => {
      this.startRunWithDifficulty("normal");
    });
    this.addDifficultyButton(640, 476, tr(this.locale, "difficulty_hard"), tr(this.locale, "difficulty_hard_desc"), () => {
      this.startRunWithDifficulty("hard");
    });
    this.addScreenButton(640, 566, 240, 44, tr(this.locale, "back"), () => {
      this.screenMode = "menu";
      this.renderScreen();
    });
  }

  private renderConnectingScreen(): void {
    this.statusText.setText(tr(this.locale, "connecting_status"));
    this.addScreenTitle(tr(this.locale, "connecting_title"));
    this.addScreenSubtitle(
      tr(this.locale, "connecting_difficulty", {
        difficulty: this.getDifficultyLabel(this.selectedDifficulty),
      }),
    );
    this.addScreenLore(tr(this.locale, "connecting_lore"), 322);
  }

  private renderRunEndScreen(): void {
    this.addScreenTitle(tr(this.locale, "run_end_title"));

    const runStatus = this.runEndSummary?.runStatus.toUpperCase() ?? "UNKNOWN";
    const wave = this.runEndSummary?.reachedWave ?? 0;
    const gold = this.runEndSummary?.goldEarned ?? 0;
    const essence = this.runEndProgression?.totalEssence ?? 0;

    const summaryText = this.add
      .text(
        640,
        325,
        [
          tr(this.locale, "run_end_status", { status: runStatus }),
          tr(this.locale, "run_end_wave", { wave }),
          tr(this.locale, "run_end_gold", { gold }),
          tr(this.locale, "run_end_essence", { essence }),
        ].join("\n"),
        {
          color: "#f0e8cf",
          fontSize: "25px",
          fontFamily: BODY_FONT,
          align: "center",
          lineSpacing: 10,
        },
      )
      .setOrigin(0.5)
      .setDepth(301);
    this.screenLayer.add(summaryText);

    this.addScreenButton(640, 470, 320, 50, tr(this.locale, "play_again"), () => {
      this.client.disconnect();
      this.screenMode = "difficulty";
      this.renderScreen();
    });
    this.addScreenButton(640, 535, 240, 44, tr(this.locale, "main_menu"), () => {
      this.client.disconnect();
      this.screenMode = "menu";
      this.renderScreen();
    });
  }

  private startRunWithDifficulty(difficulty: DifficultyPreset): void {
    this.selectedDifficulty = difficulty;
    this.connectionMessage = "";
    this.runEndSummary = null;
    this.runEndProgression = null;
    this.playerId = null;
    this.snapshot = null;
    this.latestProjectileTraceId = 0;
    this.projectiles = [];
    this.upgradeOverlay.hide();
    this.client.disconnect();
    this.screenMode = "connecting";
    this.renderScreen();
    this.client.connect({ difficulty });
  }

  private addScreenPanel(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Container {
    const panel = this.add.container(0, 0).setDepth(300);
    const backdrop = this.add.rectangle(640, 360, 1280, 720, 0x090c0e, 0.68).setDepth(300);
    const body = this.add
      .rectangle(x, y, width, height, 0x1a2526, 0.92)
      .setStrokeStyle(2, 0xbfa369, 0.85)
      .setDepth(301);
    const inner = this.add
      .rectangle(x, y, width - 26, height - 26, 0x101a1c, 0.55)
      .setStrokeStyle(1, 0xdbc48b, 0.4)
      .setDepth(301);
    const accent = this.add
      .rectangle(x, y - height / 2 + 58, width - 60, 2, 0xe3d5ad, 0.32)
      .setDepth(301);
    panel.add([backdrop, body, inner, accent]);
    return panel;
  }

  private addScreenTitle(text: string): void {
    const title = this.add
      .text(640, 165, text, {
        color: "#f4e7c2",
        fontSize: "56px",
        fontFamily: TITLE_FONT,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(301);
    this.screenLayer.add(title);
  }

  private addScreenSubtitle(text: string): void {
    const subtitle = this.add
      .text(640, 225, text, {
        color: "#d9c793",
        fontSize: "24px",
        fontFamily: BODY_FONT,
      })
      .setOrigin(0.5)
      .setDepth(301);
    this.screenLayer.add(subtitle);
  }

  private addScreenLore(text: string, y: number): void {
    const lore = this.add
      .text(640, y, text, {
        color: "#b8c3be",
        fontSize: "19px",
        fontFamily: BODY_FONT,
        align: "center",
        wordWrap: { width: 720 },
      })
      .setOrigin(0.5)
      .setDepth(301);
    this.screenLayer.add(lore);
  }

  private addDifficultyButton(
    x: number,
    y: number,
    label: string,
    description: string,
    onClick: () => void,
  ): void {
    this.addScreenButton(x, y, 520, 62, label, onClick);
    const desc = this.add
      .text(x, y + 27, description, {
        color: "#afbfba",
        fontSize: "14px",
        fontFamily: BODY_FONT,
      })
      .setOrigin(0.5)
      .setDepth(302);
    this.screenLayer.add(desc);
  }

  private addScreenButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0).setDepth(301);
    const rect = this.add
      .rectangle(x, y, width, height, 0x253134, 0.95)
      .setStrokeStyle(2, 0xcdb685, 0.95)
      .setDepth(301);
    const sheen = this.add
      .rectangle(x, y - height * 0.18, width - 14, height * 0.34, 0xf4e4b6, 0.1)
      .setDepth(302);
    const text = this.add
      .text(x, y, label, {
        color: "#f6edda",
        fontSize: "24px",
        fontFamily: TITLE_FONT,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(302);

    rect.setInteractive({ useHandCursor: true });
    rect.on("pointerover", () => {
      rect.setFillStyle(0x334347, 1);
      this.tweens.add({ targets: [rect, sheen], scaleX: 1.02, scaleY: 1.06, duration: 120 });
    });
    rect.on("pointerout", () => {
      rect.setFillStyle(0x253134, 0.95);
      this.tweens.add({ targets: [rect, sheen], scaleX: 1, scaleY: 1, duration: 120 });
    });
    rect.on("pointerdown", () => {
      onClick();
    });

    container.add([rect, sheen, text]);
    this.screenLayer.add(container);
    return container;
  }

  private handleToggleLocale(): void {
    this.locale = toggleLocale(this.locale);
    saveLocale(this.locale);
    this.localeButton.setText(tr(this.locale, "language_button"));

    if (this.screenMode !== "playing") {
      this.renderScreen();
    } else if (this.snapshot?.runStatus === "running") {
      const localHero = this.getLocalHero();
      if (localHero?.state === "dead") {
        this.statusText.setText(tr(this.locale, "dead_hint"));
      } else if (localHero?.state === "downed") {
        this.statusText.setText(
          tr(this.locale, "downed_hint", {
            seconds: Math.ceil(localHero.downedRemainingMs / 1000),
          }),
        );
      } else {
        this.statusText.setText(
          tr(this.locale, "control_hint", { tower: this.selectedTower.toUpperCase() }),
        );
      }
    }
  }

  private getDifficultyLabel(difficulty: DifficultyPreset): string {
    switch (difficulty) {
      case "easy":
        return tr(this.locale, "difficulty_easy");
      case "hard":
        return tr(this.locale, "difficulty_hard");
      case "normal":
      default:
        return tr(this.locale, "difficulty_normal");
    }
  }

  private createAmbientMotes(count: number): AmbientMote[] {
    const motes: AmbientMote[] = [];
    for (let i = 0; i < count; i += 1) {
      motes.push({
        x: Phaser.Math.Between(0, 1280),
        y: Phaser.Math.Between(0, 720),
        size: Phaser.Math.FloatBetween(0.6, 2.2),
        speed: Phaser.Math.FloatBetween(5, 17),
        alpha: Phaser.Math.FloatBetween(0.05, 0.22),
        drift: Phaser.Math.FloatBetween(-12, 12),
      });
    }
    return motes;
  }

  private updateAmbientMotes(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const mote of this.ambientMotes) {
      mote.y += mote.speed * dt;
      mote.x += Math.sin((this.time.now / 1000) + mote.drift) * 0.07;

      if (mote.y > 724) {
        mote.y = -4;
        mote.x = Phaser.Math.Between(0, 1280);
      }
      if (mote.x < -6) {
        mote.x = 1286;
      } else if (mote.x > 1286) {
        mote.x = -6;
      }
    }
  }

  private drawAmbientMotes(): void {
    for (const mote of this.ambientMotes) {
      this.graphics.fillStyle(0xe6e8cf, mote.alpha);
      this.graphics.fillCircle(mote.x, mote.y, mote.size);
    }
  }

  private getLocalHero(snapshot = this.snapshot) {
    if (!snapshot || !this.playerId) {
      return null;
    }

    return snapshot.heroes.find((entry) => entry.id === this.playerId) ?? null;
  }
}
