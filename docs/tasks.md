# Tasks

## In Progress

- [x] Try replacing three procedural fish with custom styled textures for common, rare, and super rare validation.
- [x] Generate and integrate real PNG raster assets for Goldfish, Angelfish, and Celestial Koi.
- [x] Regenerate Goldfish, Pearl Gourami, Corydoras, Angelfish, Cleaner Shrimp, and Feeder Snail with stricter stylized sprite prompts.
- [x] Show fish images on every Store fish card using PNG sprites or fallback previews.
- [x] Tighten fish generation prompts to avoid realistic stock-art output and enforce straight tails.
- [x] Add fish asset-generation plan with shared art DNA and per-species prompts for all 50 catalog fish.
- [x] Generate and apply runtime PNG assets for all 50 fish types.
- [x] Generate and apply runtime PNG assets for every food, medicine, event treat, and coin type.
- [x] Generate and apply runtime PNG assets for menu icons, helper creatures, and expanded decorations.
- [x] Generate and apply a runtime PNG aquarium floor asset.
- [x] Retint the aquarium floor back toward yellow sand while preserving an underwater blue wash.
- [x] Remove the raster floor image from the active tank view for visual comparison.
- [x] Remove the remaining solid floor band so the underwater background reaches the bottom edge.
- [x] Generate and restore a transparent wavy sandy floor PNG instead of a solid rectangle.
- [x] Generate and apply a runtime PNG distant underwater tank background asset.
- [x] Generate and apply a fantasy aquarium backdrop matching the new reference direction.
- [x] Generate and apply fantasy HUD panel, circular menu button, food pedestal, and coin sparkle trail PNG assets.
- [x] Generate and apply a shared reusable glass bubble button frame for every tank menu and food icon.
- [x] Apply verified runtime assets from `docs/prompt.json` via the `create-assets` workflow.
- [x] Replace the tank background, distant silhouettes, wavy foreground sand, coin pickups, bubble button states, HUD panel, and eight decoration PNGs from the prompt pack.
- [x] Reject generated prompt-pack outputs with wrong subjects or baked matte/checker artifacts instead of shipping them.
- [x] Generate and apply a transparent PNG dirty-water overlay for tanks below 20% cleanliness.
- [x] Convert image-generated chroma-key source PNGs into transparent runtime assets without procedural placeholder generation.
- [x] Add lightweight fish swimming animation with subtle shimmer, rotation, reduced bobbing, and chase-state intensity.
- [x] Add independent fish tail wag animation for PNG and fallback fish sprites.
- [x] Remove separate tail overlay rendering from PNG fish so generated sprites keep clean silhouettes.
- [x] Expand decoration shop options across common, rare, and super rare lanes.
- [x] Add Store catalog previews for food, decorations, and helper creatures.
- [x] Add regression asset-coverage checks and visual contact-sheet artifacts for the full asset pack.
- [x] Add high-DPI canvas rendering so the portrait game no longer looks like a stretched low-resolution canvas on retina/mobile screens.
- [x] Add owned fish statistics page with type, age, worth, gender, and sell/breed actions.
- [x] Add fish gender to owned fish state and saves.
- [x] Add same-species M/F breeding with 70% same species and 30% rare age-zero outcome.
- [ ] Balance breed pacing for production.

## Phase 1: Foundations

- [x] Extract current MVP from monolithic `main.ts` into constants, economy helpers, objects, and scene modules.
- [ ] Split remaining UI rendering into focused UI modules.
- [ ] Split gameplay orchestration into focused systems.
- [x] Add initial data-driven content tables for fish, food, and decorations.
- [x] Add shared mechanics types: `Rarity`, `CoinType`, `AgeStage`, `FishState`, `FoodType`, `Wallet`, and `Price`.
- [x] Add content validation for unique IDs, rarity, prices, food references, production tables, and core numeric fields.
- [ ] Add data-driven content tables for utility items, events, daily goals, community tank bonuses, and economy constants.
- [x] Expand content validation for community-safe species references.
- [x] Expand regression coverage for runtime asset availability.
- [ ] Expand content validation for asset files, localization keys, and event-only rules.
- [x] Add save schema versioning.
- [x] Add save migrations.
- [x] Add autosave for current MVP purchases, sales, placement, collection, and feeding.
- [ ] Extend autosave to cleaning, explicit age-up moments, settings changes, migrations, and future screens.

