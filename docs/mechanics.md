# Mechanics

## Game State

The game should track:

- Save schema version.
- Common coins.
- Rare coins.
- Super rare coins.
- Food inventory.
- Fish inventory.
- Placed fish.
- Decoration inventory.
- Placed decorations.
- Tank cleanliness.
- Tank happiness.
- Last saved timestamp.
- Settings.
- Daily goal progress.
- Collection album progress.

## Data Contracts

Core game data should be data-driven.

```ts
type Rarity = "common" | "rare" | "superRare";
type CoinType = "common" | "rare" | "superRare";
type AgeStage = "baby" | "juvenile" | "adult" | "elder" | "master";
type FishState = "happy" | "hungry" | "ill";
type FoodType = "micro" | "basic" | "premium" | "herb" | "protein" | "coral" | "medicine" | "evolve" | "event";
type FishGender = "M" | "F";

type Wallet = Record<CoinType, number>;

type Price = {
  coinType: CoinType;
  amount: number;
};
```

Production data files should exist for:

- Fish types.
- Food types.
- Decoration types.
- Upgrade types.
- Events.
- Daily goal templates.
- Community tank rules.
- Economy balance constants.

The game code should consume these tables rather than hard-coding shop and fish behavior.

## Currencies

There are three production currencies:

- Common coins.
- Rare coins.
- Super rare coins.

Coin visuals:

- Common coins use gold sprite and label colors.
- Rare coins use aqua-blue sprite and label colors.
- Super rare coins use magenta-purple sprite and label colors.
- Coin type color must remain readable over the tank floor and water.

Currency rules:

- Fish can produce one or more coin types.
- Coin production depends on species, rarity, age, mood, health, hunger, cleanliness, and decorations.
- Common items cost common coins.
- Rare items cost rare coins.
- Super rare items cost super rare coins.
- Higher-rarity fish may still produce lower-rarity coins as a secondary output.
- Lower-rarity fish should rarely produce higher-rarity coins unless boosted by an event or special decoration.

Suggested production model:

```ts
type CoinProduction = {
  coinType: CoinType;
  amount: number;
  intervalSeconds: number;
  chance: number;
};
```

Example:

- Age-zero Goldfish: common coin only, low amount, short interval.
- Adult Angelfish: common coins plus occasional rare coins.
- Elder Event Dragonfish: rare coins plus occasional super rare coins.

Production formula:

```ts
effectiveProduction =
  baseProduction *
  ageMultiplier *
  moodMultiplier *
  healthMultiplier *
  cleanlinessMultiplier *
  communityTankMultiplier *
  decorationMultiplier *
  eventMultiplier;
```

Production caps:

- Per-fish uncollected coins have a cap.
- Per-tank offline earnings have a cap.
- Higher-rarity coin generation must have stricter caps.
- Coin drops should merge visually when many drops are pending.

## Fish Types

Each fish type should define:

- ID.
- Display name.
- Tank level requirement.
- Price.
- Rarity.
- Acquisition sources.
- Sell value rules.
- Starting size.
- Maximum size.
- Age curve.
- Growth rate.
- Hunger rate.
- Required or preferred food type.
- Mood cycle profile.
- Base movement speed.
- Size-based movement multiplier where larger growth stages move slower.
- Coin production table.
- Favorite food.
- Preferred decoration or habitat.
- Compatible species.
- Community-safe species mix.
- Water or habitat requirements.
- Illness resistance.

Rarity values:

- Common.
- Rare.
- Super rare.

Store design should allow a very large fish catalog through filters:

- Tank level.
- Rarity.
- Species family.
- Food type.
- Habitat.
- Coin production type.
- Owned/unowned.
- Event-only.

The store can rotate featured fish while the full catalog remains discoverable through progression, events, and collection goals.

Suggested fish type shape:

```ts
type FishType = {
  id: string;
  name: string;
  speciesFamily: string;
  tankLevel: number;
  rarity: Rarity;
  price?: Price;
  acquisitionSources: string[];
  sellBaseValue: Price;
  requiredFoodTypes: FoodType[];
  preferredFoodTypes: FoodType[];
  habitatTags: string[];
  compatibleSpecies: string[];
  incompatibleSpecies: string[]; // kept empty in the current community-tank design
  ageCurve: Record<AgeStage, {
    durationSeconds: number;
    scale: number;
    hungerMultiplier: number;
    moodCycleSeconds: number;
    production: CoinProduction[];
  }>;
};
```

## Tank Level Progression

The player has one active tank level from 1 to 5.

- Fish have a `tankLevel` requirement.
- A fish can enter the tank when `fish.tankLevel <= currentTankLevel`.
- Lower-level fish remain valid in higher-level tanks.
- Higher-level fish cannot be purchased or placed until the tank is upgraded.
- The shop shows fish by tank tier so the catalog stays readable on portrait screens.
- The HUD shows total wealth and the tank need indicator suggests the next useful purchase or upgrade.
- Each tank level has a distinct procedural background pattern: lagoon ripples, kelp stripes, coral diamonds, deep currents, and starlit reef.

## Fish Instance State

Each placed fish should track:

- Unique ID.
- Fish type ID.
- Gender: male or female.
- Evolution stage from 0 to 3.
- Age stage.
- Position.
- Target position.
- Size.
- Hunger.
- Health.
- Happiness.
- State: happy, hungry, ill.
- Growth progress.
- Last coin drop time.
- Last fed time.
- Mood cycle offset.
- Community-tank score.

Fish visual language:

- Fish tail tint should match the color of its primary preferred food, so players can map fish to food quickly without changing body identity.
- Food drops and food shop cards should use the same color language.
- Fish rarity should be visible as one, two, or three small stars near the fish status bars.
- Fully grown fish should show a compact max-growth marker near the status bars.
- Fish should show compact chat-bubble emoji feedback above their status bars: hungry persists until eating, happy appears briefly after eating, sick persists until healed, and tank-too-small-to-grow persists until upgrading.
- Sick fish should keep a recognizable body color with mild desaturation instead of turning colorless gray.

## Age Stages

All fish start at age zero.

Age uses fish-time rather than literal wall-clock labels:

- 1 real hour equals 1 fish month.
- Real minutes convert into fish-days, using a 30-day fish month.
- 12 real hours equals 1 fish year.
- Fish visual size is based solely on exact age: early months grow fast enough to be visibly readable, reaching the main species size around 6 months, then long-tail growth continues until 50 fish-years and reaches the very-big cap.
- Tank size can cap visible growth. Smaller tanks stop oversized fish before their natural age size; upgrading increases the growth allowance up to roughly half the screen width at the highest tank level.
- Biological length and weight are derived from exact fish-time age and species scale. Displayed length uses a 10x fantasy centimeter scale, so a biological readout that would feel like `5.9 cm` is shown as `59 cm`. They do not use visible tank-capped size, so the Book can still show the fish's true age-rooted size when the tank is too small for visible growth.
- Growth-blocked fish should show a compact marker above their status bars and should make the tank need indicator recommend a bigger tank.
- Player-facing UI should not show size categories such as baby, small, medium, big, or max.

Internal lifecycle stages, used for production and care tuning but not shown as player-facing size categories:

- Baby.
- Juvenile.
- Adult.
- Elder.
- Master, optional long-term capstone.

Age affects:

- Size.
- Continuous adult growth toward a very-big visual cap.
- Food need.
- Food type sensitivity.
- Mood cycle length.
- Coin production type.
- Coin production amount.
- Coin production interval.
- Sell value.
- Community-tank tolerance.

Suggested behavior:

- Age-zero fish need frequent, cheaper feeding and produce little.
- Juvenile fish grow quickly and begin normal production.
- Adult fish are stable producers.
- Elder fish produce better rewards but may need more specific care.
- Master fish unlock collection bonuses, special looks, or breeding/discovery bonuses later.

## Evolution

Fish can evolve up to three times.

