# Session Notes

## Current Goal

- Build the Phaser + Vite project environment and MVP aquarium loop.

## Notes

- Latest checked versions on 2026-05-02:
  - Phaser: 4.1.0
  - Vite: 8.0.10

## Decisions

- Use Phaser with Vite and TypeScript.
- Ship as a mobile portrait game.
- Start with a playable vertical slice before expanding content.
- Use generated Phaser textures for the MVP so gameplay is not blocked on art assets.
- Keep the first MVP in a single scene until the loop is proven.
- Use a portrait virtual canvas with the tank above and touch controls below.
- Run visual browser QA after UI or gameplay changes.
- Use `npm test` for repeatable regression coverage before handoff.

## Session Progress

- Created Vite + TypeScript project files.
- Installed Phaser and Vite dependencies.
- Built a playable aquarium MVP:
  - Buy fish, food, and decorations.
  - Bought fish are added directly to the tank; decorations are placed manually.
  - Drop food into the tank.
  - Fish move around, get hungry, seek food, eat, grow, become ill, and become happy.
  - Happy fish drop collectible coins.
- Verified production build with `npm run build`.
- Converted the MVP from desktop landscape to mobile portrait layout.
- Added bottom tab controls for fish, food, and decorations.
- Interacted with the current app in the in-app browser and verified the MVP loop.
- Added dependency-free regression smoke test driven through local Chrome/CDP.
- Verified `npm test` passes and writes `artifacts/regression-smoke.png`.
- Added long-term game spec and mechanics docs focused on mobile retention.
- Expanded game and mechanics specs with rarity, multi-currency economy, fish selling, age-based attributes, species food requirements, compatibility, event-only fish, and additional long-term systems.
- Double-reviewed specs for production coverage and added release criteria, required screens, FTUE, content strategy, accessibility, localization, performance, analytics, data contracts, save/load, migrations, content validation, edge cases, and QA matrix.
- Reorganized tasks into mechanics-aligned production phases from foundations through QA.
- Started foundation implementation by adding shared mechanics types, JSON content tables, content validation, and data-driven MVP store content.
- Verified with `npm test` and visual browser QA.
- Continued autonomously with a larger slice: split the monolithic game file into modules, added wallet state/UI, baby age-stage tracking, active-play age progression, placed-fish selling, and expanded regression coverage.
- Verified again with `npm test` and visual browser QA, including the sell button.
- Continued with persistence and return-session mechanics:
  - Added versioned local save/load for wallet, inventories, placed fish, fish vitals/age, and placed decorations.
  - Added autosave after current MVP economy/care actions plus periodic autosave.
  - Added capped offline return rewards with fish growth, hunger increase, and gentle health risk.
  - Expanded regression to verify save restore after reload and simulated offline progress.
  - Verified with `npm test` and in-app browser visual QA for fish purchase/placement, food drop, decoration placement, and save restore after reload.
- Pushed toward Phase 7 mobile production:
  - Switched the virtual canvas to `430x844` portrait.
  - Added safe-area CSS.
  - Added mobile screen navigation: Store, Care, Album, Goals, and Settings.
  - Added fish details, sell confirmation, offline summary, care/inventory, collection album, daily goals, settings toggles, and reset confirmation UI.
  - Added typed food inventory, eight food types, species food acceptance, wrong-food effects, tank cleanliness, cleaning, tank happiness, capacity, and overcrowding penalties.
  - Added save schema migration to version 2.
  - Added local-date handling for daily goals after visual QA caught UTC date drift.
  - Added portrait screenshot regression artifacts for `390x844`, `393x852`, `412x915`, and `430x932`.
  - Added `docs/mobile-build.md` for the native packaging path.
- Continued with compatibility and safer selling:
  - Added Betta as a fourth purchasable fish with solitary tankmate rules.
  - Added compatibility scoring, direct conflict warnings, and placement confirmation before risky fish are added.
  - Added ongoing compatibility pressure that can lower fish health in bad tanks.
  - Added final-fish protection, rare/event sell confirmation copy, and regression coverage for those guardrails.
  - Expanded content validation so compatibility lists must point to real fish IDs.
