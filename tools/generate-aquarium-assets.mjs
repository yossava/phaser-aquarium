import { deflateSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outRoot = path.join(root, "public", "assets");
const artifactRoot = path.join(root, "artifacts");
const scale = 3;

const foodColors = {
  micro: 0x62f2a8,
  basic: 0xffb13b,
  premium: 0x56a8ff,
  herb: 0x78d957,
  protein: 0xff5b5b,
  coral: 0x35d6d0,
  medicine: 0x43d66f,
  evolve: 0xb47cff,
  event: 0xf39cff
};

const rarityAccent = {
  common: 0xffe67a,
  rare: 0x8bd7ff,
  superRare: 0xf39cff
};

const coinFiles = {
  common: "common.png",
  rare: "rare.png",
  superRare: "super-rare.png"
};

const uiIcons = [
  { id: "shop", name: "Shop" },
  { id: "care", name: "Care" },
  { id: "book", name: "Book" },
  { id: "goals", name: "Goals" },
  { id: "settings", name: "Settings" }
];

function rgba(hex, alpha = 255) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255, alpha];
}

function hexColor(color) {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function mixColor(a, b, t) {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  return (
    (Math.round(ar + (br - ar) * t) << 16) |
    (Math.round(ag + (bg - ag) * t) << 8) |
    Math.round(ab + (bb - ab) * t)
  );
}

function seeded(id) {
  let seed = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    seed ^= id.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.rawWidth = width * scale;
    this.rawHeight = height * scale;
    this.data = new Uint8ClampedArray(this.rawWidth * this.rawHeight * 4);
  }

  blendRaw(x, y, color) {
    if (x < 0 || y < 0 || x >= this.rawWidth || y >= this.rawHeight) {
      return;
    }
    const index = (Math.floor(y) * this.rawWidth + Math.floor(x)) * 4;
    const alpha = color[3] / 255;
    const inverse = 1 - alpha;
    const oldAlpha = this.data[index + 3] / 255;
    const outAlpha = alpha + oldAlpha * inverse;
    if (outAlpha <= 0) {
      return;
    }
    this.data[index] = Math.round((color[0] * alpha + this.data[index] * oldAlpha * inverse) / outAlpha);
    this.data[index + 1] = Math.round((color[1] * alpha + this.data[index + 1] * oldAlpha * inverse) / outAlpha);
    this.data[index + 2] = Math.round((color[2] * alpha + this.data[index + 2] * oldAlpha * inverse) / outAlpha);
    this.data[index + 3] = Math.round(outAlpha * 255);
  }

  fillEllipse(cx, cy, rx, ry, color) {
    const s = this.scale;
    const minX = Math.floor((cx - rx) * s);
    const maxX = Math.ceil((cx + rx) * s);
    const minY = Math.floor((cy - ry) * s);
    const maxY = Math.ceil((cy + ry) * s);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = (x + 0.5) / s - cx;
        const dy = (y + 0.5) / s - cy;
        if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
          this.blendRaw(x, y, color);
        }
      }
    }
  }

  fillRect(x, y, width, height, color) {
    const s = this.scale;
    for (let yy = Math.floor(y * s); yy < Math.ceil((y + height) * s); yy += 1) {
      for (let xx = Math.floor(x * s); xx < Math.ceil((x + width) * s); xx += 1) {
        this.blendRaw(xx, yy, color);
      }
    }
  }

  fillRoundedRect(x, y, width, height, radius, color) {
    this.fillRect(x + radius, y, width - radius * 2, height, color);
    this.fillRect(x, y + radius, width, height - radius * 2, color);
    this.fillEllipse(x + radius, y + radius, radius, radius, color);
    this.fillEllipse(x + width - radius, y + radius, radius, radius, color);
    this.fillEllipse(x + radius, y + height - radius, radius, radius, color);
    this.fillEllipse(x + width - radius, y + height - radius, radius, radius, color);
  }

  fillPolygon(points, color) {
    const s = this.scale;
    const minX = Math.floor(Math.min(...points.map((point) => point[0])) * s);
    const maxX = Math.ceil(Math.max(...points.map((point) => point[0])) * s);
    const minY = Math.floor(Math.min(...points.map((point) => point[1])) * s);
    const maxY = Math.ceil(Math.max(...points.map((point) => point[1])) * s);
    const scaledPoints = points.map(([x, y]) => [x * s, y * s]);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (isInsidePolygon(x + 0.5, y + 0.5, scaledPoints)) {
          this.blendRaw(x, y, color);
        }
      }
    }
  }

  line(x1, y1, x2, y2, width, color) {
    const s = this.scale;
    const radius = (width * s) / 2;
    const ax = x1 * s;
    const ay = y1 * s;
    const bx = x2 * s;
    const by = y2 * s;
    const minX = Math.floor(Math.min(ax, bx) - radius);
    const maxX = Math.ceil(Math.max(ax, bx) + radius);
    const minY = Math.floor(Math.min(ay, by) - radius);
    const maxY = Math.ceil(Math.max(ay, by) + radius);
    const lengthSq = Math.max(1, (bx - ax) ** 2 + (by - ay) ** 2);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / lengthSq));
        const px = ax + (bx - ax) * t;
        const py = ay + (by - ay) * t;
        if ((x - px) ** 2 + (y - py) ** 2 <= radius ** 2) {
          this.blendRaw(x, y, color);
        }
      }
    }
  }

  strokeEllipse(cx, cy, rx, ry, width, color) {
    const steps = 96;
    let previous = [cx + rx, cy];
    for (let index = 1; index <= steps; index += 1) {
      const angle = (Math.PI * 2 * index) / steps;
      const current = [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
      this.line(previous[0], previous[1], current[0], current[1], width, color);
      previous = current;
    }
  }

  star(cx, cy, radius, color, inner = radius * 0.45, points = 5) {
    const polygon = [];
    for (let index = 0; index < points * 2; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * index) / points;
      const r = index % 2 === 0 ? radius : inner;
      polygon.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
    }
    this.fillPolygon(polygon, color);
  }

  toPngBuffer() {
    const out = Buffer.alloc(this.width * this.height * 4);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        let red = 0;
        let green = 0;
        let blue = 0;
        let alpha = 0;
        for (let sy = 0; sy < this.scale; sy += 1) {
          for (let sx = 0; sx < this.scale; sx += 1) {
            const source = ((y * this.scale + sy) * this.rawWidth + x * this.scale + sx) * 4;
            red += this.data[source];
            green += this.data[source + 1];
            blue += this.data[source + 2];
            alpha += this.data[source + 3];
          }
        }
        const target = (y * this.width + x) * 4;
        const samples = this.scale * this.scale;
        out[target] = Math.round(red / samples);
        out[target + 1] = Math.round(green / samples);
        out[target + 2] = Math.round(blue / samples);
        out[target + 3] = Math.round(alpha / samples);
      }
    }
    return encodePng(this.width, this.height, out);
  }
}

function isInsidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function encodePng(width, height, rgbaBuffer) {
  const scanlineLength = width * 4 + 1;
  const raw = Buffer.alloc(scanlineLength * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * scanlineLength] = 0;
    rgbaBuffer.copy(raw, y * scanlineLength + 1, y * width * 4, (y + 1) * width * 4);
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

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}

async function writeAsset(relativePath, canvas, manifest, prompt) {
  const absolute = path.join(outRoot, relativePath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, canvas.toPngBuffer());
  manifest.push({
    file: `/assets/${relativePath}`,
    width: canvas.width,
    height: canvas.height,
    prompt
  });
}

function foodTintFor(id) {
  return foodColors[id] ?? foodColors.basic;
}

function fishFoodTintFor(fish) {
  return foodTintFor(fish.preferredFoodTypes?.[0] ?? fish.requiredFoodTypes?.[0] ?? "basic");
}

function drawFishAsset(fish) {
  const random = seeded(fish.id);
  const canvas = new Canvas(256, 160);
  const body = fish.tint ?? 0xffb13b;
  const tail = fishFoodTintFor(fish);
  const accent = rarityAccent[fish.rarity] ?? rarityAccent.common;
  const dark = mixColor(body, 0x061725, 0.48);
  const light = mixColor(body, 0xffffff, 0.38);
  const family = fish.id;
  const tall = /angel|discus|idol|moon|butterfly|bat|trigger/.test(family);
  const long = /arowana|bichir|loach|dragon|leviathan|wrasse|foxface/.test(family);
  const round = /goldfish|molly|platy|gourami|betta|koi|barb|ram/.test(family);
  const flat = /ray|jelly/.test(family);
  const bodyCx = flat ? 140 : 146;
  const bodyCy = 82;
  const rx = flat ? 74 : long ? 82 : round ? 66 : 70;
  const ry = flat ? 40 : tall ? 50 : round ? 38 : 34;
  const tailJoinX = bodyCx - rx + 12;
  const tailBackX = Math.max(18, tailJoinX - (flat ? 28 : long ? 44 : 38));
  const tailHalf = tall ? 44 : flat ? 28 : 35;

  canvas.fillEllipse(bodyCx + 3, bodyCy + 12, rx * 0.9, ry * 0.75, rgba(0x061725, 38));
  canvas.fillPolygon(
    [
      [tailJoinX, bodyCy],
      [tailBackX, bodyCy - tailHalf],
      [tailBackX, bodyCy + tailHalf]
    ],
    rgba(tail, fish.rarity === "superRare" ? 242 : 226)
  );
  canvas.fillPolygon(
    [
      [tailJoinX + 7, bodyCy],
      [tailBackX + 12, bodyCy - tailHalf * 0.62],
      [tailBackX + 12, bodyCy + tailHalf * 0.62]
    ],
    rgba(mixColor(tail, 0xffffff, 0.35), 190)
  );
  canvas.line(tailBackX, bodyCy - tailHalf + 2, tailBackX, bodyCy + tailHalf - 2, 2.5, rgba(0xffffff, 115));

  if (tall) {
    canvas.fillPolygon([[bodyCx - 14, bodyCy - 8], [bodyCx + 18, 14], [bodyCx + 40, bodyCy - 12]], rgba(light, 160));
    canvas.fillPolygon([[bodyCx - 12, bodyCy + 8], [bodyCx + 20, 148], [bodyCx + 42, bodyCy + 12]], rgba(mixColor(body, 0xffffff, 0.24), 150));
  } else {
    canvas.fillPolygon([[bodyCx - 14, bodyCy - ry + 12], [bodyCx + 24, bodyCy - ry - 14], [bodyCx + 42, bodyCy - ry + 8]], rgba(light, 150));
    canvas.fillPolygon([[bodyCx - 8, bodyCy + ry - 10], [bodyCx + 26, bodyCy + ry + 18], [bodyCx + 42, bodyCy + ry - 4]], rgba(mixColor(body, 0xffffff, 0.22), 130));
  }

  canvas.fillEllipse(bodyCx, bodyCy, rx, ry, rgba(body, 245));
  canvas.fillEllipse(bodyCx + rx * 0.2, bodyCy - ry * 0.22, rx * 0.58, ry * 0.28, rgba(light, 185));
  canvas.fillEllipse(bodyCx + rx * 0.24, bodyCy + ry * 0.28, rx * 0.45, ry * 0.2, rgba(mixColor(body, 0xffffff, 0.6), 90));
  canvas.strokeEllipse(bodyCx, bodyCy, rx, ry, 2.2, rgba(dark, 90));

  const stripeCount = fish.rarity === "superRare" ? 5 : fish.rarity === "rare" ? 4 : 3;
  for (let index = 0; index < stripeCount; index += 1) {
    const x = bodyCx - rx * 0.52 + index * ((rx * 0.82) / Math.max(1, stripeCount - 1));
    const sway = (random() - 0.5) * 8;
    canvas.line(x, bodyCy - ry * 0.58, x + sway, bodyCy + ry * 0.56, 2, rgba(accent, fish.rarity === "common" ? 80 : 130));
  }

  const dotCount = fish.rarity === "superRare" ? 14 : fish.rarity === "rare" ? 10 : 6;
  for (let index = 0; index < dotCount; index += 1) {
    const x = bodyCx - rx * 0.42 + random() * rx * 0.78;
    const y = bodyCy - ry * 0.42 + random() * ry * 0.84;
    const size = fish.rarity === "superRare" ? 2.4 : 1.8;
    canvas.fillEllipse(x, y, size, size, rgba(accent, fish.rarity === "common" ? 100 : 180));
  }

  if (/cory|catfish|loach|bichir/.test(family)) {
    canvas.line(bodyCx + rx - 10, bodyCy + 1, bodyCx + rx + 24, bodyCy - 11, 2, rgba(0xf7fbff, 190));
    canvas.line(bodyCx + rx - 11, bodyCy + 5, bodyCx + rx + 22, bodyCy + 19, 2, rgba(0xf7fbff, 190));
  }
  if (/betta|guppy|koi|dragon|leviathan|celestial|aurora|nebula|opal/.test(family)) {
    canvas.fillPolygon(
      [
        [tailBackX + 8, bodyCy - tailHalf * 0.85],
        [tailBackX - 8, bodyCy],
        [tailBackX + 8, bodyCy + tailHalf * 0.85],
        [tailBackX + 24, bodyCy]
      ],
      rgba(mixColor(tail, accent, 0.48), 105)
    );
  }
  if (/jelly/.test(family)) {
    for (let index = 0; index < 5; index += 1) {
      const x = bodyCx - 34 + index * 18;
      canvas.line(x, bodyCy + ry * 0.72, x + 10, bodyCy + ry + 28, 2, rgba(accent, 128));
    }
  }

  canvas.fillEllipse(bodyCx + rx - 19, bodyCy - 10, 7.2, 7.2, rgba(0xffffff, 255));
  canvas.fillEllipse(bodyCx + rx - 17, bodyCy - 9.4, 3.5, 3.5, rgba(0x061725, 255));
  canvas.fillEllipse(bodyCx + rx - 15.8, bodyCy - 11, 1.2, 1.2, rgba(0xffffff, 255));
  canvas.line(bodyCx + rx - 31, bodyCy - 17, bodyCx + rx - 35, bodyCy + 20, 2.1, rgba(dark, 88));
  canvas.line(bodyCx + rx - 10, bodyCy + 8, bodyCx + rx + 4, bodyCy + 5, 2.2, rgba(0x061725, 120));

  if (fish.rarity === "superRare") {
    canvas.star(42, 32, 8, rgba(accent, 190), 3.5, 5);
    canvas.star(214, 32, 6, rgba(0xffffff, 165), 2.6, 5);
    canvas.strokeEllipse(bodyCx, bodyCy, rx + 6, ry + 6, 2, rgba(accent, 90));
  } else if (fish.rarity === "rare") {
    canvas.fillEllipse(bodyCx + 8, bodyCy - ry + 11, 5, 5, rgba(accent, 190));
    canvas.fillEllipse(bodyCx + 22, bodyCy - ry + 13, 4, 4, rgba(0xffffff, 150));
  }

  return canvas;
}

