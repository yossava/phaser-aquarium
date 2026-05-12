# Tank Seabed Replacement Prompts

Goal: replace every seabed/sand asset except `Home Sand`. The new seabeds should match the functional read of `public/assets/backgrounds/aquarium-floor.webp`: a calm bottom substrate for a portrait mobile aquarium, not a scenic foreground illustration. The upper sand edge should feel natural and slightly organic, never perfectly ruler-flat.

Generation format:

- Generate a square keyed source PNG on pure solid `#ff00ff`.
- Keep keyed sources under `assets/generated/source/`.
- Key out magenta with `python3 tools/key_out_magenta.py <source.png> <final.png>`.
- Final inspection/runtime candidates must be transparent RGBA PNGs, not magenta-background files.

## Shared Art Direction

Use this base direction for every prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create a square keyed aquarium seabed sprite for a portrait mobile casual aquarium game. It must read as a low gently irregular aquarium floor band at the bottom of the tank, similar in function to a simple aquarium sand layer. Keep the top edge calm, naturally uneven, and clear-cut, with no large waves, no tall curves, no cliffs, no large foreground objects, no busy details, no text, no fish, no decorations, no bubbles. The background outside the asset must be pure solid magenta `#ff00ff` for chroma key removal. Use soft toy-like mobile game rendering, clean edges, gentle painterly texture, low contrast, and bottom-safe composition. Output one PNG image only, no labels, no contact sheet.

## Shared Style Lock

Paste this exact style lock into every individual generation prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.

## Negative Prompt

Use this negative prompt for all seabeds:

> no non-magenta background, no perfectly straight ruler-flat top edge, no gradient on the asset edge, no feathered transparency, no checkerboard, no shadow or glow blending into the key color, no tall hills, no curling dune waves, no U-shaped bowl, no dramatic foreground mound, no coral branches, no plants, no shells bigger than tiny grains, no rocks bigger than small pebbles unless the asset theme explicitly needs stone, no high-detail clutter, no perspective tunnel, no busy pattern, no hard black outlines, no text, no animals, no decorations, no frame.

## Generated Seabeds

Recommended source size for these files: square PNG source on solid magenta key background. Final output must be a keyed-out transparent RGBA PNG, then resized/exported for runtime as needed under `public/assets/backgrounds/generated-seabed/`.

### 01 Lagoon Sand

File: `tank-seabed-01-lagoon_sand.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Lagoon Sand as a square keyed aquarium seabed sprite, 1024x1024. Use warm pale tropical sand with a very low, smooth gently uneven top edge and tiny soft speckles. Add only subtle blue-green lagoon shading near the back edge. Calm, clean, spacious, not curvy, not busy.

### 02 Coral Rubble

File: `tank-seabed-02-coral_rubble.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Coral Rubble as a square keyed aquarium seabed sprite, 1024x1024. Use pale sand mixed with tiny pastel coral crumbs and micro-shell fragments. Keep fragments small and sparse, pressed into a low gently uneven floor band. No coral branches or tall pieces. Calm low organic silhouette.

### 03 Kelp Mud

File: `tank-seabed-03-kelp_mud.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Kelp Mud as a square keyed aquarium seabed sprite, 1024x1024. Use soft olive-brown aquarium silt with subtle green undertones and a few tiny darker flecks. Keep it smooth and low, no kelp plants, no roots, no mounds. Mobile game friendly and readable.

### 04 Crystal Gravel

File: `tank-seabed-04-crystal_gravel.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Crystal Gravel as a square keyed aquarium seabed sprite, 1024x1024. Use fine pale blue and lavender gravel grains with a few tiny crystal glints embedded flush with the floor. No tall crystals, no spikes. The top edge should be low with subtle organic variation.

### 05 Abyss Black Sand

File: `tank-seabed-05-abyss_black_sand.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Abyss Black Sand as a square keyed aquarium seabed sprite, 1024x1024. Use charcoal-black fine sand with soft blue highlights and very sparse tiny specks. Keep it readable but dark, smooth, low, and not cluttered. No rocks, no caves, no dramatic ridges.

### 06 Sunset Sand

File: `tank-seabed-06-sunset_sand.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Sunset Sand as a square keyed aquarium seabed sprite, 1024x1024. Use warm peach, gold, and soft rose sand grains, low and smooth like a clean aquarium substrate. Add gentle warm highlights only near the bottom. No waves, no dunes, no busy ripples.

