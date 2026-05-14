import Phaser from "phaser";
import { gameHeight, gameWidth } from "./constants";
import { formatNumber, formatPrice } from "./economy";
import { gameFontFamily } from "./fonts";
import type { PrizeMachineBetAmount, PrizeMachineConfig, PrizeSpinPrize } from "./prize-machine";
import type { DecorationSize } from "./tank-catalog";

export const prizeWheelIconTextureKeys = {
  food: "prize-wheel-food",
  common: "prize-wheel-common",
  rare: "prize-wheel-rare",
  superRare: "prize-wheel-super-rare",
  fish: "prize-wheel-fish"
} as const;

export const prizeWheelIconAssetPaths: Record<keyof typeof prizeWheelIconTextureKeys, string> = {
  food: "/assets/ui/shop/icon_category_food.png",
  common: "/assets/ui/shop/coin_icon_common.png",
  rare: "/assets/ui/shop/coin_icon_rare.png",
  superRare: "/assets/ui/shop/coin_icon_super_rare.png",
  fish: "/assets/ui/shop/empty_state_fish_silhouette.png"
};

export type PrizeMachineSpinnerActions = {
  onSpin: () => void;
  onOpenBetPicker: () => void;
  onClose: () => void;
};

export type PrizeMachineSpinActions = {
  onRewardReady: () => void;
  onSpinAgain: () => void;
  onClose: () => void;
  onOpenBetPicker?: () => void;
  getCommonCoins?: () => number;
  getSelectedBetAmount?: () => PrizeMachineBetAmount;
  onHighlight?: () => void;
  onStop?: () => void;
};

export type PrizeWheelSegment = {
  kind: PrizeSpinPrize;
  label: string;
  iconTextureKey: string;
  color: number;
  resultLabel?: string;
  resultMarketLabel?: string;
  foodTypeId?: string;
  foodQuantity?: number;
  decorationTypeId?: string;
  decorationSize?: DecorationSize;
  fishTypeId?: string;
  commonAmount?: number;
  rareAmount?: number;
  superRareAmount?: number;
};

export type PrizeWheelHud = {
  commonCoins: number;
  selectedBetAmount?: PrizeMachineBetAmount;
};

export function createPrizeMachineSpinner(
  scene: Phaser.Scene,
  config: PrizeMachineConfig,
  segments: PrizeWheelSegment[],
  hud: PrizeWheelHud,
  actions: PrizeMachineSpinnerActions
): Phaser.GameObjects.Container {
  return createPrizeSpinnerShell(scene, config, segments, [createBalanceText(scene, gameWidth / 2, hud.commonCoins)], [
    createBetButton(scene, gameWidth / 2, gameHeight - 198, hud.selectedBetAmount ?? 100, actions.onOpenBetPicker),
    createButton(scene, gameWidth / 2, gameHeight - 132, 230, 52, `SPIN ${formatPrice(config.spinCost)}`, 0x31a81f, actions.onSpin),
    createButton(scene, gameWidth / 2, gameHeight - 72, 170, 46, "CLOSE", 0xb91c1c, actions.onClose)
  ]);
}

export function playPrizeMachineSpin(
  scene: Phaser.Scene,
  config: PrizeMachineConfig,
  segments: PrizeWheelSegment[],
  resultIndex: number,
  hud: PrizeWheelHud,
  actions: PrizeMachineSpinActions
): Phaser.GameObjects.Container {
  const segmentCount = segments.length;
  const centerX = gameWidth / 2;
  const centerY = prizeRingCenterY();
  const ringRadius = prizeRingRadius(segmentCount);
  const resultSegment = segments[Phaser.Math.Clamp(resultIndex, 0, segmentCount - 1)] ?? segments[0];
  const resultY = centerY - ringRadius - 40;
  const textScale = 1 / prizeUiRenderScale(scene);
  const resultText = createResultText(scene, centerX, resultY, resultSegment);
  const costText = createPrizePopText(scene, centerX, resultY, `-${formatPrice(config.spinCost)}`, "#ffb0a8").setScale(0.74 * textScale);
  const wheel = createPrizeWheel(scene, segments, centerX, centerY, ringRadius);
  const balanceText = createBalanceText(scene, centerX, hud.commonCoins);
  const container = createPrizeSpinnerShell(scene, config, segments, [balanceText], [costText, resultText], wheel);

  scene.tweens.add({
    targets: costText,
    scale: { from: 0.58 * textScale, to: 0.94 * textScale },
    duration: 240,
    ease: "Back.easeOut"
  });

  animatePrizePointer(scene, wheel, resultIndex, () => actions.onHighlight?.(), () => {
    actions.onStop?.();
    scene.tweens.add({
      targets: costText,
      alpha: 0,
      scale: 0.55 * textScale,
      duration: 160,
      ease: "Sine.easeIn"
    });
    scene.tweens.add({
      targets: resultText,
      alpha: 1,
      scale: { from: 0.58 * textScale, to: textScale },
      duration: 280,
      ease: "Back.easeOut",
      onComplete: () => {
        actions.onRewardReady();
        if (actions.getCommonCoins) {
          balanceText.setText(commonCoinLabel(actions.getCommonCoins()));
        }
        const refreshedSelectedBetAmount = actions.getSelectedBetAmount?.() ?? hud.selectedBetAmount ?? 100;
        container.add([
          createBetButton(scene, centerX, gameHeight - 198, refreshedSelectedBetAmount, actions.onOpenBetPicker),
          createButton(scene, centerX, gameHeight - 132, 230, 52, "SPIN AGAIN", 0x31a81f, actions.onSpinAgain),
          createButton(scene, centerX, gameHeight - 72, 170, 46, "CLOSE", 0xb91c1c, actions.onClose)
        ]);
      }
    });
  });

  return container;
}

