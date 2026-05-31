import Phaser from "phaser";
import { helperCreatureTypes } from "../data/content";
import { gameHeight, gameWidth, maxRenderScale } from "../game/constants";
import { formatNumber } from "../game/economy";
import { gameFontFamily } from "../game/fonts";

export const ReefDropSceneKey = "ReefDropScene";

export type ReefDropResult = {
  score: number;
  caughtCount: number;
  mismatchCount: number;
};

type ReefDropSceneData = {
  onComplete?: (result: ReefDropResult) => void;
  onCancel?: () => void;
  productionPerMinute?: number;
};

type StackPieceSource = {
  id: string;
  name: string;
  textureKey: string;
  width: number;
  height: number;
  visualOriginY: number;
  collisionWidthRatio: number;
  collisionHeightRatio: number;
};

type StackPiece = {
  body: Phaser.Physics.Matter.Image;
  source: StackPieceSource;
  released: boolean;
  resolved: boolean;
};

type MovingBrick = {
  platform: Phaser.Physics.Matter.Image;
  helper: Phaser.GameObjects.Image;
  source: StackPieceSource;
  minX: number;
  maxX: number;
  phase: number;
  sweepSpeed: number;
};

const floorHeight = 44;
const floorTopY = gameHeight - floorHeight;
const floorY = gameHeight - floorHeight / 2;
const topSafeOffset = 42;
const spawnY = 140 + topSafeOffset;
const dropGuideY = spawnY + 44;
const nextCrabDelayMs = 500;
const readyFadeInMs = 220;
const brickTextureKey = "stack-target-brick";
const brickWidth = 92;
const brickHeight = 22;
const movingBrickCount = 4;
const brickSweepSpeed = 1.38;
const brickCorrectFlashColor = 0x54ff76;
const brickWrongFlashColor = 0xff4d55;
const doneButtonWidth = 92;
const doneButtonHeight = 38;
const doneButtonX = gameWidth - 68;
const doneButtonY = 44 + topSafeOffset;
const commonCoinIconPath = "/assets/ui/icon-common-coin.png";
const coinCollectSoundKey = "sfx-coin-collect";
const helperPieceScale = 1.28;
const rewardPerHitMultiplier = 0.2;
const gameDurationMs = 120000;
const helperVisualOriginYById: Record<string, number> = {
  "auto-cleaner": 0.25,
  crab: 0.25,
  "feeder-snail": 0.38,
  shell: 0.13
};
const helperCollisionRatioById: Record<string, { width: number; height: number }> = {
  "auto-cleaner": { width: 0.84, height: 0.55 },
  crab: { width: 0.76, height: 0.5 },
  "feeder-snail": { width: 0.76, height: 0.76 },
  shell: { width: 0.57, height: 0.48 }
};
const brickHelperScaleById: Record<string, number> = {
  crab: 1.18,
  shell: 1.42
};
const brickHelperYOffsetById: Record<string, number> = {
  crab: -8,
  shell: -14
};
const stackHelperTypes = helperCreatureTypes.filter((helperType) => helperType.id !== "shrimp");

export class ReefDropScene extends Phaser.Scene {
  private onComplete?: (result: ReefDropResult) => void;
  private onCancel?: () => void;
  private pieces: StackPiece[] = [];
  private activePiece?: StackPiece;
  private pieceSources: StackPieceSource[] = [];
  private movingBricks: MovingBrick[] = [];
  private nextPieceSourceIndex = 0;
  private scoreCount = 0;
  private mismatchCount = 0;
  private finished = false;
  private prizeText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private floorGraphics?: Phaser.GameObjects.Graphics;
  private productionPerMinute = 0;
  private previousCanvasTouchAction = "";
  private resultShown = false;
  private resultCompleted = false;
  private nextSpawnTimer?: Phaser.Time.TimerEvent;
  private gameEndsAt = 0;
  private nativeTapCleanup?: () => void;
  private resultClaimBounds?: Phaser.Geom.Rectangle;
  private cameraZoom = 1;

  constructor() {
    super({
      key: ReefDropSceneKey,
      physics: {
        matter: {
          debug: false,
          gravity: { x: 0, y: 1.36 }
        }
      }
    });
  }

