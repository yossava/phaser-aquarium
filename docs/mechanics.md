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
type FoodType = "micro" | "basic" | "premium" | "herb" | "protein" | "coral" | "medicine" | "event";

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
- Compatibility rules.
- Economy balance constants.

The game code should consume these tables rather than hard-coding shop and fish behavior.

## Currencies

There are three production currencies:

- Common coins.
- Rare coins.
- Super rare coins.

Currency rules:

- Fish can produce one or more coin types.
- Coin production depends on species, rarity, age, mood, health, hunger, cleanliness, compatibility, and decorations.
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

- Baby Goldfish: common coin only, low amount, short interval.
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
  compatibilityMultiplier *
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
- Coin production table.
- Favorite food.
- Preferred decoration or habitat.
- Compatible species.
- Incompatible species.
- Water or habitat requirements.
- Illness resistance.

Rarity values:

- Common.
- Rare.
- Super rare.

Store design should allow a very large fish catalog through filters:

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
  rarity: Rarity;
  price?: Price;
  acquisitionSources: string[];
  sellBaseValue: Price;
  requiredFoodTypes: FoodType[];
  preferredFoodTypes: FoodType[];
  habitatTags: string[];
  compatibleSpecies: string[];
  incompatibleSpecies: string[];
  ageCurve: Record<AgeStage, {
    durationSeconds: number;
    scale: number;
    hungerMultiplier: number;
    moodCycleSeconds: number;
    production: CoinProduction[];
  }>;
};
```

## Fish Instance State

Each placed fish should track:

- Unique ID.
- Fish type ID.
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
- Compatibility score.

## Age Stages

All fish start as babies.

Age stages:

- Baby.
- Juvenile.
- Adult.
- Elder.
- Master, optional long-term capstone.

Age affects:

- Size.
- Food need.
- Food type sensitivity.
- Mood cycle length.
- Coin production type.
- Coin production amount.
- Coin production interval.
- Sell value.
- Compatibility tolerance.

Suggested behavior:

- Baby fish need frequent, cheaper feeding and produce little.
- Juvenile fish grow quickly and begin normal production.
- Adult fish are stable producers.
- Elder fish produce better rewards but may need more specific care.
- Master fish unlock collection bonuses, special looks, or breeding/discovery bonuses later.

## Fish Selling

Players can sell fish from tank or inventory.

Selling rules:

- Sell value is paid in the fish's primary coin type.
- Value increases with rarity, age, health, happiness, and growth.
- Recently bought baby fish sell for less than purchase price.
- Event-only fish require a strong warning before selling later.
- Selling should free tank capacity immediately.

Suggested formula:

```ts
sellValue = basePrice * rarityMultiplier * ageMultiplier * conditionMultiplier
```

Condition multiplier combines health, happiness, and hunger.

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
- Seek nearby food.
- Move faster toward food.
- Stop or reduce coin drops if hunger is high.

Fish become hungry when hunger passes a threshold.

### Ill

Ill fish:

- Move slower.
- Lose coin production.
- Stop growing or grow slowly.
- Need medicine or better tank conditions.

Fish become ill when:

- Hunger stays high for too long.
- Tank cleanliness is poor.
- Random illness triggers happen, modified by resistance.

Important: illness should create care urgency, but not make the game cruel.

## Hunger

Hunger increases over time.

Suggested scale:

- 0-39: full.
- 40-69: hungry soon.
- 70-100: hungry.

Food lowers hunger. Better food can also increase happiness or health.

## Mood Cycle

Mood is separate from hunger and health.

Mood inputs:

- Age stage.
- Species personality.
- Hunger.
- Health.
- Tank cleanliness.
- Compatible or incompatible tank mates.
- Preferred decorations.
- Recent feeding quality.

Mood effects:

- Coin interval.
- Coin type chance.
- Movement animation.
- Bubble or sparkle effects.
- Rare behavior chance.

Mood should drift slowly, not flicker every frame. Use smoothing or state timers.

## Food

Food types:

- Basic flakes: cheap, lowers hunger.
- Premium flakes: lowers hunger more and improves happiness.
- Medicine food: lowers hunger slightly and improves health.
- Favorite snacks: bonus effect for specific fish types.
- Herb food: required by plant-eating species.
- Protein food: required by predator or fast-growing species.
- Micro food: required by babies and tiny species.
- Coral food: required by reef species.
- Event food: temporary food for event-only fish.

Food behavior:

- Player taps food, then taps tank.
- Food drops from tap point and sinks.
- Hungry fish target nearest food.
- First fish to reach the food consumes it.
- Fish can reject the wrong food type.
- Wrong food may reduce hunger slightly but give no happiness bonus.
- Strict species may not eat incompatible food at all.

Food edge cases:

- If no fish can eat dropped food, it sinks and expires.
- Expired food lowers cleanliness.
- Multiple fish can target the same food, but only one consumes it.
- Baby fish prefer micro food, even if their adult species prefers another food.
- Medicine food should not become the best everyday food.

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
- Coin storage should have a cap to encourage check-ins without punishing absence too much.

Production examples:

- Common baby fish: common coins only.
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

## Species Compatibility

Some species cannot live together comfortably.

Compatibility should affect:

- Health.
- Mood.
- Growth.
- Coin production type.
- Coin production rate.
- Food competition.
- Swimming behavior.

Compatibility inputs:

- Species family.
- Rarity.
- Size difference.
- Diet type.
- Temperament.
- Habitat.
- Water preference.
- Decoration coverage.

Examples:

- Peaceful community fish can share tanks with most common fish.
- Predator fish stress tiny fish and reduce their mood.
- Shy fish need plants or rocks to tolerate active fish.
- Reef fish need coral habitat and dislike bare tanks.
- Event spirit fish may only tolerate other event fish.

Placement UX:

- Warn before placing incompatible fish.
- Show a compatibility badge before confirming placement.
- Suggest a better tank or decoration fix.
- Do not silently punish players for unclear rules.

Compatibility formula:

```ts
compatibilityScore =
  baseSpeciesScore +
  habitatScore +
  sizeScore +
  temperamentScore +
  decorationMitigation -
  crowdingPenalty;
