import { deflateSync, inflateSync } from "node:zlib";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const sourceRoot = path.join(root, "assets", "generated");
const publicRoot = path.join(root, "public", "assets");
const magenta = { r: 255, g: 0, b: 255 };

const targetSpecs = [
  {
    kind: "fish",
    dataPath: "src/data/fish-types.json",
    sourceDirs: ["source/fish", "fish-source"],
    sourceName: (id) => [`${id}_source.png`, `${id}-source.png`],
    outputDir: "fish",
    outputName: (id) => `${id}.png`,
    width: 256,
    height: 160,
    padding: 0.12
  },
  {
    kind: "food",
    dataPath: "src/data/food-types.json",
    sourceDirs: ["source/food"],
    sourceName: (id) => [`${id}_source.png`, `${id}-source.png`],
    outputDir: "food",
    outputName: (id) => `${id}.png`,
    width: 96,
    height: 96,
    padding: 0.18
  },
  {
    kind: "decorations",
    dataPath: "src/data/decoration-types.json",
    sourceDirs: ["source/decorations"],
    sourceName: (id) => [`${id}_source.png`, `${id}-source.png`],
    outputDir: "decorations",
    outputName: (id) => `${id}.png`,
    width: 160,
    height: 160,
    padding: 0.1
  },
  {
    kind: "helpers",
    dataPath: "src/data/helper-creature-types.json",
    sourceDirs: ["source/helpers", "helper-source"],
    sourceName: (id) => [`${id}_source.png`, `${id}-source.png`],
    outputDir: "helpers",
    outputName: (id) => `${id}.png`,
    width: 160,
    height: 110,
    padding: 0.12
  },
  {
    kind: "ui",
    ids: ["shop", "care", "book", "goals", "settings"],
    sourceDirs: ["source/ui"],
    sourceName: (id) => [`${id}_source.png`, `${id}-source.png`],
    outputDir: "ui",
    outputName: (id) => `${id}.png`,
    width: 96,
    height: 96,
    padding: 0.16
  },
  {
    kind: "coins",
    ids: ["common", "rare", "super_rare"],
    sourceDirs: ["source/coins"],
    sourceName: (id) => [`${id}_source.png`, `${id}-source.png`],
    outputDir: "coins",
    outputName: (id) => (id === "super_rare" ? "super-rare.png" : `${id}.png`),
    width: 96,
    height: 96,
    padding: 0.16
  }
];

