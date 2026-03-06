const MUSIC_STORAGE_KEY = "pals_defence_music_enabled";
const MUSIC_VOLUME_KEY = "pals_defence_music_volume";
const MUSIC_GAIN_LEVELS = [0, 0.35, 0.6, 1.0, 1.4] as const;
const SCHEDULE_AHEAD = 0.15; // seconds to schedule ahead of playback
const FADE_IN = 0.8;
const FADE_OUT = 0.6;

export type MusicTheme = "idle" | "combat" | "boss" | "stopped";

interface PatternNote {
  freq: number;
  beatOffset: number; // beats from bar start
  duration: number;   // in beats
  volume: number;
  type: OscillatorType;
}

interface MusicPattern {
  bpm: number;
  beatsPerBar: number;
  gainTarget: number;
  notes: PatternNote[];
}

// Note frequencies
const A1 = 55.0;
const A2 = 110.0;
const C3 = 130.81;
const D3 = 146.83;
const Eb3 = 155.56;
const E3 = 164.81;
const F3 = 174.61;
const G3 = 196.0;
const A3 = 220.0;
const Bb3 = 233.08;
const C4 = 261.63;
const D4 = 293.66;
const E4 = 329.63;
const G4 = 392.0;
const A4 = 440.0;

const PATTERNS: Record<Exclude<MusicTheme, "stopped">, MusicPattern> = {
  // Calm ambient arpeggio in A minor — plays during intermission and menus
  idle: {
    bpm: 72,
    beatsPerBar: 8,
    gainTarget: 0.2,
    notes: [
      { freq: A2, beatOffset: 0, duration: 8, volume: 0.038, type: "sine" },
      { freq: E3, beatOffset: 0, duration: 8, volume: 0.022, type: "sine" },
      { freq: A3, beatOffset: 0,   duration: 0.8, volume: 0.055, type: "triangle" },
      { freq: C4, beatOffset: 1,   duration: 0.8, volume: 0.055, type: "triangle" },
      { freq: E4, beatOffset: 2,   duration: 0.8, volume: 0.055, type: "triangle" },
      { freq: G4, beatOffset: 3,   duration: 0.8, volume: 0.050, type: "triangle" },
      { freq: A4, beatOffset: 4,   duration: 1.0, volume: 0.050, type: "triangle" },
      { freq: G4, beatOffset: 5,   duration: 0.8, volume: 0.050, type: "triangle" },
      { freq: E4, beatOffset: 6,   duration: 0.8, volume: 0.055, type: "triangle" },
      { freq: C4, beatOffset: 7,   duration: 0.8, volume: 0.050, type: "triangle" },
    ],
  },

  // Driving combat loop in A minor — plays during active waves
  combat: {
    bpm: 120,
    beatsPerBar: 8,
    gainTarget: 0.2,
    notes: [
      // Driving sawtooth bass
      { freq: A2, beatOffset: 0, duration: 0.42, volume: 0.065, type: "sawtooth" },
      { freq: A2, beatOffset: 1, duration: 0.42, volume: 0.060, type: "sawtooth" },
      { freq: E3, beatOffset: 2, duration: 0.42, volume: 0.065, type: "sawtooth" },
      { freq: A2, beatOffset: 3, duration: 0.42, volume: 0.060, type: "sawtooth" },
      { freq: A2, beatOffset: 4, duration: 0.42, volume: 0.065, type: "sawtooth" },
      { freq: A2, beatOffset: 5, duration: 0.42, volume: 0.060, type: "sawtooth" },
      { freq: E3, beatOffset: 6, duration: 0.42, volume: 0.065, type: "sawtooth" },
      { freq: A2, beatOffset: 7, duration: 0.42, volume: 0.060, type: "sawtooth" },
      // Syncopated triangle melody
      { freq: A3, beatOffset: 0.0, duration: 0.40, volume: 0.055, type: "triangle" },
      { freq: C4, beatOffset: 0.5, duration: 0.30, volume: 0.050, type: "triangle" },
      { freq: E4, beatOffset: 1.5, duration: 0.40, volume: 0.055, type: "triangle" },
      { freq: D4, beatOffset: 2.0, duration: 0.35, volume: 0.050, type: "triangle" },
      { freq: E4, beatOffset: 2.5, duration: 0.30, volume: 0.050, type: "triangle" },
      { freq: G4, beatOffset: 3.5, duration: 0.40, volume: 0.055, type: "triangle" },
      { freq: A4, beatOffset: 4.0, duration: 0.40, volume: 0.055, type: "triangle" },
      { freq: G4, beatOffset: 4.5, duration: 0.30, volume: 0.050, type: "triangle" },
      { freq: E4, beatOffset: 5.0, duration: 0.35, volume: 0.050, type: "triangle" },
      { freq: C4, beatOffset: 5.5, duration: 0.30, volume: 0.050, type: "triangle" },
      { freq: A3, beatOffset: 6.5, duration: 0.40, volume: 0.055, type: "triangle" },
      { freq: E3, beatOffset: 7.0, duration: 0.35, volume: 0.050, type: "sawtooth" },
      { freq: A3, beatOffset: 7.5, duration: 0.25, volume: 0.045, type: "triangle" },
    ],
  },

  // Heavy ominous riff in D minor — plays when boss is alive
  boss: {
    bpm: 90,
    beatsPerBar: 8,
    gainTarget: 0.2,
    notes: [
      // Deep drones
      { freq: A1, beatOffset: 0, duration: 8, volume: 0.045, type: "square" },
      { freq: A2, beatOffset: 0, duration: 8, volume: 0.028, type: "sawtooth" },
      // Ominous D-minor riff with dissonant Eb3 passing tone
      { freq: D3,  beatOffset: 0.0, duration: 0.50, volume: 0.072, type: "sawtooth" },
      { freq: A2,  beatOffset: 0.5, duration: 0.30, volume: 0.055, type: "square" },
      { freq: D3,  beatOffset: 1.0, duration: 0.50, volume: 0.068, type: "sawtooth" },
      { freq: Eb3, beatOffset: 2.0, duration: 0.50, volume: 0.072, type: "sawtooth" },
      { freq: A2,  beatOffset: 2.5, duration: 0.30, volume: 0.055, type: "square" },
      { freq: D3,  beatOffset: 3.0, duration: 1.40, volume: 0.072, type: "sawtooth" },
      { freq: A2,  beatOffset: 4.5, duration: 0.30, volume: 0.050, type: "square" },
      { freq: D3,  beatOffset: 5.0, duration: 0.40, volume: 0.068, type: "sawtooth" },
      { freq: F3,  beatOffset: 5.5, duration: 0.30, volume: 0.058, type: "sawtooth" },
      { freq: A3,  beatOffset: 6.0, duration: 0.40, volume: 0.062, type: "sawtooth" },
      { freq: Bb3, beatOffset: 6.5, duration: 0.30, volume: 0.058, type: "sawtooth" },
      { freq: D3,  beatOffset: 7.0, duration: 1.00, volume: 0.072, type: "square" },
    ],
  },
};

