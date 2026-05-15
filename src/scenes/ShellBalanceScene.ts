import Phaser from "phaser";
import { helperCreatureTypes } from "../data/content";
import { gameHeight, gameWidth, maxRenderScale } from "../game/constants";
import { formatNumber } from "../game/economy";
import { gameFontFamily } from "../game/fonts";

export const ShellBalanceSceneKey = "ShellBalanceScene";

export type ShellBalanceResult = {
  score: number;
  caughtCount: number;
  fallCount: number;
};

type ShellBalanceSceneData = {
  onComplete?: (result: ShellBalanceResult) => void;
  onCancel?: () => void;
  productionPerMinute?: number;
};

type StackPieceSource = {
  id: string;
  name: string;
  textureKey: string;
  width: number;
  height: number;
};

type StackPiece = {
  body: Phaser.Physics.Matter.Image;
  source: StackPieceSource;
  settled: boolean;
  released: boolean;
  jellyPhase: number;
  jellyKick: number;
};

const floorY = gameHeight - 56;
const platformWidth = 150;
const platformHeight = 24;
const platformX = gameWidth / 2;
const platformMoveRange = 96;
const platformMoveSpeed = 0.00115;
const spawnY = 140;
const dragLowerLimitY = gameHeight / 3;
const maxFalls = 5;
const settleSpeed = 0.42;
const settleDelayMs = 560;
const jellyDragSquash = 0.12;
const jellyKickDecayPerSecond = 3.8;
const platformTouchCarry = 0.74;
const commonCoinIconPath = "/assets/ui/icon-common-coin.png";
const coinCollectSoundKey = "sfx-coin-collect";
const coinCollectSoundPath = "/assets/audio/sfx/coin-pick.ogg";
const fishEatSoundKey = "sfx-fish-eat";
const fishEatSoundPath = "/assets/audio/sfx/fish-eat.ogg";

export class ShellBalanceScene extends Phaser.Scene {
  private onComplete?: (result: ShellBalanceResult) => void;
  private onCancel?: () => void;
  private pieces: StackPiece[] = [];
  private activePiece?: StackPiece;
  private pieceSources: StackPieceSource[] = [];
  private targetX = gameWidth / 2;
  private fallCount = 0;
  private settledCount = 0;
  private finished = false;
  private draggingPiece = false;
  private dragOffset = new Phaser.Math.Vector2();
  private activeSettledSince?: number;
  private prizeText?: Phaser.GameObjects.Text;
  private fallText?: Phaser.GameObjects.Text;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private platformBody?: MatterJS.BodyType;
  private platformTop?: Phaser.GameObjects.Rectangle;
  private platformShadow?: Phaser.GameObjects.Rectangle;
  private platformCurrentX = platformX;
  private productionPerMinute = 0;
  private prizeCoinIcon?: Phaser.GameObjects.Image;

  constructor() {
    super({
      key: ShellBalanceSceneKey,
      physics: {
        matter: {
          debug: false,
          gravity: { x: 0, y: 0.72 }
        }
      }
    });
  }

  init(data: ShellBalanceSceneData): void {
    this.onComplete = data.onComplete;
    this.onCancel = data.onCancel;
    this.productionPerMinute = Math.max(0, data.productionPerMinute ?? 0);
  }

  preload(): void {
    helperCreatureTypes.forEach((helperType) => {
      this.load.image(this.stackHelperTextureKey(helperType.id), `/assets/helpers/${helperType.id}.png`);
    });
    this.load.image("stack-prize-common-coin", commonCoinIconPath);
    if (!this.cache.audio.exists(coinCollectSoundKey)) {
      this.load.audio(coinCollectSoundKey, coinCollectSoundPath);
    }
    if (!this.cache.audio.exists(fishEatSoundKey)) {
      this.load.audio(fishEatSoundKey, fishEatSoundPath);
    }
  }

