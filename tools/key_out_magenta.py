#!/usr/bin/env python3
"""Convert a flat chroma-key PNG background to alpha.

This helper intentionally has no third-party dependencies. It supports the
non-interlaced 8-bit RGB/RGBA PNGs produced by the asset generation workflow.
"""

from __future__ import annotations

import argparse
import binascii
import math
import struct
import zlib
from pathlib import Path


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def parse_hex_color(value: str) -> tuple[int, int, int]:
    cleaned = value.strip().lstrip("#")
    if len(cleaned) != 6:
        raise argparse.ArgumentTypeError("key color must be a 6-digit hex color")
    return tuple(int(cleaned[index : index + 2], 16) for index in (0, 2, 4))


def read_chunks(data: bytes) -> tuple[dict[str, int], bytes]:
    if not data.startswith(PNG_SIGNATURE):
        raise ValueError("source is not a PNG file")

    offset = len(PNG_SIGNATURE)
    header: dict[str, int] = {}
    idat_parts: list[bytes] = []

    while offset < len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        chunk_type = data[offset + 4 : offset + 8]
        chunk_data = data[offset + 8 : offset + 8 + length]
        offset += 12 + length

        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(
                ">IIBBBBB", chunk_data
            )
            header = {
                "width": width,
                "height": height,
                "bit_depth": bit_depth,
                "color_type": color_type,
                "compression": compression,
                "filter_method": filter_method,
                "interlace": interlace,
            }
        elif chunk_type == b"IDAT":
            idat_parts.append(chunk_data)
        elif chunk_type == b"IEND":
            break

    if not header or not idat_parts:
        raise ValueError("PNG is missing IHDR or IDAT data")
    if header["bit_depth"] != 8 or header["color_type"] not in (2, 6) or header["interlace"] != 0:
        raise ValueError("only non-interlaced 8-bit RGB/RGBA PNGs are supported")

    return header, zlib.decompress(b"".join(idat_parts))


def paeth(left: int, above: int, upper_left: int) -> int:
    estimate = left + above - upper_left
    left_distance = abs(estimate - left)
    above_distance = abs(estimate - above)
    upper_left_distance = abs(estimate - upper_left)
    if left_distance <= above_distance and left_distance <= upper_left_distance:
        return left
    if above_distance <= upper_left_distance:
        return above
    return upper_left


def unfilter_scanlines(raw: bytes, width: int, height: int, channels: int) -> bytearray:
    stride = width * channels
    result = bytearray(height * stride)
    source_offset = 0

    for y in range(height):
        filter_type = raw[source_offset]
        source_offset += 1
        row = bytearray(raw[source_offset : source_offset + stride])
        source_offset += stride
        prior_start = (y - 1) * stride
        current_start = y * stride

        for x in range(stride):
            left = row[x - channels] if x >= channels else 0
            above = result[prior_start + x] if y > 0 else 0
            upper_left = result[prior_start + x - channels] if y > 0 and x >= channels else 0

            if filter_type == 1:
                row[x] = (row[x] + left) & 0xFF
            elif filter_type == 2:
                row[x] = (row[x] + above) & 0xFF
            elif filter_type == 3:
                row[x] = (row[x] + ((left + above) // 2)) & 0xFF
            elif filter_type == 4:
                row[x] = (row[x] + paeth(left, above, upper_left)) & 0xFF
            elif filter_type != 0:
                raise ValueError(f"unsupported PNG filter type {filter_type}")

        result[current_start : current_start + stride] = row

    return result


def color_distance(red: int, green: int, blue: int, key: tuple[int, int, int]) -> float:
    return math.sqrt((red - key[0]) ** 2 + (green - key[1]) ** 2 + (blue - key[2]) ** 2)


def key_rgba(
    pixels: bytearray,
    width: int,
    height: int,
    channels: int,
    key: tuple[int, int, int],
    tolerance: float,
    feather: float,
) -> bytearray:
    rgba = bytearray(width * height * 4)
    feather_end = tolerance + max(0.0, feather)

    for pixel_index in range(width * height):
        source = pixel_index * channels
        target = pixel_index * 4
        red = pixels[source]
        green = pixels[source + 1]
        blue = pixels[source + 2]
        source_alpha = pixels[source + 3] if channels == 4 else 255
        distance = color_distance(red, green, blue, key)

        if distance <= tolerance:
            alpha = 0
        elif feather > 0 and distance < feather_end:
            alpha = int(source_alpha * ((distance - tolerance) / feather))
        else:
            alpha = source_alpha

        rgba[target : target + 4] = bytes((red, green, blue, max(0, min(255, alpha))))

    return rgba


def make_chunk(chunk_type: bytes, payload: bytes) -> bytes:
    crc = binascii.crc32(chunk_type)
    crc = binascii.crc32(payload, crc) & 0xFFFFFFFF
    return struct.pack(">I", len(payload)) + chunk_type + payload + struct.pack(">I", crc)


def write_rgba_png(path: Path, width: int, height: int, pixels: bytearray) -> None:
    scanlines = bytearray()
    stride = width * 4
    for y in range(height):
        scanlines.append(0)
        start = y * stride
        scanlines.extend(pixels[start : start + stride])

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    output = bytearray(PNG_SIGNATURE)
    output.extend(make_chunk(b"IHDR", ihdr))
    output.extend(make_chunk(b"IDAT", zlib.compress(bytes(scanlines), level=9)))
    output.extend(make_chunk(b"IEND", b""))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(output)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--key", type=parse_hex_color, default=parse_hex_color("#ff00ff"))
    parser.add_argument("--tolerance", type=float, default=18.0)
    parser.add_argument("--feather", type=float, default=42.0)
    args = parser.parse_args()

    header, raw = read_chunks(args.source.read_bytes())
    channels = 4 if header["color_type"] == 6 else 3
    pixels = unfilter_scanlines(raw, header["width"], header["height"], channels)
    keyed = key_rgba(pixels, header["width"], header["height"], channels, args.key, args.tolerance, args.feather)
    write_rgba_png(args.output, header["width"], header["height"], keyed)


if __name__ == "__main__":
    main()