  init(data: ReefDropSceneData): void {
    this.onComplete = data.onComplete;
    this.onCancel = data.onCancel;
    this.productionPerMinute = Math.max(0, data.productionPerMinute ?? 0);
  }

  preload(): void {
    stackHelperTypes.forEach((helperType) => {
      this.load.image(this.stackHelperTextureKey(helperType.id), `/assets/helpers/${helperType.id}.png`);
    });
    this.load.image("stack-prize-common-coin", commonCoinIconPath);
  }

  create(): void {
    this.sys.setVisible(true);
    this.sys.setActive(true);
    this.input.enabled = true;
    this.cameras.cameras.forEach((camera) => {
      camera.visible = true;
    });
    this.input.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
    this.matter.world.resume();
    this.finished = false;
    this.resultShown = false;
    this.resultCompleted = false;
    this.resultClaimBounds = undefined;
    this.pieces = [];
    this.activePiece = undefined;
    this.movingBricks = [];
    this.nextPieceSourceIndex = 0;
    this.scoreCount = 0;
    this.mismatchCount = 0;
    this.gameEndsAt = this.time.now + gameDurationMs;
    this.disableSafariTouchGestures();

    this.configureCameraForHighDpi();
    this.createBackdrop();
    this.createPieceSources();
    this.createBounds();
    this.createDragBoundary();
    this.createFloor();
    this.createBrickTexture();
    this.createMovingBricks();
    this.createHud();
    this.scheduleNextPiece(nextCrabDelayMs);

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => this.releaseActivePiece(pointer));
    this.input.on("pointerupoutside", (pointer: Phaser.Input.Pointer) => this.releaseActivePiece(pointer));
    this.input.keyboard?.on("keydown-ESC", () => this.cancelGame());
    this.matter.world.on("collisionstart", this.handleCollisionStart, this);
    this.enableNativeTapFallback();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("pointerup");
      this.input.off("pointerupoutside");
      this.input.keyboard?.off("keydown-ESC");
      this.restoreSafariTouchGestures();
      this.nativeTapCleanup?.();
      this.nativeTapCleanup = undefined;
      this.matter.world?.off("collisionstart", this.handleCollisionStart, this);
      this.nextSpawnTimer?.remove(false);
      this.nextSpawnTimer = undefined;
    });
  }

  update(time: number, _delta: number): void {
    if (this.finished) {
      return;
    }

    const remainingMs = Math.max(0, this.gameEndsAt - time);
    this.updateMovingBricks(time);
    this.updateActivePiece();
    this.prizeText?.setText(formatNumber(this.currentPrizeAmount()));
    this.timerText?.setText(this.formatTimer(remainingMs));
    if (remainingMs <= 0) {
      this.finishGame();
    }
  }

  private configureCameraForHighDpi(): void {
    const { zoom, scrollX, scrollY } = this.visibleViewportCameraState();
    this.cameraZoom = zoom;
    this.cameras.main.setOrigin(0, 0);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setScroll(scrollX, scrollY);
    this.cameras.main.setBackgroundColor("#083b5c");
  }

  private currentRenderScale(): number {
    return this.cameraZoom;
  }

  private visibleViewportCameraState(): { zoom: number; scrollX: number; scrollY: number } {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      const fallbackZoom = Phaser.Math.Clamp(this.scale.gameSize.width / gameWidth, 1, maxRenderScale);
      return { zoom: fallbackZoom, scrollX: 0, scrollY: 0 };
    }

    const viewportLeft = 0;
    const viewportTop = 0;
    const viewportRight = window.innerWidth;
    const viewportBottom = window.innerHeight;
    const visibleCssLeft = Phaser.Math.Clamp(viewportLeft - rect.left, 0, rect.width);
    const visibleCssTop = Phaser.Math.Clamp(viewportTop - rect.top, 0, rect.height);
    const visibleCssRight = Phaser.Math.Clamp(viewportRight - rect.left, 0, rect.width);
    const visibleCssBottom = Phaser.Math.Clamp(viewportBottom - rect.top, 0, rect.height);
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
    return new Phaser.Math.Vector2(pointer.x / this.currentRenderScale() + camera.scrollX, pointer.y / this.currentRenderScale() + camera.scrollY);
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

  private disableSafariTouchGestures(): void {
    this.previousCanvasTouchAction = this.game.canvas.style.touchAction;
    this.game.canvas.style.touchAction = "none";
    this.game.canvas.style.webkitUserSelect = "none";
  }

  private restoreSafariTouchGestures(): void {
    this.game.canvas.style.touchAction = this.previousCanvasTouchAction;
  }

  private createPieceSources(): void {
    const helperSources: StackPieceSource[] = stackHelperTypes
      .map((helperType) => ({
        id: `helper-${helperType.id}`,
        name: helperType.name,
        textureKey: this.stackHelperTextureKey(helperType.id),
        width: (helperType.id === "feeder-snail" ? 70 : 58) * helperPieceScale,
        height: (helperType.id === "feeder-snail" ? 36 : 42) * helperPieceScale,
        visualOriginY: helperVisualOriginYById[helperType.id] ?? 0.5,
        collisionWidthRatio: helperCollisionRatioById[helperType.id]?.width ?? 0.78,
        collisionHeightRatio: helperCollisionRatioById[helperType.id]?.height ?? 0.58
      }));
    this.pieceSources = helperSources.filter((source) => this.textures.exists(source.textureKey));
  }

  private stackHelperTextureKey(helperTypeId: string): string {
    return `stack-helper-${helperTypeId}`;
  }

  private createBounds(): void {
    this.matter.world.setBounds(0, 0, gameWidth, gameHeight, 36, true, true, false, false);
  }

  private createFloor(): void {
    this.floorGraphics = this.add.graphics().setDepth(2);
    this.drawFloor();
    this.matter.add.rectangle(gameWidth / 2, floorY, gameWidth, floorHeight, {
      isStatic: true,
      friction: 0.95,
      restitution: 0.12,
      label: "stack-floor"
    });
  }

  private createBrickTexture(): void {
    if (this.textures.exists(brickTextureKey)) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0x2eb6d1, 0.96);
    graphics.fillRoundedRect(0, 0, brickWidth, brickHeight, 11);
    graphics.fillStyle(0xd8fbff, 0.38);
    graphics.fillRoundedRect(6, 4, brickWidth - 12, 7, 4);
    graphics.lineStyle(2, 0x083b5c, 0.22);
    graphics.strokeRoundedRect(1, 1, brickWidth - 2, brickHeight - 2, 10);
    graphics.generateTexture(brickTextureKey, brickWidth, brickHeight);
    graphics.destroy();
  }

  private createMovingBricks(): void {
    const brickSources = this.pieceSources.slice(0, movingBrickCount);
    if (brickSources.length === 0) {
      return;
    }

    this.movingBricks = brickSources.map((source, index) => {
      const y = Math.round(Phaser.Math.Linear(dropGuideY + 70, floorTopY - brickHeight / 2, index / Math.max(1, brickSources.length - 1)));
      const minX = brickWidth / 2 + 14;
      const maxX = gameWidth - brickWidth / 2 - 14;
      const startX = Phaser.Math.Linear(minX, maxX, (index + 1) / (brickSources.length + 1));
      const platform = this.matter.add.image(startX, y, brickTextureKey, undefined, {
        isStatic: true,
        isSensor: true,
        shape: { type: "rectangle", width: brickWidth, height: brickHeight },
        friction: 0.72,
        restitution: 0.08,
        label: "stack-brick"
      });
      platform.setDisplaySize(brickWidth, brickHeight);
      platform.setDepth(4);
      platform.setIgnoreGravity(true);

      const sourceId = source.id.replace("helper-", "");
      const helperScale = 0.74 * (brickHelperScaleById[sourceId] ?? 1);
      const helperOffsetY = brickHelperYOffsetById[sourceId] ?? 0;
      const helper = this.add.image(startX, y - 16 + helperOffsetY, source.textureKey)
        .setDisplaySize(source.width * helperScale, source.height * helperScale)
        .setOrigin(0.5, source.visualOriginY)
        .setDepth(5);

      return {
        platform,
        helper,
        source,
        minX,
        maxX,
        phase: (Math.PI * 2 * index) / brickSources.length,
        sweepSpeed: brickSweepSpeed
      };
    });
  }

  private createDragBoundary(): void {
    const segmentWidth = 14;
    const gapWidth = 10;
    for (let x = 0; x < gameWidth; x += segmentWidth + gapWidth) {
      this.add.line(
        0,
        dropGuideY,
        x,
        0,
        Math.min(x + segmentWidth, gameWidth),
        0,
        0xd8fbff,
        0.42
      ).setOrigin(0, 0.5).setLineWidth(3, 3).setDepth(3);
    }
  }

  private drawFloor(): void {
    if (!this.floorGraphics) {
      return;
    }

    this.floorGraphics.clear();
    this.floorGraphics.fillStyle(0xd2b36c, 1);
    this.floorGraphics.fillRect(0, floorTopY, gameWidth, floorHeight);
    this.floorGraphics.fillStyle(0xf0d68d, 0.85);
    this.floorGraphics.fillRect(0, floorTopY, gameWidth, 8);
    this.floorGraphics.lineStyle(2, 0x8f6a35, 0.35);
    this.floorGraphics.beginPath();
    this.floorGraphics.moveTo(0, floorTopY + 9);
    for (let x = 0; x <= gameWidth; x += 22) {
      this.floorGraphics.lineTo(x, floorTopY + 9 + Math.sin(x * 0.08) * 3);
    }
    this.floorGraphics.strokePath();
  }

  private createHud(): void {
    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: gameFontFamily,
      fontSize: "31px",
      color: "#ffffff",
      stroke: "#062840",
      strokeThickness: 6
    };
    this.add.text(22, 25 + topSafeOffset, "Reef Drop", titleStyle);

    const statStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: gameFontFamily,
      fontSize: "18px",
      color: "#e7fbff",
      stroke: "#062840",
      strokeThickness: 5
    };
    this.add.text(22, 74 + topSafeOffset, "Prize:", statStyle);
    this.add.image(92, 85 + topSafeOffset, "stack-prize-common-coin")
      .setDisplaySize(22, 22)
      .setDepth(4);
    this.prizeText = this.add.text(108, 74 + topSafeOffset, "0", statStyle);
    this.timerText = this.add.text(gameWidth / 2, 31 + topSafeOffset, "2:00", {
      fontFamily: gameFontFamily,
      fontSize: "24px",
      color: "#fff5a8",
      stroke: "#062840",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(4);
    this.createDoneButton();
  }

  private createDoneButton(): void {
    const buttonBg = this.add.graphics().setDepth(4);
    buttonBg.fillStyle(0x2fb72f, 0.96);
    buttonBg.fillRoundedRect(doneButtonX - doneButtonWidth / 2, doneButtonY - doneButtonHeight / 2, doneButtonWidth, doneButtonHeight, 13);
    buttonBg.lineStyle(2, 0xb9ffbd, 0.78);
    buttonBg.strokeRoundedRect(doneButtonX - doneButtonWidth / 2, doneButtonY - doneButtonHeight / 2, doneButtonWidth, doneButtonHeight, 13);
    this.add.text(doneButtonX, doneButtonY, "DONE", {
      fontFamily: gameFontFamily,
      fontSize: "18px",
      color: "#ffffff",
      stroke: "#124a12",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(5);
    this.add.zone(doneButtonX, doneButtonY, doneButtonWidth, doneButtonHeight)
      .setDepth(6)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => this.finishGame());
  }

  private spawnPiece(): void {
    const spawnSources = this.movingBricks.length > 0 ? this.movingBricks.map((brick) => brick.source) : this.pieceSources;
    const source = spawnSources[this.nextPieceSourceIndex % spawnSources.length];
    if (!source || !this.textures.exists(source.textureKey)) {
      this.time.delayedCall(120, () => this.spawnPiece());
      return;
    }
    this.nextPieceSourceIndex += 1;

    const body = this.createPieceBody(source, gameWidth / 2, spawnY, true);
    body.setDepth(5);
    body.setAlpha(0);
    body.setVelocity(0, 0);
    body.setAngularVelocity(0);
    this.activePiece = {
      body,
      source,
      released: false,
      resolved: false
    };
    this.pieces.push(this.activePiece);
    this.tweens.add({
      targets: body,
      alpha: 1,
      duration: readyFadeInMs,
      ease: "Sine.easeOut"
    });
  }

  private updateActivePiece(): void {
    if (!this.activePiece) {
      return;
    }

    const piece = this.activePiece.body;
    if (this.activePiece.released) {
      if (piece.y >= floorTopY - 4) {
        this.resolveMissedDrop();
      }
      return;
    }

    piece.setVelocity(0, 0);
    piece.setAngularVelocity(0);
    piece.setPosition(gameWidth / 2, spawnY);
  }

  private updateMovingBricks(time: number): void {
    this.movingBricks.forEach((brick) => {
      const centerX = (brick.minX + brick.maxX) / 2;
      const amplitude = (brick.maxX - brick.minX) / 2;
      const nextX = centerX + Math.sin(time * 0.001 * brick.sweepSpeed + brick.phase) * amplitude;
      brick.platform.setPosition(nextX, brick.platform.y);
      brick.platform.setVelocity(0, 0);
      brick.helper.setPosition(nextX, brick.platform.y - 16 + (brickHelperYOffsetById[brick.source.id.replace("helper-", "")] ?? 0));
    });
  }

  private releaseActivePiece(pointer?: Phaser.Input.Pointer): void {
    if (this.finished || !this.activePiece || this.activePiece.released || (pointer && this.isDoneButtonPoint(this.pointerDesignPoint(pointer)))) {
      return;
    }

    const releasedPiece = this.activePiece;
    releasedPiece.released = true;
    releasedPiece.body.setIgnoreGravity(false);
    releasedPiece.body.setVelocity(0, 1.2);
    releasedPiece.body.setAngularVelocity(Phaser.Math.FloatBetween(-0.018, 0.018));
  }

  private isDoneButtonPoint(point: Phaser.Math.Vector2): boolean {
    return Math.abs(point.x - doneButtonX) <= doneButtonWidth / 2 && Math.abs(point.y - doneButtonY) <= doneButtonHeight / 2;
  }

  private enableNativeTapFallback(): void {
    const canvas = this.game.canvas;
    const releaseFromClientPoint = (clientX: number, clientY: number): void => {
      const point = this.clientDesignPoint(clientX, clientY);
      if (this.resultShown && this.resultClaimBounds?.contains(point.x, point.y)) {
        this.completeResult();
        return;
      }
      if (this.isDoneButtonPoint(point)) {
        this.finishGame();
        return;
      }
      this.releaseActivePiece();
    };
    const onTouchEnd = (event: TouchEvent): void => {
      event.preventDefault();
      const touch = event.changedTouches[0];
      if (!touch) {
        return;
      }
      releaseFromClientPoint(touch.clientX, touch.clientY);
    };
    const onClick = (event: MouseEvent): void => {
      event.preventDefault();
      releaseFromClientPoint(event.clientX, event.clientY);
    };
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    canvas.addEventListener("click", onClick, { passive: false });
    this.nativeTapCleanup = () => {
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("click", onClick);
    };
  }

  private clientDesignPoint(clientX: number, clientY: number): Phaser.Math.Vector2 {
    const rect = this.game.canvas.getBoundingClientRect();
    const camera = this.cameras.main;
    const zoom = this.currentRenderScale();
    return new Phaser.Math.Vector2(
      ((clientX - rect.left) * (this.game.canvas.width / rect.width)) / zoom + camera.scrollX,
      ((clientY - rect.top) * (this.game.canvas.height / rect.height)) / zoom + camera.scrollY
    );
  }

  private handleCollisionStart(event: Phaser.Physics.Matter.Events.CollisionStartEvent): void {
    if (this.finished) {
      return;
    }

    for (const pair of event.pairs) {
      const piece = this.pieceForBody(pair.bodyA) ?? this.pieceForBody(pair.bodyB);
      if (!piece || !piece.released || piece.resolved || piece !== this.activePiece) {
        continue;
      }

      const hitBrick = this.brickForBody(pair.bodyA) ?? this.brickForBody(pair.bodyB);
      if (hitBrick) {
        this.resolveBrickHit(hitBrick);
        break;
      }

      if (pair.bodyA.label === "stack-floor" || pair.bodyB.label === "stack-floor") {
        this.resolveMissedDrop();
        break;
      }
    }
  }

  private pieceForBody(body: MatterJS.BodyType): StackPiece | undefined {
    return this.pieces.find((piece) => {
      const pieceBody = piece.body.body as MatterJS.BodyType | undefined;
      return piece.body.active && pieceBody?.id === body.id;
    });
  }

  private brickForBody(body: MatterJS.BodyType): MovingBrick | undefined {
    return this.movingBricks.find((brick) => {
      const brickBody = brick.platform.body as MatterJS.BodyType | undefined;
      return brick.platform.active && brickBody?.id === body.id;
    });
  }

  private resolveBrickHit(brick: MovingBrick): void {
    if (!this.activePiece || this.activePiece.resolved) {
      return;
    }

    const isMatch = this.activePiece.source.id === brick.source.id;
    const hitX = this.activePiece.body.x;
    const hitY = this.activePiece.body.y;
    if (isMatch) {
      this.scoreCount += 1;
      this.playSfx(coinCollectSoundKey, { volume: 0.22 });
      this.showScorePop(hitX, hitY);
    }
    this.flashBrick(brick, isMatch ? brickCorrectFlashColor : brickWrongFlashColor);
    this.clearActivePiece();
    this.scheduleNextPiece(nextCrabDelayMs);
  }

  private flashBrick(brick: MovingBrick, color: number): void {
    brick.platform.setTint(color);
    this.time.delayedCall(140, () => {
      if (brick.platform.active) {
        brick.platform.clearTint();
      }
    });
  }

  private resolveMissedDrop(): void {
    if (!this.activePiece || this.activePiece.resolved) {
      return;
    }

    this.clearActivePiece();
    this.scheduleNextPiece(nextCrabDelayMs);
  }

  private clearActivePiece(): void {
    if (!this.activePiece) {
      return;
    }

    const piece = this.activePiece;
    piece.resolved = true;
    this.pieces = this.pieces.filter((candidate) => candidate !== piece);
    piece.body.destroy();
    this.activePiece = undefined;
  }

  private createPieceBody(source: StackPieceSource, x: number, y: number, ignoreGravity: boolean): Phaser.Physics.Matter.Image {
    const width = source.width;
    const height = source.height;
    const collisionWidth = width * source.collisionWidthRatio;
    const collisionHeight = height * source.collisionHeightRatio;
    const body = this.matter.add.image(x, y, source.textureKey, undefined, {
      shape: { type: "rectangle", width: collisionWidth, height: collisionHeight },
      friction: 0.82,
      frictionStatic: 0.82,
      frictionAir: 0.016,
      restitution: 0.34,
      density: 0.0036,
      slop: 0.08,
      label: "stack-piece"
    });
    body.setDisplaySize(width, height);
    body.setOrigin(0.5, source.visualOriginY);
    body.setIgnoreGravity(ignoreGravity);
    return body;
  }

  private showScorePop(x: number, y: number): void {
    const burst = this.add.circle(x, y, 18, 0xfff5a8, 0.72).setDepth(18);
    const coin = this.add.image(x - 17, y - 21, "stack-prize-common-coin")
      .setDisplaySize(20, 20)
      .setDepth(19);
    const text = this.add.text(x + 1, y - 20, "+1", {
      fontFamily: gameFontFamily,
      fontSize: "22px",
      color: "#fff5a8",
      stroke: "#062840",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(19);
    this.tweens.add({
      targets: burst,
      scale: 3,
      alpha: 0,
      duration: 360,
      ease: "Sine.easeOut",
      onComplete: () => burst.destroy()
    });
    this.tweens.add({
      targets: text,
      y: text.y - 24,
      alpha: 0,
      duration: 680,
      ease: "Sine.easeOut",
      onComplete: () => text.destroy()
    });
    this.tweens.add({
      targets: coin,
      y: coin.y - 24,
      alpha: 0,
      duration: 680,
      ease: "Sine.easeOut",
      onComplete: () => coin.destroy()
    });
  }

  private playSfx(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (this.cache.audio.exists(key)) {
      this.sound.play(key, config);
    }
  }

  private formatTimer(milliseconds: number): string {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  private finishGame(): void {
    if (this.resultShown) {
      return;
    }
    this.resultShown = true;
    this.finished = true;
    const score = this.scoreCount;
    this.showResult(this.currentPrizeAmount(), () => {
      this.completeResult(score);
    });
  }

  private completeResult(score = this.scoreCount): void {
    if (this.resultCompleted) {
      return;
    }
    this.resultCompleted = true;
    this.hideSceneImmediately();
    this.scene.stop();
    this.onComplete?.({ score, caughtCount: this.scoreCount * rewardPerHitMultiplier, mismatchCount: this.mismatchCount });
  }

  private hideSceneImmediately(): void {
    this.nativeTapCleanup?.();
    this.nativeTapCleanup = undefined;
    this.nextSpawnTimer?.remove(false);
    this.nextSpawnTimer = undefined;
    this.input.enabled = false;
    this.matter.world?.pause();
    this.tweens.killAll();
    this.time.removeAllEvents();
    [...this.children.getChildren()].forEach((child) => {
      (child as Phaser.GameObjects.GameObject & { setVisible?: (value: boolean) => unknown }).setVisible?.(false);
      child.destroy();
    });
    this.children.removeAll(true);
    this.pieces = [];
    this.activePiece = undefined;
    this.movingBricks = [];
    this.cameras.cameras.forEach((camera) => {
      camera.visible = false;
    });
    this.sys.setVisible(false);
    this.sys.setActive(false);
  }

  private currentPrizeAmount(): number {
    return Math.floor(this.scoreCount * this.productionPerMinute * rewardPerHitMultiplier);
  }

  private scheduleNextPiece(delayMs: number): void {
    if (this.nextSpawnTimer || this.finished) {
      return;
    }

    this.nextSpawnTimer = this.time.delayedCall(delayMs, () => {
      this.nextSpawnTimer = undefined;
      if (!this.activePiece && !this.finished) {
        this.spawnPiece();
      }
    });
  }

  private cancelGame(): void {
    if (this.finished) {
      return;
    }

    this.finished = true;
    this.onCancel?.();
    this.scene.stop();
  }

  private showResult(prizeAmount: number, onClose: () => void): void {
    this.matter.world.pause();
    this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x031f32, 0.42).setDepth(38);

    const panelWidth = gameWidth - 54;
    const panelHeight = 232;
    const panelX = gameWidth / 2 - panelWidth / 2;
    const panelY = gameHeight / 2 - panelHeight / 2;
    const panel = this.add.graphics().setDepth(39);
    panel.fillStyle(0x064464, 0.96);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 22);
    panel.lineStyle(3, 0x78dfff, 0.72);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 22);

    this.add.text(gameWidth / 2, gameHeight / 2 - 70, "Prize", {
      fontFamily: gameFontFamily,
      fontSize: "24px",
      color: "#e7fbff",
      stroke: "#062840",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(40);

    const coinIcon = this.add.image(gameWidth / 2 - 40, gameHeight / 2 - 26, "stack-prize-common-coin")
      .setDisplaySize(34, 34)
      .setDepth(40);
    this.add.text(coinIcon.x + 28, coinIcon.y, formatNumber(prizeAmount), {
      fontFamily: gameFontFamily,
      fontSize: "36px",
      color: "#fff5a8",
      stroke: "#062840",
      strokeThickness: 7
    }).setOrigin(0, 0.5).setDepth(40);

    const buttonWidth = 168;
    const buttonHeight = 52;
    const buttonY = gameHeight / 2 + 66;
    this.resultClaimBounds = new Phaser.Geom.Rectangle(
      gameWidth / 2 - buttonWidth / 2,
      buttonY - buttonHeight / 2,
      buttonWidth,
      buttonHeight
    );
    const buttonBg = this.add.graphics().setDepth(40);
    buttonBg.fillStyle(0x2fb72f, 1);
    buttonBg.fillRoundedRect(gameWidth / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 16);
    buttonBg.lineStyle(3, 0xb9ffbd, 0.75);
    buttonBg.strokeRoundedRect(gameWidth / 2 - buttonWidth / 2, buttonY - buttonHeight / 2, buttonWidth, buttonHeight, 16);

    this.add.text(gameWidth / 2, buttonY, "CLAIM", {
      fontFamily: gameFontFamily,
      fontSize: "24px",
      color: "#ffffff",
      stroke: "#124a12",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(41);
    const buttonHitArea = this.add.zone(gameWidth / 2, buttonY, buttonWidth, buttonHeight)
      .setDepth(42)
      .setInteractive({ useHandCursor: true });
    buttonHitArea.once("pointerup", onClose);
  }
}
