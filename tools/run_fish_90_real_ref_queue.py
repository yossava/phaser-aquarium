#!/usr/bin/env python3
"""Generate the 90 real-reference fish batch one fish at a time."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "fish-90-real-reference-prompts.md"
OUT = ROOT / "assets" / "generated" / "fish-90-real-ref"
JOBS_DIR = ROOT / ".codex_asset_jobs"

RARITY_BY_HEADING = {
    "Common Fish Prompts": "common",
    "Rare Fish Prompts": "rare",
    "Super Rare Fish Prompts": "super_rare",
}

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


@dataclass(frozen=True)
class Fish:
    rarity: str
    fish_id: str
    species: str
    addon: str


def run(cmd: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    print("$", " ".join(cmd), flush=True)
    return subprocess.run(cmd, cwd=ROOT, check=check, text=True, capture_output=True)


def parse_doc() -> tuple[str, list[Fish]]:
    text = DOC.read_text(encoding="utf-8")
    shared_match = re.search(r"## Shared Prompt Block.*?\n> (.*?)\n\n## QA Pass Criteria", text, re.S)
    if not shared_match:
        raise RuntimeError("Could not find shared prompt block")
    shared = " ".join(line.removeprefix("> ").strip() for line in shared_match.group(1).splitlines()).strip()

    fish: list[Fish] = []
    current_rarity: str | None = None
    row_re = re.compile(r"^\| `([^`]+)` \| ([^|]+) \| (.+) \|$")
    for line in text.splitlines():
        heading = line.strip().removeprefix("## ").strip()
        if heading in RARITY_BY_HEADING:
            current_rarity = RARITY_BY_HEADING[heading]
            continue
        match = row_re.match(line.strip())
        if match and current_rarity:
            fish.append(
                Fish(
                    rarity=current_rarity,
                    fish_id=match.group(1).strip(),
                    species=match.group(2).strip(),
                    addon=match.group(3).strip(),
                )
            )
    if len(fish) != 90:
        raise RuntimeError(f"Expected 90 fish prompts, parsed {len(fish)}")
    return shared, fish


def read_png_header(path: Path) -> dict[str, int]:
    data = path.read_bytes()
    if not data.startswith(PNG_SIGNATURE):
        raise ValueError("not a PNG")
    width = int.from_bytes(data[16:20], "big")
    height = int.from_bytes(data[20:24], "big")
    bit_depth = data[24]
    color_type = data[25]
    return {"width": width, "height": height, "bit_depth": bit_depth, "color_type": color_type}


def png_stats(path: Path) -> dict[str, object]:
    # Reuse the project key-out helper internals for dependency-free PNG decoding.
    sys.path.insert(0, str(ROOT / "tools"))
    import key_out_magenta  # type: ignore

    header, raw = key_out_magenta.read_chunks(path.read_bytes())
    channels = 4 if header["color_type"] == 6 else 3
    pixels = key_out_magenta.unfilter_scanlines(raw, header["width"], header["height"], channels)
    width = header["width"]
    height = header["height"]
    total = width * height
    visible_magenta = 0
    alpha_zero = 0
    alpha_nonzero = 0
    min_x = width
    min_y = height
    max_x = -1
    max_y = -1
    for i in range(total):
        source = i * channels
        red = pixels[source]
        green = pixels[source + 1]
        blue = pixels[source + 2]
        alpha = pixels[source + 3] if channels == 4 else 255
        if alpha <= 8:
            alpha_zero += 1
        else:
            alpha_nonzero += 1
            if abs(red - 255) <= 4 and green <= 4 and abs(blue - 255) <= 4:
                visible_magenta += 1
            x = i % width
            y = i // width
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    bbox = None if max_x < 0 else [min_x, min_y, max_x, max_y]
    bbox_width = 0 if bbox is None else max_x - min_x + 1
    return {
        "width": width,
        "height": height,
        "color_type": header["color_type"],
        "visible_magenta_ratio": visible_magenta / total,
        "alpha_zero_ratio": alpha_zero / total,
        "alpha_nonzero_ratio": alpha_nonzero / total,
        "opaque_bbox": bbox,
        "opaque_bbox_width": bbox_width,
    }


def status(job_id: str) -> str:
    result = run(["python3", "tools/codex_image_job.py", "status", job_id], check=False)
    if result.returncode != 0:
        return "unknown"
    try:
        return json.loads(result.stdout).get("state", "unknown")
    except json.JSONDecodeError:
        return "unknown"


def wait_for_job(job_id: str) -> str:
    while True:
        state = status(job_id)
        print(f"{job_id}: {state}", flush=True)
        if state in {"completed", "failed", "exited", "stopped", "unknown"}:
            return state
        time.sleep(20)


def find_generated_png(source_dir: Path, expected: Path, before: set[Path]) -> Path | None:
    if expected.exists():
        return expected
    after = set(source_dir.glob("*.png"))
    new_files = sorted(after - before, key=lambda path: path.stat().st_mtime, reverse=True)
    return new_files[0] if new_files else None


def qa_files(source: Path, final: Path) -> tuple[bool, list[str], dict[str, object], dict[str, object]]:
    reasons: list[str] = []
    try:
        source_stats = png_stats(source)
    except Exception as exc:
        return False, [f"source PNG decode failed: {exc}"], {}, {}
    try:
        final_stats = png_stats(final)
    except Exception as exc:
        return False, [f"final PNG decode failed: {exc}"], source_stats, {}

    if source_stats["width"] != 1024 or source_stats["height"] != 768:
        reasons.append(f"source dimensions are {source_stats['width']}x{source_stats['height']}, expected 1024x768")
    if final_stats["width"] != 1024 or final_stats["height"] != 768:
        reasons.append(f"final dimensions are {final_stats['width']}x{final_stats['height']}, expected 1024x768")
    if float(source_stats["visible_magenta_ratio"]) < 0.35:
        reasons.append("source does not appear to have a dominant flat magenta key background")
    if int(final_stats["color_type"]) != 6:
        reasons.append("final PNG is not RGBA")
    if float(final_stats["alpha_zero_ratio"]) < 0.25:
        reasons.append("final PNG does not contain enough transparent background")
    if float(final_stats["visible_magenta_ratio"]) > 0.01:
        reasons.append("final PNG still contains visible magenta pixels")
    bbox_width = int(final_stats["opaque_bbox_width"])
    if bbox_width < 220:
        reasons.append("fish opaque bounding box is too small to remain readable at 64 px wide")
    if bbox_width > 980:
        reasons.append("fish is cropped or has too little horizontal padding")

    return not reasons, reasons, source_stats, final_stats


def write_manifest(records: list[dict[str, object]], failure_note: str | None = None) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "batch": "fish-90-real-ref",
        "count": len(records),
        "source_document": str(DOC.relative_to(ROOT)),
        "failure_note": failure_note,
        "assets": records,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def append_progress(line: str) -> None:
    progress = OUT / "progress.md"
    if not progress.exists():
        progress.write_text("# Fish 90 Real Reference Progress\n\n", encoding="utf-8")
    with progress.open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")


def main() -> int:
    shared, fish_list = parse_doc()
    for subdir in ("source", "final", "qa"):
        for rarity in ("common", "rare", "super_rare"):
            (OUT / subdir / rarity).mkdir(parents=True, exist_ok=True)
    if not (OUT / "progress.md").exists():
        (OUT / "progress.md").write_text("# Fish 90 Real Reference Progress\n\n", encoding="utf-8")

    records: list[dict[str, object]] = []
    for index, fish in enumerate(fish_list, start=1):
        source_dir = OUT / "source" / fish.rarity
        final_dir = OUT / "final" / fish.rarity
        qa_dir = OUT / "qa" / fish.rarity
        source = source_dir / f"{fish.fish_id}_source_keyed.png"
        final = final_dir / f"{fish.fish_id}.png"
        qa_path = qa_dir / f"{fish.fish_id}.json"

        if final.exists() and source.exists() and qa_path.exists():
            try:
                qa = json.loads(qa_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                qa = {}
            if qa.get("status") != "pass":
                ok, reasons, source_stats, final_stats = qa_files(source, final)
                qa["status"] = "pass" if ok else "fail"
                qa["pass_fail_reasons"] = [] if ok else reasons
                qa["retry_reason"] = "" if ok else "; ".join(reasons)
                qa["rechecked_with_visible_alpha_magenta_qa"] = True
                if qa.get("attempts"):
                    qa["attempts"][-1]["recheck_pass"] = ok
                    qa["attempts"][-1]["recheck_reasons"] = reasons
                    qa["attempts"][-1]["recheck_source_stats"] = source_stats
                    qa["attempts"][-1]["recheck_final_stats"] = final_stats
                qa_path.write_text(json.dumps(qa, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            records.append(
                {
                    "id": fish.fish_id,
                    "rarity": fish.rarity,
                    "species_reference": fish.species,
                    "source": str(source.relative_to(ROOT)),
                    "final": str(final.relative_to(ROOT)),
                    "qa": str(qa_path.relative_to(ROOT)),
                    "dimensions": [1024, 768],
                    "transparency_background_notes": "source uses flat #ff00ff chroma key; final is RGBA transparent",
                    "intended_in_game_use": "collectible aquarium fish sprite source asset",
                    "status": qa.get("status", "existing"),
                }
            )
            write_manifest(records)
            print(f"[{index}/90] skip existing {fish.fish_id}", flush=True)
            continue

        attempts: list[dict[str, object]] = []
        passed = False
        retry_reason = ""
        for attempt in range(1, 4):
            before = set(source_dir.glob("*.png"))
            prompt = (
                f"{shared}\n\n"
                f"Rarity: {fish.rarity.replace('_', ' ')}.\n"
                f"Fish ID: {fish.fish_id}.\n"
                f"Species reference: {fish.species}.\n"
                f"Prompt add-on: {fish.addon}\n\n"
                f"Create exactly one 1024x768 PNG image file named {source.name} in the output directory. "
                "Do not create a contact sheet, preview grid, HTML file, SVG file, WebP file, JPEG file, or multiple variations. "
                "The entire background must be uniform flat #ff00ff so it can be keyed out."
            )
            print(f"[{index}/90] generating {fish.fish_id}, attempt {attempt}", flush=True)
            started = run(
                [
                    "python3",
                    "tools/codex_image_job.py",
                    "run",
                    "--name",
                    f"fish90-{fish.fish_id}-a{attempt}",
                    "--output-dir",
                    str(source_dir),
                    prompt,
                ]
            )
            job_id = json.loads(started.stdout)["job_id"]
            state = wait_for_job(job_id)
            attempt_note: dict[str, object] = {"attempt": attempt, "job_id": job_id, "job_state": state}
            if state != "completed":
                retry_reason = f"image generation job ended with state {state}"
                attempt_note["pass"] = False
                attempt_note["reasons"] = [retry_reason]
                attempts.append(attempt_note)
                continue

            generated = find_generated_png(source_dir, source, before)
            if not generated:
                retry_reason = "image generation completed but no PNG file was produced"
                attempt_note["pass"] = False
                attempt_note["reasons"] = [retry_reason]
                attempts.append(attempt_note)
                continue
            if generated != source:
                shutil.copy2(generated, source)

            run(["python3", "tools/key_out_magenta.py", str(source), str(final)])
            ok, reasons, source_stats, final_stats = qa_files(source, final)
            attempt_note.update(
                {
                    "pass": ok,
                    "reasons": reasons,
                    "source_stats": source_stats,
                    "final_stats": final_stats,
                }
            )
            attempts.append(attempt_note)
            if ok:
                passed = True
                retry_reason = ""
                break
            retry_reason = "; ".join(reasons)

        qa_doc = {
            "id": fish.fish_id,
            "rarity": fish.rarity,
            "species_reference": fish.species,
            "status": "pass" if passed else "fail",
            "attempts": attempts,
            "pass_fail_reasons": [] if passed else [retry_reason],
            "anatomy_notes": f"Prompt anchored to real {fish.species} anatomy and silhouette; automated QA cannot fully verify species anatomy.",
            "style_notes": "Polished 2D collectible aquarium game sprite requested; automated QA checked PNG dimensions, chroma key, alpha, magenta removal, and approximate 64 px readability.",
            "files": {
                "source": str(source.relative_to(ROOT)) if source.exists() else None,
                "final": str(final.relative_to(ROOT)) if final.exists() else None,
            },
            "retry_reason": retry_reason,
        }
        qa_path.write_text(json.dumps(qa_doc, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        append_progress(f"- [{index}/90] {fish.rarity}/{fish.fish_id}: {qa_doc['status']} after {len(attempts)} attempt(s)")

        records.append(
            {
                "id": fish.fish_id,
                "rarity": fish.rarity,
                "species_reference": fish.species,
                "source": str(source.relative_to(ROOT)) if source.exists() else None,
                "final": str(final.relative_to(ROOT)) if final.exists() else None,
                "qa": str(qa_path.relative_to(ROOT)),
                "dimensions": [1024, 768],
                "transparency_background_notes": "source uses flat #ff00ff chroma key; final is RGBA transparent",
                "intended_in_game_use": "collectible aquarium fish sprite source asset",
                "status": qa_doc["status"],
            }
        )
        write_manifest(records)
        if not passed:
            print(f"{fish.fish_id} failed after retries; continuing to next fish per exhausted retry rule.", flush=True)

    write_manifest(records)
    print(f"Processed {len(records)} fish.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
