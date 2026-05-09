# 90 Fish Real-Reference Prompt Batch

Generate 90 new fish sprites: 30 common, 30 rare, and 30 super rare. This is a source-generation batch, not a runtime integration batch.

## Output

- Final transparent sprites: `assets/generated/fish-90-real-ref/final/<rarity>/<fish-id>.png`
- Keyed sources: `assets/generated/fish-90-real-ref/source/<rarity>/<fish-id>_source_keyed.png`
- Per-fish QA notes: `assets/generated/fish-90-real-ref/qa/<rarity>/<fish-id>.json`
- Batch manifest: `assets/generated/fish-90-real-ref/manifest.json`
- Batch progress log: `assets/generated/fish-90-real-ref/progress.md`

## Required Workflow

Process one fish at a time. Do not move to the next fish until the current fish passes QA or exhausts retries.

For each fish:

1. Generate one isolated 1024x768 PNG source on flat `#ff00ff` chroma-key background.
2. Key out the magenta source into an RGBA transparent final PNG.
3. QA the final PNG before continuing.
4. Retry up to 2 times if the fish fails QA.
5. Write a per-fish QA JSON with `status`, `attempts`, `pass_fail_reasons`, `anatomy_notes`, `style_notes`, `files`, and `retry_reason`.
6. Append the result to `progress.md`.

## Shared Prompt Block

Use this block in every prompt:

> Mobile portrait aquarium game fish sprite, polished 2D collectible game art. Start from the real-world anatomy and silhouette of the named fish species: believable body proportion, mouth placement, eye placement, dorsal fin, pectoral fin, pelvic fin, anal fin, caudal peduncle, and tail type. Stylize into cute toy-like aquarium art with simplified rounded forms, clean readable silhouette, soft candy-color shading, controlled glossy highlights, friendly eye, readable fins, and simplified scale or pattern marks. Use colorful fantasy palette if helpful, but preserve the real fish's natural silhouette and anatomy. Do not make the fish white, mostly white, pale ivory, plain silver, washed-out gray, or low contrast. Side-view fish facing right in a neutral straight swim pose. Body centerline mostly horizontal. Tail root and tail-tip centerline straight and horizontal. One fish only, centered with full body and tail visible. Flat solid `#ff00ff` chroma-key background, magenta not used on the fish. No text, no UI, no bubbles, no tank background, no scenery, no contact sheet, no multiple poses, no badges, no coins, no food, no jewelry, no armor, no metal trim, no object-like ornaments, no photorealistic photo texture.

## QA Pass Criteria

A fish passes only if all are true:

- Real species anatomy is recognizable and believable.
- It looks like a living fish, not a fantasy object or ornament.
- It is stylized game art, not photorealistic stock art.
- It faces right in a neutral side-view pose.
- Tail axis is not curled into an S-shape and is not bent dramatically up/down.
- No white/mostly-white body and no low-contrast gray/silver body.
- No text, UI, bubbles, scenery, extra fish, badges, coins, food, jewelry, armor, metal trim, or hard-surface objects.
- Flat keyed source has a usable magenta background.
- Final PNG has real alpha transparency and no visible magenta background.
- It remains readable at 64 px wide.

## Rarity Rules

- Common: real species first, clear cute shape, simple readable pattern, bright friendly palette, minimal premium treatment.
- Rare: real species first, one or two premium naturalized upgrades such as elegant fin edges, pearlescent scale sheen, refined tail shape, controlled contrast, or a memorable species-compatible pattern.
- Super rare: real species first, stronger but still naturalized premium treatment such as unusually beautiful fin flow, translucent fin membranes, opal/cosmic scale shimmer, luminous scale accents, or soft internal color glow. It must not become object-like, armored, crowned, crystalline, or artificial.

## Common Fish Prompts

