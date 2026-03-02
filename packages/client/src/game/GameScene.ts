import type {
  DifficultyPreset,
  EnemySnapshot,
  GameSnapshot,
  HeroSnapshot,
  MapConfig,
  PlayerProgression,
  ProjectileTrace,
  RunSummary,
  TowerTypeId,
} from "@pals-defence/shared";
import Phaser from "phaser";

import {
  loadLocale,
  saveLocale,
  toggleLocale,
  tr,
  trSkillName,
  type Locale,
} from "../i18n";
import { GameClient } from "../network/GameClient";
import { UpgradeOverlay } from "../ui/UpgradeOverlay";
import {
  ENEMY_TEXTURE_KEYS,
  ENEMY_TINTS,
  HERO_TEXTURE_KEYS,
  PIXEL_PALETTE,
  PIXEL_TEXTURES,
  TOWER_TEXTURE_KEYS,
} from "./assets/pixelArtCatalog";
import { DEFAULT_MAP_LAYER_CONFIG, type MapLayerConfig } from "./assets/mapLayerConfig";

const TITLE_FONT = '"Cinzel", "Palatino Linotype", serif';
const BODY_FONT = '"Spectral", "Segoe UI", serif';
const TERRAIN_TILE_SIZE = 16;

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
  private mapTexture: Phaser.GameObjects.RenderTexture | null = null;
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
  private mapLayerConfig: MapLayerConfig = DEFAULT_MAP_LAYER_CONFIG;
  private pixelTexturesReady = false;
  private mapRenderSignature = "";

  private towerSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private enemySprites = new Map<number, Phaser.GameObjects.Sprite>();
  private heroSprites = new Map<string, Phaser.GameObjects.Sprite>();

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

  preload(): void {
    this.load.json("map-layers-wardens-field", "assets/maps/wardens-field.layers.json");
  }

  create(): void {
    this.resolveMapLayerConfig();
    this.ensurePixelTextures();
    this.mapTexture = this.add
      .renderTexture(0, 0, 1280, 720)
      .setOrigin(0)
      .setDepth(5);
    this.graphics = this.add.graphics().setDepth(80);

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
            this.statusText.setText(this.getControlHintText());
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
    this.syncEntitySprites();
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
    this.drawAmbientMotes();

    if (!this.snapshot) {
      this.mapTexture?.setVisible(false);
      return;
    }

    const snapshot = this.snapshot;
    this.ensureMapRender(snapshot.map);
    this.mapTexture?.setVisible(true);

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

    this.drawEnemyOverlays(snapshot.enemies);
    this.drawHeroOverlays(snapshot.heroes);

    this.drawProjectiles();

    this.drawPixelVignette(snapshot.map.width, snapshot.map.height);
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
      : tr(this.locale, "hero_not_joined");
    const boss = this.snapshot.enemies.find((enemy) => enemy.isBoss);
    const bossInfo = boss ? tr(this.locale, "boss_phase", { phase: boss.bossPhase }) : "";

    const skillsInfo = hero
      ? hero.skills
          .map((skill) => {
            const seconds = Math.ceil(skill.cooldownRemainingMs / 1000);
            const status = seconds > 0 ? `${seconds}s` : tr(this.locale, "skill_ready");
            const skillName = trSkillName(this.locale, skill.id, skill.name);
            return `[${skill.hotkey}] ${skillName}: ${status}`;
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

    const runStatus = this.getRunStatusLabel(this.runEndSummary?.runStatus);
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
    this.clearEntitySprites();
    this.mapTexture?.setVisible(false);
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
        this.statusText.setText(this.getControlHintText());
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

  private getTowerLabel(towerType: TowerTypeId): string {
    switch (towerType) {
      case "defender":
        return tr(this.locale, "tower_defender");
      case "archer":
        return tr(this.locale, "tower_archer");
      case "mage":
      default:
        return tr(this.locale, "tower_mage");
    }
  }

  private getControlHintText(): string {
    return tr(this.locale, "control_hint", {
      tower: this.getTowerLabel(this.selectedTower),
      skillQ: trSkillName(this.locale, "arcaneBolt", "Arcane Bolt"),
      skillE: trSkillName(this.locale, "aetherPulse", "Aether Pulse"),
    });
  }

  private getRunStatusLabel(runStatus: RunSummary["runStatus"] | undefined): string {
    if (runStatus === "won") {
      return tr(this.locale, "run_status_won");
    }
    if (runStatus === "lost") {
      return tr(this.locale, "run_status_lost");
    }
    return tr(this.locale, "run_status_unknown");
  }

  private resolveMapLayerConfig(): void {
    const loaded = this.cache.json.get("map-layers-wardens-field");
    if (!loaded || typeof loaded !== "object") {
      this.mapLayerConfig = DEFAULT_MAP_LAYER_CONFIG;
      return;
    }

    const candidate = loaded as Partial<MapLayerConfig>;
    if (!candidate.ground || !candidate.path || !Array.isArray(candidate.decorRules)) {
      this.mapLayerConfig = DEFAULT_MAP_LAYER_CONFIG;
      return;
    }

    this.mapLayerConfig = {
      ...DEFAULT_MAP_LAYER_CONFIG,
      ...candidate,
      ground: {
        ...DEFAULT_MAP_LAYER_CONFIG.ground,
        ...candidate.ground,
      },
      path: {
        ...DEFAULT_MAP_LAYER_CONFIG.path,
        ...candidate.path,
      },
      decorRules: candidate.decorRules.map((rule) => ({
        ...rule,
      })),
    };
  }

  private ensurePixelTextures(): void {
    if (this.pixelTexturesReady) {
      return;
    }

    for (const texture of PIXEL_TEXTURES) {
      this.generatePixelTexture(texture.key, texture.data, texture.pixelWidth ?? 2);
    }

    this.pixelTexturesReady = true;
  }

  private generatePixelTexture(key: string, data: string[], pixelWidth = 2): void {
    if (this.textures.exists(key)) {
      return;
    }

    this.textures.generate(key, {
      data,
      pixelWidth,
      pixelHeight: pixelWidth,
      palette: PIXEL_PALETTE,
    });
  }

  private ensureMapRender(map: MapConfig): void {
    const config = this.mapLayerConfig;
    const tileSize = Math.max(4, Math.floor(config.tileSize || TERRAIN_TILE_SIZE));
    const pathRadius = Math.max(0, Math.round(config.path.radiusTiles));
    const sampleStepPx = Math.max(1, config.path.sampleStepPx);
    const signature = `${map.id}:${map.width}x${map.height}:v${config.version}`;
    if (!this.mapTexture) {
      this.mapTexture = this.add
        .renderTexture(0, 0, map.width, map.height)
        .setOrigin(0)
        .setDepth(5);
      this.mapRenderSignature = "";
    } else if (this.mapTexture.width !== map.width || this.mapTexture.height !== map.height) {
      this.mapTexture.destroy();
      this.mapTexture = this.add
        .renderTexture(0, 0, map.width, map.height)
        .setOrigin(0)
        .setDepth(5);
      this.mapRenderSignature = "";
    }

    if (this.mapRenderSignature === signature) {
      return;
    }

    this.mapTexture.clear();

    const tileWidth = Math.ceil(map.width / tileSize);
    const tileHeight = Math.ceil(map.height / tileSize);

    for (let ty = 0; ty < tileHeight; ty += 1) {
      for (let tx = 0; tx < tileWidth; tx += 1) {
        const noise = this.tileNoise(tx, ty);
        let key = config.ground.highTile;
        if (noise <= config.ground.lowMaxNoise) {
          key = config.ground.lowTile;
        } else if (noise <= config.ground.midMaxNoise) {
          key = config.ground.midTile;
        }
        this.mapTexture.drawFrame(key, undefined, tx * tileSize, ty * tileSize);
      }
    }

    const pathTiles = new Set<string>();
    for (const path of map.paths) {
      for (let i = 0; i < path.length - 1; i += 1) {
        const from = path[i];
        const to = path[i + 1];
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        const steps = Math.max(1, Math.ceil(distance / sampleStepPx));

        for (let step = 0; step <= steps; step += 1) {
          const progress = step / steps;
          const px = Phaser.Math.Linear(from.x, to.x, progress);
          const py = Phaser.Math.Linear(from.y, to.y, progress);
          const centerTx = Math.floor(px / tileSize);
          const centerTy = Math.floor(py / tileSize);

          for (let oy = -pathRadius; oy <= pathRadius; oy += 1) {
            for (let ox = -pathRadius; ox <= pathRadius; ox += 1) {
              if (Math.hypot(ox, oy) > pathRadius + 0.45) {
                continue;
              }
              pathTiles.add(`${centerTx + ox}:${centerTy + oy}`);
            }
          }
        }
      }
    }

    for (const tileKey of pathTiles) {
      const [rawTx, rawTy] = tileKey.split(":");
      const tx = Number(rawTx);
      const ty = Number(rawTy);
      if (tx < 0 || ty < 0 || tx >= tileWidth || ty >= tileHeight) {
        continue;
      }

      const noise = this.tileNoise(tx + config.path.noiseOffsetX, ty + config.path.noiseOffsetY);
      const key = noise > config.path.mixThreshold ? config.path.tileA : config.path.tileB;
      this.mapTexture.drawFrame(key, undefined, tx * tileSize, ty * tileSize);
    }

    const towerTiles = new Set<string>(
      map.towerSlots.map((slot) => {
        const tx = Math.floor(slot.x / tileSize);
        const ty = Math.floor(slot.y / tileSize);
        return `${tx}:${ty}`;
      }),
    );
    const baseTx = Math.floor(map.basePosition.x / tileSize);
    const baseTy = Math.floor(map.basePosition.y / tileSize);

    for (let ty = 0; ty < tileHeight; ty += 1) {
      for (let tx = 0; tx < tileWidth; tx += 1) {
        const key = `${tx}:${ty}`;
        if (pathTiles.has(key) || towerTiles.has(key)) {
          continue;
        }

        if (Math.hypot(tx - baseTx, ty - baseTy) < config.minBaseClearRadiusTiles) {
          continue;
        }

        const worldX = tx * tileSize;
        const worldY = ty * tileSize;

        for (const rule of config.decorRules) {
          const noise = this.tileNoise(
            tx * rule.noiseScaleX + rule.noiseOffsetX,
            ty * rule.noiseScaleY + rule.noiseOffsetY,
          );
          if (noise >= rule.minNoise && noise < rule.maxNoise) {
            this.mapTexture.drawFrame(rule.texture, undefined, worldX, worldY);
            break;
          }
        }
      }
    }

    this.mapRenderSignature = signature;
  }

  private syncEntitySprites(): void {
    if (!this.snapshot) {
      this.clearEntitySprites();
      return;
    }

    this.syncTowerSprites(this.snapshot);
    this.syncEnemySprites(this.snapshot);
    this.syncHeroSprites(this.snapshot);
  }

  private syncTowerSprites(snapshot: GameSnapshot): void {
    const activeTowerIds = new Set<number>();

    for (const tower of snapshot.towers) {
      activeTowerIds.add(tower.id);

      let sprite = this.towerSprites.get(tower.id);
      if (!sprite) {
        sprite = this.add
          .sprite(tower.x, tower.y, this.getTowerTextureKey(tower.typeId))
          .setOrigin(0.5, 0.8);
        this.towerSprites.set(tower.id, sprite);
      }

      sprite.setTexture(this.getTowerTextureKey(tower.typeId));
      const bobY = Math.sin((this.time.now + tower.id * 121) / 340) * 0.55;
      sprite.setPosition(tower.x, tower.y + bobY);
      sprite.setDepth(30 + tower.y * 0.05);
      sprite.setAlpha(1);
    }

    for (const [towerId, sprite] of this.towerSprites.entries()) {
      if (activeTowerIds.has(towerId)) {
        continue;
      }
      sprite.destroy();
      this.towerSprites.delete(towerId);
    }
  }

  private syncEnemySprites(snapshot: GameSnapshot): void {
    const activeEnemyIds = new Set<number>();

    for (const enemy of snapshot.enemies) {
      activeEnemyIds.add(enemy.id);

      let sprite = this.enemySprites.get(enemy.id);
      if (!sprite) {
        sprite = this.add
          .sprite(enemy.x, enemy.y, this.getEnemyTextureKey(enemy))
          .setOrigin(0.5, 0.78);
        this.enemySprites.set(enemy.id, sprite);
      }

      sprite.setTexture(this.getEnemyTextureKey(enemy));
      const bobY = Math.sin((this.time.now + enemy.id * 97) / 180) * (enemy.isBoss ? 1.2 : 0.8);
      sprite.setPosition(enemy.x, enemy.y + bobY);
      sprite.setDepth(32 + enemy.y * 0.05);
      sprite.setTint(ENEMY_TINTS[enemy.typeId]);
      sprite.setScale(enemy.isBoss ? 1.48 : 1);
      sprite.setAlpha(1);
    }

    for (const [enemyId, sprite] of this.enemySprites.entries()) {
      if (activeEnemyIds.has(enemyId)) {
        continue;
      }
      sprite.destroy();
      this.enemySprites.delete(enemyId);
    }
  }

  private syncHeroSprites(snapshot: GameSnapshot): void {
    const activeHeroIds = new Set<string>();

    for (const hero of snapshot.heroes) {
      activeHeroIds.add(hero.id);

      let sprite = this.heroSprites.get(hero.id);
      if (!sprite) {
        sprite = this.add
          .sprite(hero.x, hero.y, this.getHeroTextureKey(hero))
          .setOrigin(0.5, 0.78);
        this.heroSprites.set(hero.id, sprite);
      }

      sprite.setTexture(this.getHeroTextureKey(hero));
      const bobY = hero.state === "alive" ? Math.sin((this.time.now + hero.x) / 210) * 0.8 : 0;
      sprite.setPosition(hero.x, hero.y + bobY);
      sprite.setDepth(34 + hero.y * 0.05);
      sprite.setScale(hero.id === this.playerId ? 1.1 : 1);
      sprite.setAlpha(hero.state === "dead" ? 0.86 : 1);

      if (hero.id === this.playerId && hero.state === "alive") {
        sprite.setTint(0xffefbe);
      } else {
        sprite.clearTint();
      }
    }

    for (const [heroId, sprite] of this.heroSprites.entries()) {
      if (activeHeroIds.has(heroId)) {
        continue;
      }
      sprite.destroy();
      this.heroSprites.delete(heroId);
    }
  }

  private drawEnemyOverlays(enemies: EnemySnapshot[]): void {
    for (const enemy of enemies) {
      this.graphics.fillStyle(0x090807, 0.34);
      this.graphics.fillEllipse(
        enemy.x,
        enemy.y + (enemy.isBoss ? 13 : 9),
        enemy.isBoss ? 34 : 22,
        enemy.isBoss ? 12 : 8,
      );

      if (enemy.typeId === "elite" && enemy.eliteEmpoweredRemainingMs > 0) {
        const pulse = 1 + Math.sin(this.time.now / 95) * 1.3;
        this.graphics.lineStyle(2.5, 0xff9f4e, 0.95);
        this.graphics.strokeCircle(enemy.x, enemy.y, 14 + pulse * 1.2);
      }

      if (enemy.isBoss) {
        const phaseColor =
          enemy.bossPhase >= 3 ? 0xff4e7c : enemy.bossPhase >= 2 ? 0xffa55a : 0xd78294;
        this.graphics.lineStyle(2.5, phaseColor, 0.9);
        this.graphics.strokeCircle(enemy.x, enemy.y - 1, 20 + enemy.bossPhase * 2);
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
      this.graphics.fillRoundedRect(enemy.x - 13, enemy.y - 23, 26, 5, 2);
      this.graphics.fillStyle(0x9cca74, 1);
      this.graphics.fillRoundedRect(enemy.x - 13, enemy.y - 23, 26 * hpRatio, 5, 2);
    }
  }

  private drawHeroOverlays(heroes: HeroSnapshot[]): void {
    for (const hero of heroes) {
      const isLocalHero = hero.id === this.playerId;
      this.graphics.fillStyle(0x090807, 0.3);
      this.graphics.fillEllipse(hero.x, hero.y + 11, 24, 10);

      this.graphics.lineStyle(
        2,
        isLocalHero ? 0xfaf3cc : 0xd7d7d7,
        hero.state === "alive" ? 0.95 : 0.6,
      );
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
  }

  private getHeroTextureKey(hero: HeroSnapshot): string {
    if (hero.state === "dead") {
      return HERO_TEXTURE_KEYS.dead;
    }
    if (hero.state === "downed") {
      return HERO_TEXTURE_KEYS.downed;
    }

    const frame = Math.floor(this.time.now / 210) % HERO_TEXTURE_KEYS.alive.length;
    return HERO_TEXTURE_KEYS.alive[frame];
  }

  private getEnemyTextureKey(enemy: EnemySnapshot): string {
    if (enemy.isBoss) {
      const frame = (Math.floor(this.time.now / 240) + enemy.id) % ENEMY_TEXTURE_KEYS.boss.length;
      return ENEMY_TEXTURE_KEYS.boss[frame];
    }

    const cadence = enemy.typeId === "runner" ? 140 : 210;
    const frame =
      (Math.floor(this.time.now / cadence) + enemy.id) % ENEMY_TEXTURE_KEYS.common.length;
    return ENEMY_TEXTURE_KEYS.common[frame];
  }

  private getTowerTextureKey(towerType: TowerTypeId): string {
    switch (towerType) {
      case "defender":
        return TOWER_TEXTURE_KEYS.defender;
      case "archer":
        return TOWER_TEXTURE_KEYS.archer;
      case "mage":
      default:
        return TOWER_TEXTURE_KEYS.mage;
    }
  }

  private clearEntitySprites(): void {
    for (const sprite of this.towerSprites.values()) {
      sprite.destroy();
    }
    this.towerSprites.clear();

    for (const sprite of this.enemySprites.values()) {
      sprite.destroy();
    }
    this.enemySprites.clear();

    for (const sprite of this.heroSprites.values()) {
      sprite.destroy();
    }
    this.heroSprites.clear();
  }

  private drawPixelVignette(width: number, height: number): void {
    this.graphics.fillStyle(0x050705, 0.12);
    for (let y = 0; y < height; y += TERRAIN_TILE_SIZE * 2) {
      this.graphics.fillRect(0, y, width, 1);
    }

    this.graphics.fillStyle(0x070907, 0.22);
    this.graphics.fillRect(0, 0, width, 20);
    this.graphics.fillRect(0, height - 20, width, 20);
  }

  private tileNoise(x: number, y: number): number {
    const seed = x * 374761393 + y * 668265263;
    let mixed = (seed ^ (seed >> 13)) * 1274126177;
    mixed ^= mixed >> 16;
    return (mixed >>> 0) / 4294967295;
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
