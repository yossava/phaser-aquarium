# Long-Term Economy Balancing Report

Generated from `tools/simulate-balanced-economy.mjs`.

This is a target economy projection, not the current shipped economy. The current economy still breaks because fish production, bridge currency, and shop prices are much too generous. This pass asks a different question: if we rebalance production and prices from first principles, can the aquarium support months or years of play without feeling frozen?

## Iteration Result

I ran an automated tuning pass over `972` parameter combinations. The best balanced curve uses:

| Parameter | Value | Meaning |
| --- | ---: | --- |
| Starter baseline | 1 starter fish + 120 common | Avoids a cold start. |
| Maintenance sink | 14% gross income | Food/care should remove money continually. |
| Common fish payback | 0.29 days | About 7 hours. |
| Rare fish payback | 1.26 days | Day-scale investment. |
| Super rare fish payback | 3.68 days | Multi-day investment. |
| Prestige fish payback | 8.4 days | Week-plus investment. |
| Legend fish payback | 18.9 days | Month-scale investment. |
| Ancient fish payback | 37.8 days | Long-term sink. |
| Cosmic fish payback | 73.5 days | Year-scale premium tier. |

The important change is that tank level becomes the durable spine of the economy. Fish are income engines, but tank level gates capacity, fish tiers, tools, cosmetics, and the next store tier.

## First-Week Retention Layer

The long-term curve alone is not enough. The first few days need hand-authored retention beats so players feel progress before they understand the economy.

Recommended first-session targets:

| Time | Player Feeling | Economy Beat | Reward |
| --- | --- | --- | --- |
| 0-1 min | "I have a living tank." | Give 1 starter fish, 120 common, and 3 food. | Fish swims immediately, coin drops quickly. |
| 2-3 min | "I know what to do." | First feed and first coin claim. | Goal reward: 30-50 common. |
| 4-6 min | "I can buy something." | First shop purchase should be affordable. | Buy second common fish or small decor. |
| 8-10 min | "My tank changed." | First visible cosmetic or second fish. | Unlock clean action or small decoration. |
| 15 min | "There is more game here." | First tank XP/level progress. | Level 2 preview and next unlock teaser. |

Recommended first-day targets:

| Day | Target State | Retention Purpose |
| ---: | --- | --- |
| Day 1 | Level 2, 4-8 fish, first decor/tool, first visible dirty/clean loop. | Player has a personal tank, not only a blank aquarium. |
| Day 2 | Level 3, clean tank menu/tool fully introduced, first named goal chain complete. | Player understands daily maintenance and goals. |
| Day 3 | Level 3-4, first rare progress appears but is not fully trivial. | Player sees the next rarity and has a reason to return. |
| Day 5 | Level 4-5, better common fish and first background/seabed target. | Player gets a medium-term visual goal. |
| Day 7 | Level 5-6, rare unlock preview or first rare fish path. | Weekly retention hook. |

Important: the simulator now paces early purchases so Day 1 ends at `6/12` fish for a regular player, while a one-visit player only reaches `2/12`. Early retention should feel generous through **structured rewards**, not because every fish pays back instantly.

Use these first-week rules:

1. **Guarantee the first fun purchase.** The player should buy something meaningful in the first 5-8 minutes.
2. **Do not show an empty store path.** Every early category should either have an affordable item or a clear unlock label.
3. **Give visible tank changes before abstract numbers.** Fish, decor, clean effect, and background goals retain better than wallet growth.
4. **Use goals as early income, then fade them.** Day 1 can get 30-50% of income from quests. By Day 7, most income should come from fish.
5. **Delay premium rarity, but tease it.** Rare currency should appear as a progress shard/preview around Day 3, with real rare purchases around Day 5-7.
6. **Avoid punishment in the first day.** Dirty water can reduce bonus income later, but first-day dirty effects should teach cleaning rather than kill fish or block progress.
7. **Make returning obvious.** Add daily goal rewards and one "come back later" target such as a maturing fish, tank upgrade, or rare unlock progress.

Suggested first-week reward budget:

| Source | Day 1 | Day 3 | Day 7 |
| --- | ---: | ---: | ---: |
| Fish coin income | 45-55% | 65-75% | 80-90% |
| Goal rewards | 30-40% | 15-25% | 5-10% |
| Tutorial/gift rewards | 10-20% | 0-5% | 0% |
| Ads/IAP, if added later | 0% for balance baseline | optional boost only | optional boost only |

This keeps the first day exciting without poisoning the long-term economy.

## Regular Visit Mechanics

To avoid a game that is optimal to leave running all day, the simulation now assumes these mechanics:

| Mechanic | Recommendation | Why |
| --- | --- | --- |
| Offline coin bank | Store only about 3 hours of unclaimed fish production per check-in. | Players can sleep/work, but checking in multiple times matters. |
| Coin expiry | Tank drops still disappear after a short window while online. | Active play feels tactile and not fully automated. |
| First-week goals | Day 1-7 goals add income, then taper sharply. | Early retention feels generous without permanent inflation. |
| Purchase pacing | First week limits raw fish-buy bursts through goals/unlocks. | Prevents Day 1 min-maxing and makes each return session meaningful. |
| Care friction | Low visit frequency lightly reduces net income after Day 1. | Leaving all day still progresses, but worse than caring/cleaning. |
| Automation tradeoff | Helpers may extend convenience, but auto-collect takes a fee. | Automation is comfort, not the best earning strategy. |

The target rhythm is 3-5 short visits per day. A player should not need to babysit the game, but a player who returns morning/lunch/evening should clearly beat a player who opens it once per day.

Modeled behaviors:

| Scenario | Visits | Offline Bank | Goal Completion |
| --- | ---: | ---: | ---: |
| Regular | 5/day, 5 min each | 3h/check-in | 95% |
| Casual | 3/day, 4 min each | 3h/check-in | 72% |
| One daily visit | 1/day, 6 min | 3h/check-in | 28% |

## Projection: Regular Check-In Player

Assumption: player visits 5 times per day, completes most goals, buys fish when profitable, upgrades tank when affordable, and keeps fish healthy.

| Time | Tank Level | Fish / Capacity | Net Daily Income | Wallet | Next Level ETA |
| --- | ---: | ---: | ---: | ---: | ---: |
| Day 1 | 1 | 6/12 | 17 | 108 | 8.6d |
| Day 3 | 2 | 12/14 | 133 | 132 | 2.0d |
| Day 7 | 4 | 18/18 | 205 | 217 | 2.3d |
| Day 14 | 7 | 21/23 | 273 | 47 | 3.1d |
| Day 30 | 12 | 29/31 | 741 | 722 | 2.8d |
| Day 60 | 21 | 45/45 | 2.6K | 5.6K | 2.8d |
| Day 90 | 31 | 58/59 | 5.6K | 286 | 2.6d |
| Day 180 | 54 | 92/92 | 21.8K | 69.9K | 3.5d |
| Day 365 | 94 | 142/145 | 75.6K | 44.8K | 5.1d |
| Year 2 | 147 | 213/213 | 261.5K | 1.9M | 7.6d |
| Year 3 | 192 | 269/269 | 511.8K | 3.3M | 7.6d |
| Year 5 | 251 | 342/343 | 1.0M | 2.7M | 12.5d |
| Year 10 | 373 | 493/493 | 3.3M | 25.1M | 22.5d |

This is much healthier than the current game. The player gets daily progress early, weekly progress later, and still has meaningful upgrades after years.

## Projection: Casual Player

Assumption: casual player claims fewer coins but still checks in consistently. The curve intentionally does not fall too far behind, because tank upgrade costs are based on income bands instead of a pure global exponential wall.

| Time | Tank Level | Fish / Capacity | Net Daily Income | Wallet | Next Level ETA |
| --- | ---: | ---: | ---: | ---: | ---: |
| Day 1 | 1 | 5/12 | 8 | 105 | 18.1d |
| Day 3 | 2 | 9/14 | 49 | 19 | 4.7d |
| Day 7 | 3 | 14/16 | 88 | 25 | 3.7d |
| Day 14 | 4 | 18/18 | 116 | 364 | 3.7d |
| Day 30 | 7 | 23/23 | 198 | 712 | 4.0d |
| Day 60 | 14 | 32/35 | 478 | 675 | 4.1d |
| Day 90 | 20 | 43/44 | 1.0K | 2.4K | 4.0d |
| Day 180 | 42 | 74/75 | 5.3K | 2.2K | 4.1d |
| Day 365 | 79 | 123/124 | 26.3K | 9.3K | 5.3d |
| Year 2 | 133 | 193/194 | 102.5K | 327.2K | 7.7d |
| Year 3 | 175 | 248/248 | 212.0K | 880.2K | 7.7d |
| Year 5 | 237 | 326/326 | 461.3K | 2.9M | 12.5d |
| Year 10 | 362 | 481/481 | 1.6M | 16.6M | 22.4d |

## Projection: One Daily Visit Player

Assumption: player opens once per day, claims only the banked window, completes fewer goals, and does not actively maintain the tank.