  create(): void {
    this.input.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
    this.matter.world.resume();
    this.finished = false;
    this.pieces = [];
    this.activePiece = undefined;
    this.targetX = gameWidth / 2;
    this.fallCount = 0;
    this.settledCount = 0;
    this.draggingPiece = false;
    this.dragOffset.set(0, 0);
    this.activeSettledSince = undefined;

    this.configureCameraForHighDpi();
    this.createBackdrop();
    this.createPieceSources();
    this.createBounds();
    this.createDragBoundary();
    this.createPlatform();
    this.createHud();
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.spawnPiece();

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.dragActivePiece(pointer));
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.beginDragActivePiece(pointer));
    this.input.on("pointerup", () => this.releaseActivePiece());
    this.input.on("pointerupoutside", () => this.releaseActivePiece());
    this.input.keyboard?.on("keydown-ESC", () => this.cancelGame());
  }

  update(time: number, delta: number): void {
    if (this.finished) {
      return;
    }

    const platformDeltaX = this.updateMovingPlatform(time);
    this.applyPlatformFriction(platformDeltaX);
    this.updateActivePiece(delta, time);
    this.updateJellyPieces(time, delta);
    this.prizeText?.setText(formatNumber(this.currentPrizeAmount()));
    this.fallText?.setText(`Falls ${formatNumber(this.fallCount)}/${formatNumber(maxFalls)}`);
  }

  private configureCameraForHighDpi(): void {
    const renderScale = this.currentRenderScale();
    this.cameras.main.setOrigin(0, 0);
    this.cameras.main.setZoom(renderScale);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBackgroundColor("#083b5c");
  }

  private currentRenderScale(): number {
    return Phaser.Math.Clamp(this.scale.gameSize.width / gameWidth, 1, maxRenderScale);
  }

  private pointerDesignX(pointer: Phaser.Input.Pointer): number {
    return pointer.x / this.currentRenderScale();
  }

  private pointerDesignPoint(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    const renderScale = this.currentRenderScale();
    return new Phaser.Math.Vector2(pointer.x / renderScale, pointer.y / renderScale);
  }

  private createBackdrop(): void {
    this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x083b5c, 1);
    this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x0b81a3, 0.16);
    for (let index = 0; index < 24; index += 1) {
      this.add.circle(
        Phaser.Math.Between(18, gameWidth - 18),
        Phaser.Math.Between(96, gameHeight - 82),
        Phaser.Math.Between(3, 9),
        0xd8fbff,
        Phaser.Math.FloatBetween(0.08, 0.2)
      );
    }
  }

  private createPieceSources(): void {
    const helperSources: StackPieceSource[] = helperCreatureTypes.map((helperType) => ({
      id: `helper-${helperType.id}`,
      name: helperType.name,
      textureKey: this.stackHelperTextureKey(helperType.id),
      width: helperType.id === "feeder-snail" ? 70 : 58,
      height: helperType.id === "feeder-snail" ? 36 : 42
    }));
    this.pieceSources = helperSources.filter((source) => this.textures.exists(source.textureKey));
  }

  private stackHelperTextureKey(helperTypeId: string): string {
    return `stack-helper-${helperTypeId}`;
  }

  private createBounds(): void {
    this.matter.world.setBounds(0, 0, gameWidth, gameHeight, 36, false, false, false, false);
    this.matter.add.rectangle(-24, gameHeight / 2, 20, gameHeight, { isStatic: true, label: "left-loss" });
    this.matter.add.rectangle(gameWidth + 24, gameHeight / 2, 20, gameHeight, { isStatic: true, label: "right-loss" });
  }

  private createPlatform(): void {
    this.platformCurrentX = platformX;
    this.platformTop = this.add.rectangle(platformX, floorY, platformWidth, platformHeight, 0x5ddaff, 0.96)
      .setStrokeStyle(3, 0xd9fbff, 0.86)
      .setDepth(2);
    this.platformShadow = this.add.rectangle(platformX, floorY + 20, platformWidth + 28, 20, 0x063a58, 0.7).setDepth(1);
    this.platformBody = this.matter.add.rectangle(platformX, floorY, platformWidth, platformHeight, {
      isStatic: true,
      friction: 0.95,
      restitution: 0.02,
      label: "stack-platform"
    });
  }

  private createDragBoundary(): void {
    const segmentWidth = 14;
    const gapWidth = 10;
    for (let x = 0; x < gameWidth; x += segmentWidth + gapWidth) {
      this.add.line(
        0,
        dragLowerLimitY,
        x,
        0,
        Math.min(x + segmentWidth, gameWidth),
        0,
        0xd8fbff,
        0.42
      ).setOrigin(0, 0.5).setLineWidth(3, 3).setDepth(3);
    }
  }

  private createHud(): void {
    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: gameFontFamily,
      fontSize: "31px",
      color: "#ffffff",
      stroke: "#062840",
      strokeThickness: 6
    };
    this.add.text(22, 25, "Fish Stack", titleStyle);

    const statStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: gameFontFamily,
      fontSize: "18px",
      color: "#e7fbff",
      stroke: "#062840",
      strokeThickness: 5
    };
    this.add.text(22, 74, "Prize:", statStyle);
    this.prizeCoinIcon = this.add.image(92, 85, "stack-prize-common-coin")
      .setDisplaySize(22, 22)
      .setDepth(4);
    this.prizeText = this.add.text(108, 74, "0", statStyle);
    this.fallText = this.add.text(gameWidth - 22, 74, `Falls 0/${formatNumber(maxFalls)}`, statStyle).setOrigin(1, 0);

    const close = this.add.text(gameWidth - 20, 24, "X", {
      fontFamily: gameFontFamily,
      fontSize: "24px",
      color: "#ffffff",
      stroke: "#062840",
      strokeThickness: 5
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    close.on("pointerup", () => this.cancelGame());
  }

  private spawnPiece(): void {
    const source = Phaser.Utils.Array.GetRandom(this.pieceSources);
    if (!source || !this.textures.exists(source.textureKey)) {
      this.time.delayedCall(120, () => this.spawnPiece());
      return;
    }

    const x = gameWidth / 2;
    const body = this.matter.add.image(x, spawnY, source.textureKey, undefined, {
      shape: { type: "rectangle", width: source.width, height: source.height },
      friction: 0.96,
      frictionStatic: 1,
      frictionAir: 0.018,
      restitution: 0.02,
      density: 0.0028,
      label: "stack-piece"
    });
    body.setDisplaySize(source.width, source.height);
    body.setDepth(5);
    body.setIgnoreGravity(true);
    body.setVelocity(0, 0);
    body.setAngularVelocity(0);
    this.activePiece = {
      body,
      source,
      settled: false,
      released: false,
      jellyPhase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      jellyKick: 0.18
    };
    this.pieces.push(this.activePiece);
    this.activeSettledSince = undefined;
    this.draggingPiece = false;
  }

  private updateActivePiece(delta: number, time: number): void {
    if (!this.activePiece) {
      return;
    }

    const piece = this.activePiece.body;
    if (!this.activePiece.released) {
      piece.setVelocity(0, 0);
      piece.setAngularVelocity(0);
      const keyboardX = (this.cursors?.left?.isDown ? -1 : 0) + (this.cursors?.right?.isDown ? 1 : 0);
      if (keyboardX !== 0) {
        piece.setPosition(
          Phaser.Math.Clamp(piece.x + keyboardX * delta * 0.36, 42, gameWidth - 42),
          piece.y
        );
      }
      return;
    }

    if (this.activePieceMissedPlatform()) {
      this.recordFall(piece.x, Phaser.Math.Clamp(piece.y, 130, gameHeight - 88));
      piece.destroy();
      this.pieces = this.pieces.filter((candidate) => candidate !== this.activePiece);
      this.activePiece = undefined;
      if (this.fallCount >= maxFalls) {
        this.finishGame();
        return;
      }
      this.time.delayedCall(260, () => this.spawnPiece());
      return;
    }

    const velocity = piece.body?.velocity;
    const matterBody = piece.body as MatterJS.BodyType | undefined;
    const angularSpeed = Math.abs(matterBody?.angularVelocity ?? 0);
    const slow = Math.abs(velocity?.x ?? 0) < settleSpeed && Math.abs(velocity?.y ?? 0) < settleSpeed && angularSpeed < 0.03;
    const lowEnough = piece.y > spawnY + 90;
    if (slow && lowEnough) {
      this.activeSettledSince ??= time;
      if (time - this.activeSettledSince >= settleDelayMs) {
        this.activePiece.settled = true;
        this.kickJelly(this.activePiece, 0.22);
        this.settledCount += 1;
        this.playSfx(coinCollectSoundKey, { volume: 0.22 });
        this.activePiece = undefined;
        this.activeSettledSince = undefined;
        this.time.delayedCall(240, () => this.spawnPiece());
      }
    } else {
      this.activeSettledSince = undefined;
    }
  }

  private activePieceMissedPlatform(): boolean {
    if (!this.activePiece?.released) {
      return false;
    }

    const piece = this.activePiece.body;
    const velocityY = piece.body?.velocity.y ?? 0;
    const outsideBar = !this.isOverPlatform(piece.x, this.activePiece.source.width * 0.32);
    return piece.y > gameHeight + 54 || piece.x < -70 || piece.x > gameWidth + 70 || (piece.y > floorY + platformHeight && velocityY > 0 && outsideBar);
  }

  private isOverPlatform(x: number, margin = 0): boolean {
    const halfWidth = platformWidth / 2 + margin;
    return x >= this.platformCurrentX - halfWidth && x <= this.platformCurrentX + halfWidth;
  }

  private updateMovingPlatform(time: number): number {
    const previousX = this.platformCurrentX;
    this.platformCurrentX = platformX + Math.sin(time * platformMoveSpeed) * platformMoveRange;
    this.platformTop?.setX(this.platformCurrentX);
    this.platformShadow?.setX(this.platformCurrentX);
    if (this.platformBody) {
      this.matter.body.setPosition(this.platformBody, { x: this.platformCurrentX, y: floorY });
    }
    return this.platformCurrentX - previousX;
  }

  private applyPlatformFriction(deltaX: number): void {
    if (Math.abs(deltaX) < 0.001) {
      return;
    }

    this.pieces.forEach((piece) => {
      if (!piece.body.active || !piece.released) {
        return;
      }

      const carry = piece.settled ? 1 : this.pieceTouchesPlatform(piece) ? platformTouchCarry : 0;
      if (carry <= 0) {
        return;
      }

      piece.body.setPosition(piece.body.x + deltaX * carry, piece.body.y);
      const velocity = piece.body.body?.velocity;
      piece.body.setVelocity((velocity?.x ?? 0) + deltaX * 0.028 * carry, velocity?.y ?? 0);
    });
  }

  private pieceTouchesPlatform(piece: StackPiece): boolean {
    const bottom = piece.body.y + piece.source.height / 2;
    return bottom >= floorY - platformHeight * 1.35 && bottom <= floorY + platformHeight * 1.8 && this.isOverPlatform(piece.body.x, piece.source.width * 0.38);
  }

  private beginDragActivePiece(pointer: Phaser.Input.Pointer): void {
    if (!this.activePiece || this.activePiece.released) {
      return;
    }

    const point = this.pointerDesignPoint(pointer);
    const bounds = this.activePiece.body.getBounds();
    if (!bounds.contains(point.x, point.y)) {
      return;
    }

    this.draggingPiece = true;
    this.kickJelly(this.activePiece, 0.12);
    this.dragOffset.set(this.activePiece.body.x - point.x, this.activePiece.body.y - point.y);
  }

  private dragActivePiece(pointer: Phaser.Input.Pointer): void {
    if (!this.activePiece || this.activePiece.released || !this.draggingPiece) {
      return;
    }

    const point = this.pointerDesignPoint(pointer);
    this.activePiece.body.setPosition(
      Phaser.Math.Clamp(point.x + this.dragOffset.x, 38, gameWidth - 38),
      Phaser.Math.Clamp(point.y + this.dragOffset.y, 110, dragLowerLimitY)
    );
    this.activePiece.body.setVelocity(0, 0);
    this.activePiece.body.setAngularVelocity(0);
  }

  private releaseActivePiece(): void {
    if (!this.activePiece || this.activePiece.released || !this.draggingPiece) {
      return;
    }

    this.draggingPiece = false;
    this.activePiece.released = true;
    this.kickJelly(this.activePiece, 0.28);
    this.activePiece.body.setIgnoreGravity(false);
    this.activePiece.body.setVelocity(0, 0.35);
    this.activePiece.body.setAngularVelocity(Phaser.Math.FloatBetween(-0.01, 0.01));
  }

  private updateJellyPieces(time: number, delta: number): void {
    const decay = Math.max(0, 1 - (delta / 1000) * jellyKickDecayPerSecond);
    this.pieces.forEach((piece) => {
      if (!piece.body.active) {
        return;
      }

      piece.jellyKick *= decay;
      const velocity = piece.body.body?.velocity;
      const verticalStretch = Phaser.Math.Clamp(Math.abs(velocity?.y ?? 0) * 0.055, 0, 0.18);
      const horizontalStretch = Phaser.Math.Clamp(Math.abs(velocity?.x ?? 0) * 0.032, 0, 0.09);
      const dragSquash = piece === this.activePiece && this.draggingPiece ? jellyDragSquash : 0;
      const wobbleStrength = (piece.settled ? 0.018 : 0.036) + piece.jellyKick * 0.36;
      const wobble = Math.sin(time * 0.019 + piece.jellyPhase) * wobbleStrength;
      const kick = piece.jellyKick;
      const scaleX = Phaser.Math.Clamp(1 + verticalStretch + horizontalStretch + dragSquash + wobble + kick * 0.35, 0.78, 1.34);
      const scaleY = Phaser.Math.Clamp(1 - verticalStretch * 0.72 - dragSquash * 0.62 - wobble * 0.58 - kick * 0.24, 0.72, 1.24);
      piece.body.setDisplaySize(piece.source.width * scaleX, piece.source.height * scaleY);
    });
  }

  private kickJelly(piece: StackPiece, amount: number): void {
    piece.jellyKick = Math.max(piece.jellyKick, amount);
  }

  private recordFall(x: number, y: number): void {
    if (this.finished) {
      return;
    }

    this.fallCount += 1;
    this.playSfx(fishEatSoundKey, { volume: 0.18 });
    const text = this.add.text(Phaser.Math.Clamp(x, 46, gameWidth - 46), Phaser.Math.Clamp(y, 130, gameHeight - 90), "FALL", {
      fontFamily: gameFontFamily,
      fontSize: "20px",
      color: "#ffb7a8",
      stroke: "#4a0f08",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: text,
      y: text.y - 28,
      alpha: 0,
      duration: 520,
      ease: "Sine.easeOut",
      onComplete: () => text.destroy()
    });
  }

  private playSfx(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (this.cache.audio.exists(key)) {
      this.sound.play(key, config);
    }
  }

  private finishGame(): void {
    this.finished = true;
    const score = this.settledCount;
    this.showResult(`+C${formatNumber(this.currentPrizeAmount())}`, `${formatNumber(this.settledCount)} helpers landed`, () => {
      this.onComplete?.({ score, caughtCount: this.settledCount, fallCount: this.fallCount });
      this.scene.stop();
    });
  }

  private currentPrizeAmount(): number {
    return Math.max(0, Math.floor((this.settledCount - this.fallCount * 0.5) * this.productionPerMinute));
  }

  private cancelGame(): void {
    if (this.finished) {
      return;
    }

    this.finished = true;
    this.onCancel?.();
    this.scene.stop();
  }

  private showResult(title: string, detail: string, onClose: () => void): void {
    this.matter.world.pause();
    const panel = this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth - 54, 230, 0x064464, 0.94)
      .setStrokeStyle(3, 0x78dfff, 0.7);
    const titleText = this.add.text(gameWidth / 2, gameHeight / 2 - 58, title, {
      fontFamily: gameFontFamily,
      fontSize: "36px",
      color: "#fff5a8",
      stroke: "#062840",
      strokeThickness: 7
    }).setOrigin(0.5);
    const detailText = this.add.text(gameWidth / 2, gameHeight / 2 - 8, detail, {
      fontFamily: gameFontFamily,
      fontSize: "18px",
      color: "#e7fbff",
      stroke: "#062840",
      strokeThickness: 5
    }).setOrigin(0.5);
    const button = this.add.text(gameWidth / 2, gameHeight / 2 + 66, "CLAIM", {
      fontFamily: gameFontFamily,
      fontSize: "24px",
      color: "#ffffff",
      stroke: "#124a12",
      strokeThickness: 6,
      backgroundColor: "#2fb72f",
      padding: { x: 30, y: 13 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.children.bringToTop(panel);
    this.children.bringToTop(titleText);
    this.children.bringToTop(detailText);
    this.children.bringToTop(button);
    button.once("pointerup", onClose);
  }
}
