import type {
  DifficultyPreset,
  EnemySnapshot,
  GameSnapshot,
  HeroSnapshot,
  MapConfig,
  MidRunObjectiveSnapshot,
  PlayerProgression,
  ProjectileTrace,
  RunSummary,
  TowerSnapshot,
  TowerTypeId,
} from "@pals-defence/shared";
import { TOWER_RELOCATE_COST } from "@pals-defence/shared";
import Phaser from "phaser";

import {
  isConnectionErrorMessage,
  loadLocale,
  saveLocale,
  toggleLocale,
  tr,
  trErrorMessage,
  trSkillName,
  type Locale,
} from "../i18n";
import { SfxEngine } from "../audio/SfxEngine";
import { GameClient } from "../network/GameClient";
import { UpgradeOverlay } from "../ui/UpgradeOverlay";
import {
  ENEMY_TEXTURE_KEYS,
  HERO_TEXTURE_KEYS,
  PIXEL_PALETTE,
  PIXEL_TEXTURES,
  TOWER_TEXTURE_KEYS,
} from "./assets/pixelArtCatalog";
import { DEFAULT_MAP_LAYER_CONFIG, type MapLayerConfig } from "./assets/mapLayerConfig";

const TITLE_FONT = '"Cinzel", "Palatino Linotype", serif';
const BODY_FONT = '"Spectral", "Segoe UI", serif';
const TERRAIN_TILE_SIZE = 16;
const EARLY_WAVE_BONUS_INTERVAL_MS = 500;
const TOWER_PICK_RADIUS = 26;
const CONTEXT_TARGET_PICK_RADIUS = 28;
const ONBOARDING_STORAGE_KEY = "pals_defence_onboarding_advanced_v1";

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

type ContextTarget =
  | { kind: "enemy"; value: EnemySnapshot }
  | { kind: "tower"; value: TowerSnapshot }
  | { kind: "hero"; value: HeroSnapshot };

type OnboardingStep = "moveTower" | "reroll" | "callWave";

interface OnboardingProgress {
  moveTower: boolean;
  reroll: boolean;
  callWave: boolean;
}

export class GameScene extends Phaser.Scene {
  private snapshot: GameSnapshot | null = null;
  private worldGraphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private mapTexture: Phaser.GameObjects.RenderTexture | null = null;
  private hudText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private screenLayer!: Phaser.GameObjects.Container;
  private hudBackdrop!: Phaser.GameObjects.Rectangle;
  private statusBackdrop!: Phaser.GameObjects.Rectangle;
  private localeButton!: Phaser.GameObjects.Text;
  private sfxButton!: Phaser.GameObjects.Text;
  private waveActionContainer!: Phaser.GameObjects.Container;
  private waveActionButton!: Phaser.GameObjects.Rectangle;
  private waveActionLabel!: Phaser.GameObjects.Text;
  private waveActionInfo!: Phaser.GameObjects.Text;
  private contextPanelContainer!: Phaser.GameObjects.Container;
  private contextPanelTitle!: Phaser.GameObjects.Text;
  private contextPanelBody!: Phaser.GameObjects.Text;
  private onboardingContainer!: Phaser.GameObjects.Container;
  private onboardingTitle!: Phaser.GameObjects.Text;
  private onboardingBody!: Phaser.GameObjects.Text;
  private readonly sfx = new SfxEngine();
  private onboardingProgress: OnboardingProgress = {
    moveTower: false,
    reroll: false,
    callWave: false,
  };
  private onboardingCompletionBannerUntilMs = 0;

  private playerId: string | null = null;
  private selectedTower: TowerTypeId = "defender";
  private selectedDifficulty: DifficultyPreset = "normal";
  private screenMode: ScreenMode = "menu";
  private runEndSummary: RunSummary | null = null;
  private runEndProgression: PlayerProgression | null = null;
  private connectionMessage = "";
  private locale: Locale = "pt";
  private moveModeEnabled = false;
  private selectedMoveTowerId: number | null = null;

  private inputSendAccumulatorMs = 0;
  private pointerWorldX = 800;
  private pointerWorldY = 450;

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
    r: Phaser.Input.Keyboard.Key;
    v: Phaser.Input.Keyboard.Key;
    f: Phaser.Input.Keyboard.Key;
    space: Phaser.Input.Keyboard.Key;
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
      .renderTexture(0, 0, 1600, 900)
      .setOrigin(0)
      .setDepth(5);
    this.worldGraphics = this.add.graphics().setDepth(24);
    this.overlayGraphics = this.add.graphics().setDepth(82);

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
      .text(12, 838, "Pals Defence", {
        color: "#e8d8a8",
        fontSize: "14px",
        fontFamily: BODY_FONT,
      })
      .setDepth(100);