function createPrizeSpinnerShell(
  scene: Phaser.Scene,
  config: PrizeMachineConfig,
  segments: PrizeWheelSegment[],
  headerChildren: Phaser.GameObjects.GameObject[],
  children: Phaser.GameObjects.GameObject[],
  wheel = createPrizeWheel(scene, segments, gameWidth / 2, prizeRingCenterY(), prizeRingRadius(segments.length))
): Phaser.GameObjects.Container {
  const centerX = gameWidth / 2;
  return scene.add.container(0, 0, [
    scene.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0xc7a8ff, 1),
    createTitle(scene, centerX, 58, config.title, "31px", "#ffffff"),
    ...headerChildren,
    wheel.container,
    ...children
  ]).setDepth(95);
}

function createBalanceText(scene: Phaser.Scene, x: number, commonCoins: number): Phaser.GameObjects.Text {
  return createTitle(scene, x, 92, commonCoinLabel(commonCoins), "20px", "#ffe67a");
}

function commonCoinLabel(commonCoins: number): string {
  return `C${Math.max(0, Math.floor(commonCoins)).toLocaleString()}`;
}

function prizeRingCenterY(): number {
  return gameHeight * 0.44;
}

function prizeRingRadius(segmentCount: number): number {
  if (segmentCount >= 12) {
    return 190;
  }
  if (segmentCount >= 10) {
    return 186;
  }
  return 182;
}

type PrizeWheelView = {
  container: Phaser.GameObjects.Container;
  radius: number;
  segmentCount: number;
  highlight: Phaser.GameObjects.Graphics;
  pointer: Phaser.GameObjects.Container;
};

function createPrizeWheel(
  scene: Phaser.Scene,
  segments: PrizeWheelSegment[],
  centerX: number,
  centerY: number,
  radius: number
): PrizeWheelView {
  const container = scene.add.container(centerX, centerY);
  const wheelGraphics = scene.add.graphics();
  const separatorGraphics = scene.add.graphics();
  const highlight = scene.add.graphics().setAlpha(0);
  const segmentCount = segments.length;
  const stepDeg = 360 / segmentCount;

  segments.forEach((segment, index) => {
    drawWheelSlice(wheelGraphics, index, segmentCount, radius, segment.color, index === 0 ? 0.98 : 0.9);
    drawWheelSeparator(separatorGraphics, index, segmentCount, radius);
  });

  const outerGlow = scene.add.circle(0, 0, radius + 5, 0x8eeeff, 0.06)
    .setStrokeStyle(4, 0x8eeeff, 0.5);
  const outerRim = scene.add.circle(0, 0, radius + 1, 0x001723, 0)
    .setStrokeStyle(3, 0xc8fbff, 0.24);
  const innerHubGlow = scene.add.circle(0, 0, 34, 0x020914, 0.92)
    .setStrokeStyle(3, 0x8eeeff, 0.45);
  const pointer = createPrizePointer(scene, radius);

  container.add([outerGlow, wheelGraphics, highlight, separatorGraphics, outerRim]);

  for (let index = 0; index < segmentCount; index += 1) {
    const segment = segments[index];
    const angle = Phaser.Math.DegToRad(index * stepDeg - 90);
    const iconDistance = radius * 0.79;
    const labelDistance = radius * 0.43;
    const icon = scene.add.image(Math.cos(angle) * iconDistance, Math.sin(angle) * iconDistance, segment.iconTextureKey);
    icon.setDisplaySize(radius * 0.31, radius * 0.31);
    const label = createSegmentLabel(
      scene,
      Math.cos(angle) * labelDistance,
      Math.sin(angle) * labelDistance,
      compactPrizeWheelLabel(segment.label),
      segmentCount
    );
    label.setRotation(readableRadialLabelRotation(angle));
    container.add([icon, label]);
  }

  container.add([pointer, innerHubGlow]);
  drawWheelSlice(highlight, 0, segmentCount, radius, 0xffffff, 0.16, 0xfff3a3, 0.95);
  return { container, radius, segmentCount, highlight, pointer };
}

