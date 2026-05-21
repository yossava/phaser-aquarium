import Phaser from "phaser";
import { basicFood, foodAssetPath } from "../data/content";
import { gameHeight, gameWidth, maxRenderScale } from "../game/constants";
import { formatNumber } from "../game/economy";
import { gameFontFamily } from "../game/fonts";

export const BubblePopSceneKey = "BubblePopScene";

export type BubblePopResult = {
  score: number;
  coinReward: number;
  poppedCount: number;
  trashCount: number;
};

type BubblePopSceneData = {
  onComplete?: (result: BubblePopResult) => void;
  onCancel?: () => void;
  productionPerMinute?: number;
};

type BubbleKind = "coin" | "food" | "trash";

type Bubble = {
  container: Phaser.GameObjects.Container;
  ring: Phaser.GameObjects.Arc;
  kind: BubbleKind;
  value: number;
  radius: number;
  speed: number;
};

const commonCoinIconPath = "/assets/ui/icon-common-coin.png";
const bubblePopCoinTextureKey = "bubble-pop-common-coin";
const bubblePopFoodTextureKey = "bubble-pop-basic-food";
const bubblePopCrabTextureKey = "bubble-pop-crab";
const bubblePopCoinSoundKey = "bubble-pop-coin-pick";
const bubblePopFoodSoundKey = "bubble-pop-food-pick";
const bubblePopCrabSoundKey = "bubble-pop-crab-hit";
const bubblePopRewardSoundKey = "bubble-pop-reward";
const gameDurationMs = 30_000;
const bubbleSpawnMinMs = 260;
const bubbleSpawnMaxMs = 440;
const bubbleMinSpeed = 118;
const bubbleMaxSpeed = 184;
const bubbleMinRadius = 32;
const bubbleMaxRadius = 44;
const topSafeOffset = 42;
const bubbleSpawnBottomY = gameHeight + 44;
const bubbleEscapeY = 106;
const rewardPerPopMultiplier = 0.2;
const fallbackRewardPerScore = 0.25;
const resultButtonWidth = 168;
const resultButtonHeight = 52;

export class BubblePopScene extends Phaser.Scene {
  private onComplete?: (result: BubblePopResult) => void;
  private onCancel?: () => void;
  private productionPerMinute = 0;
  private bubbles: Bubble[] = [];
  private score = 0;
  private poppedCount = 0;
  private trashCount = 0;
  private finished = false;
  private resultShown = false;
  private resultClaimed = false;
  private gameEndsAt = 0;
  private nextSpawnAt = 0;
  private scoreText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private resultClaimBounds?: Phaser.Geom.Rectangle;
  private previousCanvasTouchAction = "";
  private cameraZoom = 1;

  constructor() {
    super({ key: BubblePopSceneKey });
  }

  init(data: BubblePopSceneData): void {
    this.onComplete = data.onComplete;
    this.onCancel = data.onCancel;
    this.productionPerMinute = Math.max(0, data.productionPerMinute ?? 0);
  }

  preload(): void {
    this.load.image(bubblePopCoinTextureKey, commonCoinIconPath);
    this.load.image(bubblePopFoodTextureKey, foodAssetPath(basicFood.id));
    this.load.image(bubblePopCrabTextureKey, "/assets/helpers/crab.png");
    this.load.audio(bubblePopCoinSoundKey, "/assets/audio/sfx/coin-pick.ogg");
    this.load.audio(bubblePopFoodSoundKey, "/assets/audio/sfx/fish-eat.ogg");
    this.load.audio(bubblePopCrabSoundKey, "/assets/audio/sfx/fish-hungry.ogg");
    this.load.audio(bubblePopRewardSoundKey, "/assets/audio/sfx/prize-reward.ogg");
  }

