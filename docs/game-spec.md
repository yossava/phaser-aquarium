# Game Spec

## Working Title

Phaser Aquarium

## Product Goal

Create a portrait mobile aquarium care game that players keep installed for months because it feels calm, personal, collectible, and always slightly alive.

The game should be habit-forming through affection, progress, discovery, and expression. It should avoid hostile retention patterns such as punishing missed sessions, excessive notification pressure, or mechanics that make players feel trapped.

## Target Platform

- Mobile first.
- Portrait orientation.
- Short sessions: 30 seconds to 5 minutes.
- Longer decoration and collection sessions: 5 to 15 minutes.
- Playable offline for core care and collection.

## Player Fantasy

The player owns a growing aquarium that becomes more beautiful, rare, and personal over time. Fish feel like tiny pets with needs, moods, growth, and rewards. The tank becomes a living collection and a self-expression space.

## Core Pillars

- Care: Fish need food, clean water, health, and attention.
- Collection: Many fish species, color variants, decorations, themes, rarity tiers, and rare finds.
- Growth: Fish mature visually and economically over time.
- Expression: Players arrange decorations and build a tank that feels like theirs.
- Calm Reward: The game feels soothing, generous, and satisfying to check.
- Lightweight Strategy: Food choices, tank layout, fish variety, and decoration bonuses matter.

## Core Loop

1. Open the aquarium.
2. Collect coins dropped by happy fish.
3. Check fish needs and tank state.
4. Feed or treat fish.
5. Buy fish, food, decorations, or upgrades.
6. Place and arrange items in the tank.
7. Watch fish interact, grow, and produce rewards.
8. Return later to see progress and collect new rewards.

## Long-Term Loop

1. Complete daily care goals.
2. Unlock new fish tiers and decoration sets.
3. Breed fish pairs, evolve special pets, or discover fish variants.
4. Upgrade tank capacity, filters, lighting, and themes.
5. Complete collection albums.
6. Build themed aquariums.
7. Participate in weekly events.
8. Acquire event-only fish.
9. Share or visit tanks.

## MVP Scope

The current MVP should prove:

- Player can buy fish.
- Player can sell fish.
- Player can buy fish and have them added to the tank immediately.
- Player can buy and drop food.
- Hungry fish seek and eat food.
- Fish have visible states: happy, hungry, ill.
- Fish can show compact chat-bubble emoji feedback: hungry until eating, happy briefly after eating, sick until healed, and not-enough-space-to-grow until the tank is upgraded.
- Happy fish drop coins.
- Player can collect coins.
- Fish grow over time with a cap per fish type.
- Player can buy and place decorations.
- Player can buy bottom helper creatures that collect settled coins and clean wasted food or medicine.
- Game is portrait mobile and touch-first.
- Regression test covers the core loop.

## Near-Term V1 Scope

- Persistent save/load.
- Better fish state UI, including compact hunger and mood bars, tail-based fish-food color matching, rarity stars, and fully-grown markers above fish.
- Minute-selectable care rentals for Auto Feeder and Auto Coin Collector.
- Tank cleanliness.
- Fish medicine.
- Decoration happiness bonuses.
- Helper creatures such as shrimp, shell crawlers, and crabs.
- More fish types.
- More decorations.
- Fish selling.
- Owned fish statistics page with type, exact age, worth, gender, evolution, and sell actions.
- Fish rarity: common, rare, and super rare.
- Three coin types: common, rare, and super rare.
- Shop categories and prices based on coin type.
- Species-specific food needs.
- Basic community-tank rules where all owned fish can share one aquarium.
- Basic upgrade progression.
- Daily goals.
- Offline coin accrual with caps.
- Mobile safe-area support.

## Retention Design

### Day 1

- Player gets a free starter fish.
- First fish grows visibly within minutes.
- Player earns enough coins to buy food and one decoration.
- The game teaches by doing, not through long text.

### Day 2-3

- Unlock a second fish species.
- Introduce tank cleanliness.
- Add a simple daily care bonus.
- Give the player a reason to personalize the tank.

### Day 4-7

- Unlock fish variants or rarity.
- Introduce upgrade choices.
- Add a small collection album.
- Add a weekly decoration theme.

### Long-Term

- Seasonal fish and decorations.
- Fish breeding or discovery.
- Event-only fish that cannot be purchased directly.
- Multiple tanks.
- Rare cosmetic mutations.
- Species mastery and collection album bonuses.
- Tank variety and habitat-decoration puzzles.
- Collection milestones.
- Optional social visits.

## Ethical Engagement Rules

- Do not punish players harshly for being away.
- Fish should warn clearly before death: a fish dies only after it remains hungry or sick for 60 continuous minutes.
- Offline rewards should be capped but meaningful.
- Notifications should be useful and sparse.
- Monetization, if added later, should be cosmetic or convenience-focused.
- Do not hide core care behind ads.

