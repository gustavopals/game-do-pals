import type { GameSnapshot, ProjectileTrace, TowerTypeId } from "@pals-defence/shared";
import Phaser from "phaser";

import { GameClient } from "../network/GameClient";
import { UpgradeOverlay } from "../ui/UpgradeOverlay";

const TOWER_COLORS: Record<TowerTypeId, number> = {
  defender: 0x6f7f5a,
  archer: 0x8ccf4f,
  mage: 0x4ec7d8,
};

const HERO_COLOR = 0xeadb9b;
const ENEMY_COLOR = 0xd45757;
const BOSS_COLOR = 0x8f253d;

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

export class GameScene extends Phaser.Scene {
  private snapshot: GameSnapshot | null = null;
  private graphics!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  private playerId: string | null = null;
  private selectedTower: TowerTypeId = "defender";

  private inputSendAccumulatorMs = 0;
  private pointerWorldX = 640;
  private pointerWorldY = 360;

  private latestProjectileTraceId = 0;
  private projectiles: ActiveProjectile[] = [];

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
      .text(12, 10, "Connecting...", {
        color: "#f1eddc",
        fontSize: "16px",
        fontFamily: "Trebuchet MS",
        align: "left",
      })
      .setDepth(100);

    this.statusText = this.add
      .text(12, 670, "", {
        color: "#e2d2a2",
        fontSize: "14px",
        fontFamily: "Trebuchet MS",
      })
      .setDepth(100);

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
      },
      onState: (snapshot) => {
        this.snapshot = snapshot;
        this.consumeProjectileTraces(snapshot.projectileTraces);

        if (snapshot.runStatus === "running") {
          this.statusText.setText(
            `Pals Defence | Tower [1][2][3] ${this.selectedTower.toUpperCase()} | Skill [Q] Arcane Bolt [E] Aether Pulse | Click slot to place tower`,
          );
        }
      },
      onUpgradeOptions: (options) => {
        this.upgradeOverlay.show(options, (upgradeId) => {
          this.client.chooseUpgrade(upgradeId);
        });
      },
      onRunEnded: (summary, progression) => {
        this.upgradeOverlay.hide();
        this.projectiles = [];
        this.statusText.setText(
          `Run ${summary.runStatus.toUpperCase()} | Wave ${summary.reachedWave} | Gold ${summary.goldEarned} | Essence ${progression.totalEssence}`,
        );
      },
      onError: (message) => {
        this.statusText.setText(message);
      },
    });

    this.client.connect();
  }

  update(_: number, delta: number): void {
    this.handleInput(delta);
    this.updateProjectiles(delta);
    this.drawWorld();
    this.updateHud();
  }

  private handleInput(deltaMs: number): void {
    if (!this.keys) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.one)) {
      this.selectedTower = "defender";
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.two)) {
      this.selectedTower = "archer";
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.three)) {
      this.selectedTower = "mage";
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.q)) {
      this.client.castSkill("arcaneBolt", this.pointerWorldX, this.pointerWorldY);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.client.castSkill("aetherPulse", this.pointerWorldX, this.pointerWorldY);
    }

    const dx = Number(this.keys.d.isDown) - Number(this.keys.a.isDown);
    const dy = Number(this.keys.s.isDown) - Number(this.keys.w.isDown);

    this.inputSendAccumulatorMs += deltaMs;
    if (this.inputSendAccumulatorMs >= 50) {
      this.inputSendAccumulatorMs = 0;
      this.client.sendInput(dx, dy);
    }
  }

  private tryPlaceTower(x: number, y: number): void {
    if (!this.snapshot || this.snapshot.runStatus !== "running") {
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
    if (!this.snapshot) {
      return;
    }

    const snapshot = this.snapshot;

    this.graphics.clear();

    this.graphics.fillStyle(0x252118, 1);
    this.graphics.fillRect(0, 0, snapshot.map.width, snapshot.map.height);

    this.graphics.lineStyle(18, 0x5f5338, 0.9);
    for (const path of snapshot.map.paths) {
      for (let i = 0; i < path.length - 1; i += 1) {
        const from = path[i];
        const to = path[i + 1];
        this.graphics.lineBetween(from.x, from.y, to.x, to.y);
      }
    }

    this.graphics.fillStyle(0x2f7f57, 1);
    this.graphics.fillCircle(snapshot.map.basePosition.x, snapshot.map.basePosition.y, 24);

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
      this.graphics.fillStyle(occupied ? 0x4c3f2a : 0x86764d, 1);
      this.graphics.fillCircle(slot.x, slot.y, 14);
      this.graphics.lineStyle(2, 0xdcc690, 0.8);
      this.graphics.strokeCircle(slot.x, slot.y, 14);
    }

    for (const tower of snapshot.towers) {
      this.graphics.fillStyle(TOWER_COLORS[tower.typeId], 1);
      this.graphics.fillRect(tower.x - 10, tower.y - 10, 20, 20);
    }

    for (const enemy of snapshot.enemies) {
      this.graphics.fillStyle(enemy.isBoss ? BOSS_COLOR : ENEMY_COLOR, 1);
      this.graphics.fillCircle(enemy.x, enemy.y, enemy.isBoss ? 14 : 9);

      const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
      this.graphics.fillStyle(0x240e0e, 1);
      this.graphics.fillRect(enemy.x - 12, enemy.y - 16, 24, 4);
      this.graphics.fillStyle(0x89c167, 1);
      this.graphics.fillRect(enemy.x - 12, enemy.y - 16, 24 * hpRatio, 4);
    }

    for (const hero of snapshot.heroes) {
      const isLocalHero = hero.id === this.playerId;
      this.graphics.fillStyle(isLocalHero ? HERO_COLOR : 0xbababa, 1);
      this.graphics.fillCircle(hero.x, hero.y, 11);
      this.graphics.lineStyle(2, isLocalHero ? 0xfaf3cc : 0xd7d7d7, 1);
      this.graphics.strokeCircle(hero.x, hero.y, 11);
    }

    this.drawProjectiles();
  }

  private drawProjectiles(): void {
    for (const projectile of this.projectiles) {
      const progress = Phaser.Math.Clamp(projectile.elapsedMs / projectile.durationMs, 0, 1);
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
      }
    }
  }

  private updateHud(): void {
    if (!this.snapshot) {
      this.hudText.setText("Waiting for snapshot...");
      return;
    }

    const hero = this.snapshot.heroes.find((entry) => entry.id === this.playerId);
    const heroInfo = hero
      ? `HP ${hero.hp}/${hero.maxHp} | Gold ${hero.gold} | Lv ${hero.level} | XP ${hero.xp}/${hero.nextLevelXp} | Towers ${this.snapshot.towers.filter((tower) => tower.ownerId === hero.id).length}/${hero.maxTowers}`
      : "Hero not joined yet";

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
        `Wave ${this.snapshot.wave}/${this.snapshot.totalWaves} | Base ${this.snapshot.baseHp}/${this.snapshot.baseMaxHp} | Enemies ${this.snapshot.enemies.length}`,
        heroInfo,
        skillsInfo,
      ].join("\n"),
    );
  }
}
