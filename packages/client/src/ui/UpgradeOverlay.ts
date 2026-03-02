import type { UpgradeOption } from "@pals-defence/shared";
import {
  type Locale,
  tr,
  trUpgradeDescription,
  trUpgradeName,
} from "../i18n";

export class UpgradeOverlay {
  constructor(private readonly root: HTMLElement) {}

  show(options: UpgradeOption[], onPick: (upgradeId: string) => void, locale: Locale): void {
    this.root.classList.remove("hidden");

    const panel = document.createElement("div");
    panel.className = "upgrade-panel";

    const title = document.createElement("h2");
    title.textContent = tr(locale, "choose_upgrade_title");

    const subtitle = document.createElement("p");
    subtitle.className = "upgrade-subtitle";
    subtitle.textContent = tr(locale, "choose_upgrade_subtitle");

    const grid = document.createElement("div");
    grid.className = "upgrade-grid";

    for (const option of options) {
      const localizedName = trUpgradeName(locale, option.id, option.name);
      const localizedDescription = trUpgradeDescription(locale, option.id, option.description);
      const card = document.createElement("button");
      card.className = `upgrade-card rarity-${option.rarity}`;
      card.type = "button";

      const name = document.createElement("p");
      name.className = "upgrade-name";
      name.textContent = localizedName;

      const rarity = document.createElement("p");
      rarity.className = "upgrade-rarity";
      rarity.textContent = tr(locale, `rarity_${option.rarity}`);

      const description = document.createElement("p");
      description.className = "upgrade-description";
      description.textContent = localizedDescription;

      card.append(name, rarity, description);
      card.addEventListener("click", () => {
        this.hide();
        onPick(option.id);
      });

      grid.append(card);
    }

    panel.append(title, subtitle, grid);
    this.root.replaceChildren(panel);
  }

  hide(): void {
    this.root.classList.add("hidden");
    this.root.replaceChildren();
  }
}
