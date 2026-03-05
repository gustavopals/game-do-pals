import Phaser from "phaser";

import { GameScene } from "./game/GameScene";
import { GameClient } from "./network/GameClient";
import "./style.css";
import { UpgradeOverlay } from "./ui/UpgradeOverlay";

const overlayElement = document.getElementById("upgrade-overlay");
if (!overlayElement) {
  throw new Error("Missing upgrade overlay element");
}

const client = new GameClient();
const overlay = new UpgradeOverlay(overlayElement);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  width: 1600,
  height: 900,
  backgroundColor: "#0d1212",
  pixelArt: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    roundPixels: true,
  },
  scene: [new GameScene(client, overlay)],
});
