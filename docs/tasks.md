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
- [ ] Add data-driven content tables for upgrades, events, daily goals, compatibility, and economy constants.
- [ ] Expand content validation for assets, compatibility references, localization keys, and event-only rules.
- [ ] Add save schema versioning.
- [ ] Add save migrations.
- [ ] Add autosave for purchases, sales, placement, collection, feeding, cleaning, age-up, and settings changes.

## Phase 2: Economy And Store

- [x] Replace single coin counter with common, rare, and super rare wallet state.
- [x] Add wallet UI for all three coin types.
- [ ] Add coin production tables by fish type, age, rarity, mood, health, cleanliness, compatibility, decoration, and event modifiers.
- [ ] Add production caps for per-fish uncollected coins and per-tank offline earnings.
- [ ] Add visual merging for many pending coin drops.
- [ ] Add shop rarity lanes: common, rare, and super rare.
- [ ] Add store filtering and sorting for large fish catalogs.
- [ ] Show item locked reason, owned count, price, coin type, rarity, production preview, food need, and compatibility tags.
- [ ] Handle insufficient currency, full tank, full inventory, store rotations, and expired event shop items.

## Phase 3: Fish Lifecycle

- [x] Make all fish start as babies.
- [x] Add age stages: baby, juvenile, adult, elder, and master.
- [x] Add active-play age-up rules.
- [ ] Add offline age-up rules.
- [ ] Add age-based size, food need, mood cycle, production table, sell value, and compatibility tolerance.
- [ ] Add clear age-up visual moment.
- [ ] Add fish details view with age, rarity, mood, hunger, health, food need, production, compatibility, and sell value.
- [x] Add fish selling from tank.
- [ ] Add fish selling from inventory.
- [ ] Add sell confirmation for rare, super rare, and event-only fish.
- [ ] Protect the final tutorial fish from being sold.

## Phase 4: Food, Mood, And Health

- [ ] Add food types: micro, basic, premium, herb, protein, coral, medicine, and event.
- [ ] Add species-specific required and preferred food types.
- [ ] Add wrong-food rejection and wrong-food partial effects.
- [ ] Add food expiration and cleanliness penalty.
- [ ] Add mood cycle separate from hunger and health.
- [ ] Add mood smoothing so state does not flicker.
- [ ] Add clearer fish state indicators for happy, hungry, and ill.
- [ ] Add medicine behavior that helps health without becoming optimal everyday food.

## Phase 5: Tank Systems

- [ ] Implement tank cleanliness decay.
- [ ] Add cleaning action, cleaning cooldown/cost, and low-cleanliness warning.
- [ ] Add tank happiness calculation.
- [ ] Add decoration happiness bonuses.
- [ ] Add decoration habitat tags and collection set bonuses.
- [ ] Add tank capacity rules for fish slots and decoration footprint.
- [ ] Add overcrowding effects on happiness and cleanliness.
- [ ] Add compatibility score formula and thresholds.
- [ ] Add incompatible species placement warning and confirmation.
- [ ] Recalculate compatibility when fish, decorations, biome, age, or crowding changes.

## Phase 6: Progression And Retention

- [ ] Add first-time user experience flow: starter baby fish, first feeding, first coin, first decoration.
- [ ] Add collection album for owned, locked, event-only, age mastery, and discovery hints.
- [ ] Add fish rarity progression.
- [ ] Add daily goals and rewards.
- [ ] Add offline return summary.
- [ ] Add offline progress with capped coins, hunger, cleanliness, growth, and gentle illness risk.
- [ ] Add offline clock-abuse safeguards.
- [ ] Add event-only fish acquisition.
- [ ] Add event rerun or alternate acquisition path for expired event fish.
- [ ] Add discovery recipes.
- [ ] Add visitor fish.
- [ ] Add species mastery rewards.
- [ ] Add photo moments.
- [ ] Add second tank support for incompatible species.

## Phase 7: Production Mobile

- [ ] Add required screens: tank, store, inventory, fish details, placement confirmation, sell confirmation, collection album, daily goals, offline summary, and settings.
- [ ] Add safe-area handling for notches and home indicators.
- [ ] Test portrait layout on 390x844, 393x852, 412x915, and 430x932.
- [ ] Add native/mobile packaging path, such as Capacitor or platform-specific wrapper.
- [ ] Add optional gentle notification flow.
- [ ] Add accessibility support: large targets, contrast, icon plus text states, reduced motion, separate audio controls.
- [ ] Add localization-ready strings and test longer localized text.
- [ ] Add privacy-conscious analytics events.
- [ ] Add mobile performance budgets and object caps.
- [ ] Add sound effects and richer animation polish.

## Phase 8: QA And Regression

- [ ] Expand regression tests for multi-currency wallet and coin collection.
- [x] Expand regression tests for wallet, baby fish, common coin production, and placed-fish selling.
- [ ] Expand regression tests for sell protections.
- [ ] Expand regression tests for age-up and age-based production.
- [ ] Expand regression tests for wrong-food rejection.
- [ ] Expand regression tests for species compatibility effects.
- [ ] Expand regression tests for save/load.
- [ ] Expand regression tests for offline progress caps.
- [ ] Expand regression tests for old save migration.
- [x] Add content validation to `npm test`.
- [ ] Keep visual browser QA as part of every UI/gameplay change.
- [ ] Maintain screenshot artifacts for key portrait layouts.

## Done

- [x] Created documentation files.
- [x] Created game specification document.
- [x] Created mechanics specification document.
- [x] Scaffolded Vite + Phaser + TypeScript project.
- [x] Created the main tank scene.
- [x] Added player coin economy MVP.
- [x] Added store MVP for fish, fish food, and decorations.
- [x] Allowed fish placement inside the tank.
- [x] Implemented fish states: hungry, ill, happy.
- [x] Implemented fish movement around the tank.
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