- Every fish starts at evolution stage 0.
- Successful evolution increases the stage by 1.
- After a successful evolution, age resets to zero so players can grow the fish again.
- Evolution requires an owned Evolve Pill plus the fish's evolution fee.
- Evolve Pill is a rare shop item and is used from the fish statistics page, not dropped into the tank.
- Current MVP chance: 50% success and 50% death.
- Evolution should increase long-term worth and production potential enough to feel exciting, but the death risk should be clear before production release.
- Stage 3 fish cannot evolve further.

## Breeding

Breeding creates age-zero fish without direct store purchase.

- Requires one male and one female fish of the same species in the tank.
- Requires open tank capacity.
- Result chance: 70% same species age-zero fish, 30% random rare age-zero fish available for the current tank level.
- The new fish starts at age zero and evolution stage 0.
- Breeding is launched from the owned fish statistics page.
- Later production balance may add cooldowns, pair stamina, nursery slots, or special food requirements.

## Fish Selling

Players can sell fish from tank, details, or the owned fish statistics page.

Selling rules:

- Sell value is paid in the fish's primary coin type.
- Value increases with rarity, age, production strength, size, resilience, health, and fullness.
- Recently bought age-zero fish sell for less than purchase price.
- Event-only fish require a strong warning before selling later.
- Selling should free tank capacity immediately.

Suggested formula:

```ts
sellValue =
  baseValue *
  ageMultiplier *
  rarityMultiplier *
  productionMultiplier *
  sizeMultiplier *
  resilienceMultiplier *
  conditionMultiplier *
  evolutionMultiplier
```

Condition multiplier combines health and hunger/fullness. Age-zero resale is capped below purchase price to prevent instant buy/sell profit.

Selling edge cases:

- Cannot sell the last fish during tutorial.
- Cannot sell fish while a modal or placement confirmation is open.
- Selling a placed fish removes its active coin timers and pending state.
- Selling an inventory fish removes exactly one inventory count.
- Event-only or super rare fish require typed or long-press confirmation later on mobile.
- Sell payout must never exceed exploit-safe caps unless explicitly designed.

## Fish States

Fish state priority:

1. Ill.
2. Hungry.
3. Happy.

Illness overrides hunger and happiness. A fish can still be hungry while ill internally, but the displayed state should be ill because it is the most urgent care signal.

### Happy

Happy fish:

- Swim normally.
- Drop coins on their timer.
- Grow at normal speed.
- May create small bubbles or sparkle effects.

Fish become happy when:

- Hunger is low.
- Health is good.
- Tank cleanliness is acceptable.
- Decorations or habitat bonuses are active.

### Hungry

Hungry fish:

- Show a clear hunger indicator.
- Show a compact fullness bar above the fish while it swims; a full bar means good and an empty bar means hungry.
- Seek nearby food.
- Move faster toward food.
- Stop or reduce coin drops if hunger is high.

Fish become hungry when hunger passes a threshold.

If a fish remains hungry continuously for 60 minutes, it dies. Feeding it enough to leave the hungry state resets this danger timer.

### Ill

Ill fish:

- Move slower.
- Keep coin production alive, but only as slower reduced `+1` drops.
- Stop growing or grow slowly.
- Need medicine or better tank conditions.

Fish become ill when:

- Hunger stays high for too long.
- Tank cleanliness is poor.
- Random illness triggers happen, modified by resistance.

If a fish remains ill continuously for 60 minutes, it dies. Medicine or recovery above the illness threshold resets this danger timer.

Important: illness should create care urgency with clear warning and recovery paths, not surprise punishment.

## Hunger

Hunger increases over time.

MVP tuning should be gentle enough for short mobile idle sessions: a newly fed age-zero fish should stay comfortable for roughly a minute or more before becoming hungry, and health loss should start only at severe hunger.

Hunger is driven by calorie need, not a flat timer. A fish's calorie need scales from exact age-rooted size and species scale, so larger and older fish burn hunger faster than small age-zero fish. Tank size can pause visible growth, but calorie need still follows the fish's biological age-rooted size.

Suggested scale:

- 0-39: full.
- 40-69: hungry soon.
- 70-100: hungry.

Food lowers hunger by providing calories. The same food gives less fullness to a larger fish because the fish needs more calories for a full meal. Higher-density food costs more and gives more calories per pellet.

## Mood Cycle

Mood is separate from hunger and health.

Mood inputs:

- Age stage.
- Species personality.
- Hunger.
- Health.
- Tank cleanliness.
- Species variety in the shared tank.
- Preferred decorations.
- Recent feeding quality.

Mood effects:

- Coin interval.
- Coin type chance.
- Movement animation.
- Bubble or sparkle effects.
- Rare behavior chance.

Current MVP displays mood as a compact above-fish condition bar derived from health until the separate mood stat is implemented.

Mood should drift slowly, not flicker every frame. Use smoothing or state timers.

## Food

Food types:

- Micro food: low-density food for tiny or age-zero fish.
- Basic flakes: cheap density-1 food for starter care.
- Premium flakes: density-3 general food with more calories per pellet.
- Medicine food: lowers hunger slightly and improves health.
- Medicine drops should render as green pill-shaped treatment pellets, not generic food dots.
- Favorite snacks: bonus effect for specific fish types.
- Herb food: density-2 food required by plant-eating species.
- Protein food: density-3 food required by predator or fast-growing species.
- Coral food: density-2 food required by reef species.
- Event food: high-density temporary food for event-only fish.

Food behavior:

- Player activates an owned food icon, then taps the tank.
- Food drops from tap point and sinks.
- Hungry fish target nearest food.
- Fish should aggressively chase compatible food whenever they are not basically full, even before the visible hungry state.
- First fish to reach the food consumes it.
- Fish can reject the wrong food type.
- Wrong food may reduce hunger slightly but give no happiness bonus.
- Strict species may not eat incompatible food at all.
- Medicine is handled through the same food tool flow as a treatment pellet; ill fish seek it and recover only after eating it.
- Store food cards show density level and calories, and better food should cost more for its higher calorie value.

Food edge cases:

- If no fish can eat dropped food, it sinks and expires.
- Expired food lowers cleanliness.
- Multiple fish can target the same food, but only one consumes it.
- Age-zero fish prefer micro food, even if their older species form prefers another food.
- Medicine should restore health and reduce hunger only slightly, so it does not become the best everyday food.
- Auto Feeder should pick from stocked compatible foods using the target fish's calorie need, so larger fish can receive denser food when available.

Timed care rentals:

- Auto Feeder can be rented from Care for a player-selected number of minutes.
- Auto Feeder spends owned non-medicine food; it should not create free food.
- Auto Feeder evaluates each hungry eligible fish and drops that fish's compatible or broadly accepted food from a random top-of-tank position.
- Auto Feeder decrements food inventory once for every pellet it drops.
- If several fish species need different foods, Auto Feeder should drop each needed food type as long as stock exists.
- Auto Coin Collector can be rented from Care for a player-selected number of minutes.
- Auto Coin Collector collects coin drops after they sink to the tank bottom.
- Rental prices scale by selected minutes.
- Rentals are short-session convenience boosts, not permanent automation.

## Growth

Fish grow while they are fed and healthy.

Growth rules:

- Growth is continuous over real play time.
- Growth can continue offline, capped.
- Each fish type has a maximum size.
- Ill fish pause or slow growth.
- Fully grown fish have improved coin drops or collection value.

Age-up rules:

- Age-up can happen during active play or offline progress.
- Age-up should trigger a clear visual moment.
- Age-up should update food need and production immediately.
- Collection album should record the highest age reached per species.

## Coin Drops

Happy fish drop coins on a timer.

Rules:

- Coin type and value depend on fish type, rarity, age, size, and happiness.
- Coin drops pause when fish are ill.
- Coin drops slow when fish are hungry.
- Uncollected coins remain in tank until collected or capped.
- Coin drops sink faster than food pellets so rewards feel responsive.
- Coin storage should have a cap to encourage check-ins without punishing absence too much.