function drawWheelSlice(
  graphics: Phaser.GameObjects.Graphics,
  index: number,
  segmentCount: number,
  radius: number,
  fill: number,
  alpha: number,
  stroke = 0x8eeeff,
  strokeAlpha = 0.28
): void {
  const stepDeg = 360 / segmentCount;
  const startDeg = index * stepDeg - 90 - stepDeg / 2;
  const endDeg = startDeg + stepDeg;
  const pointCount = Math.max(4, Math.ceil(stepDeg / 5));

  graphics.fillStyle(fill, alpha);
  graphics.beginPath();
  graphics.moveTo(0, 0);
  for (let pointIndex = 0; pointIndex <= pointCount; pointIndex += 1) {
    const angle = Phaser.Math.DegToRad(Phaser.Math.Linear(startDeg, endDeg, pointIndex / pointCount));
    graphics.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  graphics.closePath();
  graphics.fillPath();

  graphics.lineStyle(stroke === 0xfff3a3 ? 5 : 2, stroke, strokeAlpha);
  graphics.beginPath();
  graphics.moveTo(0, 0);
  const startAngle = Phaser.Math.DegToRad(startDeg);
  graphics.lineTo(Math.cos(startAngle) * radius, Math.sin(startAngle) * radius);
  for (let pointIndex = 1; pointIndex <= pointCount; pointIndex += 1) {
    const angle = Phaser.Math.DegToRad(Phaser.Math.Linear(startDeg, endDeg, pointIndex / pointCount));
    graphics.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  graphics.closePath();
  graphics.strokePath();
}

function drawWheelSeparator(graphics: Phaser.GameObjects.Graphics, index: number, segmentCount: number, radius: number): void {
  const angle = Phaser.Math.DegToRad(index * (360 / segmentCount) - 90 - 180 / segmentCount);
  graphics.lineStyle(2, 0xffffff, 0.2);
  graphics.lineBetween(0, 0, Math.cos(angle) * radius, Math.sin(angle) * radius);
}

function createPrizePointer(scene: Phaser.Scene, radius: number): Phaser.GameObjects.Container {
  const pointer = scene.add.container(0, 0);
  const marker = scene.add.graphics();
  marker.fillStyle(0xb91c1c, 0.98);
  marker.lineStyle(3, 0x073047, 0.86);
  marker.beginPath();
  marker.moveTo(0, -52);
  marker.lineTo(-15, -22);
  marker.lineTo(15, -22);
  marker.closePath();
  marker.fillPath();
  marker.strokePath();
  pointer.add(marker);
  return pointer;
}

function animatePrizePointer(scene: Phaser.Scene, wheel: PrizeWheelView, resultIndex: number, onHighlight: () => void, onComplete: () => void): void {
  const segmentCount = wheel.segmentCount;
  const safeResultIndex = Phaser.Math.Clamp(resultIndex, 0, segmentCount - 1);
  const stepRad = Phaser.Math.DegToRad(360 / segmentCount);
  const totalSteps = segmentCount * 3 + safeResultIndex;
  let currentStep = 0;

  const advance = () => {
    const highlightedIndex = currentStep % segmentCount;
    wheel.pointer.rotation = currentStep * stepRad;
    wheel.highlight.clear();
    wheel.highlight.setAlpha(0.48);
    drawWheelSlice(wheel.highlight, highlightedIndex, segmentCount, wheel.radius, 0xffffff, 0.16, 0xfff3a3, 0.95);
    onHighlight();

    if (currentStep >= totalSteps) {
      wheel.pointer.rotation = safeResultIndex * stepRad;
      wheel.highlight.clear();
      drawWheelSlice(wheel.highlight, safeResultIndex, segmentCount, wheel.radius, 0xffffff, 0.2, 0xfff3a3, 1);
      scene.tweens.add({
        targets: wheel.highlight,
        alpha: { from: 0.55, to: 1 },
        duration: 180,
        yoyo: true,
        repeat: 1,
        ease: "Sine.easeInOut",
        onComplete: () => onComplete()
      });
      return;
    }

    scene.time.delayedCall(spinStepDuration(currentStep, totalSteps), () => {
      currentStep += 1;
      advance();
    });
  };

  advance();
}

function spinStepDuration(step: number, totalSteps: number): number {
  const remaining = totalSteps - step;
  if (remaining <= 0) {
    return 240;
  }
  if (remaining <= 3) {
    return [240, 180, 130][remaining - 1] ?? 130;
  }
  const progress = step / Math.max(1, totalSteps);
  if (progress < 0.18) {
    return Phaser.Math.Linear(90, 34, progress / 0.18);
  }
  if (progress > 0.72) {
    return Phaser.Math.Linear(34, 95, (progress - 0.72) / 0.28);
  }
  return 28;
}

function createTitle(scene: Phaser.Scene, x: number, y: number, label: string, fontSize: string, color: string): Phaser.GameObjects.Text {
  const renderScale = prizeUiRenderScale(scene);
  const numericFontSize = parseFontSize(fontSize);
  return scene.add.text(x, y, label, {
    fontFamily: gameFontFamily,
    fontSize: `${Math.round(numericFontSize * renderScale)}px`,
    color,
    fontStyle: "900",
    stroke: "#073047",
    strokeThickness: Math.round((fontSize === "34px" ? 6 : 4) * renderScale)
  }).setOrigin(0.5).setScale(1 / renderScale);
}

function createSegmentLabel(scene: Phaser.Scene, x: number, y: number, label: string, segmentCount: number): Phaser.GameObjects.Text {
  const renderScale = prizeUiRenderScale(scene);
  const fontSize = segmentCount >= 12 ? 11 : 13;
  return scene.add.text(x, y, label, {
    fontFamily: gameFontFamily,
    fontSize: `${Math.round(fontSize * renderScale)}px`,
    color: "#ffffff",
    fontStyle: "900",
    stroke: "#073047",
    strokeThickness: Math.round(3 * renderScale),
    align: "center",
    wordWrap: { width: Math.round(82 * renderScale), useAdvancedWrap: true }
  }).setOrigin(0.5).setScale(1 / renderScale);
}

function compactPrizeWheelLabel(label: string): string {
  return label
    .replace(/\bBasic\b/g, "Basic")
    .replace(/\bMicro\b/g, "Micro")
    .replace(/\bPremium\b/g, "Premium")
    .replace(/\bMedium\b/g, "M")
    .replace(/\bLarge\b/g, "L")
    .replace(/\bExtra Large\b/g, "XL")
    .replace(/\bSmall\b/g, "S")
    .replace(/\s+x(\d+)/i, " x$1");
}

function readableRadialLabelRotation(angle: number): number {
  const normalized = Phaser.Math.Wrap(angle, -Math.PI, Math.PI);
  if (normalized > Math.PI / 2 || normalized < -Math.PI / 2) {
    return normalized + Math.PI;
  }
  return normalized;
}

function createResultText(scene: Phaser.Scene, x: number, y: number, segment: PrizeWheelSegment): Phaser.GameObjects.GameObject {
  const colorByPrize: Record<PrizeSpinPrize, string> = {
    rare: "#9eefff",
    superRare: "#f0b6ff",
    rareFish: "#a8ffb0",
    premiumCommon: "#fff3a3",
    food: "#a8ffb0",
    decoration: "#ffd28a",
    common: "#ffe67a"
  };
  if (!segment.resultMarketLabel || segment.kind === "common") {
    return createPrizePopText(scene, x, y, resultLabel(segment), colorByPrize[segment.kind])
      .setAlpha(0);
  }

  const renderScale = prizeUiRenderScale(scene);
  const title = createPrizePopText(scene, 0, -13, resultLabel(segment), colorByPrize[segment.kind]);
  const market = scene.add.text(0, 32, segment.resultMarketLabel, {
    fontFamily: gameFontFamily,
    fontSize: `${Math.round(16 * renderScale)}px`,
    color: "#ffe67a",
    fontStyle: "900",
    stroke: "#073047",
    strokeThickness: Math.round(4 * renderScale),
    align: "center",
    shadow: { offsetX: 0, offsetY: Math.round(2 * renderScale), color: "#001723", blur: 0, fill: true }
  }).setOrigin(0.5).setScale(1 / renderScale);

  return scene.add.container(x, y, [title, market]).setAlpha(0);
}

function resultLabel(segment: PrizeWheelSegment): string {
  if (segment.resultLabel) {
    return `${segment.resultLabel}!`;
  }
  if (segment.kind === "rare") {
    return "R1!";
  }
  if (segment.kind === "superRare") {
    return "SR1!";
  }
  if (segment.kind === "rareFish") {
    return `${segment.label}!`;
  }
  if (segment.kind === "premiumCommon") {
    return `${segment.label}!`;
  }
  if (segment.kind === "common") {
    return `${segment.label}!`;
  }
  if (segment.kind === "decoration") {
    return `${segment.label}!`;
  }
  return `${segment.label} Food!`;
}

function createPrizePopText(scene: Phaser.Scene, x: number, y: number, label: string, color: string): Phaser.GameObjects.Text {
  const renderScale = prizeUiRenderScale(scene);
  return scene.add.text(x, y, label, {
    fontFamily: gameFontFamily,
    fontSize: `${Math.round(31 * renderScale)}px`,
    color,
    fontStyle: "900",
    stroke: "#073047",
    strokeThickness: Math.round(7 * renderScale),
    shadow: { offsetX: 0, offsetY: Math.round(4 * renderScale), color: "#001723", blur: 0, fill: true }
  }).setOrigin(0.5).setScale(1 / renderScale);
}

function prizeUiRenderScale(scene: Phaser.Scene): number {
  return Phaser.Math.Clamp(scene.scale.gameSize.width / gameWidth, 1, 1.35);
}

function parseFontSize(fontSize: string): number {
  const parsed = Number.parseFloat(fontSize);
  return Number.isFinite(parsed) ? parsed : 16;
}

function createBetButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  selectedBetAmount: PrizeMachineBetAmount,
  onOpenBetPicker?: () => void
): Phaser.GameObjects.Container {
  const button = scene.add.container(x, y).setAlpha(0);
  const background = createRoundedPrizeButton(scene, 0, 0, 156, 38, 0x0ea5e9, {
    stroke: 0xfff3a3,
    strokeAlpha: 0.92,
    radius: 12
  });
  background.on("pointerdown", () => onOpenBetPicker?.());
  button.add([background, createTitle(scene, 0, 0, `BET C${formatNumber(selectedBetAmount)}`, "14px", "#ffffff")]);
  scene.tweens.add({ targets: button, alpha: 1, duration: 180, ease: "Sine.easeOut" });
  return button;
}

function createButton(scene: Phaser.Scene, x: number, y: number, width: number, height: number, label: string, fill: number, onClick: () => void): Phaser.GameObjects.Container {
  const button = scene.add.container(x, y).setAlpha(0);
  const background = createRoundedPrizeButton(scene, 0, 0, width, height, fill, {
    stroke: 0xffffff,
    strokeAlpha: 0.42,
    radius: 15
  });
  background.on("pointerdown", onClick);
  button.add([background, createTitle(scene, 0, 0, label, "19px", "#ffffff")]);
  scene.tweens.add({ targets: button, alpha: 1, duration: 180, ease: "Sine.easeOut" });
  return button;
}

function createRoundedPrizeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: number,
  options: { stroke: number; strokeAlpha: number; radius: number }
): Phaser.GameObjects.Container {
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x5b3a24, 0.34);
  shadow.fillRoundedRect(-width / 2, -height / 2 + 5, width, height, options.radius);

  const face = scene.add.graphics();
  face.fillStyle(fill, 1);
  face.fillRoundedRect(-width / 2, -height / 2, width, height, options.radius);
  face.lineStyle(3, options.stroke, options.strokeAlpha);
  face.strokeRoundedRect(-width / 2, -height / 2, width, height, options.radius);
  face.lineStyle(2, 0xffffff, 0.24);
  face.lineBetween(-width / 2 + options.radius, -height / 2 + 6, width / 2 - options.radius, -height / 2 + 6);
  face.setInteractive(new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), Phaser.Geom.Rectangle.Contains);

  return scene.add.container(x, y, [shadow, face]);
}
