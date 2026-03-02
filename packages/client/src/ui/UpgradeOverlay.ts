import type { UpgradeOption } from "@pals-defence/shared";

export class UpgradeOverlay {
  constructor(private readonly root: HTMLElement) {}

  show(options: UpgradeOption[], onPick: (upgradeId: string) => void): void {
    this.root.classList.remove("hidden");

    const panel = document.createElement("div");
    panel.className = "upgrade-panel";

    const title = document.createElement("h2");
    title.textContent = "Choose Your Upgrade";

    const grid = document.createElement("div");
    grid.className = "upgrade-grid";

    for (const option of options) {
      const card = document.createElement("button");
      card.className = "upgrade-card";
      card.type = "button";

      const name = document.createElement("p");
      name.className = "upgrade-name";
      name.textContent = option.name;

      const rarity = document.createElement("p");
      rarity.className = "upgrade-rarity";
      rarity.textContent = option.rarity;

      const description = document.createElement("p");
      description.className = "upgrade-description";
      description.textContent = option.description;

      card.append(name, rarity, description);
      card.addEventListener("click", () => {
        this.hide();
        onPick(option.id);
      });

      grid.append(card);
    }

    panel.append(title, grid);
    this.root.replaceChildren(panel);
  }

  hide(): void {
    this.root.classList.add("hidden");
    this.root.replaceChildren();
  }
}