function drawFoodAsset(food) {
  const canvas = new Canvas(96, 96);
  const color = foodTintFor(food.id);
  const light = mixColor(color, 0xffffff, 0.45);
  const dark = mixColor(color, 0x061725, 0.35);
  canvas.fillEllipse(48, 58, 27, 9, rgba(0x061725, 34));
  if (food.id === "medicine" || food.id === "evolve") {
    canvas.fillRoundedRect(18, 34, 60, 28, 14, rgba(color, 255));
    canvas.line(48, 36, 48, 60, 3, rgba(dark, 150));
    canvas.strokeEllipse(48, 48, 31, 15, 2.5, rgba(0xffffff, 165));
    canvas.fillEllipse(34, 43, 4, 4, rgba(light, 220));
    canvas.fillEllipse(62, 53, 4, 4, rgba(light, 180));
    if (food.id === "evolve") {
      canvas.star(48, 48, 10, rgba(0xffffff, 190), 4, 5);
    }
    return canvas;
  }
  if (food.id === "herb") {
    canvas.fillEllipse(35, 47, 19, 8, rgba(color, 245));
    canvas.fillEllipse(54, 45, 22, 8, rgba(mixColor(color, 0xffffaa, 0.25), 240));
    canvas.line(26, 47, 65, 45, 2, rgba(dark, 130));
    canvas.fillEllipse(51, 57, 18, 7, rgba(color, 220));
    return canvas;
  }
  if (food.id === "coral") {
    for (let index = 0; index < 10; index += 1) {
      const x = 26 + (index % 5) * 10;
      const y = 39 + Math.floor(index / 5) * 15 + (index % 2) * 4;
      canvas.fillEllipse(x, y, 5, 5, rgba(index % 2 ? light : color, 240));
    }
    return canvas;
  }
  if (food.id === "event") {
    canvas.star(48, 48, 27, rgba(color, 255), 12, 6);
    canvas.star(48, 48, 14, rgba(0xfff7a8, 210), 6, 6);
    return canvas;
  }
  if (food.id === "protein") {
    canvas.fillRoundedRect(27, 30, 20, 23, 6, rgba(color, 255));
    canvas.fillRoundedRect(48, 41, 21, 22, 6, rgba(mixColor(color, 0xffd15c, 0.2), 245));
    canvas.fillRoundedRect(33, 55, 20, 18, 6, rgba(dark, 230));
    return canvas;
  }
  if (food.id === "premium") {
    canvas.fillPolygon([[48, 23], [72, 39], [66, 69], [48, 80], [30, 69], [24, 39]], rgba(color, 255));
    canvas.fillPolygon([[48, 23], [72, 39], [48, 48], [24, 39]], rgba(light, 190));
    canvas.line(48, 23, 48, 80, 2, rgba(0xffffff, 110));
    return canvas;
  }
  const count = food.id === "micro" ? 8 : 4;
  for (let index = 0; index < count; index += 1) {
    const x = 33 + (index % 4) * 10;
    const y = food.id === "micro" ? 37 + Math.floor(index / 4) * 18 : 43 + Math.floor(index / 2) * 13;
    canvas.fillEllipse(x, y, food.id === "micro" ? 4 : 9, food.id === "micro" ? 4 : 9, rgba(index % 2 ? light : color, 255));
  }
  return canvas;
}