## Phase 2: Economy And Store

- [x] Replace single coin counter with common, rare, and super rare wallet state.
- [x] Add wallet UI for all three coin types.
- [ ] Add coin production tables by fish type, age, rarity, mood, health, cleanliness, decoration, and event modifiers.
- [ ] Add production caps for per-fish uncollected coins and per-tank offline earnings.
- [x] Add MVP offline earnings cap for restored saves.
- [ ] Add visual merging for many pending coin drops.
- [x] Add shop rarity lanes: common, rare, and super rare.
- [x] Add store filtering by coin lane for large fish, food, decoration, and helper catalogs.
- [ ] Add store sorting controls for large fish catalogs.
- [x] Add 50 store fish with tank-level catalog categorization.
- [x] Add fish-tier browsing to the shop catalog.
- [ ] Show item locked reason, owned count, price, coin type, rarity, production preview, food need, and community-safe tags.
- [ ] Handle insufficient currency, full tank, full inventory, store rotations, and expired event shop items.

## Phase 3: Fish Lifecycle

- [x] Make all fish start as babies.
- [x] Add age stages: baby, juvenile, adult, elder, and master.
- [x] Add active-play age-up rules.
- [x] Add MVP offline age-up rules.
- [x] Convert fish age to fish-time where 1 real hour equals 1 fish month.
- [x] Convert minute-scale playtime into fish-day age labels.
- [x] Keep fish visual size growing until 50 fish-years.
- [x] Retune age-only fish sizing so four-month fish are much larger than new fish.
- [x] Redefine fish growth formula so early age differences stay visually readable across species.
- [x] Replace tank-size growth-blocking with a global 50%-of-screen fish visual size cap.
- [x] Remove growth-blocked indicators and larger-tank prompts from the current isolated-tank design.
- [x] Add age-rooted fish length and weight stats to Book fish cards.
- [x] Scale hunger growth and meal calorie need from age-rooted fish size.
- [ ] Add age-based size, food need, mood cycle, production table, sell value, and comfort tolerance.
- [x] Add owned fish gender.
- [x] Remove player-facing fish size category labels: baby, small, med, big, and max.
- [x] Add continuous adult growth toward a very-big size cap.
- [x] Make fish visual size scale directly from exact age instead of size categories.
- [x] Add breeding for M/F same-species pairs.
- [ ] Add clear age-up visual moment.
- [x] Add fish details view with age, rarity, mood, hunger, health, food need, production, community status, and sell value.
- [x] Add fish selling from tank.
- [x] Add fish selling from owned fish statistics page.
- [ ] Add fish selling from inventory.
- [x] Add sell confirmation for rare, super rare, and event-only fish.
- [x] Protect the final tutorial fish from being sold.
- [x] Raise placed-fish sell values so selling feels like a useful economy action.
- [x] Scale fish sell value from age, rarity, production, size, resilience, health, and hunger.

## Phase 4: Food, Mood, And Health

- [x] Add food types: micro, basic, premium, herb, protein, coral, medicine, and event.
- [x] Add species-specific required and preferred food types.
- [x] Add food density levels and calorie values.
- [x] Make higher-calorie food satisfy larger fish better than starter food.
- [x] Add wrong-food rejection and wrong-food partial effects.
- [x] Add food cleanup cleanliness penalty.
- [x] Replace food/medicine toggles with drag-from-left-tool-drop gestures.
- [x] Add medicine behavior that heals nearby ill fish without becoming optimal everyday food.
- [x] Allow ill fish to keep producing slower reduced `+1` coin drops.
- [x] Add 60-minute continuous hungry/sick death timer with reset on recovery.
- [x] Add 15-second expiration for unconsumed food, herbs, medicine, and pills.
- [ ] Add mood cycle separate from hunger and health.
- [ ] Add mood smoothing so state does not flicker.
- [x] Add chat-bubble fish state emoji for hungry, timed post-eat happy, sick, and short angry feedback after a missed food chase.

## Phase 5: Tank Systems