```

Suggested thresholds:

- 80-100: excellent, bonus mood and production.
- 60-79: stable, no penalty.
- 40-59: tense, mild mood or production penalty.
- 0-39: incompatible, health and production penalty.

Compatibility should be recalculated when:

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
- Add cleaning decoration or helper item later.

Cleanliness edge cases:

- Excess dropped food reduces cleanliness.
- Too many fish reduce cleanliness faster.
- Better filters slow cleanliness decay.
- Cleaning should have a cooldown or cost if needed for balance.
- Low cleanliness should warn before illness becomes severe.

## Store

Store categories:

- Fish.
- Food.
- Decorations.
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
- Immediate placement mode after buying placeable items.
- Clear locked reason for unavailable fish.
- Clear acquisition source for event-only fish.
- Filter and sort for large catalogs.
- Preview production, food need, rarity, and compatibility tags before purchase.

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
- Later: drag to move.
- Later: long-press to edit or sell.

Tank capacity rules:

- Each tank has fish slot capacity.
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
- Compatibility tools.

Progression rewards should avoid hard blocking core care. New systems should unlock gradually:

- First: feeding, coins, decorations.
- Next: cleanliness and daily goals.
- Next: rarity and rare coins.
- Next: compatibility and second tank.
- Later: event-only fish, discovery recipes, and mastery.

Suggested early progression:

- Level 1: Goldfish, basic food, plant, rock.
- Level 2: Angelfish, coral, premium food.
- Level 3: Koi, castle, filter upgrade.
- Level 4: Rare variants, rare coins, and themed decorations.
- Level 5: Species compatibility tools and second tank.
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

- Fish personalities: lazy, playful, shy, bossy, curious. Personality modifies movement, mood cycle, and compatibility.
- Tank biomes: freshwater, reef, deep sea, zen pond, fantasy. Biomes determine compatible species and decoration bonuses.
- Collection album: rewards coins, food, decorations, or tank upgrades for owning/growing fish.
- Species mastery: rewards for raising a species from baby to adult or elder.
- Discovery recipes: certain decorations, food, and fish combinations attract hidden fish.
- Visitor fish: temporary fish visit the tank; caring for them can unlock them later.
- Decoration sets: completing a set grants tank-wide bonuses.
- Mood events: fish occasionally request a favorite food, toy, or decoration.
- Photo moments: rare behaviors create collectible snapshots.
- Gentle quests: short goals that nudge care, collection, and decoration.
- Second tank: lets players separate incompatible species and build themed aquariums.
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
- Do not kill fish for absence.
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
- Valid compatibility references.
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
- Incompatible species placement warning.
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
- Coin can be collected.
- Multiple coin types can be produced and collected.
- Decoration can be bought.
- Decoration can be placed.
- Incompatible species affect mood, health, and production.
- Save/load preserves fish, wallet, tank, and inventory.
- Offline progress applies capped rewards.
- Old save migration succeeds.
- Screenshot artifact is generated.

Run:

```sh
npm test
```