function drawCoinAsset(type) {
  const canvas = new Canvas(96, 96);
  const color = type === "common" ? 0xffd24f : type === "rare" ? 0x56d8ff : 0xd87cff;
  const accent = type === "common" ? 0xfff2a8 : type === "rare" ? 0xd7f8ff : 0xffd9ff;
  canvas.fillEllipse(48, 58, 28, 9, rgba(0x061725, 38));
  if (type === "superRare") {
    canvas.fillPolygon([[48, 12], [74, 33], [64, 77], [48, 86], [32, 77], [22, 33]], rgba(color, 255));
    canvas.fillPolygon([[48, 12], [74, 33], [48, 42], [22, 33]], rgba(accent, 180));
    canvas.line(48, 12, 48, 84, 2, rgba(0xffffff, 130));
    canvas.star(48, 50, 11, rgba(0xffffff, 180), 4, 5);
    return canvas;
  }
  if (type === "rare") {
    canvas.fillPolygon([[48, 14], [76, 31], [76, 65], [48, 82], [20, 65], [20, 31]], rgba(color, 255));
    canvas.fillPolygon([[48, 22], [67, 34], [67, 62], [48, 74], [29, 62], [29, 34]], rgba(mixColor(color, 0x061725, 0.14), 120));
    canvas.strokeEllipse(48, 48, 23, 23, 3, rgba(accent, 170));
    return canvas;
  }
  canvas.fillEllipse(48, 48, 34, 34, rgba(color, 255));
  canvas.fillEllipse(48, 42, 28, 18, rgba(accent, 120));
  canvas.strokeEllipse(48, 48, 24, 24, 4, rgba(accent, 225));
  canvas.strokeEllipse(48, 48, 34, 34, 3, rgba(0x9d6a00, 160));
  return canvas;
}