  create(): void {
    this.sys.setVisible(true);
    this.sys.setActive(true);
    this.input.enabled = true;
    this.cameras.cameras.forEach((camera) => {
      camera.visible = true;
    });
    this.input.removeAllListeners();
    this.resetRound();
    this.configureCameraForHighDpi();
    this.createBackground();
    this.createHud();
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.previousCanvasTouchAction = this.game.canvas.style.touchAction;
    this.game.canvas.style.touchAction = "none";
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  update(time: number, delta: number): void {
    if (this.finished) {
      return;
    }

    if (time >= this.nextSpawnAt) {
      this.spawnBubble();
      this.nextSpawnAt = time + Phaser.Math.Between(bubbleSpawnMinMs, bubbleSpawnMaxMs);
    }

    const deltaSeconds = delta / 1000;
    for (const bubble of [...this.bubbles]) {
      bubble.container.y -= bubble.speed * deltaSeconds;
      if (bubble.container.y < bubbleEscapeY) {
        this.removeBubble(bubble);
      }
    }

    this.syncTimerText();
    if (time >= this.gameEndsAt) {
      this.finishRound();
    }
  }

  private resetRound(): void {
    this.bubbles = [];
    this.score = 0;
    this.poppedCount = 0;
    this.trashCount = 0;
    this.finished = false;
    this.resultShown = false;
    this.resultClaimed = false;
    this.resultClaimBounds = undefined;
    this.gameEndsAt = this.time.now + gameDurationMs;
    this.nextSpawnAt = this.time.now + 280;
  }

  private createBackground(): void {
    this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x053554, 1);
    this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x0aa6c2, 0.18);
    for (let index = 0; index < 16; index += 1) {
      this.add.circle(
        Phaser.Math.Between(18, gameWidth - 18),
        Phaser.Math.Between(120, gameHeight - 42),
        Phaser.Math.FloatBetween(2, 7),
        0xcfffff,
        Phaser.Math.FloatBetween(0.1, 0.24)
      );
    }
  }

  private configureCameraForHighDpi(): void {
    const { zoom, scrollX, scrollY } = this.visibleViewportCameraState();
    this.cameraZoom = zoom;
    this.cameras.main.setOrigin(0, 0);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setScroll(scrollX, scrollY);
    this.cameras.main.setBackgroundColor("#053554");
  }

  private visibleViewportCameraState(): { zoom: number; scrollX: number; scrollY: number } {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      const fallbackZoom = Phaser.Math.Clamp(this.scale.gameSize.width / gameWidth, 1, maxRenderScale);
      return { zoom: fallbackZoom, scrollX: 0, scrollY: 0 };
    }

    const visibleCssLeft = Phaser.Math.Clamp(-rect.left, 0, rect.width);
    const visibleCssTop = Phaser.Math.Clamp(-rect.top, 0, rect.height);
    const visibleCssRight = Phaser.Math.Clamp(window.innerWidth - rect.left, 0, rect.width);
    const visibleCssBottom = Phaser.Math.Clamp(window.innerHeight - rect.top, 0, rect.height);
    const cssToCanvasX = canvas.width / rect.width;
    const cssToCanvasY = canvas.height / rect.height;
    const visibleCanvasLeft = visibleCssLeft * cssToCanvasX;
    const visibleCanvasTop = visibleCssTop * cssToCanvasY;
    const visibleCanvasWidth = Math.max(1, (visibleCssRight - visibleCssLeft) * cssToCanvasX);
    const visibleCanvasHeight = Math.max(1, (visibleCssBottom - visibleCssTop) * cssToCanvasY);
    const zoom = Phaser.Math.Clamp(
      Math.min(visibleCanvasWidth / gameWidth, visibleCanvasHeight / gameHeight),
      0.5,
      maxRenderScale
    );
    const marginX = Math.max(0, (visibleCanvasWidth - gameWidth * zoom) / 2);
    const marginY = Math.max(0, (visibleCanvasHeight - gameHeight * zoom) / 2);
    return {
      zoom,
      scrollX: -((visibleCanvasLeft + marginX) / zoom),
      scrollY: -((visibleCanvasTop + marginY) / zoom)
    };
  }

  private pointerDesignPoint(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    const camera = this.cameras.main;
    return new Phaser.Math.Vector2(pointer.x / this.cameraZoom + camera.scrollX, pointer.y / this.cameraZoom + camera.scrollY);
  }

  private createHud(): void {
    this.add.text(22, 25 + topSafeOffset, "Bubble Pop", {
      fontFamily: gameFontFamily,
      fontSize: "28px",
      color: "#e7fbff",
      stroke: "#05283f",
      strokeThickness: 6
    }).setDepth(10);

    this.scoreText = this.add.text(22, 70 + topSafeOffset, "0", {
      fontFamily: gameFontFamily,
      fontSize: "24px",
      color: "#fff5a8",
      stroke: "#05283f",
      strokeThickness: 5
    }).setDepth(10);

    this.timerText = this.add.text(gameWidth - 24, 32 + topSafeOffset, "30s", {
      fontFamily: gameFontFamily,
      fontSize: "24px",
      color: "#ffffff",
      stroke: "#05283f",
      strokeThickness: 5
    }).setOrigin(1, 0).setDepth(10);

    const done = this.add.text(gameWidth - 24, 76 + topSafeOffset, "Done", {
      fontFamily: gameFontFamily,
      fontSize: "18px",
      color: "#bff6ff",
      stroke: "#05283f",
      strokeThickness: 4
    }).setOrigin(1, 0).setDepth(10).setInteractive({ useHandCursor: true });
    done.on("pointerup", () => this.finishRound());
  }

  private spawnBubble(): void {
    const kind = this.randomBubbleKind();
    const radius = Phaser.Math.Between(bubbleMinRadius, bubbleMaxRadius);
    const x = Phaser.Math.Between(radius + 12, gameWidth - radius - 12);
    const y = bubbleSpawnBottomY + Phaser.Math.Between(0, 28);
    const speed = Phaser.Math.Between(bubbleMinSpeed, bubbleMaxSpeed);
    const value = kind === "trash" ? -3 : kind === "food" ? 2 : Phaser.Math.Between(2, 5);
    const container = this.add.container(x, y).setDepth(kind === "trash" ? 7 : 8);
    const fill = kind === "trash" ? 0x5d7180 : kind === "food" ? 0x6dff9c : 0x72e6ff;
    const ring = this.add.circle(0, 0, radius, fill, kind === "trash" ? 0.2 : 0.28)
      .setStrokeStyle(3, kind === "trash" ? 0xff8f8f : 0xdfffff, 0.86);
    const shine = this.add.circle(-radius * 0.3, -radius * 0.32, radius * 0.22, 0xffffff, 0.58);
    container.add([ring, shine]);
    if (kind === "trash") {
      container.add(this.add.image(0, 3, bubblePopCrabTextureKey).setDisplaySize(radius * 1.42, radius * 1.1));
    } else {
      const textureKey = kind === "food" ? bubblePopFoodTextureKey : bubblePopCoinTextureKey;
      const iconSize = kind === "food" ? radius * 1.08 : radius * 1.36;
      const icon = this.add.image(0, 1, textureKey).setDisplaySize(iconSize, iconSize);
      container.add(icon);
    }
    this.tweens.add({
      targets: container,
      x: x + Phaser.Math.Between(-22, 22),
      duration: Phaser.Math.Between(950, 1400),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.bubbles.push({ container, ring, kind, value, radius, speed });
  }

  private randomBubbleKind(): BubbleKind {
    const roll = Math.random();
    if (roll < 0.28) {
      return "trash";
    }
    if (roll < 0.42) {
      return "food";
    }
    return "coin";
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.resultShown) {
      const point = this.pointerDesignPoint(pointer);
      if (this.resultClaimBounds?.contains(point.x, point.y)) {
        this.claimResult();
      }
      return;
    }
    if (this.finished) {
      return;
    }

    const point = this.pointerDesignPoint(pointer);
    const bubble = [...this.bubbles]
      .reverse()
      .find((candidate) => Phaser.Math.Distance.Between(point.x, point.y, candidate.container.x, candidate.container.y) <= candidate.radius + 10);
    if (!bubble) {
      return;
    }
    this.popBubble(bubble);
  }

  private popBubble(bubble: Bubble): void {
    this.removeBubble(bubble, false);
    if (bubble.kind === "trash") {
      this.trashCount += 1;
      this.playSfx(bubblePopCrabSoundKey, { volume: 0.2, detune: -250 });
      this.scoreText?.setText(formatNumber(this.score));
      this.showPopLabel(bubble, "Game Over", "#ffb0b0");
      this.tweens.add({
        targets: bubble.container,
        alpha: 0,
        scale: 1.45,
        duration: 150,
        ease: "Sine.easeOut",
        onComplete: () => bubble.container.destroy()
      });
      this.time.delayedCall(180, () => this.finishRound());
      return;
    } else {
      this.poppedCount += 1;
      this.playSfx(bubble.kind === "food" ? bubblePopFoodSoundKey : bubblePopCoinSoundKey, {
        volume: bubble.kind === "food" ? 0.16 : 0.24,
        detune: bubble.kind === "food" ? 250 : Phaser.Math.Between(-80, 120)
      });
    }
    this.score = Math.max(0, this.score + bubble.value);
    this.scoreText?.setText(formatNumber(this.score));
    const label = bubble.value >= 0 ? `+${formatNumber(bubble.value)}` : formatNumber(bubble.value);
    this.showPopLabel(bubble, label, bubble.value >= 0 ? "#fff5a8" : "#ffb0b0");
    this.tweens.add({
      targets: bubble.container,
      alpha: 0,
      scale: 1.45,
      duration: 150,
      ease: "Sine.easeOut",
      onComplete: () => bubble.container.destroy()
    });
  }

  private showPopLabel(bubble: Bubble, label: string, color: string): void {
    const labelText = this.add.text(bubble.container.x, bubble.container.y - 12, label, {
      fontFamily: gameFontFamily,
      fontSize: "22px",
      color,
      stroke: "#05283f",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(14);
    this.tweens.add({
      targets: labelText,
      y: labelText.y - 22,
      alpha: 0,
      duration: 420,
      ease: "Sine.easeOut",
      onComplete: () => labelText.destroy()
    });
  }

  private playSfx(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (this.cache.audio.exists(key)) {
      this.sound.play(key, config);
    }
  }

  private removeBubble(bubble: Bubble, destroy = true): void {
    this.bubbles = this.bubbles.filter((candidate) => candidate !== bubble);
    this.tweens.killTweensOf(bubble.container);
    if (destroy) {
      bubble.container.destroy();
    }
  }

  private syncTimerText(): void {
    const remainingSeconds = Math.max(0, Math.ceil((this.gameEndsAt - this.time.now) / 1000));
    this.timerText?.setText(`${formatNumber(remainingSeconds)}s`);
  }

  private finishRound(): void {
    if (this.finished) {
      return;
    }
    this.finished = true;
    for (const bubble of [...this.bubbles]) {
      this.removeBubble(bubble);
    }
    this.showResult();
  }

  private coinReward(): number {
    const productionReward = Math.floor(this.poppedCount * this.productionPerMinute * rewardPerPopMultiplier);
    const scoreRewardFloor = Math.floor(this.score * fallbackRewardPerScore);
    return Math.max(productionReward, scoreRewardFloor);
  }

  private showResult(): void {
    this.resultShown = true;
    const reward = this.coinReward();
    this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x031f32, 0.46).setDepth(38);
    const panelWidth = gameWidth - 54;
    const panelHeight = 250;
    const panelX = gameWidth / 2 - panelWidth / 2;
    const panelY = gameHeight / 2 - panelHeight / 2;
    const panel = this.add.graphics().setDepth(39);
    panel.fillStyle(0x064464, 0.96);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 22);
    panel.lineStyle(3, 0x78dfff, 0.72);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 22);
    this.add.text(gameWidth / 2, gameHeight / 2 - 82, "Bubble Pop!", {
      fontFamily: gameFontFamily,
      fontSize: "28px",
      color: "#e7fbff",
      stroke: "#062840",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(40);
    this.add.text(gameWidth / 2, gameHeight / 2 - 38, `Score ${formatNumber(this.score)}`, {
      fontFamily: gameFontFamily,
      fontSize: "22px",
      color: "#bff6ff",
      stroke: "#062840",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(40);
    const coinIcon = this.add.image(gameWidth / 2 - 40, gameHeight / 2 + 6, bubblePopCoinTextureKey)
      .setDisplaySize(34, 34)
      .setDepth(40);
    this.add.text(coinIcon.x + 28, coinIcon.y, formatNumber(reward), {
      fontFamily: gameFontFamily,
      fontSize: "34px",
      color: "#fff5a8",
      stroke: "#062840",
      strokeThickness: 7
    }).setOrigin(0, 0.5).setDepth(40);
    const buttonY = gameHeight / 2 + 78;
    this.resultClaimBounds = new Phaser.Geom.Rectangle(
      gameWidth / 2 - resultButtonWidth / 2,
      buttonY - resultButtonHeight / 2,
      resultButtonWidth,
      resultButtonHeight
    );
    const buttonBg = this.add.graphics().setDepth(40);
    buttonBg.fillStyle(0x2fb72f, 1);
    buttonBg.fillRoundedRect(this.resultClaimBounds.x, this.resultClaimBounds.y, resultButtonWidth, resultButtonHeight, 16);
    buttonBg.lineStyle(3, 0xb9ffbd, 0.75);
    buttonBg.strokeRoundedRect(this.resultClaimBounds.x, this.resultClaimBounds.y, resultButtonWidth, resultButtonHeight, 16);
    this.add.text(gameWidth / 2, buttonY, "CLAIM", {
      fontFamily: gameFontFamily,
      fontSize: "24px",
      color: "#ffffff",
      stroke: "#124a12",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(41);
  }

  private claimResult(): void {
    if (this.resultClaimed) {
      return;
    }
    this.resultClaimed = true;
    this.resultClaimBounds = undefined;
    this.playSfx(bubblePopRewardSoundKey, { volume: 0.2 });
    const result: BubblePopResult = {
      score: this.score,
      coinReward: this.coinReward(),
      poppedCount: this.poppedCount,
      trashCount: this.trashCount
    };
    this.onComplete?.(result);
  }

  private cleanup(): void {
    this.game.canvas.style.touchAction = this.previousCanvasTouchAction;
    this.input.off("pointerdown", this.handlePointerDown, this);
    for (const bubble of [...this.bubbles]) {
      this.removeBubble(bubble);
    }
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