### 07 Freshwater Pebbles

File: `tank-seabed-07-freshwater_pebbles.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Freshwater Pebbles as a square keyed aquarium seabed sprite, 1024x1024. Use tiny rounded river pebbles in beige, tan, gray, and muted green. Pebbles must be small, evenly scattered, and form a low gently uneven bed. Avoid large stones or stacked piles.

### 08 Ruin Tiles

File: `tank-seabed-08-ruin_tiles.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Ruin Tiles as a square keyed aquarium seabed sprite, 1024x1024. Use a low sandy bed with a few broken ancient tile shapes mostly buried and flush with the floor. Keep tile fragments small and horizontal, no tall ruins, no pillars, no busy mosaic.

### 09 Mangrove Silt

File: `tank-seabed-09-mangrove_silt.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Mangrove Silt as a square keyed aquarium seabed sprite, 1024x1024. Use smooth dark tan silt with soft amber-brown speckles and subtle organic texture. No roots, no leaves, no sticks. Low gently uneven floor, calm and uncluttered.

### 10 Volcanic Basalt

File: `tank-seabed-10-volcanic_basalt.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Volcanic Basalt as a square keyed aquarium seabed sprite, 1024x1024. Use dark gray basalt sand and very small flat stone chips, with faint warm ember undertones in a few grains. No lava, no glowing cracks, no large rocks. Low, clear, and readable.

### 11 Glowing Plankton Sand

File: `tank-seabed-11-glowing_plankton_sand.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Glowing Plankton Sand as a square keyed aquarium seabed sprite, 1024x1024. Use soft midnight teal sand with a few tiny cyan bioluminescent dots embedded in the substrate. Keep glow subtle and sparse, no starfield clutter. Low gently organic silhouette.

### 12 Arctic Pale Gravel

File: `tank-seabed-12-arctic_pale_gravel.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Arctic Pale Gravel as a square keyed aquarium seabed sprite, 1024x1024. Use icy white, pale blue, and light gray fine gravel. Make it clean and gently organic, with soft frost-like highlights. No icebergs, no crystals, no high contrast clutter.

### 13 Jade Moss Stone

File: `tank-seabed-13-jade_moss_stone.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Jade Moss Stone as a square keyed aquarium seabed sprite, 1024x1024. Use small flat jade-green stones and soft mossy speckles pressed into a low bed. No moss clumps, no plants, no tall rocks. The top edge should stay low with subtle organic variation.

### 14 Pearl Shell Sand

File: `tank-seabed-14-pearl_shell_sand.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Pearl Shell Sand as a square keyed aquarium seabed sprite, 1024x1024. Use creamy white sand with tiny pearly shell dust and subtle iridescent highlights. Keep shell pieces tiny and flush. No large shells, no pearl objects, no busy shine.

### 15 Shipwreck Planks

File: `tank-seabed-15-shipwreck_planks.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Shipwreck Planks as a square keyed aquarium seabed sprite, 1024x1024. Use sandy floor with a few small weathered wood plank fragments mostly buried and lying flat. No ship structure, no tall boards, no nails, no clutter. Calm bottom band.

### 16 Lily Pond Mud

File: `tank-seabed-16-lily_pond_mud.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Lily Pond Mud as a square keyed aquarium seabed sprite, 1024x1024. Use soft freshwater mud in muted brown and olive tones with tiny smooth speckles. No lily pads, no stems, no plants. Low, gently organic aquarium substrate.

### 17 Moonlit Silver Sand