export class MusicEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private themeGains = new Map<Exclude<MusicTheme, "stopped">, GainNode>();
  private currentTheme: MusicTheme = "stopped";
  private schedulerGen = 0;
  private primed = false;
  private enabled: boolean;
  private volumeLevel: number;

  constructor() {
    this.enabled = this.loadEnabledState();
    this.volumeLevel = this.loadVolumeLevel();
  }

  getVolumeLevel(): number {
    return this.volumeLevel;
  }

  setVolumeLevel(level: number): void {
    this.volumeLevel = Math.max(0, Math.min(4, level));
    this.saveVolumeLevel(this.volumeLevel);
    if (this.masterGain) {
      this.masterGain.gain.value = MUSIC_GAIN_LEVELS[this.volumeLevel];
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.saveEnabledState(enabled);
    if (!enabled) {
      this.applyTheme("stopped");
    } else if (this.primed && this.currentTheme !== "stopped") {
      this.applyTheme(this.currentTheme);
    }
  }

  prime(): void {
    if (!this.enabled) return;
    if (this.primed) return;
    this.primed = true;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const start = () => {
      if (this.currentTheme !== "stopped") {
        this.applyTheme(this.currentTheme);
      }
    };

    if (ctx.state === "suspended") {
      void ctx.resume().then(start);
    } else {
      start();
    }
  }

  playTheme(theme: MusicTheme): void {
    if (!this.enabled && theme !== "stopped") return;
    if (theme === this.currentTheme) return;
    this.currentTheme = theme;

    if (!this.primed) return; // Will start on prime()
    this.applyTheme(theme);
  }

  stop(): void {
    this.playTheme("stopped");
  }

  private applyTheme(theme: MusicTheme): void {
    const gen = ++this.schedulerGen;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Fade out all active themes
    for (const [, gain] of this.themeGains) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + FADE_OUT);
    }

    if (theme === "stopped") return;

    const pattern = PATTERNS[theme];
    const themeGain = this.getOrCreateThemeGain(ctx, theme);
    const now = ctx.currentTime;
    themeGain.gain.cancelScheduledValues(now);
    themeGain.gain.setValueAtTime(0, now);
    themeGain.gain.linearRampToValueAtTime(pattern.gainTarget, now + FADE_IN);

    this.scheduleBar(ctx, theme, gen, pattern, now + 0.05);
  }

  private scheduleBar(
    ctx: AudioContext,
    theme: Exclude<MusicTheme, "stopped">,
    gen: number,
    pattern: MusicPattern,
    barStartTime: number,
  ): void {
    if (gen !== this.schedulerGen) return;

    const beatDuration = 60 / pattern.bpm;
    const barDuration = beatDuration * pattern.beatsPerBar;
    const themeGain = this.getOrCreateThemeGain(ctx, theme);

    for (const note of pattern.notes) {
      const startTime = barStartTime + note.beatOffset * beatDuration;
      const duration = note.duration * beatDuration;

      if (startTime < ctx.currentTime - 0.01) continue;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = note.type;
      osc.frequency.setValueAtTime(note.freq, startTime);

      const attack = Math.min(0.04, duration * 0.15);
      const release = Math.min(0.1, duration * 0.25);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(note.volume, startTime + attack);
      gain.gain.setValueAtTime(note.volume, startTime + duration - release);
      gain.gain.linearRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(themeGain);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.015);
    }

    const nextBarTime = barStartTime + barDuration;
    const delayMs = (nextBarTime - ctx.currentTime - SCHEDULE_AHEAD) * 1000;
    setTimeout(() => {
      if (gen !== this.schedulerGen) return;
      this.scheduleBar(ctx, theme, gen, pattern, nextBarTime);
    }, Math.max(0, delayMs));
  }

  private getOrCreateThemeGain(
    ctx: AudioContext,
    theme: Exclude<MusicTheme, "stopped">,
  ): GainNode {
    let gain = this.themeGains.get(theme);
    if (!gain) {
      gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(this.masterGain!);
      this.themeGains.set(theme, gain);
    }
    return gain;
  }

  private ensureContext(): AudioContext | null {
    if (this.context && this.masterGain) return this.context;
    if (typeof window === "undefined") return null;

    const Ctor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    this.context = new Ctor();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = MUSIC_GAIN_LEVELS[this.volumeLevel];
    this.masterGain.connect(this.context.destination);
    return this.context;
  }

  private loadEnabledState(): boolean {
    try {
      return localStorage.getItem(MUSIC_STORAGE_KEY) !== "0";
    } catch {
      return true;
    }
  }

  private saveEnabledState(enabled: boolean): void {
    try {
      localStorage.setItem(MUSIC_STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // ignore
    }
  }

  private loadVolumeLevel(): number {
    try {
      const raw = localStorage.getItem(MUSIC_VOLUME_KEY);
      const parsed = raw !== null ? parseInt(raw, 10) : 3;
      return isNaN(parsed) ? 3 : Math.max(0, Math.min(4, parsed));
    } catch {
      return 3;
    }
  }

  private saveVolumeLevel(level: number): void {
    try {
      localStorage.setItem(MUSIC_VOLUME_KEY, String(level));
    } catch {
      // ignore
    }
  }
}
