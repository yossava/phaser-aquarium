# Tasks

## In Progress

- None.

## Phase 1: Foundations

- [x] Extract current MVP from monolithic `main.ts` into constants, economy helpers, objects, and scene modules.
- [ ] Split remaining UI rendering into focused UI modules.
- [ ] Split gameplay orchestration into focused systems.
- [x] Add initial data-driven content tables for fish, food, and decorations.
- [x] Add shared mechanics types: `Rarity`, `CoinType`, `AgeStage`, `FishState`, `FoodType`, `Wallet`, and `Price`.
- [x] Add content validation for unique IDs, rarity, prices, food references, production tables, and core numeric fields.
- [ ] Add data-driven content tables for upgrades, events, daily goals, community tank bonuses, and economy constants.
- [x] Expand content validation for community-safe species references.
- [ ] Expand content validation for assets, localization keys, and event-only rules.
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
- [ ] Add shop rarity lanes: common, rare, and super rare.
- [ ] Add store filtering and sorting for large fish catalogs.
- [x] Add 50 store fish with tank-level catalog categorization.
- [x] Add fish-tier browsing to the shop catalog.
- [ ] Show item locked reason, owned count, price, coin type, rarity, production preview, food need, and community-safe tags.
- [ ] Handle insufficient currency, full tank, full inventory, store rotations, and expired event shop items.

## Phase 3: Fish Lifecycle

- [x] Make all fish start as babies.
- [x] Add age stages: baby, juvenile, adult, elder, and master.
- [x] Add active-play age-up rules.
- [x] Add MVP offline age-up rules.
- [ ] Add age-based size, food need, mood cycle, production table, sell value, and comfort tolerance.
- [ ] Add clear age-up visual moment.
- [x] Add fish details view with age, rarity, mood, hunger, health, food need, production, community status, and sell value.
- [x] Add fish selling from tank.
- [ ] Add fish selling from inventory.
- [x] Add sell confirmation for rare, super rare, and event-only fish.
- [x] Protect the final tutorial fish from being sold.
- [x] Raise placed-fish sell values so selling feels like a useful economy action.
- [x] Scale fish sell value from age, rarity, production, size, resilience, health, and hunger.

## Phase 4: Food, Mood, And Health

- [x] Add food types: micro, basic, premium, herb, protein, coral, medicine, and event.
- [x] Add species-specific required and preferred food types.
- [x] Add wrong-food rejection and wrong-food partial effects.
- [x] Add food cleanup cleanliness penalty.
- [x] Add right-side food tool toggles so a selected food drops on the next tank tap.
- [x] Add medicine behavior that heals nearby ill fish without becoming optimal everyday food.
- [x] Allow ill fish to keep producing slower reduced `+1` coin drops.
- [ ] Add food expiration over time.
- [ ] Add mood cycle separate from hunger and health.
- [ ] Add mood smoothing so state does not flicker.
- [ ] Add clearer fish state indicators for happy, hungry, and ill.

## Phase 5: Tank Systems

- [x] Implement tank cleanliness decay.
- [x] Add cleaning action and low-cleanliness health pressure.
- [ ] Add cleaning cooldown/cost.
- [x] Add tank happiness calculation.
- [x] Add decoration happiness bonuses.
- [ ] Add decoration habitat tags and collection set bonuses.
- [x] Add tank capacity rules for 10 fish slots and decoration count.
- [x] Add tank level upgrades from L1-L5.
- [x] Gate fish purchase and placement by tank level while allowing lower-level fish in higher-level tanks.
- [x] Add tank need indicator copy for fish, food, coins, and upgrades.
- [x] Add overcrowding effects on happiness and cleanliness.
- [x] Add MVP community tank score.
- [x] Remove incompatible species penalties so all fish can share one tank.
- [x] Recalculate community tank status when fish or decorations change.
- [ ] Extend community tank bonuses to biome, age tolerance, and decoration set bonuses.

## Phase 6: Progression And Retention

- [ ] Add first-time user experience flow: starter baby fish, first feeding, first coin, first decoration.
- [x] Add MVP collection album for owned, locked, rarity, food hints, and mastery hint.
- [ ] Add fish rarity progression.
- [x] Add MVP daily goals and rewards.
- [x] Add minute-selectable Auto Feeder and Auto Coin Collector rentals as short-session boosters.
- [x] Add MVP offline return summary in the tank status line.
- [x] Add MVP offline progress with capped coins, hunger, growth, and gentle illness risk.
- [x] Add total wealth statistic for wallet, fish, inventory, and waiting coin value.
- [x] Extend offline progress to cleanliness and a dedicated return screen.
- [ ] Extend offline progress to decorations and community tank bonuses.
- [ ] Add offline clock-abuse safeguards.
- [ ] Add event-only fish acquisition.
- [ ] Add event rerun or alternate acquisition path for expired event fish.
- [ ] Add discovery recipes.
- [ ] Add visitor fish.
- [ ] Add species mastery rewards.
- [ ] Add photo moments.
- [ ] Add second tank support for themed collections.

## Phase 7: Production Mobile

- [x] Add required MVP screens: tank, store, care/inventory, fish details, sell confirmation, collection album, daily goals, offline summary, and settings.
- [x] Make the tank the full-screen primary play surface in portrait mode.
- [x] Replace tab-like global navigation with individual icon buttons for Store, Care, Album, Goals, and Settings.
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

- [ ] Expand regression tests for multi-currency wallet and coin collection.
- [x] Expand regression tests for wallet, baby fish, common coin production, and placed-fish selling.
- [x] Expand regression tests for sell protections.
- [ ] Expand regression tests for age-up and age-based production.
- [ ] Expand regression tests for wrong-food rejection.
- [x] Expand regression tests for community-safe mixed-species behavior.
- [x] Expand regression tests for 50-fish catalog, tank level gating, tank upgrade, and total wealth.
- [x] Expand regression tests for save/load.
- [x] Expand regression tests for offline progress caps.
- [x] Expand regression tests for timed auto feeder and auto coin collector rentals, including selected duration and scaled prices.
- [x] Raise timed rental duration cap to 60 minutes.
- [x] Allow active rental purchases to extend existing Auto Feeder and Auto Coin Collector timers.
- [ ] Expand regression tests for old save migration.
- [x] Add content validation to `npm test`.
- [x] Keep visual browser QA as part of every UI/gameplay change.
- [ ] Maintain screenshot artifacts for key portrait layouts.

## Done

- [x] Created documentation files.
- [x] Created game specification document.
- [x] Created mechanics specification document.
- [x] Scaffolded Vite + Phaser + TypeScript project.
- [x] Created the main tank scene.
- [x] Added player coin economy MVP.
- [x] Added store MVP for fish, fish food, and decorations.
- [x] Added food shop quantity controls for multi-buy purchases.
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