| ID | Species Reference | Prompt Add-on |
| --- | --- | --- |
| `common_zebra_danio` | Zebra danio | Real zebra danio body: slim torpedo shape, small fins, forked tail, horizontal stripe identity. Use bright cyan body with warm orange tail cue and two simplified sapphire stripes. |
| `common_neon_tetra` | Neon tetra | Real neon tetra anatomy: tiny streamlined body, small fins, narrow tail. Use teal-blue body with coral belly glow and one clean neon side stripe. |
| `common_ember_tetra` | Ember tetra | Real ember tetra anatomy: small oval tetra body, transparent fins, small mouth. Use saturated ember orange with teal fin tips and one simple side sparkle mark. |
| `common_cardinal_tetra` | Cardinal tetra | Real cardinal tetra anatomy: tiny streamlined body and short fins. Use deep blue back, vivid red lower stripe, aqua tail cue, clean readable stripe pattern. |
| `common_harlequin_rasbora` | Harlequin rasbora | Real rasbora anatomy: small almond body, fork tail, triangular side patch. Use warm peach body, sapphire wedge mark, teal fin tips. |
| `common_cherry_barb` | Cherry barb | Real barb anatomy: compact oval body, small barb mouth, forked tail. Use bright cherry red with a darker side spot and warm orange tail cue. |
| `common_rosy_barb` | Rosy barb | Real rosy barb body with rounded barb profile and forked tail. Use rosy gold body, red fin accents, simple side spot. |
| `common_tiger_barb` | Tiger barb | Real tiger barb anatomy: deep small body, triangular dorsal fin, forked tail. Use golden body, simplified dark vertical bands, aqua fin edge cue. |
| `common_endler_guppy` | Endler guppy | Real Endler guppy anatomy: tiny slim body, small head, fan tail. Use turquoise body, orange side marks, simple patterned tail. |
| `common_platy` | Platy | Real platy anatomy: short rounded livebearer body, small fins, fan tail. Use leaf-green body, peach side spot, warm orange tail cue. |
| `common_swordtail` | Swordtail | Real swordtail anatomy: livebearer body with lower sword extension. Keep the sword extension natural, not sharp; use orange body and teal tail-tip stripe. |
| `common_molly` | Molly | Real molly anatomy: compact oval livebearer body, rounded fins, fan tail. Use aqua body, warm yellow belly, simple tail cue. |
| `common_medaka` | Medaka ricefish | Real medaka anatomy: small slender body, tiny fins, small upturned mouth. Use mint body, coral tail cue, clean pale belly highlight. |
| `common_japanese_ricefish` | Japanese ricefish | Real ricefish anatomy: slim topminnow body and small fins. Use sunny yellow-green body, teal back stripe, orange tail cue. |
| `common_lampeye_killifish` | Lampeye killifish | Real lampeye anatomy: small slim body, bright eye highlight, short fins. Use violet-blue body, glowing aqua eye accent, orange tail cue. |
| `common_lemon_tetra` | Lemon tetra | Real lemon tetra anatomy: small deep tetra body, translucent fins. Use lemon-yellow body, teal eye/fin accents, simple warm tail cue. |
| `common_glowlight_tetra` | Glowlight tetra | Real glowlight tetra anatomy: small streamlined body and short fins. Use amber body, one coral glow stripe, cyan fin edge. |
| `common_black_neon_tetra` | Black neon tetra | Real black neon tetra anatomy with narrow side stripe. Use deep indigo body, bright aqua stripe, orange tail-tip cue; not gray or dull. |
| `common_xray_tetra` | X-ray tetra | Real pristella/x-ray tetra anatomy: translucent but colorful, deep small body, yellow/black fin identity. Use translucent teal body, gold fin marks, coral tail cue. |
| `common_rummy_nose_tetra` | Rummy nose tetra | Real rummy nose anatomy: slim tetra body, red face, striped tail. Use aqua body, coral red face, simplified striped tail. |
| `common_pearl_danio` | Pearl danio | Real pearl danio anatomy: slim danio body with small fins. Use lavender-blue body, small pearl-like side marks, orange tail cue. |
| `common_celestial_pearl_danio` | Celestial pearl danio | Real CPD anatomy: tiny danio body, orange fins, spotted body. Use deep teal body, simplified golden spots, orange fins. |
| `common_corydoras_panda` | Panda corydoras | Real corydoras anatomy: bottom-fish body, armored plates, whiskers, low mouth. Use warm teal body, dark panda mask, orange tail cue. |
| `common_corydoras_bronze` | Bronze corydoras | Real bronze cory anatomy: rounded armored body, whiskers, low swimmer silhouette. Use bronze-green body, sapphire side sheen, orange tail cue. |
| `common_otocinclus` | Otocinclus | Real oto anatomy: tiny sucker-mouth catfish, slim body, low fins. Use olive-teal body, simple side stripe, warm tail cue. |
| `common_kuhli_loach` | Kuhli loach | Real kuhli loach anatomy: long eel-like body, small head, tiny fins. Use golden-orange body, chocolate bands, teal tail cue. |
| `common_bristlenose_pleco` | Bristlenose pleco | Real pleco anatomy: sucker mouth, broad head, low body, bristle hints. Use deep green body, soft gold spots, readable bottom-fish profile. |
| `common_honey_gourami` | Honey gourami | Real honey gourami anatomy: small oval gourami body, feeler fins, small mouth. Use honey-gold body, teal fin edge, soft orange tail cue. |
| `common_dwarf_rainbowfish` | Dwarf rainbowfish | Real rainbowfish anatomy: arched body, forked tail, small head. Use aqua body, coral side sheen, yellow fin edges. |
| `common_threadfin_rainbowfish` | Threadfin rainbowfish | Real threadfin anatomy: slender body, long threadlike fins. Keep threads natural and readable; use teal body and orange fin accents. |

