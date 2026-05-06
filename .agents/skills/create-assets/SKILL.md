---
name: create-assets
description: Create Phaser Aquarium game assets using available generation tools for fish sprites, food pellets, helper creatures, decorations, tank backgrounds, UI art, textures, icons, palettes, and asset prompts for the portrait mobile aquarium game.
---

Use this skill when the user asks to create, prototype, replace, or plan visual assets for this Phaser Aquarium project. Choose the generation path and file format that best fits the asset, including Codex Desktop image generation, `imagegen`, SVG/code-native art, or procedural Phaser textures.

## Generation Paths

- Use `tools/codex_image_job.py` when the user wants Codex Desktop / GPT image generation to run in the background. It wraps `codex exec`, stores logs/status in `.codex_asset_jobs/`, and asks Codex to use image generation when available.
- Use `imagegen` for raster images: PNG/WebP/JPG fish sprites, helper creatures, decorations, food icons, tank backgrounds, UI panels, and visual polish passes.
- Use SVG for crisp UI icons, simple badges, flat helper silhouettes, and scalable documentation previews.
- Use Phaser drawing code when the asset should stay procedural, tintable, tiny, or animation-friendly.
- Use JSON or Markdown for palettes, asset manifests, batch prompts, or art-direction specs.
- Prefer transparent backgrounds for sprites, tank objects, UI overlays, buttons, icons, pellets, fish, helpers, and decorations.

## Project Paths

- Generated source assets: `assets/generated/`
- Fish sprites: `assets/fish/`
- Food and medicine/evolve items: `assets/food/`
- Decorations: `assets/decorations/`
- Helper creatures: `assets/helpers/`
- UI assets and icons: `assets/ui/`
- Tank backgrounds and floor patterns: `assets/backgrounds/`
- Temporary visual QA output: `artifacts/`

Use lowercase `snake_case` filenames. Keep generated assets inside the project unless the user explicitly asks for Desktop output.

## Aquarium Style

- Mobile portrait casual aquarium game.
- Bright readable aquarium silhouettes, soft toy-like shapes, saturated but not one-hue palettes.
- Fish should read clearly at small sizes and support recoloring/tail-color identity.
- Tank objects should feel playful and collectible, but not obscure fish or coins.
- UI should remain compact, mobile-first, and easy to scan.
- Avoid dark, muddy, overly realistic, or busy stock-art looks.

## Raster Transparency Workflow

- For isolated raster sprites, icons, buttons, badges, coins, helpers, decorations, and UI objects, prefer a chroma-key workflow over asking the image model for true transparency.
- Generate one asset per image on a solid flat magenta key background: `#ff00ff`. The magenta must be plain, untextured, unlit, and absent from the asset itself.
- Prompt for the asset to be fully separated from the magenta background with clean antialiased edges, no drop shadow that blends into the key color, no checkerboard preview, no sheet, no labels, and no extra objects.
- After generation, key out the magenta background into real alpha and export the final runtime PNG with transparent background.
- Keep the original keyed source when useful under `assets/generated/source/` or `artifacts/`, and place only the cleaned transparent runtime PNG in the game asset path.
- If an asset naturally contains magenta or pink details, use a different explicit key color that is absent from the asset, such as `#00ff00`, and document that choice in the manifest.
- Do not accept generated checkerboard transparency previews as final transparency; checkerboards must be treated as failed output or manually removed only when the object can be cleanly extracted.

## Workflow

1. Inspect current assets and procedural textures first:

```bash
rg -n "generateTexture|texture|sprite|fish-base|decor-|helper-" src
find assets -maxdepth 3 -type f 2>/dev/null
```

2. Pick the output format based on use:
   - PNG/WebP for sprites, decoration art, helper creatures, UI panels, tank backgrounds, and texture details.
   - SVG for simple icons, badges, tool buttons, and crisp vector references.
   - TypeScript/Phaser drawing code for tintable or generated primitives.
   - JSON/Markdown for palettes, asset catalogs, and batch prompt packs.

3. Draft a compact prompt that states:
   - asset subject and gameplay purpose
   - mobile portrait aquarium style
   - exact output size and magenta key background for isolated raster assets
   - desired readability at in-game scale
   - exact output format
   - one asset only, not a sprite collection or contact sheet
   - for SVG: `Return only valid SVG markup, no markdown fences, no explanation.`

4. For background Codex image generation:

```bash
python3 tools/codex_image_job.py run --name fish-pack \
  --output-dir assets/fish \
  "Create transparent PNG fish sprites for a mobile aquarium game..."

python3 tools/codex_image_job.py list
python3 tools/codex_image_job.py status <job_id>
python3 tools/codex_image_job.py tail <job_id> --log last_message.md
```

Attach references when useful:

```bash
python3 tools/codex_image_job.py run --name helper-creatures \
  --output-dir assets/helpers \
  --reference artifacts/fish-hungry-bubble.png \
  "Create transparent PNG bottom-crawling helper creatures..."
```

5. For keyed raster output, convert the key color to alpha before integration:

```bash
python3 tools/key_out_magenta.py path/to/source.png path/to/final.png
```

If the project does not yet have a key-out helper, use an image library or script that removes only the exact key background and preserves antialiasing around the asset edge. Do not ship the keyed source as a runtime asset.

6. Validate before reporting done:

```bash
file assets/path/name.png
```

For SVG:

```bash
file assets/path/name.svg
head -n 5 assets/path/name.svg
xmllint --noout assets/path/name.svg
```

For raster assets, inspect dimensions with `file` and view the result. If integrated into the game, run `npm test` and visually verify in the browser or regression artifact.

7. If output contains prose, markdown fences, wrong dimensions, checkerboard background, visible key-color spill, or poor transparency, rerun with a stricter prompt. Avoid hand-editing large generated image/vector files unless the fix is tiny and obvious.

8. When adding runtime asset loading, keep fallback procedural textures until the image asset is verified, so gameplay never breaks if a file is missing.

## Prompt Notes

- For fish: ask for side-view readable silhouettes, clear tail shape, transparent background, no text, and colors that can map to food identity.
- For decorations: ask for bottom-safe silhouettes and a clear anchor point, so drag/reposition feels natural.
- For helper creatures: ask for small bottom-crawling silhouettes that remain readable near the sand.
- For UI: request compact mobile game controls, clean edges, no baked-in text unless explicitly needed.
- For backgrounds: request loop-friendly aquarium patterns with low contrast behind fish and coins.
