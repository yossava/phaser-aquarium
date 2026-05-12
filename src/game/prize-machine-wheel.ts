import Phaser from "phaser";
import { gameHeight, gameWidth } from "./constants";
import { formatNumber, formatPrice } from "./economy";
import { gameFontFamily } from "./fonts";
import type { PrizeMachineBetAmount, PrizeMachineConfig, PrizeSpinPrize } from "./prize-machine";

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
  fish: "/assets/ui/shop/icon_category_fish.png"
};

export type PrizeMachineSpinnerActions = {
  onSpin: () => void;
  onSelectBet: (betAmount: PrizeMachineBetAmount) => void;
  onClose: () => void;
};

export type PrizeMachineSpinActions = {
  onRewardReady: () => void;
  onSpinAgain: () => void;
  onClose: () => void;
  getCommonCoins?: () => number;
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
  fishTypeId?: string;
  commonAmount?: number;
  rareAmount?: number;
  superRareAmount?: number;
};

export type PrizeWheelHud = {
  commonCoins: number;
  selectedBetAmount?: PrizeMachineBetAmount;
  betAmounts?: readonly PrizeMachineBetAmount[];
};

export function createPrizeMachineSpinner(
  scene: Phaser.Scene,
  config: PrizeMachineConfig,
  segments: PrizeWheelSegment[],
  hud: PrizeWheelHud,
  actions: PrizeMachineSpinnerActions
): Phaser.GameObjects.Container {
  const betButtons = hud.betAmounts
    ? [createBetSelector(scene, gameWidth / 2, gameHeight - 198, hud.betAmounts, hud.selectedBetAmount ?? 100, actions.onSelectBet)]
    : [];
  return createPrizeSpinnerShell(scene, config, segments, [createBalanceText(scene, gameWidth / 2, hud.commonCoins)], [
    ...betButtons,
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
  const textScale = 1 / prizeUiRenderScale(scene);
  const resultText = createResultText(scene, centerX, centerY, resultSegment);
  const costText = createPrizePopText(scene, centerX, centerY, `-${formatPrice(config.spinCost)}`, "#ffb0a8").setScale(0.74 * textScale);
  const ring = createPrizeRing(scene, segments, centerX, centerY, ringRadius);
  const balanceText = createBalanceText(scene, centerX, hud.commonCoins);
  const container = createPrizeSpinnerShell(scene, config, segments, [balanceText], [costText, resultText], ring);

  scene.tweens.add({
    targets: costText,
    scale: { from: 0.58 * textScale, to: 0.94 * textScale },
    duration: 240,
    ease: "Back.easeOut"
  });

  animatePrizeSelection(scene, ring.cells, resultIndex, () => actions.onHighlight?.(), () => {
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
        container.add([
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
  ring = createPrizeRing(scene, segments, gameWidth / 2, prizeRingCenterY(), prizeRingRadius(segments.length))
): Phaser.GameObjects.Container {
  const centerX = gameWidth / 2;
  return scene.add.container(0, 0, [
    scene.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x011827, 0.86),
    createTitle(scene, centerX, 58, config.title, "31px", "#ffffff"),
    ...headerChildren,
    ring.container,
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
  return gameHeight * 0.455;
}

function prizeRingRadius(segmentCount: number): number {
  if (segmentCount >= 12) {
    return 156;
  }
  if (segmentCount >= 10) {
    return 154;
  }
  return 152;
}

function prizeCellRadius(segmentCount: number): number {
  if (segmentCount >= 12) {
    return 31;
  }
  if (segmentCount >= 10) {
    return 35;
  }
  return 43;
}

type PrizeRingCell = {
  container: Phaser.GameObjects.Container;
  fill: Phaser.GameObjects.Arc;
  highlight: Phaser.GameObjects.Arc;
  color: number;
  radius: number;
  isJackpot: boolean;
};

function createPrizeRing(
  scene: Phaser.Scene,
  segments: PrizeWheelSegment[],
  centerX: number,
  centerY: number,
  radius: number
): { container: Phaser.GameObjects.Container; cells: PrizeRingCell[] } {
  const container = scene.add.container(0, 0);
  const cells: PrizeRingCell[] = [];
  const segmentCount = segments.length;

  for (let index = 0; index < segmentCount; index += 1) {
    const segment = segments[index];
    const angle = Phaser.Math.DegToRad(index * (360 / segmentCount) - 90);
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    const cell = createPrizeCell(scene, segment, x, y, index === 0, segmentCount);
    cells.push(cell);
    container.add(cell.container);
  }

  setActivePrizeCell(scene, cells, 0);
  return { container, cells };
}

function createPrizeCell(scene: Phaser.Scene, segment: PrizeWheelSegment, x: number, y: number, isJackpot: boolean, segmentCount: number): PrizeRingCell {
  const radius = prizeCellRadius(segmentCount);
  const container = scene.add.container(x, y);
  const fill = scene.add.circle(0, 0, radius, segment.color, isJackpot ? 0.98 : 0.84)
    .setStrokeStyle(3, 0x8eeeff, 0.36);
  const highlight = scene.add.circle(0, 0, radius, 0xffffff, 0.08)
    .setStrokeStyle(6, 0xfff3a3, 0)
    .setAlpha(0);
  const icon = scene.add.image(0, -5, segment.iconTextureKey);
  icon.setDisplaySize(radius * 0.86, radius * 0.86);
  const label = createSegmentLabel(scene, 0, radius * 0.54, segment.label, segmentCount);
  container.add([fill, highlight, icon, label]);
  return { container, fill, highlight, color: segment.color, radius, isJackpot };
}

function animatePrizeSelection(scene: Phaser.Scene, cells: PrizeRingCell[], resultIndex: number, onHighlight: () => void, onComplete: () => void): void {
  const segmentCount = cells.length;
  const safeResultIndex = Phaser.Math.Clamp(resultIndex, 0, segmentCount - 1);
  const steps = segmentCount * 2 + safeResultIndex + 1;
  let currentStep = 0;
  const advance = () => {
    const activeIndex = currentStep % segmentCount;
    setActivePrizeCell(scene, cells, activeIndex);
    onHighlight();
    currentStep += 1;
    if (currentStep >= steps) {
      setActivePrizeCell(scene, cells, safeResultIndex);
      scene.time.delayedCall(180, onComplete);
      return;
    }
    const progress = currentStep / steps;
    scene.time.delayedCall(30 + progress * 62, advance);
  };
  advance();
}

function setActivePrizeCell(scene: Phaser.Scene, cells: PrizeRingCell[], activeIndex: number): void {
  cells.forEach((cell, index) => {
    const active = index === activeIndex;
    cell.highlight.setAlpha(active ? 1 : 0);
    cell.fill.setStrokeStyle(active ? 4 : 3, active ? 0xffffff : 0x8eeeff, active ? 0.9 : 0.36);
    cell.highlight.setStrokeStyle(6, 0xfff3a3, active ? 1 : 0);
    cell.container.setScale(active ? 1.1 : 1);
    if (active) {
      scene.tweens.add({
        targets: cell.container,
        scale: { from: 0.98, to: 1.1 },
        duration: 65,
        ease: "Sine.easeOut"
      });
    }
  });
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
  const fontSize = segmentCount >= 12 ? 8 : 10;
  return scene.add.text(x, y, label, {
    fontFamily: gameFontFamily,
    fontSize: `${Math.round(fontSize * renderScale)}px`,
    color: "#ffffff",
    fontStyle: "900",
    stroke: "#073047",
    strokeThickness: Math.round(3 * renderScale),
    align: "center"
  }).setOrigin(0.5).setScale(1 / renderScale);
}

function createResultText(scene: Phaser.Scene, x: number, y: number, segment: PrizeWheelSegment): Phaser.GameObjects.GameObject {
  const colorByPrize: Record<PrizeSpinPrize, string> = {
    rare: "#9eefff",
    superRare: "#f0b6ff",
    rareFish: "#a8ffb0",
    premiumCommon: "#fff3a3",
    food: "#a8ffb0",
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

function createBetSelector(
  scene: Phaser.Scene,
  x: number,
  y: number,
  betAmounts: readonly PrizeMachineBetAmount[],
  selectedBetAmount: PrizeMachineBetAmount,
  onSelectBet: (betAmount: PrizeMachineBetAmount) => void
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const spacing = betAmounts.length > 4 ? 50 : 74;
  const startX = -((betAmounts.length - 1) * spacing) / 2;
  betAmounts.forEach((betAmount, index) => {
    const selected = betAmount === selectedBetAmount;
    const button = scene.add.container(startX + index * spacing, 0).setAlpha(0);
    const background = scene.add.rectangle(0, 0, betAmounts.length > 4 ? 46 : 64, 34, selected ? 0x0ea5e9 : 0x073047, 0.96)
      .setStrokeStyle(2, selected ? 0xfff3a3 : 0x8eeeff, selected ? 0.92 : 0.34)
      .setInteractive({ useHandCursor: true });
    background.on("pointerdown", () => onSelectBet(betAmount));
    button.add([background, createTitle(scene, 0, 0, `C${formatNumber(betAmount)}`, "12px", "#ffffff")]);
    scene.tweens.add({ targets: button, alpha: 1, duration: 180, delay: index * 20, ease: "Sine.easeOut" });
    container.add(button);
  });
  return container;
}

function createButton(scene: Phaser.Scene, x: number, y: number, width: number, height: number, label: string, fill: number, onClick: () => void): Phaser.GameObjects.Container {
  const button = scene.add.container(x, y).setAlpha(0);
  const background = scene.add.rectangle(0, 0, width, height, fill, 1)
    .setStrokeStyle(3, 0xffffff, 0.4)
    .setInteractive({ useHandCursor: true });
  background.on("pointerdown", onClick);
  button.add([background, createTitle(scene, 0, 0, label, "19px", "#ffffff")]);
  scene.tweens.add({ targets: button, alpha: 1, duration: 180, ease: "Sine.easeOut" });
  return button;
}