| Time | Tank Level | Fish / Capacity | Net Daily Income | Wallet | Next Level ETA |
| --- | ---: | ---: | ---: | ---: | ---: |
| Day 1 | 1 | 2/12 | 2 | 116 | 74.0d |
| Day 3 | 1 | 4/12 | 5 | 113 | 29.0d |
| Day 7 | 1 | 8/12 | 11 | 125 | 13.2d |
| Day 14 | 2 | 12/14 | 18 | 72 | 12.6d |
| Day 30 | 3 | 15/16 | 21 | 157 | 14.5d |
| Day 60 | 5 | 18/19 | 29 | 222 | 17.5d |
| Day 90 | 7 | 21/23 | 35 | 49 | 20.1d |
| Day 180 | 12 | 29/31 | 94 | 197 | 14.1d |
| Day 365 | 24 | 48/49 | 422 | 2.9K | 8.5d |
| Year 2 | 64 | 77/105 | 1.5K | 10.1K | 9.2d |
| Year 3 | 95 | 77/146 | 1.5K | 2.4K | 14.2d |
| Year 5 | 137 | 77/200 | 1.5K | 21.6K | 21.5d |
| Year 10 | 208 | 77/290 | 1.6K | 22.7K | 34.6d |

This is intentional: idle play is not dead, but it is dramatically less efficient. Regular visits are roughly `1.8x` the 10-year level progress of one daily visit and, more importantly, keep filling fish capacity instead of stalling at `77` fish.

## Unlock Structure

Recommended tank-level gates:

| Level | Unlock |
| ---: | --- |
| 1 | Common fish, basic food, basic decorations. |
| 3 | Clean tank menu, first utility/tool purchases. |
| 5 | Better common fish, first cosmetic background/seabed goals. |
| 7 | Rare fish and rare food. |
| 12 | Helpers, stronger decorations, larger food bundles. |
| 18 | Super rare fish and premium cosmetics. |
| 45 | Prestige fish/cosmetics. This can still use super rare currency plus level gates. |
| 90 | Legend tier: long-term collection goals, rare tank skins, premium helpers. |
| 180 | Ancient tier: year-scale goals. |
| 360 | Cosmic tier: extremely long-term prestige. |

The current game only has common, rare, and super rare currencies. That is okay. Later tiers do not need new currencies immediately; they can be level-gated super rare items, achievements, or prestige tokens later.

## Pricing Rules

Use generated prices from production, not hand-picked prices.

```text
fish price = projected daily income from that fish * target payback days
tank upgrade cost = current net daily income * target level cadence + level floor
```

Recommended fish payback targets:

| Tier | Unlock | Starting Payback |
| --- | ---: | ---: |
| Common | Level 1 | 7 hours |
| Rare | Level 7 | 1.26 days |
| Super rare | Level 18 | 3.68 days |
| Prestige | Level 45 | 8.4 days |
| Legend | Level 90 | 18.9 days |
| Ancient | Level 180 | 37.8 days |
| Cosmic | Level 360 | 73.5 days |

Recommended non-fish pricing:

| Category | Rule |
| --- | --- |
| Food and care | 12-16% of gross income if player actively feeds and cleans. |
| Medicine | 15-30 minutes of current tier income. |
| Helpers | 6-18 hours of current tier income; more if they automate collection. |
| Food dispenser | Price like a helper/tool, not like food. |
| Decorations | 2-8 hours for ordinary decor, 1-7 days for prestige decor. |
| Background/seabed | 1-3 days early, 1-4 weeks late. |
| Tank purchase/upgrade | Main progression sink, always level-gated. |

## Why This Solves The Current Problem

The current game lets the player buy out the store because the fastest fish pay back in seconds or minutes. The new model fixes that by separating four loops:

1. **Minute loop:** claim coins, feed fish, clean tank.
2. **Daily loop:** buy a fish, buy food, small tank upgrade.
3. **Weekly loop:** unlock rarity tier, buy helper/tool, upgrade background/seabed.
4. **Monthly/yearly loop:** prestige fish, high-level tank, rare cosmetic collections.

That gives constant feedback without letting every item collapse into “cheap.”

## Implementation Recommendations

1. Add explicit tank upgrade cost and do not derive level only from net worth.
2. Gate shop fish by tank level before currency filter.
3. Generate fish production from payback targets.
4. Reduce current fish coin output by orders of magnitude.
5. Remove or heavily gate common-to-rare and rare-to-super-rare bridge production.
6. Price helpers and dispenser as automation unlocks, not as decorations.
7. Keep owned tanks/backgrounds/seabeds hidden from shop, but allow duplicate tank slots only where intended.
8. Add long-term prestige tiers without necessarily adding new currencies yet.
9. Add first-week goal rewards as a separate retention layer, then taper them down by Day 7.
10. Make Day 1 progression feel rich through guided rewards and visible tank changes, not through broken fish ROI.
11. Add a 3-hour offline coin bank per check-in so regular visits matter without forcing constant play.
12. Pace first-week fish purchases through goals/unlocks so Day 1 ends around 4-8 fish, not a fully optimized store rush.
13. Keep auto-collect useful but not optimal by charging its 50% collection fee and avoiding unlimited offline collection.

## Files

- Raw projection: `artifacts/economy/balanced-long-term-projection.json`
- Simulator: `tools/simulate-balanced-economy.mjs`
- Current economy failure report: `docs/economy-simulation-report.md`
