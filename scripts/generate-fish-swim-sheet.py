#!/usr/bin/env python3
from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image


def alpha_bounds(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        return (0, 0, image.width, image.height)
    return bounds


def bilinear_sample(source: Image.Image, x: float, y: float) -> tuple[int, int, int, int]:
    width, height = source.size
    if x < 0 or x >= width - 1 or y < 0 or y >= height - 1:
        return (0, 0, 0, 0)

    x0 = int(math.floor(x))
    y0 = int(math.floor(y))
    x1 = min(width - 1, x0 + 1)
    y1 = min(height - 1, y0 + 1)
    tx = x - x0
    ty = y - y0
    px = source.load()
    c00 = px[x0, y0]
    c10 = px[x1, y0]
    c01 = px[x0, y1]
    c11 = px[x1, y1]

    channels = []
    for channel in range(4):
      top = c00[channel] * (1 - tx) + c10[channel] * tx
      bottom = c01[channel] * (1 - tx) + c11[channel] * tx
      channels.append(int(round(top * (1 - ty) + bottom * ty)))

    return tuple(channels)  # type: ignore[return-value]


def tail_progress_for_x(x: float, left: int, right: int, fish_width: int, tail_side: str) -> float:
    if tail_side == "left":
        progress = (right - x) / fish_width
    else:
        progress = (x - left) / fish_width
    return max(0.0, min(1.0, progress))


def offset_for_progress(progress: float, phase: float, amplitude: float, tail_side: str) -> tuple[float, float]:
    bend_weight = progress**1.9
    wave_offset = math.sin(phase + progress * math.pi * 0.72)
    tail_direction = -1 if tail_side == "left" else 1
    x_offset = amplitude * bend_weight * wave_offset * tail_direction
    y_offset = amplitude * 0.18 * bend_weight * math.sin(phase + progress * math.pi * 1.35)
    return (x_offset, y_offset)


def render_frame(source: Image.Image, frame_index: int, frame_count: int, amplitude: float, tail_side: str) -> Image.Image:
    width, height = source.size
    left, top, right, bottom = alpha_bounds(source)
    fish_width = max(1, right - left)
    phase = (math.tau * frame_index) / frame_count
    frame = Image.new("RGBA", source.size, (0, 0, 0, 0))
    frame_pixels = frame.load()

    for x in range(width):
        tail_progress = tail_progress_for_x(x, left, right, fish_width, tail_side)
        x_offset, y_offset = offset_for_progress(tail_progress, phase, amplitude, tail_side)
        for y in range(height):
            frame_pixels[x, y] = bilinear_sample(source, x - x_offset, y - y_offset)

    return frame


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a subtle wavy swim spritesheet from one transparent fish PNG.")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--frames", type=int, default=6)
    parser.add_argument("--amplitude", type=float, default=4.0)
    parser.add_argument("--tail-side", choices=["left", "right"], default="left")
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    frames = [
        render_frame(source, index, args.frames, args.amplitude, args.tail_side)
        for index in range(args.frames)
    ]

    sheet = Image.new("RGBA", (source.width * args.frames, source.height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * source.width, 0))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)


if __name__ == "__main__":
    main()
