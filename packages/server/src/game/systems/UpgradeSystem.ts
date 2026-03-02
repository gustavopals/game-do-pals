import {
  UPGRADE_CHOICES,
  UPGRADE_POOL,
  type UpgradeDefinition,
  type UpgradeOption,
  SeededRng,
} from "@pals-defence/shared";

import type { HeroRuntime } from "../runtime.js";

const RARITY_WEIGHT: Record<UpgradeDefinition["rarity"], number> = {
  common: 6,
  rare: 3,
  epic: 1,
};

export class UpgradeSystem {
  generateOptions(hero: HeroRuntime, rng: SeededRng): UpgradeOption[] {
    const available = UPGRADE_POOL.filter((upgrade) => !hero.ownedUpgradeIds.has(upgrade.id));
    if (available.length === 0) {
      return [];
    }

    if (available.length <= UPGRADE_CHOICES) {
      return available.map((upgrade) => this.toOption(upgrade));
    }

    const selected: UpgradeDefinition[] = [];
    let attempts = 0;

    while (selected.length < UPGRADE_CHOICES && attempts < 100) {
      attempts += 1;
      const picked = this.pickWeighted(available, rng);
      if (!selected.some((upgrade) => upgrade.id === picked.id)) {
        selected.push(picked);
      }
    }

    if (selected.length < UPGRADE_CHOICES) {
      for (const upgrade of available) {
        if (selected.length >= UPGRADE_CHOICES) {
          break;
        }
        if (!selected.some((entry) => entry.id === upgrade.id)) {
          selected.push(upgrade);
        }
      }
    }

    return selected.map((upgrade) => this.toOption(upgrade));
  }

  getDefinition(upgradeId: string): UpgradeDefinition | undefined {
    return UPGRADE_POOL.find((upgrade) => upgrade.id === upgradeId);
  }

  private pickWeighted(pool: UpgradeDefinition[], rng: SeededRng): UpgradeDefinition {
    const totalWeight = pool.reduce((sum, upgrade) => sum + RARITY_WEIGHT[upgrade.rarity], 0);
    let roll = rng.next() * totalWeight;

    for (const upgrade of pool) {
      roll -= RARITY_WEIGHT[upgrade.rarity];
      if (roll <= 0) {
        return upgrade;
      }
    }

    return pool[pool.length - 1];
  }

  private toOption(upgrade: UpgradeDefinition): UpgradeOption {
    return {
      id: upgrade.id,
      name: upgrade.name,
      description: upgrade.description,
      rarity: upgrade.rarity,
    };
  }
}
