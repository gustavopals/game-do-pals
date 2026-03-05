const AUDIO_STORAGE_KEY = "pals_defence_sfx_enabled";

interface ToneStep {
  frequency: number;
  durationMs: number;
  startOffsetMs?: number;
  volume?: number;
  type?: OscillatorType;
}

export class SfxEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean;
  private lastPlayById = new Map<string, number>();

  constructor() {
    this.enabled = this.loadEnabledState();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  toggleEnabled(): boolean {
    this.enabled = !this.enabled;
    this.saveEnabledState(this.enabled);
    if (this.enabled) {
      this.prime();
    }
    return this.enabled;
  }

  prime(): void {
    if (!this.enabled) {
      return;
    }

    const context = this.ensureContext();
    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      void context.resume();
    }
  }

  playUiClick(): void {
    this.playSequence([
      { frequency: 720, durationMs: 42, volume: 0.12, type: "triangle" },
      { frequency: 920, durationMs: 38, startOffsetMs: 36, volume: 0.1, type: "triangle" },
    ]);
  }

  playUpgradePrompt(): void {
    if (!this.tryThrottle("upgrade_prompt", 180)) {
      return;
    }

    this.playSequence([
      { frequency: 470, durationMs: 130, volume: 0.11, type: "triangle" },
      { frequency: 620, durationMs: 120, startOffsetMs: 88, volume: 0.11, type: "triangle" },
      { frequency: 780, durationMs: 130, startOffsetMs: 168, volume: 0.1, type: "sine" },
    ]);
  }

  playWaveStart(): void {
    this.playSequence([
      { frequency: 360, durationMs: 120, volume: 0.13, type: "square" },
      { frequency: 460, durationMs: 130, startOffsetMs: 90, volume: 0.12, type: "square" },
      { frequency: 560, durationMs: 150, startOffsetMs: 185, volume: 0.12, type: "triangle" },
    ]);
  }

  playIntermission(): void {
    this.playSequence([
      { frequency: 500, durationMs: 130, volume: 0.11, type: "triangle" },
      { frequency: 390, durationMs: 150, startOffsetMs: 110, volume: 0.11, type: "triangle" },
    ]);
  }

  playTowerPlace(): void {
    this.playSequence([
      { frequency: 270, durationMs: 70, volume: 0.12, type: "square" },
      { frequency: 380, durationMs: 80, startOffsetMs: 55, volume: 0.12, type: "triangle" },
    ]);
  }

  playTowerMove(): void {
    this.playSequence([
      { frequency: 320, durationMs: 72, volume: 0.11, type: "triangle" },
      { frequency: 290, durationMs: 80, startOffsetMs: 56, volume: 0.1, type: "triangle" },
    ]);
  }

  playSkillArcane(): void {
    if (!this.tryThrottle("skill_arcane", 90)) {
      return;
    }

    this.playSequence([
      { frequency: 980, durationMs: 85, volume: 0.12, type: "sawtooth" },
      { frequency: 740, durationMs: 78, startOffsetMs: 54, volume: 0.1, type: "triangle" },
    ]);
  }

  playSkillPulse(): void {
    if (!this.tryThrottle("skill_pulse", 90)) {
      return;
    }

    this.playSequence([
      { frequency: 660, durationMs: 70, volume: 0.1, type: "sine" },
      { frequency: 820, durationMs: 70, startOffsetMs: 50, volume: 0.1, type: "sine" },
      { frequency: 560, durationMs: 90, startOffsetMs: 95, volume: 0.09, type: "triangle" },
    ]);
  }

  playEnemyDefeat(defeatCount = 1): void {
    if (!this.tryThrottle("enemy_defeat", 120)) {
      return;
    }

    const burst = Math.min(4, Math.max(1, defeatCount));
    const steps: ToneStep[] = [];
    for (let index = 0; index < burst; index += 1) {
      steps.push({
        frequency: 220 + index * 34,
        durationMs: 45,
        startOffsetMs: index * 26,
        volume: 0.07,
        type: "square",
      });
    }
    this.playSequence(steps);
  }

  playEliteBurst(): void {
    if (!this.tryThrottle("elite_burst", 220)) {
      return;
    }

    this.playSequence([
      { frequency: 220, durationMs: 120, volume: 0.13, type: "sawtooth" },
      { frequency: 170, durationMs: 130, startOffsetMs: 82, volume: 0.11, type: "square" },
    ]);
  }

  playBossShockwave(): void {
    if (!this.tryThrottle("boss_shockwave", 260)) {
      return;
    }

    this.playSequence([
      { frequency: 180, durationMs: 160, volume: 0.14, type: "sawtooth" },
      { frequency: 120, durationMs: 200, startOffsetMs: 110, volume: 0.12, type: "square" },
    ]);
  }

  playReviveStart(): void {
    if (!this.tryThrottle("revive_start", 280)) {
      return;
    }

    this.playSequence([
      { frequency: 540, durationMs: 90, volume: 0.1, type: "sine" },
      { frequency: 620, durationMs: 90, startOffsetMs: 62, volume: 0.09, type: "sine" },
    ]);
  }

  playReviveComplete(): void {
    this.playSequence([
      { frequency: 520, durationMs: 110, volume: 0.12, type: "triangle" },
      { frequency: 700, durationMs: 120, startOffsetMs: 90, volume: 0.11, type: "triangle" },
      { frequency: 920, durationMs: 140, startOffsetMs: 185, volume: 0.1, type: "sine" },
    ]);
  }

  playVictory(): void {
    this.playSequence([
      { frequency: 440, durationMs: 150, volume: 0.12, type: "triangle" },
      { frequency: 554, durationMs: 150, startOffsetMs: 130, volume: 0.11, type: "triangle" },
      { frequency: 659, durationMs: 170, startOffsetMs: 260, volume: 0.11, type: "triangle" },
      { frequency: 880, durationMs: 190, startOffsetMs: 400, volume: 0.1, type: "sine" },
    ]);
  }

  playDefeat(): void {
    this.playSequence([
      { frequency: 320, durationMs: 180, volume: 0.12, type: "sawtooth" },
      { frequency: 250, durationMs: 200, startOffsetMs: 130, volume: 0.12, type: "square" },
      { frequency: 190, durationMs: 220, startOffsetMs: 290, volume: 0.1, type: "square" },
    ]);
  }

  playError(): void {
    this.playSequence([
      { frequency: 240, durationMs: 75, volume: 0.11, type: "square" },
      { frequency: 180, durationMs: 90, startOffsetMs: 52, volume: 0.11, type: "square" },
    ]);
  }

  private playSequence(steps: ToneStep[]): void {
    if (!this.enabled || steps.length === 0) {
      return;
    }

    const context = this.ensureContext();
    const masterGain = this.masterGain;
    if (!context || !masterGain) {
      return;
    }

    const now = context.currentTime;
    for (const step of steps) {
      const start = now + (step.startOffsetMs ?? 0) / 1000;
      const duration = Math.max(0.01, step.durationMs / 1000);
      const gainAmount = Math.max(0.01, step.volume ?? 0.1);
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = step.type ?? "triangle";
      oscillator.frequency.setValueAtTime(step.frequency, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainAmount, start + Math.min(0.02, duration * 0.35));
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    }
  }

  private tryThrottle(id: string, minIntervalMs: number): boolean {
    const nowMs = performance.now();
    const previousMs = this.lastPlayById.get(id) ?? 0;
    if (nowMs - previousMs < minIntervalMs) {
      return false;
    }
    this.lastPlayById.set(id, nowMs);
    return true;
  }

  private ensureContext(): AudioContext | null {
    if (this.context && this.masterGain) {
      return this.context;
    }

    if (typeof window === "undefined") {
      return null;
    }

    const audioContextCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!audioContextCtor) {
      return null;
    }

    this.context = new audioContextCtor();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.18;
    this.masterGain.connect(this.context.destination);
    return this.context;
  }

  private loadEnabledState(): boolean {
    try {
      const value = localStorage.getItem(AUDIO_STORAGE_KEY);
      return value !== "0";
    } catch {
      return true;
    }
  }

  private saveEnabledState(enabled: boolean): void {
    try {
      localStorage.setItem(AUDIO_STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  }
}