## Rare Fish Prompts

| ID | Species Reference | Prompt Add-on |
| --- | --- | --- |
| `rare_freshwater_angelfish` | Freshwater angelfish | Real angelfish anatomy: tall triangular body, long dorsal/anal fins, trailing pelvic fins. Premium cue: pearlescent fin edges and refined vertical bands. |
| `rare_discus` | Discus | Real discus anatomy: round flat body, tiny mouth, tall dorsal/anal fins. Premium cue: controlled maze pattern and glassy scale sheen. |
| `rare_koi` | Koi | Real koi anatomy: long carp body, barbels, dorsal fin, forked tail. Premium cue: elegant patch pattern in crimson, teal, and gold while preserving koi silhouette. |
| `rare_betta` | Betta splendens | Real betta anatomy: compact body, correct mouth, natural flowing fins. Premium cue: refined tail edge glow and controlled jewel accents. |
| `rare_mandarin_dragonet` | Mandarin dragonet | Real dragonet anatomy: low head, big pectoral fins, maze pattern, fan tail. Premium cue: simplified pearlescent maze pattern. |
| `rare_pearl_gourami` | Pearl gourami | Real pearl gourami anatomy: oval body, feeler fins, spot pattern. Premium cue: subtle pearl dots and refined fin rays. |
| `rare_dwarf_gourami` | Dwarf gourami | Real dwarf gourami anatomy: compact oval body and feeler fins. Premium cue: controlled blue/red striping and soft rim light. |
| `rare_blue_ram_cichlid` | German blue ram | Real ram cichlid anatomy: compact cichlid body, rounded forehead, spiky dorsal hint. Premium cue: electric cheek marks and pearl body dots. |
| `rare_apistogramma` | Apistogramma cichlid | Real apisto anatomy: small cichlid body, extended dorsal fin, rounded tail. Premium cue: elegant dorsal edge and refined face marks. |
| `rare_electric_blue_acara` | Electric blue acara | Real acara anatomy: oval cichlid body, natural dorsal/anal fins. Premium cue: electric blue scale sheen with controlled contrast. |
| `rare_firemouth_cichlid` | Firemouth cichlid | Real firemouth anatomy: sturdy cichlid body and throat area. Premium cue: glowing coral throat accent and clean fin edges. |
| `rare_kribensis` | Kribensis cichlid | Real kribensis anatomy: small cichlid body, rounded belly, forked tail. Premium cue: magenta belly accent and sapphire fin spots. |
| `rare_clown_loach` | Clown loach | Real clown loach anatomy: long arched loach body, tiny barbels, forked tail. Premium cue: clean bold bands and pearly fin edges. |
| `rare_yoyo_loach` | Yoyo loach | Real yoyo loach anatomy: slim loach body and whiskers. Premium cue: simplified yoyo maze marks and teal fin edge. |
| `rare_hillstream_loach` | Hillstream loach | Real hillstream anatomy: flattened body, broad fins like suction wings. Premium cue: opal spot pattern while keeping bottom-hugging shape. |
| `rare_glass_catfish` | Glass catfish | Real glass catfish anatomy: transparent slim body, whiskers, tiny fins. Premium cue: colorful inner spine glow without making it ghostly object-like. |
| `rare_marble_hatchetfish` | Marble hatchetfish | Real hatchetfish anatomy: deep hatchet belly, upturned mouth, small fins. Premium cue: refined marble pattern and pearlescent belly sheen. |
| `rare_peacock_gudgeon` | Peacock gudgeon | Real gudgeon anatomy: small rounded body, fan fins, eye spot. Premium cue: controlled lavender/yellow pattern and fin eye mark. |
| `rare_boeseamani_rainbowfish` | Boesemani rainbowfish | Real rainbowfish anatomy: arched body and fork tail. Premium cue: two-tone body transition, polished scale sheen. |
| `rare_furcata_rainbowfish` | Forktail blue-eye | Real forktail anatomy: slim body, yellow forked fins. Premium cue: clean forked fin shape and sapphire body sheen. |
| `rare_denison_barb` | Denison barb | Real denison anatomy: torpedo body, red stripe, forked tail. Premium cue: crisp stripe and metallic scale shimmer. |
| `rare_rainbow_shark` | Rainbow shark | Real rainbow shark anatomy: minnow-shark body, triangular fins, fork tail. Premium cue: deep teal body and red-orange fins. |
| `rare_twig_catfish` | Twig catfish | Real twig catfish anatomy: long thin sucker-mouth body. Premium cue: warm olive body, subtle luminous fin edge, no object branch shape. |
| `rare_farlowella` | Farlowella catfish | Real farlowella anatomy: long armored twig-like catfish, sucker mouth. Premium cue: clean silhouette and gold-green scale sheen. |
| `rare_bichir` | Senegal bichir | Real bichir anatomy: elongated prehistoric body, dorsal finlets, rounded tail. Premium cue: polished finlets and emerald-gold body sheen. |
| `rare_ropefish` | Ropefish | Real ropefish anatomy: eel-like body, small pectoral fins, blunt head. Premium cue: clean scale rhythm and teal-gold patterning. |
| `rare_african_butterflyfish` | African butterflyfish | Real topwater butterflyfish anatomy: flat topwater body and wing-like pectorals. Premium cue: natural wing-fin pattern with controlled amber/blue. |
| `rare_golden_wonder_killifish` | Golden wonder killifish | Real killifish anatomy: surface fish body, upturned mouth, rounded fins. Premium cue: gold body with sapphire fin edge. |
| `rare_badis` | Scarlet badis | Real badis anatomy: tiny perch-like body, rounded fins. Premium cue: controlled scarlet/teal bands and polished fin edge. |
| `rare_leaf_fish` | Leaf fish | Real leaf fish anatomy: leaf-shaped body and natural camouflage profile. Premium cue: warm olive/coral pattern, not a literal leaf object. |

