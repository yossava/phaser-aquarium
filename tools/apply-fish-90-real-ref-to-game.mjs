import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { cropToAlpha, decodePng, encodePng, fitImage } from "./apply-generated-assets.mjs";

const root = process.cwd();
const generatedRoot = path.join(root, "assets", "generated", "fish-90-real-ref");
const generatedManifestPath = path.join(generatedRoot, "manifest.json");
const publicFishDir = path.join(root, "public", "assets", "fish");
const publicManifestPath = path.join(publicFishDir, "manifest.json");
const fishDataPath = path.join(root, "src", "data", "fish-types.json");
const runtimeWidth = 256;
const runtimeHeight = 160;
const swimFrameCount = 12;
const execFileAsync = promisify(execFile);
const cwebpBinary = process.env.CWEBP_BIN ?? "cwebp";

const rarityConfig = {
  common: {
    runtimeRarity: "common",
    coinType: "common",
    levelStart: 1,
    levelSpan: 2,
    priceBase: 90,
    priceStep: 12,
    sellRatio: 0.62,
    foods: ["micro", "basic"],
    preferred: ["basic"],
    productionBase: 8,
    productionStep: 1,
    interval: 9,
    baseScale: 0.68,
    maxScale: 1.26,
    speedBase: 50,
    hungerBase: 0.32,
    illnessResistance: 0.72
  },
  rare: {
    runtimeRarity: "rare",
    coinType: "rare",
    levelStart: 3,
    levelSpan: 2,
    priceBase: 8,
    priceStep: 1,
    sellRatio: 0.55,
    foods: ["premium", "protein"],
    preferred: ["protein", "premium"],
    productionBase: 3,
    productionStep: 1,
    interval: 12,
    baseScale: 0.76,
    maxScale: 1.44,
    speedBase: 54,
    hungerBase: 0.36,
    illnessResistance: 0.82
  },
  super_rare: {
    runtimeRarity: "superRare",
    coinType: "superRare",
    levelStart: 5,
    levelSpan: 1,
    priceBase: 5,
    priceStep: 1,
    sellRatio: 0.5,
    foods: ["herb", "coral", "protein"],
    preferred: ["coral", "herb"],
    productionBase: 1,
    productionStep: 1,
    interval: 15,
    baseScale: 0.84,
    maxScale: 1.72,
    speedBase: 57,
    hungerBase: 0.42,
    illnessResistance: 0.9
  }
};

const tintByRarity = {
  common: 0xffffff,
  rare: 0xffffff,
  super_rare: 0xffffff
};

async function main() {
  const generatedManifest = JSON.parse(await readFile(generatedManifestPath, "utf8"));
  const acceptedAssets = generatedManifest.assets.filter(
    (asset) => asset.status === "pass" && asset.final && existsSync(path.join(root, asset.final))
  );

  await mkdir(publicFishDir, { recursive: true });
  const publicManifest = await readOptionalJson(publicManifestPath, { generatedAt: "", assets: [] });
  const manifestAssets = new Map(publicManifest.assets.map((asset) => [asset.file, asset]));

  for (const asset of acceptedAssets) {
    const sourcePath = path.join(root, asset.final);
    const runtimeImage = fitImage(cropToAlpha(decodePng(await readFile(sourcePath))), runtimeWidth, runtimeHeight, 0.08);
    const fishPngPath = path.join(publicFishDir, `${asset.id}.png`);
    const tempSwimPngPath = path.join(publicFishDir, `${asset.id}-swim.png`);
    const swimWebpPath = path.join(publicFishDir, `${asset.id}-swim.webp`);
    await writeFile(fishPngPath, encodePng(runtimeImage.width, runtimeImage.height, runtimeImage.data));
    await writeFile(tempSwimPngPath, encodePng(runtimeWidth * swimFrameCount, runtimeHeight, createSwimSheet(runtimeImage).data));
    await encodeWebp(tempSwimPngPath, swimWebpPath);
    await unlink(tempSwimPngPath);

    manifestAssets.set(`/assets/fish/${asset.id}.png`, {
      file: `/assets/fish/${asset.id}.png`,
      width: runtimeWidth,
      height: runtimeHeight,
      source: asset.final,
      processing: "fish-90 real-reference final, cropped, padded, resized"
    });
    manifestAssets.set(`/assets/fish/${asset.id}-swim.webp`, {
      file: `/assets/fish/${asset.id}-swim.webp`,
      width: runtimeWidth * swimFrameCount,
      height: runtimeHeight,
      source: asset.final,
      processing: "12-frame subtle horizontal swim wave sheet generated from fish-90 real-reference final, WebP q82"
    });
  }

  await writeFile(
    publicManifestPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), assets: [...manifestAssets.values()] }, null, 2) + "\n"
  );

  const fishTypes = JSON.parse(await readFile(fishDataPath, "utf8"));
  const existingIds = new Set(fishTypes.map((fish) => fish.id));
  const newFish = acceptedAssets
    .filter((asset) => !existingIds.has(asset.id))
    .map((asset, index) => buildFishType(asset, index));

  if (newFish.length > 0) {
    const allIds = [...fishTypes.map((fish) => fish.id), ...newFish.map((fish) => fish.id)];
    for (const fish of newFish) {
      fish.compatibleSpecies = allIds;
    }
    fishTypes.push(...newFish);
    await writeFile(fishDataPath, JSON.stringify(fishTypes, null, 2) + "\n");
  }

  console.log(`Applied ${acceptedAssets.length} fish assets and ${newFish.length} new shop fish.`);
}

