# Economy Simulation Report

Generated from `tools/simulate-economy.mjs`.

For the rebalanced long-term projection, see `docs/economy-long-term-balancing-report.md`.

## Implemented Calorie ROI Economy

The current implementation has moved away from fixed fish coin timers and rarity-produced currencies.

- All fish now produce **common coins** only.
- Fish earn from eating: when a fish consumes food calories, it schedules a common coin drop `1-10s` later.
- Before 3 hours of real fish age, each fully fed fish returns its consumed food cost plus enough ROI bonus to cumulatively repay its common purchase price over 3 hours.
- After 3 hours, each fish returns `1.1x` the common price of the calories it consumed, so the player nets roughly `10%` over food cost.
- Sick fish do not produce.
- All normal fish food can be eaten by all fish. Species food locks and the old common-to-rare-to-super-rare production bridge are no longer active.
- Fish calorie need is age-based and value-scaled: `max(60, ageMinutes * 10 * fishPrice / 60)` calories for full hunger.
- A good meal is 25% of full calorie need, so four optimal pellets fill a fish.
- If a dropped pellet is below the fish's current 25% meal target, the fish still eats it but shows guidance such as `Need 250 cal food`.
- Food inventory is stored as calories for normal food. The dock badge rounds servings as `5`, `4+`, `4`, `3+`, etc.
- Medicine, growth tonic, and hidden creature food stay count-based.

### Pricing Shape

- Fish prices are now common coin prices, with optional rare or super rare token requirements on rare tiers.
- Rare fish example shape: `C1K + R1`.
- Super rare fish example shape: `C12K + SR1`.
- Food common pricing uses a consistent calorie value of about `0.03 common/calorie`.
- Premium food can also require small rare or super rare token amounts, but only its common component is used for fish common production.
- Decorations, helpers, tank cosmetics, tank upgrades, and tools now use common prices with optional rare/SR token gates instead of being pure rare/SR currency purchases.

### Remaining Economy Gaps

- Rare and super rare token sources still need their final system: events, gacha, rewarded ads, quest streaks, or achievement milestones.
- The current implementation keeps legacy production fields in content types for compatibility, but runtime production ignores them.
- Long-term prices should be re-simulated after real playtesting because the new economy is attention-based: income depends on feeding frequency and food choice.
- Token gates need pacing rules so a player can see rare/SR goals early without being able to brute force them through common income alone.

## Simulation Assumptions

- Starting wallet: `120 common`.
- Starting fish: `0`.
- Player claims every coin immediately.
- Player keeps fish happy; food/care costs are ignored for this first pass.
- Every hour, player buys until blocked by capacity.
- Buying priority: super rare fish first, then rare, then common. Within a rarity, buy the best expected hourly wealth ROI.
- Fish catalog matches current `StoreOverlay`: fish are gated only by selected currency, not by tank level.
- Fish production uses age curves plus current progression bridge behavior.

## Result Summary

Under current values, the economy breaks almost immediately.

| Time | Wallet | Fish Owned | Tank Level | Capacity | Net Worth |
| --- | --- | --- | --- | --- | --- |
| 1h | C 6.7K, R 1, SR 0 | 14 fish | 2 | 14 | 9.2K |
| 2h | C 43.1K, R 12.0K, SR 21 | 22 fish | 4 | 22 | 1.3M |
| 4h | C 122.4K, R 42.2K, SR 233.4K | 36 fish | 6 | 36 | 237.7M |
| 24h | C 1.5M, R 534.1K, SR 8.8M | 48 fish | 8 | 48 | 8.8B |
| 7d | C 21.7M, R 8.0M, SR 170.7M | 54 fish | 9 | 54 | 171.5B |

## Main Problems

1. **Fish payback time is measured in seconds or minutes.**
   - Cheapest common fish costs `35 common`.
   - Starter common fish can produce thousands of common-value wealth per hour.
   - Current common baby production median is roughly `4.4K wealth/hour`, while median common price is only `150 common`.

2. **Currency bridge is too generous.**
   - Common fish can produce rare currency through the bridge.
   - Rare fish can produce super rare currency through the bridge.
   - This lets players reach rare and super rare economies without meaningful gates.

3. **Super rare prices are tiny relative to production.**
   - Cheapest super rare fish cost `1 superRare`.
   - Some baby super rare fish produce thousands of super rare coins per hour.
   - One super rare purchase turns into effectively infinite buying power.