## Super Rare Fish Prompts

| ID | Species Reference | Prompt Add-on |
| --- | --- | --- |
| `sr_asian_arowana` | Asian arowana | Real arowana anatomy: long body, large scales, upturned mouth, trailing fins. Super rare cue: opal scale shimmer and elegant red-gold fins. |
| `sr_black_ghost_knifefish` | Black ghost knifefish | Real knifefish anatomy: long blade body, flowing anal fin, tiny tail. Super rare cue: indigo body with cyan edge glow and soft internal sheen. |
| `sr_zebra_pleco` | Zebra pleco | Real zebra pleco anatomy: sucker mouth, armored body, low fins. Super rare cue: high-contrast but colorful sapphire/gold zebra striping, not white. |
| `sr_freshwater_stingray` | Freshwater stingray | Real ray anatomy: flat disc body, eyes on top, trailing tail. Super rare cue: opal spot pattern and subtle aqua rim glow. |
| `sr_elephantnose_fish` | Elephantnose fish | Real elephantnose anatomy: elongated body, downward trunk-like mouth, small fins. Super rare cue: refined luminous side line and copper body. |
| `sr_ornate_bichir` | Ornate bichir | Real ornate bichir anatomy: long body, dorsal finlets, armored scale feel. Super rare cue: opal finlets and naturalized ornate pattern. |
| `sr_freshwater_pipefish` | Freshwater pipefish | Real pipefish anatomy: slender tube body, tiny fins, long snout. Super rare cue: subtle luminous ring pattern and translucent fin edge. |
| `sr_seahorse` | Seahorse | Real seahorse anatomy: upright body, curled tail, horse-like head. Super rare cue: pearlescent belly plates and controlled teal-gold palette. |
| `sr_lionfish` | Lionfish | Real lionfish anatomy: reef body, fan pectorals, dorsal spines. Super rare cue: elegant fin rays and soft coral/cyan glow, not sharp weapon-like. |
| `sr_moorish_idol` | Moorish idol | Real moorish idol anatomy: tall body, long dorsal streamer, banded body. Super rare cue: refined streamer and jewel-toned band treatment. |
| `sr_copperband_butterflyfish` | Copperband butterflyfish | Real butterflyfish anatomy: flat disc body, long snout, vertical bands. Super rare cue: pearlescent bands and translucent fin edges. |
| `sr_royal_gramma` | Royal gramma | Real royal gramma anatomy: small basslet body, rounded fins. Super rare cue: rich purple-yellow transition and soft scale shimmer. |
| `sr_flame_angelfish` | Flame angelfish | Real dwarf angelfish anatomy: compact oval body, dorsal/anal fins. Super rare cue: fiery but controlled red/orange body and sapphire fin edge. |
| `sr_powder_blue_tang` | Powder blue tang | Real tang anatomy: oval surgeonfish body, pointed snout, crescent tail. Super rare cue: saturated blue body and luminous yellow fin edge. |
| `sr_regal_blue_tang` | Regal blue tang | Real tang anatomy: oval body, black side mark, yellow tail. Super rare cue: controlled sapphire body, refined black mark, glowing fin edge. |
| `sr_clown_triggerfish` | Clown triggerfish | Real triggerfish anatomy: sturdy angular body, small mouth, bold spots. Super rare cue: simplified luminous spot pattern, no armor/object look. |
| `sr_marine_betta` | Marine betta/comet | Real marine betta anatomy: reef fish body, long fins, ocellus. Super rare cue: cosmic ocellus and deep indigo body while staying natural. |
| `sr_leafy_seadragon` | Leafy seadragon | Real seadragon anatomy: slender seahorse relative with leaf-like appendages. Super rare cue: elegant natural leaf appendages with opal edge, not decorative armor. |
| `sr_spotted_garden_eel` | Spotted garden eel | Real garden eel anatomy: slender eel body, small head, side-view swimming pose adapted for sprite. Super rare cue: luminous spot rhythm and teal shadow. |
| `sr_ribbon_eel` | Ribbon eel | Real ribbon eel anatomy: long ribbon body, pointed snout, fin ridge. Super rare cue: blue/amber body with soft fin glow, no S-curl. |
| `sr_longhorn_cowfish` | Longhorn cowfish | Real cowfish anatomy: boxy body, small fins, horn-like natural head projections. Super rare cue: golden body and teal spots; horns natural, not crown. |
| `sr_yellow_boxfish` | Yellow boxfish | Real boxfish anatomy: box-shaped living fish body, tiny fins, small mouth. Super rare cue: saturated yellow body with sapphire dot pattern. |
| `sr_porcupine_puffer` | Porcupine puffer | Real puffer anatomy: round body, beak mouth, small fins. Super rare cue: cute rounded form, controlled golden spots, no aggressive spikes. |
| `sr_oranda_goldfish` | Oranda goldfish | Real oranda anatomy: rounded fancy goldfish body, wen head growth, double tail. Super rare cue: opal scale shimmer and refined flowing tail. |
| `sr_ranchu_goldfish` | Ranchu goldfish | Real ranchu anatomy: arched back, no dorsal fin, double tail. Super rare cue: polished rounded body and pearlescent scale highlights. |
| `sr_celestial_eye_goldfish` | Celestial eye goldfish | Real celestial-eye anatomy: rounded goldfish, upward eyes, double tail. Super rare cue: whimsical but natural eyes and luminous fin edges. |
| `sr_flowerhorn_cichlid` | Flowerhorn cichlid | Real flowerhorn anatomy: chunky cichlid body, forehead hump. Super rare cue: controlled pearl speckles and bright face pattern. |
| `sr_red_texas_cichlid` | Red Texas cichlid | Real cichlid anatomy: sturdy oval body, rounded head, dorsal/anal fins. Super rare cue: red body with pearl speckles and soft glow. |
| `sr_panther_grouper_juvenile` | Juvenile panther grouper | Real juvenile grouper anatomy: chunky reef body, high dorsal fin, spotted pattern. Super rare cue: stylized dark body with luminous teal spots. |
| `sr_dragon_wrasse_juvenile` | Juvenile dragon wrasse | Real juvenile wrasse anatomy: slender reef body, flowing fin edges, fork tail. Super rare cue: naturalized fin flow and opal side marks. |
