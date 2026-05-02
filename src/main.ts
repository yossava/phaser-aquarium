import Phaser from "phaser";
import "./styles.css";
import { gameHeight, gameWidth } from "./game/constants";
import { AquariumScene } from "./scenes/AquariumScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: gameWidth,
  height: gameHeight,
  backgroundColor: "#071b2a",
  scene: [AquariumScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
});

