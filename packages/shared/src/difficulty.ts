import type { DifficultyPreset } from "./types.js";

export interface DifficultyBalanceProfile {
  enemyHpMultiplier: number;
  enemySpeedMultiplier: number;
  enemyContactDamageMultiplier: number;
  enemyAttackDamageMultiplier: number;
  enemyAttackCooldownMultiplier: number;
  eliteEmpowerDurationMs: number;
  eliteEmpowerCooldownMinMs: number;
  eliteEmpowerCooldownMaxMs: number;
  eliteEmpowerSpeedMultiplier: number;
  eliteEmpowerDamageBonus: number;
  bossAttackRangePhase2: number;
  bossAttackRangePhase3: number;
  bossDamagePhase1: number;
  bossDamagePhase2: number;
  bossDamagePhase3: number;
  bossAttackCooldownPhase1Ms: number;
  bossAttackCooldownPhase2Ms: number;
  bossAttackCooldownPhase3Ms: number;
  bossSummonCooldownPhase2Ms: number;
  bossSummonCooldownPhase3Ms: number;
  bossSummonCountPhase2: number;
  bossSummonCountPhase3: number;
  bossShockwaveCooldownMs: number;
  bossShockwaveDamage: number;
  bossShockwaveRadius: number;
}

export const DEFAULT_DIFFICULTY: DifficultyPreset = "normal";

export const DIFFICULTY_BALANCE: Record<DifficultyPreset, DifficultyBalanceProfile> = {
  easy: {
    enemyHpMultiplier: 0.82,
    enemySpeedMultiplier: 0.9,
    enemyContactDamageMultiplier: 0.8,
    enemyAttackDamageMultiplier: 0.82,
    enemyAttackCooldownMultiplier: 1.18,
    eliteEmpowerDurationMs: 1200,
    eliteEmpowerCooldownMinMs: 5300,
    eliteEmpowerCooldownMaxMs: 7300,
    eliteEmpowerSpeedMultiplier: 1.38,
    eliteEmpowerDamageBonus: 2,
    bossAttackRangePhase2: 56,
    bossAttackRangePhase3: 72,
    bossDamagePhase1: 14,
    bossDamagePhase2: 18,
    bossDamagePhase3: 24,
    bossAttackCooldownPhase1Ms: 1450,
    bossAttackCooldownPhase2Ms: 1220,
    bossAttackCooldownPhase3Ms: 1020,
    bossSummonCooldownPhase2Ms: 7800,
    bossSummonCooldownPhase3Ms: 5600,
    bossSummonCountPhase2: 2,
    bossSummonCountPhase3: 2,
    bossShockwaveCooldownMs: 5200,
    bossShockwaveDamage: 15,
    bossShockwaveRadius: 120,
  },
  normal: {
    enemyHpMultiplier: 1,
    enemySpeedMultiplier: 1,
    enemyContactDamageMultiplier: 1,
    enemyAttackDamageMultiplier: 1,
    enemyAttackCooldownMultiplier: 1,
    eliteEmpowerDurationMs: 1600,
    eliteEmpowerCooldownMinMs: 4200,
    eliteEmpowerCooldownMaxMs: 6200,
    eliteEmpowerSpeedMultiplier: 1.55,
    eliteEmpowerDamageBonus: 3,
    bossAttackRangePhase2: 60,
    bossAttackRangePhase3: 80,
    bossDamagePhase1: 18,
    bossDamagePhase2: 24,
    bossDamagePhase3: 30,
    bossAttackCooldownPhase1Ms: 1200,
    bossAttackCooldownPhase2Ms: 1000,
    bossAttackCooldownPhase3Ms: 850,
    bossSummonCooldownPhase2Ms: 6200,
    bossSummonCooldownPhase3Ms: 4300,
    bossSummonCountPhase2: 2,
    bossSummonCountPhase3: 3,
    bossShockwaveCooldownMs: 3800,
    bossShockwaveDamage: 22,
    bossShockwaveRadius: 145,
  },
  hard: {
    enemyHpMultiplier: 1.26,
    enemySpeedMultiplier: 1.12,
    enemyContactDamageMultiplier: 1.28,
    enemyAttackDamageMultiplier: 1.25,
    enemyAttackCooldownMultiplier: 0.86,
    eliteEmpowerDurationMs: 2200,
    eliteEmpowerCooldownMinMs: 3300,
    eliteEmpowerCooldownMaxMs: 4700,
    eliteEmpowerSpeedMultiplier: 1.78,
    eliteEmpowerDamageBonus: 5,
    bossAttackRangePhase2: 74,
    bossAttackRangePhase3: 96,
    bossDamagePhase1: 22,
    bossDamagePhase2: 30,
    bossDamagePhase3: 40,
    bossAttackCooldownPhase1Ms: 980,
    bossAttackCooldownPhase2Ms: 820,
    bossAttackCooldownPhase3Ms: 680,
    bossSummonCooldownPhase2Ms: 4800,
    bossSummonCooldownPhase3Ms: 3300,
    bossSummonCountPhase2: 3,
    bossSummonCountPhase3: 4,
    bossShockwaveCooldownMs: 2900,
    bossShockwaveDamage: 30,
    bossShockwaveRadius: 165,
  },
};

export function parseDifficultyPreset(value: string | undefined | null): DifficultyPreset {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "easy" || normalized === "normal" || normalized === "hard") {
    return normalized;
  }
  return DEFAULT_DIFFICULTY;
}