File: `tank-seabed-17-moonlit_silver_sand.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Moonlit Silver Sand as a square keyed aquarium seabed sprite, 1024x1024. Use pale silver-gray sand with soft blue moonlight highlights and tiny reflective grains. Keep it subtle and gently organic, no sparkle clutter, no waves, no dunes.

### 18 Opal Crystal Gravel

File: `tank-seabed-18-opal_crystal_gravel.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Opal Crystal Gravel as a square keyed aquarium seabed sprite, 1024x1024. Use fine opal-toned gravel with tiny embedded pastel flecks, flush with the floor. No crystal spikes, no gemstones, no large rocks. Elegant but low-detail.

### 19 Golden Rippled Sand

File: `tank-seabed-19-golden_rippled_sand.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Golden Sand as a square keyed aquarium seabed sprite, 1024x1024. Use rich golden sand with only very subtle horizontal grain bands. Avoid visible wave dunes or tall ripples. Keep the silhouette low with subtle natural variation with sparse soft speckles.

### 20 Deep Temple Stone

File: `tank-seabed-20-deep_temple_stone.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create Deep Temple Stone as a square keyed aquarium seabed sprite, 1024x1024. Use a low bed of muted blue-gray stone dust with a few small flat carved stone fragments mostly buried. No pillars, no statues, no temple walls, no large blocks.

## Theme Floor Assets

Recommended source size for these files: square PNG source on solid magenta key background. Final output must be a keyed-out transparent RGBA PNG, then resized/exported for runtime as needed under `public/assets/backgrounds/`.

### Theme Lagoon Floor

File: `theme-lagoon-floor.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create a square keyed Lagoon Bed aquarium floor asset, 1024x1024. Pale tropical sand, low gently uneven top edge, tiny sparse shell dust, soft teal shading. No dunes, no curves, no coral objects. Clean mobile aquarium bottom strip.

### Theme Coral Floor

File: `theme-coral-floor.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create a square keyed Coral Bed aquarium floor asset, 1024x1024. Light beige sand with very small pink-orange coral crumbs embedded flush in the substrate. Keep it sparse and horizontal. No coral branches or raised rubble.

### Theme Kelp Floor

File: `theme-kelp-floor.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create a square keyed Kelp Bed aquarium floor asset, 1024x1024. Smooth olive-tan silt with subtle green speckles. No kelp plants or roots. Low gently organic bottom strip with calm soft texture.

### Theme Crystal Floor

File: `theme-crystal-floor.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create a square keyed Crystal Bed aquarium floor asset, 1024x1024. Fine pale blue gravel with tiny embedded lavender sparkle flecks. No raised crystals, no spikes, no busy gemstones. Low, clear, and readable.

### Theme Abyss Floor

File: `theme-abyss-floor.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create a square keyed Abyss Bed aquarium floor asset, 1024x1024. Fine charcoal sand with deep blue highlights, sparse small grains, smooth gently uneven top edge. No cliffs, no caves, no large stones.

### Theme Sunset Floor

File: `theme-sunset-floor.webp`

Prompt:

> Style lock: generate a square isolated seabed sprite on a solid flat magenta key background `#ff00ff`. Match `Home Sand` as a low, calm aquarium floor band with calm mobile-game rendering, soft painterly texture, low contrast, sparse detail density, and a simple readable substrate shape. The asset itself should sit near the top of the square with only a small clean magenta padding above the highest sand edge, then continue down to the bottom of the square. Keep the top edge low with subtle natural unevenness, small soft rises and dips, and sharply separated from the magenta key color, with clean antialiased edges only. Do not use edge gradients, feathered transparency previews, drop shadows, glow, checkerboard, scenic foreground, tall curve, mound, bowl, cliff, busy rubble field, or decorative object scene.
> Create a square keyed Sunset Bed aquarium floor asset, 1024x1024. Warm peach-gold sand with subtle rose highlights and small soft speckles. No dunes, no waves, no mounds. Clean gently organic aquarium substrate.

## QA Checklist

- The top edge should sit near the top of the square with only small magenta padding above it.
- The top edge must have subtle organic variation: small soft rises/dips, never a perfectly flat straight line.
- At game scale, it must read as a quiet floor, not a foreground landscape.
- No single detail should compete with fish, food, coins, or decor.
- The asset must be easy to tint blue in Makeup mode.
- Compare against `Home Sand`; reject if it feels taller, curvier, busier, or more decorative than Home Sand.