4. **Tank level currently does not gate the store.**
   - Fish catalog is filtered by currency only.
   - `fish.tankLevel` exists in data, but current HTML shop does not use it.
   - Tank level mostly becomes a passive display/capacity number rather than a progression lock.

5. **Tank net worth may inflate level too easily.**
   - Current net worth calculation appears to include all fish value and active tank fish value separately, effectively double-counting active fish value.
   - Even without that, production values are high enough that level still inflates quickly.

6. **Non-fish shop prices are also unbalanced.**
   - Common helpers cost `80-120 common`, which is less than a few minutes of current starter fish production.
   - Rare helpers cost `2-3 rare`, but rare income reaches thousands/hour once rare fish are bought.
   - Super rare helper costs `1 superRare`, while one cheap super rare fish can produce thousands of super rare/hour.
   - Medium decorations cost `20-75 common`, `2-5 rare`, or `1-3 superRare`; these become effectively free.
   - Backgrounds/seabeds are higher than decorations, but still collapse once rare/SR production starts.
   - Food prices scale cleanly by calories for common food, but rare/SR foods are too cheap relative to premium currencies.

## Current Shop Price Snapshot

| Category | Common Price Range | Rare Price Range | Super Rare Price Range | Notes |
| --- | ---: | ---: | ---: | --- |
| Fish | 35-438 | 1-37 | 1-19 | Fish are income-producing, so these are the most important prices. |
| Food/Supply | 5-625 | 1-2 | 1 | Consumables are cheap, especially rare/SR supply. |
| Decorations, M size | 20-75 | 2-5 | 1-3 | Permanent happiness/value for very low prices. |
| Decorations, all sizes | 14-195 | 1-13 | 1-8 | XL still too cheap under current income. |
| Helpers | 80-120 | 2-3 | 1 | Automation is priced below its long-term value. |
| Backgrounds | 220-990 | 24-82 | 2-17 | Better range, but still too cheap after currency bridge. |
| Seabeds | 160-730 | 18-60 | 1-16 | Same issue as backgrounds. |
| Utility | 180 common | - | - | Food dispenser is too cheap if it automates feeding. |
| Tanks | 100-420 | 8 | - | Tank prices are not acting as progression gates. |

## Pricing Philosophy

Shop categories should not all use the same multiplier. Each category has a different economic role:

| Category | Role | Pricing Target |
| --- | --- | --- |
| Fish | Income engine | Price from payback window. |
| Food | Operating cost | Small recurring sink, roughly 8-20% of gross fish income if actively feeding. |
| Medicine | Emergency sink | Noticeable but not punishing; about 15-30 minutes of current tier income. |
| Decorations | Permanent happiness/value | Cosmetic + happiness sink; not an income multiplier unless later added. |
| Helpers | Automation/QoL | Expensive because they reduce attention cost or collect/clean automatically. |
| Background/Seabed | Cosmetic prestige | Medium/long-term goals, priced above simple decorations. |
| Tools/Utilities | System unlocks | High one-time cost, because they alter gameplay loops. |
| Tanks | Progression gate | Should be one of the main sinks, not just another cheap item. |

## Proposed Shop Price Bands

These assume the production rebalance happens first. If production remains current, no shop pricing can stay healthy.

| Stage | Expected Gross Income | Fish | Food | Medicine | Decor | Helper | Background/Seabed | Tank |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Early common | 30-80 common/hour | 60-250 common | 2-8 common/use | 30-60 common | 100-400 common | 400-900 common | 800-2K common | 1K-3K common |
| Late common | 100-250 common/hour | 250-900 common | 5-20 common/use | 80-150 common | 500-1.5K common | 1.5K-4K common | 2K-8K common | 5K-12K common |
| Early rare | 0.5-2 rare/hour | 5-20 rare | 0.05-0.2 rare/use or common alt | 1-3 rare | 8-30 rare | 20-60 rare | 40-120 rare | 80-200 rare |
| Late rare | 2-5 rare/hour | 20-80 rare | 0.2-0.5 rare/use | 3-8 rare | 30-100 rare | 80-200 rare | 120-350 rare | unlock SR gate |
| Early SR | 0.1-0.4 SR/hour | 2-8 SR | avoid SR food unless special | 1 SR emergency | 3-12 SR | 8-25 SR | 15-50 SR | 20-80 SR |

Concrete direction:

- **Common food:** keep calorie bundles, but tune around calories-per-common. Current common bundles are internally consistent (`~9.2 cal/common`), so they can stay after income is reduced.
- **Rare food:** do not price normal calories at `1 rare` unless rare income is intentionally low. Prefer rare food as special-effect food, not ordinary calories.
- **Helpers:** price at roughly `6-12 hours` of the tier they belong to, because automation compounds. Common helper should be closer to `400-900 common`, not `80`.
- **Food dispenser:** if it automates feeding, price it closer to a helper/tool unlock, e.g. `1.5K-4K common` or gated by tank level.
- **Decorations:** common M decorations should start around `100-400 common`, rare `8-30 rare`, SR `3-12 SR`.
- **Backgrounds/seabeds:** should be prestige cosmetics: common `800-8K`, rare `40-350 rare`, SR `15-50 SR`, depending on tier.
- **Tanks:** should be one of the main progression sinks. `100 common` for Fish Bowl is too low; use tank level gates and larger costs.

## Proposed Tank Economy

Tank level should have an explicit effect:

- unlock fish tiers,
- increase capacity,
- unlock background/seabed/decor tiers,
- unlock automation tools,
- optionally increase max coin drops or reduce coin expiry pressure.

Suggested tank unlocks:

| Tank Level | Unlock |
| --- | --- |
| 1 | Starter common fish, basic food, simple decor. |
| 2 | More common fish, medium food bundles, first utility. |
| 3 | First rare fish and rare decor. |
| 4 | Strong rare fish, helpers, better cosmetics. |
| 5 | First super rare fish, SR cosmetics, premium helper. |
| 6+ | More SR fish and prestige items. |

Suggested tank costs after production rebalance:

| Tank | Suggested Cost |
| --- | ---: |
| Fish Bowl / second starter tank | 1K-3K common |
| Second normal tank | 3K-8K common |
| Rare-capable tank | 50-120 rare or equivalent milestone |
| SR-capable tank | 20-80 SR or explicit achievement gate |

The exact numbers should be generated after fish production is rebalanced.

## Recommended Economy Shape

Use target payback windows:

| Tier | Early Payback Target | Mature Payback Target | Intended Unlock |
| --- | ---: | ---: | --- |
| Common | 2-4 hours | 4-8 hours | Start |
| Rare | 8-16 hours | 16-30 hours | Day 2-3 |
| Super Rare | 2-4 days | 4-7 days | Day 5-7+ |

Production formula:

```text
targetHourlyProduction = fishPrice / targetPaybackHours
```

Example:

```text
common fish price 100, target payback 4h
=> about 25 common/hour
```

If coin drops every 60 seconds:

```text
25 common/hour / 60 drops per hour = 0.42 common per drop
```

Because drops use integer amounts, use chance:

```text
1 common every 60s at 42% chance
```

## Recommended Changes

1. **Gate fish by tank level.**
   - Level 1: starter/common fish only.
   - Level 2: better common fish.
   - Level 3: first rare fish.
   - Level 4: stronger rare fish.
   - Level 5+: first super rare fish.

2. **Reduce production by roughly 50x-300x.**
   - Current output is not a little high; it is orders of magnitude high.
   - Start by targeting payback windows and deriving production from price.

3. **Make bridge currency rare and level-gated.**
   - Common fish should not produce rare currency early.
   - Suggested bridge:
     - Common fish: rare chance only after tank level 3 or fish evo 2.
     - Rare fish: super rare chance only after tank level 5 or fish evo 3.
   - Bridge output should be tiny, e.g. `0.05-0.3 rare/hour` for common fish, not `8-10 rare/hour`.

4. **Raise super rare prices or lower super rare output heavily.**
   - A `1 superRare` fish should not produce thousands of super rare coins/hour.
   - Either price super rares in tens/hundreds of super rare, or make super rare output extremely slow.

5. **Make tank level an economy gate, not only a derived display.**
   - Use tank level to unlock shop categories and max rarity.
   - Consider making level upgrade explicit, or derive it from milestones that cannot be rushed only through wallet inflation.

6. **Fix/verify net worth double counting.**
   - In `calculateTankNetWorth`, active fish appear to contribute once via all fish and again via active fish.
   - This should be corrected before finalizing level thresholds.

## Next Balancing Pass

Create a generated economy table from target payback:

```text
for each fish:
  targetPayback = tierTargetByRarityAndTankLevel
  hourlyProduction = price / targetPayback
  choose intervalSeconds and chance/amount to approximate hourlyProduction
```

Then rerun:

```bash
node tools/simulate-economy.mjs 168
```

Target 7-day outcome:

- Day 1: mostly common fish, maybe first rare shard/progress.
- Day 2-3: first rare fish.
- Day 5-7: first super rare fish.
- Store should not be buyable-out in a few hours.
