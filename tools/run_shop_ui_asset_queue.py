#!/usr/bin/env python3
"""Generate shop UI assets one Codex image job at a time.

This intentionally runs one prompt per asset. Source images are kept on a
flat magenta key background, then converted to transparent runtime PNGs.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "generated" / "source" / "shop-ui"
RUNTIME_DIR = ROOT / "public" / "assets" / "ui" / "shop"
JOBS_DIR = ROOT / ".codex_asset_jobs"

GLOBAL_STYLE = """Aquarium mobile game shop UI. Polished premium casual mobile game UI, underwater aquarium theme, glossy rounded panels, beveled edges, soft neon glow, dark navy and deep ocean blue base colors, subtle underwater light rays, bubbles, coral and seaweed accents, clean readable UI, production-ready asset. High-quality 2D game UI asset, crisp edges, soft gradients, subtle inner highlights, soft shadows, no rough sketch, no wireframe. Create exactly one centered isolated asset with generous padding. Use a solid flat magenta #FF00FF background for chroma key removal; the magenta must be uniform, untextured, unlit, and absent from the asset itself. No mockup screen, no device frame, no watermark. Only include text when the asset prompt explicitly asks for it."""

ASSETS = [
	("shop_header_bar", "Create a reusable header bar for an aquarium mobile game shop. Wide rounded rectangle panel, deep ocean navy-blue gradient, glossy beveled border, subtle underwater light rays from the top, small bubbles, faint fish silhouettes, premium casual mobile-game UI. Include a small cute blue shop icon with striped awning, coral and seaweed on the left. Include large readable title text: STORE. Single isolated UI asset only."),
	("shop_header_bar_no_text", "Create a reusable header bar placeholder for an aquarium mobile game shop. Wide rounded rectangle panel, deep ocean navy-blue gradient, glossy beveled border, subtle underwater light rays, small bubbles, faint coral/seaweed accents, empty space for title text. No words, no numbers, no icons except subtle underwater decoration. Single isolated UI asset only."),
	("store_icon", "Create a cute aquarium shop icon for a mobile game UI. Small blue storefront with striped blue awning, rounded door, small window, coral and seaweed at the base, tiny bubbles, glossy polished 2D game icon style, soft highlights and shadows. No text. Single isolated icon only."),
	("coin_currency_pill", "Create a reusable currency counter pill for an aquarium mobile game UI. Rounded dark navy pill with glossy bevel, gold coin icon on the left, placeholder number text 125,430 in white, small rounded plus button on the right. Premium casual game UI, underwater blue glow, crisp readable design. Single isolated UI asset only."),
	("gem_currency_pill", "Create a reusable currency counter pill for an aquarium mobile game UI. Rounded dark navy pill with glossy bevel, bright blue diamond gem icon on the left, placeholder number text 845 in white, small rounded plus button on the right. Premium casual game UI, underwater blue glow, crisp readable design. Single isolated UI asset only."),
	("plus_button", "Create a small reusable plus button for a mobile game UI. Rounded square button, dark navy-blue glossy surface, bright cyan-blue rim light, subtle bevel, white plus symbol in the center, soft drop shadow. Single isolated button only."),
	("tab_active_fish", "Create an active category tab button for an aquarium mobile game shop UI. Rounded rectangle tab, bright glowing cyan-blue gradient, beveled border, small downward triangle pointer at bottom center, white fish icon on the left, text Fish in bold white. Glossy premium casual game style. Single isolated UI asset only."),
	("tab_inactive_fish", "Create an inactive category tab button for an aquarium mobile game shop UI. Rounded rectangle tab, dark navy-blue gradient, subtle beveled border, muted blue fish icon on the left, text Fish in muted light blue-gray. No active glow, no pointer. Glossy premium casual game style. Single isolated UI asset only."),
	("tab_active_food", "Create an active category tab button for an aquarium mobile game shop UI. Rounded rectangle tab, bright glowing cyan-blue gradient, beveled border, small downward triangle pointer at bottom center, small fish-food jar icon on the left, text Food in bold white. Glossy premium casual game style. Single isolated UI asset only."),
	("tab_inactive_food", "Create an inactive category tab button for an aquarium mobile game shop UI. Rounded rectangle tab, dark navy-blue gradient, subtle beveled border, muted fish-food jar icon on the left, text Food in muted light blue-gray. No active glow, no pointer. Glossy premium casual game style. Single isolated UI asset only."),
	("tab_active_tanks", "Create an active category tab button for an aquarium mobile game shop UI. Rounded rectangle tab, bright glowing cyan-blue gradient, beveled border, small downward triangle pointer at bottom center, small aquarium tank icon on the left, text Tanks in bold white. Glossy premium casual game style. Single isolated UI asset only."),
	("tab_inactive_tanks", "Create an inactive category tab button for an aquarium mobile game shop UI. Rounded rectangle tab, dark navy-blue gradient, subtle beveled border, muted aquarium tank icon on the left, text Tanks in muted light blue-gray. No active glow, no pointer. Glossy premium casual game style. Single isolated UI asset only."),
	("tab_active_help", "Create an active category tab button for an aquarium mobile game shop UI. Rounded rectangle tab, bright glowing cyan-blue gradient, beveled border, small downward triangle pointer at bottom center, question mark circle icon on the left, text Help in bold white. Glossy premium casual game style. Single isolated UI asset only."),
	("tab_inactive_help", "Create an inactive category tab button for an aquarium mobile game shop UI. Rounded rectangle tab, dark navy-blue gradient, subtle beveled border, muted question mark circle icon on the left, text Help in muted light blue-gray. No active glow, no pointer. Glossy premium casual game style. Single isolated UI asset only."),
	("rarity_common_filter", "Create a reusable rarity filter button for an aquarium mobile game shop UI. Wide rounded pill button, dark navy base with gold/yellow glowing border, one gold star icon on the left, bold text COMMON in gold. Glossy beveled mobile game UI style, premium underwater theme. Single isolated button only."),
	("rarity_rare_filter", "Create a reusable rarity filter button for an aquarium mobile game shop UI. Wide rounded pill button, dark navy base with bright blue glowing border, two blue star icons on the left, bold text RARE in bright blue. Glossy beveled mobile game UI style, premium underwater theme. Single isolated button only."),
	("rarity_super_rare_filter", "Create a reusable rarity filter button for an aquarium mobile game shop UI. Wide rounded pill button, dark navy base with purple glowing border, three purple star icons on the left, bold text SUPER RARE in bright purple. Glossy beveled mobile game UI style, premium underwater theme. Single isolated button only."),
	("fish_card_common_empty", "Create a reusable common fish shop item card template for an aquarium mobile game UI. Horizontal rounded rectangle card, dark navy-blue glossy panel, subtle gold/yellow common accent, small one-star badge area at top-left, circular fish thumbnail placeholder on the left with underwater mini-scene, text placeholder areas on the right for fish name, owned count, drop note, price area, and buy button area. Include placeholder text: Fish Name, Owned: 0, Drops Common + Rare bonus, 120, BUY. Premium casual-game UI style. Single isolated card only."),
	("fish_card_rare_empty", "Create a reusable rare fish shop item card template for an aquarium mobile game UI. Horizontal rounded rectangle card, dark navy-blue glossy panel, bright blue rare glowing border, two-star badge at top-left, circular fish thumbnail placeholder on the left with underwater mini-scene, text placeholder areas on the right for fish name, owned count, drop note, price area, and buy button area. Include placeholder text: Fish Name, Owned: 0, Drops Rare + Bonus Chest, 280, BUY. Premium casual-game UI style. Single isolated card only."),
	("fish_card_super_rare_empty", "Create a reusable super rare fish shop item card template for an aquarium mobile game UI. Horizontal rounded rectangle card, dark navy-blue glossy panel, purple super rare glowing border, three-star badge at top-left, circular fish thumbnail placeholder on the left with underwater mini-scene, text placeholder areas on the right for fish name, owned count, drop note, price area, and buy button area. Include placeholder text: Fish Name, Owned: 0, Drops Super Rare + Treasure Chest, 680, BUY. Premium casual-game UI style. Single isolated card only."),
	("fish_thumbnail_frame", "Create a reusable circular fish thumbnail frame for an aquarium mobile game shop UI. Round glassy bubble frame with deep blue underwater background inside, soft light rays, tiny bubbles, seabed rocks, seaweed silhouettes, glossy rim, empty center area for fish artwork. No text, no fish. Single isolated circular frame only."),
	("buy_button", "Create a reusable BUY button for a polished mobile game shop UI. Rounded rectangle button, bright green glossy gradient, beveled edges, soft highlight at top, subtle dark shadow, bold white text BUY centered. Single isolated button only."),
	("more_info_button", "Create a reusable secondary button for a polished mobile game shop UI. Rounded rectangle button, deep blue glossy gradient, cyan-blue beveled border, subtle highlight, bold white text MORE INFO centered. Single isolated button only."),
	("cancel_button", "Create a reusable cancel button for a polished mobile game shop UI. Rounded rectangle button, dark gray-blue glossy gradient, soft beveled border, subtle highlight, bold white text CANCEL centered. Single isolated button only."),
	("coin_icon", "Create a reusable gold coin icon for an aquarium mobile game UI. Round golden coin facing directly forward as a perfect circle with embossed star or shell symbol, glossy highlight, beveled rim, warm yellow-orange gradient, small sparkle, premium casual game style. No text. Single isolated icon only."),
	("gem_icon", "Create a reusable blue diamond gem icon for an aquarium mobile game UI. Bright cyan-blue faceted diamond, glossy highlights, beveled facets, soft glow, premium casual game style. No text. Single isolated icon only."),
	("common_star_badge", "Create a reusable common rarity star badge for a mobile game UI. Single gold/yellow star, glossy, beveled, soft glow, clean silhouette, small shadow. No text. Single isolated icon only."),
	("rare_star_badge", "Create a reusable rare rarity badge for a mobile game UI. Two bright blue stars grouped together, glossy, beveled, soft cyan glow, clean silhouette, small shadow. No text. Single isolated icon only."),
	("super_rare_star_badge", "Create a reusable super rare rarity badge for a mobile game UI. Three purple stars grouped together, glossy, beveled, soft violet glow, clean silhouette, small shadow. No text. Single isolated icon only."),
	("shell_reward_badge", "Create a reusable shell reward badge icon for an aquarium mobile game UI. Small cream-colored seashell icon, glossy, beveled, subtle golden highlight, clean readable shape, premium casual game style. No text. Single isolated icon only."),
	("treasure_chest_badge", "Create a reusable treasure chest reward badge icon for an aquarium mobile game UI. Small fantasy treasure chest with purple body, gold trim, glowing highlights, slightly open with soft magical glow, polished casual game style. No text. Single isolated icon only."),
	("price_badge_120", "Create a reusable price badge for an aquarium mobile game shop UI. Small rounded dark navy pill with gold coin icon on the left and number 120 in bold yellow-white text. Glossy bevel, subtle blue rim, premium casual game style. Single isolated UI asset only."),
	("price_badge_280", "Create a reusable price badge for an aquarium mobile game shop UI. Small rounded dark navy pill with gold coin icon on the left and number 280 in bold yellow-white text. Glossy bevel, subtle blue rim, premium casual game style. Single isolated UI asset only."),
	("price_badge_680", "Create a reusable price badge for an aquarium mobile game shop UI. Small rounded dark navy pill with gold coin icon on the left and number 680 in bold yellow-white text. Glossy bevel, subtle blue rim, premium casual game style. Single isolated UI asset only."),
	("vertical_scrollbar", "Create a reusable vertical scrollbar for a mobile game shop UI. Tall narrow rounded track, dark navy glossy base, bright cyan-blue scrollbar thumb, beveled edges, subtle glow, optional small up and down arrow buttons. No text. Single isolated UI asset only."),
	("footer_notification_panel", "Create a reusable footer notification panel for an aquarium mobile game shop UI. Wide rounded rectangle panel, deep navy-blue glossy gradient, glowing cyan-blue border, shield icon on the left, title text Healthy Fish, Happy Tank!, smaller subtitle New fish restock every 24 hours., timer pill on the right with clock icon and text 23h 47m 12s. Premium casual mobile-game UI style. Single isolated UI asset only."),
	("empty_state_panel", "Create a reusable empty state panel for an aquarium mobile game shop UI. Large rounded rectangle panel, deep underwater navy-blue background, subtle light rays, bubbles, rocks and seaweed at bottom, faint fish silhouette icon in the center, text No fish available and smaller text Check back later!. Glossy beveled border, soft cyan glow. Single isolated UI asset only."),
	("common_fish_placeholder", "Create a reusable common fish placeholder illustration for an aquarium mobile game shop. Cute small orange/yellow fish, side view, polished 2D casual-game style, glossy fins, clean silhouette, subtle highlight, suitable as shop item thumbnail. No text, no card. Single isolated fish asset only."),
	("rare_fish_placeholder", "Create a reusable rare fish placeholder illustration for an aquarium mobile game shop. Colorful blue and yellow striped fish, side view, polished 2D casual-game style, glossy fins, clean silhouette, subtle highlight, suitable as shop item thumbnail. No text, no card. Single isolated fish asset only."),
	("super_rare_fish_placeholder", "Create a reusable super rare fish placeholder illustration for an aquarium mobile game shop. Vibrant rainbow fish with blue, orange, purple, and teal accents, side view, polished 2D casual-game style, glossy fins, clean silhouette, magical subtle glow, suitable as shop item thumbnail. No text, no card. Single isolated fish asset only."),
	("main_shop_panel", "Create a reusable main content panel for an aquarium mobile game shop UI. Large rounded rectangle panel, deep ocean navy-blue gradient, glossy beveled border, subtle cyan glow, underwater light rays and bubbles, empty interior area for placing item cards. No text, no buttons, no icons. Single isolated UI panel only."),
	("small_divider_line", "Create a reusable horizontal divider line for an aquarium mobile game UI. Thin glowing cyan-blue line with soft fade at both ends, subtle highlight, underwater neon style. No text. Single isolated UI asset only."),
]