- [x] Implement tank cleanliness decay.
- [x] Add cleaning action and low-cleanliness health pressure.
- [ ] Add cleaning cooldown/cost.
- [x] Add tank happiness calculation.
- [x] Add decoration happiness bonuses.
- [x] Let placed decorations be dragged to reposition or dropped on a trash target to remove.
- [x] Add purchasable bottom helper creatures that collect coins and clean wasted food/medicine.
- [x] Add purchasable helper creature that helps feed hungry fish using stocked food.
- [x] Add helper creature cards to Book/Album with sell actions to free helper capacity.
- [ ] Add decoration habitat tags and collection set bonuses.
- [x] Add isolated multi-tank state where each tank has separate fish, helpers, decorations, food, coins, cleanliness, happiness, and worth.
- [x] Cap owned tanks at five.
- [x] Remove manual tank upgrades; tank level now derives from tank net worth.
- [x] Remove fish transfer between tanks.
- [x] Remove fish purchase/placement gates by tank level.
- [x] Remove tank zoom mechanics; all tanks use the same full-screen portrait viewport.
- [x] Keep dropped food and coin pickup visuals screen-consistent under the fixed tank viewport.
- [x] Replace the flat tank floor rectangle with a raster PNG aquarium floor texture and fallback.
- [x] Add a low-distraction distant underwater raster background as the tank backdrop.
- [x] Remove per-tank-level procedural background overlays.
- [x] Add tank need indicator copy for fish, food, coins, cleaning, helpers, and additional tanks.
- [x] Add overcrowding effects on happiness and cleanliness.
- [x] Add MVP community tank score.
- [x] Remove incompatible species penalties so all fish can share one tank.
- [x] Recalculate community tank status when fish or decorations change.
- [ ] Extend community tank bonuses to biome, age tolerance, and decoration set bonuses.

## Phase 6: Progression And Retention

- [ ] Add first-time user experience flow: starter age-zero fish, first feeding, first coin, first decoration.
- [x] Add MVP collection album for owned, locked, rarity, food hints, and mastery hint.
- [ ] Add fish rarity progression.
- [x] Add MVP daily goals and rewards.
- [x] Add minute-selectable Auto Feeder and Auto Coin Collector rentals as short-session boosters.
- [x] Add MVP offline return summary in the tank status line.
- [x] Add MVP offline progress with capped coins, hunger, growth, and gentle illness risk.
- [x] Add total wealth statistic for wallet, fish, inventory, and waiting coin value.
- [x] Make tank statistics visible in a dedicated compact HUD panel.
- [x] Add compact visual number formatting for large wallet, price, reward, stock, and statistic values.
- [x] Extend offline progress to cleanliness and a dedicated return screen.
- [ ] Extend offline progress to decorations and community tank bonuses.
- [ ] Add offline clock-abuse safeguards.
- [ ] Add event-only fish acquisition.
- [ ] Add event rerun or alternate acquisition path for expired event fish.
- [x] Add MVP breeding as a non-store baby acquisition path.
- [ ] Add discovery recipes.
- [ ] Add visitor fish.
- [ ] Add species mastery rewards.
- [ ] Add photo moments.
- [x] Add multi-tank support for isolated themed collections.

## Phase 7: Production Mobile

- [x] Add required MVP screens: tank, store, care/inventory, fish details, sell confirmation, collection album, daily goals, offline summary, and settings.
- [x] Add owned fish statistics page under Book/Album.
- [x] Show compact fish age on Book/Album owned fish cards.
- [x] Show fish length and weight on Book/Album owned fish cards.
- [x] Make the tank the full-screen primary play surface in portrait mode.
- [x] Replace tab-like global navigation with individual icon buttons for Store, Care, Album, Goals, and Settings.
- [x] Skin tank HUD and side controls with generated fantasy aquarium UI assets.
- [x] Use one reusable transparent-center bubble frame for both right menu buttons and left food/medicine tool buttons.
- [x] Preserve tank taps, coin collection, and decoration drag coordinates under high-DPI rendering.
- [x] Remove risky/incompatible placement confirmation from the current community-tank flow.
- [x] Add safe-area handling for notches and home indicators.
- [x] Test portrait layout on 390x844, 393x852, 412x915, and 430x932.
- [x] Add documented native/mobile packaging path.
- [x] Add optional gentle notification setting without prompting yet.
- [ ] Add accessibility support: larger final hit targets, contrast audit, icon plus text states, reduced motion, separate audio controls.
- [ ] Add localization-ready strings and test longer localized text.
- [ ] Add privacy-conscious analytics events.
- [ ] Add mobile performance budgets and object caps.
- [ ] Add sound effects and richer animation polish.

