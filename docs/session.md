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
  - Place fish and decorations inside the tank.
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