def run(cmd: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
	print("$", " ".join(cmd), flush=True)
	return subprocess.run(cmd, cwd=ROOT, check=check, text=True, capture_output=True)


def job_state(job_id: str) -> str:
	status = run(["python3", "tools/codex_image_job.py", "status", job_id], check=False)
	if status.returncode != 0:
		return "unknown"
	try:
		return json.loads(status.stdout).get("state", "unknown")
	except json.JSONDecodeError:
		return "unknown"


def wait_for_job(job_id: str) -> str:
	while True:
		state = job_state(job_id)
		print(f"{job_id}: {state}", flush=True)
		if state in {"completed", "failed", "exited", "stopped", "unknown"}:
			return state
		time.sleep(20)


def find_generated_png(asset_id: str, before: set[Path]) -> Path | None:
	expected = SOURCE_DIR / f"{asset_id}_source.png"
	if expected.exists():
		return expected
	after = {path for path in SOURCE_DIR.glob("*.png")}
	new_files = sorted(after - before, key=lambda path: path.stat().st_mtime, reverse=True)
	return new_files[0] if new_files else None


def key_out(asset_id: str, source: Path) -> None:
	target_source = SOURCE_DIR / f"{asset_id}_source.png"
	if source != target_source:
		shutil.copy2(source, target_source)
	runtime = RUNTIME_DIR / f"{asset_id}.png"
	run([
		"python3",
		"tools/key_out_magenta.py",
		str(target_source),
		str(runtime),
		"--tolerance",
		"58",
		"--feather",
		"32",
	])
	run(["file", str(target_source), str(runtime)])


def main() -> int:
	SOURCE_DIR.mkdir(parents=True, exist_ok=True)
	RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
	manifest: dict[str, dict[str, str]] = {}
	completed = 0
	for index, (asset_id, prompt) in enumerate(ASSETS, start=1):
		runtime = RUNTIME_DIR / f"{asset_id}.png"
		source = SOURCE_DIR / f"{asset_id}_source.png"
		if runtime.exists() and source.exists():
			print(f"[{index}/{len(ASSETS)}] skip existing {asset_id}", flush=True)
			manifest[asset_id] = {"source": str(source.relative_to(ROOT)), "runtime": str(runtime.relative_to(ROOT))}
			completed += 1
			continue

		before = {path for path in SOURCE_DIR.glob("*.png")}
		full_prompt = (
			f"{GLOBAL_STYLE}\n\n"
			f"Asset id: {asset_id}\n"
			f"Required source filename: {asset_id}_source.png\n"
			f"Create exactly one PNG image file named {asset_id}_source.png in the output directory. "
			f"Do not create a sprite sheet, contact sheet, preview grid, HTML file, SVG file, or multiple variations.\n\n"
			f"Specific asset prompt:\n{prompt}"
		)
		print(f"[{index}/{len(ASSETS)}] generating {asset_id}", flush=True)
		start = run([
			"python3",
			"tools/codex_image_job.py",
			"run",
			"--name",
			f"shop-ui-{asset_id}",
			"--output-dir",
			str(SOURCE_DIR),
			full_prompt,
		])
		job_id = json.loads(start.stdout)["job_id"]
		state = wait_for_job(job_id)
		if state != "completed":
			print(f"Job failed for {asset_id}: {state}", file=sys.stderr, flush=True)
			return 1
		generated = find_generated_png(asset_id, before)
		if not generated:
			print(f"No PNG produced for {asset_id}", file=sys.stderr, flush=True)
			return 1
		key_out(asset_id, generated)
		manifest[asset_id] = {"source": str(source.relative_to(ROOT)), "runtime": str(runtime.relative_to(ROOT))}
		completed += 1

	(RUNTIME_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
	print(f"Generated {completed}/{len(ASSETS)} shop UI assets.", flush=True)
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