Production examples:

- Common age-zero fish: common coins only.
- Common adult fish: common coins with tiny rare coin chance during events.
- Rare adult fish: rare coins plus common coins.
- Super rare adult fish: super rare coins plus rare coins.
- Event-only fish: special production table that may change during events.

## Decorations

Decorations should be more than cosmetics over time.

Decoration properties:

- Price.
- Size.
- Placement footprint.
- Visual layer.
- Happiness bonus.
- Habitat tag.
- Collection set.

Examples:

- Plant: small happiness bonus for common fish.
- Rock: reduces stress and adds hiding behavior.
- Castle: large visual decoration with a moderate happiness bonus.
- Coral: boosts tropical fish.
- Bubble maker: boosts tank liveliness and idle appeal.

## Tank Happiness

Tank happiness is a combined score from:

- Fish health.
- Fish hunger.
- Cleanliness.
- Decoration bonuses.
- Fish compatibility.
- Tank crowding.
- Species compatibility.

Tank happiness affects:

- Coin drop rate.
- Rare behavior chance.
- Growth speed.
- Visual effects.

## Community Tank Rules

All fish species can live together in the player's tank. The collection fantasy should reward adding many fish types instead of forcing separation.

Community-tank rules should affect:

- Store clarity.
- Tank capacity.
- Food competition.
- Swimming behavior.
- Decoration and habitat bonuses.

Community-tank inputs:

- Species family.
- Rarity.
- Diet type.
- Habitat.
- Water preference.
- Decoration coverage.
- Tank capacity.

Examples:

- Peaceful community fish can share tanks with every current species.
- Shy fish can still prefer plants or rocks for bonus mood without being harmed by tankmates.
- Reef fish can want coral habitat while remaining safe beside freshwater collection fish in MVP terms.
- Event fish can have special production or decoration needs, but should not make other fish sick just by sharing the tank.

Placement UX:

- Fish purchases auto-add when the tank has capacity.
- Show a community-safe badge or detail copy instead of an incompatibility warning.
- Suggest helpful decorations or foods for bonuses.
- Do not punish players for collecting mixed species.

Community formula:

```ts
communityTankScore =
  baseScore +
  habitatScore +
  decorationBonus -
  crowdingPenalty;
```

Suggested thresholds:

- 100: current MVP community-safe default.
- Future lower scores should represent missing comfort bonuses, not species incompatibility.

Community status should be recalculated when:

- Fish is placed or removed.
- Decoration is placed or removed.
- Tank biome changes.
- Fish ages into a new stage.
- Tank becomes overcrowded.

## Tank Cleanliness

Cleanliness slowly decreases over time.

Cleanliness effects:

- High cleanliness: fish stay healthy and happy.
- Medium cleanliness: minor happiness penalty.
- Low cleanliness: illness risk increases.

Player actions:

- Tap clean button.
- Buy filter upgrade.
- Buy helper creatures for bottom cleanup.

Cleanliness edge cases:

- Excess dropped food reduces cleanliness.
- Too many fish reduce cleanliness faster.
- Better filters slow cleanliness decay.
- Cleaning should have a cooldown or cost if needed for balance.
- Low cleanliness should warn before illness becomes severe.

## Helper Creatures

Helper creatures are utility tank inhabitants, not fish.

- MVP types: Cleaner Shrimp, Shell Crawler, and Tiny Crab.
- They crawl along the sand at the bottom of the tank.
- They do not age, evolve, breed, produce coins, or count toward fish capacity.
- They collect settled coin drops from the bottom.
- They clean wasted food and medicine pellets that reach the bottom.
- They should help reduce cleanup friction without fully replacing active feeding and coin collection.
- The Book page lists hired helper creatures and lets players sell them to free helper capacity.
- MVP capacity is 5 helper creatures.

## Store

Store categories:

- Fish.
- Food.
- Decorations.
- Helper creatures.
- Upgrades.
- Event items.

Each category has rarity lanes:

- Common.
- Rare.
- Super rare.

Shop rules:

- Common lane uses common coins.
- Rare lane uses rare coins.
- Super rare lane uses super rare coins.
- Event-only fish do not appear as normal purchases.
- Featured fish can rotate, but collection progress should show where locked fish come from.

Store UX:

- Large touch targets.
- Clear owned count.
- Clear price.
- Food cards should support additive bulk purchase buttons such as x1, x10, x20, x30, and x50, where repeated taps accumulate the selected purchase quantity; a Reset button returns the card to x1.
- Fish purchases auto-add an age-zero fish to the tank when capacity allows it.
- Helper creature purchases auto-add a non-upgradeable bottom crawler to the tank.
- Mixed species never require a risky/incompatible confirmation.
- Non-fish placeable items can use immediate placement mode after purchase.
- Clear locked reason for unavailable fish.
- Clear acquisition source for event-only fish.
- Filter and sort for large catalogs.
- Preview production, food need, rarity, and community-safe tags before purchase.

Purchase edge cases:

- Insufficient currency shows required coin type and shortage.
- Full tank sends fish to inventory, not into the tank.
- Full inventory should block purchase or expand storage.
- Event shop expiry should not delete already purchased items.
- Store rotations should not break saved item references.

## Inventory And Placement

Rules:

- Buying fish adds fish to inventory.
- Selling fish removes fish and grants sell value.
- Placing fish consumes inventory.
- Buying decoration adds decoration to inventory.
- Placing decoration consumes inventory.
- Food is consumed when dropped.

Placement should support:

- Tap to place.
- Drag placed decorations to reposition them.
- Drag placed decorations onto the trash target to remove them from the tank.
- Later: long-press to edit or sell.

Tank capacity rules:

- Fish slot capacity scales by tank level: L1 10, L2 14, L3 18, L4 22, L5 30.
- Each tank has decoration capacity or placement footprint budget.
- Bigger fish may count as more capacity after aging.
- Overcrowding lowers happiness and cleanliness.
- The game should recommend a second tank or upgrade before overcrowding becomes painful.

## Progression

Progression should unlock:

- More fish slots.
- Larger tanks.
- New fish species.
- New food types.
- Decoration themes.
- Tank utilities.
- Collection rewards.
- New coin types.
- Event-only species.
- Community tank boosts.

Progression rewards should avoid hard blocking core care. New systems should unlock gradually:

- First: feeding, coins, decorations.
- Next: cleanliness and daily goals.
- Next: rarity and rare coins.
- Next: collection variety and habitat bonuses.
- Later: event-only fish, discovery recipes, and mastery.

Suggested early progression:

- Level 1: Goldfish, basic food, plant, rock.
- Level 2: Angelfish, coral, premium food.
- Level 3: Koi, castle, filter upgrade.
- Level 4: Rare variants, rare coins, and themed decorations.
- Level 5: Species variety bonuses and advanced tank decorations.
- Level 6: Super rare coins and event-only fish.

## Event-Only Fish

Some fish cannot be purchased.

Acquisition sources:

- Limited-time event goals.
- Collection album completion.
- Login milestone rewards.
- Special tank condition discovery.
- Community challenge reward, later.

Event-only fish rules:

- Mark clearly in the collection album.
- Show acquisition source.
- Let players inspect silhouette and requirements.
- Avoid making expired fish feel impossible forever; rerun events or offer alternate paths later.
- Protect against accidental sale with stronger confirmation.

## Interesting Additions

These systems can deepen long-term retention:

- Fish personalities: lazy, playful, shy, bossy, curious. Personality modifies movement and mood cycle.
- Tank biomes: freshwater, reef, deep sea, zen pond, fantasy. Biomes determine decoration and production bonuses.
- Collection album: rewards coins, food, decorations, or tank upgrades for owning/growing fish.
- Species mastery: rewards for raising a species from age zero to older ages.
- Discovery recipes: certain decorations, food, and fish combinations attract hidden fish.
- Visitor fish: temporary fish visit the tank; caring for them can unlock them later.
- Decoration sets: completing a set grants tank-wide bonuses.
- Mood events: fish occasionally request a favorite food, toy, or decoration.
- Photo moments: rare behaviors create collectible snapshots.
- Gentle quests: short goals that nudge care, collection, and decoration.
- Second tank: lets players build themed aquariums and show off more fish, not separate incompatible species.
- Fish rescue events: rescue-only fish with care goals before they become permanent.