function drawDecorationAsset(decoration) {
  const canvas = new Canvas(160, 160);
  const accent = rarityAccent[decoration.rarity] ?? 0xffe67a;
  canvas.fillEllipse(80, 137, 54, 11, rgba(0x061725, 40));
  switch (decoration.id) {
    case "plant":
      for (const [x, h, color] of [
        [54, 74, 0x3bb35f],
        [75, 96, 0x50d47d],
        [100, 82, 0x2f9a55],
        [88, 68, 0x74e6a7]
      ]) {
        canvas.line(x, 130, x + (80 - x) * 0.34, 130 - h, 10, rgba(color, 235));
        canvas.fillEllipse(x + (80 - x) * 0.34, 130 - h, 14, 27, rgba(color, 210));
      }
      canvas.fillRoundedRect(49, 127, 62, 14, 6, rgba(0x784d28, 255));
      break;
    case "rock":
      canvas.fillEllipse(78, 112, 58, 31, rgba(0x69747c, 255));
      canvas.fillEllipse(55, 100, 28, 21, rgba(0x87929a, 255));
      canvas.fillEllipse(100, 98, 33, 25, rgba(0x7d8991, 255));
      canvas.line(52, 93, 74, 121, 2, rgba(0xffffff, 70));
      break;
    case "castle":
      canvas.fillRect(42, 68, 76, 63, rgba(0x9a8eca, 255));
      canvas.fillRect(26, 53, 28, 78, rgba(0x8074bb, 255));
      canvas.fillRect(106, 53, 28, 78, rgba(0x8074bb, 255));
      canvas.fillPolygon([[26, 53], [40, 26], [54, 53]], rgba(0x5d5387, 255));
      canvas.fillPolygon([[106, 53], [120, 26], [134, 53]], rgba(0x5d5387, 255));
      canvas.fillRoundedRect(69, 94, 22, 37, 10, rgba(0x342d52, 255));
      break;
    case "crystal-arch":
      canvas.fillPolygon([[80, 20], [42, 133], [118, 133]], rgba(0x9ff8ff, 235));
      canvas.fillPolygon([[80, 20], [70, 133], [94, 133]], rgba(0xe0fbff, 210));
      canvas.fillPolygon([[44, 58], [17, 137], [73, 137]], rgba(0xb48cff, 235));
      canvas.fillPolygon([[116, 58], [87, 137], [142, 137]], rgba(0xff9bed, 230));
      break;
    case "driftwood":
      canvas.line(25, 118, 133, 89, 22, rgba(0x8b5a2b, 255));
      canvas.line(57, 109, 42, 75, 11, rgba(0xa56a35, 245));
      canvas.line(89, 99, 112, 66, 10, rgba(0x70421d, 240));
      canvas.strokeEllipse(55, 110, 9, 5, 2, rgba(0x3b2412, 160));
      break;
    case "bubble-stone":
      canvas.fillEllipse(78, 115, 46, 27, rgba(0x73838a, 255));
      canvas.fillEllipse(56, 105, 20, 17, rgba(0x9ca9af, 230));
      for (const [x, y, r] of [[92, 76, 8], [104, 55, 6], [82, 44, 5], [111, 30, 4]]) {
        canvas.strokeEllipse(x, y, r, r, 2, rgba(0xd7f8ff, 145));
      }
      break;
    case "moss-cave":
      canvas.fillEllipse(80, 112, 61, 35, rgba(0x536267, 255));
      canvas.fillRoundedRect(61, 103, 38, 37, 18, rgba(0x13293a, 255));
      for (let index = 0; index < 8; index += 1) {
        canvas.fillEllipse(43 + index * 10, 78 + (index % 2) * 8, 10, 17, rgba(index % 2 ? 0x50d47d : 0x2f9a55, 210));
      }
      break;
    case "coral-fan":
      for (let index = 0; index < 9; index += 1) {
        const angle = -2.7 + index * 0.35;
        canvas.line(80, 132, 80 + Math.cos(angle) * 66, 132 + Math.sin(angle) * 66, 7, rgba(index % 2 ? 0xff8fa3 : 0xffb07c, 230));
      }
      canvas.fillRoundedRect(65, 128, 30, 13, 6, rgba(0x8b5a4b, 255));
      break;
    case "shell-tower":
      for (let index = 0; index < 4; index += 1) {
        canvas.fillEllipse(80, 124 - index * 26, 38 - index * 5, 17, rgba(mixColor(0xc7d3d9, accent, index * 0.09), 245));
        canvas.line(48 + index * 5, 124 - index * 26, 112 - index * 5, 124 - index * 26, 2, rgba(0x5b6b73, 110));
      }
      break;
    case "treasure-chest":
      canvas.fillRoundedRect(35, 81, 90, 50, 8, rgba(0x8b4b2c, 255));
      canvas.fillRoundedRect(35, 63, 90, 39, 15, rgba(0xb86f35, 255));
      canvas.line(35, 96, 125, 96, 4, rgba(0xffd15c, 200));
      canvas.fillRoundedRect(71, 89, 18, 22, 4, rgba(0xffd15c, 255));
      break;
    case "neon-anemone":
      for (let index = 0; index < 14; index += 1) {
        const angle = (Math.PI * 2 * index) / 14;
        canvas.line(80, 127, 80 + Math.cos(angle) * 46, 105 + Math.sin(angle) * 34, 8, rgba(index % 2 ? 0xf39cff : 0x35d6d0, 205));
      }
      canvas.fillEllipse(80, 123, 25, 19, rgba(0xb48cff, 230));
      break;
    case "pearl-statue":
      canvas.fillRoundedRect(54, 72, 52, 63, 13, rgba(0x8fa0d8, 245));
      canvas.fillEllipse(80, 57, 28, 28, rgba(0xf7fbff, 250));
      canvas.fillEllipse(71, 48, 11, 8, rgba(0xffffff, 160));
      canvas.star(80, 57, 13, rgba(accent, 140), 5, 5);
      break;
    default:
      canvas.fillEllipse(80, 112, 48, 30, rgba(accent, 220));
  }
  if (decoration.rarity === "superRare") {
    canvas.star(126, 38, 9, rgba(accent, 170), 4, 5);
    canvas.star(34, 48, 6, rgba(0xffffff, 135), 3, 5);
  }
  return canvas;
}