## Phase 8: QA And Regression

- [x] Expand regression tests for multi-currency wallet, coin collection, and the common-to-rare currency bridge.
- [x] Expand regression tests for wallet, age-zero fish, common coin production, and placed-fish selling.
- [x] Expand regression tests for sell protections.
- [x] Expand regression tests for real-time fish age conversion and 50-year growth cap.
- [ ] Expand regression tests for age-up and age-based production.
- [x] Expand regression tests for gender, exact age, breeding, and selling from the fish statistics page.
- [x] Expand regression tests for helper creatures appearing in Book/Album and selling from that page.
- [ ] Expand regression tests for wrong-food rejection.
- [x] Expand regression tests for community-safe mixed-species behavior.
- [x] Expand regression tests for the 50-fish catalog, isolated multi-tank state, tank-slot purchase flow, and tank wealth.
- [x] Expand regression tests for save/load.
- [x] Expand regression tests for offline progress caps.
- [x] Expand regression tests for timed auto feeder and auto coin collector rentals, including selected duration and scaled prices.
- [x] Raise timed rental duration cap to 60 minutes.
- [x] Allow active rental purchases to extend existing Auto Feeder and Auto Coin Collector timers.
- [ ] Expand regression tests for old save migration.
- [x] Add content validation to `npm test`.
- [x] Keep visual browser QA as part of every UI/gameplay change.
- [x] Add regression coverage that fish sprites visibly animate while swimming.
- [x] Add regression coverage that fish tail wag changes while swimming.
- [x] Add regression coverage that food and coin pickup sizing stays stable with the fixed tank viewport.
- [x] Add regression coverage for the aquarium floor PNG asset loading.
- [x] Add regression coverage for the distant underwater tank background PNG asset loading.
- [x] Add regression coverage for the dirty tank overlay threshold and screenshot artifact.
- [x] Visually align the tank HUD and side controls to the supplied premium aquarium layout reference.
- [ ] Maintain screenshot artifacts for key portrait layouts.

## Done

- [x] Created documentation files.
- [x] Created game specification document.
- [x] Created mechanics specification document.
- [x] Scaffolded Vite + Phaser + TypeScript project.
- [x] Created the main tank scene.
- [x] Added player coin economy MVP.
- [x] Added store MVP for fish, fish food, and decorations.
- [x] Added common, rare, and super rare Store lane filters with balanced item pricing.
- [x] Added food shop quantity controls for multi-buy purchases.
- [x] Added one-tap food bulk-buy presets for x1, x10, x20, x30, and x50.
- [x] Changed food bulk-buy presets into additive buttons and removed plus/minus quantity controls.
- [x] Added a food bulk-buy reset button that returns quantity to x1.
- [x] Removed shop-side Use, Place, Stats, and No Evo secondary buttons.
- [x] Allowed fish placement inside the tank.
- [x] Implemented fish states: hungry, ill, happy.
- [x] Implemented fish movement around the tank.
- [x] Tuned fish movement so larger grown fish move slower than babies.
- [x] Allowed player to drop food into the tank.
- [x] Made hungry fish seek and eat food.
- [x] Added coin drops from fish.
- [x] Allowed player to collect dropped coins.
- [x] Added fish growth over time with max size per fish type.
- [x] Added decoration placement.
- [x] Converted game layout to mobile portrait mode.
- [x] Replaced desktop side panel with bottom tab controls.
- [x] Added regression smoke test for fish, food, coins, and decorations.
- [x] Fixed selected tab highlight when switching bottom tabs.
- [x] Added `.gitignore`.
- [x] Created initial git commit.
- [x] Added local save/load with schema versioning and autosave.
- [x] Added capped offline return rewards and offline fish growth/hunger progression.
- [x] Added regression coverage for save restore and offline return.
- [x] Added typed food inventory and species food acceptance rules.
- [x] Added mobile screen navigation for store, care, album, goals, and settings.
- [x] Added fish details, sell confirmation, offline summary, tank cleanliness, tank happiness, cleaning, capacity, and daily goals.
- [x] Added portrait screenshot regression artifacts for Phase 7 target viewports.
- [x] Added Betta as a fourth store fish, then converted it to the same community-safe tank rules.
- [x] Added final-fish protection and rare-fish sell confirmation regression coverage.