    this.hudBackdrop = this.add
      .rectangle(8, 8, 950, 112, 0x0d1919, 0.58)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xcab97a, 0.45)
      .setDepth(90);

    this.statusBackdrop = this.add
      .rectangle(8, 854, 620, 30, 0x0d1919, 0.58)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xcab97a, 0.45)
      .setDepth(90);

    this.screenLayer = this.add.container(0, 0).setDepth(300);
    this.ambientMotes = this.createAmbientMotes(52);
    this.locale = loadLocale();
    this.loadOnboardingProgress();
    this.localeButton = this.add
      .text(1582, 12, tr(this.locale, "language_button"), {
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
      this.sfx.playUiClick();
      this.handleToggleLocale();
    });
    this.sfxButton = this.add
      .text(1462, 12, "", {
        color: "#d9d8c8",
        fontSize: "15px",
        fontFamily: BODY_FONT,
      })
      .setOrigin(1, 0)
      .setDepth(180)
      .setInteractive({ useHandCursor: true });
    this.sfxButton.on("pointerover", () => {
      this.sfxButton.setColor("#fff6de");
    });
    this.sfxButton.on("pointerout", () => {
      this.sfxButton.setColor("#d9d8c8");
    });
    this.sfxButton.on("pointerdown", () => {
      this.handleToggleSfx();
    });
    this.updateSfxButtonLabel();

    this.createWaveActionUi();
    this.createContextPanelUi();
    this.createOnboardingUi();

    this.keys = this.input.keyboard?.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      v: Phaser.Input.Keyboard.KeyCodes.V,
      f: Phaser.Input.Keyboard.KeyCodes.F,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
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
      this.handleWorldPointerDown(pointer.worldX, pointer.worldY);
    });
    this.input.once("pointerdown", () => {
      this.sfx.prime();
    });
    this.input.keyboard?.once("keydown", () => {
      this.sfx.prime();
    });

    this.client.setHandlers({
      onConnected: (playerId) => {
        this.playerId = playerId;
        this.screenMode = "playing";
        this.connectionMessage = "";
        this.renderScreen();
      },
      onState: (snapshot) => {
        const previousSnapshot = this.snapshot;
        this.snapshot = snapshot;
        this.sanitizeTowerMoveSelection(snapshot);
        this.consumeProjectileTraces(snapshot.projectileTraces, previousSnapshot !== null);
        this.handleSnapshotAudio(previousSnapshot, snapshot);

        if (this.screenMode === "playing" && snapshot.runStatus === "running") {
          const localHero = this.getLocalHero(snapshot);
          if (localHero?.state === "dead") {
            this.statusText.setText(tr(this.locale, "dead_hint"));
          } else if (localHero?.state === "downed") {
            const seconds = Math.ceil(localHero.downedRemainingMs / 1000);
            this.statusText.setText(tr(this.locale, "downed_hint", { seconds }));
          } else if (snapshot.isUpgradeSelectionPhase) {
            this.statusText.setText(tr(this.locale, "upgrade_pause_hint"));
          } else if (snapshot.waveState === "intermission") {
            this.statusText.setText(this.getIntermissionHintText(snapshot));
          } else {
            this.statusText.setText(this.getControlHintText());
          }
        }
      },
      onUpgradeOptions: (options, rerollTokens) => {
        this.sfx.playUpgradePrompt();
        this.upgradeOverlay.show(options, (upgradeId) => {
          this.sfx.playUiClick();
          this.client.chooseUpgrade(upgradeId);
        }, this.locale, rerollTokens, () => {
          this.sfx.playUiClick();
          this.markOnboardingStep("reroll");
          this.client.rerollUpgrades();
        });
      },
      onRunEnded: (summary, progression) => {
        if (summary.runStatus === "won") {
          this.sfx.playVictory();
        } else {
          this.sfx.playDefeat();
        }
        this.upgradeOverlay.hide();
        this.projectiles = [];
        this.resetTowerMoveState();
        this.runEndSummary = summary;
        this.runEndProgression = progression;
        this.screenMode = "runEnd";
        this.renderScreen();
      },
      onError: (message) => {
        const localizedMessage = trErrorMessage(this.locale, message);
        this.sfx.playError();
        this.upgradeOverlay.hide();
        this.statusText.setText(localizedMessage);
        const isConnectionError = isConnectionErrorMessage(message);
        if (isConnectionError) {
          this.resetTowerMoveState();
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
      !this.snapshot?.isUpgradeSelectionPhase &&
      isLocalHeroAlive;

    if (Phaser.Input.Keyboard.JustDown(this.keys.one)) {
      this.selectedTower = "defender";
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.two)) {
      this.selectedTower = "archer";
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.three)) {
      this.selectedTower = "mage";
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.f)) {
      this.moveModeEnabled = !this.moveModeEnabled;
      if (!this.moveModeEnabled) {
        this.selectedMoveTowerId = null;
      }
    }

    if (canAct && Phaser.Input.Keyboard.JustDown(this.keys.q)) {
      this.client.castSkill("arcaneBolt", this.pointerWorldX, this.pointerWorldY);
    }
    if (canAct && Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.client.castSkill("aetherPulse", this.pointerWorldX, this.pointerWorldY);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.tryRerollUpgradeOptions();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      this.tryStartNextWave();
    }

    const dx = canAct ? Number(this.keys.d.isDown) - Number(this.keys.a.isDown) : 0;
    const dy = canAct ? Number(this.keys.s.isDown) - Number(this.keys.w.isDown) : 0;
    const revive = canAct && this.keys.v.isDown;

    this.inputSendAccumulatorMs += deltaMs;
    if (this.inputSendAccumulatorMs >= 50) {
      this.inputSendAccumulatorMs = 0;
      this.client.sendInput(dx, dy, revive);
    }
  }

  private handleWorldPointerDown(x: number, y: number): void {
    if (this.tryMoveTowerInteraction(x, y)) {
      return;
    }

    this.tryPlaceTower(x, y);
  }

  private tryPlaceTower(x: number, y: number): void {
    if (
      this.screenMode !== "playing" ||
      !this.snapshot ||
      this.snapshot.runStatus !== "running" ||
      this.snapshot.isUpgradeSelectionPhase
    ) {
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

  private tryMoveTowerInteraction(x: number, y: number): boolean {
    if (!this.moveModeEnabled && this.selectedMoveTowerId === null) {
      return false;
    }

    if (
      this.screenMode !== "playing" ||
      !this.snapshot ||
      this.snapshot.runStatus !== "running" ||
      this.snapshot.isUpgradeSelectionPhase
    ) {
      return false;
    }

    const localHero = this.getLocalHero();
    if (!localHero || localHero.state !== "alive" || localHero.hp <= 0) {
      return false;
    }

    const clickedTower = this.findClosestOwnedTower(x, y);
    if (clickedTower) {
      this.selectedMoveTowerId = clickedTower.id;
      return true;
    }

    if (this.selectedMoveTowerId === null) {
      return true;
    }

    const slotIndex = this.findClosestSlotIndex(x, y);
    if (slotIndex < 0) {
      return true;
    }

    this.client.moveTower(this.selectedMoveTowerId, slotIndex);
    this.markOnboardingStep("moveTower");
    this.selectedMoveTowerId = null;
    return true;
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

  private findClosestOwnedTower(x: number, y: number): TowerSnapshot | null {
    if (!this.snapshot || !this.playerId) {
      return null;
    }

    let bestTower: TowerSnapshot | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const tower of this.snapshot.towers) {
      if (tower.ownerId !== this.playerId) {
        continue;
      }

      const distance = Math.hypot(tower.x - x, tower.y - y);
      if (distance < bestDistance) {
        bestTower = tower;
        bestDistance = distance;
      }
    }

    return bestDistance <= TOWER_PICK_RADIUS ? bestTower : null;
  }

  private tryRerollUpgradeOptions(): void {
    if (!this.upgradeOverlay.isVisible()) {
      return;
    }

    const hero = this.getLocalHero();
    if (!hero || hero.rerollTokens <= 0) {
      return;
    }

    this.sfx.playUiClick();
    this.markOnboardingStep("reroll");
    this.client.rerollUpgrades();
  }

  private tryStartNextWave(): void {
    if (
      this.screenMode !== "playing" ||
      !this.snapshot ||
      this.snapshot.runStatus !== "running" ||
      this.snapshot.isUpgradeSelectionPhase
    ) {
      return;
    }

    if (this.snapshot.waveState !== "intermission") {
      return;
    }

    const hero = this.getLocalHero();
    if (!hero || hero.state === "dead") {
      return;
    }

    this.markOnboardingStep("callWave");
    this.client.startNextWave();
  }

  private consumeProjectileTraces(traces: ProjectileTrace[], shouldPlayAudio = true): void {
    for (const trace of traces) {
      if (trace.id <= this.latestProjectileTraceId) {
        continue;
      }

      this.latestProjectileTraceId = trace.id;
      if (shouldPlayAudio) {
        this.playProjectileSfx(trace.kind);
      }
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

  private playProjectileSfx(kind: ProjectileTrace["kind"]): void {
    switch (kind) {
      case "skill_arcane_bolt":
        this.sfx.playSkillArcane();
        break;
      case "skill_pulse_shard":
        this.sfx.playSkillPulse();
        break;
      case "enemy_elite_burst":
        this.sfx.playEliteBurst();
        break;
      case "enemy_boss_shockwave":
        this.sfx.playBossShockwave();
        break;
      default:
        break;
    }
  }

  private handleSnapshotAudio(previousSnapshot: GameSnapshot | null, snapshot: GameSnapshot): void {
    if (!previousSnapshot) {
      return;
    }

    if (previousSnapshot.waveState !== snapshot.waveState) {
      if (snapshot.waveState === "spawning") {
        this.sfx.playWaveStart();
      } else if (snapshot.waveState === "intermission") {
        this.sfx.playIntermission();
      }
    }

    const defeatedCount = previousSnapshot.enemies.length - snapshot.enemies.length;
    if (defeatedCount > 0) {
      this.sfx.playEnemyDefeat(defeatedCount);
    }

    this.handleTowerAudio(previousSnapshot, snapshot);
    this.handleReviveAudio(previousSnapshot, snapshot);
  }

  private handleTowerAudio(previousSnapshot: GameSnapshot, snapshot: GameSnapshot): void {
    if (!this.playerId) {
      return;
    }

    const previousOwned = previousSnapshot.towers.filter((tower) => tower.ownerId === this.playerId);
    const currentOwned = snapshot.towers.filter((tower) => tower.ownerId === this.playerId);

    if (currentOwned.length > previousOwned.length) {
      this.sfx.playTowerPlace();
      return;
    }

    const previousById = new Map<number, TowerSnapshot>(
      previousOwned.map((tower) => [tower.id, tower]),
    );
    for (const tower of currentOwned) {
      const previousTower = previousById.get(tower.id);
      if (!previousTower) {
        continue;
      }

      if (Math.hypot(previousTower.x - tower.x, previousTower.y - tower.y) > 2) {
        this.sfx.playTowerMove();
        break;
      }
    }
  }

  private handleReviveAudio(previousSnapshot: GameSnapshot, snapshot: GameSnapshot): void {
    const previousById = new Map<string, HeroSnapshot>(
      previousSnapshot.heroes.map((hero) => [hero.id, hero]),
    );

    for (const hero of snapshot.heroes) {
      const previousHero = previousById.get(hero.id);
      if (!previousHero) {
        continue;
      }
      if (previousHero.state === "downed" && hero.state === "alive") {
        this.sfx.playReviveComplete();
        break;
      }
    }

    if (!this.playerId) {
      return;
    }

    const previousLocalHero = previousById.get(this.playerId);
    const currentLocalHero = snapshot.heroes.find((hero) => hero.id === this.playerId);
    if (
      previousLocalHero &&
      currentLocalHero &&
      previousLocalHero.isReviving !== currentLocalHero.isReviving &&
      currentLocalHero.isReviving &&
      currentLocalHero.reviveTargetId !== null &&
      currentLocalHero.state === "alive"
    ) {
      this.sfx.playReviveStart();
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
    this.worldGraphics.clear();
    this.overlayGraphics.clear();
    this.drawAmbientMotes();

    if (!this.snapshot) {
      this.mapTexture?.setVisible(false);
      return;
    }

    const snapshot = this.snapshot;
    this.ensureMapRender(snapshot.map);
    this.mapTexture?.setVisible(true);
    this.mapTexture?.setAlpha(0.68);

    this.drawBaseObjective(snapshot);

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
      this.worldGraphics.fillStyle(occupied ? 0x3e3222 : 0x8a7347, occupied ? 0.36 : 0.58);
      this.worldGraphics.fillRoundedRect(slot.x - 11, slot.y - 9, 22, 18, 5);
      this.worldGraphics.lineStyle(occupied ? 1.6 : 1.9, occupied ? 0xb29b6b : 0xe8d6a4, occupied ? 0.48 : 0.82);
      this.worldGraphics.strokeRoundedRect(slot.x - 11, slot.y - 9, 22, 18, 5);
      this.worldGraphics.lineStyle(1, 0x2a2117, 0.35);
      this.worldGraphics.lineBetween(slot.x - 6, slot.y, slot.x + 6, slot.y);
    }

    this.drawTowerOverlays(snapshot.towers);
    this.drawTowerMoveOverlay(snapshot, occupiedSlots);
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
        this.overlayGraphics.lineStyle(4, projectile.color, Math.max(0, 1 - progress));
        this.overlayGraphics.strokeCircle(projectile.fromX, projectile.fromY, radius);
        continue;
      }

      if (projectile.kind === "enemy_boss_summon") {
        const pulse = projectile.radius + progress * 22;
        this.overlayGraphics.lineStyle(2.5, projectile.color, Math.max(0.15, 0.95 - progress * 0.8));
        this.overlayGraphics.strokeCircle(projectile.fromX, projectile.fromY, pulse);
        this.overlayGraphics.lineStyle(1.5, 0xffffff, Math.max(0, 0.7 - progress));
        this.overlayGraphics.strokeCircle(projectile.fromX, projectile.fromY, pulse * 0.65);
        continue;
      }

      if (projectile.kind === "enemy_elite_burst") {
        const radius = projectile.radius + progress * 18;
        this.overlayGraphics.lineStyle(3, projectile.color, Math.max(0, 1 - progress));
        this.overlayGraphics.strokeCircle(projectile.fromX, projectile.fromY, radius);
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

      this.overlayGraphics.lineStyle(Math.max(1, projectile.radius - 1), projectile.color, 0.5);
      this.overlayGraphics.lineBetween(previousX, previousY, x, y);
      this.overlayGraphics.fillStyle(projectile.color, 0.95);
      this.overlayGraphics.fillCircle(x, y, projectile.radius);

      if (projectile.kind === "skill_arcane_bolt") {
        this.overlayGraphics.lineStyle(1.5, 0xffffff, 0.45);
        this.overlayGraphics.strokeCircle(x, y, projectile.radius + 2);
      } else if (projectile.kind === "chain_lightning") {
        this.overlayGraphics.lineStyle(1.5, 0xffffff, 0.55);
        this.overlayGraphics.lineBetween(previousX, previousY, x, y);
      }
    }
  }

  private updateHud(): void {
    if (this.screenMode !== "playing") {
      this.hudText.setText("");
      this.hudBackdrop.setVisible(false);
      this.statusBackdrop.setVisible(false);
      this.waveActionContainer.setVisible(false);
      this.contextPanelContainer.setVisible(false);
      this.onboardingContainer.setVisible(false);
      return;
    }

    this.hudBackdrop.setVisible(true);
    this.statusBackdrop.setVisible(true);

    if (!this.snapshot) {
      this.hudText.setText(tr(this.locale, "connecting_title"));
      this.waveActionContainer.setVisible(false);
      this.contextPanelContainer.setVisible(false);
      this.onboardingContainer.setVisible(false);
      return;
    }

    const hero = this.snapshot.heroes.find((entry) => entry.id === this.playerId);
    const heroStateLabel = hero ? this.getHeroStateLabel(hero) : tr(this.locale, "hero_state_alive");
    const heroInfo = hero
      ? tr(this.locale, "hud_state", {
          state: heroStateLabel,
          hp: hero.hp,
          maxHp: hero.maxHp,
          gold: hero.gold,
          rerolls: hero.rerollTokens,
          level: hero.level,
          xp: hero.xp,
          nextXp: hero.nextLevelXp,
          towers: this.snapshot.towers.filter((tower) => tower.ownerId === hero.id).length,
          maxTowers: hero.maxTowers,
        })
      : tr(this.locale, "hero_not_joined");
    const boss = this.snapshot.enemies.find((enemy) => enemy.isBoss);
    const bossInfo = boss ? tr(this.locale, "boss_phase", { phase: boss.bossPhase }) : "";
    const waveState = this.getWaveStateLabel(this.snapshot);
    const pauseInfo = this.snapshot.isUpgradeSelectionPhase
      ? tr(this.locale, "upgrade_pause_hud")
      : "";
    const objectiveInfo = this.getMidRunObjectiveHudLine(this.snapshot.midRunObjective);

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
          waveState,
          baseHp: this.snapshot.baseHp,
          baseMaxHp: this.snapshot.baseMaxHp,
          enemies: this.snapshot.enemies.length,
          boss: bossInfo,
          pause: pauseInfo,
        }),
        heroInfo,
        objectiveInfo,
        hero?.state === "downed"
          ? tr(this.locale, "downed_progress", {
              seconds: Math.ceil(hero.downedRemainingMs / 1000),
              progress: Math.round(
                (hero.reviveProgressMs / Math.max(1, this.snapshot.reviveRequiredMs)) * 100,
              ),
            })
          : "",
        skillsInfo,
      ].join("\n"),
    );

    this.updateWaveActionUi(this.snapshot);
    this.updateContextPanel(this.snapshot);
    this.updateOnboardingUi(this.snapshot);
  }

  private renderScreen(): void {
    if (!this.screenLayer) {
      return;
    }

    this.screenLayer.removeAll(true);
    if (this.screenMode === "playing") {
      return;
    }

    const panel = this.addScreenPanel(800, 450, 1075, 650);
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
    this.statusText.setText(
      this.connectionMessage
        ? trErrorMessage(this.locale, this.connectionMessage)
        : tr(this.locale, "menu_status_default"),
    );
    this.addScreenTitle(tr(this.locale, "menu_title"));
    this.addScreenSubtitle(tr(this.locale, "menu_subtitle"));
    this.addScreenLore(tr(this.locale, "menu_lore"), 350);

    this.addScreenButton(800, 488, 340, 56, tr(this.locale, "menu_start_run"), () => {
      this.screenMode = "difficulty";
      this.renderScreen();
    });
  }

  private renderDifficultyScreen(): void {
    this.statusText.setText(tr(this.locale, "difficulty_title"));
    this.addScreenTitle(tr(this.locale, "difficulty_title"));
    this.addScreenLore(tr(this.locale, "difficulty_lore"), 318);

    this.addDifficultyButton(800, 400, tr(this.locale, "difficulty_easy"), tr(this.locale, "difficulty_easy_desc"), () => {
      this.startRunWithDifficulty("easy");
    });
    this.addDifficultyButton(800, 498, tr(this.locale, "difficulty_normal"), tr(this.locale, "difficulty_normal_desc"), () => {
      this.startRunWithDifficulty("normal");
    });
    this.addDifficultyButton(800, 596, tr(this.locale, "difficulty_hard"), tr(this.locale, "difficulty_hard_desc"), () => {
      this.startRunWithDifficulty("hard");
    });
    this.addScreenButton(800, 708, 240, 44, tr(this.locale, "back"), () => {
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
    this.addScreenLore(tr(this.locale, "connecting_lore"), 403);
  }

  private renderRunEndScreen(): void {
    this.addScreenTitle(tr(this.locale, "run_end_title"));

    const runStatus = this.getRunStatusLabel(this.runEndSummary?.runStatus);
    const wave = this.runEndSummary?.reachedWave ?? 0;
    const gold = this.runEndSummary?.goldEarned ?? 0;
    const essence = this.runEndProgression?.totalEssence ?? 0;

    const summaryText = this.add
      .text(
        800,
        406,
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

    this.addScreenButton(800, 588, 320, 50, tr(this.locale, "play_again"), () => {
      this.client.disconnect();
      this.screenMode = "difficulty";
      this.renderScreen();
    });
    this.addScreenButton(800, 669, 240, 44, tr(this.locale, "main_menu"), () => {
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
    this.resetTowerMoveState();
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
    const backdrop = this.add.rectangle(800, 450, 1600, 900, 0x090c0e, 0.68).setDepth(300);
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
      .text(800, 206, text, {
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
      .text(800, 281, text, {
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
      .text(800, y, text, {
        color: "#b8c3be",
        fontSize: "19px",
        fontFamily: BODY_FONT,
        align: "center",
        wordWrap: { width: 900 },
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
    this.addScreenButton(x, y - 12, 520, 80, label, onClick);
    const desc = this.add
      .text(x, y + 16, description, {
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
      this.sfx.playUiClick();
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
    this.updateSfxButtonLabel();

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
      } else if (this.snapshot.isUpgradeSelectionPhase) {
        this.statusText.setText(tr(this.locale, "upgrade_pause_hint"));
      } else if (this.snapshot.waveState === "intermission") {
        this.statusText.setText(this.getIntermissionHintText(this.snapshot));
      } else {
        this.statusText.setText(this.getControlHintText());
      }
    }
  }

  private handleToggleSfx(): void {
    const wasEnabled = this.sfx.isEnabled();
    if (wasEnabled) {
      this.sfx.playUiClick();
    }

    const enabled = this.sfx.toggleEnabled();
    this.updateSfxButtonLabel();

    if (enabled && !wasEnabled) {
      this.sfx.playUiClick();
    }
  }

  private updateSfxButtonLabel(): void {
    this.sfxButton.setText(tr(this.locale, this.sfx.isEnabled() ? "audio_on" : "audio_off"));
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

  private getEnemyLabel(enemyType: EnemySnapshot["typeId"]): string {
    switch (enemyType) {
      case "swarm":
        return tr(this.locale, "enemy_swarm");
      case "ranged":
        return tr(this.locale, "enemy_ranged");
      case "armored":
        return tr(this.locale, "enemy_armored");
      case "runner":
        return tr(this.locale, "enemy_runner");
      case "elite":
        return tr(this.locale, "enemy_elite");
      case "boss":
      default:
        return tr(this.locale, "enemy_boss");
    }
  }

  private getHeroStateLabel(hero: HeroSnapshot): string {
    if (hero.state === "downed") {
      return tr(this.locale, "hero_state_downed");
    }
    if (hero.state === "dead") {
      return tr(this.locale, "hero_state_dead");
    }
    return tr(this.locale, "hero_state_alive");
  }

  private getControlHintText(): string {
    return tr(this.locale, "control_hint", {
      tower: this.getTowerLabel(this.selectedTower),
      skillQ: trSkillName(this.locale, "arcaneBolt", "Arcane Bolt"),
      skillE: trSkillName(this.locale, "aetherPulse", "Aether Pulse"),
      move: this.getTowerMoveHintText(),
      revive: tr(this.locale, "revive_hold_hint"),
    });
  }

  private getTowerMoveHintText(): string {
    if (!this.moveModeEnabled) {
      return tr(this.locale, "move_mode_off", { cost: TOWER_RELOCATE_COST });
    }
    if (this.selectedMoveTowerId !== null) {
      return tr(this.locale, "move_mode_selected", { cost: TOWER_RELOCATE_COST });
    }
    return tr(this.locale, "move_mode_on", { cost: TOWER_RELOCATE_COST });
  }

  private getIntermissionHintText(snapshot: GameSnapshot): string {
    const seconds = Math.ceil(snapshot.intermissionRemainingMs / 1000);
    const nextWave = Math.min(snapshot.totalWaves, snapshot.wave + 1);
    const bonus = this.getEarlyWaveBonus(snapshot.intermissionRemainingMs);
    return tr(this.locale, "intermission_hint", {
      seconds,
      wave: nextWave,
      bonus,
    });
  }

  private getWaveStateLabel(snapshot: GameSnapshot): string {
    if (snapshot.waveState === "intermission") {
      return tr(this.locale, "wave_state_intermission", {
        seconds: Math.ceil(snapshot.intermissionRemainingMs / 1000),
      });
    }
    if (snapshot.waveState === "completed") {
      return tr(this.locale, "wave_state_completed");
    }

    return tr(this.locale, "wave_state_spawning", {
      remaining: snapshot.remainingWaveSpawns,
    });
  }

  private getMidRunObjectiveHudLine(objective: MidRunObjectiveSnapshot | null): string {
    if (!objective) {
      return "";
    }

    return tr(this.locale, "objective_hud_line", {
      wave: objective.wave,
      name: this.getMidRunObjectiveKindLabel(objective.kind),
      status: this.getMidRunObjectiveStatusLabel(objective.status),
      progress: objective.progress,
      target: objective.target,
      reward: objective.rewardGold,
    });
  }

  private getMidRunObjectiveKindLabel(kind: MidRunObjectiveSnapshot["kind"]): string {
    switch (kind) {
      case "slayer":
        return tr(this.locale, "objective_kind_slayer");
      case "survivor":
        return tr(this.locale, "objective_kind_survivor");
      case "bulwark":
      default:
        return tr(this.locale, "objective_kind_bulwark");
    }
  }

  private getMidRunObjectiveStatusLabel(
    status: MidRunObjectiveSnapshot["status"],
  ): string {
    switch (status) {
      case "completed":
        return tr(this.locale, "objective_status_completed");
      case "failed":
        return tr(this.locale, "objective_status_failed");
      case "active":
      default:
        return tr(this.locale, "objective_status_active");
    }
  }

  private getEarlyWaveBonus(intermissionRemainingMs: number): number {
    return Math.max(1, Math.floor(intermissionRemainingMs / EARLY_WAVE_BONUS_INTERVAL_MS));
  }

  private createWaveActionUi(): void {
    this.waveActionContainer = this.add.container(0, 0).setDepth(190).setVisible(false);
    this.waveActionButton = this.add
      .rectangle(1388, 815, 385, 78, 0x243739, 0.94)
      .setStrokeStyle(2, 0xc4b37f, 0.9)
      .setDepth(191)
      .setInteractive({ useHandCursor: true });
    const sheen = this.add
      .rectangle(1388, 796, 358, 20, 0xf6e5b8, 0.12)
      .setDepth(192);
    this.waveActionLabel = this.add
      .text(1388, 810, tr(this.locale, "wave_call_button"), {
        color: "#f3ebd6",
        fontSize: "20px",
        fontFamily: TITLE_FONT,
      })
      .setOrigin(0.5)
      .setDepth(193);
    this.waveActionInfo = this.add
      .text(1388, 853, "", {
        color: "#dbcfae",
        fontSize: "14px",
        fontFamily: BODY_FONT,
      })
      .setOrigin(0.5, 1)
      .setDepth(193);

    this.waveActionButton.on("pointerover", () => {
      this.waveActionButton.setFillStyle(0x334d4f, 1);
      this.waveActionButton.setScale(1.02, 1.04);
      sheen.setScale(1.02, 1.04);
    });
    this.waveActionButton.on("pointerout", () => {
      this.waveActionButton.setFillStyle(0x243739, 0.94);
      this.waveActionButton.setScale(1, 1);
      sheen.setScale(1, 1);
    });
    this.waveActionButton.on("pointerdown", () => {
      this.sfx.playUiClick();
      this.tryStartNextWave();
    });

    this.waveActionContainer.add([
      this.waveActionButton,
      sheen,
      this.waveActionLabel,
      this.waveActionInfo,
    ]);
  }

  private updateWaveActionUi(snapshot: GameSnapshot): void {
    const isVisible =
      this.screenMode === "playing" &&
      snapshot.runStatus === "running" &&
      !snapshot.isUpgradeSelectionPhase &&
      snapshot.waveState === "intermission";
    this.waveActionContainer.setVisible(isVisible);
    if (!isVisible) {
      return;
    }

    const seconds = Math.ceil(snapshot.intermissionRemainingMs / 1000);
    const nextWave = Math.min(snapshot.totalWaves, snapshot.wave + 1);
    const bonus = this.getEarlyWaveBonus(snapshot.intermissionRemainingMs);
    this.waveActionLabel.setText(tr(this.locale, "wave_call_button"));
    this.waveActionInfo.setText(
      tr(this.locale, "wave_call_info", {
        wave: nextWave,
        seconds,
        bonus,
      }),
    );
  }

  private createContextPanelUi(): void {
    this.contextPanelContainer = this.add.container(0, 0).setDepth(197).setVisible(false);
    const panel = this.add
      .rectangle(1388, 455, 385, 333, 0x111d1f, 0.88)
      .setStrokeStyle(2, 0xbfa76d, 0.82)
      .setDepth(197);
    const header = this.add
      .rectangle(1388, 314, 358, 38, 0x2a3b3f, 0.74)
      .setStrokeStyle(1, 0xd1bd8a, 0.45)
      .setDepth(198);
    this.contextPanelTitle = this.add
      .text(1208, 298, "", {
        color: "#f4e8c6",
        fontSize: "18px",
        fontFamily: TITLE_FONT,
      })
      .setDepth(199);
    this.contextPanelBody = this.add
      .text(1203, 340, "", {
        color: "#d8d7c5",
        fontSize: "14px",
        fontFamily: BODY_FONT,
        lineSpacing: 3,
        wordWrap: { width: 363 },
      })
      .setDepth(199);

    this.contextPanelContainer.add([panel, header, this.contextPanelTitle, this.contextPanelBody]);
  }

  private createOnboardingUi(): void {
    this.onboardingContainer = this.add.container(0, 0).setDepth(196).setVisible(false);
    const panel = this.add
      .rectangle(440, 775, 835, 115, 0x121e20, 0.86)
      .setStrokeStyle(2, 0xb8a06b, 0.78)
      .setDepth(196);
    const header = this.add
      .rectangle(440, 731, 798, 30, 0x2a3b3f, 0.72)
      .setStrokeStyle(1, 0xd1bd8a, 0.42)
      .setDepth(197);
    this.onboardingTitle = this.add
      .text(55, 719, "", {
        color: "#f3e8c8",
        fontSize: "16px",
        fontFamily: TITLE_FONT,
      })
      .setDepth(198);
    this.onboardingBody = this.add
      .text(53, 748, "", {
        color: "#d6d5c1",
        fontSize: "13px",
        fontFamily: BODY_FONT,
        lineSpacing: 2,
        wordWrap: { width: 785 },
      })
      .setDepth(198);

    this.onboardingContainer.add([panel, header, this.onboardingTitle, this.onboardingBody]);
  }

  private updateOnboardingUi(snapshot: GameSnapshot): void {
    const baseVisible = this.screenMode === "playing" && snapshot.runStatus === "running";
    if (!baseVisible) {
      this.onboardingContainer.setVisible(false);
      return;
    }

    const isCompleted = this.isOnboardingCompleted();
    if (isCompleted && this.time.now > this.onboardingCompletionBannerUntilMs) {
      this.onboardingContainer.setVisible(false);
      return;
    }

    this.onboardingContainer.setVisible(true);
    this.onboardingTitle.setText(tr(this.locale, "onboarding_title"));

    if (isCompleted) {
      const hasDownedAlly = this.hasDownedAlly(snapshot);
      this.onboardingBody.setText(
        [
          tr(this.locale, "onboarding_complete"),
          hasDownedAlly
            ? tr(this.locale, "onboarding_revive_active")
            : tr(this.locale, "onboarding_revive_tip"),
        ].join("\n"),
      );
      return;
    }

    const completedCount = this.getOnboardingCompletedCount();
    const nextStep = this.getPendingOnboardingStep();
    const localHero = this.getLocalHero(snapshot);
    const localTowerCount = snapshot.towers.filter((tower) => tower.ownerId === this.playerId).length;
    const lines: string[] = [
      tr(this.locale, "onboarding_progress", {
        done: completedCount,
        total: 3,
      }),
    ];

    if (nextStep) {
      lines.push(
        tr(this.locale, "onboarding_next", {
          step: this.getOnboardingStepLabel(nextStep),
        }),
      );
      if (nextStep === "moveTower" && localTowerCount <= 0) {
        lines.push(tr(this.locale, "onboarding_move_wait"));
      } else if (nextStep === "reroll" && (localHero?.rerollTokens ?? 0) <= 0) {
        lines.push(tr(this.locale, "onboarding_reroll_wait"));
      }
    }

    const hasDownedAlly = this.hasDownedAlly(snapshot);
    lines.push(
      hasDownedAlly
        ? tr(this.locale, "onboarding_revive_active")
        : tr(this.locale, "onboarding_revive_tip"),
    );
    this.onboardingBody.setText(lines.join("\n"));
  }

  private hasDownedAlly(snapshot: GameSnapshot): boolean {
    if (!this.playerId) {
      return false;
    }
    return snapshot.heroes.some((hero) => hero.id !== this.playerId && hero.state === "downed");
  }

  private getOnboardingStepLabel(step: OnboardingStep): string {
    if (step === "moveTower") {
      return tr(this.locale, "onboarding_step_move");
    }
    if (step === "reroll") {
      return tr(this.locale, "onboarding_step_reroll");
    }
    return tr(this.locale, "onboarding_step_wave");
  }

  private getPendingOnboardingStep(): OnboardingStep | null {
    const orderedSteps: OnboardingStep[] = ["moveTower", "reroll", "callWave"];
    for (const step of orderedSteps) {
      if (!this.onboardingProgress[step]) {
        return step;
      }
    }
    return null;
  }

  private getOnboardingCompletedCount(): number {
    let count = 0;
    if (this.onboardingProgress.moveTower) {
      count += 1;
    }
    if (this.onboardingProgress.reroll) {
      count += 1;
    }
    if (this.onboardingProgress.callWave) {
      count += 1;
    }
    return count;
  }

  private isOnboardingCompleted(): boolean {
    return (
      this.onboardingProgress.moveTower &&
      this.onboardingProgress.reroll &&
      this.onboardingProgress.callWave
    );
  }

  private markOnboardingStep(step: OnboardingStep): void {
    if (this.onboardingProgress[step]) {
      return;
    }
    this.onboardingProgress[step] = true;
    this.persistOnboardingProgress();
    if (this.isOnboardingCompleted()) {
      this.onboardingCompletionBannerUntilMs = this.time.now + 5000;
    }
  }

  private loadOnboardingProgress(): void {
    const fallback: OnboardingProgress = {
      moveTower: false,
      reroll: false,
      callWave: false,
    };
    this.onboardingProgress = fallback;

    try {
      const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<OnboardingProgress>;
      this.onboardingProgress = {
        moveTower: parsed.moveTower === true,
        reroll: parsed.reroll === true,
        callWave: parsed.callWave === true,
      };
    } catch {
      this.onboardingProgress = fallback;
    }
  }

  private persistOnboardingProgress(): void {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(this.onboardingProgress));
    } catch {
      // ignore storage failures
    }
  }

  private updateContextPanel(snapshot: GameSnapshot): void {
    const isVisible = this.screenMode === "playing" && snapshot.runStatus === "running";
    this.contextPanelContainer.setVisible(isVisible);
    if (!isVisible) {
      return;
    }

    const target = this.resolveContextTarget(snapshot);
    if (!target) {
      this.contextPanelTitle.setText(tr(this.locale, "context_panel_title"));
      this.contextPanelBody.setText(
        [
          tr(this.locale, "context_panel_empty"),
          "",
          tr(this.locale, "context_legend_title"),
          `• ${tr(this.locale, "effect_poison")}: ${tr(this.locale, "effect_poison_desc")}`,
          `• ${tr(this.locale, "effect_shock")}: ${tr(this.locale, "effect_shock_desc")}`,
          `• ${tr(this.locale, "effect_empowered")}: ${tr(this.locale, "effect_empowered_desc")}`,
          `• ${tr(this.locale, "effect_downed")}: ${tr(this.locale, "effect_downed_desc")}`,
        ].join("\n"),
      );
      return;
    }

    if (target.kind === "enemy") {
      const enemy = target.value;
      this.contextPanelTitle.setText(
        tr(this.locale, "context_enemy_title", {
          name: this.getEnemyLabel(enemy.typeId),
        }),
      );

      const lines = [
        tr(this.locale, "context_hp_line", { hp: enemy.hp, maxHp: enemy.maxHp }),
        tr(this.locale, "context_speed_line", { speed: enemy.speed }),
      ];

      if (enemy.isBoss) {
        lines.push(tr(this.locale, "context_boss_phase_line", { phase: enemy.bossPhase }));
      }
      if (enemy.poisonRemainingMs > 0 && enemy.poisonStacks > 0) {
        lines.push(
          tr(this.locale, "context_poison_line", {
            stacks: enemy.poisonStacks,
            seconds: this.toSeconds(enemy.poisonRemainingMs),
          }),
        );
      }
      if (enemy.shockedRemainingMs > 0) {
        lines.push(
          tr(this.locale, "context_shock_line", {
            seconds: this.toSeconds(enemy.shockedRemainingMs),
          }),
        );
      }
      if (enemy.eliteEmpoweredRemainingMs > 0) {
        lines.push(
          tr(this.locale, "context_empowered_line", {
            seconds: this.toSeconds(enemy.eliteEmpoweredRemainingMs),
          }),
        );
      }
      if (lines.length <= 2) {
        lines.push(tr(this.locale, "context_no_effects"));
      }

      this.contextPanelBody.setText(lines.join("\n"));
      return;
    }

    if (target.kind === "tower") {
      const tower = target.value;
      this.contextPanelTitle.setText(
        tr(this.locale, "context_tower_title", { name: this.getTowerLabel(tower.typeId) }),
      );
      const ownerLabel =
        tower.ownerId === this.playerId
          ? tr(this.locale, "context_owner_self")
          : tr(this.locale, "context_owner_ally");

      const lines = [
        tr(this.locale, "context_owner_line", { owner: ownerLabel }),
        tr(this.locale, "context_damage_line", { damage: tower.damage }),
        tr(this.locale, "context_range_line", { range: tower.range }),
        tr(this.locale, "context_cooldown_line", { cooldown: (tower.cooldownMs / 1000).toFixed(2) }),
      ];

      if (this.selectedMoveTowerId === tower.id) {
        lines.push(tr(this.locale, "context_tower_selected_move"));
      }

      this.contextPanelBody.setText(lines.join("\n"));
      return;
    }

    const hero = target.value;
    this.contextPanelTitle.setText(tr(this.locale, "context_hero_title", { name: hero.name }));
    const lines = [
      tr(this.locale, "context_state_line", { state: this.getHeroStateLabel(hero) }),
      tr(this.locale, "context_hp_line", { hp: hero.hp, maxHp: hero.maxHp }),
      tr(this.locale, "context_level_line", { level: hero.level }),
    ];

    if (hero.state === "downed") {
      lines.push(
        tr(this.locale, "context_downed_line", {
          seconds: this.toSeconds(hero.downedRemainingMs),
          progress: Math.round((hero.reviveProgressMs / Math.max(1, snapshot.reviveRequiredMs)) * 100),
        }),
      );
    }
    if (hero.state === "alive" && hero.isReviving) {
      lines.push(tr(this.locale, "context_reviving_line"));
    }

    this.contextPanelBody.setText(lines.join("\n"));
  }

  private resolveContextTarget(snapshot: GameSnapshot): ContextTarget | null {
    const pointerX = this.pointerWorldX;
    const pointerY = this.pointerWorldY;

    let bestEnemy: EnemySnapshot | null = null;
    let enemyDistance = Number.POSITIVE_INFINITY;
    for (const enemy of snapshot.enemies) {
      const distance = Math.hypot(enemy.x - pointerX, enemy.y - pointerY);
      if (distance <= CONTEXT_TARGET_PICK_RADIUS && distance < enemyDistance) {
        enemyDistance = distance;
        bestEnemy = enemy;
      }
    }
    if (bestEnemy) {
      return { kind: "enemy", value: bestEnemy };
    }

    let bestTower: TowerSnapshot | null = null;
    let towerDistance = Number.POSITIVE_INFINITY;
    for (const tower of snapshot.towers) {
      const distance = Math.hypot(tower.x - pointerX, tower.y - pointerY);
      if (distance <= CONTEXT_TARGET_PICK_RADIUS && distance < towerDistance) {
        towerDistance = distance;
        bestTower = tower;
      }
    }
    if (bestTower) {
      return { kind: "tower", value: bestTower };
    }

    let bestHero: HeroSnapshot | null = null;
    let heroDistance = Number.POSITIVE_INFINITY;
    for (const hero of snapshot.heroes) {
      const distance = Math.hypot(hero.x - pointerX, hero.y - pointerY);
      if (distance <= CONTEXT_TARGET_PICK_RADIUS && distance < heroDistance) {
        heroDistance = distance;
        bestHero = hero;
      }
    }
    if (bestHero) {
      return { kind: "hero", value: bestHero };
    }

    return null;
  }

  private toSeconds(ms: number): number {
    return Math.max(0, Math.ceil(ms / 1000));
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
      const bobY = Math.sin((this.time.now + tower.id * 121) / 340) * 1.4;
      sprite.setPosition(tower.x, tower.y + bobY);
      sprite.setDepth(30 + tower.y * 0.05);
      sprite.setScale(this.getTowerSpriteScale(tower.typeId));
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
      const bobY = Math.sin((this.time.now + enemy.id * 97) / 180) * (enemy.isBoss ? 2.5 : 1.8);
      sprite.setPosition(enemy.x, enemy.y + bobY);
      sprite.setDepth(32 + enemy.y * 0.05);
      sprite.clearTint();
      const scalePulse = 1 + Math.sin((this.time.now + enemy.id * 53) / 260) * 0.04;
      sprite.setScale(this.getEnemySpriteScale(enemy) * scalePulse);
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
      const bobY = hero.state === "alive" ? Math.sin((this.time.now + hero.x) / 210) * 2.0 : 0;
      sprite.setPosition(hero.x, hero.y + bobY);
      sprite.setDepth(34 + hero.y * 0.05);
      sprite.setScale(this.getHeroSpriteScale(hero, hero.id === this.playerId));
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
      this.worldGraphics.fillStyle(0x090807, 0.3);
      this.worldGraphics.fillEllipse(
        enemy.x,
        enemy.y + (enemy.isBoss ? 13 : 9),
        enemy.isBoss ? 34 : 22,
        enemy.isBoss ? 12 : 8,
      );

      this.overlayGraphics.lineStyle(1.8, 0x0f1411, 0.85);
      this.overlayGraphics.strokeCircle(enemy.x, enemy.y - 1, enemy.isBoss ? 16.5 : 10.5);

      if (enemy.typeId === "elite" && enemy.eliteEmpoweredRemainingMs > 0) {
        const pulse = 1 + Math.sin(this.time.now / 95) * 1.3;
        this.overlayGraphics.lineStyle(2.5, 0xff9f4e, 0.95);
        this.overlayGraphics.strokeCircle(enemy.x, enemy.y, 14 + pulse * 1.2);
      }

      if (enemy.isBoss) {
        const phaseColor =
          enemy.bossPhase >= 3 ? 0xff4e7c : enemy.bossPhase >= 2 ? 0xffa55a : 0xd78294;
        this.overlayGraphics.lineStyle(2.5, phaseColor, 0.9);
        this.overlayGraphics.strokeCircle(enemy.x, enemy.y - 1, 20 + enemy.bossPhase * 2);
      }

      if (enemy.poisonRemainingMs > 0 && enemy.poisonStacks > 0) {
        this.overlayGraphics.lineStyle(2, 0x7ad866, 0.85);
        this.overlayGraphics.strokeCircle(enemy.x, enemy.y, enemy.isBoss ? 18 : 12);
      }

      if (enemy.shockedRemainingMs > 0) {
        this.overlayGraphics.lineStyle(2, 0x86ecff, 0.85);
        this.overlayGraphics.strokeCircle(enemy.x, enemy.y, enemy.isBoss ? 21 : 15);
      }

      const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
      this.overlayGraphics.fillStyle(0x1f0f11, 0.95);
      this.overlayGraphics.fillRoundedRect(enemy.x - 13, enemy.y - 23, 26, 5, 2);
      this.overlayGraphics.fillStyle(0x9cca74, 1);
      this.overlayGraphics.fillRoundedRect(enemy.x - 13, enemy.y - 23, 26 * hpRatio, 5, 2);
    }
  }

  private drawTowerOverlays(towers: TowerSnapshot[]): void {
    for (const tower of towers) {
      const isLocalTower = tower.ownerId === this.playerId;
      const accent =
        tower.typeId === "defender" ? 0x8bc4ff : tower.typeId === "archer" ? 0xd8ed8f : 0xc7a8ff;

      this.worldGraphics.fillStyle(0x060807, 0.3);
      this.worldGraphics.fillEllipse(tower.x, tower.y + 10, 24, 9);

      this.overlayGraphics.lineStyle(isLocalTower ? 2.3 : 1.7, accent, isLocalTower ? 0.9 : 0.68);
      this.overlayGraphics.strokeCircle(tower.x, tower.y - 2, isLocalTower ? 13 : 12);

      if (isLocalTower) {
        this.overlayGraphics.lineStyle(1.2, 0xf7f2da, 0.6);
        this.overlayGraphics.strokeCircle(tower.x, tower.y - 2, 9.8);
      }

      this.drawTowerGlyph(tower);
    }
  }

  private drawHeroOverlays(heroes: HeroSnapshot[]): void {
    const downedById = new Map(
      heroes
        .filter((hero) => hero.state === "downed")
        .map((hero) => [hero.id, hero]),
    );

    for (const hero of heroes) {
      const isLocalHero = hero.id === this.playerId;
      this.worldGraphics.fillStyle(0x090807, 0.29);
      this.worldGraphics.fillEllipse(hero.x, hero.y + 11, 24, 10);

      this.overlayGraphics.lineStyle(
        2,
        isLocalHero ? 0xfaf3cc : 0xd7d7d7,
        hero.state === "alive" ? 0.95 : 0.6,
      );
      this.overlayGraphics.strokeCircle(hero.x, hero.y, 11);

      if (hero.state === "downed") {
        const reviveRequiredMs = Math.max(1, this.snapshot?.reviveRequiredMs ?? 2800);
        const reviveRatio = hero.reviveProgressMs > 0 ? hero.reviveProgressMs / reviveRequiredMs : 0;
        this.overlayGraphics.lineStyle(2, 0x90f5a3, 0.9);
        this.overlayGraphics.strokeCircle(hero.x, hero.y, 14 + reviveRatio * 3);
      }

      if (hero.state === "dead") {
        this.overlayGraphics.lineStyle(2, 0x2e2727, 1);
        this.overlayGraphics.lineBetween(hero.x - 7, hero.y - 7, hero.x + 7, hero.y + 7);
        this.overlayGraphics.lineBetween(hero.x + 7, hero.y - 7, hero.x - 7, hero.y + 7);
      }

      if (hero.state === "alive" && hero.isReviving && hero.reviveTargetId) {
        const target = downedById.get(hero.reviveTargetId);
        if (!target) {
          continue;
        }

        const pulse = 0.5 + Math.sin(this.time.now / 95) * 0.5;
        this.overlayGraphics.lineStyle(2.4, 0x93ffce, 0.9);
        this.overlayGraphics.lineBetween(hero.x, hero.y - 1, target.x, target.y - 1);
        this.overlayGraphics.lineStyle(1.4, 0xe5fff5, 0.75);
        this.overlayGraphics.strokeCircle(hero.x, hero.y - 2, 12 + pulse * 1.5);
        this.overlayGraphics.strokeCircle(target.x, target.y - 2, 13 + pulse * 2.1);
      }
    }
  }

  private drawTowerMoveOverlay(snapshot: GameSnapshot, occupiedSlots: Set<number>): void {
    const selectedTower = this.getSelectedOwnedTower(snapshot);
    const hoveredSlotIndex =
      selectedTower !== null ? this.findClosestSlotIndex(this.pointerWorldX, this.pointerWorldY) : -1;

    if (this.moveModeEnabled) {
      for (let i = 0; i < snapshot.map.towerSlots.length; i += 1) {
        if (occupiedSlots.has(i)) {
          continue;
        }

        const slot = snapshot.map.towerSlots[i];
        const isHovered = i === hoveredSlotIndex;
        this.overlayGraphics.lineStyle(
          isHovered ? 2.5 : 1.6,
          isHovered ? 0xf7efcb : 0x77c8be,
          isHovered ? 0.95 : 0.55,
        );
        this.overlayGraphics.strokeCircle(slot.x, slot.y, isHovered ? 19 : 17);
      }
    }

    if (!selectedTower) {
      return;
    }

    const pulse = 0.5 + Math.sin(this.time.now / 125) * 0.5;
    this.overlayGraphics.lineStyle(3, 0x8af7ff, 0.95);
    this.overlayGraphics.strokeCircle(selectedTower.x, selectedTower.y - 2, 17 + pulse * 2.2);
    this.overlayGraphics.lineStyle(1.4, 0xe5fdfd, 0.75);
    this.overlayGraphics.strokeCircle(selectedTower.x, selectedTower.y - 2, 11 + pulse * 1.6);

    if (hoveredSlotIndex < 0 || occupiedSlots.has(hoveredSlotIndex)) {
      return;
    }

    const targetSlot = snapshot.map.towerSlots[hoveredSlotIndex];
    this.overlayGraphics.lineStyle(2, 0xe9f4d0, 0.75);
    this.overlayGraphics.lineBetween(selectedTower.x, selectedTower.y - 1, targetSlot.x, targetSlot.y);
  }

  private drawTowerGlyph(tower: TowerSnapshot): void {
    const x = tower.x;
    const y = tower.y - 3;

    if (tower.typeId === "defender") {
      this.overlayGraphics.fillStyle(0x36577f, 0.9);
      this.overlayGraphics.fillRoundedRect(x - 4, y - 5, 8, 11, 2);
      this.overlayGraphics.lineStyle(1, 0xe6f4ff, 0.8);
      this.overlayGraphics.strokeRoundedRect(x - 4, y - 5, 8, 11, 2);
      this.overlayGraphics.lineStyle(1.1, 0xbadfff, 0.82);
      this.overlayGraphics.lineBetween(x, y - 4, x, y + 4);
      return;
    }

    if (tower.typeId === "archer") {
      this.overlayGraphics.lineStyle(1.1, 0xe8f2c6, 0.9);
      this.overlayGraphics.strokeCircle(x - 1, y, 4);
      this.overlayGraphics.lineStyle(1.3, 0xc7df9f, 0.95);
      this.overlayGraphics.lineBetween(x + 1, y - 5, x + 4, y + 3);
      this.overlayGraphics.fillStyle(0xf5e8bd, 0.9);
      this.overlayGraphics.fillTriangle(x + 4, y + 3, x + 1, y + 1, x + 6, y);
      return;
    }

    this.overlayGraphics.fillStyle(0x9f88f7, 0.92);
    this.overlayGraphics.fillCircle(x, y, 3);
    this.overlayGraphics.lineStyle(1.1, 0xf0eaff, 0.8);
    this.overlayGraphics.lineBetween(x - 5, y, x + 5, y);
    this.overlayGraphics.lineBetween(x, y - 5, x, y + 5);
    this.overlayGraphics.lineStyle(0.8, 0xd8cbff, 0.7);
    this.overlayGraphics.lineBetween(x - 3, y - 3, x + 3, y + 3);
    this.overlayGraphics.lineBetween(x + 3, y - 3, x - 3, y + 3);
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

  private getHeroSpriteScale(hero: HeroSnapshot, isLocalHero: boolean): number {
    if (hero.state === "dead") {
      return isLocalHero ? 1.16 : 1.08;
    }
    if (hero.state === "downed") {
      return isLocalHero ? 1.22 : 1.12;
    }
    return isLocalHero ? 1.28 : 1.16;
  }

  private getEnemyTextureKey(enemy: EnemySnapshot): string {
    if (enemy.isBoss) {
      const frame = (Math.floor(this.time.now / 220) + enemy.id) % ENEMY_TEXTURE_KEYS.boss.length;
      return ENEMY_TEXTURE_KEYS.boss[frame];
    }

    const cadence = enemy.typeId === "runner" ? 120 : enemy.typeId === "elite" ? 160 : 200;
    const framePair = ENEMY_TEXTURE_KEYS[enemy.typeId];
    const frame = (Math.floor(this.time.now / cadence) + enemy.id) % framePair.length;
    return framePair[frame];
  }

  private getEnemySpriteScale(enemy: EnemySnapshot): number {
    if (enemy.isBoss) {
      return 1.7;
    }

    switch (enemy.typeId) {
      case "swarm":
        return 1.04;
      case "ranged":
        return 1.08;
      case "armored":
        return 1.16;
      case "runner":
        return 1;
      case "elite":
        return 1.24;
      default:
        return 1.08;
    }
  }

  private getTowerSpriteScale(towerType: TowerTypeId): number {
    switch (towerType) {
      case "defender":
        return 1.1;
      case "archer":
        return 1.05;
      case "mage":
      default:
        return 1.1;
    }
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
    this.overlayGraphics.fillStyle(0x050705, 0.06);
    for (let y = 0; y < height; y += TERRAIN_TILE_SIZE * 2) {
      this.overlayGraphics.fillRect(0, y, width, 1);
    }

    this.overlayGraphics.fillStyle(0x070907, 0.1);
    this.overlayGraphics.fillRect(0, 0, width, 16);
    this.overlayGraphics.fillRect(0, height - 16, width, 16);
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
        x: Phaser.Math.Between(0, 1600),
        y: Phaser.Math.Between(0, 900),
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

      if (mote.y > 904) {
        mote.y = -4;
        mote.x = Phaser.Math.Between(0, 1600);
      }
      if (mote.x < -6) {
        mote.x = 1606;
      } else if (mote.x > 1606) {
        mote.x = -6;
      }
    }
  }

  private drawAmbientMotes(): void {
    for (const mote of this.ambientMotes) {
      this.worldGraphics.fillStyle(0xe6e8cf, mote.alpha);
      this.worldGraphics.fillCircle(mote.x, mote.y, mote.size);
    }
  }

  private drawBaseObjective(snapshot: GameSnapshot): void {
    const { x, y } = snapshot.map.basePosition;
    const hpRatio = snapshot.baseMaxHp > 0 ? snapshot.baseHp / snapshot.baseMaxHp : 0;
    const pulse = 0.5 + Math.sin(this.time.now / 240) * 0.5;
    const bob = Math.sin(this.time.now / 260) * 1.4;
    const spin = this.time.now / 780;

    this.worldGraphics.fillStyle(0x21443a, 0.68);
    this.worldGraphics.fillEllipse(x, y + 9, 58, 24);
    this.worldGraphics.fillStyle(0x3e705f, 0.9);
    this.worldGraphics.fillCircle(x, y + 1, 22);
    this.worldGraphics.lineStyle(2, 0x8bc4b3, 0.56);
    this.worldGraphics.strokeCircle(x, y + 1, 22);

    this.overlayGraphics.lineStyle(3, 0xbff6e6, 0.62);
    this.overlayGraphics.strokeCircle(x, y - 2, 29 + pulse * 2.4);
    this.overlayGraphics.lineStyle(2, 0x87dfc5, 0.78);
    this.overlayGraphics.strokeCircle(x, y - 2, 17 + pulse * 1.2);

    for (let i = 0; i < 4; i += 1) {
      const angle = spin + (Math.PI / 2) * i;
      const lx = x + Math.cos(angle) * 12;
      const ly = y - 2 + Math.sin(angle) * 8;
      this.overlayGraphics.fillStyle(0xc7ffea, 0.75);
      this.overlayGraphics.fillCircle(lx, ly, 1.8);
    }

    this.overlayGraphics.fillStyle(0x5dcdb2, 0.96);
    this.overlayGraphics.fillCircle(x, y - 3 + bob, 8);
    this.overlayGraphics.fillStyle(0xecfff8, 0.96);
    this.overlayGraphics.fillCircle(x, y - 5 + bob, 3);

    this.overlayGraphics.lineStyle(4, 0x1d2a22, 0.9);
    this.overlayGraphics.strokeCircle(x, y - 2, 34);
    const hpColor = hpRatio > 0.55 ? 0x8fe46f : hpRatio > 0.25 ? 0xecc164 : 0xe06f64;
    this.overlayGraphics.lineStyle(3, hpColor, 0.95);
    this.overlayGraphics.beginPath();
    this.overlayGraphics.arc(
      x,
      y - 2,
      34,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * Phaser.Math.Clamp(hpRatio, 0, 1),
      false,
    );
    this.overlayGraphics.strokePath();
  }

  private getSelectedOwnedTower(snapshot = this.snapshot): TowerSnapshot | null {
    if (!snapshot || !this.playerId || this.selectedMoveTowerId === null) {
      return null;
    }

    return (
      snapshot.towers.find(
        (tower) => tower.id === this.selectedMoveTowerId && tower.ownerId === this.playerId,
      ) ?? null
    );
  }

  private sanitizeTowerMoveSelection(snapshot = this.snapshot): void {
    if (!snapshot || !this.playerId || this.selectedMoveTowerId === null) {
      return;
    }

    const towerExists = snapshot.towers.some(
      (tower) => tower.id === this.selectedMoveTowerId && tower.ownerId === this.playerId,
    );
    if (!towerExists) {
      this.selectedMoveTowerId = null;
    }
  }

  private resetTowerMoveState(): void {
    this.moveModeEnabled = false;
    this.selectedMoveTowerId = null;
  }

  private getLocalHero(snapshot = this.snapshot) {
    if (!snapshot || !this.playerId) {
      return null;
    }

    return snapshot.heroes.find((entry) => entry.id === this.playerId) ?? null;
  }
}