function drawUiIcon(icon) {
  const canvas = new Canvas(96, 96);
  canvas.fillRoundedRect(14, 14, 68, 68, 18, rgba(0x12384e, 245));
  canvas.strokeEllipse(48, 48, 35, 35, 2.5, rgba(0xbcefff, 145));
  const white = rgba(0xf7fbff, 245);
  const cyan = rgba(0x8be7ff, 210);
  if (icon.id === "shop") {
    canvas.fillRoundedRect(27, 41, 42, 26, 5, cyan);
    canvas.line(31, 41, 36, 30, 5, white);
    canvas.line(65, 41, 60, 30, 5, white);
    canvas.fillEllipse(38, 68, 5, 5, white);
    canvas.fillEllipse(59, 68, 5, 5, white);
  } else if (icon.id === "care") {
    canvas.fillEllipse(39, 39, 14, 14, rgba(0xff8fa3, 240));
    canvas.fillEllipse(57, 39, 14, 14, rgba(0xff8fa3, 240));
    canvas.fillPolygon([[25, 43], [71, 43], [48, 71]], rgba(0xff8fa3, 240));
    canvas.line(48, 34, 48, 58, 5, white);
    canvas.line(36, 46, 60, 46, 5, white);
  } else if (icon.id === "book") {
    canvas.fillRoundedRect(25, 25, 46, 49, 5, cyan);
    canvas.line(48, 27, 48, 73, 3, white);
    canvas.line(33, 38, 43, 38, 3, white);
    canvas.line(53, 38, 63, 38, 3, white);
    canvas.line(33, 51, 43, 51, 3, white);
    canvas.line(53, 51, 63, 51, 3, white);
  } else if (icon.id === "goals") {
    canvas.line(33, 69, 33, 27, 5, white);
    canvas.fillPolygon([[35, 28], [68, 38], [35, 49]], rgba(0xffd15c, 245));
    canvas.fillEllipse(56, 57, 18, 18, cyan);
    canvas.fillEllipse(56, 57, 8, 8, rgba(0x12384e, 255));
  } else {
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      canvas.line(48, 48, 48 + Math.cos(angle) * 28, 48 + Math.sin(angle) * 28, 7, cyan);
    }
    canvas.fillEllipse(48, 48, 22, 22, white);
    canvas.fillEllipse(48, 48, 10, 10, rgba(0x12384e, 255));
  }
  return canvas;
}