async function readOptionalJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function encodeWebp(sourcePngPath, targetWebpPath) {
  await execFileAsync(cwebpBinary, ["-quiet", "-q", "82", "-m", "6", sourcePngPath, "-o", targetWebpPath]);
}

function buildFishType(asset, index) {
  const config = rarityConfig[asset.rarity];
  const rarityOffset = indexWithinRarity(asset);
  const priceAmount = config.priceBase + rarityOffset * config.priceStep;
  const sellAmount = Math.max(1, Math.floor(priceAmount * config.sellRatio));
  const level = config.levelStart + (config.levelSpan > 1 ? rarityOffset % config.levelSpan : 0);
  const productionCoinType = config.coinType;
  const productionAmount = config.productionBase + Math.floor(rarityOffset / 4) * config.productionStep;
  const speed = config.speedBase + (rarityOffset % 6) * 2;
  const baseScale = Number((config.baseScale + (rarityOffset % 5) * 0.015).toFixed(3));
  const maxScale = Number((config.maxScale + (rarityOffset % 5) * 0.018).toFixed(3));

  return {
    id: asset.id,
    name: speciesDisplayName(asset.species_reference ?? asset.id),
    speciesFamily: speciesFamily(asset.species_reference ?? asset.id),
    tankLevel: level,
    rarity: config.runtimeRarity,
    price: { coinType: config.coinType, amount: priceAmount },
    acquisitionSources: ["store"],
    sellBaseValue: { coinType: config.coinType, amount: sellAmount },
    requiredFoodTypes: config.foods,
    preferredFoodTypes: config.preferred,
    habitatTags: habitatTags(asset.rarity),
    compatibleSpecies: [],
    incompatibleSpecies: [],
    waterRequirement: asset.rarity === "super_rare" ? "reef" : "freshwater",
    illnessResistance: config.illnessResistance,
    ageCurve: buildAgeCurve(productionCoinType, productionAmount, config.interval, baseScale),
    baseScale,
    maxScale,
    growthPerSecond: Number((0.00072 + rarityOffset * 0.000006).toFixed(6)),
    speed,
    hungerPerSecond: Number((config.hungerBase + (rarityOffset % 5) * 0.006).toFixed(3)),
    coinDropSeconds: config.interval,
    coinValue: productionAmount,
    tint: tintByRarity[asset.rarity] ?? 0xffffff
  };
}

function buildAgeCurve(coinType, amount, intervalSeconds, baseScale) {
  return {
    baby: stage(180, baseScale * 0.74, 1.22, 72, coinType, amount, intervalSeconds),
    juvenile: stage(480, baseScale * 0.92, 1.08, 92, coinType, Math.ceil(amount * 1.28), intervalSeconds),
    adult: stage(1200, baseScale * 1.08, 1, 120, coinType, Math.ceil(amount * 1.62), intervalSeconds),
    elder: stage(2100, baseScale * 1.2, 0.92, 148, coinType, Math.ceil(amount * 1.95), intervalSeconds),
    master: stage(0, baseScale * 1.3, 0.86, 176, coinType, Math.ceil(amount * 2.34), intervalSeconds)
  };
}

