# Fish Asset Generation Plan

This prompt pack covers the 50 current fish types in `src/data/fish-types.json`. Generate every fish with the same art DNA so the collection feels like one polished mobile game set, while rarity and food identity are readable at small in-game sizes.

## Shared Art DNA

Use this style block at the start of every prompt. This block is mandatory; do not shorten it when generating production assets:

> Mobile portrait aquarium game fish sprite, 2D stylized collectible game art, not a realistic fish photo, not stock art, not a 3D render, not a natural-history illustration. Use a unified cute toy-like aquarium art DNA: simplified rounded body, clean graphic silhouette, soft candy-color shading, controlled glossy highlights, friendly oversized eye, readable fins, and only simplified scale or pattern marks. Side-view fish facing right in a neutral straight swim pose. Body centerline must stay mostly horizontal. Tail root and tail-tip centerline must be straight and horizontal, aligned with the body axis; the tail may be a fan, fork, veil, or ribbon shape, but it must not curl, bend, droop, arc upward, arc downward, or form an S-shape. Center the full body with tail visible. Transparent background or perfectly flat chroma-key background for alpha removal. No tank background, no bubbles, no text, no UI badge, no hard black outline, no photorealistic scales, no real-species photo texture, no lens/stock-image lighting, no muddy colors. Readable at 64 px wide, source asset 1024x768 PNG with alpha.

## Stylization Guardrails

Use these guardrails for every generated fish:

- The fish should look like a premium mobile-game sprite or collectible sticker, not like an image-search result.
- Favor deliberate shape language over biological realism: rounded toy body, clean fins, simplified scales, readable color blocking.
- Avoid photographic detail: no natural lens blur, no studio product lighting, no hyperreal eye, no thousands of tiny realistic scales.
- Avoid generic AI/stock polish: do not make it look like a random glossy fish cutout from the web.
- Keep the pose neutral and animation-ready: straight horizontal body, straight horizontal tail axis, no dramatic swimming curve.
- Keep rarity visible through controlled game-art details, not through realism.

## Tail Geometry Contract

Every fish tail must be straight enough for consistent in-game movement:

- Tail root, tail center, and tail tip should align on the same horizontal axis as the body.
- Tail fins can spread symmetrically above and below that axis, but the centerline cannot curve.
- Do not generate curled tails, S-shaped tails, tails bent upward, tails bent downward, or tails sweeping around the body.
- Long-tail and veil-tail fish may have flowing fin edges, but the structural tail direction must still point straight back.
- The tail color cue must be on this straight tail, not on a separate floating mark or badge.

## Rarity Language

- Common: bright friendly body, one clear pattern feature, matte candy color, small soft highlight, simple fins.
- Rare: more elegant silhouette, richer fins, pearlescent rim light, metallic or glassy accent marks, more pattern detail than common.
- Super Rare: magical premium treatment, opal or cosmic shimmer, soft internal glow, elegant translucent fin layers, still readable as the species and still matching the same toy-like art DNA.

Rarity should be part of the fish body, fins, scale pattern, or glow. Do not add separate star badges because tank UI no longer shows rarity stars.

## Food Tail Color Map

Each fish should have its preferred food color visible in the tail or tail-tip so players can visually map fish to food.

- Micro: mint green `#62f2a8`
- Basic: warm orange `#ffb13b`
- Premium: bright blue `#56a8ff`
- Herb: leaf green `#78d957`
- Protein: coral red `#ff5b5b`
- Coral: aqua cyan `#35d6d0`

If a fish has two preferred foods, use the first food as the main tail color and the second as a tiny tail-tip stripe.

## Output Rules

- Save final files to `assets/fish/<fish-id>.png`.
- Keep every sprite on a transparent background.
- Keep consistent scale and framing across the set: fish body should occupy roughly 72 percent of source width, with long-tail species allowed up to 84 percent.
- Keep a consistent anchor: visual center at the belly midpoint.
- Leave a small transparent margin on all sides for glow and animation.
- Generate adult-form art only. The game scales age visually from the same asset.
- Avoid baked-in illness, hunger, mood bubbles, stars, prices, labels, coins, food, or decorations.
- Reject outputs that look photographic, stock-art-like, or have curled/bent tails; regenerate with the Shared Art DNA and Tail Geometry Contract emphasized.