function drawHelperAsset(helper) {
  const canvas = new Canvas(160, 110);
  canvas.fillEllipse(78, 91, 52, 8, rgba(0x061725, 36));
  if (helper.id === "feeder-snail") {
    canvas.fillEllipse(78, 66, 54, 24, rgba(0x6fd39b, 250));
    canvas.fillEllipse(61, 55, 25, 25, rgba(0xf2c46d, 255));
    canvas.strokeEllipse(61, 55, 18, 18, 3, rgba(0x9c6a2e, 160));
    canvas.fillEllipse(112, 61, 24, 16, rgba(0xb6f7cf, 255));
    canvas.line(120, 50, 132, 30, 2, rgba(0xd8ffe7, 230));
    canvas.line(126, 51, 143, 36, 2, rgba(0xd8ffe7, 230));
    canvas.fillEllipse(133, 30, 4, 4, rgba(0x1d1f2a, 255));
    canvas.fillEllipse(144, 36, 4, 4, rgba(0x1d1f2a, 255));
    canvas.fillEllipse(108, 86, 8, 8, rgba(0xffd15c, 255));
  } else if (helper.id === "crab") {
    canvas.fillEllipse(80, 61, 42, 27, rgba(0xe2574c, 255));
    canvas.fillEllipse(39, 48, 13, 13, rgba(0xe2574c, 255));
    canvas.fillEllipse(121, 48, 13, 13, rgba(0xe2574c, 255));
    for (const x of [49, 65, 95, 111]) {
      canvas.line(x, 78, x + (x < 80 ? -13 : 13), 94, 4, rgba(0xffa08f, 235));
    }
    canvas.fillEllipse(70, 51, 4, 4, rgba(0x1d1f2a, 255));
    canvas.fillEllipse(90, 51, 4, 4, rgba(0x1d1f2a, 255));
  } else if (helper.id === "shell") {
    canvas.fillEllipse(77, 61, 50, 30, rgba(0xc7d3d9, 255));
    canvas.fillEllipse(58, 54, 18, 12, rgba(0x8fa0a8, 255));
    canvas.line(77, 32, 77, 87, 3, rgba(0x5b6b73, 150));
    canvas.line(43, 47, 107, 77, 3, rgba(0x5b6b73, 120));
    canvas.line(107, 47, 43, 77, 3, rgba(0x5b6b73, 120));
    canvas.fillEllipse(116, 55, 4, 4, rgba(0x31444d, 255));
  } else {
    canvas.fillEllipse(75, 56, 55, 22, rgba(0xff8f73, 255));
    canvas.fillPolygon([[31, 56], [9, 38], [9, 75]], rgba(0xff8f73, 245));
    canvas.line(95, 51, 131, 32, 4, rgba(0xffd0c4, 230));
    canvas.line(95, 63, 132, 82, 4, rgba(0xffd0c4, 230));
    for (const x of [52, 69, 86]) {
      canvas.line(x, 76, x - 7, 100, 3, rgba(0x6b2735, 150));
    }
    canvas.fillEllipse(114, 51, 4, 4, rgba(0x1d1f2a, 255));
  }
  return canvas;
}