## Economy Direction

Use three coin types:

- Common coins: produced mostly by common fish, spent on basic food, common fish, basic decorations, and early upgrades.
- Rare coins: produced mostly by rare fish, spent on rare fish, rare foods, better decorations, and mid-tier upgrades.
- Super rare coins: produced by super rare or event fish, spent on high-tier in-game items, super rare habitats, special food, and high-tier upgrades.

Shop items are categorized by the same rarity as the coin type:

- Common shop items cost common coins.
- Rare shop items cost rare coins.
- Super rare shop items cost super rare coins.

Fish can produce more than one coin type. Production depends on fish species, rarity, age, mood, health, habitat, decoration, and event bonuses.

The MVP currently only uses one coin counter, but the target economy should support all three.

## Collection And Rarity

Fish should feel almost countless over time through a mix of species, rarity, age, color variant, pattern variant, event source, and personality.

Rarity tiers:

- Common: easy to buy, produces common coins, simple care needs.
- Rare: unlocked through progression, produces rare coins, has more specific needs.
- Super rare: expensive, event-gated, or discovered, produces super rare coins, and has strict care or habitat needs.

All fish start at age zero. Fish age uses fish-time: 1 real hour equals 1 fish month, real minutes convert into fish-days, and 12 real hours equals 1 fish year. Fish stats should show exact age, age-rooted length, and age-rooted weight, not player-facing categories like baby, medium, big, or max. Age changes size, calorie need, mood cycle, production type, production rate, and selling value. Fish visual size is based solely on exact age: early months should be visibly readable, reaching the main species size around 6 months, and long-tail growth continues until 50 fish-years, when it reaches the very-big cap. If the tank is too small, visible growth pauses and the player is prompted to upgrade, while biological length, weight, and food need continue to reflect age.

Fish also have gender and up to three evolution stages. Evolution spends an Evolve Pill and a fee, has a 50% success / 50% death risk in the current design, and successful evolution resets age to zero. Same-species male/female breeding creates an age-zero fish: 70% same species and 30% random rare species available to the current tank level.

## Species And Community Tank Rules

Fish species should vary meaningfully:

- Each species has a food type it prefers or requires.
- All fish species can share the same player tank.
- Species identity should come from food, movement, growth, production, rarity, and visual style rather than incompatibility.
- Some species require matching water type, decoration type, or tank cleanliness.
- Community safety should avoid punishing players for collecting many fish types in one aquarium.

## Acquisition Rules

Fish acquisition should come from several sources:

- Store purchase.
- Daily or weekly event rewards.
- Collection milestone rewards.
- Growth or mastery rewards.
- Discovery through special tank conditions.
- Later: breeding or expedition systems.

Some fish cannot be purchased. They are acquired only from events, milestones, or discoveries.

## Selling Fish

Players can sell fish to manage tank space and recover value.

Selling value should depend on:

- Species.
- Rarity.
- Age.
- Health.
- Happiness.
- Growth progress.
- Event exclusivity.

Event-only fish should be sellable only with an extra confirmation later, because players may regret selling them.

## Visual Direction

- Cozy, bright, readable mobile UI.
- Aquarium should occupy the emotional center of the screen.
- Fish need expressive silhouettes and clear state feedback.
- Decorations should make the tank look meaningfully different.
- UI should feel like a game tool tray, not a web dashboard.

## Audio Direction

- Gentle water ambience.
- Light coin pickup sound.
- Soft feeding sound.
- Happy fish sparkle or bubble sound.
- Ill fish should be clear but not alarming.

## Success Metrics

- Player understands what to do without instructions.
- Player can complete the first loop in under 60 seconds.
- Player wants to buy a second fish.
- Player notices fish growth.
- Player returns to collect coins.
- Player feels the tank is becoming more personal.

## Production Release Criteria

The game is production-ready only when these are true:

- Core loop is playable without developer knowledge.
- Save/load is stable across app restarts and app updates.
- Offline progress is capped, understandable, and resistant to obvious clock abuse.
- The first session gives the player an age-zero fish, teaches feeding, teaches coin collection, and gives one meaningful decoration choice.
- All shop purchases have clear prices, owned counts, currency type, and placement behavior.
- All sell actions show value, currency type, and confirmation when needed.
- Fish state changes are visually readable on a phone screen.
- The game supports common portrait phone sizes and safe areas.
- Performance stays smooth on mid-tier mobile devices.
- Regression tests cover the economy, fish care, placement, selling, offline progress, and community-tank rules.
- Content data can be expanded without editing core gameplay code.
- No player can lose event-only fish by accident.

## Required Screens

Production needs these screens or overlays:

- Tank screen: main play area, HUD, fish, decorations, coins, food drops.
- Store: fish, food, decorations, helper creatures, upgrades, event items, rarity lanes.
- Inventory: owned fish, food, decorations, and locked items.
- Book statistics: owned fish grid showing type, exact age, age-rooted length and weight, worth, gender, evolution stage, and quick actions for sell, evolve, and breed; owned helper creature grid with sell actions for cleanup.
- Fish details: age, length, weight, rarity, mood, hunger, health, calorie need, food compatibility, production, community status, sell value.
- Placement confirmation: warns about tank limits where needed.
- Sell confirmation: shows payout and extra warning for event-only fish.
- Collection album: owned, locked, event-only, mastery, and discovery hints.
- Daily goals: short care tasks and rewards.
- Offline return summary: coins earned, fish needs, cleanliness changes.
- Settings: sound, music, notifications, language, privacy, restore/reset save.

Mobile navigation rules:

- The tank is the default full-screen play surface.
- Store, Care, Album, Goals, and Settings each have a dedicated right-side icon.
- Owned food and medicine appear as a left-side tool dock; activating a food icon changes the next tank tap into a food drop.
- Medicine uses the same food-drop interaction, sinks like food, and heals only after a sick fish eats it.
- Care screen rentals give temporary convenience with player-selected minutes and scaled pricing: Auto Feeder spends owned food per pellet and drops each hungry species' needed food from random top-of-tank positions, while Auto Coin Collector collects settled bottom coins.

## First-Time User Experience

The first session should be playable in under one minute:

1. Player receives one free common age-zero fish.
2. Player places it in the tank.
3. Fish becomes hungry.
4. Player receives free micro/basic food.
5. Player drops food and watches the fish eat.
6. Fish becomes happy and drops a common coin.
7. Player collects the coin.
8. Player buys or places one starter decoration.

The tutorial should use highlights, arrows, and short labels only. Avoid long text boxes.

## Content Strategy

Fish catalog should scale through data:

- Species.
- Tank level.
- Rarity.
- Age stages.
- Color variants.
- Pattern variants.
- Personality variants.
- Event source.
- Food type.
- Habitat preference.
- Production table.

Initial production target:

- 50 store fish, with 10 fish per tank level from L1-L5.
- Lower-level fish can live in any higher-level tank.
- Higher-level fish cannot be purchased or placed until the tank is upgraded to that level.
- Fish capacity increases with tank level: 10, 14, 18, 22, 30, then +6 fish slots per level forever.
- Tank upgrades have no max level. Early prices are authored; post-L5 prices are formula-based and always shown before purchase.
- Total wealth should be visible and include wallet, fish, inventories, and waiting coin value.
- The tank status line should suggest useful next purchases, such as fish, food, coin collection, or tank upgrades.
- 3 event-only fish.
- 12 decorations.
- 5 food types.
- 3 tank upgrades.

Later content can expand through events without changing the core systems.

## Notification Strategy

Notifications are optional and gentle:

- Fish are hungry.
- Tank needs cleaning.
- Offline rewards are ready.
- Event is ending soon.

Rules:

- Ask permission only after the player understands why notifications help.
- Never send more than one routine notification per day by default.
- Do not use guilt language.
- Use neutral care reminders when fish are hungry or sick; avoid guilt language even when death risk exists.

## Accessibility And Localization

Production must support:

- Large touch targets.
- High-contrast readable UI.
- Color plus icon/state labels, not color alone.
- Reduced motion option.
- Separate music and sound controls.
- Text that can be localized without layout breakage.
- Short strings for small mobile screens.
- Left/right hand friendly bottom controls where possible.

## Performance Targets

Production targets:

- 60 FPS target, 30 FPS acceptable floor on older devices.
- Initial load under 5 seconds on normal mobile network after install.
- No unbounded particles, coin drops, food objects, or fish path calculations.
- Memory stable during 15-minute session.
- Offline calculation completes instantly for typical saves.

## Analytics And Balancing

Analytics should be privacy-conscious and gameplay-focused:

- First session completion.
- Fish bought.
- Fish sold.
- Fish placed.
- Food dropped.
- Coin collected by type.
- Fish aged up.
- Fish became ill.
- Community-safe mixed tank created.
- Daily goal completed.
- Offline reward claimed.
- Store item bought by category and rarity.

Do not collect sensitive personal data for core gameplay.

## Production Risks

- Too many currencies too early can confuse new players.
- Too much fish-specific care complexity can feel unfair if it is not visible before purchase.
- Event-only fish can create fear of missing out if they never return.
- Offline progress can break economy if uncapped.
- Selling can cause regret if rare fish are not protected.
- Large fish catalogs can overwhelm store browsing without filters.
- Babies that need too much feeding can feel needy rather than cute.

## Non-Goals For Now

- Real-money purchases.
- Social accounts.
- Cloud sync.
- Complex breeding genetics in the near term.
- Multiple tanks in the MVP.
- Heavy tutorial system.