## Daily Goals

Daily goals should be short and friendly.

Examples:

- Feed 2 fish.
- Collect 5 coins.
- Place 1 decoration.
- Keep all fish happy.
- Clean the tank.

Rewards:

- Common coins.
- Rare coins.
- Super rare coins.
- Food.
- Decoration fragments.

## Offline Progress

When the player returns:

- Calculate elapsed time.
- Generate capped coins from happy fish.
- Increase hunger.
- Decrease cleanliness.
- Apply illness risk gently.

Offline rules:

- Cap rewards to prevent runaway economy.
- Fish that were already hungry or ill can continue their saved 60-minute danger timer while offline.
- Show a pleasant return summary.

## Events

Events should add novelty without invalidating normal progress.

Examples:

- Weekend Coral Festival.
- Rare Fish Visit.
- Decoration Set Challenge.
- Growth Boost Day.

Event rewards:

- Limited decorations.
- Fish color variants.
- Special food.

## Save, Load, And Offline Progress

Save data must include a schema version.

Save requirements:

- Save after purchases, sales, placement, collection, feeding, cleaning, age-up, and settings changes.
- Autosave periodically during active play.
- Validate loaded saves against known content IDs.
- Migrate old save versions forward.
- Never delete unknown event fish IDs without a fallback placeholder.
- Keep local save working offline.

Offline calculation:

1. Read last saved timestamp.
2. Clamp elapsed time to an offline cap.
3. Apply hunger increase.
4. Apply cleanliness decay.
5. Apply growth.
6. Apply capped coin production.
7. Apply gentle illness risk.
8. Save updated state.
9. Show return summary.

Clock abuse handling:

- Negative elapsed time should be ignored.
- Very large elapsed time should be capped.
- Repeated clock jumps should trigger reduced offline rewards.
- Never punish by deleting fish.

## Content Validation

Every content item should pass validation before release:

- Unique ID.
- Valid rarity.
- Valid price and coin type.
- Valid asset key.
- Valid unlock source.
- Valid food type references.
- Valid production table.
- Valid community-safe species references.
- Valid localization key.
- No event-only item appears in normal purchase lane.

## QA Matrix

Manual and automated QA should cover:

- Fresh install.
- Returning player with old save version.
- Offline return after 5 minutes, 1 day, and 7 days.
- Device sizes: 390x844, 393x852, 412x915, 430x932.
- Safe area with notch and home indicator.
- Low currency purchase attempt.
- Full tank placement attempt.
- Sell common fish.
- Sell rare fish.
- Attempt to sell event-only fish.
- Wrong food rejection.
- Mixed-species auto-add purchase flow.
- Coin collection when many coins are present.
- Store rotation with owned items.
- Event ending while app is closed.
- Reduced motion setting.
- Localization with longer strings.

## Regression Coverage

The regression smoke test should cover:

- App loads.
- Initial currency and food are correct.
- Fish can be bought.
- Fish can be sold.
- Fish can be placed.
- Tabs can switch and highlight correctly.
- Food can be bought.
- Food can be dropped.
- Species can reject incompatible food.
- Hungry fish can eat food.
- Happy fish can drop a coin.
- Uncollected coin drops cap at 5 and production waits until the player collects.
- Common, rare, and super rare coins render with distinct colors.
- Coin can be collected.
- Multiple coin types can be produced and collected.
- Decoration can be bought.
- Decoration can be placed.
- Mixed species stay community-safe and do not add health penalties.
- Save/load preserves fish, wallet, tank, and inventory.
- Offline progress applies capped rewards.
- Old save migration succeeds.
- Screenshot artifact is generated.

Run:

```sh
npm test
```
