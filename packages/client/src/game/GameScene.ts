import type {
  DifficultyPreset,
  GameSnapshot,
  PlayerProgression,
  ProjectileTrace,
  RunSummary,
  TowerTypeId,
} from "@pals-defence/shared";
import Phaser from "phaser";

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

export class GameScene extends Phaser.Scene {
  private snapshot: GameSnapshot | null = null;
  private graphics!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private screenLayer!: Phaser.GameObjects.Container;

  private playerId: string | null = null;
  private selectedTower: TowerTypeId = "defender";
  private selectedDifficulty: DifficultyPreset = "normal";
  private screenMode: ScreenMode = "menu";
  private runEndSummary: RunSummary | null = null;
  private runEndProgression: PlayerProgression | null = null;
  private connectionMessage = "";

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
      .text(12, 10, "", {
        color: "#f1eddc",
        fontSize: "16px",
        fontFamily: "Trebuchet MS",
        align: "left",
      })
      .setDepth(100);

    this.statusText = this.add
      .text(12, 670, "Pals Defence", {
        color: "#e2d2a2",
        fontSize: "14px",
        fontFamily: "Trebuchet MS",
      })
      .setDepth(100);

    this.screenLayer = this.add.container(0, 0).setDepth(300);

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
            this.statusText.setText(
              "Pals Defence | Hero defeated. Aguarde o fim da run ou reset.",
            );
          } else if (localHero?.state === "downed") {
            const seconds = Math.ceil(localHero.downedRemainingMs / 1000);
            this.statusText.setText(
              `Pals Defence | DOWNED: ${seconds}s para sangrar. Aproximacao de aliado revive.`,
            );
          } else {
            this.statusText.setText(
              `Pals Defence | Tower [1][2][3] ${this.selectedTower.toUpperCase()} | Skill [Q] Arcane Bolt [E] Aether Pulse | Click slot to place tower`,
            );
          }
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
    this.graphics.fillStyle(0x1d1a13, 1);
    this.graphics.fillRect(0, 0, 1280, 720);

    if (!this.snapshot) {
      return;
    }

    const snapshot = this.snapshot;

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

      if (enemy.typeId === "elite" && enemy.eliteEmpoweredRemainingMs > 0) {
        const pulse = 1 + Math.sin(this.time.now / 95) * 1.3;
        this.graphics.lineStyle(2, 0xff9f4e, 0.95);
        this.graphics.strokeCircle(enemy.x, enemy.y, 14 + pulse);
      }

      if (enemy.isBoss) {
        const phaseColor =
          enemy.bossPhase >= 3 ? 0xff4e7c : enemy.bossPhase >= 2 ? 0xffa55a : 0xd78294;
        this.graphics.lineStyle(3, phaseColor, 0.88);
        this.graphics.strokeCircle(enemy.x, enemy.y, 20 + enemy.bossPhase * 2);
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
      this.graphics.fillStyle(0x240e0e, 1);
      this.graphics.fillRect(enemy.x - 12, enemy.y - 16, 24, 4);
      this.graphics.fillStyle(0x89c167, 1);
      this.graphics.fillRect(enemy.x - 12, enemy.y - 16, 24 * hpRatio, 4);
    }

    for (const hero of snapshot.heroes) {
      const isLocalHero = hero.id === this.playerId;
      const heroColor =
        hero.state === "alive"
          ? (isLocalHero ? HERO_COLOR : 0xbababa)
          : hero.state === "downed"
            ? HERO_DOWNED_COLOR
            : HERO_DEAD_COLOR;
      this.graphics.fillStyle(heroColor, 1);
      this.graphics.fillCircle(hero.x, hero.y, 11);
      this.graphics.lineStyle(2, isLocalHero ? 0xfaf3cc : 0xd7d7d7, hero.state === "alive" ? 1 : 0.6);
      this.graphics.strokeCircle(hero.x, hero.y, 11);

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
      return;
    }

    if (!this.snapshot) {
      this.hudText.setText("Connecting...");
      return;
    }

    const hero = this.snapshot.heroes.find((entry) => entry.id === this.playerId);
    const heroStateLabel =
      hero?.state === "downed" ? "DOWNED" : hero?.state === "dead" ? "DEAD" : "ALIVE";
    const heroInfo = hero
      ? `State ${heroStateLabel} | HP ${hero.hp}/${hero.maxHp} | Gold ${hero.gold} | Lv ${hero.level} | XP ${hero.xp}/${hero.nextLevelXp} | Towers ${this.snapshot.towers.filter((tower) => tower.ownerId === hero.id).length}/${hero.maxTowers}`
      : "Hero not joined yet";
    const boss = this.snapshot.enemies.find((enemy) => enemy.isBoss);
    const bossInfo = boss ? ` | Boss Phase ${boss.bossPhase}` : "";

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
        `Difficulty ${this.snapshot.difficulty.toUpperCase()} | Wave ${this.snapshot.wave}/${this.snapshot.totalWaves} | Base ${this.snapshot.baseHp}/${this.snapshot.baseMaxHp} | Enemies ${this.snapshot.enemies.length}${bossInfo}`,
        heroInfo,
        hero?.state === "downed"
          ? `Downed Timer ${Math.ceil(hero.downedRemainingMs / 1000)}s | Revive ${Math.round(
              (hero.reviveProgressMs / 2800) * 100,
            )}%`
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
      case "playing":
      default:
        break;
    }
  }

  private renderMenuScreen(): void {
    this.statusText.setText(this.connectionMessage || "Escolha como deseja iniciar.");
    this.addModalBackground(0.62);
    this.addScreenTitle("Pals Defence");
    this.addScreenSubtitle("Roguelite Tower Defense");

    this.addScreenButton(640, 350, 320, 52, "Start Run", () => {
      this.screenMode = "difficulty";
      this.renderScreen();
    });
  }

  private renderDifficultyScreen(): void {
    this.statusText.setText("Selecione a dificuldade da sala.");
    this.addModalBackground(0.62);
    this.addScreenTitle("Select Difficulty");

    this.addScreenButton(640, 290, 360, 52, "Easy", () => {
      this.startRunWithDifficulty("easy");
    });
    this.addScreenButton(640, 360, 360, 52, "Normal", () => {
      this.startRunWithDifficulty("normal");
    });
    this.addScreenButton(640, 430, 360, 52, "Hard", () => {
      this.startRunWithDifficulty("hard");
    });
    this.addScreenButton(640, 520, 240, 44, "Back", () => {
      this.screenMode = "menu";
      this.renderScreen();
    });
  }

  private renderConnectingScreen(): void {
    this.statusText.setText("Conectando ao servidor...");
    this.addModalBackground(0.58);
    this.addScreenTitle("Connecting");
    this.addScreenSubtitle(`Difficulty: ${this.selectedDifficulty.toUpperCase()}`);
  }

  private renderRunEndScreen(): void {
    this.addModalBackground(0.68);
    this.addScreenTitle("Run Ended");

    const runStatus = this.runEndSummary?.runStatus.toUpperCase() ?? "UNKNOWN";
    const wave = this.runEndSummary?.reachedWave ?? 0;
    const gold = this.runEndSummary?.goldEarned ?? 0;
    const essence = this.runEndProgression?.totalEssence ?? 0;

    const summaryText = this.add
      .text(
        640,
        325,
        `Status: ${runStatus}\nWave: ${wave}\nGold: ${gold}\nEssence: ${essence}`,
        {
          color: "#f0e8cf",
          fontSize: "24px",
          fontFamily: "Trebuchet MS",
          align: "center",
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5)
      .setDepth(301);
    this.screenLayer.add(summaryText);

    this.addScreenButton(640, 470, 320, 50, "Play Again", () => {
      this.client.disconnect();
      this.screenMode = "difficulty";
      this.renderScreen();
    });
    this.addScreenButton(640, 535, 240, 44, "Main Menu", () => {
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

  private addModalBackground(alpha: number): void {
    const backdrop = this.add
      .rectangle(640, 360, 1280, 720, 0x0e0d0b, alpha)
      .setDepth(300);
    this.screenLayer.add(backdrop);
  }

  private addScreenTitle(text: string): void {
    const title = this.add
      .text(640, 165, text, {
        color: "#f6ebc7",
        fontSize: "52px",
        fontFamily: "Trebuchet MS",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(301);
    this.screenLayer.add(title);
  }

  private addScreenSubtitle(text: string): void {
    const subtitle = this.add
      .text(640, 225, text, {
        color: "#e6d5a7",
        fontSize: "24px",
        fontFamily: "Trebuchet MS",
      })
      .setOrigin(0.5)
      .setDepth(301);
    this.screenLayer.add(subtitle);
  }

  private addScreenButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
  ): void {
    const rect = this.add
      .rectangle(x, y, width, height, 0x2e2a21, 0.95)
      .setStrokeStyle(2, 0xcdba88, 0.95)
      .setDepth(301);
    const text = this.add
      .text(x, y, label, {
        color: "#f5edda",
        fontSize: "24px",
        fontFamily: "Trebuchet MS",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(302);

    rect.setInteractive({ useHandCursor: true });
    rect.on("pointerover", () => {
      rect.setFillStyle(0x3e392c, 0.98);
    });
    rect.on("pointerout", () => {
      rect.setFillStyle(0x2e2a21, 0.95);
    });
    rect.on("pointerdown", () => {
      onClick();
    });

    this.screenLayer.add(rect);
    this.screenLayer.add(text);
  }

  private getLocalHero(snapshot = this.snapshot) {
    if (!snapshot || !this.playerId) {
      return null;
    }

    return snapshot.heroes.find((entry) => entry.id === this.playerId) ?? null;
  }
}