async function main() {
  const results = [];
  const missing = [];

  for (const spec of targetSpecs) {
    const ids = spec.ids ?? (await readJson(spec.dataPath)).map((item) => item.id);
    const manifest = [];
    await mkdir(path.join(publicRoot, spec.outputDir), { recursive: true });

    for (const id of ids) {
      const source = findSource(spec, id);
      if (!source) {
        missing.push(`${spec.kind}:${id}`);
        continue;
      }

      const image = decodePng(await readFile(source));
      const transparent = chromaKey(image);
      const cropped = cropToAlpha(transparent);
      const fitted = fitImage(cropped, spec.width, spec.height, spec.padding);
      const outputRelative = path.join(spec.outputDir, spec.outputName(id));
      const outputPath = path.join(publicRoot, outputRelative);
      await writeFile(outputPath, encodePng(fitted.width, fitted.height, fitted.data));

      manifest.push({
        file: `/assets/${outputRelative.replaceAll(path.sep, "/")}`,
        width: fitted.width,
        height: fitted.height,
        source: path.relative(root, source).replaceAll(path.sep, "/"),
        processing: "image-generated raster source, chroma-key removed, cropped, padded, resized"
      });
      results.push(outputRelative.replaceAll(path.sep, "/"));
    }

    await writeFile(
      path.join(publicRoot, spec.outputDir, "manifest.json"),
      JSON.stringify({ generatedAt: new Date().toISOString(), assets: manifest }, null, 2) + "\n"
    );
  }

  if (missing.length > 0) {
    throw new Error(`Missing generated source assets: ${missing.join(", ")}`);
  }

  console.log(`Applied ${results.length} generated assets.`);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

function findSource(spec, id) {
  for (const sourceDir of spec.sourceDirs) {
    for (const name of spec.sourceName(id)) {
      const candidate = path.join(sourceRoot, sourceDir, name);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

function chromaKey(image) {
  const data = new Uint8ClampedArray(image.data);
  for (let index = 0; index < data.length; index += 4) {
    const distance =
      Math.abs(data[index] - magenta.r) +
      Math.abs(data[index + 1] - magenta.g) +
      Math.abs(data[index + 2] - magenta.b);

    if (distance < 72) {
      data[index + 3] = 0;
    } else if (distance < 150) {
      data[index + 3] = Math.min(data[index + 3], Math.round(((distance - 72) / 78) * 255));
    }
  }
  return { ...image, data };
}

function cropToAlpha(image) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.data[(y * image.width + x) * 4 + 3];
      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return image;
  }

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceStart = ((minY + y) * image.width + minX) * 4;
    const targetStart = y * width * 4;
    data.set(image.data.subarray(sourceStart, sourceStart + width * 4), targetStart);
  }

  return { width, height, data };
}

function fitImage(image, width, height, paddingRatio) {
  const paddingX = Math.round(width * paddingRatio);
  const paddingY = Math.round(height * paddingRatio);
  const maxWidth = Math.max(1, width - paddingX * 2);
  const maxHeight = Math.max(1, height - paddingY * 2);
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const resizedWidth = Math.max(1, Math.round(image.width * scale));
  const resizedHeight = Math.max(1, Math.round(image.height * scale));
  const resized = resizeBilinear(image, resizedWidth, resizedHeight);
  const data = new Uint8ClampedArray(width * height * 4);
  const offsetX = Math.round((width - resizedWidth) / 2);
  const offsetY = Math.round((height - resizedHeight) / 2);

  for (let y = 0; y < resizedHeight; y += 1) {
    for (let x = 0; x < resizedWidth; x += 1) {
      const source = (y * resizedWidth + x) * 4;
      const target = ((offsetY + y) * width + offsetX + x) * 4;
      data[target] = resized.data[source];
      data[target + 1] = resized.data[source + 1];
      data[target + 2] = resized.data[source + 2];
      data[target + 3] = resized.data[source + 3];
    }
  }

  return { width, height, data };
}

function resizeBilinear(image, width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  const xRatio = image.width / width;
  const yRatio = image.height / height;

  for (let y = 0; y < height; y += 1) {
    const sourceY = (y + 0.5) * yRatio - 0.5;
    const y0 = Math.max(0, Math.floor(sourceY));
    const y1 = Math.min(image.height - 1, y0 + 1);
    const yT = sourceY - y0;

    for (let x = 0; x < width; x += 1) {
      const sourceX = (x + 0.5) * xRatio - 0.5;
      const x0 = Math.max(0, Math.floor(sourceX));
      const x1 = Math.min(image.width - 1, x0 + 1);
      const xT = sourceX - x0;
      const target = (y * width + x) * 4;

      for (let channel = 0; channel < 4; channel += 1) {
        const top =
          image.data[(y0 * image.width + x0) * 4 + channel] * (1 - xT) +
          image.data[(y0 * image.width + x1) * 4 + channel] * xT;
        const bottom =
          image.data[(y1 * image.width + x0) * 4 + channel] * (1 - xT) +
          image.data[(y1 * image.width + x1) * 4 + channel] * xT;
        data[target + channel] = Math.round(top * (1 - yT) + bottom * yT);
      }
    }
  }

  return { width, height, data };
}

function decodePng(buffer) {
  const signature = buffer.subarray(0, 8);
  if (!signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error("Invalid PNG signature.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}`);
  }

  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const unpacked = new Uint8ClampedArray(width * height * channels);
  let rawOffset = 0;
  let prior = new Uint8ClampedArray(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const row = new Uint8ClampedArray(stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = prior[x] ?? 0;
      const upLeft = x >= channels ? prior[x - channels] : 0;
      const value = raw[rawOffset + x];
      row[x] = unfilter(value, filter, left, up, upLeft);
    }
    rawOffset += stride;
    unpacked.set(row, y * stride);
    prior = row;
  }

  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0, out = 0; index < unpacked.length; index += channels, out += 4) {
    rgba[out] = unpacked[index];
    rgba[out + 1] = unpacked[index + 1];
    rgba[out + 2] = unpacked[index + 2];
    rgba[out + 3] = colorType === 6 ? unpacked[index + 3] : 255;
  }

  return { width, height, data: rgba };
}

function unfilter(value, filter, left, up, upLeft) {
  switch (filter) {
    case 0:
      return value;
    case 1:
      return (value + left) & 255;
    case 2:
      return (value + up) & 255;
    case 3:
      return (value + Math.floor((left + up) / 2)) & 255;
    case 4:
      return (value + paeth(left, up, upLeft)) & 255;
    default:
      throw new Error(`Unsupported PNG filter: ${filter}`);
  }
}

function paeth(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

function encodePng(width, height, rgbaBuffer) {
  const scanlineLength = width * 4 + 1;
  const raw = Buffer.alloc(scanlineLength * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * scanlineLength] = 0;
    Buffer.from(rgbaBuffer.buffer, rgbaBuffer.byteOffset + y * width * 4, width * 4).copy(
      raw,
      y * scanlineLength + 1
    );
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", Buffer.concat([uint32(width), uint32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0, 0);
  return buffer;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = uint32(data.length);
  const crc = uint32(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export { chromaKey, cropToAlpha, decodePng, encodePng, fitImage, resizeBilinear };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