async function writeManifest(folder, manifest) {
  await mkdir(path.join(outRoot, folder), { recursive: true });
  await writeFile(path.join(outRoot, folder, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function createContactSheet(items, draw, fileName, cellWidth, cellHeight, columns) {
  const rows = Math.ceil(items.length / columns);
  const sheet = new Canvas(columns * cellWidth, rows * cellHeight);
  items.forEach((item, index) => {
    const asset = draw(item);
    const x = (index % columns) * cellWidth + Math.round((cellWidth - asset.width) / 2);
    const y = Math.floor(index / columns) * cellHeight + Math.round((cellHeight - asset.height) / 2);
    drawInto(sheet, asset, x, y);
  });
  await mkdir(artifactRoot, { recursive: true });
  await writeFile(path.join(artifactRoot, fileName), sheet.toPngBuffer());
}

function drawInto(target, source, x, y) {
  const downsampled = downsample(source);
  for (let yy = 0; yy < source.height; yy += 1) {
    for (let xx = 0; xx < source.width; xx += 1) {
      const index = (yy * source.width + xx) * 4;
      const color = [downsampled[index], downsampled[index + 1], downsampled[index + 2], downsampled[index + 3]];
      for (let sy = 0; sy < target.scale; sy += 1) {
        for (let sx = 0; sx < target.scale; sx += 1) {
          target.blendRaw((x + xx) * target.scale + sx, (y + yy) * target.scale + sy, color);
        }
      }
    }
  }
}

function downsample(canvas) {
  const out = Buffer.alloc(canvas.width * canvas.height * 4);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      for (let sy = 0; sy < canvas.scale; sy += 1) {
        for (let sx = 0; sx < canvas.scale; sx += 1) {
          const source = ((y * canvas.scale + sy) * canvas.rawWidth + x * canvas.scale + sx) * 4;
          red += canvas.data[source];
          green += canvas.data[source + 1];
          blue += canvas.data[source + 2];
          alpha += canvas.data[source + 3];
        }
      }
      const target = (y * canvas.width + x) * 4;
      const samples = canvas.scale * canvas.scale;
      out[target] = Math.round(red / samples);
      out[target + 1] = Math.round(green / samples);
      out[target + 2] = Math.round(blue / samples);
      out[target + 3] = Math.round(alpha / samples);
    }
  }
  return out;
}

async function main() {
  const [fishTypes, foodTypes, decorationTypes, helperTypes] = await Promise.all([
    readJson("src/data/fish-types.json"),
    readJson("src/data/food-types.json"),
    readJson("src/data/decoration-types.json"),
    readJson("src/data/helper-creature-types.json")
  ]);

  const fishManifest = [];
  for (const fish of fishTypes) {
    await writeAsset(
      `fish/${fish.id}.png`,
      drawFishAsset(fish),
      fishManifest,
      `Stylized side-view ${fish.name} fish sprite, straight tail in ${hexColor(fishFoodTintFor(fish))}, ${fish.rarity} rarity visual detail, transparent PNG.`
    );
  }
  await writeManifest("fish", fishManifest);

  const foodManifest = [];
  for (const food of foodTypes) {
    await writeAsset(
      `food/${food.id}.png`,
      drawFoodAsset(food),
      foodManifest,
      `Compact mobile aquarium ${food.name} item icon, density ${food.densityLevel}, transparent PNG.`
    );
  }
  await writeManifest("food", foodManifest);

  const coinManifest = [];
  for (const coinType of Object.keys(coinFiles)) {
    await writeAsset(
      `coins/${coinFiles[coinType]}`,
      drawCoinAsset(coinType),
      coinManifest,
      `Distinct ${coinType} aquarium currency coin icon, transparent PNG.`
    );
  }
  await writeManifest("coins", coinManifest);

  const decorationManifest = [];
  for (const decoration of decorationTypes) {
    await writeAsset(
      `decorations/${decoration.id}.png`,
      drawDecorationAsset(decoration),
      decorationManifest,
      `Bottom-safe aquarium decoration asset for ${decoration.name}, ${decoration.rarity} rarity, transparent PNG.`
    );
  }
  await writeManifest("decorations", decorationManifest);

  const uiManifest = [];
  for (const icon of uiIcons) {
    await writeAsset(
      `ui/${icon.id}.png`,
      drawUiIcon(icon),
      uiManifest,
      `Compact portrait mobile aquarium menu icon for ${icon.name}, transparent PNG with no text.`
    );
  }
  await writeManifest("ui", uiManifest);

  const helperManifest = [];
  for (const helper of helperTypes) {
    await writeAsset(
      `helpers/${helper.id}.png`,
      drawHelperAsset(helper),
      helperManifest,
      `Small aquarium helper creature sprite for ${helper.name}, transparent PNG.`
    );
  }
  await writeManifest("helpers", helperManifest);

  await createContactSheet(fishTypes, drawFishAsset, "generated-fish-assets-sheet.png", 256, 160, 5);
  await createContactSheet([...foodTypes, ...Object.keys(coinFiles), ...decorationTypes, ...uiIcons, ...helperTypes], (item) => {
    if (typeof item === "string") {
      return drawCoinAsset(item);
    }
    if ("nutrition" in item) {
      return drawFoodAsset(item);
    }
    if (uiIcons.some((icon) => icon.id === item.id)) {
      return drawUiIcon(item);
    }
    if ("cleanupSeconds" in item) {
      return drawHelperAsset(item);
    }
    return drawDecorationAsset(item);
  }, "generated-item-assets-sheet.png", 176, 176, 5);

  console.log(`Generated ${fishTypes.length} fish, ${foodTypes.length} food, 3 coins, ${decorationTypes.length} decorations, ${uiIcons.length} ui icons, ${helperTypes.length} helpers.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