## Batch Command Pattern

Use one fish per job when quality matters:

```bash
python3 tools/codex_image_job.py run --name fish-goldfish --output-dir assets/fish \
  "Shared Art DNA block. Create goldfish.png. Per-fish prompt here."
```

Use small same-rarity batches when iterating on consistency:

```bash
python3 tools/codex_image_job.py run --name fish-l1-common-pack --output-dir assets/fish \
  "Create transparent PNG fish sprites for goldfish, guppy, molly, platy, tetra, minnow, medaka, rasbora, danio, swordtail. Use the Shared Art DNA and the per-fish prompts from docs/fish-asset-generation-plan.md."
```

After generation, verify file type and inspect visually:

```bash
file assets/fish/goldfish.png
python3 tools/codex_image_job.py list
```

## Per-Fish Prompts

Prefix every prompt with the Shared Art DNA block.

| Output | Fish | Rank | Rarity | Prompt |
| --- | --- | --- | --- | --- |
| `assets/fish/goldfish.png` | Goldfish | L1 | Common | Create a common Goldfish sprite with a rounded cheerful body in golden orange `#ffb23c`, soft cream belly, simple fan tail, tiny white cheek highlight, and a warm orange Basic-food tail `#ffb13b`. Keep it friendly, starter-fish readable, and not ornate. |
| `assets/fish/guppy.png` | Guppy | L1 | Common | Create a common Guppy sprite with a small slim body in coral pink `#ee7e70`, playful rounded fins, one pale side stripe, and a warm orange Basic-food tail `#ffb13b` with a mint Micro-food tip `#62f2a8`. Keep the silhouette tiny but distinct. |
| `assets/fish/molly.png` | Molly | L1 | Common | Create a common Molly sprite with a compact oval body in bright aqua `#4dd9ee`, soft silver belly, simple rounded dorsal fin, and a warm orange Basic-food tail `#ffb13b` with a mint Micro-food tip `#62f2a8`. Make it calm and collectible. |
| `assets/fish/platy.png` | Platy | L1 | Common | Create a common Platy sprite with a stubby friendly body in leaf yellow-green `#9ec97c`, one peach side spot, small rounded fins, and a warm orange Basic-food tail `#ffb13b` with a mint Micro-food tip `#62f2a8`. Keep the shape simple and chunky. |
| `assets/fish/tetra.png` | Tetra | L1 | Common | Create a common Tetra sprite with a tiny diamond body in lavender `#c99dee`, one clean neon side stripe, delicate short fins, and a warm orange Basic-food tail `#ffb13b` with a mint Micro-food tip `#62f2a8`. Make the stripe readable at small size. |
| `assets/fish/minnow.png` | Minnow | L1 | Common | Create a common Minnow sprite with a slim fast body in sunny yellow `#eecf48`, pale belly, single darker back stripe, and a warm orange Basic-food tail `#ffb13b` with a mint Micro-food tip `#62f2a8`. Keep it simple and energetic. |
| `assets/fish/medaka.png` | Medaka | L1 | Common | Create a common Medaka sprite with a small elegant body in mint teal `#77f1d3`, white belly, tiny translucent fins, and a warm orange Basic-food tail `#ffb13b` with a mint Micro-food tip `#62f2a8`. Keep it bright and delicate. |
| `assets/fish/rasbora.png` | Rasbora | L1 | Common | Create a common Rasbora sprite with a small almond body in rosy pink `#e38ea2`, one triangular dark side mark, clear fins, and a warm orange Basic-food tail `#ffb13b` with a mint Micro-food tip `#62f2a8`. Make the side mark its signature feature. |
| `assets/fish/danio.png` | Danio | L1 | Common | Create a common Danio sprite with a slim striped body in sky blue `#81b9ee`, two clean horizontal stripes, tiny fins, and a warm orange Basic-food tail `#ffb13b` with a mint Micro-food tip `#62f2a8`. Keep it crisp and motion-ready. |
| `assets/fish/swordtail.png` | Swordtail | L1 | Common | Create a common Swordtail sprite with a lively orange body `#ee8e52`, short rounded fins, one long lower sword tail extension, and a warm orange Basic-food tail `#ffb13b` with a mint Micro-food tip `#62f2a8`. Keep the sword tail readable but not sharp. |
| `assets/fish/angelfish.png` | Angelfish | L2 | Rare | Create a rare Angelfish sprite with a tall triangular body in warm amber `#dd9f68`, long elegant fins, pearlescent rim light, two graceful vertical bands, and a bright blue Premium-food tail accent `#56a8ff` with a warm orange Basic-food tip `#ffb13b`. Make it graceful and premium. |
| `assets/fish/pearl-gourami.png` | Pearl Gourami | L2 | Common | Create a common Pearl Gourami sprite with a rounded red body `#dd4d43`, pearl-dot side pattern, soft threadlike feelers, and a bright blue Premium-food tail `#56a8ff` with a warm orange Basic-food tip `#ffb13b`. Keep pearl dots subtle and readable. |
| `assets/fish/rainbowfish.png` | Rainbowfish | L2 | Common | Create a common Rainbowfish sprite with an arched turquoise body `#7eeadd`, gentle rainbow side sheen, simple translucent fins, and a bright blue Premium-food tail `#56a8ff` with a warm orange Basic-food tip `#ffb13b`. Keep colors cheerful, not noisy. |
| `assets/fish/glass-catfish.png` | Glass Catfish | L2 | Common | Create a common Glass Catfish sprite with a semi-transparent lime body `#adfa4f`, visible soft inner spine line, tiny whiskers, and a bright blue Premium-food tail `#56a8ff` with a warm orange Basic-food tip `#ffb13b`. Keep it cute, not anatomical. |
| `assets/fish/cherry-barb.png` | Cherry Barb | L2 | Common | Create a common Cherry Barb sprite with a plump cherry blossom body `#faaedd`, small darker cherry spot, simple clear fins, and a bright blue Premium-food tail `#56a8ff` with a warm orange Basic-food tip `#ffb13b`. Keep it sweet and rounded. |
| `assets/fish/honey-gourami.png` | Honey Gourami | L2 | Common | Create a common Honey Gourami sprite with a honey yellow body `#ddfc7b`, soft amber belly, tiny dotted cheek, and a bright blue Premium-food tail `#56a8ff` with a warm orange Basic-food tip `#ffb13b`. Make it warm and gentle. |
| `assets/fish/corydoras.png` | Corydoras | L2 | Common | Create a common Corydoras sprite with a bottom-fish silhouette, rounded armored body in cyan `#44c2e0`, tiny whiskers, soft belly plates, and a bright blue Premium-food tail `#56a8ff` with a warm orange Basic-food tip `#ffb13b`. Keep it adorable and low-swimming. |
| `assets/fish/moonlight-molly.png` | Moonlight Molly | L2 | Common | Create a common Moonlight Molly sprite with a pale moon-gold body `#d0bd91`, gentle crescent side highlight, soft rounded fins, and a bright blue Premium-food tail `#56a8ff` with a warm orange Basic-food tip `#ffb13b`. Keep it calm and moonlit. |
| `assets/fish/blue-ram.png` | Blue Ram | L2 | Common | Create a common Blue Ram sprite with a compact cichlid body in violet blue `#b28add`, small forehead curve, one electric cheek mark, and a bright blue Premium-food tail `#56a8ff` with a warm orange Basic-food tip `#ffb13b`. Keep it cute, not aggressive. |
| `assets/fish/rosy-barb.png` | Rosy Barb | L2 | Common | Create a common Rosy Barb sprite with a rounded rose-gold body `#ddbd61`, tiny red fin accents, one side spot, and a bright blue Premium-food tail `#56a8ff` with a warm orange Basic-food tip `#ffb13b`. Keep it classic and collectible. |
| `assets/fish/koi.png` | Koi | L3 | Rare | Create a rare Koi sprite with an elegant long body in muted rose `#cc8e79`, cream patches, refined scale highlights, flowing fins, and a coral red Protein-food tail `#ff5b5b` with a bright blue Premium-food tip `#56a8ff`. Make it valuable and serene. |
| `assets/fish/discus.png` | Discus | L3 | Rare | Create a rare Discus sprite with a broad round body in warm red `#cc5c52`, pearlescent rim light, soft maze-like scale pattern, and a coral red Protein-food tail `#ff5b5b` with a bright blue Premium-food tip `#56a8ff`. Keep the disc shape iconic. |
| `assets/fish/clown-loach.png` | Clown Loach | L3 | Rare | Create a rare Clown Loach sprite with a curved loach body in mint aqua `#6ffbcc`, bold rounded clown bands, tiny whiskers, pearly fin edges, and a coral red Protein-food tail `#ff5b5b` with a bright blue Premium-food tip `#56a8ff`. Keep it playful and premium. |
| `assets/fish/arowana.png` | Arowana | L3 | Rare | Create a rare Arowana sprite with a long majestic body in lime gold `#bceb5e`, large glossy scales, upward mouth, elegant fin trail, and a coral red Protein-food tail `#ff5b5b` with a bright blue Premium-food tip `#56a8ff`. Make it powerful but still toy-like. |
| `assets/fish/flowerhorn.png` | Flowerhorn | L3 | Rare | Create a rare Flowerhorn sprite with a chunky cichlid body in soft pink `#ebbfcc`, rounded forehead bump, pearl speckles, confident face, and a coral red Protein-food tail `#ff5b5b` with a bright blue Premium-food tip `#56a8ff`. Keep the forehead feature cute. |
| `assets/fish/bichir.png` | Bichir | L3 | Rare | Create a rare Bichir sprite with a long ancient body in yellow green `#cced6a`, small dorsal finlets, subtle armored scale marks, and a coral red Protein-food tail `#ff5b5b` with a bright blue Premium-food tip `#56a8ff`. Keep it prehistoric but friendly. |
| `assets/fish/parrot-cichlid.png` | Parrot Cichlid | L3 | Rare | Create a rare Parrot Cichlid sprite with a rounded beak-like face, bright cyan body `#55d3f1`, pearly cheek dots, plush fins, and a coral red Protein-food tail `#ff5b5b` with a bright blue Premium-food tip `#56a8ff`. Make it charming and expressive. |
| `assets/fish/leaf-fish.png` | Leaf Fish | L3 | Rare | Create a rare Leaf Fish sprite with a leaf-shaped body in warm olive `#c1ac80`, soft vein-like pattern, disguised fin edges, and a coral red Protein-food tail `#ff5b5b` with a bright blue Premium-food tip `#56a8ff`. Keep the leaf theme elegant, not camouflaged dark. |
| `assets/fish/electric-blue-acara.png` | Electric Blue Acara | L3 | Rare | Create a rare Electric Blue Acara sprite with a compact body in lavender blue `#a39bcc`, electric turquoise face streaks, pearly fin rim, and a coral red Protein-food tail `#ff5b5b` with a bright blue Premium-food tip `#56a8ff`. Make it vivid and premium. |
| `assets/fish/firemouth.png` | Firemouth | L3 | Rare | Create a rare Firemouth sprite with a sturdy cichlid body in gold tan `#ccac70`, glowing red throat accent, pearlescent dorsal edge, and a coral red Protein-food tail `#ff5b5b` with a bright blue Premium-food tip `#56a8ff`. Keep the fire accent readable. |
| `assets/fish/betta.png` | Betta | L4 | Rare | Create a rare Betta sprite with a vivid lime body `#bbf90e`, large flowing veil fins, pearly edge highlights, elegant pose, and an aqua cyan Coral-food tail `#35d6d0` with a coral red Protein-food tip `#ff5b5b`. Make the fins luxurious but not too wispy. |
| `assets/fish/mandarin-dragonet.png` | Mandarin Dragonet | L4 | Rare | Create a rare Mandarin Dragonet sprite with a rounded reef body in deep red `#bb2b25`, psychedelic turquoise and cream swirl markings, small fan fins, and an aqua cyan Coral-food tail `#35d6d0` with a coral red Protein-food tip `#ff5b5b`. Keep patterns bold and readable. |
| `assets/fish/lionfish.png` | Lionfish | L4 | Rare | Create a rare Lionfish sprite with a deep blue body `#188cbb`, elegant rounded fin rays, striped reef pattern, pearly fin tips, and an aqua cyan Coral-food tail `#35d6d0` with a coral red Protein-food tip `#ff5b5b`. Make it ornate but safe and cute. |
| `assets/fish/seahorse.png` | Seahorse | L4 | Rare | Create a rare Seahorse sprite with a curled upright body in warm gold `#cb9c29`, tiny crown-like head ridge, pearly belly plates, and an aqua cyan Coral-food tail `#35d6d0` with a coral red Protein-food tip `#ff5b5b`. Keep it whimsical and readable. |
| `assets/fish/moorish-idol.png` | Moorish Idol | L4 | Rare | Create a rare Moorish Idol sprite with a tall reef body in pale aqua `#9cc8bb`, bold soft black-and-cream bands, long ribbon dorsal fin, and an aqua cyan Coral-food tail `#35d6d0` with a coral red Protein-food tip `#ff5b5b`. Keep the ribbon graceful. |
| `assets/fish/royal-gramma.png` | Royal Gramma | L4 | Rare | Create a rare Royal Gramma sprite with a small royal reef body in golden violet `#bb9a1d`, purple-to-yellow transition, pearly fin rim, and an aqua cyan Coral-food tail `#35d6d0` with a coral red Protein-food tip `#ff5b5b`. Make it jewel-like and compact. |
| `assets/fish/foxface.png` | Foxface | L4 | Rare | Create a rare Foxface sprite with a reef rabbitfish silhouette in teal green `#22a486`, friendly mask-like face patch, soft dorsal fins, and an aqua cyan Coral-food tail `#35d6d0` with a coral red Protein-food tip `#ff5b5b`. Keep it bright and approachable. |
| `assets/fish/triggerfish.png` | Triggerfish | L4 | Rare | Create a rare Triggerfish sprite with a sturdy angular reef body in icy blue `#b6dbf7`, playful geometric face markings, pearly scale shine, and an aqua cyan Coral-food tail `#35d6d0` with a coral red Protein-food tip `#ff5b5b`. Keep angular shapes rounded enough for the art DNA. |
| `assets/fish/butterflyfish.png` | Butterflyfish | L4 | Rare | Create a rare Butterflyfish sprite with a flat graceful body in pale green `#d4ecbb`, butterfly-like fin shapes, clear eye stripe, pearly rim light, and an aqua cyan Coral-food tail `#35d6d0` with a coral red Protein-food tip `#ff5b5b`. Keep it elegant and readable. |
| `assets/fish/wrasse.png` | Wrasse | L4 | Rare | Create a rare Wrasse sprite with a sleek reef body in neon yellow green `#bbdb07`, flowing curved fins, small sapphire face marks, pearly edge shine, and an aqua cyan Coral-food tail `#35d6d0` with a coral red Protein-food tip `#ff5b5b`. Make it quick and colorful. |
| `assets/fish/celestial-koi.png` | Celestial Koi | L5 | Super Rare | Create a super rare Celestial Koi sprite with a long mythical koi body in cosmic lime `#aae81f`, opal scale shimmer, subtle constellation-like body speckles, soft inner glow, flowing translucent fins, and a leaf green Herb-food tail `#78d957` with an aqua cyan Coral-food tip `#35d6d0`. Make it premium without adding star badges. |
| `assets/fish/moon-jelly.png` | Moon Jelly | L5 | Super Rare | Create a super rare Moon Jelly sprite as a cute jellyfish-like aquarium creature in ruby moon red `#aa3a34`, translucent bell, soft moonlit glow, dangling rounded tendrils, and a leaf green Herb-food tail-like lower accent `#78d957` with an aqua cyan Coral-food tip `#35d6d0`. Keep it compatible with the fish art DNA and side-view framing. |
| `assets/fish/crystal-ray.png` | Crystal Ray | L5 | Super Rare | Create a super rare Crystal Ray sprite with a manta-like body in deep aqua `#099daa`, faceted crystal highlights, translucent wing edges, soft cyan inner glow, and a leaf green Herb-food tail `#78d957` with an aqua cyan Coral-food tip `#35d6d0`. Keep it centered and elegant. |
| `assets/fish/starlight-betta.png` | Starlight Betta | L5 | Super Rare | Create a super rare Starlight Betta sprite with a warm sunset body `#da8d38`, massive layered veil fins, opal shimmer, tiny embedded starlight speckles on fins, and a leaf green Herb-food tail `#78d957` with an aqua cyan Coral-food tip `#35d6d0`. Make it luxurious but readable. |
| `assets/fish/solar-discus.png` | Solar Discus | L5 | Super Rare | Create a super rare Solar Discus sprite with a broad round body in mint jade `#8dd9aa`, radiant sunburst scale pattern, soft golden rim glow, translucent fins, and a leaf green Herb-food tail `#78d957` with an aqua cyan Coral-food tip `#35d6d0`. Keep the disc shape iconic. |
| `assets/fish/nebula-guppy.png` | Nebula Guppy | L5 | Super Rare | Create a super rare Nebula Guppy sprite with a small guppy body in bronze gold `#aa8b0c`, oversized nebula-pattern fan tail, violet and cyan opal shimmer, soft glow, and a leaf green Herb-food tail base `#78d957` with an aqua cyan Coral-food tip `#35d6d0`. Keep it cute and magical. |
| `assets/fish/phantom-arowana.png` | Phantom Arowana | L5 | Super Rare | Create a super rare Phantom Arowana sprite with a long elegant body in emerald teal `#33b597`, semi-transparent ghostly fin layers, opalescent scale plates, soft aura, and a leaf green Herb-food tail `#78d957` with an aqua cyan Coral-food tip `#35d6d0`. Keep it majestic and readable. |
| `assets/fish/aurora-seahorse.png` | Aurora Seahorse | L5 | Super Rare | Create a super rare Aurora Seahorse sprite with a curled body in pale sky blue `#a7cae6`, aurora gradient fin glow, pearl belly plates, tiny crown ridge, and a leaf green Herb-food tail curl `#78d957` with an aqua cyan Coral-food tip `#35d6d0`. Keep it whimsical and premium. |
| `assets/fish/ruby-dragonfish.png` | Ruby Dragonfish | L5 | Super Rare | Create a super rare Ruby Dragonfish sprite with a dragon-like fish body in pale opal green `#c5fdaa`, ruby facial fins, tiny rounded whiskers, luminous scale plates, flowing translucent dorsal fin, and a leaf green Herb-food tail `#78d957` with an aqua cyan Coral-food tip `#35d6d0`. Make it legendary but still friendly. |
| `assets/fish/opal-leviathan.png` | Opal Leviathan | L5 | Super Rare | Create a super rare Opal Leviathan sprite with a large mythical aquarium fish body in lime opal `#aaca16`, sweeping whale-like silhouette, layered translucent fins, rainbow opal scale shimmer, soft internal glow, and a leaf green Herb-food tail `#78d957` with an aqua cyan Coral-food tip `#35d6d0`. Keep it powerful, cute, and readable at game scale. |

## Consistency QA Checklist

- All 50 files use transparent backgrounds.
- All fish face the same direction.
- No prompt output includes text, badges, food pellets, coins, tank backgrounds, or UI.
- Common fish look clearly simpler than rare fish.
- Rare fish look premium but not magical enough to confuse with super rare.
- Super rare fish have glow or opal/cosmic treatment, but do not break the shared toy-like art DNA.
- Tail color matches the first preferred food in the fish catalog.
- Tail root-to-tip centerline is straight and horizontal for every fish.
- Fish looks like a stylized mobile-game collectible, not a realistic image-search cutout.
- Fish are readable when downscaled to 64 px wide.