function stage(durationSeconds, scale, hungerMultiplier, moodCycleSeconds, coinType, amount, intervalSeconds) {
  return {
    durationSeconds,
    scale: Number(scale.toFixed(3)),
    hungerMultiplier,
    moodCycleSeconds,
    production: [{ coinType, amount, intervalSeconds, chance: 1 }]
  };
}

function createSwimSheet(image) {
  const sheet = { width: runtimeWidth * swimFrameCount, height: runtimeHeight, data: new Uint8ClampedArray(runtimeWidth * swimFrameCount * runtimeHeight * 4) };
  for (let frame = 0; frame < swimFrameCount; frame += 1) {
    const phase = (frame / swimFrameCount) * Math.PI * 2;
    const warped = warpFrame(image, phase);
    blit(warped, sheet, frame * runtimeWidth, 0);
  }
  return sheet;
}

function warpFrame(image, phase) {
  const data = new Uint8ClampedArray(image.width * image.height * 4);
  const amplitude = 2.2;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const nx = image.width <= 1 ? 0 : x / (image.width - 1);
      const tailBias = smoothstep(0.16, 1, nx);
      const wave = Math.sin(phase + nx * Math.PI * 2.15);
      const sourceX = x - wave * amplitude * tailBias;
      const sourceY = y - Math.sin(phase + nx * Math.PI * 1.3) * 0.35 * tailBias;
      const sample = sampleBilinear(image, sourceX, sourceY);
      const target = (y * image.width + x) * 4;
      data[target] = sample[0];
      data[target + 1] = sample[1];
      data[target + 2] = sample[2];
      data[target + 3] = sample[3];
    }
  }
  return { width: image.width, height: image.height, data };
}

function sampleBilinear(image, x, y) {
  if (x < 0 || y < 0 || x > image.width - 1 || y > image.height - 1) {
    return [0, 0, 0, 0];
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(image.width - 1, x0 + 1);
  const y1 = Math.min(image.height - 1, y0 + 1);
  const xT = x - x0;
  const yT = y - y0;
  const out = [0, 0, 0, 0];
  for (let channel = 0; channel < 4; channel += 1) {
    const top = pixel(image, x0, y0, channel) * (1 - xT) + pixel(image, x1, y0, channel) * xT;
    const bottom = pixel(image, x0, y1, channel) * (1 - xT) + pixel(image, x1, y1, channel) * xT;
    out[channel] = Math.round(top * (1 - yT) + bottom * yT);
  }
  return out;
}

function pixel(image, x, y, channel) {
  return image.data[(y * image.width + x) * 4 + channel] ?? 0;
}

function blit(source, target, offsetX, offsetY) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceIndex = (y * source.width + x) * 4;
      const targetIndex = ((offsetY + y) * target.width + offsetX + x) * 4;
      target.data[targetIndex] = source.data[sourceIndex];
      target.data[targetIndex + 1] = source.data[sourceIndex + 1];
      target.data[targetIndex + 2] = source.data[sourceIndex + 2];
      target.data[targetIndex + 3] = source.data[sourceIndex + 3];
    }
  }
}

function smoothstep(edge0, edge1, value) {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

function speciesDisplayName(value) {
  return value
    .replace(/\bSr\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/[\s_-]+/)
    .map((word) => (word.length <= 2 ? word.toUpperCase() : `${word[0].toUpperCase()}${word.slice(1)}`))
    .join(" ");
}

function speciesFamily(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "real-reference";
}

function habitatTags(rarity) {
  if (rarity === "super_rare") {
    return ["premium", "reef"];
  }
  if (rarity === "rare") {
    return ["premium", "freshwater"];
  }
  return ["freshwater", "community"];
}

function indexWithinRarity(asset) {
  const manifest = globalThis.__fish90ManifestAssets ?? [];
  return manifest.filter((candidate) => candidate.status === "pass" && candidate.rarity === asset.rarity).findIndex((candidate) => candidate.id === asset.id);
}

const generatedManifest = JSON.parse(await readFile(generatedManifestPath, "utf8"));
globalThis.__fish90ManifestAssets = generatedManifest.assets;
await main();