- Continued the mobile play-surface pass:
  - Made the aquarium tank fill the portrait canvas with HUD, food tools, and navigation overlaid.
  - Replaced the global screen tabs with individual bottom icon buttons for Store, Care, Album, Goals, and Settings.
  - Added a right-side food dock where owned food can be toggled and then dropped with the next tank tap.
  - Added Medicine as the sick-fish healing path: activate Medicine and tap near an ill fish to restore health.
  - Updated regression coverage for food activation, medicine healing, full-screen tank flow, and sell hooks.
- Applied economy feedback:
  - Raised fish sell values so resale is useful instead of feeling throwaway.
  - Changed ill fish to still produce coins as slower reduced `+1` drops.
  - Added regression coverage for ill fish reduced coin amount and slower timer.
- Applied coin feedback:
  - Changed coin drops from upward bobbing to a downward sink motion.
  - Let coins sink to the bottom, then later increased coin sink speed so coins fall faster than food.
  - Added regression coverage for coin drops reaching the tank floor.
  - Added a `coin-bottom.png` visual regression artifact captured before coin collection.
  - Capped uncollected coin drops at 5 and kept production ready until the player collects the stack.
  - Added a `coin-stack-cap.png` visual regression artifact for the capped stack state.
  - Added distinct gold, aqua, and magenta visuals for common, rare, and super rare coin drops.
  - Added a `coin-colors.png` visual regression artifact for all three coin types.
  - Moved the main menu icons to the right side of the tank and food/medicine tools to the left side.
  - Compacted the top HUD copy and wrap width, removing idle/offline text from the always-visible header.
  - Changed medicine from a small health bump into a recovery treatment that restores health, lowers hunger, and slows relapse.
  - Reworked the Store page into a two-column catalog grid with item cards for fish, food, and decorations.
  - Changed medicine into an edible treatment pellet: the player drops it like food, ill fish swim to it, and healing applies after consumption.
  - Added a dedicated green pill-shaped medicine drop sprite and regression coverage for the medicine texture.
  - Slowed fish hunger growth and raised the hungry/health-loss thresholds so fish do not feel needy every few seconds.
- Applied sell-value feedback:
  - Changed fish sell value to scale with age, rarity, production, size, resilience, health, and hunger.
  - Kept fresh baby resale below purchase price to avoid instant buy/sell profit.
  - Added regression coverage for attribute-driven value growth and poor-condition value reduction.
- Added short rental boosts:
  - Auto Feeder runs for the selected number of minutes, spends owned non-medicine food, and drops compatible food from random top-of-tank positions.
  - Auto Feeder now checks every hungry eligible fish in a cycle, drops each species' needed food type when stock exists, and decrements food inventory per dropped pellet.
  - Auto Coin Collector runs for the selected number of minutes and collects settled coin drops from the tank bottom.
  - Care screen `-` and `+` controls adjust rental minutes, and prices scale by duration.
  - Added save support, Care screen controls, HUD status text, and regression coverage for both rentals.
- Tuned feeding behavior so fish chase compatible food aggressively whenever they can still eat more, with regression coverage for partly full fish.
- Increased the MVP tank fish capacity from 6 to 10 and updated the HUD/Care capacity labels.
- Changed store fish purchases so new fish are auto-added to the tank, then later removed the risky/incompatible confirmation path entirely.
- Removed fish incompatibility from the current design:
  - All fish species now share one community-safe tank.
  - Mixed species purchases auto-add without confirmation when capacity and currency allow it.
  - Compatibility health pressure and happiness penalties were removed.
- Added tank progression and catalog scale:
  - Expanded fish content to 50 store fish, grouped as 10 fish per tank level from L1-L5.
  - Added a saved tank level, L1-L5 upgrade pricing, and store controls for browsing fish by level.
  - Blocked higher-level fish from purchase or placement until the tank is upgraded while keeping lower-level fish valid in higher-level tanks.
  - Added total wealth and tank need indicator copy to the tank HUD/status area.
